from __future__ import annotations

import mimetypes
import re
from pathlib import Path

from django.db.models import Count, Exists, F, OuterRef, Q
from django.http import FileResponse, Http404, HttpResponse, StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.http import content_disposition_header
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Notification
from accounts.serializers import UserSerializer
from core.pagination import page_params
from core.permissions import IsStaff
from .filters import comma_values
from .models import (
    Category,
    CollaborationRequest,
    Comment,
    Innovation,
    InnovationBookmark,
    InnovationLike,
    InnovationMedia,
    Institution,
    Report,
)
from .serializers import (
    CategorySerializer,
    CollaborationRequestCreateSerializer,
    CollaborationRequestSerializer,
    CommentSerializer,
    InnovationModerationSerializer,
    InnovationReadSerializer,
    InnovationWriteSerializer,
    InstitutionSerializer,
    InstitutionWriteSerializer,
    ReportCreateSerializer,
    ReportSerializer,
    annotate_innovation_metrics,
)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return Category.objects.annotate(
            published_innovation_count=Count(
                "innovations",
                filter=Q(innovations__status=Innovation.Status.PUBLISHED),
                distinct=True,
            )
        ).order_by("order", "name_en")


class InstitutionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = "slug"

    def get_queryset(self):
        qs = Institution.objects.prefetch_related("focus").annotate(
            published_innovation_count=Count(
                "innovations",
                filter=Q(innovations__status=Innovation.Status.PUBLISHED),
                distinct=True,
            )
        )
        user = self.request.user
        if not (user.is_authenticated and user.is_staff):
            qs = qs.filter(is_active=True)
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(short_name__icontains=q)
                | Q(location__icontains=q)
                | Q(description__icontains=q)
            )
        type_values = comma_values(self.request.query_params.get("type"))
        if type_values:
            qs = qs.filter(type__in=type_values)
        verified = self.request.query_params.get("verified")
        if verified in {"1", "true"}:
            qs = qs.filter(verified=True)
        return qs.order_by("-verified", "name")

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return InstitutionWriteSerializer
        return InstitutionSerializer

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsStaff()]
        return [AllowAny()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(
            InstitutionSerializer(instance, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get("partial", False))
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(InstitutionSerializer(instance, context={"request": request}).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class InnovationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = "slug"

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy", "like", "bookmark"}:
            return [IsAuthenticated()]
        if self.action == "moderate":
            return [IsStaff()]
        return [AllowAny()]

    def get_queryset(self):
        user = self.request.user
        qs = Innovation.objects.select_related("category", "creator", "institution").prefetch_related(
            "team", "team__institution", "category", "institution__focus", "media"
        )
        if self.action == "list":
            mine = self.request.query_params.get("mine") in {"1", "true"}
            if mine and user.is_authenticated:
                qs = qs.filter(creator=user)
            elif user.is_authenticated and user.is_staff:
                pass
            else:
                qs = qs.filter(status=Innovation.Status.PUBLISHED)
        else:
            if user.is_authenticated and user.is_staff:
                pass
            elif user.is_authenticated:
                qs = qs.filter(Q(status=Innovation.Status.PUBLISHED) | Q(creator=user))
            else:
                qs = qs.filter(status=Innovation.Status.PUBLISHED)

        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(search_text__icontains=q)
                | Q(creator__full_name__icontains=q)
                | Q(creator__headline__icontains=q)
                | Q(institution__name__icontains=q)
                | Q(institution__short_name__icontains=q)
            )
        categories = comma_values(self.request.query_params.get("category"))
        if categories:
            qs = qs.filter(category_id__in=categories)
        stages = comma_values(self.request.query_params.get("stage"))
        if stages:
            qs = qs.filter(stage__in=stages)
        institutions = comma_values(self.request.query_params.get("institution"))
        if institutions:
            qs = qs.filter(institution__slug__in=institutions)
        regions = comma_values(self.request.query_params.get("region"))
        if regions:
            qs = qs.filter(region__in=regions)
        creators = comma_values(self.request.query_params.get("creator"))
        if creators:
            qs = qs.filter(creator__slug__in=creators)
        status_values = comma_values(self.request.query_params.get("status"))
        if status_values and (user.is_staff or self.request.query_params.get("mine") in {"1", "true"}):
            qs = qs.filter(status__in=status_values)
        if self.request.query_params.get("featured") in {"1", "true"}:
            qs = qs.filter(featured=True)
        if self.request.query_params.get("trending") in {"1", "true"}:
            qs = qs.filter(trending=True)

        qs = annotate_innovation_metrics(qs, user)
        sort = self.request.query_params.get("sort", "latest")
        if sort == "popular":
            qs = qs.order_by("-live_likes", "-legacy_likes", "-published_at")
        elif sort == "discussed":
            qs = qs.order_by("-live_comments", "-published_at")
        elif sort == "views":
            qs = qs.order_by("-views", "-published_at")
        else:
            qs = qs.order_by("-published_at")
        return qs

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return InnovationWriteSerializer
        return InnovationReadSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["include_collaboration"] = self.action == "retrieve"
        return context

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status == Innovation.Status.PUBLISHED:
            Innovation.objects.filter(pk=instance.pk).update(views=F("views") + 1)
            instance.views += 1
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(
            InnovationReadSerializer(instance, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        if not instance.can_edit(request.user):
            return Response(
                {"error": {"code": "permission_denied", "message": "You can only edit your own innovations."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(InnovationReadSerializer(instance, context={"request": request}).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance.can_edit(request.user):
            return Response(
                {"error": {"code": "permission_denied", "message": "You can only remove your own innovations."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        if request.user.is_staff and request.query_params.get("hard") in {"1", "true"}:
            instance.delete()
        else:
            instance.status = Innovation.Status.ARCHIVED
            instance.save(update_fields=["status", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def like(self, request, slug=None):
        innovation = self.get_object()
        like, created = InnovationLike.objects.get_or_create(innovation=innovation, user=request.user)
        if not created:
            like.delete()
        return Response({"liked": created, "likes": innovation.likes_count})

    @action(detail=True, methods=["post"])
    def bookmark(self, request, slug=None):
        innovation = self.get_object()
        bookmark, created = InnovationBookmark.objects.get_or_create(
            innovation=innovation, user=request.user
        )
        if not created:
            bookmark.delete()
        return Response({"saved": created})

    @action(detail=True, methods=["post"], permission_classes=[IsStaff])
    def moderate(self, request, slug=None):
        innovation = self.get_object()
        serializer = InnovationModerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        changed = []
        for field in ("status", "featured", "trending"):
            if field in data:
                setattr(innovation, field, data[field])
                changed.append(field)
        if changed:
            innovation.save(update_fields=[*changed, "updated_at"])
        if data.get("status") == Innovation.Status.HIDDEN:
            Notification.notify(
                innovation.creator,
                "Your innovation was hidden",
                actor=request.user,
                kind=Notification.Kind.MODERATION,
                message=f"Moderators hid “{innovation.title}”. Contact the TIE team if you have questions.",
                url="/dashboard/innovations",
            )
        return Response(InnovationReadSerializer(innovation, context={"request": request}).data)


class CommentListCreateView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def _innovation(self, request, slug):
        qs = Innovation.objects.all()
        user = request.user
        if not (user.is_authenticated and (user.is_staff or qs.filter(slug=slug, creator=user).exists())):
            qs = qs.filter(status=Innovation.Status.PUBLISHED)
        return get_object_or_404(qs, slug=slug)

    def get(self, request, slug):
        innovation = self._innovation(request, slug)
        comments = innovation.comments.select_related("author", "author__institution")
        if not (request.user.is_authenticated and request.user.is_staff):
            comments = comments.filter(is_hidden=False)
        page, page_size = page_params(request, 10)
        total = comments.count()
        start = (page - 1) * page_size
        items = comments[start : start + page_size]
        return Response(
            {
                "count": total,
                "results": CommentSerializer(items, many=True, context={"request": request}).data,
            }
        )

    def post(self, request, slug):
        innovation = self._innovation(request, slug)
        serializer = CommentSerializer(
            data=request.data, context={"request": request, "innovation": innovation}
        )
        serializer.is_valid(raise_exception=True)
        comment = serializer.save()
        return Response(
            CommentSerializer(comment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class CommentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        comment = get_object_or_404(Comment.objects.select_related("author"), pk=pk)
        if not comment.can_edit(request.user):
            return None
        return comment

    def patch(self, request, pk):
        comment = self.get_object(request, pk)
        if not comment:
            return Response(
                {"error": {"code": "permission_denied", "message": "You can only edit your own comments."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        body = str(request.data.get("body", "")).strip()
        if len(body) < 2:
            return Response(
                {"error": {"code": "validation_error", "message": "Write at least a few words.", "fields": {"body": ["This field is required."]}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        comment.body = body[:2000]
        comment.save(update_fields=["body", "updated_at"])
        return Response(CommentSerializer(comment, context={"request": request}).data)

    def delete(self, request, pk):
        comment = self.get_object(request, pk)
        if not comment:
            return Response(
                {"error": {"code": "permission_denied", "message": "You can only delete your own comments."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CollaborationRequestViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CollaborationRequestSerializer

    def get_queryset(self):
        user = self.request.user
        qs = CollaborationRequest.objects.select_related(
            "sender", "sender__institution", "recipient", "recipient__institution", "innovation"
        ).filter(Q(sender=user) | Q(recipient=user))
        direction = self.request.query_params.get("direction")
        if direction == "incoming":
            qs = qs.filter(recipient=user)
        elif direction == "outgoing":
            qs = qs.filter(sender=user)
        status_values = comma_values(self.request.query_params.get("status"))
        if status_values:
            qs = qs.filter(status__in=status_values)
        return qs.order_by("-created_at")

    def get_serializer_class(self):
        if self.action == "create":
            return CollaborationRequestCreateSerializer
        return CollaborationRequestSerializer

    def list(self, request):
        queryset = self.get_queryset()
        page, page_size = page_params(request, 20)
        total = queryset.count()
        start = (page - 1) * page_size
        items = queryset[start : start + page_size]
        return Response(
            {
                "count": total,
                "results": CollaborationRequestSerializer(
                    items, many=True, context={"request": request}
                ).data,
            }
        )

    def create(self, request):
        serializer = CollaborationRequestCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        collab = serializer.save()
        return Response(
            CollaborationRequestSerializer(collab, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, pk=None):
        collab = get_object_or_404(self.get_queryset(), pk=pk)
        new_status = request.data.get("status")
        response_message = str(request.data.get("responseMessage", "")).strip()[:2000]
        if new_status not in {
            CollaborationRequest.Status.ACCEPTED,
            CollaborationRequest.Status.DECLINED,
            CollaborationRequest.Status.WITHDRAWN,
        }:
            return Response(
                {"error": {"code": "validation_error", "message": "Choose a valid response status."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if collab.status != CollaborationRequest.Status.PENDING:
            return Response(
                {"error": {"code": "invalid_action", "message": "This request has already been answered."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if new_status == CollaborationRequest.Status.WITHDRAWN:
            if collab.sender_id != request.user.pk:
                return Response(
                    {"error": {"code": "permission_denied", "message": "Only the sender can withdraw this request."}},
                    status=status.HTTP_403_FORBIDDEN,
                )
        elif collab.recipient_id != request.user.pk:
            return Response(
                {"error": {"code": "permission_denied", "message": "Only the recipient can respond to this request."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        collab.respond(new_status, response_message, actor=request.user)
        return Response(CollaborationRequestSerializer(collab, context={"request": request}).data)


class ReportViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ReportSerializer

    def get_queryset(self):
        if self.request.user.is_staff:
            return Report.objects.select_related(
                "reporter", "reporter__institution", "innovation", "comment", "comment__author", "reviewed_by"
            )
        return Report.objects.none()

    def create(self, request):
        serializer = ReportCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        report = serializer.save()
        return Response(
            ReportSerializer(report, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def list(self, request):
        if not request.user.is_staff:
            return Response(
                {"error": {"code": "permission_denied", "message": "Staff access is required."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        queryset = self.get_queryset()
        status_filter = request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        page, page_size = page_params(request, 20)
        total = queryset.count()
        start = (page - 1) * page_size
        items = queryset[start : start + page_size]
        return Response(
            {
                "count": total,
                "results": ReportSerializer(items, many=True, context={"request": request}).data,
            }
        )

    def partial_update(self, request, pk=None):
        if not request.user.is_staff:
            return Response(
                {"error": {"code": "permission_denied", "message": "Staff access is required."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        report = get_object_or_404(Report, pk=pk)
        new_status = request.data.get("status")
        if new_status not in {Report.Status.RESOLVED, Report.Status.DISMISSED}:
            return Response(
                {"error": {"code": "validation_error", "message": "Choose resolved or dismissed."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        report.status = new_status
        report.resolution_note = str(request.data.get("resolutionNote", "")).strip()[:1000]
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        report.save(update_fields=["status", "resolution_note", "reviewed_by", "reviewed_at"])
        if new_status == Report.Status.RESOLVED and report.innovation:
            report.innovation.status = Innovation.Status.HIDDEN
            report.innovation.save(update_fields=["status", "updated_at"])
            Notification.notify(
                report.innovation.creator,
                "Your innovation was hidden after review",
                actor=request.user,
                kind=Notification.Kind.MODERATION,
                message=f"“{report.innovation.title}” was hidden after a moderation review.",
                url="/dashboard/innovations",
            )
        if new_status == Report.Status.RESOLVED and report.comment:
            report.comment.is_hidden = True
            report.comment.hidden_by = request.user
            report.comment.save(update_fields=["is_hidden", "hidden_by", "updated_at"])
        Notification.notify(
            report.reporter,
            "Your report was reviewed",
            actor=request.user,
            kind=Notification.Kind.MODERATION,
            message=f"Moderators marked your report as {new_status}.",
            url="/dashboard",
        )
        return Response(ReportSerializer(report, context={"request": request}).data)


class BookmarkListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        innovations = Innovation.objects.filter(
            bookmarks__user=request.user, status=Innovation.Status.PUBLISHED
        ).select_related("category", "creator", "institution").prefetch_related("team", "institution__focus", "media")
        innovations = annotate_innovation_metrics(innovations, request.user).order_by("-bookmarks__created_at")
        from opportunities.models import Opportunity
        from opportunities.serializers import (
            OpportunitySerializer,
            annotate_opportunity_viewer,
        )

        opportunities = Opportunity.objects.filter(
            bookmarks__user=request.user, status=Opportunity.Status.PUBLISHED
        ).prefetch_related("categories")
        opportunities = annotate_opportunity_viewer(opportunities, request.user).order_by(
            "-bookmarks__created_at"
        )
        return Response(
            {
                "innovations": InnovationReadSerializer(
                    innovations, many=True, context={"request": request}
                ).data,
                "opportunities": OpportunitySerializer(
                    opportunities, many=True, context={"request": request}
                ).data,
            }
        )


# Kept here so the module exposes the user serializer for the moderation overview.
__all__ = ["CategoryViewSet", "InstitutionViewSet", "InnovationViewSet", "UserSerializer"]



def _media_is_public(media: InnovationMedia) -> bool:
    return media.innovation.status == Innovation.Status.PUBLISHED


def _can_view_media(request, media: InnovationMedia) -> bool:
    if _media_is_public(media):
        return True
    user = request.user
    return bool(
        user
        and user.is_authenticated
        and (user.is_staff or media.innovation.creator_id == user.id)
    )


def _media_cache_headers(response, media: InnovationMedia):
    if _media_is_public(media):
        response["Cache-Control"] = "public, max-age=3600"
    else:
        response["Cache-Control"] = "private, no-store"
    return response


def _content_type(media: InnovationMedia, field, fallback: str) -> str:
    if media.mime_type:
        return media.mime_type
    if field and field.name:
        guessed = mimetypes.guess_type(field.name)[0]
        if guessed:
            return guessed
    return fallback


class InnovationMediaFileView(APIView):
    """Permission-checked streaming endpoint for gallery images and videos."""

    permission_classes = [AllowAny]

    def get(self, request, media_id):
        media = get_object_or_404(
            InnovationMedia.objects.select_related("innovation"), pk=media_id
        )
        if not _can_view_media(request, media):
            raise Http404("Media not found.")
        field = media.file
        if not field or not field.name or not field.storage.exists(field.name):
            raise Http404("Media file not found.")
        content_type = _content_type(media, field, "application/octet-stream")
        filename = media.original_filename or Path(field.name).name
        size = media.file_size or field.size
        range_header = request.headers.get("Range", "")
        match = re.match(r"bytes=(\d*)-(\d*)$", range_header.strip())
        if match:
            start_raw, end_raw = match.groups()
            try:
                start = int(start_raw) if start_raw else 0
                end = int(end_raw) if end_raw else size - 1
            except ValueError:
                start, end = 0, size - 1
            if start >= size or start < 0:
                response = HttpResponse(status=416)
                response["Content-Range"] = f"bytes */{size}"
                response["Accept-Ranges"] = "bytes"
                return response
            end = min(end, size - 1)
            length = max(end - start + 1, 0)
            handle = field.open("rb")
            handle.seek(start)

            def chunks():
                try:
                    remaining = length
                    while remaining > 0:
                        piece = handle.read(min(64 * 1024, remaining))
                        if not piece:
                            break
                        remaining -= len(piece)
                        yield piece
                finally:
                    handle.close()

            response = StreamingHttpResponse(chunks(), status=206, content_type=content_type)
            response["Content-Range"] = f"bytes {start}-{end}/{size}"
            response["Content-Length"] = str(length)
            response["Accept-Ranges"] = "bytes"
            response["Content-Disposition"] = content_disposition_header(False, filename)
            return _media_cache_headers(response, media)

        handle = field.open("rb")
        response = FileResponse(
            handle,
            as_attachment=False,
            filename=filename,
            content_type=content_type,
        )
        response["Accept-Ranges"] = "bytes"
        return _media_cache_headers(response, media)


class InnovationMediaThumbnailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, media_id):
        media = get_object_or_404(
            InnovationMedia.objects.select_related("innovation"), pk=media_id
        )
        if not _can_view_media(request, media):
            raise Http404("Media not found.")
        field = media.thumbnail
        if not field or not field.name or not field.storage.exists(field.name):
            raise Http404("Thumbnail not found.")
        handle = field.open("rb")
        response = FileResponse(
            handle,
            as_attachment=False,
            filename=f"{Path(field.name).stem}.jpg",
            content_type="image/jpeg",
        )
        response["Accept-Ranges"] = "none"
        return _media_cache_headers(response, media)


__all__ = [
    "CategoryViewSet",
    "InstitutionViewSet",
    "InnovationViewSet",
    "InnovationMediaFileView",
    "InnovationMediaThumbnailView",
    "UserSerializer",
]

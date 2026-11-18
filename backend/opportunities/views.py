from __future__ import annotations

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Notification
from core.pagination import page_params
from core.permissions import IsStaff
from ecosystem.filters import comma_values
from .models import Opportunity, OpportunityApplication, OpportunityBookmark
from .serializers import (
    ApplicationCreateSerializer,
    ApplicationReviewSerializer,
    OpportunityApplicationSerializer,
    OpportunitySerializer,
    OpportunityWriteSerializer,
    annotate_opportunity_viewer,
)


class OpportunityViewSet(viewsets.ModelViewSet):
    lookup_field = "slug"

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy", "applications"}:
            return [IsStaff()]
        if self.action in {"bookmark", "apply"}:
            return [IsAuthenticated()]
        return [AllowAny()]

    def get_queryset(self):
        user = self.request.user
        qs = Opportunity.objects.prefetch_related("categories")
        if not (user.is_authenticated and user.is_staff):
            qs = qs.filter(status=Opportunity.Status.PUBLISHED)
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(title__icontains=q)
                | Q(summary__icontains=q)
                | Q(organizer__icontains=q)
                | Q(location__icontains=q)
            )
        types = comma_values(self.request.query_params.get("type"))
        if types:
            qs = qs.filter(type__in=types)
        categories = comma_values(self.request.query_params.get("category"))
        if categories:
            qs = qs.filter(categories__slug__in=categories).distinct()
        if self.request.query_params.get("open_only") in {"1", "true"}:
            qs = qs.filter(
                status=Opportunity.Status.PUBLISHED, deadline__gte=timezone.localdate()
            )
        status_values = comma_values(self.request.query_params.get("status"))
        if status_values and user.is_authenticated and user.is_staff:
            qs = qs.filter(status__in=status_values)
        qs = annotate_opportunity_viewer(qs, user)
        sort = self.request.query_params.get("sort", "deadline")
        if sort == "newest":
            qs = qs.order_by("-created_at")
        elif sort == "popular":
            qs = qs.order_by("-application_count_value", "deadline")
        else:
            qs = qs.order_by("deadline", "-created_at")
        return qs

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return OpportunityWriteSerializer
        return OpportunitySerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(
            OpportunitySerializer(instance, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(OpportunitySerializer(instance, context={"request": request}).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.status = Opportunity.Status.ARCHIVED
        instance.save(update_fields=["status", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def bookmark(self, request, slug=None):
        opportunity = self.get_object()
        bookmark, created = OpportunityBookmark.objects.get_or_create(
            opportunity=opportunity, user=request.user
        )
        if not created:
            bookmark.delete()
        return Response({"saved": created})

    @action(detail=True, methods=["post"])
    def apply(self, request, slug=None):
        opportunity = self.get_object()
        serializer = ApplicationCreateSerializer(
            data=request.data, context={"request": request, "opportunity": opportunity}
        )
        serializer.is_valid(raise_exception=True)
        application = serializer.save()
        return Response(
            OpportunityApplicationSerializer(application, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def applications(self, request, slug=None):
        opportunity = self.get_object()
        queryset = opportunity.applications.select_related(
            "applicant", "applicant__institution", "opportunity"
        ).order_by("-created_at")
        status_values = comma_values(request.query_params.get("status"))
        if status_values:
            queryset = queryset.filter(status__in=status_values)
        page, page_size = page_params(request, 20)
        total = queryset.count()
        start = (page - 1) * page_size
        items = queryset[start : start + page_size]
        return Response(
            {
                "count": total,
                "results": OpportunityApplicationSerializer(
                    items, many=True, context={"request": request}
                ).data,
            }
        )


class MyApplicationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = request.user.opportunity_applications.select_related(
            "opportunity"
        ).prefetch_related("opportunity__categories").order_by("-created_at")
        return Response(
            {
                "count": queryset.count(),
                "results": OpportunityApplicationSerializer(
                    queryset, many=True, context={"request": request}
                ).data,
            }
        )


class ApplicationReviewViewSet(viewsets.GenericViewSet):
    permission_classes = [IsStaff]
    serializer_class = OpportunityApplicationSerializer

    def get_queryset(self):
        qs = OpportunityApplication.objects.select_related(
            "applicant", "applicant__institution", "opportunity"
        ).order_by("-created_at")
        opportunity = self.request.query_params.get("opportunity")
        if opportunity:
            qs = qs.filter(opportunity__slug=opportunity)
        status_values = comma_values(self.request.query_params.get("status"))
        if status_values:
            qs = qs.filter(status__in=status_values)
        return qs

    def list(self, request):
        queryset = self.get_queryset()
        page, page_size = page_params(request, 20)
        total = queryset.count()
        start = (page - 1) * page_size
        items = queryset[start : start + page_size]
        return Response(
            {
                "count": total,
                "results": OpportunityApplicationSerializer(
                    items, many=True, context={"request": request}
                ).data,
            }
        )

    def partial_update(self, request, pk=None):
        application = get_object_or_404(OpportunityApplication, pk=pk)
        serializer = ApplicationReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        application.status = data["status"]
        application.review_note = data.get("reviewNote", "").strip()[:2000]
        application.save(update_fields=["status", "review_note", "updated_at"])
        Notification.notify(
            application.applicant,
            "Your application was updated",
            actor=request.user,
            kind=Notification.Kind.APPLICATION,
            message=(
                f"Your application to {application.opportunity.title} is now "
                f"{application.get_status_display().lower()}."
            ),
            url="/dashboard/applications",
        )
        return Response(
            OpportunityApplicationSerializer(application, context={"request": request}).data
        )


class ModerationStatsMixin:
    """Shared aggregate helper for the staff overview endpoint."""

    @staticmethod
    def counts():
        return Opportunity.objects.aggregate(
            total=Count("id"),
        )

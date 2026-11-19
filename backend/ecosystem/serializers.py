from __future__ import annotations

from pathlib import Path
from urllib.parse import urljoin

from django.conf import settings
from django.db import models, transaction
from django.db.models import Count, Q
from django.urls import reverse
from rest_framework import serializers

from accounts.models import Notification, User
from accounts.serializers import UserSummarySerializer
from core.constants import INSTITUTION_TYPES, TANZANIA_REGIONS
from core.serializers import NullableSlugRelatedField
from core.utils import clean_string_list
from .media import (
    MediaValidationError,
    generate_thumbnail,
    validate_image_upload,
    validate_video_poster,
    validate_video_upload,
)
from .models import (
    Category,
    CollaborationRequest,
    Comment,
    Innovation,
    InnovationMedia,
    Institution,
    Report,
)


def _public_absolute(request, path: str | None) -> str | None:
    if not path:
        return None
    configured = settings.API_PUBLIC_URL
    if configured:
        return urljoin(configured + "/", path.lstrip("/"))
    return request.build_absolute_uri(path) if request else path


def _absolute(request, url: str | None) -> str | None:
    return _public_absolute(request, url)


def _media_url(request, view_name: str, media: InnovationMedia) -> str:
    path = reverse(view_name, kwargs={"media_id": media.pk})
    return _public_absolute(request, path)


class CategorySerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="slug", read_only=True)
    en = serializers.CharField(source="name_en", read_only=True)
    sw = serializers.CharField(source="name_sw", read_only=True)
    count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "en", "sw", "icon", "count"]

    def get_count(self, obj):
        annotated = getattr(obj, "published_innovation_count", None)
        if annotated is not None:
            return annotated
        return obj.innovations.filter(status=Innovation.Status.PUBLISHED).count()


class InstitutionSummarySerializer(serializers.ModelSerializer):
    short = serializers.CharField(source="short_name")
    focus = serializers.SlugRelatedField(many=True, read_only=True, slug_field="slug")

    class Meta:
        model = Institution
        fields = [
            "slug",
            "name",
            "short",
            "type",
            "location",
            "description",
            "website",
            "verified",
            "focus",
        ]


class InstitutionSerializer(InstitutionSummarySerializer):
    innovationCount = serializers.SerializerMethodField()
    isActive = serializers.BooleanField(source="is_active", read_only=True)

    class Meta(InstitutionSummarySerializer.Meta):
        fields = [*InstitutionSummarySerializer.Meta.fields, "innovationCount", "isActive"]

    def get_innovationCount(self, obj):
        annotated = getattr(obj, "published_innovation_count", None)
        if annotated is not None:
            return annotated
        return obj.innovations.filter(status=Innovation.Status.PUBLISHED).count()


class InstitutionWriteSerializer(serializers.ModelSerializer):
    focus = serializers.SlugRelatedField(
        many=True, slug_field="slug", queryset=Category.objects.all(), required=False
    )

    class Meta:
        model = Institution
        fields = [
            "name",
            "short_name",
            "type",
            "location",
            "description",
            "website",
            "verified",
            "focus",
            "is_active",
        ]

    def validate_type(self, value):
        if value not in dict(INSTITUTION_TYPES):
            raise serializers.ValidationError("Choose a valid institution type.")
        return value

    def update(self, instance, validated_data):
        focus = validated_data.pop("focus", None)
        instance = super().update(instance, validated_data)
        if focus is not None:
            instance.focus.set(focus)
        return instance


class InnovationMediaSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    thumbnailUrl = serializers.SerializerMethodField()
    originalFilename = serializers.CharField(source="original_filename", read_only=True)
    fileSize = serializers.IntegerField(source="file_size", read_only=True)
    mimeType = serializers.CharField(source="mime_type", read_only=True)
    uploadedAt = serializers.DateTimeField(source="uploaded_at", read_only=True)

    class Meta:
        model = InnovationMedia
        fields = [
            "id",
            "kind",
            "designation",
            "url",
            "thumbnailUrl",
            "originalFilename",
            "fileSize",
            "mimeType",
            "uploadedAt",
            "order",
        ]

    def get_url(self, obj):
        return _media_url(self.context.get("request"), "innovation-media-file", obj)

    def get_thumbnailUrl(self, obj):
        if obj.thumbnail:
            return _media_url(self.context.get("request"), "innovation-media-thumbnail", obj)
        if obj.kind == InnovationMedia.Kind.IMAGE:
            return _media_url(self.context.get("request"), "innovation-media-file", obj)
        return None


class InnovationReadSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category_id", read_only=True)
    creator = UserSummarySerializer(read_only=True)
    team = UserSummarySerializer(many=True, read_only=True)
    institution = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    media = serializers.SerializerMethodField()
    previewImage = serializers.SerializerMethodField()
    mediaCounts = serializers.SerializerMethodField()
    likes = serializers.SerializerMethodField()
    comments = serializers.SerializerMethodField()
    publishedAt = serializers.DateTimeField(source="published_at", read_only=True)
    viewer = serializers.SerializerMethodField()

    class Meta:
        model = Innovation
        fields = [
            "slug",
            "title",
            "tagline",
            "description",
            "problem",
            "solution",
            "objectives",
            "tech",
            "category",
            "stage",
            "image",
            "media",
            "previewImage",
            "mediaCounts",
            "creator",
            "team",
            "institution",
            "region",
            "likes",
            "comments",
            "views",
            "publishedAt",
            "featured",
            "trending",
            "link",
            "status",
            "viewer",
        ]

    def get_institution(self, obj):
        if not obj.institution:
            return None
        return InstitutionSummarySerializer(obj.institution, context=self.context).data

    def get_image(self, obj):
        request = self.context.get("request")
        if not obj.image:
            return None
        return _absolute(request, obj.image.url)

    def _media_items(self, obj):
        prefetched = getattr(obj, "_prefetched_objects_cache", {})
        if "media" in prefetched:
            return list(prefetched["media"])
        return list(obj.media.all())

    def get_media(self, obj):
        return InnovationMediaSerializer(
            self._media_items(obj), many=True, context=self.context
        ).data

    def get_previewImage(self, obj):
        request = self.context.get("request")
        images = [item for item in self._media_items(obj) if item.kind == InnovationMedia.Kind.IMAGE]
        if not images:
            return None
        first = images[0]
        if first.thumbnail:
            return _media_url(request, "innovation-media-thumbnail", first)
        return _media_url(request, "innovation-media-file", first)

    def get_mediaCounts(self, obj):
        items = self._media_items(obj)
        return {
            "images": sum(1 for item in items if item.kind == InnovationMedia.Kind.IMAGE),
            "videos": sum(1 for item in items if item.kind == InnovationMedia.Kind.VIDEO),
        }

    def get_likes(self, obj):
        live = getattr(obj, "live_likes", None)
        if live is None:
            live = obj.likes.count()
        return obj.legacy_likes + live

    def get_comments(self, obj):
        annotated = getattr(obj, "live_comments", None)
        if annotated is not None:
            return annotated
        return obj.comments.filter(is_hidden=False).count()

    def get_viewer(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        authenticated = bool(user and user.is_authenticated)
        liked = getattr(obj, "viewer_liked", None)
        saved = getattr(obj, "viewer_saved", None)
        if authenticated and liked is None:
            liked = obj.likes.filter(user=user).exists()
        if authenticated and saved is None:
            saved = obj.bookmarks.filter(user=user).exists()
        collaboration_status = None
        if authenticated and self.context.get("include_collaboration"):
            collab = (
                CollaborationRequest.objects.filter(sender=user, innovation=obj)
                .order_by("-created_at")
                .values_list("status", flat=True)
                .first()
            )
            collaboration_status = collab
        return {
            "liked": bool(liked) if authenticated else False,
            "saved": bool(saved) if authenticated else False,
            "isOwner": bool(authenticated and obj.creator_id == user.id),
            "collaborationStatus": collaboration_status,
        }


class InnovationWriteSerializer(serializers.ModelSerializer):
    category = serializers.SlugRelatedField(slug_field="slug", queryset=Category.objects.all())
    institution = NullableSlugRelatedField(
        slug_field="slug",
        queryset=Institution.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    region = serializers.ChoiceField(choices=[(r, r) for r in TANZANIA_REGIONS])
    stage = serializers.ChoiceField(choices=Innovation.Stage.choices)
    objectives = serializers.ListField(child=serializers.CharField(max_length=300), required=False)
    tech = serializers.ListField(child=serializers.CharField(max_length=60), required=False)
    teamEmails = serializers.ListField(
        child=serializers.EmailField(), required=False, write_only=True, max_length=20
    )
    images = serializers.ListField(
        child=serializers.FileField(), required=False, write_only=True,
        max_length=settings.MAX_INNOVATION_MEDIA_IMAGES,
    )
    videos = serializers.ListField(
        child=serializers.FileField(), required=False, write_only=True,
        max_length=settings.MAX_INNOVATION_MEDIA_VIDEOS,
    )
    videoPosters = serializers.ListField(
        child=serializers.FileField(), required=False, write_only=True,
        max_length=settings.MAX_INNOVATION_MEDIA_VIDEOS,
    )
    primaryVideoIndex = serializers.IntegerField(required=False, min_value=0, max_value=1)
    primaryVideoId = serializers.IntegerField(required=False, min_value=1)
    removeMediaIds = serializers.ListField(
        child=serializers.IntegerField(min_value=1), required=False, write_only=True,
        max_length=settings.MAX_INNOVATION_MEDIA_IMAGES + settings.MAX_INNOVATION_MEDIA_VIDEOS,
    )
    status = serializers.ChoiceField(
        choices=[Innovation.Status.DRAFT, Innovation.Status.PUBLISHED],
        required=False,
    )

    class Meta:
        model = Innovation
        fields = [
            "title",
            "tagline",
            "description",
            "problem",
            "solution",
            "objectives",
            "tech",
            "category",
            "stage",
            "image",
            "institution",
            "region",
            "link",
            "status",
            "teamEmails",
            "images",
            "videos",
            "videoPosters",
            "primaryVideoIndex",
            "primaryVideoId",
            "removeMediaIds",
        ]

    def validate_image(self, value):
        if value and value.size > settings.MAX_INNOVATION_IMAGE_BYTES:
            raise serializers.ValidationError("Innovation images must be 5 MB or smaller.")
        return value

    def validate_title(self, value):
        value = " ".join(value.split())
        if len(value) < 3:
            raise serializers.ValidationError("Enter a title of at least 3 characters.")
        return value

    def validate_objectives(self, value):
        cleaned = clean_string_list(value, max_items=20, max_length=300)
        if not cleaned:
            raise serializers.ValidationError("Add at least one objective.")
        return cleaned

    def validate_tech(self, value):
        return clean_string_list(value, max_items=30, max_length=60)

    def _resolve_team(self, emails):
        if not emails:
            return []
        emails = [email.strip().lower() for email in emails if email.strip()]
        if not emails:
            return []
        users = list(User.objects.filter(email__in=emails, is_active=True))
        found = {user.email for user in users}
        missing = [email for email in emails if email not in found]
        if missing:
            raise serializers.ValidationError(
                {"teamEmails": f"No TIE account found for: {', '.join(sorted(set(missing)))}"}
            )
        return users

    def validate_images(self, value):
        for index, upload in enumerate(value):
            try:
                validate_image_upload(upload, label=f"Image {index + 1}")
            except MediaValidationError as exc:
                raise serializers.ValidationError(str(exc)) from None
        return value

    def validate_videos(self, value):
        for index, upload in enumerate(value):
            try:
                validate_video_upload(upload, label=f"Video {index + 1}")
            except MediaValidationError as exc:
                raise serializers.ValidationError(str(exc)) from None
        return value

    def validate_videoPosters(self, value):
        for index, upload in enumerate(value):
            try:
                validate_video_poster(upload)
            except MediaValidationError as exc:
                raise serializers.ValidationError(str(exc)) from None
        return value

    def validate(self, attrs):
        instance = self.instance
        remove_ids = set(attrs.get("removeMediaIds") or [])
        new_images = attrs.get("images") or []
        new_videos = attrs.get("videos") or []
        posters = attrs.get("videoPosters") or []
        existing = list(instance.media.all()) if instance else []
        existing_ids = {item.id for item in existing}

        if remove_ids and not instance:
            raise serializers.ValidationError({"removeMediaIds": "There are no saved media files to remove."})
        unknown_ids = remove_ids - existing_ids
        if unknown_ids:
            raise serializers.ValidationError(
                {"removeMediaIds": "You can only remove media that belongs to this innovation."}
            )
        remaining = [item for item in existing if item.id not in remove_ids]
        image_count = sum(1 for item in remaining if item.kind == InnovationMedia.Kind.IMAGE) + len(new_images)
        video_count = sum(1 for item in remaining if item.kind == InnovationMedia.Kind.VIDEO) + len(new_videos)
        if image_count > settings.MAX_INNOVATION_MEDIA_IMAGES:
            raise serializers.ValidationError(
                {"images": f"You can have at most {settings.MAX_INNOVATION_MEDIA_IMAGES} images per innovation."}
            )
        if video_count > settings.MAX_INNOVATION_MEDIA_VIDEOS:
            raise serializers.ValidationError(
                {"videos": f"You can have at most {settings.MAX_INNOVATION_MEDIA_VIDEOS} videos per innovation."}
            )
        if posters and len(posters) != len(new_videos):
            raise serializers.ValidationError(
                {"videoPosters": "A poster is required for every newly uploaded video."}
            )
        primary_index = attrs.get("primaryVideoIndex")
        primary_id = attrs.get("primaryVideoId")
        if primary_index is not None and primary_id is not None:
            raise serializers.ValidationError("Choose a single primary video.")
        if primary_index is not None and primary_index >= len(new_videos):
            raise serializers.ValidationError({"primaryVideoIndex": "Choose a valid new video."})
        if primary_id is not None:
            remaining_video_ids = {
                item.id for item in remaining if item.kind == InnovationMedia.Kind.VIDEO
            }
            if primary_id not in remaining_video_ids:
                raise serializers.ValidationError(
                    {"primaryVideoId": "Choose a video attached to this innovation."}
                )
        attrs["_media_plan"] = {
            "remove_ids": remove_ids,
            "images": new_images,
            "videos": new_videos,
            "posters": posters,
            "primary_video_index": primary_index,
            "primary_video_id": primary_id,
        }
        return attrs

    def _apply_media(self, innovation, plan):
        if not plan:
            return
        if plan["remove_ids"]:
            innovation.media.filter(id__in=plan["remove_ids"]).delete()

        new_images = []
        for index, upload in enumerate(plan["images"]):
            mime = validate_image_upload(upload, label=f"Image {index + 1}")
            media = InnovationMedia.objects.create(
                innovation=innovation,
                kind=InnovationMedia.Kind.IMAGE,
                designation=InnovationMedia.Designation.GALLERY,
                file=upload,
                original_filename=Path(upload.name).name[:255],
                file_size=getattr(upload, "size", 0),
                mime_type=mime,
                order=innovation.media.filter(kind=InnovationMedia.Kind.IMAGE).count() + index,
            )
            generate_thumbnail(media)
            new_images.append(media)

        new_videos = []
        for index, upload in enumerate(plan["videos"]):
            mime = validate_video_upload(upload, label=f"Video {index + 1}")
            media = InnovationMedia.objects.create(
                innovation=innovation,
                kind=InnovationMedia.Kind.VIDEO,
                designation=InnovationMedia.Designation.DEMO,
                file=upload,
                original_filename=Path(upload.name).name[:255],
                file_size=getattr(upload, "size", 0),
                mime_type=mime,
                order=innovation.media.filter(kind=InnovationMedia.Kind.VIDEO).count() + index,
            )
            if plan["posters"]:
                generate_thumbnail(media, source=plan["posters"][index])
            new_videos.append(media)

        images = list(
            innovation.media.filter(kind=InnovationMedia.Kind.IMAGE).order_by("order", "id")
        )
        for index, media in enumerate(images):
            if media.order != index:
                media.order = index
                media.save(update_fields=["order"])

        videos = list(
            innovation.media.filter(kind=InnovationMedia.Kind.VIDEO).order_by("order", "id")
        )
        primary = None
        if plan["primary_video_id"]:
            primary = next((item for item in videos if item.id == plan["primary_video_id"]), None)
        elif plan["primary_video_index"] is not None:
            index = plan["primary_video_index"]
            primary = new_videos[index] if index < len(new_videos) else None
        else:
            primary = next(
                (item for item in videos if item.designation == InnovationMedia.Designation.PITCH),
                None,
            )
        if primary is None and videos:
            primary = videos[0]
        for index, media in enumerate(videos):
            designation = (
                InnovationMedia.Designation.PITCH
                if primary and media.id == primary.id
                else InnovationMedia.Designation.DEMO
            )
            if media.order != index or media.designation != designation:
                media.order = index
                media.designation = designation
                media.save(update_fields=["order", "designation"])

        if hasattr(innovation, "_prefetched_objects_cache"):
            innovation._prefetched_objects_cache.pop("media", None)

    def _pop_media_fields(self, validated_data):
        for field in (
            "images",
            "videos",
            "videoPosters",
            "primaryVideoIndex",
            "primaryVideoId",
            "removeMediaIds",
        ):
            validated_data.pop(field, None)

    def create(self, validated_data):
        team_emails = validated_data.pop("teamEmails", [])
        media_plan = validated_data.pop("_media_plan", None)
        self._pop_media_fields(validated_data)
        team = self._resolve_team(team_emails)
        creator = self.context["request"].user
        if "status" not in validated_data:
            validated_data["status"] = (
                Innovation.Status.PUBLISHED
                if settings.AUTO_PUBLISH_INNOVATIONS
                else Innovation.Status.DRAFT
            )
        with transaction.atomic():
            innovation = Innovation.objects.create(creator=creator, **validated_data)
            innovation.team.set([member for member in team if member.pk != creator.pk])
            self._apply_media(innovation, media_plan)
        return innovation

    def update(self, instance, validated_data):
        team_emails = validated_data.pop("teamEmails", None)
        media_plan = validated_data.pop("_media_plan", None)
        self._pop_media_fields(validated_data)
        with transaction.atomic():
            instance = super().update(instance, validated_data)
            if team_emails is not None:
                team = self._resolve_team(team_emails)
                instance.team.set([member for member in team if member.pk != instance.creator_id])
            self._apply_media(instance, media_plan)
        return instance


class InnovationModerationSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Innovation.Status.choices, required=False)
    featured = serializers.BooleanField(required=False)
    trending = serializers.BooleanField(required=False)


class CommentSerializer(serializers.ModelSerializer):
    author = UserSummarySerializer(read_only=True)
    canEdit = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    isHidden = serializers.BooleanField(source="is_hidden", read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "body", "author", "canEdit", "createdAt", "isHidden"]
        read_only_fields = ["isHidden"]

    def get_canEdit(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        return bool(user and user.is_authenticated and (user.is_staff or obj.author_id == user.id))

    def validate_body(self, value):
        body = value.strip()
        if len(body) < 2:
            raise serializers.ValidationError("Write at least a few words.")
        return body

    def create(self, validated_data):
        request = self.context["request"]
        innovation = self.context["innovation"]
        comment = Comment.objects.create(
            innovation=innovation, author=request.user, **validated_data
        )
        Notification.notify(
            innovation.creator,
            "New comment on your innovation",
            actor=request.user,
            kind=Notification.Kind.COMMENT,
            message=f"{request.user.display_name} commented on {innovation.title}.",
            url=f"/innovations/{innovation.slug}",
        )
        return comment


class CollaborationRequestSerializer(serializers.ModelSerializer):
    sender = UserSummarySerializer(read_only=True)
    recipient = UserSummarySerializer(read_only=True)
    innovation = serializers.SerializerMethodField()
    responseMessage = serializers.CharField(source="response_message", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    canRespond = serializers.SerializerMethodField()
    canWithdraw = serializers.SerializerMethodField()

    class Meta:
        model = CollaborationRequest
        fields = [
            "id",
            "sender",
            "recipient",
            "innovation",
            "message",
            "status",
            "responseMessage",
            "canRespond",
            "canWithdraw",
            "createdAt",
        ]

    def get_innovation(self, obj):
        if not obj.innovation:
            return None
        return {
            "slug": obj.innovation.slug,
            "title": obj.innovation.title,
        }

    def get_canRespond(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        return bool(user and user.is_authenticated and obj.recipient_id == user.id and obj.status == "pending")

    def get_canWithdraw(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        return bool(user and user.is_authenticated and obj.sender_id == user.id and obj.status == "pending")


class CollaborationRequestCreateSerializer(serializers.Serializer):
    innovation = serializers.SlugRelatedField(
        slug_field="slug",
        queryset=Innovation.objects.filter(status=Innovation.Status.PUBLISHED),
        required=False,
        allow_null=True,
    )
    recipient = serializers.SlugRelatedField(
        slug_field="slug", queryset=User.objects.filter(is_active=True), required=False, allow_null=True
    )
    message = serializers.CharField(min_length=10, max_length=2000)

    def validate(self, attrs):
        request = self.context["request"]
        innovation = attrs.get("innovation")
        recipient = attrs.get("recipient")
        if not innovation and not recipient:
            raise serializers.ValidationError("Choose an innovator or innovation to contact.")
        if innovation:
            expected = innovation.creator
            if recipient and recipient.pk != expected.pk:
                raise serializers.ValidationError(
                    {"recipient": "This innovation belongs to a different innovator."}
                )
            recipient = expected
        if recipient.pk == request.user.pk:
            raise serializers.ValidationError("You cannot send a collaboration request to yourself.")
        if CollaborationRequest.objects.filter(
            sender=request.user,
            recipient=recipient,
            innovation=innovation,
            status=CollaborationRequest.Status.PENDING,
        ).exists():
            raise serializers.ValidationError("You already have a pending request for this innovation.")
        attrs["recipient"] = recipient
        attrs["message"] = attrs["message"].strip()
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        collab = CollaborationRequest.objects.create(sender=request.user, **validated_data)
        Notification.notify(
            collab.recipient,
            "New collaboration request",
            actor=request.user,
            kind=Notification.Kind.COLLABORATION_REQUEST,
            message=f"{request.user.display_name}: {collab.message[:180]}",
            url="/dashboard/requests",
        )
        return collab


class ReportCreateSerializer(serializers.Serializer):
    innovation = serializers.SlugRelatedField(
        slug_field="slug", queryset=Innovation.objects.all(), required=False, allow_null=True
    )
    comment = serializers.PrimaryKeyRelatedField(
        queryset=Comment.objects.all(), required=False, allow_null=True
    )
    reason = serializers.ChoiceField(choices=Report.Reason.choices)
    details = serializers.CharField(max_length=1500, required=False, allow_blank=True)

    def validate(self, attrs):
        innovation = attrs.get("innovation")
        comment = attrs.get("comment")
        if bool(innovation) == bool(comment):
            raise serializers.ValidationError("Report exactly one item.")
        request = self.context["request"]
        existing = Report.objects.filter(
            reporter=request.user, innovation=innovation, comment=comment, status=Report.Status.OPEN
        )
        if existing.exists():
            raise serializers.ValidationError("You already have an open report for this item.")
        attrs["details"] = (attrs.get("details") or "").strip()
        return attrs

    def create(self, validated_data):
        return Report.objects.create(reporter=self.context["request"].user, **validated_data)


class ReportSerializer(serializers.ModelSerializer):
    reporter = UserSummarySerializer(read_only=True)
    innovation = serializers.SerializerMethodField()
    comment = serializers.SerializerMethodField()
    reviewedBy = UserSummarySerializer(source="reviewed_by", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    resolutionNote = serializers.CharField(source="resolution_note", read_only=True)

    class Meta:
        model = Report
        fields = [
            "id",
            "reporter",
            "innovation",
            "comment",
            "reason",
            "details",
            "status",
            "resolutionNote",
            "reviewedBy",
            "createdAt",
        ]

    def get_innovation(self, obj):
        if not obj.innovation:
            return None
        return {"slug": obj.innovation.slug, "title": obj.innovation.title}

    def get_comment(self, obj):
        if not obj.comment:
            return None
        return {
            "id": obj.comment_id,
            "body": obj.comment.body[:200],
            "author": obj.comment.author.display_name,
            "innovationSlug": obj.comment.innovation.slug,
        }


def annotate_innovation_metrics(queryset, user=None):
    """Attach live counts (and viewer flags) used by InnovationReadSerializer."""
    queryset = queryset.annotate(
        live_likes=Count("likes", distinct=True),
        live_comments=Count("comments", filter=Q(comments__is_hidden=False), distinct=True),
    )
    if user and user.is_authenticated:
        from .models import InnovationBookmark, InnovationLike

        queryset = queryset.annotate(
            viewer_liked=models.Exists(
                InnovationLike.objects.filter(innovation=models.OuterRef("pk"), user=user)
            ),
            viewer_saved=models.Exists(
                InnovationBookmark.objects.filter(innovation=models.OuterRef("pk"), user=user)
            ),
        )
    return queryset

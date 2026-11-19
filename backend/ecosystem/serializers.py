from __future__ import annotations

from django.conf import settings
from django.db import models
from django.db.models import Count, Q
from rest_framework import serializers

from accounts.models import Notification, User
from accounts.serializers import UserSummarySerializer
from core.constants import INSTITUTION_TYPES, TANZANIA_REGIONS
from core.serializers import NullableSlugRelatedField
from core.utils import clean_string_list
from .models import (
    Category,
    CollaborationRequest,
    Comment,
    Innovation,
    Institution,
    Report,
)


def _absolute(request, url: str | None) -> str | None:
    if not url:
        return None
    return request.build_absolute_uri(url) if request else url


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


class InnovationReadSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category_id", read_only=True)
    creator = UserSummarySerializer(read_only=True)
    team = UserSummarySerializer(many=True, read_only=True)
    institution = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
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

    def create(self, validated_data):
        team_emails = validated_data.pop("teamEmails", [])
        team = self._resolve_team(team_emails)
        creator = self.context["request"].user
        if "status" not in validated_data:
            validated_data["status"] = (
                Innovation.Status.PUBLISHED
                if settings.AUTO_PUBLISH_INNOVATIONS
                else Innovation.Status.DRAFT
            )
        innovation = Innovation.objects.create(creator=creator, **validated_data)
        innovation.team.set([member for member in team if member.pk != creator.pk])
        return innovation

    def update(self, instance, validated_data):
        team_emails = validated_data.pop("teamEmails", None)
        instance = super().update(instance, validated_data)
        if team_emails is not None:
            team = self._resolve_team(team_emails)
            instance.team.set([member for member in team if member.pk != instance.creator_id])
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

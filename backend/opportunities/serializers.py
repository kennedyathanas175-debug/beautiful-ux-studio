from __future__ import annotations

from django.db import models
from django.utils import timezone
from rest_framework import serializers

from accounts.models import Notification, User
from accounts.serializers import UserSummarySerializer
from core.constants import OPPORTUNITY_TYPES
from core.utils import clean_string_list
from ecosystem.models import Category
from .models import Opportunity, OpportunityApplication


class OpportunitySerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="slug", read_only=True)
    categories = serializers.SlugRelatedField(many=True, read_only=True, slug_field="slug")
    daysLeft = serializers.SerializerMethodField()
    isOpen = serializers.BooleanField(source="is_open", read_only=True)
    viewer = serializers.SerializerMethodField()
    applicationCount = serializers.SerializerMethodField()

    class Meta:
        model = Opportunity
        fields = [
            "id",
            "slug",
            "title",
            "type",
            "organizer",
            "deadline",
            "location",
            "summary",
            "eligibility",
            "reward",
            "categories",
            "external_url",
            "status",
            "daysLeft",
            "isOpen",
            "viewer",
            "applicationCount",
        ]

    def get_daysLeft(self, obj):
        return (obj.deadline - timezone.localdate()).days

    def get_viewer(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        saved = getattr(obj, "viewer_saved", None)
        status = getattr(obj, "viewer_application_status", None)
        if user and user.is_authenticated and saved is None:
            saved = obj.bookmarks.filter(user=user).exists()
        if user and user.is_authenticated and status is None:
            status = (
                OpportunityApplication.objects.filter(opportunity=obj, applicant=user)
                .values_list("status", flat=True)
                .first()
            )
        return {
            "saved": bool(saved) if user and user.is_authenticated else False,
            "applicationStatus": status if user and user.is_authenticated else None,
        }

    def get_applicationCount(self, obj):
        annotated = getattr(obj, "application_count_value", None)
        return annotated if annotated is not None else obj.applications.count()


class OpportunityWriteSerializer(serializers.ModelSerializer):
    categories = serializers.SlugRelatedField(
        many=True, slug_field="slug", queryset=Category.objects.all(), required=False
    )
    eligibility = serializers.ListField(child=serializers.CharField(max_length=300), required=False)

    class Meta:
        model = Opportunity
        fields = [
            "title",
            "type",
            "organizer",
            "deadline",
            "location",
            "summary",
            "eligibility",
            "reward",
            "categories",
            "external_url",
            "status",
        ]

    def validate_type(self, value):
        if value not in dict(OPPORTUNITY_TYPES):
            raise serializers.ValidationError("Choose a valid opportunity type.")
        return value

    def validate_eligibility(self, value):
        return clean_string_list(value, max_items=20, max_length=300)

    def validate_deadline(self, value):
        if not self.instance and value < timezone.localdate():
            raise serializers.ValidationError("Choose a deadline in the future.")
        return value

    def create(self, validated_data):
        categories = validated_data.pop("categories", [])
        opportunity = Opportunity.objects.create(
            created_by=self.context["request"].user, **validated_data
        )
        opportunity.categories.set(categories)
        return opportunity

    def update(self, instance, validated_data):
        categories = validated_data.pop("categories", None)
        instance = super().update(instance, validated_data)
        if categories is not None:
            instance.categories.set(categories)
        return instance


class OpportunityApplicationSerializer(serializers.ModelSerializer):
    applicant = UserSummarySerializer(read_only=True)
    applicantEmail = serializers.SerializerMethodField()
    opportunity = serializers.SerializerMethodField()
    reviewNote = serializers.CharField(source="review_note", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = OpportunityApplication
        fields = [
            "id",
            "opportunity",
            "applicant",
            "applicantEmail",
            "motivation",
            "status",
            "reviewNote",
            "createdAt",
        ]

    def get_applicantEmail(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if user and user.is_staff:
            return obj.applicant.email
        return None

    def get_opportunity(self, obj):
        return {
            "slug": obj.opportunity.slug,
            "title": obj.opportunity.title,
            "deadline": obj.opportunity.deadline,
        }


class ApplicationCreateSerializer(serializers.Serializer):
    motivation = serializers.CharField(min_length=20, max_length=4000)

    def validate(self, attrs):
        opportunity = self.context["opportunity"]
        if not opportunity.is_open:
            raise serializers.ValidationError("This opportunity is no longer accepting applications.")
        if OpportunityApplication.objects.filter(
            opportunity=opportunity, applicant=self.context["request"].user
        ).exists():
            raise serializers.ValidationError("You have already applied to this opportunity.")
        attrs["motivation"] = attrs["motivation"].strip()
        return attrs

    def create(self, validated_data):
        application = OpportunityApplication.objects.create(
            opportunity=self.context["opportunity"],
            applicant=self.context["request"].user,
            **validated_data,
        )
        if application.opportunity.created_by_id:
            Notification.notify(
                application.opportunity.created_by,
                "New opportunity application",
                actor=application.applicant,
                kind=Notification.Kind.APPLICATION,
                message=f"{application.applicant.display_name} applied to {application.opportunity.title}.",
                url="/moderation",
            )
        return application


class ApplicationReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            OpportunityApplication.Status.UNDER_REVIEW,
            OpportunityApplication.Status.ACCEPTED,
            OpportunityApplication.Status.REJECTED,
        ]
    )
    reviewNote = serializers.CharField(max_length=2000, required=False, allow_blank=True)


def annotate_opportunity_viewer(queryset, user=None):
    queryset = queryset.annotate(
        application_count_value=models.Count("applications", distinct=True)
    )
    if user and user.is_authenticated:
        from .models import OpportunityBookmark

        queryset = queryset.annotate(
            viewer_saved=models.Exists(
                OpportunityBookmark.objects.filter(opportunity=models.OuterRef("pk"), user=user)
            ),
            viewer_application_status=models.Subquery(
                OpportunityApplication.objects.filter(
                    opportunity=models.OuterRef("pk"), applicant=user
                ).values("status")[:1]
            ),
        )
    return queryset

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.constants import OPPORTUNITY_TYPES
from core.utils import clean_string_list, unique_slugify
from ecosystem.models import Category


class Opportunity(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        CLOSED = "closed", "Closed"
        ARCHIVED = "archived", "Archived"

    slug = models.SlugField(max_length=140, unique=True, blank=True)
    title = models.CharField(max_length=200)
    type = models.CharField(max_length=30, choices=OPPORTUNITY_TYPES)
    organizer = models.CharField(max_length=180)
    deadline = models.DateField()
    location = models.CharField(max_length=150, default="Nationwide")
    summary = models.TextField(max_length=3000)
    eligibility = models.JSONField(default=list, blank=True)
    reward = models.CharField(max_length=300, blank=True)
    categories = models.ManyToManyField(Category, blank=True, related_name="opportunities")
    external_url = models.URLField(max_length=500, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PUBLISHED)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="created_opportunities"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["deadline", "-created_at"]
        indexes = [
            models.Index(fields=["status", "deadline"]),
            models.Index(fields=["type"]),
        ]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, self.title, max_length=130)
        self.eligibility = clean_string_list(self.eligibility, max_items=20, max_length=300)
        super().save(*args, **kwargs)

    @property
    def is_open(self) -> bool:
        return self.status == self.Status.PUBLISHED and self.deadline >= timezone.localdate()

    @property
    def application_count(self) -> int:
        return self.applications.count()


class OpportunityBookmark(models.Model):
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name="bookmarks")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookmarked_opportunities"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["opportunity", "user"], name="unique_opportunity_bookmark")
        ]
        ordering = ["-created_at"]


class OpportunityApplication(models.Model):
    class Status(models.TextChoices):
        SUBMITTED = "submitted", "Submitted"
        UNDER_REVIEW = "under_review", "Under review"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        WITHDRAWN = "withdrawn", "Withdrawn"

    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name="applications")
    applicant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="opportunity_applications"
    )
    motivation = models.TextField(max_length=4000)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUBMITTED)
    review_note = models.TextField(max_length=2000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["opportunity", "applicant"], name="unique_opportunity_application"
            )
        ]
        indexes = [models.Index(fields=["opportunity", "status"])]

    def __str__(self) -> str:
        return f"{self.applicant} → {self.opportunity}"

from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.db import models
from django.db.models import Count, F
from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver
from django.urls import reverse
from django.utils import timezone

from core.constants import INSTITUTION_TYPES, STAGES, TANZANIA_REGIONS
from core.utils import clean_string_list, unique_slugify
from .media import media_thumbnail_upload_to, media_upload_to, private_storage


class Category(models.Model):
    slug = models.SlugField(max_length=40, primary_key=True)
    name_en = models.CharField(max_length=80)
    name_sw = models.CharField(max_length=80)
    icon = models.CharField(max_length=40, blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "name_en"]
        verbose_name_plural = "categories"

    def __str__(self) -> str:
        return self.name_en


class Institution(models.Model):
    slug = models.SlugField(max_length=90, unique=True, blank=True)
    name = models.CharField(max_length=200)
    short_name = models.CharField(max_length=40)
    type = models.CharField(max_length=30, choices=INSTITUTION_TYPES)
    location = models.CharField(max_length=120)
    description = models.TextField(max_length=2000, blank=True)
    website = models.URLField(max_length=300, blank=True)
    verified = models.BooleanField(default=False)
    focus = models.ManyToManyField(Category, blank=True, related_name="institutions")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-verified", "name"]
        indexes = [models.Index(fields=["type"]), models.Index(fields=["is_active"])]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, self.short_name or self.name)
        if self.website:
            URLValidator()(self.website)
        super().save(*args, **kwargs)

    @property
    def innovation_count(self) -> int:
        return self.innovations.filter(status=Innovation.Status.PUBLISHED).count()


class Innovation(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        HIDDEN = "hidden", "Hidden by moderator"
        ARCHIVED = "archived", "Archived"

    class Stage(models.TextChoices):
        CONCEPT = "concept", "Concept"
        PROTOTYPE = "prototype", "Prototype"
        PILOT = "pilot", "Pilot"
        MARKET = "market", "In market"

    slug = models.SlugField(max_length=120, unique=True, blank=True)
    title = models.CharField(max_length=180)
    tagline = models.CharField(max_length=250)
    description = models.TextField(max_length=5000)
    problem = models.TextField(max_length=4000, blank=True)
    solution = models.TextField(max_length=4000, blank=True)
    objectives = models.JSONField(default=list, blank=True)
    tech = models.JSONField(default=list, blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="innovations")
    stage = models.CharField(max_length=20, choices=Stage.choices, default=Stage.CONCEPT)
    image = models.ImageField(upload_to="innovations/%Y/%m/", blank=True, null=True)
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="innovations"
    )
    team = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="team_innovations")
    institution = models.ForeignKey(
        Institution, null=True, blank=True, on_delete=models.SET_NULL, related_name="innovations"
    )
    region = models.CharField(max_length=80, choices=[(r, r) for r in TANZANIA_REGIONS])
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    featured = models.BooleanField(default=False)
    trending = models.BooleanField(default=False)
    link = models.URLField(max_length=500, blank=True)
    views = models.PositiveIntegerField(default=0)
    legacy_likes = models.PositiveIntegerField(default=0)
    search_text = models.TextField(blank=True, editable=False)
    published_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-published_at"]
        indexes = [
            models.Index(fields=["status", "-published_at"]),
            models.Index(fields=["category"]),
            models.Index(fields=["region"]),
            models.Index(fields=["stage"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(views__gte=0), name="innovation_views_non_negative"
            ),
        ]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, self.title, max_length=110)
        self.objectives = clean_string_list(self.objectives, max_items=20, max_length=300)
        self.tech = clean_string_list(self.tech, max_items=30, max_length=60)
        self.search_text = " ".join(
            [
                self.title,
                self.tagline,
                self.description or "",
                self.region,
                str(self.category_id or ""),
                " ".join(self.tech),
            ]
        ).lower()
        if self.link:
            URLValidator()(self.link)
        super().save(*args, **kwargs)

    @property
    def likes_count(self) -> int:
        return self.legacy_likes + self.likes.count()

    @property
    def comments_count(self) -> int:
        return self.comments.filter(is_hidden=False).count()

    def get_absolute_url(self) -> str:
        return reverse("innovation-detail", kwargs={"slug": self.slug})

    def can_edit(self, user) -> bool:
        return bool(user and user.is_authenticated and (user.is_staff or self.creator_id == user.id))


class InnovationMedia(models.Model):
    class Kind(models.TextChoices):
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"

    class Designation(models.TextChoices):
        GALLERY = "gallery", "Gallery image"
        PITCH = "pitch", "Innovation pitch video"
        DEMO = "demo", "Demonstration video"

    innovation = models.ForeignKey(Innovation, on_delete=models.CASCADE, related_name="media")
    kind = models.CharField(max_length=10, choices=Kind.choices)
    designation = models.CharField(max_length=20, choices=Designation.choices, default=Designation.GALLERY)
    file = models.FileField(storage=private_storage, upload_to=media_upload_to, max_length=500)
    thumbnail = models.ImageField(
        storage=private_storage,
        upload_to=media_thumbnail_upload_to,
        blank=True,
        null=True,
        max_length=500,
    )
    original_filename = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveBigIntegerField(default=0)
    mime_type = models.CharField(max_length=100, blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "id"]
        indexes = [models.Index(fields=["innovation", "kind", "order"])]
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(kind="image", designation="gallery")
                    | models.Q(kind="video", designation__in=["pitch", "demo"])
                ),
                name="valid_innovation_media_designation",
            )
        ]

    def __str__(self) -> str:
        return f"{self.kind} for {self.innovation} ({self.original_filename})"

    def save(self, *args, **kwargs):
        if self.kind == self.Kind.VIDEO and self.designation == self.Designation.GALLERY:
            self.designation = self.Designation.DEMO
        if self.file:
            try:
                self.file_size = self.file.size
            except (OSError, ValueError):
                self.file_size = self.file_size or 0
            if not self.mime_type:
                from .media import mime_for_name

                self.mime_type = mime_for_name(self.file.name)
            if not self.original_filename:
                self.original_filename = Path(self.file.name).name[:255]
        super().save(*args, **kwargs)


@receiver(pre_save, sender=InnovationMedia)
def delete_replaced_innovation_media_files(sender, instance: InnovationMedia, **kwargs) -> None:
    """Remove an old storage object when its field is replaced in place."""
    if not instance.pk:
        return
    previous = (
        InnovationMedia.objects.filter(pk=instance.pk)
        .only("file", "thumbnail")
        .first()
    )
    if not previous:
        return
    for old_field, new_field in (
        (previous.file, instance.file),
        (previous.thumbnail, instance.thumbnail),
    ):
        if old_field and old_field.name and old_field.name != (new_field.name if new_field else None):
            try:
                old_field.storage.delete(old_field.name)
            except Exception:
                pass


@receiver(post_delete, sender=InnovationMedia)
def delete_innovation_media_files(sender, instance: InnovationMedia, **kwargs) -> None:
    """Remove private storage objects when media rows are removed/replaced."""
    for field in (instance.file, instance.thumbnail):
        if field and field.name:
            try:
                field.storage.delete(field.name)
            except Exception:
                # Cleanup must never block deletion of the database record.
                pass


class InnovationLike(models.Model):
    innovation = models.ForeignKey(Innovation, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="liked_innovations")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["innovation", "user"], name="unique_innovation_like")
        ]
        ordering = ["-created_at"]


class InnovationBookmark(models.Model):
    innovation = models.ForeignKey(Innovation, on_delete=models.CASCADE, related_name="bookmarks")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookmarked_innovations"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["innovation", "user"], name="unique_innovation_bookmark")
        ]
        ordering = ["-created_at"]


class Comment(models.Model):
    innovation = models.ForeignKey(Innovation, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comments")
    body = models.TextField(max_length=2000)
    is_hidden = models.BooleanField(default=False)
    hidden_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="hidden_comments",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["innovation", "-created_at"])]

    def __str__(self) -> str:
        return f"{self.author} on {self.innovation}"

    def can_edit(self, user) -> bool:
        return bool(user and user.is_authenticated and (user.is_staff or self.author_id == user.id))


class CollaborationRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        WITHDRAWN = "withdrawn", "Withdrawn"

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_collaboration_requests"
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_collaboration_requests"
    )
    innovation = models.ForeignKey(
        Innovation, null=True, blank=True, on_delete=models.CASCADE, related_name="collaboration_requests"
    )
    message = models.TextField(max_length=2000)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    response_message = models.TextField(max_length=2000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "status"]),
            models.Index(fields=["sender", "status"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(sender=models.F("recipient")),
                name="prevent_self_collaboration_request",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.sender} → {self.recipient} ({self.status})"

    def clean(self):
        if self.sender_id and self.recipient_id and self.sender_id == self.recipient_id:
            raise ValidationError("You cannot send a collaboration request to yourself.")
        if self.innovation_id and self.innovation.creator_id != self.recipient_id:
            raise ValidationError("Collaboration requests about an innovation must target its creator.")

    def respond(self, status: str, response_message: str = "", *, actor=None) -> None:
        self.status = status
        self.response_message = response_message[:2000]
        self.responded_at = timezone.now()
        self.save(update_fields=["status", "response_message", "responded_at", "updated_at"])
        Notification.notify(
            self.sender,
            "Collaboration request updated",
            actor=actor or self.recipient,
            kind=Notification.Kind.COLLABORATION_RESPONSE,
            message=f"{self.recipient.display_name} {status} your collaboration request.",
            url="/dashboard/requests",
        )


class Report(models.Model):
    class Reason(models.TextChoices):
        SPAM = "spam", "Spam or misleading"
        ABUSE = "abuse", "Harassment or abuse"
        COPYRIGHT = "copyright", "Copyright infringement"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        RESOLVED = "resolved", "Resolved"
        DISMISSED = "dismissed", "Dismissed"

    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports")
    innovation = models.ForeignKey(
        Innovation, null=True, blank=True, on_delete=models.CASCADE, related_name="reports"
    )
    comment = models.ForeignKey(Comment, null=True, blank=True, on_delete=models.CASCADE, related_name="reports")
    reason = models.CharField(max_length=30, choices=Reason.choices)
    details = models.TextField(max_length=1500, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    resolution_note = models.TextField(max_length=1000, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_reports",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(innovation__isnull=False, comment__isnull=True)
                    | models.Q(innovation__isnull=True, comment__isnull=False)
                ),
                name="report_has_exactly_one_target",
            )
        ]
        indexes = [models.Index(fields=["status", "-created_at"])]

    def __str__(self) -> str:
        target = self.innovation or self.comment
        return f"{self.reason} report on {target}"


from accounts.models import Notification  # noqa: E402  (avoid circular import at app loading)

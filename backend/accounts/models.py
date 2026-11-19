from __future__ import annotations

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import MinLengthValidator
from django.db import models
from django.db.models import Count, Q

from core.utils import clean_links, clean_string_list, unique_slugify


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email: str, password: str | None, **extra_fields):
        if not email:
            raise ValueError("An email address is required")
        email = self.normalize_email(email).lower()
        extra_fields.setdefault("is_public", True)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email: str, password: str, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_public", False)
        extra_fields.setdefault("role", User.Role.ADMIN)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True")
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        INNOVATOR = "innovator", "Innovator"
        STUDENT = "student", "Student"
        RESEARCHER = "researcher", "Researcher"
        CREATOR = "creator", "Creator"
        INSTITUTION_REP = "institution_rep", "Institution representative"
        ADMIN = "admin", "Administrator"

    username = None
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150, validators=[MinLengthValidator(2)])
    slug = models.SlugField(max_length=90, unique=True, blank=True)
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.INNOVATOR)
    headline = models.CharField(max_length=180, blank=True)
    bio = models.TextField(max_length=2000, blank=True)
    location = models.CharField(max_length=120, blank=True)
    avatar = models.ImageField(upload_to="avatars/%Y/%m/", blank=True, null=True)
    institution = models.ForeignKey(
        "ecosystem.Institution",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="members",
    )
    skills = models.JSONField(default=list, blank=True)
    interests = models.ManyToManyField("ecosystem.Category", blank=True, related_name="interested_users")
    looking_for = models.JSONField(default=list, blank=True)
    links = models.JSONField(default=list, blank=True)
    # Imported engagement from the original platform, shown alongside live counts.
    base_followers = models.PositiveIntegerField(default=0)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]
    EMAIL_FIELD = "email"

    objects = UserManager()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["role"]),
            models.Index(fields=["is_public"]),
        ]

    def __str__(self) -> str:
        return self.full_name or self.email

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, self.full_name or self.email.split("@")[0])
        if self.email:
            self.email = self.email.lower()
        self.skills = clean_string_list(self.skills)
        self.looking_for = clean_string_list(self.looking_for)
        self.links = clean_links(self.links)
        super().save(*args, **kwargs)

    @property
    def display_name(self) -> str:
        return self.full_name or self.email

    @property
    def follower_count(self) -> int:
        return self.base_followers + self.followers.count()

    @property
    def following_count(self) -> int:
        return self.following.count()


class Follow(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name="following")
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name="followers")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["follower", "following"], name="unique_follow"),
            models.CheckConstraint(
                condition=~Q(follower=models.F("following")),
                name="prevent_self_follow",
            ),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.follower} → {self.following}"


class Notification(models.Model):
    class Kind(models.TextChoices):
        COLLABORATION_REQUEST = "collaboration_request", "Collaboration request"
        COLLABORATION_RESPONSE = "collaboration_response", "Collaboration response"
        COMMENT = "comment", "Comment"
        FOLLOW = "follow", "New follower"
        APPLICATION = "application", "Opportunity application"
        MODERATION = "moderation", "Moderation"
        SYSTEM = "system", "System"

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    actor = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="sent_notifications"
    )
    kind = models.CharField(max_length=40, choices=Kind.choices, default=Kind.SYSTEM)
    title = models.CharField(max_length=180)
    message = models.CharField(max_length=500, blank=True)
    url = models.CharField(max_length=500, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["recipient", "is_read"])]

    def __str__(self) -> str:
        return f"{self.title} → {self.recipient}"

    @classmethod
    def notify(cls, recipient, title, *, actor=None, kind=Kind.SYSTEM, message="", url=""):
        if recipient is None:
            return None
        if actor is not None and actor.pk == recipient.pk:
            return None
        return cls.objects.create(
            recipient=recipient,
            actor=actor,
            kind=kind,
            title=title[:180],
            message=(message or "")[:500],
            url=(url or "")[:500],
        )


def annotate_follower_counts(queryset):
    """Annotate users with a live follower count (excluding imported baseline)."""
    return queryset.annotate(_live_followers=Count("followers", distinct=True))


class PublicUserQuerySet(models.QuerySet):
    def public(self):
        return self.filter(is_public=True, is_active=True)


def user_is_visible(user: User | None) -> bool:
    return bool(user and user.is_active and user.is_public)

from __future__ import annotations

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import serializers

from core.serializers import NullableSlugRelatedField
from core.utils import clean_links, clean_string_list
from ecosystem.models import Category, Institution
from .models import Notification, User

ALLOWED_REGISTRATION_ROLES = {
    User.Role.INNOVATOR,
    User.Role.STUDENT,
    User.Role.RESEARCHER,
    User.Role.CREATOR,
    User.Role.INSTITUTION_REP,
}


def _photo_url(obj, request):
    if not obj.avatar:
        return None
    url = obj.avatar.url
    return request.build_absolute_uri(url) if request else url


def institution_brief(institution: Institution | None, request=None) -> dict | None:
    if not institution:
        return None
    return {
        "slug": institution.slug,
        "name": institution.name,
        "short": institution.short_name,
        "type": institution.type,
        "location": institution.location,
        "verified": institution.verified,
        "focus": [category.slug for category in institution.focus.all()],
    }


class UserSummarySerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="full_name")
    photo = serializers.SerializerMethodField()
    institution = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["slug", "name", "headline", "photo", "location", "role", "institution"]

    def get_photo(self, obj):
        return _photo_url(obj, self.context.get("request"))

    def get_institution(self, obj):
        return institution_brief(obj.institution, self.context.get("request"))


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="full_name")
    photo = serializers.SerializerMethodField()
    institution = serializers.SerializerMethodField()
    interests = serializers.SlugRelatedField(many=True, read_only=True, slug_field="slug")
    followers = serializers.SerializerMethodField()
    followingCount = serializers.SerializerMethodField()
    projectCount = serializers.SerializerMethodField()
    viewer = serializers.SerializerMethodField()
    roleLabel = serializers.CharField(source="get_role_display", read_only=True)
    isStaff = serializers.BooleanField(source="is_staff", read_only=True)
    lookingFor = serializers.JSONField(source="looking_for", read_only=True)
    isPublic = serializers.BooleanField(source="is_public", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = User
        fields = [
            "slug",
            "name",
            "role",
            "roleLabel",
            "headline",
            "bio",
            "photo",
            "location",
            "institution",
            "skills",
            "interests",
            "lookingFor",
            "links",
            "followers",
            "followingCount",
            "projectCount",
            "isPublic",
            "isStaff",
            "viewer",
            "createdAt",
        ]
        read_only_fields = fields

    def get_photo(self, obj):
        return _photo_url(obj, self.context.get("request"))

    def get_institution(self, obj):
        return institution_brief(obj.institution, self.context.get("request"))

    def get_followers(self, obj):
        live = getattr(obj, "_live_followers", None)
        if live is None:
            live = obj.followers.count()
        return obj.base_followers + live

    def get_followingCount(self, obj):
        live = getattr(obj, "_live_following", None)
        if live is None:
            live = obj.following.count()
        return live

    def get_projectCount(self, obj):
        created = getattr(obj, "_created_innovations", None)
        team = getattr(obj, "_team_innovations", None)
        if created is None or team is None:
            created = obj.innovations.filter(status="published").count()
            team = obj.team_innovations.filter(status="published").count()
        return created + team

    def get_viewer(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if not user or not user.is_authenticated:
            return {"isFollowing": False, "isSelf": False}
        return {
            "isFollowing": user.following.filter(following=obj).exists(),
            "isSelf": user.pk == obj.pk,
        }


class MeSerializer(UserSerializer):
    email = serializers.EmailField(read_only=True)

    class Meta(UserSerializer.Meta):
        fields = [*UserSerializer.Meta.fields, "email"]


class PublicProfileSerializer(UserSerializer):
    projects = serializers.SerializerMethodField()

    class Meta(UserSerializer.Meta):
        fields = [*UserSerializer.Meta.fields, "projects"]

    def get_projects(self, obj):
        from ecosystem.serializers import InnovationReadSerializer

        projects = (
            obj.innovations.filter(status="published")
            | obj.team_innovations.filter(status="published")
        ).distinct().order_by("-published_at")
        return InnovationReadSerializer(
            projects.select_related("category", "creator", "institution").prefetch_related("team", "institution__focus"),
            many=True,
            context=self.context,
        ).data


class UserUpdateSerializer(serializers.ModelSerializer):
    institution = NullableSlugRelatedField(
        slug_field="slug",
        queryset=Institution.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    interests = serializers.SlugRelatedField(
        many=True, slug_field="slug", queryset=Category.objects.all(), required=False
    )
    avatar = serializers.ImageField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = User
        fields = [
            "full_name",
            "role",
            "headline",
            "bio",
            "location",
            "institution",
            "skills",
            "interests",
            "looking_for",
            "links",
            "avatar",
            "is_public",
        ]

    def validate_role(self, value):
        if value not in ALLOWED_REGISTRATION_ROLES and not self.instance.is_staff:
            raise serializers.ValidationError("Choose a valid community role.")
        return value

    def validate_avatar(self, value):
        if value and value.size > settings.MAX_AVATAR_BYTES:
            raise serializers.ValidationError("Profile photos must be 2 MB or smaller.")
        return value

    def validate_skills(self, value):
        return clean_string_list(value, max_items=20, max_length=60)

    def validate_looking_for(self, value):
        return clean_string_list(value, max_items=15, max_length=120)

    def validate_links(self, value):
        return clean_links(value)

    def update(self, instance, validated_data):
        interests = validated_data.pop("interests", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if interests is not None:
            instance.interests.set(interests)
        return instance


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    fullName = serializers.CharField(min_length=2, max_length=150)
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    passwordConfirm = serializers.CharField(write_only=True, max_length=128)
    role = serializers.ChoiceField(choices=sorted(ALLOWED_REGISTRATION_ROLES))
    institution = serializers.SlugRelatedField(
        slug_field="slug",
        queryset=Institution.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate_fullName(self, value):
        name = " ".join(value.split())
        if len(name) < 2:
            raise serializers.ValidationError("Enter your full name.")
        return name

    def validate(self, attrs):
        if attrs["password"] != attrs["passwordConfirm"]:
            raise serializers.ValidationError({"passwordConfirm": "Passwords do not match."})
        probe = User(email=attrs["email"], full_name=attrs["fullName"])
        try:
            validate_password(attrs["password"], user=probe)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs

    def create(self, validated_data):
        validated_data.pop("passwordConfirm")
        password = validated_data.pop("password")
        institution = validated_data.pop("institution", None)
        user = User.objects.create_user(
            email=validated_data["email"],
            password=password,
            full_name=validated_data["fullName"],
            role=validated_data["role"],
            institution=institution,
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, max_length=128)

    def validate(self, attrs):
        request = self.context.get("request")
        user = authenticate(
            request=request,
            username=attrs["email"].strip().lower(),
            password=attrs["password"],
        )
        if user is None:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account has been disabled.")
        attrs["user"] = user
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def save(self):
        email = self.validated_data["email"].strip().lower()
        user = User.objects.filter(email=email, is_active=True).first()
        if not user:
            return
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?uid={uid}&token={token}"
        send_mail(
            subject="Reset your TIE password",
            message=(
                f"Hello {user.display_name},\n\n"
                "Use the link below to choose a new password. The link expires after a short time.\n\n"
                f"{reset_url}\n\n"
                "If you did not request this, you can safely ignore this email."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    passwordConfirm = serializers.CharField(write_only=True, max_length=128)

    def validate(self, attrs):
        if attrs["password"] != attrs["passwordConfirm"]:
            raise serializers.ValidationError({"passwordConfirm": "Passwords do not match."})
        try:
            user_id = force_str(urlsafe_base64_decode(attrs["uid"]))
            user = User.objects.get(pk=user_id, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({"token": "This password reset link is invalid or has expired."})
        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError({"token": "This password reset link is invalid or has expired."})
        try:
            validate_password(attrs["password"], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        attrs["user"] = user
        return attrs

    def save(self):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["password"])
        user.save(update_fields=["password"])
        return user


class NotificationSerializer(serializers.ModelSerializer):
    actor = UserSummarySerializer(read_only=True)
    isRead = serializers.BooleanField(source="is_read", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "kind", "title", "message", "url", "isRead", "actor", "createdAt"]
        read_only_fields = fields

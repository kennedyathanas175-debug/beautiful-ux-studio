from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Follow, Notification, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("-created_at",)
    list_display = ("email", "full_name", "role", "institution", "is_public", "is_staff", "is_active")
    list_filter = ("role", "is_public", "is_staff", "is_active", "institution")
    search_fields = ("email", "full_name", "headline", "location")
    readonly_fields = ("slug", "created_at", "updated_at", "last_login", "date_joined")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("full_name", "slug", "role", "headline", "bio", "location", "avatar", "institution", "is_public")}),
        ("Community", {"fields": ("skills", "interests", "looking_for", "links", "base_followers")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "date_joined", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "full_name", "role", "password1", "password2")}),
    )
    filter_horizontal = ("groups", "user_permissions", "interests")


@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    list_display = ("follower", "following", "created_at")
    search_fields = ("follower__full_name", "following__full_name")
    autocomplete_fields = ("follower", "following")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "recipient", "kind", "is_read", "created_at")
    list_filter = ("kind", "is_read")
    search_fields = ("title", "message", "recipient__email")
    autocomplete_fields = ("recipient", "actor")

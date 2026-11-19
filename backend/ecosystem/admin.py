from django.contrib import admin

from .models import (
    Category,
    CollaborationRequest,
    Comment,
    Innovation,
    InnovationBookmark,
    InnovationLike,
    Institution,
    Report,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name_en", "name_sw", "slug", "icon", "order")
    search_fields = ("name_en", "name_sw", "slug")
    prepopulated_fields = {"slug": ("name_en",)}


@admin.register(Institution)
class InstitutionAdmin(admin.ModelAdmin):
    list_display = ("name", "short_name", "type", "location", "verified", "is_active")
    list_filter = ("type", "verified", "is_active")
    search_fields = ("name", "short_name", "location")
    filter_horizontal = ("focus",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(Innovation)
class InnovationAdmin(admin.ModelAdmin):
    list_display = ("title", "creator", "category", "stage", "region", "status", "featured", "views")
    list_filter = ("status", "category", "stage", "region", "featured", "trending")
    search_fields = ("title", "tagline", "description", "creator__full_name")
    autocomplete_fields = ("creator",)
    filter_horizontal = ("team",)
    readonly_fields = ("slug", "search_text", "created_at", "updated_at", "views", "legacy_likes")
    fieldsets = (
        ("Content", {"fields": ("title", "slug", "tagline", "description", "problem", "solution", "objectives", "tech")}),
        ("Classification", {"fields": ("category", "stage", "region", "institution", "link")}),
        ("Media", {"fields": ("image",)}),
        ("People", {"fields": ("creator", "team")}),
        ("Publication", {"fields": ("status", "featured", "trending", "published_at", "views", "legacy_likes", "search_text")}),
        ("Dates", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("author", "innovation", "is_hidden", "created_at")
    list_filter = ("is_hidden",)
    search_fields = ("body", "author__email", "innovation__title")
    autocomplete_fields = ("author", "innovation")


@admin.register(InnovationLike)
class InnovationLikeAdmin(admin.ModelAdmin):
    list_display = ("user", "innovation", "created_at")
    autocomplete_fields = ("user", "innovation")


@admin.register(InnovationBookmark)
class InnovationBookmarkAdmin(admin.ModelAdmin):
    list_display = ("user", "innovation", "created_at")
    autocomplete_fields = ("user", "innovation")


@admin.register(CollaborationRequest)
class CollaborationRequestAdmin(admin.ModelAdmin):
    list_display = ("sender", "recipient", "innovation", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("sender__full_name", "recipient__full_name", "message")
    autocomplete_fields = ("sender", "recipient", "innovation")


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("reason", "reporter", "innovation", "comment", "status", "created_at")
    list_filter = ("status", "reason")
    search_fields = ("details", "reporter__email")
    autocomplete_fields = ("reporter", "innovation", "comment", "reviewed_by")

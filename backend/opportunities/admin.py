from django.contrib import admin

from .models import Opportunity, OpportunityApplication, OpportunityBookmark


@admin.register(Opportunity)
class OpportunityAdmin(admin.ModelAdmin):
    list_display = ("title", "type", "organizer", "deadline", "status", "created_at")
    list_filter = ("type", "status", "categories")
    search_fields = ("title", "organizer", "summary", "location")
    filter_horizontal = ("categories",)
    readonly_fields = ("slug", "created_at", "updated_at")


@admin.register(OpportunityApplication)
class OpportunityApplicationAdmin(admin.ModelAdmin):
    list_display = ("applicant", "opportunity", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("applicant__full_name", "applicant__email", "opportunity__title", "motivation")
    autocomplete_fields = ("applicant", "opportunity")
    readonly_fields = ("created_at", "updated_at")


@admin.register(OpportunityBookmark)
class OpportunityBookmarkAdmin(admin.ModelAdmin):
    list_display = ("user", "opportunity", "created_at")
    autocomplete_fields = ("user", "opportunity")

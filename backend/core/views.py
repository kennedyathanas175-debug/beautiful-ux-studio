from __future__ import annotations

from django.db import connection
from django.http import JsonResponse
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Notification, User
from accounts.serializers import UserSerializer
from core.permissions import IsStaff
from ecosystem.models import Category, CollaborationRequest, Innovation, Institution, Report
from ecosystem.serializers import (
    CategorySerializer,
    InnovationReadSerializer,
    InstitutionSerializer,
    ReportSerializer,
    annotate_innovation_metrics,
)
from opportunities.models import Opportunity, OpportunityApplication
from opportunities.serializers import (
    OpportunityApplicationSerializer,
    OpportunitySerializer,
    annotate_opportunity_viewer,
)


def platform_stats() -> dict:
    published = Innovation.objects.filter(status=Innovation.Status.PUBLISHED)
    return {
        "innovations": published.count(),
        "innovators": User.objects.filter(is_public=True, is_active=True).count(),
        "institutions": Institution.objects.filter(is_active=True).count(),
        "regions": published.values("region").distinct().count(),
    }


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        db_ok = True
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except Exception:
            db_ok = False
        return Response(
            {
                "status": "ok" if db_ok else "degraded",
                "database": "ok" if db_ok else "unavailable",
                "service": "tie-api",
            },
            status=200 if db_ok else 503,
        )


class StatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        stats = platform_stats()
        stats["categories"] = Category.objects.count()
        stats["opportunities"] = Opportunity.objects.filter(
            status=Opportunity.Status.PUBLISHED, deadline__gte=timezone.localdate()
        ).count()
        return Response(stats)


class HomeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user
        published = Innovation.objects.filter(status=Innovation.Status.PUBLISHED)
        base = published.select_related("category", "creator", "institution").prefetch_related(
            "team", "institution__focus", "category", "media"
        )

        latest = annotate_innovation_metrics(base, user).order_by("-published_at")[:4]
        featured = list(
            annotate_innovation_metrics(base.filter(featured=True), user).order_by("-published_at")[:4]
        )
        if len(featured) < 4:
            chosen = {item.pk for item in featured}
            for item in annotate_innovation_metrics(base.exclude(pk__in=chosen), user).order_by(
                "-published_at"
            ):
                featured.append(item)
                if len(featured) >= 4:
                    break
        trending = list(
            annotate_innovation_metrics(base.filter(trending=True), user).order_by("-views")[:6]
        )
        if not trending:
            trending = list(annotate_innovation_metrics(base, user).order_by("-views")[:6])

        now = timezone.localdate()
        opportunities = Opportunity.objects.filter(
            status=Opportunity.Status.PUBLISHED, deadline__gte=now
        ).prefetch_related("categories")
        opportunities = annotate_opportunity_viewer(opportunities, user).order_by("deadline")
        announcements = opportunities[:5]
        top_opportunities = opportunities[:3]

        innovators = (
            User.objects.filter(is_public=True, is_active=True)
            .select_related("institution")
            .prefetch_related("institution__focus", "interests")
            .annotate(
                _live_followers=Count("followers", distinct=True),
                _live_following=Count("following", distinct=True),
                _created_innovations=Count(
                    "innovations", filter=Q(innovations__status="published"), distinct=True
                ),
                _team_innovations=Count(
                    "team_innovations", filter=Q(team_innovations__status="published"), distinct=True
                ),
            )
            .order_by("-base_followers", "-created_at")[:4]
        )
        institutions = (
            Institution.objects.filter(is_active=True)
            .prefetch_related("focus")
            .annotate(
                published_innovation_count=Count(
                    "innovations",
                    filter=Q(innovations__status=Innovation.Status.PUBLISHED),
                    distinct=True,
                )
            )
            .order_by("-verified", "name")[:8]
        )
        categories = Category.objects.annotate(
            published_innovation_count=Count(
                "innovations", filter=Q(innovations__status=Innovation.Status.PUBLISHED), distinct=True
            )
        ).order_by("order", "name_en")

        return Response(
            {
                "stats": platform_stats(),
                "latest": InnovationReadSerializer(
                    latest, many=True, context={"request": request}
                ).data,
                "featured": InnovationReadSerializer(
                    featured, many=True, context={"request": request}
                ).data,
                "trending": InnovationReadSerializer(
                    trending, many=True, context={"request": request}
                ).data,
                "innovators": UserSerializer(
                    innovators, many=True, context={"request": request}
                ).data,
                "institutions": InstitutionSerializer(
                    institutions, many=True, context={"request": request}
                ).data,
                "categories": CategorySerializer(
                    categories, many=True, context={"request": request}
                ).data,
                "announcements": OpportunitySerializer(
                    announcements, many=True, context={"request": request}
                ).data,
                "opportunities": OpportunitySerializer(
                    top_opportunities, many=True, context={"request": request}
                ).data,
            }
        )


class ModerationOverviewView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        reports = Report.objects.filter(status=Report.Status.OPEN).select_related(
            "reporter", "innovation", "comment", "comment__author"
        )[:20]
        hidden = Innovation.objects.filter(status=Innovation.Status.HIDDEN).select_related(
            "creator", "category", "institution"
        )[:20]
        drafts = Innovation.objects.filter(status=Innovation.Status.DRAFT).select_related(
            "creator", "category", "institution"
        )[:20]
        applications = OpportunityApplication.objects.select_related(
            "applicant", "opportunity"
        ).order_by("-created_at")[:10]
        return Response(
            {
                "stats": {
                    "reportsOpen": Report.objects.filter(status=Report.Status.OPEN).count(),
                    "innovationsTotal": Innovation.objects.count(),
                    "innovationsPublished": Innovation.objects.filter(
                        status=Innovation.Status.PUBLISHED
                    ).count(),
                    "innovationsHidden": Innovation.objects.filter(
                        status=Innovation.Status.HIDDEN
                    ).count(),
                    "innovationsDraft": Innovation.objects.filter(
                        status=Innovation.Status.DRAFT
                    ).count(),
                    "users": User.objects.count(),
                    "opportunities": Opportunity.objects.count(),
                    "applications": OpportunityApplication.objects.count(),
                    "pendingCollaborationRequests": CollaborationRequest.objects.filter(
                        status=CollaborationRequest.Status.PENDING
                    ).count(),
                    "unreadNotifications": Notification.objects.filter(is_read=False).count(),
                },
                "reports": ReportSerializer(reports, many=True, context={"request": request}).data,
                "hiddenInnovations": InnovationReadSerializer(
                    annotate_innovation_metrics(hidden, request.user),
                    many=True,
                    context={"request": request},
                ).data,
                "draftInnovations": InnovationReadSerializer(
                    annotate_innovation_metrics(drafts, request.user),
                    many=True,
                    context={"request": request},
                ).data,
                "applications": OpportunityApplicationSerializer(
                    applications, many=True, context={"request": request}
                ).data,
            }
        )



def not_found(request, exception=None):
    if request.path.startswith("/api/") or request.path.startswith("/health"):
        return JsonResponse(
            {"error": {"code": "not_found", "message": "The requested resource was not found."}},
            status=404,
        )
    return JsonResponse(
        {"error": {"code": "not_found", "message": "The requested page was not found on this server."}},
        status=404,
    )


def server_error(request):
    return JsonResponse(
        {"error": {"code": "server_error", "message": "Something went wrong. Please try again."}},
        status=500,
    )

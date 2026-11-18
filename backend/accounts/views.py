from __future__ import annotations

import logging

from django.contrib.auth import login, logout
from django.db.models import Count, Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from core.pagination import page_params

from ecosystem.serializers import CollaborationRequestSerializer, InnovationReadSerializer
from opportunities.serializers import OpportunityApplicationSerializer
from .models import Follow, Notification, User
from .serializers import (
    LoginSerializer,
    NotificationSerializer,
    MeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PublicProfileSerializer,
    RegisterSerializer,
    UserSerializer,
    UserUpdateSerializer,
)

logger = logging.getLogger("tie")


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"detail": "CSRF cookie set."})


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request._request, user)
        return Response(
            {"user": MeSerializer(user, context={"request": request}).data},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        login(request._request, user)
        return Response({"user": MeSerializer(user, context={"request": request}).data})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request._request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"user": MeSerializer(request.user, context={"request": request}).data})

    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        request.user.refresh_from_db()
        return Response({"user": MeSerializer(request.user, context={"request": request}).data})


class PublicProfileView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        user = get_object_or_404(
            User.objects.select_related("institution").prefetch_related(
                "institution__focus", "interests", "following"
            ),
            slug=slug,
            is_active=True,
        )
        if not (user.is_public or request.user.is_staff or request.user.pk == user.pk):
            return Response(
                {"error": {"code": "not_found", "message": "The requested resource was not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )
        annotated = User.objects.select_related("institution").prefetch_related(
            "institution__focus", "interests"
        ).annotate(
            _live_followers=Count("followers", distinct=True),
            _live_following=Count("following", distinct=True),
            _created_innovations=Count(
                "innovations", filter=Q(innovations__status="published"), distinct=True
            ),
            _team_innovations=Count(
                "team_innovations", filter=Q(team_innovations__status="published"), distinct=True
            ),
        ).get(pk=user.pk)
        return Response(
            {"user": PublicProfileSerializer(annotated, context={"request": request}).data}
        )


class InnovatorListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = UserSerializer

    def get_queryset(self):
        queryset = (
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
        )
        q = self.request.query_params.get("q", "").strip()
        if q:
            queryset = queryset.filter(
                Q(full_name__icontains=q)
                | Q(headline__icontains=q)
                | Q(location__icontains=q)
                | Q(skills__icontains=q)
            )
        category = self.request.query_params.get("category", "").strip()
        if category:
            queryset = queryset.filter(interests__slug=category)
        role = self.request.query_params.get("role", "").strip()
        if role:
            queryset = queryset.filter(role=role)
        sort = self.request.query_params.get("sort", "featured")
        if sort == "newest":
            return queryset.order_by("-created_at")
        if sort == "projects":
            return queryset.order_by("-_created_innovations", "-base_followers")
        return queryset.order_by("-base_followers", "full_name")


class FollowToggleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        target = get_object_or_404(User, slug=slug, is_active=True)
        if target.pk == request.user.pk:
            return Response(
                {"error": {"code": "invalid_action", "message": "You cannot follow yourself."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        follow, created = Follow.objects.get_or_create(follower=request.user, following=target)
        if not created:
            follow.delete()
        else:
            Notification.notify(
                target,
                "New follower",
                actor=request.user,
                kind=Notification.Kind.FOLLOW,
                message=f"{request.user.display_name} started following you.",
                url=f"/innovators/{request.user.slug}",
            )
        return Response(
            {
                "following": created,
                "followers": target.follower_count,
            }
        )


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = request.user.notifications.select_related("actor").all()
        if request.query_params.get("unread") in {"1", "true"}:
            queryset = queryset.filter(is_read=False)
        page, page_size = page_params(request, 20)
        total = queryset.count()
        unread = request.user.notifications.filter(is_read=False).count()
        start = (page - 1) * page_size
        items = queryset[start : start + page_size]
        return Response(
            {
                "count": total,
                "unreadCount": unread,
                "results": NotificationSerializer(items, many=True, context={"request": request}).data,
            }
        )


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk, recipient=request.user)
        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read"])
        return Response({"id": notification.pk, "isRead": True})


class NotificationReadAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated = request.user.notifications.filter(is_read=False).update(is_read=True)
        return Response({"updated": updated})


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save()
        except Exception:
            logger.exception("Password reset email could not be sent")
        return Response(
            {"detail": "If an account exists for that email, a reset link has been sent."},
            status=status.HTTP_202_ACCEPTED,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Your password has been updated. You can log in now."})


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        innovations = user.innovations.select_related("category", "creator", "institution").prefetch_related(
            "team"
        )
        my_innovations = innovations.order_by("-updated_at")[:5]
        received_pending = user.received_collaboration_requests.filter(status="pending").select_related(
            "sender", "recipient", "innovation"
        )[:5]
        notifications = user.notifications.select_related("actor")[:5]
        applications = user.opportunity_applications.select_related("opportunity").prefetch_related(
            "opportunity__categories"
        )[:5]
        total_likes = sum(
            innovation.legacy_likes + innovation.likes.count() for innovation in innovations
        )
        return Response(
            {
                "stats": {
                    "innovations": innovations.count(),
                    "publishedInnovations": innovations.filter(status="published").count(),
                    "followers": user.follower_count,
                    "following": user.following_count,
                    "totalLikes": total_likes,
                    "savedInnovations": user.bookmarked_innovations.count(),
                    "savedOpportunities": user.bookmarked_opportunities.count(),
                    "pendingRequests": user.received_collaboration_requests.filter(status="pending").count(),
                    "unreadNotifications": user.notifications.filter(is_read=False).count(),
                },
                "innovations": InnovationReadSerializer(
                    my_innovations, many=True, context={"request": request}
                ).data,
                "requests": CollaborationRequestSerializer(
                    received_pending, many=True, context={"request": request}
                ).data,
                "notifications": NotificationSerializer(
                    notifications, many=True, context={"request": request}
                ).data,
                "applications": OpportunityApplicationSerializer(
                    applications, many=True, context={"request": request}
                ).data,
            }
        )

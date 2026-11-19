from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("categories", views.CategoryViewSet, basename="category")
router.register("institutions", views.InstitutionViewSet, basename="institution")
router.register("innovations", views.InnovationViewSet, basename="innovation")
router.register("collaboration-requests", views.CollaborationRequestViewSet, basename="collaboration-request")
router.register("reports", views.ReportViewSet, basename="report")

urlpatterns = [
    path("me/bookmarks/", views.BookmarkListView.as_view(), name="bookmarks"),
    path("innovations/<slug:slug>/comments/", views.CommentListCreateView.as_view(), name="innovation-comments"),
    path("media/<int:media_id>/file/", views.InnovationMediaFileView.as_view(), name="innovation-media-file"),
    path(
        "media/<int:media_id>/thumbnail/",
        views.InnovationMediaThumbnailView.as_view(),
        name="innovation-media-thumbnail",
    ),
    path("comments/<int:pk>/", views.CommentDetailView.as_view(), name="comment-detail"),
    path("", include(router.urls)),
]

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("opportunities", views.OpportunityViewSet, basename="opportunity")
router.register("applications", views.ApplicationReviewViewSet, basename="application")

urlpatterns = [
    path("me/applications/", views.MyApplicationsView.as_view(), name="my-applications"),
    path("", include(router.urls)),
]

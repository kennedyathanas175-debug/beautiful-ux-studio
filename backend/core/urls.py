from django.urls import path

from . import views

app_name = "core"

urlpatterns = [
    path("health/", views.HealthView.as_view(), name="health"),
    path("stats/", views.StatsView.as_view(), name="stats"),
    path("home/", views.HomeView.as_view(), name="home"),
    path("moderation/overview/", views.ModerationOverviewView.as_view(), name="moderation-overview"),
]

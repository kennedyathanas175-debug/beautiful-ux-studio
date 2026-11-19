from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    path("csrf/", views.CsrfView.as_view(), name="csrf"),
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("me/", views.MeView.as_view(), name="me"),
    path("password-reset/", views.PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset/confirm/", views.PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("innovators/", views.InnovatorListView.as_view(), name="innovators"),
    path("users/<slug:slug>/", views.PublicProfileView.as_view(), name="public-profile"),
    path("users/<slug:slug>/follow/", views.FollowToggleView.as_view(), name="follow-toggle"),
    path("notifications/", views.NotificationListView.as_view(), name="notifications"),
    path("notifications/read-all/", views.NotificationReadAllView.as_view(), name="notifications-read-all"),
    path("notifications/<int:pk>/read/", views.NotificationReadView.as_view(), name="notification-read"),
    path("dashboard/", views.DashboardView.as_view(), name="dashboard"),
]

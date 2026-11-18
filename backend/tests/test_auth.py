from __future__ import annotations

import re

import pytest
from django.core import mail
from rest_framework.test import APIClient

from accounts.models import Follow, User
from core.constants import TANZANIA_REGIONS

pytestmark = pytest.mark.django_db


def test_me_requires_authentication(api):
    response = api.get("/api/v1/auth/me/")
    assert response.status_code == 401
    assert response.data["error"]["code"] == "authentication_required"


def test_register_logs_user_in_and_returns_profile(api):
    response = api.post(
        "/api/v1/auth/register/",
        {
            "email": "neema@example.com",
            "fullName": "Neema Mushi",
            "password": "Str0ng-Pass-2026",
            "passwordConfirm": "Str0ng-Pass-2026",
            "role": "student",
        },
        format="json",
    )
    assert response.status_code == 201, response.data
    assert response.data["user"]["name"] == "Neema Mushi"
    assert response.data["user"]["email"] == "neema@example.com"
    assert response.data["user"]["slug"] == "neema-mushi"
    assert User.objects.filter(email="neema@example.com").exists()
    me = api.get("/api/v1/auth/me/")
    assert me.status_code == 200
    assert me.data["user"]["email"] == "neema@example.com"


def test_register_rejects_duplicate_email(api, user):
    response = api.post(
        "/api/v1/auth/register/",
        {
            "email": user.email,
            "fullName": "Another Person",
            "password": "Str0ng-Pass-2026",
            "passwordConfirm": "Str0ng-Pass-2026",
            "role": "innovator",
        },
        format="json",
    )
    assert response.status_code == 400
    assert "email" in response.data["error"]["fields"]


def test_register_rejects_password_mismatch_and_weak_password(api):
    response = api.post(
        "/api/v1/auth/register/",
        {
            "email": "mismatch@example.com",
            "fullName": "Mismatch Person",
            "password": "Str0ng-Pass-2026",
            "passwordConfirm": "Different-Pass-2026",
            "role": "innovator",
        },
        format="json",
    )
    assert response.status_code == 400
    assert "passwordConfirm" in response.data["error"]["fields"]

    weak = api.post(
        "/api/v1/auth/register/",
        {
            "email": "weak@example.com",
            "fullName": "Weak Password",
            "password": "password",
            "passwordConfirm": "password",
            "role": "innovator",
        },
        format="json",
    )
    assert weak.status_code == 400
    assert "password" in weak.data["error"]["fields"]


def test_register_cannot_create_administrator(api):
    response = api.post(
        "/api/v1/auth/register/",
        {
            "email": "fake-admin@example.com",
            "fullName": "Fake Admin",
            "password": "Str0ng-Pass-2026",
            "passwordConfirm": "Str0ng-Pass-2026",
            "role": "admin",
        },
        format="json",
    )
    assert response.status_code == 400
    assert "role" in response.data["error"]["fields"]


def test_login_and_logout(api, user):
    bad = api.post(
        "/api/v1/auth/login/",
        {"email": user.email, "password": "wrong-password"},
        format="json",
    )
    assert bad.status_code == 400

    login = api.post(
        "/api/v1/auth/login/",
        {"email": user.email.upper(), "password": "Str0ng-Pass-2026"},
        format="json",
    )
    assert login.status_code == 200
    assert login.data["user"]["email"] == user.email
    assert api.get("/api/v1/auth/me/").status_code == 200

    logout = api.post("/api/v1/auth/logout/")
    assert logout.status_code == 204
    assert api.get("/api/v1/auth/me/").status_code == 401


def test_csrf_is_enforced_for_authenticated_mutations(user, innovation):
    client = APIClient(enforce_csrf_checks=True)
    client.force_login(user)

    blocked = client.post("/api/v1/innovations/shambasense/like/")
    assert blocked.status_code == 403
    assert blocked.data["error"]["code"] == "permission_denied"

    csrf = client.get("/api/v1/auth/csrf/")
    token = csrf.cookies["csrftoken"].value
    allowed = client.post("/api/v1/innovations/shambasense/like/", HTTP_X_CSRFTOKEN=token)
    assert allowed.status_code == 200


def test_profile_update_and_privacy(api, auth_api, user):
    response = auth_api.patch(
        "/api/v1/auth/me/",
        {
            "full_name": "Amina J. Juma",
            "headline": "Founder & agronomist",
            "bio": "Building soil intelligence.",
            "location": "Dodoma",
            "skills": ["Agronomy", "Python", "Remote sensing"],
            "looking_for": ["Pilot partners", "Mentors"],
            "links": [{"label": "Website", "url": "https://example.com"}],
            "is_public": True,
        },
        format="json",
    )
    assert response.status_code == 200, response.data
    assert response.data["user"]["name"] == "Amina J. Juma"
    assert response.data["user"]["skills"] == ["Agronomy", "Python", "Remote sensing"]
    assert response.data["user"]["links"][0]["label"] == "Website"

    public = api.get(f"/api/v1/auth/users/{user.slug}/")
    assert public.status_code == 200
    assert "email" not in public.data["user"]
    assert public.data["user"]["bio"] == "Building soil intelligence."


def test_invalid_profile_values_are_rejected(auth_api):
    response = auth_api.patch(
        "/api/v1/auth/me/",
        {"links": [{"label": "Bad link", "url": "javascript:alert(1)"}]},
        format="json",
    )
    assert response.status_code == 200
    assert response.data["user"]["links"] == []


def test_follow_and_unfollow(api, auth_api, user, user2):
    response = auth_api.post(f"/api/v1/auth/users/{user2.slug}/follow/")
    assert response.status_code == 200
    assert response.data == {"following": True, "followers": 1}
    assert Follow.objects.filter(follower=user, following=user2).exists()

    again = auth_api.post(f"/api/v1/auth/users/{user2.slug}/follow/")
    assert again.data == {"following": False, "followers": 0}

    self_follow = auth_api.post(f"/api/v1/auth/users/{user.slug}/follow/")
    assert self_follow.status_code == 400


def test_password_reset_flow(api, user):
    response = api.post("/api/v1/auth/password-reset/", {"email": user.email}, format="json")
    assert response.status_code == 202
    assert len(mail.outbox) == 1
    url = re.search(r"http\S+", mail.outbox[0].body).group(0)
    query = dict(part.split("=") for part in url.split("?", 1)[1].split("&"))
    assert query["uid"] and query["token"]

    missing = api.post(
        "/api/v1/auth/password-reset/",
        {"email": "does-not-exist@example.com"},
        format="json",
    )
    assert missing.status_code == 202
    assert len(mail.outbox) == 1

    confirm = api.post(
        "/api/v1/auth/password-reset/confirm/",
        {
            "uid": query["uid"],
            "token": "invalid-token",
            "password": "New-Pass-2026",
            "passwordConfirm": "New-Pass-2026",
        },
        format="json",
    )
    assert confirm.status_code == 400

    success = api.post(
        "/api/v1/auth/password-reset/confirm/",
        {
            "uid": query["uid"],
            "token": query["token"],
            "password": "New-Pass-2026",
            "passwordConfirm": "New-Pass-2026",
        },
        format="json",
    )
    assert success.status_code == 200, success.data
    login = api.post(
        "/api/v1/auth/login/",
        {"email": user.email, "password": "New-Pass-2026"},
        format="json",
    )
    assert login.status_code == 200


def test_notifications_can_be_read(auth_api, user):
    from accounts.models import Notification

    notification = Notification.notify(
        user, "Welcome", actor=None, message="Thanks for joining", url="/dashboard"
    )
    listing = auth_api.get("/api/v1/auth/notifications/")
    assert listing.status_code == 200
    assert listing.data["unreadCount"] == 1
    read = auth_api.post(f"/api/v1/auth/notifications/{notification.pk}/read/")
    assert read.status_code == 200
    assert auth_api.get("/api/v1/auth/notifications/").data["unreadCount"] == 0
    read_all = auth_api.post("/api/v1/auth/notifications/read-all/")
    assert read_all.status_code == 200


def test_dashboard_returns_owner_data(auth_api, innovation):
    response = auth_api.get("/api/v1/auth/dashboard/")
    assert response.status_code == 200
    assert response.data["stats"]["innovations"] == 1
    assert response.data["stats"]["publishedInnovations"] == 1
    assert response.data["innovations"][0]["slug"] == innovation.slug


def test_cors_allows_configured_frontend(api):
    response = api.get("/api/v1/health/", HTTP_ORIGIN="http://localhost:8080")
    assert response.status_code == 200
    assert response["Access-Control-Allow-Origin"] == "http://localhost:8080"


def test_regions_are_tanzanian():
    assert "Dar es Salaam" in TANZANIA_REGIONS
    assert "Mjini Magharibi" in TANZANIA_REGIONS


def test_innovator_directory_filters_and_hides_email(api, user, user2):
    listing = api.get("/api/v1/auth/innovators/?q=Mbeya")
    assert listing.status_code == 200
    assert listing.data["count"] == 1
    assert listing.data["results"][0]["slug"] == user2.slug
    assert "email" not in listing.data["results"][0]

    by_category = api.get("/api/v1/auth/innovators/?category=agriculture")
    assert by_category.status_code == 200
    assert all("email" not in item for item in by_category.data["results"])


def test_multipart_profile_update_can_clear_institution(auth_api, user):
    response = auth_api.patch(
        "/api/v1/auth/me/",
        {
            "full_name": "Amina Juma",
            "institution": "",
            "skills": '["Agronomy","Python"]',
            "looking_for": "[]",
            "links": "[]",
        },
        format="multipart",
    )
    assert response.status_code == 200, response.data
    user.refresh_from_db()
    assert user.institution is None
    assert response.data["user"]["institution"] is None
    assert response.data["user"]["skills"] == ["Agronomy", "Python"]

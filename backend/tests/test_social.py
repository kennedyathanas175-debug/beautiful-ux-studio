from __future__ import annotations

import pytest

from accounts.models import Notification
from ecosystem.models import Comment, Innovation, Report

pytestmark = pytest.mark.django_db


def test_like_and_unlike(auth_api, user, innovation):
    first = auth_api.post(f"/api/v1/innovations/{innovation.slug}/like/")
    assert first.status_code == 200
    assert first.data == {"liked": True, "likes": 6}
    assert innovation.likes.filter(user=user).exists()

    second = auth_api.post(f"/api/v1/innovations/{innovation.slug}/like/")
    assert second.data == {"liked": False, "likes": 5}

    detail = auth_api.get(f"/api/v1/innovations/{innovation.slug}/")
    assert detail.data["viewer"]["liked"] is False


def test_bookmarks_and_saved_list(auth_api, innovation):
    saved = auth_api.post(f"/api/v1/innovations/{innovation.slug}/bookmark/")
    assert saved.data["saved"] is True

    listing = auth_api.get("/api/v1/me/bookmarks/")
    assert listing.status_code == 200
    assert [item["slug"] for item in listing.data["innovations"]] == [innovation.slug]
    assert listing.data["opportunities"] == []

    removed = auth_api.post(f"/api/v1/innovations/{innovation.slug}/bookmark/")
    assert removed.data["saved"] is False


def test_comment_flow_and_notifications(api, auth_api, user2, innovation):
    public = api.get(f"/api/v1/innovations/{innovation.slug}/comments/")
    assert public.status_code == 200
    assert public.data["count"] == 0

    from rest_framework.test import APIClient

    other = APIClient()
    other.force_authenticate(user=user2)
    created = other.post(
        f"/api/v1/innovations/{innovation.slug}/comments/",
        {"body": "This is a useful pilot. How can cooperatives join?"},
        format="json",
    )
    assert created.status_code == 201
    assert created.data["author"]["slug"] == user2.slug
    assert created.data["canEdit"] is True
    assert Notification.objects.filter(
        recipient=innovation.creator, kind=Notification.Kind.COMMENT
    ).exists()

    detail = auth_api.get(f"/api/v1/innovations/{innovation.slug}/")
    assert detail.data["comments"] == 1

    # The author can edit and delete their own comment.
    comment_id = created.data["id"]
    edited = other.patch(f"/api/v1/comments/{comment_id}/", {"body": "Updated comment"}, format="json")
    assert edited.status_code == 200
    assert edited.data["body"] == "Updated comment"

    forbidden = auth_api.delete(f"/api/v1/comments/{comment_id}/")
    assert forbidden.status_code == 403

    deleted = other.delete(f"/api/v1/comments/{comment_id}/")
    assert deleted.status_code == 204
    assert not Comment.objects.filter(pk=comment_id).exists()


def test_comment_requires_login(api, innovation):
    response = api.post(
        f"/api/v1/innovations/{innovation.slug}/comments/", {"body": "Hello"}, format="json"
    )
    assert response.status_code == 401


def test_staff_can_hide_comment_via_report(api, auth_api, admin_api, user, innovation):
    from rest_framework.test import APIClient

    author = APIClient()
    author.force_authenticate(user=user)
    created = author.post(
        f"/api/v1/innovations/{innovation.slug}/comments/",
        {"body": "This comment will be reported."},
        format="json",
    )
    comment_id = created.data["id"]

    report = auth_api.post(
        "/api/v1/reports/",
        {"comment": comment_id, "reason": "spam", "details": "Promotional spam"},
        format="json",
    )
    assert report.status_code == 201, report.data
    report_id = report.data["id"]

    resolved = admin_api.patch(
        f"/api/v1/reports/{report_id}/",
        {"status": "resolved", "resolutionNote": "Confirmed spam"},
        format="json",
    )
    assert resolved.status_code == 200
    comment = Comment.objects.get(pk=comment_id)
    assert comment.is_hidden is True

    public = api.get(f"/api/v1/innovations/{innovation.slug}/comments/")
    assert public.data["count"] == 0


def test_report_requires_exactly_one_target(auth_api, innovation):
    response = auth_api.post(
        "/api/v1/reports/",
        {"innovation": innovation.slug, "reason": "spam"},
        format="json",
    )
    assert response.status_code == 201

    neither = auth_api.post("/api/v1/reports/", {"reason": "spam"}, format="json")
    assert neither.status_code == 400

    duplicate = auth_api.post(
        "/api/v1/reports/",
        {"innovation": innovation.slug, "reason": "abuse"},
        format="json",
    )
    assert duplicate.status_code == 400


def test_non_staff_cannot_list_reports(auth_api):
    response = auth_api.get("/api/v1/reports/")
    assert response.status_code == 403


def test_resolving_report_hides_innovation(admin_api, auth_api, innovation):
    report = auth_api.post(
        "/api/v1/reports/",
        {"innovation": innovation.slug, "reason": "abuse", "details": "Bad content"},
        format="json",
    )
    resolved = admin_api.patch(
        f"/api/v1/reports/{report.data['id']}/",
        {"status": "resolved", "resolutionNote": "Hidden"},
        format="json",
    )
    assert resolved.status_code == 200
    innovation.refresh_from_db()
    assert innovation.status == Innovation.Status.HIDDEN


def test_collaboration_request_flow(api, user2, innovation, admin_user):
    from rest_framework.test import APIClient

    sender = APIClient()
    sender.force_authenticate(user=user2)
    created = sender.post(
        "/api/v1/collaboration-requests/",
        {
            "innovation": innovation.slug,
            "message": "We would like to pilot this with our cooperative network.",
        },
        format="json",
    )
    assert created.status_code == 201, created.data
    assert created.data["recipient"]["slug"] == innovation.creator.slug
    assert created.data["status"] == "pending"
    assert Notification.objects.filter(
        recipient=innovation.creator, kind=Notification.Kind.COLLABORATION_REQUEST
    ).exists()

    duplicate = sender.post(
        "/api/v1/collaboration-requests/",
        {
            "innovation": innovation.slug,
            "message": "Sending the same request twice.",
        },
        format="json",
    )
    assert duplicate.status_code == 400

    recipient = APIClient()
    recipient.force_authenticate(user=innovation.creator)
    inbox = recipient.get("/api/v1/collaboration-requests/?direction=incoming")
    assert inbox.data["count"] == 1
    request_id = inbox.data["results"][0]["id"]
    accepted = recipient.patch(
        f"/api/v1/collaboration-requests/{request_id}/",
        {"status": "accepted", "responseMessage": "Happy to collaborate."},
        format="json",
    )
    assert accepted.status_code == 200
    assert accepted.data["status"] == "accepted"
    assert Notification.objects.filter(
        recipient=user2, kind=Notification.Kind.COLLABORATION_RESPONSE
    ).exists()

    # The sender cannot answer their own request.
    forbidden = sender.patch(
        f"/api/v1/collaboration-requests/{request_id}/",
        {"status": "declined"},
        format="json",
    )
    assert forbidden.status_code == 400  # already answered


def test_cannot_send_collaboration_to_self(auth_api, user, innovation):
    response = auth_api.post(
        "/api/v1/collaboration-requests/",
        {"innovation": innovation.slug, "message": "Talking to myself here."},
        format="json",
    )
    assert response.status_code == 400


def test_profile_collaboration_request(api, user2, user):
    from rest_framework.test import APIClient

    sender = APIClient()
    sender.force_authenticate(user=user2)
    response = sender.post(
        "/api/v1/collaboration-requests/",
        {"recipient": user.slug, "message": "Would you like to explore a joint grant?"},
        format="json",
    )
    assert response.status_code == 201
    assert response.data["innovation"] is None


def test_sender_can_withdraw(user2, innovation):
    from rest_framework.test import APIClient

    sender = APIClient()
    sender.force_authenticate(user=user2)
    created = sender.post(
        "/api/v1/collaboration-requests/",
        {"innovation": innovation.slug, "message": "Would you like to partner with us?"},
        format="json",
    )
    withdrawn = sender.patch(
        f"/api/v1/collaboration-requests/{created.data['id']}/",
        {"status": "withdrawn"},
        format="json",
    )
    assert withdrawn.status_code == 200
    assert withdrawn.data["status"] == "withdrawn"


def test_pagination_parameters_are_safe(api, innovation):
    for value in ("-1", "not-a-number"):
        response = api.get(
            f"/api/v1/innovations/{innovation.slug}/comments/?page={value}&page_size={value}"
        )
        assert response.status_code == 200
        assert response.data["results"] == []

from __future__ import annotations

from datetime import date, timedelta

import pytest

from accounts.models import Notification
from opportunities.models import Opportunity, OpportunityApplication

pytestmark = pytest.mark.django_db


def test_public_opportunity_list_and_filters(api, opportunity, category):
    expired = Opportunity.objects.create(
        title="Old Challenge",
        slug="old-challenge",
        type="Grant",
        organizer="Partners",
        deadline=date.today() - timedelta(days=1),
        location="Nationwide",
        summary="Expired opportunity",
        status=Opportunity.Status.PUBLISHED,
    )
    expired.categories.add(category)
    draft = Opportunity.objects.create(
        title="Draft Opportunity",
        slug="draft-opportunity",
        type="Grant",
        organizer="Partners",
        deadline=date.today() + timedelta(days=10),
        location="Nationwide",
        summary="Not published",
        status=Opportunity.Status.DRAFT,
    )

    listing = api.get("/api/v1/opportunities/")
    assert listing.status_code == 200
    slugs = [item["id"] for item in listing.data["results"]]
    assert "climate-challenge" in slugs
    assert "draft-opportunity" not in slugs
    assert "old-challenge" in slugs

    open_only = api.get("/api/v1/opportunities/?open_only=1")
    open_slugs = [item["id"] for item in open_only.data["results"]]
    assert "old-challenge" not in open_slugs

    by_type = api.get("/api/v1/opportunities/?type=Challenge")
    assert [item["id"] for item in by_type.data["results"]] == ["climate-challenge"]

    by_category = api.get("/api/v1/opportunities/?category=agriculture")
    assert "climate-challenge" in [item["id"] for item in by_category.data["results"]]


def test_opportunity_bookmark(auth_api, opportunity):
    response = auth_api.post(f"/api/v1/opportunities/{opportunity.slug}/bookmark/")
    assert response.data["saved"] is True
    saved = auth_api.get("/api/v1/me/bookmarks/")
    assert [item["id"] for item in saved.data["opportunities"]] == [opportunity.slug]
    detail = auth_api.get(f"/api/v1/opportunities/{opportunity.slug}/")
    assert detail.data["viewer"]["saved"] is True


def test_apply_and_review_flow(api, auth_api, admin_api, user, opportunity):
    response = auth_api.post(
        f"/api/v1/opportunities/{opportunity.slug}/apply/",
        {"motivation": "Our team has a working prototype and a strong community partner."},
        format="json",
    )
    assert response.status_code == 201, response.data
    application_id = response.data["id"]
    assert response.data["status"] == "submitted"

    duplicate = auth_api.post(
        f"/api/v1/opportunities/{opportunity.slug}/apply/",
        {"motivation": "Trying to apply a second time to the same opportunity."},
        format="json",
    )
    assert duplicate.status_code == 400

    mine = auth_api.get("/api/v1/me/applications/")
    assert mine.data["count"] == 1

    applications = admin_api.get(f"/api/v1/opportunities/{opportunity.slug}/applications/")
    assert applications.status_code == 200
    assert applications.data["count"] == 1
    assert applications.data["results"][0]["applicantEmail"] == user.email

    reviewed = admin_api.patch(
        f"/api/v1/applications/{application_id}/",
        {"status": "accepted", "reviewNote": "Strong fit"},
        format="json",
    )
    assert reviewed.status_code == 200
    assert reviewed.data["status"] == "accepted"
    assert Notification.objects.filter(
        recipient=user, kind=Notification.Kind.APPLICATION
    ).exists()

    refreshed = OpportunityApplication.objects.get(pk=application_id)
    assert refreshed.review_note == "Strong fit"


def test_cannot_apply_to_expired_opportunity(auth_api, opportunity):
    opportunity.deadline = date.today() - timedelta(days=1)
    opportunity.save(update_fields=["deadline"])
    response = auth_api.post(
        f"/api/v1/opportunities/{opportunity.slug}/apply/",
        {"motivation": "We would still like to apply despite the deadline."},
        format="json",
    )
    assert response.status_code == 400


def test_non_staff_cannot_create_or_edit_opportunities(auth_api, opportunity, category):
    create = auth_api.post(
        "/api/v1/opportunities/",
        {
            "title": "Community Grant",
            "type": "Grant",
            "organizer": "TIE",
            "deadline": str(date.today() + timedelta(days=20)),
            "location": "Nationwide",
            "summary": "Funding for community projects.",
            "eligibility": ["Tanzanian teams"],
            "reward": "TZS 10M",
            "categories": [category.slug],
        },
        format="json",
    )
    assert create.status_code == 403
    assert auth_api.patch(
        f"/api/v1/opportunities/{opportunity.slug}/", {"title": "Hijacked"}, format="json"
    ).status_code == 403


def test_staff_can_manage_opportunities(admin_api, category):
    created = admin_api.post(
        "/api/v1/opportunities/",
        {
            "title": "Community Grant",
            "type": "Grant",
            "organizer": "TIE",
            "deadline": str(date.today() + timedelta(days=20)),
            "location": "Nationwide",
            "summary": "Funding for community projects.",
            "eligibility": ["Tanzanian teams"],
            "reward": "TZS 10M",
            "categories": [category.slug],
        },
        format="json",
    )
    assert created.status_code == 201, created.data
    slug = created.data["id"]
    updated = admin_api.patch(
        f"/api/v1/opportunities/{slug}/",
        {"reward": "TZS 20M", "status": "published"},
        format="json",
    )
    assert updated.status_code == 200
    assert updated.data["reward"] == "TZS 20M"

    archived = admin_api.delete(f"/api/v1/opportunities/{slug}/")
    assert archived.status_code == 204
    assert Opportunity.objects.get(slug=slug).status == Opportunity.Status.ARCHIVED

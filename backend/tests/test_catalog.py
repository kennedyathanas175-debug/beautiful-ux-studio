from __future__ import annotations

import pytest

from ecosystem.models import Category, Innovation, Institution

pytestmark = pytest.mark.django_db


def test_institution_list_and_counts(api, institution, innovation):
    response = api.get("/api/v1/institutions/")
    assert response.status_code == 200
    row = next(item for item in response.data["results"] if item["slug"] == institution.slug)
    assert row["innovationCount"] == 1
    assert row["focus"] == ["agriculture"]


def test_institution_filter(api, institution, category2):
    other = Institution.objects.create(
        name="Health Institute",
        short_name="HI",
        type="Research",
        location="Dodoma",
        is_active=True,
    )
    other.focus.add(category2)
    by_type = api.get("/api/v1/institutions/?type=Research")
    assert [item["slug"] for item in by_type.data["results"]] == [other.slug]
    search = api.get("/api/v1/institutions/?q=Morogoro")
    assert [item["slug"] for item in search.data["results"]] == [institution.slug]


def test_only_staff_can_create_institution(api, auth_api, admin_api, category):
    payload = {
        "name": "Tanzania AI Lab",
        "short_name": "TAIL",
        "type": "Innovation Hub",
        "location": "Dar es Salaam",
        "description": "A hub for applied AI.",
        "website": "https://example.com",
        "verified": False,
        "focus": [category.slug],
    }
    assert auth_api.post("/api/v1/institutions/", payload, format="json").status_code == 403
    created = admin_api.post("/api/v1/institutions/", payload, format="json")
    assert created.status_code == 201, created.data
    assert created.data["short"] == "TAIL"
    assert created.data["focus"] == ["agriculture"]

    updated = admin_api.patch(
        f"/api/v1/institutions/{created.data['slug']}/", {"verified": True}, format="json"
    )
    assert updated.status_code == 200
    assert updated.data["verified"] is True

    deleted = admin_api.delete(f"/api/v1/institutions/{created.data['slug']}/")
    assert deleted.status_code == 204
    assert Institution.objects.get(slug=created.data["slug"]).is_active is False


def test_categories_include_live_counts(api, innovation):
    response = api.get("/api/v1/categories/")
    assert response.status_code == 200
    agriculture = next(item for item in response.data if item["id"] == "agriculture")
    assert agriculture["count"] == 1
    assert agriculture["sw"] == "Kilimo"


def test_home_aggregate(api, innovation, opportunity):
    response = api.get("/api/v1/home/")
    assert response.status_code == 200
    data = response.data
    assert data["stats"]["innovations"] >= 1
    assert any(item["slug"] == innovation.slug for item in data["featured"])
    assert any(item["id"] == opportunity.slug for item in data["opportunities"])


def test_stats_and_health(api):
    health = api.get("/api/v1/health/")
    assert health.status_code == 200
    assert health.data["database"] == "ok"
    stats = api.get("/api/v1/stats/")
    assert stats.status_code == 200
    assert set(stats.data) >= {"innovations", "innovators", "institutions", "regions"}


def test_moderation_overview_requires_staff(auth_api, admin_api, innovation):
    assert auth_api.get("/api/v1/moderation/overview/").status_code == 403
    response = admin_api.get("/api/v1/moderation/overview/")
    assert response.status_code == 200
    assert response.data["stats"]["innovationsTotal"] >= 1
    assert "reports" in response.data


def test_api_schema_is_public(api):
    response = api.get("/api/schema/")
    assert response.status_code == 200
    assert b"openapi" in response.content

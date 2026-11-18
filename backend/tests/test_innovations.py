from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from ecosystem.models import Innovation

pytestmark = pytest.mark.django_db


def test_public_list_only_shows_published(api, innovation, draft_innovation):
    hidden = Innovation.objects.create(
        title="Hidden Project",
        slug="hidden-project",
        tagline="Hidden",
        description="Hidden",
        category=innovation.category,
        stage="concept",
        creator=innovation.creator,
        region="Dar es Salaam",
        status=Innovation.Status.HIDDEN,
    )
    response = api.get("/api/v1/innovations/")
    assert response.status_code == 200
    slugs = [item["slug"] for item in response.data["results"]]
    assert "shambasense" in slugs
    assert "draft-project" not in slugs
    assert "hidden-project" not in slugs


def test_owner_can_see_own_draft(api, auth_api, draft_innovation):
    response = auth_api.get("/api/v1/innovations/draft-project/")
    assert response.status_code == 200
    assert response.data["status"] == "draft"
    assert response.data["viewer"]["isOwner"] is True

    anonymous = api.get("/api/v1/innovations/draft-project/")
    assert anonymous.status_code == 404


def test_detail_increments_views(api, innovation):
    before = innovation.views
    response = api.get(f"/api/v1/innovations/{innovation.slug}/")
    assert response.status_code == 200
    assert response.data["views"] == before + 1
    innovation.refresh_from_db()
    assert innovation.views == before + 1


def test_search_filter_and_sort(api, innovation, category2):
    other = Innovation.objects.create(
        title="AfyaLink",
        slug="afyalink",
        tagline="Digital health records",
        description="Offline health tools",
        category=category2,
        stage="market",
        creator=innovation.creator,
        region="Dodoma",
        status=Innovation.Status.PUBLISHED,
        legacy_likes=200,
        views=10,
    )
    search = api.get("/api/v1/innovations/?q=health")
    assert [item["slug"] for item in search.data["results"]] == ["afyalink"]

    filtered = api.get("/api/v1/innovations/?category=agriculture&stage=pilot")
    assert [item["slug"] for item in filtered.data["results"]] == ["shambasense"]

    institution = api.get("/api/v1/innovations/?institution=sua")
    assert [item["slug"] for item in institution.data["results"]] == ["shambasense"]

    popular = api.get("/api/v1/innovations/?sort=popular")
    assert [item["slug"] for item in popular.data["results"]][0] == "afyalink"

    latest = api.get("/api/v1/innovations/?sort=latest")
    assert latest.status_code == 200
    assert other.title == "AfyaLink"


def test_pagination_metadata(api, innovation, category2):
    for index in range(3):
        Innovation.objects.create(
            title=f"Project {index}",
            slug=f"project-{index}",
            tagline="More ideas",
            description="More detail",
            category=category2,
            stage="concept",
            creator=innovation.creator,
            region="Dodoma",
            status=Innovation.Status.PUBLISHED,
        )
    response = api.get("/api/v1/innovations/?page_size=2")
    assert response.data["count"] == 4
    assert len(response.data["results"]) == 2
    assert response.data["next"] is not None


def test_create_requires_authentication(api, category):
    response = api.post(
        "/api/v1/innovations/",
        {
            "title": "New idea",
            "tagline": "A new idea",
            "description": "Details",
            "category": category.slug,
            "stage": "concept",
            "region": "Arusha",
        },
        format="json",
    )
    assert response.status_code == 401


def test_owner_can_create_and_update_innovation(auth_api, user, category, institution):
    created = auth_api.post(
        "/api/v1/innovations/",
        {
            "title": "Mazao Market",
            "tagline": "Fair prices for farmers",
            "description": "A marketplace connecting farmers and buyers.",
            "problem": "Farmers lack price information.",
            "solution": "Daily prices and verified buyers.",
            "objectives": ["Cover 20 markets"],
            "tech": ["Django", "PostgreSQL"],
            "category": category.slug,
            "stage": "prototype",
            "institution": institution.slug,
            "region": "Arusha",
            "status": "published",
        },
        format="json",
    )
    assert created.status_code == 201, created.data
    assert created.data["creator"]["slug"] == user.slug
    assert created.data["status"] == "published"
    assert created.data["objectives"] == ["Cover 20 markets"]

    updated = auth_api.patch(
        "/api/v1/innovations/mazao-market/",
        {"tagline": "Better prices for every farmer", "tech": ["Django", "PostGIS"]},
        format="json",
    )
    assert updated.status_code == 200
    assert updated.data["tagline"] == "Better prices for every farmer"
    assert updated.data["tech"] == ["Django", "PostGIS"]


def test_other_user_cannot_edit(api, user2, innovation):
    from rest_framework.test import APIClient

    client = APIClient()
    client.force_authenticate(user=user2)
    response = client.patch(
        f"/api/v1/innovations/{innovation.slug}/", {"title": "Hijacked"}, format="json"
    )
    assert response.status_code == 403

    assert client.delete(f"/api/v1/innovations/{innovation.slug}/").status_code == 403


def test_owner_delete_archives(auth_api, innovation):
    response = auth_api.delete(f"/api/v1/innovations/{innovation.slug}/")
    assert response.status_code == 204
    innovation.refresh_from_db()
    assert innovation.status == Innovation.Status.ARCHIVED


def test_team_by_email_must_exist(auth_api, category, user2):
    response = auth_api.post(
        "/api/v1/innovations/",
        {
            "title": "Team Project",
            "tagline": "Working together",
            "description": "A team project",
            "category": category.slug,
            "stage": "concept",
            "region": "Dar es Salaam",
            "teamEmails": ["missing@example.com"],
        },
        format="json",
    )
    assert response.status_code == 400
    assert "teamEmails" in response.data["error"]["fields"]

    success = auth_api.post(
        "/api/v1/innovations/",
        {
            "title": "Team Project",
            "tagline": "Working together",
            "description": "A team project",
            "category": category.slug,
            "stage": "concept",
            "region": "Dar es Salaam",
            "teamEmails": [user2.email],
        },
        format="json",
    )
    assert success.status_code == 201
    assert [member["slug"] for member in success.data["team"]] == [user2.slug]


def test_owner_can_save_draft(auth_api, category):
    response = auth_api.post(
        "/api/v1/innovations/",
        {
            "title": "Early Concept",
            "tagline": "Not ready yet",
            "description": "Still working on it",
            "category": category.slug,
            "stage": "concept",
            "region": "Singida",
            "status": "draft",
        },
        format="json",
    )
    assert response.status_code == 201
    assert response.data["status"] == "draft"


def test_staff_moderation_and_single_object_visibility(admin_api, api, innovation):
    moderate = admin_api.post(
        f"/api/v1/innovations/{innovation.slug}/moderate/",
        {"status": "hidden", "featured": False},
        format="json",
    )
    assert moderate.status_code == 200
    assert moderate.data["status"] == "hidden"
    assert api.get(f"/api/v1/innovations/{innovation.slug}/").status_code == 404

    restore = admin_api.post(
        f"/api/v1/innovations/{innovation.slug}/moderate/",
        {"status": "published", "featured": True},
        format="json",
    )
    assert restore.status_code == 200
    assert restore.data["status"] == "published"


def test_non_staff_cannot_moderate(auth_api, innovation):
    response = auth_api.post(
        f"/api/v1/innovations/{innovation.slug}/moderate/",
        {"status": "hidden"},
        format="json",
    )
    assert response.status_code == 403


def test_image_size_limit(auth_api, category, settings):
    settings.MAX_INNOVATION_IMAGE_BYTES = 100
    image = SimpleUploadedFile("tiny.jpg", b"x" * 200, content_type="image/jpeg")
    response = auth_api.post(
        "/api/v1/innovations/",
        {
            "title": "Image Project",
            "tagline": "With an image",
            "description": "Details",
            "category": category.slug,
            "stage": "concept",
            "region": "Arusha",
            "image": image,
        },
        format="multipart",
    )
    assert response.status_code == 400
    assert "image" in response.data["error"]["fields"]


def test_multipart_innovation_create_with_image(auth_api, category, institution):
    from io import BytesIO

    from PIL import Image

    buffer = BytesIO()
    Image.new("RGB", (20, 20), "navy").save(buffer, format="JPEG")
    image = SimpleUploadedFile("cover.jpg", buffer.getvalue(), content_type="image/jpeg")
    response = auth_api.post(
        "/api/v1/innovations/",
        {
            "title": "Multipart Project",
            "tagline": "Created with a real upload",
            "description": "A multipart innovation submission.",
            "problem": "Form data must work.",
            "solution": "Send real multipart fields.",
            "category": category.slug,
            "stage": "prototype",
            "institution": institution.slug,
            "region": "Arusha",
            "status": "published",
            "objectives": ["Objective one", "Objective two"],
            "tech": ["Django", "Pillow"],
            "teamEmails": [],
            "image": image,
        },
        format="multipart",
    )
    assert response.status_code == 201, response.data
    assert response.data["objectives"] == ["Objective one", "Objective two"]
    assert response.data["tech"] == ["Django", "Pillow"]
    assert response.data["image"].endswith(".jpg")
    item = Innovation.objects.get(slug=response.data["slug"])
    assert item.image

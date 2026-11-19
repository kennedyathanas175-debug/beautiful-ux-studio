from __future__ import annotations

import shutil
from datetime import date, timedelta

import pytest
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from ecosystem.models import Category, Innovation, Institution
from opportunities.models import Opportunity


@pytest.fixture(scope="session", autouse=True)
def clean_test_media():
    from django.conf import settings

    shutil.rmtree(settings.MEDIA_ROOT, ignore_errors=True)
    shutil.rmtree(settings.PRIVATE_MEDIA_ROOT, ignore_errors=True)
    yield
    shutil.rmtree(settings.MEDIA_ROOT, ignore_errors=True)
    shutil.rmtree(settings.PRIVATE_MEDIA_ROOT, ignore_errors=True)


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def category(db):
    return Category.objects.create(
        slug="agriculture", name_en="Agriculture", name_sw="Kilimo", icon="Sprout", order=1
    )


@pytest.fixture
def category2(db):
    return Category.objects.create(slug="health", name_en="Health", name_sw="Afya", icon="HeartPulse", order=2)


@pytest.fixture
def institution(db, category):
    inst = Institution.objects.create(
        slug="sua",
        name="Sokoine University of Agriculture",
        short_name="SUA",
        type="University",
        location="Morogoro",
        description="Agricultural university",
        website="https://www.sua.ac.tz",
        verified=True,
    )
    inst.focus.add(category)
    return inst


@pytest.fixture
def user(db, institution):
    return User.objects.create_user(
        email="amina@example.com",
        password="Str0ng-Pass-2026",
        full_name="Amina Juma",
        role="innovator",
        headline="Agritech founder",
        location="Morogoro",
        institution=institution,
        skills=["Agronomy", "Python"],
        looking_for=["Pilot partners"],
    )


@pytest.fixture
def user2(db):
    return User.objects.create_user(
        email="baraka@example.com",
        password="Str0ng-Pass-2026",
        full_name="Baraka Mwakyusa",
        role="creator",
        location="Mbeya",
    )


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        email="admin@example.com",
        password="Adm1n-Pass-2026",
        full_name="Platform Admin",
    )


@pytest.fixture
def auth_api(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def admin_api(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def innovation(db, user, category, institution):
    item = Innovation.objects.create(
        title="ShambaSense",
        slug="shambasense",
        tagline="Soil insights for farmers",
        description="Low-cost soil sensors with SMS advice.",
        problem="Farmers lack soil data.",
        solution="Sensors plus USSD advice.",
        objectives=["Reach 10,000 farmers"],
        tech=["IoT", "Python"],
        category=category,
        stage="pilot",
        creator=user,
        institution=institution,
        region="Morogoro",
        status=Innovation.Status.PUBLISHED,
        featured=True,
        trending=True,
        views=100,
        legacy_likes=5,
        published_at=timezone.now(),
    )
    return item


@pytest.fixture
def draft_innovation(db, user, category):
    return Innovation.objects.create(
        title="Draft Project",
        slug="draft-project",
        tagline="A private draft",
        description="Work in progress.",
        category=category,
        stage="concept",
        creator=user,
        region="Dar es Salaam",
        status=Innovation.Status.DRAFT,
    )


@pytest.fixture
def opportunity(db, category, admin_user):
    item = Opportunity.objects.create(
        title="Climate Challenge",
        slug="climate-challenge",
        type="Challenge",
        organizer="TIE Partners",
        deadline=date.today() + timedelta(days=30),
        location="Nationwide",
        summary="Climate solutions for communities.",
        eligibility=["Tanzanian teams"],
        reward="TZS 50M",
        status=Opportunity.Status.PUBLISHED,
        created_by=admin_user,
    )
    item.categories.add(category)
    return item

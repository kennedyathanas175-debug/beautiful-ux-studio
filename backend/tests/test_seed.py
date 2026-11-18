from __future__ import annotations

import pytest
from django.core.management import call_command

from accounts.models import User
from ecosystem.models import Innovation, Institution
from opportunities.models import Opportunity


@pytest.mark.django_db
def test_seed_command_is_idempotent():
    call_command("seed_catalog", verbosity=0)
    first = {
        "categories": 8,
        "institutions": Institution.objects.count(),
        "users": User.objects.count(),
        "innovations": Innovation.objects.count(),
        "opportunities": Opportunity.objects.count(),
    }
    assert first["institutions"] == 8
    assert first["users"] >= 6
    assert first["innovations"] == 9
    assert first["opportunities"] == 6

    call_command("seed_catalog", verbosity=0)
    assert Institution.objects.count() == first["institutions"]
    assert User.objects.count() == first["users"]
    assert Innovation.objects.count() == first["innovations"]
    assert Opportunity.objects.count() == first["opportunities"]
    assert Innovation.objects.filter(status=Innovation.Status.PUBLISHED).count() == 9
    seeded = Innovation.objects.get(slug="shambasense")
    assert seeded.creator.slug == "juma-kileo"
    assert seeded.legacy_likes == 1240
    assert seeded.views == 18400

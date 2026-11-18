from __future__ import annotations

import re
from typing import Iterable

from django.utils.text import slugify


def unique_slugify(instance, value: str, slug_field: str = "slug", max_length: int = 80) -> str:
    """Return a unique slug for *instance*, appending ``-2``, ``-3``… if needed."""
    base = slugify(value, allow_unicode=False)[:max_length].strip("-") or "item"
    model = instance.__class__
    candidate = base
    counter = 2
    qs = model._default_manager.all()
    if instance.pk:
        qs = qs.exclude(pk=instance.pk)
    while qs.filter(**{slug_field: candidate}).exists():
        suffix = f"-{counter}"
        candidate = f"{base[: max_length - len(suffix)]}{suffix}"
        counter += 1
    return candidate


def clean_string_list(values: Iterable[object] | None, *, max_items: int = 30, max_length: int = 200) -> list[str]:
    """Normalise a list of short strings (skills, objectives, tags…)."""
    if not values:
        return []
    if isinstance(values, str):
        values = [part.strip() for part in re.split(r"[,\n]", values)]
    cleaned: list[str] = []
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if not text:
            continue
        cleaned.append(text[:max_length])
        if len(cleaned) >= max_items:
            break
    return cleaned


def clean_links(values) -> list[dict[str, str]]:
    """Validate a small list of {"label", "url"} dicts."""
    if not values:
        return []
    if not isinstance(values, list):
        return []
    links: list[dict[str, str]] = []
    for item in values[:10]:
        if not isinstance(item, dict):
            continue
        label = str(item.get("label", "")).strip()[:60]
        url = str(item.get("url", "")).strip()[:500]
        if not label or not url:
            continue
        if not (url.startswith("https://") or url.startswith("http://")):
            continue
        links.append({"label": label, "url": url})
    return links

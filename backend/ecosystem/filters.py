from __future__ import annotations


def comma_values(value: str | None) -> list[str]:
    """Split repeated/comma-separated filter values into a clean list."""
    if not value:
        return []
    return [part.strip() for part in value.split(",") if part.strip()]

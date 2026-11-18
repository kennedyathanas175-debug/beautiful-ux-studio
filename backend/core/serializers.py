from rest_framework import serializers


class NullableSlugRelatedField(serializers.SlugRelatedField):
    """Slug relation that accepts an empty string/``null`` as ``None`` (multipart forms)."""

    def to_internal_value(self, data):
        if data in (None, "", "null"):
            return None
        return super().to_internal_value(data)

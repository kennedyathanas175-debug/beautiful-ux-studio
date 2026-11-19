from __future__ import annotations

import mimetypes
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage
from PIL import Image, ImageOps, UnidentifiedImageError

private_storage = FileSystemStorage(location=settings.PRIVATE_MEDIA_ROOT)

ALLOWED_IMAGE_FORMATS = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".webm"}
VIDEO_MIME_TYPES = {"video/mp4", "video/webm", "application/octet-stream", ""}
VIDEO_MAGIC = {
    "mp4": b"ftyp",
    "webm": b"\x1aE\xdf\xa3",
}


class MediaValidationError(Exception):
    """A user-facing media validation failure."""


def _extension(filename: str) -> str:
    return Path(filename or "").suffix.lower()


def validate_image_upload(upload, *, label: str = "Image", max_bytes: int | None = None) -> str:
    """Validate an uploaded image and return its canonical MIME type."""
    limit = max_bytes or settings.MAX_INNOVATION_MEDIA_IMAGE_BYTES
    if not upload:
        raise MediaValidationError(f"{label} is empty.")
    if upload.size > limit:
        raise MediaValidationError(
            f"{label} must be {limit // (1024 * 1024)} MB or smaller."
        )
    if _extension(upload.name) not in IMAGE_EXTENSIONS:
        raise MediaValidationError(f"{label} must be a JPG, JPEG, PNG or WebP file.")
    content_type = (getattr(upload, "content_type", "") or "").lower()
    if content_type and content_type not in {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "application/octet-stream",
    }:
        raise MediaValidationError(f"{label} must be a JPG, JPEG, PNG or WebP image.")
    try:
        upload.seek(0)
        image = Image.open(upload)
        image.verify()
        image_format = (image.format or "").upper()
    except (UnidentifiedImageError, OSError, ValueError):
        raise MediaValidationError(f"{label} is not a valid image file.") from None
    finally:
        try:
            upload.seek(0)
        except (AttributeError, OSError):
            pass
    mime = ALLOWED_IMAGE_FORMATS.get(image_format)
    if not mime:
        raise MediaValidationError(f"{label} must be a JPG, JPEG, PNG or WebP file.")
    return mime


def validate_video_upload(upload, *, label: str = "Video", max_bytes: int | None = None) -> str:
    """Validate a video extension, MIME type and container magic bytes."""
    limit = max_bytes or settings.MAX_INNOVATION_VIDEO_BYTES
    if not upload:
        raise MediaValidationError(f"{label} is empty.")
    if upload.size > limit:
        raise MediaValidationError(
            f"{label} must be {limit // (1024 * 1024)} MB or smaller."
        )
    ext = _extension(upload.name)
    if ext not in VIDEO_EXTENSIONS:
        raise MediaValidationError(f"{label} must be an MP4 or WebM file.")
    content_type = (getattr(upload, "content_type", "") or "").lower()
    if content_type not in VIDEO_MIME_TYPES:
        raise MediaValidationError(f"{label} must be an MP4 or WebM video.")
    try:
        upload.seek(0)
        header = upload.read(64)
    finally:
        try:
            upload.seek(0)
        except (AttributeError, OSError):
            pass
    expected = VIDEO_MAGIC["mp4"] if ext == ".mp4" else VIDEO_MAGIC["webm"]
    if expected not in header:
        raise MediaValidationError(
            f"{label} does not look like a valid {ext.lstrip('.').upper()} video."
        )
    return "video/mp4" if ext == ".mp4" else "video/webm"


def validate_video_poster(upload) -> str:
    return validate_image_upload(
        upload, label="Video poster", max_bytes=settings.MAX_VIDEO_POSTER_BYTES
    )


def generate_thumbnail(media, source=None) -> None:
    """Create a compact JPEG thumbnail/poster next to the private media file."""
    source = source or media.file
    try:
        source.seek(0)
    except (AttributeError, OSError):
        pass
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image)
        if image.mode not in {"RGB", "L"}:
            image = image.convert("RGB")
        image.thumbnail((900, 900), Image.Resampling.LANCZOS)
        output = BytesIO()
        image.save(output, format="JPEG", quality=82, optimize=True, progressive=True)
    filename = f"{Path(media.file.name).stem}-{uuid4().hex[:8]}-thumb.jpg"
    media.thumbnail.save(filename, ContentFile(output.getvalue()), save=False)
    media.save(update_fields=["thumbnail"])


def media_upload_to(instance, filename: str) -> str:
    return f"innovations/{instance.innovation_id}/{uuid4().hex}{_extension(filename)}"


def media_thumbnail_upload_to(instance, filename: str) -> str:
    return f"innovations/{instance.innovation_id}/thumbs/{filename}"


def mime_for_name(filename: str) -> str:
    return mimetypes.guess_type(filename)[0] or "application/octet-stream"

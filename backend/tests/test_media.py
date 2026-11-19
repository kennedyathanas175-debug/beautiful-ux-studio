from __future__ import annotations

from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from ecosystem.models import Innovation, InnovationMedia

pytestmark = pytest.mark.django_db


def image_upload(name="gallery.jpg", color="navy", size=(48, 36)):
    buffer = BytesIO()
    Image.new("RGB", size, color).save(buffer, format="JPEG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/jpeg")


def png_upload(name="gallery.png", color="gold", size=(32, 24)):
    buffer = BytesIO()
    Image.new("RGB", size, color).save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


def webp_upload(name="gallery.webp", color="green", size=(32, 24)):
    buffer = BytesIO()
    Image.new("RGB", size, color).save(buffer, format="WEBP")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/webp")


def video_upload(name="pitch.mp4"):
    payload = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom" + b"\x00" * 256
    return SimpleUploadedFile(name, payload, content_type="video/mp4")


def webm_upload(name="demo.webm"):
    payload = b"\x1aE\xdf\xa3" + b"\x00" * 256
    return SimpleUploadedFile(name, payload, content_type="video/webm")


def base_payload(category, **overrides):
    payload = {
        "title": "Media Project",
        "tagline": "A project with a rich media story",
        "description": "An innovation used to test media uploads.",
        "problem": "Media evidence is missing.",
        "solution": "Upload images and videos.",
        "objectives": ["Test media", "Publish evidence"],
        "tech": ["Django", "Pillow"],
        "category": category.slug,
        "stage": "prototype",
        "region": "Dar es Salaam",
        "status": "published",
    }
    payload.update(overrides)
    return payload


def test_create_with_four_images_and_two_videos(auth_api, category):
    response = auth_api.post(
        "/api/v1/innovations/",
        base_payload(
            category,
            images=[image_upload(f"image-{i}.jpg") for i in range(4)],
            videos=[video_upload("pitch.mp4"), webm_upload("demo.webm")],
            videoPosters=[image_upload("pitch-poster.jpg"), image_upload("demo-poster.jpg")],
            primaryVideoIndex=0,
        ),
        format="multipart",
    )
    assert response.status_code == 201, response.data
    media = response.data["media"]
    assert len(media) == 6
    assert response.data["mediaCounts"] == {"images": 4, "videos": 2}
    images = [item for item in media if item["kind"] == "image"]
    videos = [item for item in media if item["kind"] == "video"]
    assert len(images) == 4
    assert len(videos) == 2
    assert {item["designation"] for item in images} == {"gallery"}
    pitch = [item for item in videos if item["designation"] == "pitch"]
    demo = [item for item in videos if item["designation"] == "demo"]
    assert len(pitch) == 1 and len(demo) == 1
    assert pitch[0]["originalFilename"] == "pitch.mp4"
    assert pitch[0]["mimeType"] == "video/mp4"
    assert pitch[0]["thumbnailUrl"]

    item = Innovation.objects.get(slug=response.data["slug"])
    assert item.media.count() == 6
    for media_item in item.media.all():
        assert media_item.file.storage.exists(media_item.file.name)
        assert media_item.file_size > 0
        if media_item.kind == "image":
            assert media_item.thumbnail
            assert media_item.thumbnail.storage.exists(media_item.thumbnail.name)
    for video in item.media.filter(kind="video"):
        assert video.thumbnail
        with Image.open(video.thumbnail) as poster:
            assert poster.width <= 900


def test_supported_image_formats(auth_api, category):
    response = auth_api.post(
        "/api/v1/innovations/",
        base_payload(
            category,
            images=[image_upload("a.jpg"), png_upload(), webp_upload()],
        ),
        format="multipart",
    )
    assert response.status_code == 201, response.data
    assert response.data["mediaCounts"]["images"] == 3


def test_limits_reject_more_than_four_images(auth_api, category):
    response = auth_api.post(
        "/api/v1/innovations/",
        base_payload(
            category,
            images=[image_upload(f"image-{i}.jpg") for i in range(5)],
        ),
        format="multipart",
    )
    assert response.status_code == 400
    assert "images" in response.data["error"]["fields"]


def test_limits_reject_more_than_two_videos(auth_api, category):
    response = auth_api.post(
        "/api/v1/innovations/",
        base_payload(
            category,
            videos=[video_upload(), webm_upload(), video_upload("third.mp4")],
        ),
        format="multipart",
    )
    assert response.status_code == 400
    assert "videos" in response.data["error"]["fields"]


def test_limits_include_existing_media(auth_api, category, innovation):
    first = auth_api.patch(
        f"/api/v1/innovations/{innovation.slug}/",
        {"images": [image_upload(f"existing-{i}.jpg") for i in range(3)]},
        format="multipart",
    )
    assert first.status_code == 200, first.data
    second = auth_api.patch(
        f"/api/v1/innovations/{innovation.slug}/",
        {"images": [image_upload("one.jpg"), image_upload("two.jpg")]},
        format="multipart",
    )
    assert second.status_code == 400
    assert "images" in second.data["error"]["fields"]


def test_invalid_media_types_are_rejected(auth_api, category):
    bad_image = auth_api.post(
        "/api/v1/innovations/",
        base_payload(
            category,
            images=[SimpleUploadedFile("bad.jpg", b"not an image", content_type="image/jpeg")],
        ),
        format="multipart",
    )
    assert bad_image.status_code == 400
    assert "images" in bad_image.data["error"]["fields"]

    bad_video = auth_api.post(
        "/api/v1/innovations/",
        base_payload(
            category,
            videos=[SimpleUploadedFile("bad.mp4", b"not a video", content_type="video/mp4")],
        ),
        format="multipart",
    )
    assert bad_video.status_code == 400
    assert "videos" in bad_video.data["error"]["fields"]

    bad_extension = auth_api.post(
        "/api/v1/innovations/",
        base_payload(
            category,
            videos=[SimpleUploadedFile("movie.avi", b"\x00" * 100, content_type="video/avi")],
        ),
        format="multipart",
    )
    assert bad_extension.status_code == 400
    assert "videos" in bad_extension.data["error"]["fields"]


def test_video_size_limit_is_configurable(auth_api, category, settings):
    settings.MAX_INNOVATION_VIDEO_BYTES = 20
    response = auth_api.post(
        "/api/v1/innovations/",
        base_payload(category, videos=[video_upload("large.mp4")]),
        format="multipart",
    )
    assert response.status_code == 400
    assert "videos" in response.data["error"]["fields"]


def test_update_removes_media_and_changes_primary(auth_api, category):
    created = auth_api.post(
        "/api/v1/innovations/",
        base_payload(
            category,
            images=[image_upload("first.jpg"), image_upload("second.jpg")],
            videos=[video_upload("pitch.mp4"), webm_upload("demo.webm")],
            videoPosters=[image_upload("pitch.jpg"), image_upload("demo.jpg")],
            primaryVideoIndex=0,
        ),
        format="multipart",
    )
    assert created.status_code == 201, created.data
    media = created.data["media"]
    first_image = next(item for item in media if item["kind"] == "image")
    pitch = next(item for item in media if item["designation"] == "pitch")
    demo = next(item for item in media if item["designation"] == "demo")
    removed_names = []
    for media_id in (first_image["id"], pitch["id"]):
        item = InnovationMedia.objects.get(pk=media_id)
        removed_names.append(item.file.name)

    updated = auth_api.patch(
        f"/api/v1/innovations/{created.data['slug']}/",
        {
            "removeMediaIds": [first_image["id"], pitch["id"]],
            "primaryVideoId": demo["id"],
            "images": [image_upload("replacement.jpg")],
        },
        format="multipart",
    )
    assert updated.status_code == 200, updated.data
    result = updated.data
    assert result["mediaCounts"] == {"images": 2, "videos": 1}
    assert len([item for item in result["media"] if item["designation"] == "pitch"]) == 1
    assert next(item for item in result["media"] if item["designation"] == "pitch")["id"] == demo["id"]
    for name in removed_names:
        from ecosystem.media import private_storage

        assert not private_storage.exists(name)


def test_draft_media_is_not_public(auth_api, api, user2, category):
    created = auth_api.post(
        "/api/v1/innovations/",
        base_payload(
            category,
            status="draft",
            images=[image_upload("draft.jpg")],
            videos=[video_upload("draft-pitch.mp4")],
            videoPosters=[image_upload("poster.jpg")],
            primaryVideoIndex=0,
        ),
        format="multipart",
    )
    assert created.status_code == 201, created.data
    media = created.data["media"]
    image = next(item for item in media if item["kind"] == "image")
    video = next(item for item in media if item["kind"] == "video")

    assert api.get(image["url"]).status_code == 404
    assert api.get(video["url"]).status_code == 404
    assert auth_api.get(image["url"]).status_code == 200
    assert auth_api.get(image["thumbnailUrl"]).status_code == 200
    assert auth_api.get(video["url"]).status_code == 200

    from rest_framework.test import APIClient

    other = APIClient()
    other.force_authenticate(user2)
    assert other.get(image["url"]).status_code == 404

    auth_api.patch(
        f"/api/v1/innovations/{created.data['slug']}/", {"status": "published"}, format="json"
    )
    anonymous = api.get(image["url"])
    assert anonymous.status_code == 200
    assert anonymous["Content-Type"] == "image/jpeg"
    assert api.get(video["url"]).status_code == 200


def test_video_range_requests(auth_api, api, category):
    created = auth_api.post(
        "/api/v1/innovations/",
        base_payload(
            category,
            videos=[video_upload("range.mp4")],
            videoPosters=[image_upload("range-poster.jpg")],
            primaryVideoIndex=0,
        ),
        format="multipart",
    )
    assert created.status_code == 201, created.data
    video = next(item for item in created.data["media"] if item["kind"] == "video")
    response = api.get(video["url"], HTTP_RANGE="bytes=0-3")
    assert response.status_code == 206
    assert response["Content-Range"].startswith("bytes 0-3/")
    assert response["Accept-Ranges"] == "bytes"
    body = b"".join(response.streaming_content)
    assert len(body) == 4


def test_other_user_cannot_modify_media(user2, auth_api, category):
    created = auth_api.post(
        "/api/v1/innovations/",
        base_payload(category, images=[image_upload("mine.jpg")]),
        format="multipart",
    )
    assert created.status_code == 201
    media_id = created.data["media"][0]["id"]

    from rest_framework.test import APIClient

    other = APIClient()
    other.force_authenticate(user=user2)
    response = other.patch(
        f"/api/v1/innovations/{created.data['slug']}/",
        {"removeMediaIds": [media_id], "title": "Hijacked media"},
        format="multipart",
    )
    assert response.status_code == 403
    assert InnovationMedia.objects.filter(pk=media_id).exists()


def test_media_not_required(auth_api, category):
    created = auth_api.post(
        "/api/v1/innovations/",
        base_payload(category),
        format="json",
    )
    assert created.status_code == 201
    assert created.data["media"] == []
    assert created.data["mediaCounts"] == {"images": 0, "videos": 0}
    assert created.data["previewImage"] is None


def test_cleanup_on_innovation_delete(auth_api, admin_api, category):
    created = auth_api.post(
        "/api/v1/innovations/",
        base_payload(category, images=[image_upload("cleanup.jpg")]),
        format="multipart",
    )
    assert created.status_code == 201
    media = InnovationMedia.objects.get(pk=created.data["media"][0]["id"])
    file_name, thumb_name = media.file.name, media.thumbnail.name
    from ecosystem.media import private_storage

    assert private_storage.exists(file_name)
    assert private_storage.exists(thumb_name)
    admin_api.delete(f"/api/v1/innovations/{created.data['slug']}/?hard=1")
    assert not private_storage.exists(file_name)
    assert not private_storage.exists(thumb_name)

# Innovation Media Uploads and Pitch Video – Implementation Report

**Feature status:** Implemented and tested  
**Scope:** Existing innovation create/edit workflow and public innovation detail page

## What changed

### Backend

- Added `ecosystem.InnovationMedia` (`backend/ecosystem/models.py`) with:
  - owning innovation FK
  - `kind` (`image` / `video`)
  - designation (`gallery`, `pitch`, `demo`)
  - private file reference, generated thumbnail/poster
  - original filename, file size, MIME type, display order, upload timestamp
  - database check constraint ensuring images are gallery media and videos are pitch/demo media
- Added migration `ecosystem/migrations/0002_innovationmedia.py`.
- Added private storage helpers in `backend/ecosystem/media.py`:
  - Pillow validation for JPG/JPEG/PNG/WebP
  - MP4/WebM extension, MIME and container magic-byte validation
  - 900×900 JPEG image thumbnails
  - server-side video-poster processing
  - cleanup signal for file + thumbnail/poster when a media row is deleted
- Extended `InnovationWriteSerializer` with:
  - `images`, `videos`, `videoPosters`
  - `primaryVideoIndex`, `primaryVideoId`
  - `removeMediaIds`
- Extended `InnovationReadSerializer` with media metadata, `previewImage` and `mediaCounts`.
- Added protected streaming endpoints:
  - `GET /api/v1/media/{id}/file/` (Range requests supported)
  - `GET /api/v1/media/{id}/thumbnail/`
- Public access is allowed only for published innovations. Draft/hidden/archived media is available only to the owner and staff.
- Added admin registration for media.
- Added **13 backend media tests**.

### Storage

- **Public** cover images/avatars continue to use `MEDIA_ROOT`.
- **Private** gallery images, videos and generated thumbnails/posters use `PRIVATE_MEDIA_ROOT` (default `backend/private_media`).
- Private files are never served from `/media`; they are streamed by permission-checked API views.
- Published media responses are cacheable for one hour. Draft media responses use `Cache-Control: private, no-store`.
- Removing/replacing media deletes the old storage objects. Deleting an innovation cascades through the media rows and cleanup signal.

### Frontend

- Added `InnovationMedia` improvements to `src/components/dashboard/InnovationForm.tsx`:
  - image section with drag-and-drop, previews, replace/remove, `n/4` counter
  - video section with previews/posters, `n/2` counter, primary pitch radio, replace/remove
  - client-side type/size/count validation
  - XHR upload progress bar
  - English/Kiswahili labels via `src/lib/i18n.ts`
- Added `src/lib/media.ts` for shared client limits, validation, poster generation and file-size formatting.
- Added `src/lib/api.ts` `api.upload()` with CSRF/session handling and upload progress.
- Added public `MediaGallery` (responsive thumbnails + accessible lightbox) and `InnovationVideoSection` (pitch video + separate Demonstration section).
- Public videos use `preload="none"` with thumbnails/posters; video bytes are fetched only when the user presses play.
- Catalogue cards use the existing cover image, or a gallery thumbnail when no cover is set.

## Upload restrictions

| Rule                          | Default                                   |
| ----------------------------- | ----------------------------------------- |
| Gallery images per innovation | 4                                         |
| Videos per innovation         | 2                                         |
| Image formats                 | JPG, JPEG, PNG, WebP                      |
| Video formats                 | MP4, WebM                                 |
| Image size                    | 10 MB each                                |
| Video size                    | 50 MB each                                |
| Video poster size             | 4 MB                                      |
| Primary video                 | Exactly one pitch video when videos exist |

All limits are environment-configurable on the server (`MAX_INNOVATION_MEDIA_*`, `MAX_INNOVATION_VIDEO_BYTES`, `MAX_VIDEO_POSTER_BYTES`).

## Security

- Innovation media creation, replacement and deletion follow existing owner/staff checks on innovation updates.
- Media files are in a private storage root and are streamed only after a publication/ownership check.
- Draft and unpublished media are not publicly accessible.
- Image content is validated with Pillow; video MIME, extension and magic bytes are checked.
- Files use generated UUID paths; original filenames are retained only as metadata.
- CSRF/session protection applies to all uploads.
- Response uses `X-Content-Type-Options: nosniff` inherited from the global security middleware.

## Tests

- Backend: **73 passed**, including media limits, primary designation, MIME validation, thumbnails/posters, protected draft access, range requests, removal/replacement cleanup and ownership.
- Frontend: **27 passed**, including media client-validation helpers.
- TypeScript: pass.
- ESLint: 0 errors.
- Production build: pass.
- Browser E2E: 4 images + 2 videos uploaded, fifth image blocked, previews/counters, public gallery, primary/demo video sections, anonymous access, no video download before play, media persistence after reload, removal and primary change.

## Remaining infrastructure requirements

- Configure reverse-proxy request limits for the largest allowed form (Nginx example: `client_max_body_size 160m`).
- For multi-server/high-volume deployments, move `PRIVATE_MEDIA_ROOT` to private S3-compatible storage and consider direct-to-storage uploads.
- Add background video transcoding for broader codec/device support if needed.
- In-platform camera recording is intentionally not implemented; the media API is ready for that future extension.
- Run upload/performance testing with production-sized files and validate object-storage/CDN behaviour before launch.

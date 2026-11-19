# TIE Platform – API Documentation

Base URL: `/api/v1/`

Interactive schema: `/api/docs/` (Swagger UI), `/api/redoc/` (ReDoc), raw OpenAPI: `/api/schema/`.

---

## 1. Conventions

### Authentication

The API uses Django session cookies, not bearer tokens.

- The frontend calls `GET /api/v1/auth/csrf/` once to receive a `csrftoken` cookie.
- Session cookie: `sessionid` (HttpOnly, SameSite=Lax by default).
- Every unsafe request (`POST`, `PATCH`, `PUT`, `DELETE`) made with an authenticated session must send the `X-CSRFToken` header containing the current `csrftoken` value.
- Requests from another origin must include credentials and be allowed by `CORS_ALLOWED_ORIGINS` / `DJANGO_CSRF_TRUSTED_ORIGINS`.
- Same-origin deployment (reverse proxy) is recommended.

### Content type

JSON unless stated otherwise. Image uploads use `multipart/form-data`.

### Error shape

```json
{
  "error": {
    "code": "validation_error",
    "message": "Please check the submitted data.",
    "fields": {
      "title": ["This field is required."]
    }
  }
}
```

Common codes: `validation_error`, `authentication_required`, `authentication_failed`, `permission_denied`, `not_found`, `rate_limited`, `csrf_failed`, `server_error`, `network_error` (client-side only).

### Pagination

Standard list endpoints return:

```json
{
  "count": 42,
  "next": "http://...?page=2",
  "previous": null,
  "results": []
}
```

Query parameters: `page` (1-based), `page_size` (default 12, max 50). Some nested lists use explicit `count`/`results` without `next`.

### Rate limits

| Scope                                          | Default             |
| ---------------------------------------------- | ------------------- |
| Anonymous                                      | 120 requests/minute |
| Authenticated                                  | 600 requests/minute |
| Auth endpoints (register/login/password reset) | 15 requests/minute  |

Configurable through `THROTTLE_ANON`, `THROTTLE_USER`, `THROTTLE_AUTH`.

### Field naming

Response fields use **camelCase** to match the existing frontend (for example `publishedAt`, `innovationCount`, `viewer`). Write fields for profile and staff forms use **snake_case** where noted. Innovation create/update accepts camelCase `teamEmails`.

---

## 2. Authentication and accounts

| Method | Path                             | Auth    | Description                                    |
| ------ | -------------------------------- | ------- | ---------------------------------------------- |
| GET    | `/auth/csrf/`                    | Public  | Sets the CSRF cookie                           |
| POST   | `/auth/register/`                | Public  | Create a community account and start a session |
| POST   | `/auth/login/`                   | Public  | Start a session                                |
| POST   | `/auth/logout/`                  | Session | End the session (204)                          |
| GET    | `/auth/me/`                      | Session | Current user                                   |
| PATCH  | `/auth/me/`                      | Session | Update the current profile                     |
| GET    | `/auth/innovators/`              | Public  | Paginated public innovator directory           |
| GET    | `/auth/users/{slug}/`            | Public  | Public profile with published projects         |
| POST   | `/auth/users/{slug}/follow/`     | Session | Toggle follow/unfollow                         |
| GET    | `/auth/notifications/`           | Session | Notifications                                  |
| POST   | `/auth/notifications/{id}/read/` | Session | Mark one read                                  |
| POST   | `/auth/notifications/read-all/`  | Session | Mark all read                                  |
| POST   | `/auth/password-reset/`          | Public  | Request a reset email (always 202)             |
| POST   | `/auth/password-reset/confirm/`  | Public  | Set a new password                             |
| GET    | `/auth/dashboard/`               | Session | Aggregated owner dashboard                     |

### Register

`POST /auth/register/`

```json
{
  "email": "amina@example.com",
  "fullName": "Amina Juma",
  "password": "Str0ng-Pass-2026",
  "passwordConfirm": "Str0ng-Pass-2026",
  "role": "innovator",
  "institution": "sua"
}
```

`role` is one of `innovator`, `student`, `researcher`, `creator`, `institution_rep`. `admin` is rejected. `institution` is an optional institution slug. Passwords are validated with Django's validators (minimum 8 characters, not common, not entirely numeric, not too similar to the account details) and hashed with Django's password hasher.

Response `201`:

```json
{
  "user": {
    "slug": "amina-juma",
    "name": "Amina Juma",
    "email": "amina@example.com",
    "role": "innovator",
    "...": "..."
  }
}
```

### Login / logout

`POST /auth/login/` with `{"email": "...", "password": "..."}` → `200 {"user": {...}}`.

`POST /auth/logout/` → `204`.

### Profile

`PATCH /auth/me/` (JSON or multipart when uploading an avatar).

| Field         | Type            | Notes                                                 |
| ------------- | --------------- | ----------------------------------------------------- |
| `full_name`   | string          | 2–150 characters                                      |
| `role`        | enum            | Community role; staff may also set `admin`            |
| `headline`    | string          | Up to 180 characters                                  |
| `bio`         | string          | Up to 2000 characters                                 |
| `location`    | string          | Region name                                           |
| `institution` | slug or `null`  | Must be an active institution                         |
| `skills`      | string[]        | Max 20                                                |
| `interests`   | slug[]          | Category slugs                                        |
| `looking_for` | string[]        | Max 15                                                |
| `links`       | `{label,url}[]` | URL must start with `http://` or `https://`           |
| `is_public`   | boolean         | Private profiles are hidden from the public directory |
| `avatar`      | image file      | Max 2 MB; JPEG/PNG/etc.                               |

Email is immutable through this endpoint.

### Password reset

Request:

```json
POST /auth/password-reset/
{ "email": "amina@example.com" }
```

Always returns `202` with a generic message (prevents account enumeration). In development the email backend prints the reset link to the Django console.

Confirm:

```json
POST /auth/password-reset/confirm/
{
  "uid": "MQ",
  "token": "c9c2-...",
  "password": "New-Pass-2026",
  "passwordConfirm": "New-Pass-2026"
}
```

### Dashboard response

```json
{
  "stats": {
    "innovations": 2,
    "publishedInnovations": 1,
    "followers": 3,
    "following": 1,
    "totalLikes": 12,
    "savedInnovations": 2,
    "savedOpportunities": 1,
    "pendingRequests": 1,
    "unreadNotifications": 4
  },
  "innovations": [],
  "requests": [],
  "notifications": [],
  "applications": []
}
```

---

## 3. Categories and institutions

| Method | Path                    | Auth   | Description                                                     |
| ------ | ----------------------- | ------ | --------------------------------------------------------------- |
| GET    | `/categories/`          | Public | All categories with published innovation counts (not paginated) |
| GET    | `/institutions/`        | Public | Paginated institutions                                          |
| GET    | `/institutions/{slug}/` | Public | Institution detail                                              |
| POST   | `/institutions/`        | Staff  | Create                                                          |
| PATCH  | `/institutions/{slug}/` | Staff  | Update                                                          |
| DELETE | `/institutions/{slug}/` | Staff  | Soft-deactivate                                                 |

Institution list filters: `q`, `type` (`University`, `Research`, `Innovation Hub`, `Government`), `verified=1`.

Institution fields (read): `slug`, `name`, `short`, `type`, `location`, `description`, `website`, `verified`, `focus` (category slugs), `innovationCount`, `isActive`.

Staff write fields: `name`, `short_name`, `type`, `location`, `description`, `website`, `verified`, `focus`, `is_active`.

---

## 4. Innovations

| Method | Path                            | Auth         | Description                                  |
| ------ | ------------------------------- | ------------ | -------------------------------------------- |
| GET    | `/innovations/`                 | Public       | List/search published innovations            |
| GET    | `/innovations/{slug}/`          | Public       | Detail; increments views                     |
| POST   | `/innovations/`                 | Session      | Create                                       |
| PATCH  | `/innovations/{slug}/`          | Owner/Staff  | Update                                       |
| DELETE | `/innovations/{slug}/`          | Owner/Staff  | Archive (staff may pass `?hard=1` to delete) |
| POST   | `/innovations/{slug}/like/`     | Session      | Toggle like                                  |
| POST   | `/innovations/{slug}/bookmark/` | Session      | Toggle bookmark                              |
| POST   | `/innovations/{slug}/moderate/` | Staff        | Set status/featured/trending                 |
| GET    | `/innovations/{slug}/comments/` | Public       | Paginated comments                           |
| POST   | `/innovations/{slug}/comments/` | Session      | Add comment                                  |
| PATCH  | `/comments/{id}/`               | Author/Staff | Edit comment                                 |
| DELETE | `/comments/{id}/`               | Author/Staff | Delete comment                               |
| POST   | `/reports/`                     | Session      | Report an innovation or comment              |

### List filters

| Parameter           | Example           | Notes                                                              |
| ------------------- | ----------------- | ------------------------------------------------------------------ |
| `q`                 | `solar`           | Title, tagline, description, tech, region, creator and institution |
| `category`          | `energy,ai`       | Comma-separated category slugs                                     |
| `stage`             | `pilot`           | `concept`, `prototype`, `pilot`, `market`                          |
| `institution`       | `sua`             | Comma-separated institution slugs                                  |
| `region`            | `Dodoma`          | Comma-separated region names                                       |
| `creator`           | `juma-kileo`      | Creator slugs                                                      |
| `sort`              | `popular`         | `latest` (default), `popular`, `discussed`, `views`                |
| `mine=1`            | —                 | Signed-in user's own innovations, including drafts                 |
| `status`            | `draft,published` | Owner/staff only                                                   |
| `featured=1`        | —                 | Featured only                                                      |
| `trending=1`        | —                 | Trending only                                                      |
| `page`, `page_size` | —                 | Pagination                                                         |

Owners can always see their own drafts/hidden content; the public only sees `published`. Detail view increments `views` unless `?track=0` is supplied (used by SSR to avoid double counting).

### Innovation response

```json
{
  "slug": "shambasense",
  "title": "ShambaSense",
  "tagline": "Soil and weather insights for smallholder farmers via SMS and app.",
  "description": "...",
  "problem": "...",
  "solution": "...",
  "objectives": ["..."],
  "tech": ["IoT", "Python"],
  "category": "agriculture",
  "stage": "pilot",
  "image": "https://tie.example/media/innovations/...jpg",
  "creator": {
    "slug": "juma-kileo",
    "name": "Juma Kileo",
    "headline": "...",
    "photo": "...",
    "location": "Moshi",
    "institution": {}
  },
  "team": [],
  "institution": {
    "slug": "sua",
    "name": "...",
    "short": "SUA",
    "focus": ["agriculture"],
    "...": "..."
  },
  "region": "Kilimanjaro",
  "likes": 1240,
  "comments": 2,
  "views": 18400,
  "publishedAt": "2026-10-28T09:00:00+03:00",
  "featured": true,
  "trending": true,
  "link": "",
  "status": "published",
  "viewer": {
    "liked": false,
    "saved": false,
    "isOwner": false,
    "collaborationStatus": null
  }
}
```

`likes` includes imported baseline likes from the original catalogue plus live likes. `comments` is the live visible-comment count.

### Create/update innovation

`POST /innovations/` or `PATCH /innovations/{slug}/`.

```json
{
  "title": "Mazao Market",
  "tagline": "Fair prices for farmers",
  "description": "A marketplace connecting farmers and buyers.",
  "problem": "Farmers lack price information.",
  "solution": "Daily prices and verified buyers.",
  "objectives": ["Cover 20 regional markets"],
  "tech": ["Django", "PostgreSQL"],
  "category": "agriculture",
  "stage": "prototype",
  "institution": "sua",
  "region": "Arusha",
  "link": "https://example.com",
  "status": "published",
  "teamEmails": ["colleague@example.com"]
}
```

- `status`: `draft` or `published`. `hidden`/`archived` are controlled by staff or deletion.
- `teamEmails` must belong to existing active TIE accounts; the creator is excluded from the team list.
- Cover image: multipart field `image`; max 5 MB; optional. This remains the catalogue-card cover.
- New content is published immediately by default (`AUTO_PUBLISH_INNOVATIONS=true`), matching the existing platform's open publishing model. Moderators can hide content after reports or review. Set `AUTO_PUBLISH_INNOVATIONS=false` to make new content drafts by default.

### Innovation media uploads

Registered in `InnovationMedia`, not embedded in the innovation row. Media is stored in private filesystem storage and streamed through a permission-checked API endpoint.

| Field               | Type                      | Notes                                                                    |
| ------------------- | ------------------------- | ------------------------------------------------------------------------ |
| `images`            | repeated file (multipart) | Up to 4 new gallery images; JPG/JPEG/PNG/WebP; max 10 MB each by default |
| `videos`            | repeated file (multipart) | Up to 2 new videos; MP4/WebM; max 50 MB each by default                  |
| `videoPosters`      | repeated file (multipart) | One browser-generated poster per new video, in the same order; max 4 MB  |
| `primaryVideoIndex` | integer                   | Index in the new `videos` list to designate as the pitch video (0 or 1)  |
| `primaryVideoId`    | integer                   | Existing video ID to designate as the pitch video                        |
| `removeMediaIds`    | repeated integer / array  | Existing media to remove in the same update                              |

Rules:

- Max **4 images** and **2 videos** per innovation, counting existing media not being removed.
- Exactly one video is designated `pitch`; the other video(s) become `demo`. If no primary is supplied, the first remaining video becomes the pitch video.
- Image files are verified with Pillow; video MIME, extension and MP4/WebM container magic bytes are checked server-side.
- Image thumbnails (900×900 max, JPEG) and video posters are generated server-side and stored privately.
- Removing/replacing media deletes the old private object and thumbnail via a post-delete signal.
- The API also exposes a dedicated protected read endpoint:

| Method | Path                     | Auth                                                     | Description                                              |
| ------ | ------------------------ | -------------------------------------------------------- | -------------------------------------------------------- |
| GET    | `/media/{id}/file/`      | Public for published innovations; owner/staff for drafts | Streams the original image/video with HTTP Range support |
| GET    | `/media/{id}/thumbnail/` | Same rule                                                | Streams the generated image thumbnail or video poster    |

Media attached to drafts, hidden or archived innovations returns `404` to anonymous visitors and non-owners. Published media is public and cacheable for one hour.

### Likes and bookmarks

- `POST /innovations/{slug}/like/` → `{"liked": true, "likes": 1241}`
- `POST /innovations/{slug}/bookmark/` → `{"saved": true}`
- Both toggle: a second request removes the like/bookmark.
- Bookmarks are listed at `GET /me/bookmarks/`.

### Comments

`GET /innovations/{slug}/comments/?page=1&page_size=10`

```json
{
  "count": 2,
  "results": [
    {
      "id": 5,
      "body": "How can cooperatives join the pilot?",
      "author": { "slug": "baraka-mwakyusi", "name": "Baraka Mwakyusa", "...": "..." },
      "canEdit": true,
      "createdAt": "2026-11-17T12:00:00Z",
      "isHidden": false
    }
  ]
}
```

POST body: `{"body": "..."}` (2–2000 characters). Commenting notifies the innovation creator; the commenter can delete their own comment; staff can delete any comment.

### Moderation

`POST /innovations/{slug}/moderate/` (staff):

```json
{ "status": "hidden", "featured": false, "trending": false }
```

Allowed statuses: `draft`, `published`, `hidden`, `archived`. Hiding notifies the creator.

---

## 5. Collaboration requests

| Method | Path                            | Auth    | Description                 |
| ------ | ------------------------------- | ------- | --------------------------- |
| GET    | `/collaboration-requests/`      | Session | Incoming/outgoing requests  |
| POST   | `/collaboration-requests/`      | Session | Send a request              |
| PATCH  | `/collaboration-requests/{id}/` | Session | Accept, decline or withdraw |

List filters: `direction=incoming|outgoing`, `status`.

Create for an innovation:

```json
{
  "innovation": "shambasense",
  "message": "We would like to pilot this with our cooperative network."
}
```

Create for a profile:

```json
{
  "recipient": "neema-mushi",
  "message": "Would you like to explore a joint research grant?"
}
```

Response fields include `sender`, `recipient`, `innovation`, `message`, `status` (`pending`, `accepted`, `declined`, `withdrawn`), `responseMessage`, `canRespond`, `canWithdraw`, `createdAt`.

Respond:

```json
PATCH /collaboration-requests/12/
{ "status": "accepted", "responseMessage": "Happy to collaborate." }
```

Only the recipient can accept/decline; only the sender can withdraw. Duplicate pending requests for the same target are rejected. Both parties receive notifications.

---

## 6. Reports and moderation

| Method | Path                    | Auth    | Description                     |
| ------ | ----------------------- | ------- | ------------------------------- |
| POST   | `/reports/`             | Session | Report an innovation or comment |
| GET    | `/reports/`             | Staff   | List reports (`status=open`)    |
| PATCH  | `/reports/{id}/`        | Staff   | Resolve or dismiss              |
| GET    | `/moderation/overview/` | Staff   | Staff dashboard aggregate       |

Report create (exactly one target):

```json
{
  "innovation": "shambasense",
  "reason": "spam",
  "details": "Optional context"
}
```

Or `{"comment": 5, "reason": "abuse"}`. Reasons: `spam`, `abuse`, `copyright`, `other`.

Resolve/dismiss:

```json
{ "status": "resolved", "resolutionNote": "Hidden after review." }
```

Resolving a report against an innovation hides it; resolving a comment report hides the comment. The reporter and affected creator are notified.

Moderation overview response includes `stats`, `reports`, `hiddenInnovations`, `draftInnovations` and recent `applications`.

---

## 7. Opportunities

| Method | Path                                  | Auth    | Description                                        |
| ------ | ------------------------------------- | ------- | -------------------------------------------------- |
| GET    | `/opportunities/`                     | Public  | Published opportunities                            |
| GET    | `/opportunities/{slug}/`              | Public  | Detail                                             |
| POST   | `/opportunities/`                     | Staff   | Create                                             |
| PATCH  | `/opportunities/{slug}/`              | Staff   | Update                                             |
| DELETE | `/opportunities/{slug}/`              | Staff   | Archive                                            |
| POST   | `/opportunities/{slug}/bookmark/`     | Session | Toggle save                                        |
| POST   | `/opportunities/{slug}/apply/`        | Session | Apply                                              |
| GET    | `/opportunities/{slug}/applications/` | Staff   | List applications                                  |
| GET    | `/me/applications/`                   | Session | Current user's applications                        |
| GET    | `/applications/`                      | Staff   | All applications (`opportunity`, `status` filters) |
| PATCH  | `/applications/{id}/`                 | Staff   | Accept/reject/under review                         |

List filters: `q`, `type` (Challenge, Hackathon, Grant, Research, Internship, Program), `category`, `open_only=1`, `sort=deadline|newest|popular`, `status` (staff), pagination.

Opportunity fields: `id` (slug), `slug`, `title`, `type`, `organizer`, `deadline`, `location`, `summary`, `eligibility`, `reward`, `categories`, `external_url`, `status`, `daysLeft`, `isOpen`, `applicationCount`, `viewer` (`saved`, `applicationStatus`).

Staff write fields: `title`, `type`, `organizer`, `deadline` (YYYY-MM-DD), `location`, `summary`, `eligibility`, `reward`, `categories`, `external_url`, `status` (`draft`, `published`, `closed`, `archived`).

Apply:

```json
POST /opportunities/climate-challenge-2026/apply/
{ "motivation": "Our team has a working prototype and a community partner." }
```

Minimum 20 characters; one application per user per opportunity; closed opportunities reject applications. Staff review:

```json
PATCH /applications/8/
{ "status": "accepted", "reviewNote": "Strong fit" }
```

Applicants receive a notification.

---

## 8. Core endpoints

| Method | Path                                       | Auth   | Description                 |
| ------ | ------------------------------------------ | ------ | --------------------------- |
| GET    | `/health/` (and `/health/` at server root) | Public | Service + database health   |
| GET    | `/stats/`                                  | Public | Live platform counts        |
| GET    | `/home/`                                   | Public | Home page aggregate         |
| GET    | `/moderation/overview/`                    | Staff  | Staff statistics and queues |

### Home aggregate

Returns one response used by the homepage:

- `stats`: `innovations`, `innovators`, `institutions`, `regions`
- `latest`: 4 latest published innovations
- `featured`: up to 4 featured innovations (falls back to latest)
- `trending`: up to 6 trending innovations by views
- `innovators`: 4 public profiles
- `institutions`: 8 active institutions
- `categories`: category records with live counts
- `announcements`: 5 upcoming open opportunities
- `opportunities`: 3 upcoming open opportunities

### Stats

```json
{
  "innovations": 9,
  "innovators": 6,
  "institutions": 8,
  "regions": 6,
  "categories": 8,
  "opportunities": 6
}
```

All numbers are computed from the live database. There is no seeded "impact marketing" data.

---

## 9. Example session flow (curl)

```bash
# 1. Get CSRF cookie
curl -c /tmp/tie-cookies.txt http://127.0.0.1:8000/api/v1/auth/csrf/

# 2. Read the token from the cookie jar
CSRF=$(awk '$6 == "csrftoken" {print $7}' /tmp/tie-cookies.txt)

# 3. Log in
curl -b /tmp/tie-cookies.txt -c /tmp/tie-cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF" \
  -d '{"email":"amina@example.com","password":"Str0ng-Pass-2026"}' \
  http://127.0.0.1:8000/api/v1/auth/login/

# 4. Re-read the rotated CSRF token after login
CSRF=$(awk '$6 == "csrftoken" {print $7}' /tmp/tie-cookies.txt)

# 5. Like an innovation
curl -b /tmp/tie-cookies.txt -X POST \
  -H "X-CSRFToken: $CSRF" \
  http://127.0.0.1:8000/api/v1/innovations/shambasense/like/
```

---

## 10. Permissions summary

| Capability                               | Anonymous | Authenticated | Owner          | Staff                                  |
| ---------------------------------------- | --------- | ------------- | -------------- | -------------------------------------- |
| Browse published content                 | ✅        | ✅            | ✅             | ✅                                     |
| See own drafts/hidden content            | —         | —             | ✅             | ✅                                     |
| Create innovation                        | —         | ✅            | —              | ✅                                     |
| Edit/delete an innovation                | —         | —             | ✅             | ✅                                     |
| View/upload/replace/delete draft media   | —         | —             | ✅             | ✅                                     |
| View published media                     | ✅        | ✅            | ✅             | ✅                                     |
| Like/bookmark/comment/apply              | —         | ✅            | ✅             | ✅                                     |
| Send collaboration requests              | —         | ✅            | ✅             | ✅                                     |
| Accept/decline collaboration             | —         | —             | recipient only | recipient only                         |
| Report content                           | —         | ✅            | ✅             | ✅                                     |
| View reports / moderation overview       | —         | —             | —              | ✅                                     |
| Create/edit institutions & opportunities | —         | —             | —              | ✅                                     |
| Hide content / review applications       | —         | —             | —              | ✅                                     |
| Django admin (`/admin/`)                 | —         | —             | —              | superuser/staff with model permissions |

All permission checks are enforced server-side. Hiding UI elements is only a convenience.

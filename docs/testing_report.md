# TIE Platform – Testing Report

**Testing period:** 17–18 November 2026  
**Application:** TIE – Tanzania Innovation Ecosystem  
**Scope:** Django API, database, frontend–backend integration and end-to-end user journeys

---

## 1. Test environment

| Component             | Version / detail                                                 |
| --------------------- | ---------------------------------------------------------------- |
| Operating system      | Linux (Ubuntu-based sandbox)                                     |
| Python                | 3.13.12                                                          |
| Django                | 5.2.19                                                           |
| Django REST Framework | 3.16.1                                                           |
| Database under test   | PostgreSQL 18 (real server, dedicated `tie_dev` / test database) |
| Node.js               | 22.20.0                                                          |
| Bun                   | 1.4.4                                                            |
| Frontend              | TanStack Start / React 19 / Vite 8                               |
| Browser automation    | Playwright (Python) with system Chromium                         |
| Backend test runner   | pytest 9 + pytest-django 4.14                                    |

The backend suite ran against a real PostgreSQL database. A separate SQLite migration smoke test was also performed. No mocked database responses were used for backend integration tests.

---

## 2. Automated backend tests

Command:

```bash
cd backend
pytest
```

Result: **60 passed, 0 failed** (≈8–10 seconds).

| Test file                     | Tests | Area covered                                                                                                                                                                                                                | Result    |
| ----------------------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `tests/test_auth.py`          |    17 | Registration, validation, duplicate email, login/logout, session identity, CSRF enforcement, profile privacy, profile updates, follow/unfollow, password reset, notifications, dashboard, CORS, innovator directory privacy, multipart profile update | ✅ Passed |
| `tests/test_catalog.py`       |     8 | Institution list/counts/filters, staff-only institution CRUD, category counts, home aggregate, health/stats, staff moderation access, OpenAPI schema                                                                        | ✅ Passed |
| `tests/test_innovations.py`   |    15 | Public visibility rules, owner drafts, view counting, search/filter/sort, pagination, auth requirements, create/update ownership, team-by-email validation, draft save, staff moderation, image limits, multipart upload with image | ✅ Passed |
| `tests/test_opportunities.py` |     6 | Public list and `open_only`, type/category filters, bookmarking, apply/review workflow, duplicate and expired applications, staff-only CRUD, archive                                                                        | ✅ Passed |
| `tests/test_social.py`        |    13 | Likes/bookmarks, comments and notifications, staff comment hiding through reports, report validation and permissions, collaboration request lifecycle, profile collaboration, withdrawal                                    | ✅ Passed |
| `tests/test_seed.py`          |     1 | Seed command idempotency and seeded relationships                                                                                                                                                                           | ✅ Passed |

Additional backend checks:

- `python manage.py check` → no issues.
- `python manage.py makemigrations --check --dry-run` → no changes.
- `python manage.py migrate` on PostgreSQL → OK.
- SQLite migration smoke test (`DB_ENGINE=sqlite`) → OK.
- `python manage.py spectacular --file ...` → schema generated (Swagger/ReDoc available; some serializer methods use generic schema fallbacks—see known issues).
- Seed command run twice → second run created 0 duplicates.
- Health endpoint confirmed database connectivity: `{"status":"ok","database":"ok"}`.

---

## 3. Automated frontend tests and static checks

| Check                | Command                                 | Result                                                 |
| -------------------- | --------------------------------------- | ------------------------------------------------------ |
| Unit/component tests | `bun run test`                          | **22 passed, 0 failed** (2 files)                      |
| TypeScript           | `bunx tsc --noEmit`                     | ✅ No errors                                           |
| ESLint               | `bun run lint`                          | ✅ 0 errors; 9 pre-existing Fast Refresh warnings only |
| Production build     | `bun run build`                         | ✅ Successful (client + SSR bundles)                   |
| Node SSR build smoke | `NITRO_PRESET=node-server` build + boot | ✅ Served home HTML and static assets on port 3100     |

Frontend test coverage:

- Route table contains every public page plus dashboard, innovation editor, requests, saved, applications, notifications, profile and moderation.
- API client builds query strings, sends session credentials, adds CSRF headers, normalises validation errors and network failures, and fetches the CSRF cookie once for concurrent requests.

---

## 4. Browser end-to-end testing

Playwright drove a real Chromium browser against the running frontend (`:8080`) and Django API (`:8000`), with real cookies, CSRF tokens and PostgreSQL writes.

### Scenario A – New user publishes and engages

1. Register with full name, email, password and role. ✅
2. Redirect to `/dashboard`; authenticated data loaded from the API. ✅
3. Open “New innovation”, complete title, tagline, description, objectives and technology fields, upload a real cover image through the browser and publish. ✅
4. Innovation appears in “My innovations” and on its public detail page with the correct slug. ✅
5. Like the innovation; button state and count updated; persisted after reload. ✅
6. Save the innovation; appears under Saved. ✅
7. Post a comment; appears immediately; creator notification created. ✅
8. Edit profile headline; success message; public profile reflects the change. ✅
9. Save an opportunity and submit an application; application appears in “My applications”. ✅
10. Edit the published innovation; the public detail page shows the updated tagline. ✅
11. Uploaded image resolves from `/media/` and renders at its natural dimensions. ✅

### Scenario B – Collaboration between two accounts

1. Second account registered in a separate browser context. ✅
2. Search on Explore found the first user's innovation. ✅
3. Sent a collaboration request with a message. ✅
4. First user saw the request in the dashboard, accepted it. ✅
5. Sender switched to Outgoing and saw status `accepted`. ✅
6. Recipient received a notification. ✅

### Scenario C – Moderation and administration

1. A reported innovation appeared in the staff moderation queue. ✅
2. Moderator resolved the report with a note; the innovation was hidden. ✅
3. Hidden content was visible to staff in the Content tab; restored with “Publish”. ✅
4. Staff created an opportunity through the UI; it immediately appeared on the public Opportunities page. ✅
5. Staff created an institution; it appeared on the public Institutions page. ✅
6. Staff could see the applicant and review the opportunity application. ✅
7. Non-staff users were denied access to moderation data by the API and redirected by the UI. ✅

### Scenario D – Discovery, filters and responsive navigation

1. Explore category filter (Health) reduced the list correctly. ✅
2. Keyword search (“solar”) returned matching innovations. ✅
3. “Load more” appended the next page (9 → 11 results during the test). ✅
4. Institution search by location matched both a seeded and a test institution. ✅
5. Innovator search by location matched the correct profile. ✅
6. Opportunity type filter returned only the selected type. ✅
7. Password-reset request UI accepted an email and showed the neutral confirmation. ✅
8. Logged-out access to `/dashboard` redirected to login with the intended destination. ✅
9. Mobile viewport (390 × 844): menu opened, navigation worked, no horizontal overflow. ✅
10. Public pages loaded with no browser page errors or failed assets after local image assets were added. ✅

### Screenshots captured during QA

The QA browser captured full-page screenshots for the home page, dashboard, innovation detail, requests, opportunities/applications, moderation and mobile Explore. These are test artefacts, not application files.

---

## 5. Defects found and resolved

| #   | Defect                                                                       | Root cause                                      | Resolution                                                                       | Retested |
| --- | ---------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------- | -------- |
| 1   | All content, likes, saves and follows were static/local-only                 | Frontend-only prototype                         | Added Django models, API, persistence, accounts and React Query integration      | ✅       |
| 2   | Login/registration page was a “coming soon” placeholder                      | No auth backend                                 | Session auth, registration, login, logout, profile, password reset               | ✅       |
| 3   | Public API exposed user email addresses in innovator listings                | Serializer reused for private and public output | Removed email from public serializers; added `MeSerializer` for the current user | ✅       |
| 4   | `500` on innovation detail/like due `Innovation.likes.through`               | Likes are a reverse FK, not a M2M               | Used explicit `InnovationLike` / `InnovationBookmark` models in annotations      | ✅       |
| 5   | Institution filter produced `Field 'id' expected a number`                   | Filtered FK by slug using `institution_id`      | Changed to `institution__slug__in`                                               | ✅       |
| 6   | Django `Http404` crashed the custom exception handler                        | Handler assumed every exception had `.detail`   | Added explicit `Http404` branches                                                | ✅       |
| 7   | Notification API returned 500                                                | CamelCase response fields were not declared     | Declared `isRead`, `createdAt` mappings                                          | ✅       |
| 8   | Staff “New institution” dialog crashed                                       | Null institution accessed in initial state      | Corrected initial state branch                                                   | ✅       |
| 9   | Logged-out dashboard redirect included `redirect=/auth`                      | Guard effect re-ran after route change          | Guard now only redirects while still inside `/dashboard`                         | ✅       |
| 10  | Local browser 404s for logo and scenic photos                                | Images referenced Lovable's hosted asset proxy  | Downloaded licensed assets into `public/images/` and updated references          | ✅       |
| 11  | Seed command mutated source dictionaries between runs                        | In-place `pop()` on seed data                   | Copy each record before processing                                               | ✅       |
| 12  | Opportunity and institution staff forms failed silently for ambiguous labels | Automation selector issue, not app issue        | Scoped selectors with exact labels; re-ran successfully                          | ✅       |

---

## 6. Passed / failed / blocked / untested summary

| Status                                  | Count / detail                                                                                                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend automated tests passed          | 60                                                                                                                                           |
| Backend automated tests failed          | 0                                                                                                                                            |
| Frontend unit tests passed              | 22                                                                                                                                           |
| Frontend unit tests failed              | 0                                                                                                                                            |
| TypeScript errors                       | 0                                                                                                                                            |
| ESLint errors                           | 0                                                                                                                                            |
| Production build                        | Passed                                                                                                                                       |
| Browser E2E scenarios                   | 4 scenarios, all passed                                                                                                                      |
| Blocked                                 | None for the implemented scope                                                                                                               |
| Untested / requires real infrastructure | Production SMTP delivery, large-scale load/performance, third-party object storage, full WCAG/accessibility audit, external penetration test |

The email password-reset flow was tested end-to-end at the API level using Django's locmem/console email backend. Real inbox delivery depends on production SMTP credentials and was not available in the QA environment.

---

## 7. Data integrity checks

- Migrations applied cleanly and are reproducible from an empty database.
- Unique constraints verified for likes, bookmarks, follows, applications, collaboration requests and opportunity bookmarks.
- Check constraints verified for self-follow, self-collaboration and report targets (exactly one target).
- Foreign-key cascade/SET NULL behaviour verified indirectly through deletion of test accounts and archived content.
- Seed content has stable slugs and relations to categories, institutions and creators.
- Tests create and destroy their own PostgreSQL test database; the development database was cleaned of QA accounts and test content after E2E runs.

---

## 8. How to reproduce

```bash
# Backend
cd backend
source .venv/bin/activate
pytest

# Frontend static/unit checks
cd ..
bun run test
bunx tsc --noEmit
bun run lint
bun run build
```

For browser testing, start Django on port 8000 and the frontend on port 8080, then follow the scenarios in section 4. See `docs/setup_and_deployment.md`.

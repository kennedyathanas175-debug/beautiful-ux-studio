# TIE Platform – Setup and Deployment Guide

This guide explains how to run the Tanzania Innovation Ecosystem (TIE) platform locally and how to deploy it safely.

The repository contains two applications:

| Path       | Application                            | Default development URL |
| ---------- | -------------------------------------- | ----------------------- |
| `src/`     | TanStack Start / React frontend        | `http://localhost:8080` |
| `backend/` | Django 5.2 + Django REST Framework API | `http://127.0.0.1:8000` |

In development the frontend proxies `/api` and `/media` to Django, so the browser sees one origin.

---

## 1. Prerequisites

- **Python** 3.12 or newer (tested on 3.13.12)
- **Node.js** 20 or newer, or **Bun** 1.2+ (the repository contains `bun.lock`)
- **PostgreSQL** 15 or newer (tested on PostgreSQL 18). SQLite is supported for a quick local start.
- Git

> The repository uses `bun.lock`; use Bun for reproducible installs where possible. `npm install` works but generates a separate lockfile.

---

## 2. Local development – step by step

### 2.1 Backend

```bash
cd backend

# Create an isolated Python environment (outside the repo is fine)
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Create local configuration
cp .env.example .env
# Edit .env: set DJANGO_SECRET_KEY and database credentials.
```

For a quick SQLite run, set in `backend/.env`:

```dotenv
DB_ENGINE=sqlite
```

For PostgreSQL (recommended), create a database and user:

```sql
CREATE USER tie WITH PASSWORD 'choose-a-strong-password';
CREATE DATABASE tie OWNER tie;
```

and set:

```dotenv
DB_ENGINE=postgres
DB_NAME=tie
DB_USER=tie
DB_PASSWORD=choose-a-strong-password
DB_HOST=127.0.0.1
DB_PORT=5432
```

Apply migrations, load the published catalogue that existed before the backend, and create an administrator:

```bash
python manage.py migrate
python manage.py seed_catalog
python manage.py createsuperuser     # enter email, full name, password
```

The seed command is idempotent. Use `python manage.py seed_catalog --update` only when you intentionally want to reset seeded records to their original content.

Start the API:

```bash
python manage.py runserver 127.0.0.1:8000
```

Check it:

```bash
curl http://127.0.0.1:8000/api/v1/health/
```

Expected response:

```json
{ "status": "ok", "database": "ok", "service": "tie-api" }
```

### 2.2 Frontend

In a second terminal, from the repository root:

```bash
bun install
bun run dev --host 127.0.0.1 --port 8080
```

Open `http://localhost:8080`.

The Vite development server proxies:

- `/api/*` → `http://127.0.0.1:8000/api/*`
- `/media/*` → `http://127.0.0.1:8000/media/*`

If Django is on another host or port:

```bash
API_PROXY_TARGET=http://192.168.1.20:8000 bun run dev
```

### 2.3 First-use checklist

1. Register an account at `/auth?mode=join`.
2. Create or edit your profile at `/dashboard/profile`.
3. Publish an innovation at `/dashboard/innovations/new`.
4. Save an opportunity, like an innovation, comment, follow an innovator and send a collaboration request.
5. Sign in with the superuser account and open `/moderation` for the staff workspace. Django's full data administration is at `/admin/`.

---

## 3. Environment variables

Configuration is read from `backend/.env` (ignored by Git). Copy `backend/.env.example` and never commit real secrets.

### Core

| Variable                      | Default                          | Purpose                                          |
| ----------------------------- | -------------------------------- | ------------------------------------------------ |
| `DJANGO_SECRET_KEY`           | development-only value           | Required in production; use a long random string |
| `DJANGO_DEBUG`                | `true`                           | Must be `false` in production                    |
| `DJANGO_ALLOWED_HOSTS`        | `localhost,127.0.0.1,testserver` | Comma-separated public hostnames                 |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | localhost origins                | Full origins allowed to submit unsafe requests   |
| `DJANGO_TIME_ZONE`            | `Africa/Dar_es_Salaam`           | Display/storage timezone                         |
| `FRONTEND_URL`                | `http://localhost:8080`          | Used to build password-reset links               |
| `API_PUBLIC_URL`              | empty                            | Public API origin for absolute media URLs in SSR |
| `APP_VERSION`                 | `1.0.0`                          | Shown in the OpenAPI schema                      |

### Database

| Variable          | Default      | Purpose                                 |
| ----------------- | ------------ | --------------------------------------- |
| `DB_ENGINE`       | `sqlite`     | `postgres` or `sqlite`                  |
| `DB_NAME`         | `tie`        | PostgreSQL database                     |
| `DB_USER`         | `tie`        | PostgreSQL user                         |
| `DB_PASSWORD`     | empty        | PostgreSQL password                     |
| `DB_HOST`         | `127.0.0.1`  | PostgreSQL host                         |
| `DB_PORT`         | `5432`       | PostgreSQL port                         |
| `DB_CONN_MAX_AGE` | `60`         | Persistent connection lifetime          |
| `SQLITE_NAME`     | `db.sqlite3` | SQLite filename when `DB_ENGINE=sqlite` |

### Sessions, CORS and security

| Variable                         | Default           | Purpose                                                       |
| -------------------------------- | ----------------- | ------------------------------------------------------------- |
| `CORS_ALLOWED_ORIGINS`           | localhost origins | Only required when frontend and API use different origins     |
| `SESSION_COOKIE_SECURE`          | `false`           | Set `true` behind HTTPS                                       |
| `CSRF_COOKIE_SECURE`             | `false`           | Set `true` behind HTTPS                                       |
| `SESSION_COOKIE_SAMESITE`        | `Lax`             | Use `None` only for intentional cross-site cookies over HTTPS |
| `SECURE_SSL_REDIRECT`            | `false`           | Set `true` when TLS terminates in front of Django             |
| `SECURE_HSTS_SECONDS`            | `0`               | Enable after verifying HTTPS, e.g. `31536000`                 |
| `SECURE_HSTS_INCLUDE_SUBDOMAINS` | `false`           | HSTS subdomain policy                                         |
| `SECURE_HSTS_PRELOAD`            | `false`           | HSTS preload policy                                           |

### Email (password reset)

| Variable              | Default                    | Purpose                                          |
| --------------------- | -------------------------- | ------------------------------------------------ |
| `EMAIL_BACKEND`       | console backend            | Development prints reset links to the server log |
| `EMAIL_HOST`          | empty                      | SMTP host                                        |
| `EMAIL_PORT`          | `587`                      | SMTP port                                        |
| `EMAIL_HOST_USER`     | empty                      | SMTP username                                    |
| `EMAIL_HOST_PASSWORD` | empty                      | SMTP password                                    |
| `EMAIL_USE_TLS`       | `true`                     | STARTTLS                                         |
| `DEFAULT_FROM_EMAIL`  | `TIE <no-reply@tie.or.tz>` | From address                                     |

For production set, for example:

```dotenv
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.provider.example
EMAIL_HOST_USER=...
EMAIL_HOST_PASSWORD=...
```

### Limits and throttling

| Variable                           | Default                 | Purpose                                  |
| ---------------------------------- | ----------------------- | ---------------------------------------- |
| `MAX_INNOVATION_IMAGE_BYTES`       | `5242880`               | 5 MB innovation cover limit              |
| `MAX_INNOVATION_MEDIA_IMAGES`      | `4`                     | Maximum gallery images per innovation    |
| `MAX_INNOVATION_MEDIA_VIDEOS`      | `2`                     | Maximum videos per innovation            |
| `MAX_INNOVATION_MEDIA_IMAGE_BYTES` | `10485760`              | 10 MB per gallery image                  |
| `MAX_INNOVATION_VIDEO_BYTES`       | `52428800`              | 50 MB per video                          |
| `MAX_VIDEO_POSTER_BYTES`           | `4194304`               | 4 MB per video poster                    |
| `PRIVATE_MEDIA_ROOT`               | `backend/private_media` | Private gallery/video storage root       |
| `MAX_AVATAR_BYTES`                 | `2097152`               | 2 MB profile photo limit                 |
| `THROTTLE_ANON`                    | `120/min`               | Anonymous API rate limit                 |
| `THROTTLE_USER`                    | `600/min`               | Signed-in API rate limit                 |
| `THROTTLE_AUTH`                    | `15/min`                | Login/register/password-reset rate limit |
| `THROTTLE_ENABLED`                 | `1`                     | Set `0` to disable (tests only)          |

> Django's default throttle cache is per-process memory. For multiple Gunicorn workers or multiple servers, configure a shared cache such as Redis so limits are global.

---

## 4. Running tests

### Backend

The backend tests use `config.settings_test` and a real database. With PostgreSQL configured in `.env`, pytest creates and destroys a separate `test_*` database.

```bash
cd backend
source .venv/bin/activate
pytest
```

Expected: **73 passed**.

To run against SQLite instead:

```bash
DB_ENGINE=sqlite pytest
```

### Frontend

```bash
# from repository root
bun run test          # Vitest
bun run lint          # ESLint, must exit 0 (warnings are existing Fast Refresh warnings)
npx tsc --noEmit      # Type checking
bun run build         # production build
```

### Browser end-to-end checks

The QA run used Playwright with the system Chromium. See `docs/testing_report.md` for the scenarios and results. To repeat them manually, start both servers and walk through registration → innovation creation → collaboration → moderation.

---

## 5. Production deployment

### 5.1 Recommended topology

Run the frontend and API on the **same public origin** and reverse-proxy the API/media paths. This keeps the session cookie, CSRF token and images simple and secure.

```text
Internet
   |
   v
 Nginx / Caddy (TLS)
   |-- /              -> TanStack Start Node server (SSR) on 127.0.0.1:3000
   |-- /api/*         -> Gunicorn/Django on 127.0.0.1:8000
   |-- /media/*       -> media directory (or object storage/CDN)
   |-- /static/*      -> Django static/WhiteNoise
   |-- /images/*      -> frontend build/public assets
```

### 5.2 Backend

1. Create a dedicated system user, database and environment file outside the repository.
2. Set `DJANGO_DEBUG=false`, a strong `DJANGO_SECRET_KEY`, public host/origin values and `DB_ENGINE=postgres`.
3. Run:
   ```bash
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py seed_catalog
   python manage.py collectstatic --noinput
   python manage.py createsuperuser
   ```
4. Run Gunicorn:
   ```bash
   gunicorn config.wsgi:application \
     --bind 127.0.0.1:8000 \
     --workers 3 \
     --timeout 60 \
     --access-logfile - \
     --error-logfile -
   ```
   A systemd service should load `backend/.env` before starting Gunicorn (or export the variables in the unit file with `EnvironmentFile=`).
5. Ensure `backend/media` is on persistent storage and backed up. For multi-server deployments, place media on S3-compatible object storage or a shared volume.
6. WhiteNoise serves Django static files (admin styles). `collectstatic` is required.

### 5.3 Frontend

Build the SSR application. The Lovable default build targets Cloudflare; for a self-hosted Node server build with the Nitro Node preset:

```bash
bun install --frozen-lockfile
VITE_API_URL=/api/v1 NITRO_PRESET=node-server bun run build
node .output/server/index.mjs        # listens on PORT, default 3000
```

Set `API_INTERNAL_URL=http://127.0.0.1:8000/api/v1` for server-side loaders and `VITE_API_URL=/api/v1` for browser calls. Both are read by `src/lib/api.ts`.

For a Lovable/Cloudflare frontend deployment, route `/api` and `/media` from the same public domain to Django (Cloudflare proxy/Worker, load balancer or Nginx). Do **not** put the API on a different site cookie domain unless you deliberately implement a cross-site session policy: browsers may block third-party cookies, and the SPA cannot read the API's CSRF cookie across origins. Same-origin is the supported production topology.

### 5.4 Nginx example

```nginx
server {
    listen 443 ssl http2;
    server_name tie.example;

    ssl_certificate     /etc/letsencrypt/live/tie.example/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tie.example/privkey.pem;

    client_max_body_size 160m;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /media/ {
        alias /srv/tie/backend/media/;
        expires 7d;
    }

    location /static/ {
        alias /srv/tie/backend/staticfiles/;
        expires 30d;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

With this setup:

```dotenv
DJANGO_ALLOWED_HOSTS=tie.example
DJANGO_CSRF_TRUSTED_ORIGINS=https://tie.example
CORS_ALLOWED_ORIGINS=https://tie.example
API_PUBLIC_URL=https://tie.example
SESSION_COOKIE_SECURE=true
CSRF_COOKIE_SECURE=true
SECURE_SSL_REDIRECT=true
SECURE_HSTS_SECONDS=31536000
```

Django must receive `X-Forwarded-Proto` (already configured via `SECURE_PROXY_SSL_HEADER`).

### 5.5 Object storage for uploads

Local `FileSystemStorage` is the default. Public cover images/avatars use `MEDIA_ROOT`; innovation gallery images and videos use `PRIVATE_MEDIA_ROOT` and are streamed by the permission-checked API (`/api/v1/media/...`). For production scale, add a private S3-compatible storage backend for `PRIVATE_MEDIA_ROOT` and keep the public/private split. Serve public media from the same origin or a CDN, and keep the image/video size/type validation enabled.

The upload form sends each media selection in the innovation create/update request. Increase the reverse-proxy request-body limit to cover four images plus two videos (the default maximum is roughly 140 MB plus form overhead), or switch to direct-to-object-storage uploads for a smaller application-server footprint.

---

## 6. Operational tasks

### Create an administrator

```bash
cd backend
python manage.py createsuperuser
```

The same account can sign in at `/admin/` and `/moderation`.

### Backups

- Daily `pg_dump --format=custom tie > /backups/tie-$(date +%F).dump`
- Back up uploaded public media (`backend/media/uploads`, `backend/media/avatars`, `backend/media/innovations`) and private innovation media (`backend/private_media`) or the equivalent object-storage buckets.
- Retain at least 30 daily backups and test restores quarterly.
- The database and both media roots must be restored together for images to match records.
- Innovation gallery images and videos are streamed by the API, not served directly from `/media`. Keep `PRIVATE_MEDIA_ROOT` outside any web server document root.

### Logs and monitoring

- Django logs to stdout by default; use journald or your process supervisor.
- Monitor `/api/v1/health/` (it checks the database) and Gunicorn request latency/error rates.
- Set alerts for HTTP 5xx, database connection failures, disk usage and failed SMTP deliveries.
- Configure a shared cache (Redis) if running more than one API worker and relying on throttling.

### Upgrades

1. Back up the database and media.
2. Deploy code.
3. Run `python manage.py migrate` and `python manage.py collectstatic --noinput`.
4. Restart Gunicorn and the frontend server.
5. Run the automated test suite before deployment in a staging environment.

### Security checklist

- HTTPS everywhere; secure and HttpOnly session cookie.
- `DJANGO_DEBUG=false`; unique secret key; no secrets in Git.
- Restrict `/admin/` to staff and consider IP allow-listing.
- Keep dependencies patched (`pip list --outdated`, `bun outdated`).
- Store media outside the code checkout and scan uploads if accepting public content. Innovation gallery/video files live under `PRIVATE_MEDIA_ROOT`; never alias that directory publicly.
- Configure SMTP with SPF/DKIM/DMARC for reliable password-reset delivery.
- Add a shared cache before scaling to multiple API processes.

# TIE – Tanzania Innovation Ecosystem

A full-stack platform for discovering Tanzanian innovations, connecting innovators and institutions, finding opportunities, collaborating and moderating community content.

- **Frontend:** TanStack Start + React 19 + TypeScript + Tailwind, in `src/`
- **Backend:** Django 5.2 + Django REST Framework + PostgreSQL, in `backend/`
- **Design:** preserved from the original TIE UI (navy/gold palette, Tanzanian flag accents, bilingual interface, responsive government-style layout)

## Features

- Secure registration, login, logout, password reset and session handling
- Public innovator profiles with skills, interests, links, followers and published projects
- Innovation publishing, drafts, editing, archiving, images, team members and search
- Likes, bookmarks, comments, follows and notifications stored in the database
- Collaboration requests with accept/decline/withdraw workflow
- Opportunity directory, saves, applications and staff review
- Member dashboard: innovations, profile, saved items, requests, applications, notifications
- Staff moderation workspace: reports, content visibility, opportunity/institution management
- Django admin for full data operations
- Automated backend and frontend tests + documented browser E2E QA

## Quick start

```bash
# 1. Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # configure DB + secret
python manage.py migrate
python manage.py seed_catalog
python manage.py createsuperuser
python manage.py runserver 127.0.0.1:8000

# 2. Frontend (new terminal, repository root)
bun install --frozen-lockfile
bun run dev --host 127.0.0.1 --port 8080
```

Open http://localhost:8080. The development server proxies `/api` and `/media` to Django.

## Documentation

| Document                                                     | Audience                                        |
| ------------------------------------------------------------ | ----------------------------------------------- |
| [General project report](docs/general_project_report.md)     | Stakeholders, clients and non-technical readers |
| [Technical project report](docs/technical_project_report.md) | Developers, administrators and maintainers      |
| [API documentation](docs/api_documentation.md)               | Frontend/backend developers and integrators     |
| [Testing report](docs/testing_report.md)                     | QA, technical leads and project managers        |
| [Setup and deployment](docs/setup_and_deployment.md)         | Operators and deployment engineers              |
| [Implementation plan](docs/implementation_plan.md)           | Decision record and frontend-to-backend mapping |

## Quality checks

```bash
cd backend && pytest                 # 60 tests
cd .. && bun run test                # 22 tests
bunx tsc --noEmit
bun run lint
bun run build
```

## Repository layout

```
backend/           Django API, tests, migrations, seed command
docs/              Reports and operating documentation
public/images/     Self-hosted TIE logo and Tanzania photography
src/               TanStack Start frontend
  components/      Site and dashboard components
  data/            Category/region constants and photo credits
  lib/             API client, auth, query hooks, i18n, preferences
  routes/          Public pages, auth, dashboard, moderation
```

## Notes

- `backend/.env` is ignored by Git. Never commit credentials.
- The original catalogue is imported with `python manage.py seed_catalog`; it can be run repeatedly without duplicates.
- Email password reset uses Django's console backend in development. Configure SMTP for production.
- The Django admin is available at `/admin/`; the in-app staff workspace is at `/moderation`.

---

This project continues to be connected to [Lovable](https://lovable.dev). Pushing to `main` syncs changes to the Lovable editor; avoid rewriting published git history.

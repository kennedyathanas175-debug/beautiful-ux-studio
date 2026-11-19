# Implementation Plan – Frontend to Backend Mapping

This internal plan records how each existing frontend capability was mapped to backend data, APIs and business logic before implementation. It is retained as a decision record.

## 1. Inspection summary

- Frontend: TanStack Start (React 19) with file-based routes.
- Data: all catalogue content in `src/data/catalog.ts`; likes/saves/follows in `localStorage` (`src/lib/prefs.tsx`).
- Authentication: `/auth` page was a “coming soon” placeholder with email notification link.
- No backend, API, database, dashboard or moderation screens existed.
- Interactive elements with no real operation: like, save, follow, opportunity save, collaboration button, auth, newsletter-style “Notify me”.
- Existing routes: `/`, `/explore`, `/innovations/$slug`, `/innovators`, `/innovators/$slug`, `/institutions`, `/opportunities`, `/about`, `/auth`.

## 2. Mapping

| Existing UI capability               | Data required                                                                     | Backend model(s)                                     | API                                                                       | Business rules                                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Home hero, stats, featured, trending | Live counts, featured innovations, upcoming opportunities, profiles, institutions | Innovation, Opportunity, User, Institution, Category | `GET /home/`, `/stats/`                                                   | Public published content only; real counts                                                        |
| Explore search/list                  | Innovations + filters + pagination                                                | Innovation, Category, Institution, User              | `GET /innovations/`                                                       | Search text, category/stage/institution/region, sort, page                                        |
| Innovation detail                    | Full innovation, creator, team, institution, viewer                               | Innovation, User, Institution                        | `GET /innovations/{slug}/`, related query                                 | Published unless owner/staff; view count                                                          |
| Like/save on cards and detail        | Persisted per-user state                                                          | InnovationLike, InnovationBookmark                   | `POST /innovations/{slug}/like/`, `/bookmark/`, `GET /me/bookmarks/`      | Auth required; toggle; unique                                                                     |
| Innovator directory/profile          | Public profiles, skills, interests, projects, followers                           | User, Follow, Innovation                             | `GET /auth/innovators/`, `/auth/users/{slug}/`, follow endpoint           | Public profiles only; email private; unfollow/self-follow rules                                   |
| Institution directory                | Institutions with focus/counts                                                    | Institution, Category                                | `GET /institutions/`                                                      | Active only; search/type/verified                                                                 |
| Opportunity listing/dialog           | Opportunities, saves, applications                                                | Opportunity, Bookmark, Application                   | `GET /opportunities/`, bookmark/apply endpoints                           | Open only by deadline/status; one application                                                     |
| Collaboration buttons                | Requests and responses                                                            | CollaborationRequest, Notification                   | `/collaboration-requests/`                                                | Auth, no self, duplicate pending prevention, recipient-only response                              |
| Comments prompt/count                | Real discussion                                                                   | Comment, Notification                                | `/innovations/{slug}/comments/`                                           | Auth write; author/staff delete; reported comments can be hidden                                  |
| Auth page                            | Accounts/session                                                                  | User                                                 | `/auth/register/`, `/login/`, `/logout/`, `/me/`                          | Password validation, email login, session/CSRF, roles                                             |
| Password reset link                  | Reset flow                                                                        | User + Django token                                  | `/auth/password-reset/`, confirm endpoint                                 | Neutral response; token expiry                                                                    |
| Dashboard (new)                      | Owner's data                                                                      | User, Innovation, etc.                               | `GET /auth/dashboard/` + CRUD                                             | Auth; owner-only data                                                                             |
| Innovation create/edit (new)         | Innovation form                                                                   | Innovation, User, Institution, Category              | `POST/PATCH/DELETE /innovations/`                                         | Draft/published; team emails; image limits                                                        |
| Innovation media (new)               | Gallery/video section in innovation form                                          | InnovationMedia + private storage                    | Media fields on innovation write; `GET /media/{id}/file/` & `/thumbnail/` | Owner/staff only; type/size/count validation; draft privacy; thumbnail/poster generation; cleanup |
| Profile edit (new)                   | Profile form                                                                      | User, Category, Institution                          | `PATCH /auth/me/`                                                         | Auth; validation; avatar size                                                                     |
| Notifications (new)                  | Activity feed                                                                     | Notification                                         | `/auth/notifications/` + read endpoints                                   | Own notifications only                                                                            |
| Reports/moderation (new)             | Abuse reports and actions                                                         | Report, Innovation, Comment                          | `/reports/`, moderation endpoint                                          | Exactly one target; staff-only resolution                                                         |
| Admin management (new)               | Opportunity/institution CRUD                                                      | Opportunity, Institution                             | Staff endpoints                                                           | Staff-only; soft archive/deactivate                                                               |
| Applications management (new)        | Applications and decisions                                                        | OpportunityApplication                               | staff list/review endpoints                                               | Staff-only; status notifications                                                                  |

## 3. Key design decisions

1. **Session authentication** rather than JWT/localStorage, because the SPA and API are same-origin behind one proxy and it gives HttpOnly session cookies plus Django CSRF protection.
2. **Preserve original content as seed** rather than inventing new demo data. Existing engagement baselines are stored separately (`legacy_likes`, `base_followers`, initial views).
3. **Immediate publishing** with staff moderation, matching the existing open ecosystem design. `AUTO_PUBLISH_INNOVATIONS=false` can switch to draft/pending workflows.
4. **camelCase read APIs** to avoid rewriting the existing UI, with explicit snake_case write fields in staff/profile forms where clearer.
5. **No new frontend state library**: React Query + React state + React Router are sufficient; no Redux/MobX.
6. **No external services** invented. Email is the only optional external service; media storage is local by default.
7. **Dashboard/admin UI** follows existing visual language and reuses primitive components rather than introducing a new design system.
8. **Documentation as deliverable**: API, testing, setup, general and technical reports under `docs/`.

## 4. Delivery sequence used

1. Repository inspection, route and data inventory.
2. Django project, custom user, models, migrations.
3. DRF serializers, permissions, views, auth, error handling, tests.
4. Seed catalogue and images.
5. Frontend API client, auth provider, query hooks.
6. Convert public pages to live data with loading/error states.
7. Add dashboard, innovation editor, profile editor, saved/requests/applications/notifications.
8. Add moderation and admin forms.
9. Run backend/frontend tests, typecheck, lint, build.
10. Browser E2E: register, publish, engage, collaborate, apply, moderate, mobile.
11. Fix defects and retest.
12. Clean QA data, final evaluation, documentation.

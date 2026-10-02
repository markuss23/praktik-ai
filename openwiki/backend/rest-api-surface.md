---
type: architecture-map
title: Backend REST API Surface
description: How the FastAPI application under /api/v1 composes per-domain routers, splits public from authenticated traffic, structures controllers/schemas, and exposes an OpenAPI spec consumed by the generated frontend client.
tags: [backend, fastapi, rest-api, routing, authentication, rbac, openapi, courses, modules, publicDB]
verified:
  - by: openwiki/0.6.1
    at: 2026-09-30T09:28:35.455Z
sources:
  - id: openwiki-source-b080334d87f0e07d3f4773f1
    resource: repo://backend/api/authorization.py
  - id: openwiki-source-07b76eb6cb824e8c4d7f1e69
    resource: repo://backend/api/dependencies.py
  - id: openwiki-source-2abfe090d711490350c8283b
    resource: repo://backend/api/main.py
  - id: openwiki-source-a16569f4f75eede1f0917c94
    resource: repo://backend/api/src/common/utils.py
  - id: openwiki-source-dc2fe3908f08e99b0d280ac6
    resource: repo://backend/api/src/courses/controllers/__init__.py
  - id: openwiki-source-afbfdb56f7875f7fcd486af8
    resource: repo://backend/api/src/courses/routers.py
  - id: openwiki-source-fb26a463d13170c640ea45ed
    resource: repo://backend/api/src/editor_images/routers.py
  - id: openwiki-source-d7c48a304b3bd577d5e33b45
    resource: repo://backend/api/src/modules/routers.py
  - id: openwiki-source-93dc8b0692499c2638a6df8c
    resource: repo://backend/api/src/publicDB/collections/routers.py
  - id: openwiki-source-a50dacdb0ad2c34e1bcbf329
    resource: repo://backend/api/src/publicDB/resources/controllers/__init__.py
  - id: openwiki-source-b7f3ce867e477f2e4766c971
    resource: repo://backend/api/src/publicDB/resources/routers.py
  - id: openwiki-source-2b188e8b8d2f27113dfdef0f
    resource: repo://backend/api/src/routers.py
  - id: openwiki-source-1047363cf615000e4c9bb694
    resource: repo://frontend/package.json
  - id: openwiki-source-14578b6d041e53c45305c372
    resource: repo://openapitools.json
generated: { by: "openwiki/0.6.1", at: "2026-09-30T09:28:35.455Z" }
---

## Overview

The backend exposes a single FastAPI application (`backend/api/main.py`) that mounts one aggregate router, `api.src.routers.router`, under the prefix `/api/v1`. That aggregate router in turn `include_router`s one router per business domain: `courses`, `modules`, `activities`, `agents`, `auth`, `users`, `enrollments`, `feedbacks`, `catalogs`, `superadmin`, `module_tickets`, `editor_images`, and the `publicDB` sub-package (`resources`, `reviews`, `rating`, `collections`). Every domain follows the same three-layer convention — `routers.py` (HTTP surface) → `controllers.py` or a `controllers/` package (business logic) → `schemas.py` (Pydantic request/response models) — which keeps endpoint declarations thin and testable business logic separate from FastAPI wiring.

```mermaid
flowchart TB
    APP["FastAPI app (main.py)<br/>docs_url='/'"] -->|mounts at /api/v1| AGG["api.src.routers.router"]
    AGG -->|no auth dependency| AUTH["auth router"]
    AGG -->|no auth dependency| CPUB["courses_public_router"]
    AGG -->|no auth dependency| CAT["catalogs router"]
    AGG -->|no auth dependency| RESPUB["resources_public_router"]
    AGG -->|no auth dependency| EIPUB["editor_images_public_router"]
    AGG -->|no auth dependency| COLLPUB["collections_public_router"]
    AGG -->|Depends(auth.get_current_user)| REST["courses, modules, activities,\nagents, users, enrollments,\nfeedbacks, superadmin,\nmodule_tickets, editor_images,\nresources, reviews, rating,\ncollections routers"]
    REST -->|require_role(min_role)| CTRL["controllers.py / controllers/*.py"]
    CPUB --> CTRL
    CTRL -->|validate_ownership /\nvalidate_owner_or_superadmin| AUTHZ["api.authorization"]
    CTRL --> UTILS["api.src.common.utils\n(get_or_404, assert_course_editable,\ncheck_enrollment, attachment_response)"]
    CTRL --> SCHEMAS["schemas.py (Pydantic)"]
```

## Application entrypoint and OpenAPI docs

`backend/api/main.py` constructs the `FastAPI` app with `docs_url="/"`, so the interactive Swagger UI is served at the API's root URL instead of the conventional `/docs`. The generated OpenAPI JSON is therefore reachable at the default `/openapi.json`. All domain routers are collected into `api.src.routers.router` and mounted once, with `app.include_router(api_router, prefix="/api/v1")`, so every endpoint path in the codebase (as declared on a domain router, e.g. `/courses`, `/modules/{module_id}`) is actually served under `/api/v1/...` in production.

The frontend's typed API client (`frontend/src/api/`) is **code-generated** from this OpenAPI spec via `openapi-generator-cli` (`typescript-fetch` generator), driven by the `generate:openapi` script in `frontend/package.json`, which fetches `http://localhost:8000/openapi.json`. Consequently, `operation_id` values set on each route decorator become the generated method names, and the domain `tags` (e.g. `"Courses"`, `"Resources"`, `"Superadmin"`) determine which generated `*Api.ts` class (`CoursesApi`, `ResourcesApi`, `SuperadminApi`, ...) a given endpoint lands in. Changing an `operation_id`, a response model, or a route's path/tag therefore has a direct, mechanical effect on the frontend client surface; see [App Structure](../frontend/app-structure.md) for how the frontend consumes it.

## Public vs authenticated router split

`api/src/routers.py` is the single place that decides whether a domain's endpoints require authentication. It builds one `APIRouter()` (`router`) and includes each domain router either bare (no auth) or wrapped with `dependencies=[Depends(auth.get_current_user)]` (auth required for every route in that router, enforced before any route body runs):

- **Included without authentication:** `auth_router` (login/token issuance itself must be reachable pre-auth), `courses_public_router`, `catalogs_router`, `resources_public_router`, `editor_images_public_router`, `collections_public_router`.
- **Included with `Depends(auth.get_current_user)`:** `courses_router`, `modules_router`, `activities_router`, `agents_router`, `users_router`, `enrollments_router`, `feedbacks_router`, `superadmin_router`, `module_tickets_router`, `editor_images_router`, `resources_router`, `review_router`, `rating_router`, `collections_router`.

Several domains (`courses`, `editor_images`, and the `publicDB` domains `resources` and `collections`) therefore define **two APIRouter instances** in the same `routers.py` — a `router` (authenticated) and a `public_router` (anonymous) — sharing the same URL prefix and tag, with individual endpoints assigned to whichever router matches their access requirement. For example `courses/routers.py` puts `GET /courses`, `GET /courses/{course_id}` and the `/recommended` listing on `public_router`, while mutating endpoints (`create_course`, `update_course`, `delete_course`, file/link management) stay on the authenticated `router`. `editor_images` puts image upload behind auth but serves `GET /editor-images/{filename}` publicly, since rendered rich-text content embeds `<img src=...>` tags without auth headers. `publicDB.collections` exposes `GET /collections/public` publicly (browsing the public library) while keeping personal collection management authenticated. This mirrors the [Public Resource Library](../concepts/public-resource-library.md) model where browsing/discovery is open but authorship/curation is not.

Because `courses_public_router` is included in `routers.py` *before* the authenticated `courses_router`, and FastAPI matches routes in registration order, `/courses/recommended` (a static path segment) must be registered ahead of `/courses/{course_id}` (a dynamic segment) to avoid FastAPI trying to parse `"recommended"` as an integer course ID and returning a 422. The `/recommended` endpoint is on the public router only for ordering purposes — it still requires a logged-in user via a `require_role("user")` route dependency, illustrating that "public router" only means "not blanket-protected at the router-include level", not "unauthenticated".

Public inclusion at the router level does not preclude finer-grained authorization inside individual endpoints. See [Auth and RBAC](../architecture/auth-and-rbac.md) for the identity/role-sync mechanism behind `auth.get_current_user`.

## Role checks: `require_role` and ownership validators

Within a router or on individual endpoints, `api.dependencies.require_role(min_role)` is used pervasively as a FastAPI dependency (`dependencies=[require_role("lector")]` etc.) to enforce a minimum role from the hierarchy `user < lector < guarantor < superadmin` (`ROLE_HIERARCHY`). It wraps `auth.get_current_user`, so any router already under blanket auth still layers `require_role` per-route or per-router (e.g. `superadmin_router` sets `dependencies=[require_role("superadmin")]` at the `APIRouter` level; `users_router` similarly requires `superadmin` for every route; `activities_router` requires `lector`). Many routers instead attach `require_role` per-endpoint so that, e.g., listing a resource is open to any authenticated `user` while creating/deleting it needs `lector` or `guarantor`.

`require_role` only checks a coarse minimum role and cannot express "must own this specific course/resource". For that, controllers call into `api/authorization.py`:

- `validate_ownership(resource, user, resource_name, allow_elevated=True)` — 403s unless the caller owns the resource, or (when `allow_elevated=True`, the default) the caller is `guarantor` or `superadmin`.
- `validate_owner_or_superadmin(resource, user, resource_name)` — stricter variant used where guarantors should **not** bypass ownership (e.g. in `agents/routers.py`), leaving only the actual owner or a `superadmin`.
- `validate_superadmin(user, resource_name)` — restricts to `superadmin` only, independent of any resource.

All three first 404 via `_check_resource_exists` if the resource is falsy, then compare `resource.get_owner_id()` (an `OwnedResource` protocol) against `user.user_id`. This two-layer model — router-level `require_role` for coarse "is this feature available to this role at all" gating, plus in-controller ownership validators for "does this specific user own this specific row" — is the standard authorization pattern across the API; see [Auth and RBAC](../architecture/auth-and-rbac.md) for the full role model.

## Shared controller helpers (`api.src.common.utils`)

`api/src/common/utils.py` centralizes four helpers that most controllers across domains depend on, avoiding repeated boilerplate for 404s, editability, enrollment gating, and file downloads:

- **`get_or_404(db, model, pk_value, *, detail=None, check_active=True)`** — generic lookup by primary key (reflected via SQLAlchemy `inspect(model).mapper.primary_key`) that raises `HTTPException(404)` with a model-name-derived default message when no row is found. By default it also filters `is_active.is_(True)` when the model has that column, so soft-deleted rows are treated as not-found. Used throughout `courses`, `modules`, `enrollments`, `publicDB.resources`, etc. to fetch a course/module/resource by ID before acting on it.
- **`assert_course_editable(course)`** — raises `HTTPException(400)` unless `course.status` is one of `draft`, `generated`, or `edited` (from `api.enums.Status`); used to block edits to courses that have progressed past the editable lifecycle stage (see [Learning Model](../concepts/learning-model.md) for course status semantics).
- **`check_enrollment(db, user, course, *, bypass_for_owner=False)`** — raises `HTTPException(403)` if the user has no active `Enrollment` row (`is_active=True`, `left_at IS NULL`) for the course. When `bypass_for_owner=True`, the course owner and any `superadmin` skip the check entirely. Used to gate module/activity access behind actual enrollment rather than just role.
- **`attachment_response(content, filename)`** — builds a `fastapi.responses.Response` for file downloads (course files, resource files) with a `Content-Disposition: attachment` header carrying both an ASCII-transliterated fallback filename and an RFC 5987 `filename*=UTF-8''...` encoded original name, plus `Access-Control-Expose-Headers: Content-Disposition` so browsers can read the filename cross-origin. This avoids `UnicodeEncodeError`/500s that would occur if raw diacritics were placed straight into a latin-1-encoded header.

## Router-per-domain layout convention

Every domain under `api/src/*` (plus `api/src/publicDB/*`) follows `routers.py` → controller layer → `schemas.py`, but the controller layer takes one of two shapes depending on how many distinct operations the domain exposes:

- **Single-file controllers** — a flat `controllers.py` module exporting one function per endpoint, imported directly by `routers.py`. Used by simpler/smaller domains: `modules` (`controllers.py`), `enrollments` (`controllers.py`), `activities`, `catalogs`, `users`, `superadmin`, `feedbacks`, `module_tickets`, `editor_images`, `agents` (via `practice_controllers.py`/`progress.py` alongside `routers.py`).
- **Package-style controllers split by operation** — a `controllers/` package with one module per CRUD-ish concern, re-exported through `controllers/__init__.py` so `routers.py` can still do a single flat import. Used by the two largest/most complex domains:
  - `courses/controllers/{create,read,update,delete,recommended}.py` — course CRUD plus course-file/course-link management and the recommendation algorithm, aggregated in `courses/controllers/__init__.py`.
  - `publicDB/resources/controllers/{create,read,update,delete,comment}.py` — public-library resource CRUD, forking, status/visibility transitions, and comment threads, aggregated in `publicDB/resources/controllers/__init__.py`.

This split-by-operation convention is the pattern to follow when adding a new domain (or growing an existing single-file one) whose controller file would otherwise become unwieldy; it keeps create/read/update/delete concerns independently reviewable while `routers.py` still imports everything through one `__init__.py` re-export surface.

## Where to add a new endpoint

1. **Schema** — add/extend Pydantic models in the domain's `schemas.py` (request body, response model).
2. **Controller** — add the business-logic function either to the domain's `controllers.py`, or to the appropriate `controllers/<operation>.py` file (and re-export it from `controllers/__init__.py`) if the domain uses the package-style split. Controllers should reuse `get_or_404`, `assert_course_editable`, `check_enrollment`, and `api.authorization.validate_*` rather than reimplementing lookup/authorization logic.
3. **Router** — declare the FastAPI route in the domain's `routers.py`, choosing:
   - which `APIRouter` it belongs to if the domain has both a `router` and a `public_router` (auth vs. anonymous access);
   - a `require_role(...)` dependency (per-route or inherited from the `APIRouter`'s own `dependencies=[...]`) for the minimum role gate;
   - a stable, descriptive `operation_id` (this becomes the generated frontend client method name) and an accurate `tags=[...]` (this becomes the generated `*Api.ts` class).
4. **Aggregate router** — if introducing a *new domain* (rather than a new endpoint on an existing one), add its `router`/`public_router` import and `include_router(...)` call to `api/src/routers.py`, deciding there whether it needs the `Depends(auth.get_current_user)` wrapper.
5. Regenerate the frontend client (`npm run generate:openapi` in `frontend/`) so the new endpoint becomes available as a typed method; see [App Structure](../frontend/app-structure.md).

---
type: entry-point
title: Quickstart
description: Orientation page for Praktik-AI, an AI-assisted course platform for academic staff, covering local run steps and links into every architecture, concepts, workflow, integration, backend/frontend, and operations page.
tags: [quickstart, overview, onboarding, praktik-ai]
verified:
  - by: openwiki/0.6.1
    at: 2026-09-30T09:28:35.455Z
sources:
  - id: openwiki-source-715dace563ef484b6e8bd1e2
    resource: repo://.dockerignore
  - id: openwiki-source-5cdd8cd6e08e78b47931075a
    resource: repo://.env_example
  - id: openwiki-source-790a83fe9b09ef3d22534860
    resource: repo://backend/.gitignore
  - id: openwiki-source-afbfdb56f7875f7fcd486af8
    resource: repo://backend/api/src/courses/routers.py
  - id: openwiki-source-4a3fe9aa239bd6ffcd41be98
    resource: repo://compose.yml
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
generated: { by: "openwiki/0.6.1", at: "2026-09-30T09:28:35.455Z" }
---

## What this is

Praktik-AI is a course platform for systematically developing AI competencies among academic staff at teacher-training faculties. Lectors author and manage courses, guarantors review and approve them, and users enroll and complete them. Every course is made of modules that follow a **Learn → Practice → Assessment** lifecycle: a Learn phase presents study content (`LearnBlock`) with an AI mentor available for questions, a Practice phase offers closed/open practice questions including personalized AI-generated ones, and an Assessment phase is an AI-generated task graded by an AI evaluator with a limited number of attempts and a dispute process for contesting results. A set of LangGraph-based AI agents (course generation, embedding generation, assessment generation/evaluation, practice question generation/evaluation, and a RAG mentor) power content generation and evaluation throughout the platform. See [Course & Module Learning Model](concepts/learning-model.md) for the full domain model.

## Runtime pieces at a glance

- **Frontend** — Next.js 15 / React 19 app serving both the public course-taking area and an admin area, talking to the backend via a generated OpenAPI TypeScript client. See [Frontend Application Structure](frontend/app-structure.md).
- **Backend API** — FastAPI application under `backend/api`, exposing `/api/v1` routers for auth, courses, modules, activities, enrollments, feedbacks, module tickets, users, superadmin, catalogs, agents, editor images, and the public resource library. See [System Overview](architecture/system-overview.md) and [Backend REST API Surface](backend/rest-api-surface.md).
- **AI agents** — LangGraph pipelines under `backend/agents` (`course_generator`, `embedding_generator`, `assessment_generator`, `assessment_evaluator`, `practice_question_generator`, `practice_answer_evaluator`, `mentor`) invoked by the backend, calling Anthropic/OpenAI LLM APIs. See [AI Course Generation Workflow](workflows/course-generation.md), [Assessment & Practice Evaluation Workflows](workflows/assessment-and-practice.md), and [RAG Mentor & Wiki Chat Assistants](workflows/mentor-and-wiki-chat.md).
- **PostgreSQL + pgvector** — primary relational store for courses/modules/activities/users/audit log plus vector embeddings used for RAG retrieval. See [Data Model & Persistence](architecture/data-model.md).
- **Keycloak** — OpenID Connect / OAuth2 identity provider; issues JWTs consumed by the backend, which syncs users/roles into the database on login. See [Authentication & Authorization](architecture/auth-and-rbac.md).
- **SeaweedFS** — object storage (master + volume + filer) for uploaded course files and other binary assets. See [External Service Integrations](integrations/external-services.md).

These pieces are wired together in `compose.yml` (`frontend`, `api`, `db`, `keycloak`, `seaweedfs-master`, `seaweedfs-volume`, `seaweedfs-filer` services on a shared `praktikai` network) and started via the FastAPI app lifespan in `main.py`; see [System Overview](architecture/system-overview.md) for the request/lifespan flow and [Deployment, Configuration & Migrations](operations/deployment-and-configuration.md) for compose healthchecks, environment variable layout, and database bootstrap/migrations.

## Quick local run

```bash
cp .env_example .env
# fill in at least OPENAI_API_KEY, POSTGRES__*, KEYCLOAK__*, KC_BOOTSTRAP_ADMIN_*, SEAWEEDFS__*
docker compose up -d
```

Exposed ports once the stack is up:

| Service | URL |
| --- | --- |
| Backend API | http://localhost:8000 (Swagger docs at `/docs`) |
| Frontend | http://localhost:3000 |
| Keycloak | http://localhost:8080 |
| SeaweedFS filer | http://localhost:8888 (master `:9333`, volume `:8081`) |
| PostgreSQL | mapped to host `5433` (container port `5432`) |

After the stack is running, the frontend's generated API client can be regenerated with `npm run generate:openapi` from `frontend/` if backend schemas changed.

## Two things every agent should know before touching code

1. **Czech is the intentional language of internal text.** Source code comments, docstrings, and user-facing API error messages throughout the backend (and in places in the frontend) are written in Czech — this reflects the target audience (Czech academic staff) and is not a translation bug to "fix". Keep new comments/errors in the same language as the surrounding code unless asked otherwise.
2. **There is no project-owned automated test suite.** The only `tests/` directories present belong to vendored third-party packages under `backend/.venv` and `frontend/node_modules`; there is no first-party unit/integration test suite to run. Verify changes by reading the actual code paths involved (routers → controllers → models/agents) and by exercising manual or API smoke checks (e.g. via `/docs` Swagger UI or `curl` against `http://localhost:8000/api/v1/...`) rather than expecting `pytest`/`npm test` to catch regressions.

## Where to go next

**Architecture**
- [System Overview](architecture/system-overview.md) — runtime topology, compose wiring, FastAPI app lifespan
- [Data Model & Persistence](architecture/data-model.md) — SQLAlchemy schema, shared model mixins, audit log
- [Authentication & Authorization](architecture/auth-and-rbac.md) — Keycloak tokens, user/role sync, RBAC + ownership checks

**Concepts**
- [Course & Module Learning Model](concepts/learning-model.md) — courses, modules, Learn/Practice/Assessment lifecycle, enrollment/progress
- [Public Resource Library (publicDB)](concepts/public-resource-library.md) — independent shareable-resource feature with review, ratings, forking

**Workflows**
- [AI Course Generation Workflow](workflows/course-generation.md) — end-to-end AI course generation from trigger to persisted modules
- [Assessment & Practice Evaluation Workflows](workflows/assessment-and-practice.md) — AI assessment generation/evaluation, practice question generation/evaluation, dispute tickets
- [RAG Mentor & Wiki Chat Assistants](workflows/mentor-and-wiki-chat.md) — in-course RAG mentor and the separate admin wiki-chat assistant

**Integrations**
- [External Service Integrations](integrations/external-services.md) — Keycloak, SeaweedFS, Anthropic/OpenAI

**Backend & Frontend**
- [Backend REST API Surface](backend/rest-api-surface.md) — router/controller/schema organization under `/api/v1`
- [Frontend Application Structure](frontend/app-structure.md) — Next.js App Router layout, generated API client, shared hooks

**Operations**
- [Deployment, Configuration & Migrations](operations/deployment-and-configuration.md) — compose services/healthchecks, env var layout, DB bootstrap and ad-hoc SQL migrations

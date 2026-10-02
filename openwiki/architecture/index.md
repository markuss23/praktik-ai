# Files

- [Authentication & Authorization](auth-and-rbac.md) - How Keycloak (OIDC/OAuth2) issues tokens for the frontend, how the FastAPI backend validates them and syncs DB users/roles, and how role-based and ownership-based authorization is enforced across routers and controllers.
- [Data Model & Persistence](data-model.md) - Reference for the SQLAlchemy ORM schema backing courses, modules, learning activities, enrollments, users, and catalog tables, including the soft-delete cascade and audit-log mechanisms shared across the schema.
- [System Overview](system-overview.md) - Explains the Praktik-AI runtime topology — Next.js frontend, FastAPI backend, in-process LangGraph agents, PostgreSQL+pgvector, Keycloak, and SeaweedFS — how compose.yml wires them together, and the FastAPI startup/lifespan and request-handling flow in main.py.

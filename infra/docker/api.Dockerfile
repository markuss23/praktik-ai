FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

COPY api/ /app/



RUN uv sync --frozen --no-cache

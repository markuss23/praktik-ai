
# 1) Export požadavků (uv -> requirements.txt)
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS export-reqs
WORKDIR /tmp
COPY ./backend/pyproject.toml ./backend/uv.lock /tmp/
RUN uv export --frozen --no-dev --no-hashes -o requirements.txt

# 2) Build deps do čistého prefixu (kopírujeme jen hotové knihovny)
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS deps
WORKDIR /tmp
COPY --from=export-reqs /tmp/requirements.txt /tmp/requirements.txt
RUN pip install --no-compile --prefix=/install -r /tmp/requirements.txt

# 3) Development stage
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS dev-stage

WORKDIR /code

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Přenese nainstalované deps
COPY --from=deps /install /usr/local

# Kopíruj zdrojový kód
COPY ./backend/api /code/api
COPY ./backend/agents /code/agents

CMD [ "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" ]


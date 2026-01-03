
# 1) Export požadavků (uv -> requirements.txt)
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS export-reqs
WORKDIR /tmp
COPY ./pyproject.toml ./uv.lock /tmp/
RUN uv sync
RUN uv pip freeze > requirements.txt

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
COPY ./api /code/api
COPY ./agents /code/agents
COPY ./entrypoint.* /code/

CMD [ "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" ]

# 4) Production stage
FROM dev-stage AS prod-stage

CMD [ "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000" ]
# COPY ./alembic.ini /code/
# RUN mkdir /code/alembic/versions

# ENTRYPOINT [ "bash", "/code/entrypoint.sh" ]


# # 5) Test stage
# FROM dev-stage AS test-stage

# COPY ./tests /code/tests

# ENTRYPOINT [ "bash", "/code/entrypoint.test.sh" ]
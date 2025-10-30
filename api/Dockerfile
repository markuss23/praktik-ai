
# 1) Export požadavků (Poetry -> requirements.txt)
# Vezme zamknuté verze z poetry.lock a pevede je na requirements.txt,
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS export-reqs
WORKDIR /tmp
# ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
COPY ./pyproject.toml ./poetry.lock* /tmp/
RUN uv sync
RUN uv pip freeze > requirements.txt

# 2) Build deps do čistého prefixu (kopírujeme jen hotové knihovny)
# Nainstaluje všechny Python závislosti do /install,

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS deps
WORKDIR /tmp
# ENV PIP_NO_CACHE_DIR=1 \
#     PIP_DISABLE_PIP_VERSION_CHECK=1 \
#     PYTHONDONTWRITEBYTECODE=1
COPY --from=export-reqs /tmp/requirements.txt /tmp/requirements.txt
# nainstaluj pouze do /install, bez .pyc
RUN pip install --no-compile --prefix=/install -r /tmp/requirements.txt
# # 3) Development stage

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS dev-stage

WORKDIR /code

# ENV TZ=Europe/Prague \
#     PYTHONDONTWRITEBYTECODE=1 \
#     PYTHONUNBUFFERED=1

# RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Přenese nainstalované deps
COPY --from=deps /install /usr/local

# COPY ./README.md /code/
# COPY ./pyproject.toml /code/
COPY ./app /code/app
COPY ./entrypoint.* /code/

# ENTRYPOINT [ "bash", "/code/entrypoint.local.sh" ]
CMD [ "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" ]

# 4) Production stage

# FROM dev-stage AS prod-stage

# COPY ./alembic/env.py /code/alembic/
# COPY ./alembic/script.py.mako /code/alembic/
# COPY ./alembic.ini /code/
# RUN mkdir /code/alembic/versions

# ENTRYPOINT [ "bash", "/code/entrypoint.sh" ]


# # 5) Test stage
# FROM dev-stage AS test-stage

# COPY ./tests /code/tests

# ENTRYPOINT [ "bash", "/code/entrypoint.test.sh" ]
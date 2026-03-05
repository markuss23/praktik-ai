FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS python-deps
WORKDIR /tmp/build
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv export --frozen --no-dev --no-hashes -o req.txt \
 && pip install --no-compile --quiet --prefix=/install -r req.txt


FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS api-spec
WORKDIR /code
COPY --from=python-deps /install /usr/local
COPY backend/api    ./api
COPY backend/agents ./agents
COPY infra/scripts/generate_openapi.py ./generate_openapi.py
RUN python generate_openapi.py openapi.json


FROM node:24-alpine AS node-deps
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci


FROM node:24-alpine AS client-gen
WORKDIR /app
RUN apk add --no-cache openjdk17-jre-headless
COPY --from=node-deps /app/node_modules ./node_modules
COPY openapitools.json /openapitools.json
COPY --from=api-spec /code/openapi.json ./openapi.json
RUN npx @openapitools/openapi-generator-cli generate \
        -i ./openapi.json \
        -g typescript-fetch \
        -o ./src/api \
        -c /openapitools.json \
        --skip-validate-spec


FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=node-deps /app/node_modules ./node_modules
COPY frontend/ .
COPY --from=client-gen /app/src/api ./src/api
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_KEYCLOAK_URL
ARG NEXT_PUBLIC_KEYCLOAK_REALM
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ARG NEXT_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_KEYCLOAK_URL=${NEXT_PUBLIC_KEYCLOAK_URL} \
    NEXT_PUBLIC_KEYCLOAK_REALM=${NEXT_PUBLIC_KEYCLOAK_REALM} \
    NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=${NEXT_PUBLIC_KEYCLOAK_CLIENT_ID} \
    NEXT_API_URL=${NEXT_API_URL} \
    NODE_ENV=production
RUN npm run build


FROM node:24-alpine AS runner
WORKDIR /app
RUN apk upgrade --no-cache
ENV NODE_ENV=production PORT=3000 HOSTNAME="0.0.0.0"
COPY --from=builder --chown=node:node /app/public ./public
RUN mkdir .next && chown node:node .next
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
ENTRYPOINT ["node"]
CMD ["server.js"]

#!/usr/bin/env python3
"""

!!! AI GENERATED !!!

Generate openapi.json from the FastAPI application without requiring a
running database or a Keycloak instance.  Used during Docker image builds
to produce the spec file that the frontend client-generation step consumes.

How it works
------------
1. Dummy environment variables satisfy pydantic-settings validation before
   any project module is imported.
2. ``api.database.init_db`` is replaced with a no-op lambda BEFORE
   ``api.main`` is imported, so the startup DB-migration call is skipped.
3. ``app.openapi()`` generates the JSON schema from route metadata only —
   no I/O is performed.

Usage
-----
    python generate_openapi.py [output_path]   (default: openapi.json)
"""

import json
import os
import sys

# ---------------------------------------------------------------------------
# 1. Satisfy pydantic-settings BEFORE any project module is imported.
#    Values are intentionally fake — they are only used to pass validation.
# ---------------------------------------------------------------------------
_DUMMY = {
    "POSTGRES__HOST": "build-dummy",
    "POSTGRES__PORT": "5432",
    "POSTGRES__USER": "dummy",
    "POSTGRES__PASSWORD": "dummy",
    "POSTGRES__DB": "dummy",
    "KEYCLOAK__SERVER_URL": "http://build-dummy:8080",
    "KEYCLOAK__REALM_NAME": "dummy",
    "KEYCLOAK__CLIENT_ID": "dummy",
    "KEYCLOAK__CLIENT_SECRET": "dummy",
    # OpenAIEmbeddings is instantiated at module level in the agents package
    # and validates this key during import — a non-empty placeholder is enough.
    "OPENAI_API_KEY": "sk-build-dummy",
}
for _k, _v in _DUMMY.items():
    os.environ.setdefault(_k, _v)

# ---------------------------------------------------------------------------
# 2. Import api.database first so we can patch init_db in-place BEFORE
#    api.main executes `from api.database import init_db` at module level.
#    Python caches the module object in sys.modules, so main.py picks up
#    whichever value api.database.init_db holds at the moment it is imported.
# ---------------------------------------------------------------------------
import api.database as _db_module  # noqa: E402

_db_module.init_db = lambda *_args, **_kwargs: None  # no-op patch

import api.seed as _seed_module  # noqa: E402

_seed_module.seed_db = lambda *_args, **_kwargs: None  # no-op patch

# ---------------------------------------------------------------------------
# 3. Import the FastAPI application — the patched init_db and seed_db are now live.
# ---------------------------------------------------------------------------
from api.main import app  # noqa: E402

# ---------------------------------------------------------------------------
# 4. Export the OpenAPI schema.
# ---------------------------------------------------------------------------
output_path = sys.argv[1] if len(sys.argv) > 1 else "openapi.json"

schema = app.openapi()
with open(output_path, "w", encoding="utf-8") as fh:
    json.dump(schema, fh, indent=2, ensure_ascii=False)

print(f"[generate_openapi] schema written to {output_path}", file=sys.stderr)

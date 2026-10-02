---
type: workflow
title: AI Course Generation Workflow
description: How a lector-triggered course generation request becomes a detached background task that runs the course_generator LangGraph pipeline, reports progress for polling, and persists modules, learn blocks, and practice questions.
tags: [course-generation, langgraph, background-task, agents, course-generator, progress-polling, idempotency]
verified:
  - by: openwiki/0.6.1
    at: 2026-09-30T09:28:35.455Z
sources:
  - id: openwiki-source-629382dfa3333db0e4acb96e
    resource: repo://backend/agents/course_generator/graph.py
  - id: openwiki-source-94d6672ab87c60d79c429743
    resource: repo://backend/agents/course_generator/nodes/load_data_db.py
  - id: openwiki-source-58bdf1f8c151d9729f77b732
    resource: repo://backend/agents/course_generator/nodes/load_data.py
  - id: openwiki-source-456b488d90034eb777a38569
    resource: repo://backend/agents/course_generator/nodes/planner.py
  - id: openwiki-source-93e3a4201d711708eb994987
    resource: repo://backend/agents/course_generator/nodes/save_to_db.py
  - id: openwiki-source-3e810c2aa7a42ab00b8bf0fa
    resource: repo://backend/agents/course_generator/nodes/summarize.py
  - id: openwiki-source-c03f656f863386267b3373f5
    resource: repo://backend/agents/course_generator/state.py
  - id: openwiki-source-c67c92ebf836818d79833bbd
    resource: repo://backend/api/src/agents/progress.py
  - id: openwiki-source-806b4081dd75cbe1da037d34
    resource: repo://backend/api/src/agents/routers.py
  - id: openwiki-source-3c2a6bd6eb2972a2fa509890
    resource: repo://backend/api/src/courses/controllers/create.py
generated: { by: "openwiki/0.6.1", at: "2026-09-30T09:28:35.455Z" }
---

## Overview

Course generation turns a draft course (title, description, target module count/duration,
and uploaded source files) into a fully populated course with modules, one learn block per
module, and practice questions. The work is done by a LangGraph pipeline
(`agents.course_generator`) invoked from a FastAPI router
(`api/src/agents/routers.py`) as a fire-and-forget `asyncio` background task. The client
polls a separate progress endpoint instead of holding the HTTP connection open, so the
generation is resilient to a page refresh or client disconnect.

## Entry point: `POST /agents/generate-course`

`generate_course` in [`backend/agents/../api/src/agents/routers.py`](../../backend/api/src/agents/routers.py)
(`repo://backend/api/src/agents/routers.py#L87-L120`) is the only trigger for generation. It:

1. Requires the `lector` role (`require_role("lector")` dependency).
2. Loads the course with `get_or_404` and calls `validate_owner_or_superadmin` so only the
   owning lector (or a superadmin) can start generation for that course.
3. Validates course status: generation is only allowed when `Course.status` is `draft` or
   `failed` (`models.Status.draft` / `models.Status.failed`); any other status (e.g.
   `generated`, `in_review`, `approved`) returns HTTP 400. This lets a lector retry a failed
   generation, but not re-run it on a course that already has AI content or is further along
   in the review pipeline.
4. Enforces idempotency: if `is_running(course_id)` is already `True`, the endpoint returns
   immediately with an empty `GenerateCourseResponse` instead of starting a second task —
   the caller is expected to just start/continue polling the progress endpoint. This guards
   against duplicate concurrent generation for the same `course_id` (e.g. a double click or a
   retried request).
5. Otherwise it seeds progress (`set_progress(course_id, step=0, label="Spouštění
   generování")`), schedules `_run_course_generation(course_id)` with `asyncio.create_task`,
   registers the task via `register_task(course_id, task)`, and returns immediately with an
   empty `modules` list — the real result is written to the database, not returned in the
   HTTP response.

A new course is always created in `draft` status by `create_course`
(`repo://backend/api/src/courses/controllers/create.py#L25-L152`), and files/links can only be
attached while a course is still `draft` (`upload_course_file`, `create_course_link`), which is
why `draft` is one of the two states generation accepts.

## Background task: its own DB session, roll back on failure

`_run_course_generation` (`repo://backend/api/src/agents/routers.py#L56-L84`) runs detached
from the original request. It opens a brand-new SQLAlchemy session (`SessionLocal()`) because
the request-scoped session used by the FastAPI dependency is closed once the HTTP handler
returns; the task must own a session that outlives the request.

- On success, it calls `mark_completed(course_id)`.
- On any exception raised anywhere in the LangGraph pipeline, it:
  1. calls `mark_failed(course_id, str(e))` to record the error in the in-memory progress
     store,
  2. rolls back the background session (`db.rollback()`) to discard any partially applied
     writes,
  3. issues a fresh `UPDATE` setting `Course.status = models.Status.failed`, and commits that
     single update (wrapped in its own try/except that rolls back again if even that update
     fails), and
  4. returns without re-raising — the task itself always completes cleanly from asyncio's
     point of view; failure is only visible through progress/status, not through an unhandled
     task exception.
- In a `finally` block, it always closes the DB session and calls `unregister_task(course_id)`
  so `is_running` becomes `False` again and a subsequent `generate-course` call (after a fix)
  is allowed to start a new task.

Because `save_to_db_node` (see below) does its own `db.commit()` at the very end of a
successful run, a mid-pipeline exception (e.g. LLM call failure, missing course, empty
generated content) leaves nothing committed for that course beyond the initial `status`/
`summary` update inside that same transaction — the outer rollback plus the explicit
`failed` update is what guarantees `Course.status` ends up `failed` rather than left in an
inconsistent `draft`/partially-`generated` state.

## In-memory progress and task registry

`api/src/agents/progress.py` is a process-local module (`repo://backend/api/src/agents/progress.py`)
holding two dictionaries protected by a `threading.Lock`:

- `_progress: dict[int, GenerationProgress]` — the last known `step`/`total`/`label`/`status`
  (`pending | running | completed | failed`) and optional `error` message for a `course_id`.
- `_running_tasks: dict[int, asyncio.Task]` — a live reference to the `asyncio.Task` running
  generation for a `course_id`.

Key functions and why they exist:

- `set_progress(course_id, step, label, total=5, status="running")` — called by each LangGraph
  node to advance the step counter and label; this is the only way progress data changes
  during a run.
- `mark_completed` / `mark_failed` — terminal transitions written by
  `_run_course_generation` once the pipeline finishes or raises.
- `register_task` / `unregister_task` — keep a strong reference to the task so the garbage
  collector cannot silently drop it, and let `is_running(course_id)` distinguish "task object
  exists and is not done" from "no task at all" or "task finished". This backs the idempotency
  check in `generate_course` and the retry-after-failure allowance.
- `list_running_course_ids()` — used by `GET /agents/active-course-generation` so the frontend
  can find "is *some* course generating for me right now" after a full page reload, even
  before it knows which `course_id` to poll.

Because this state lives only in process memory, a service restart silently forgets progress
— acceptable because a restart also kills the `asyncio.Task` doing the actual generation, so
there is nothing left to report. The design assumes a single-instance deployment (or sticky
per-course routing); it is not safe to poll progress from a different process/pod than the one
running the task.

**Why generation survives a client refresh**: the HTTP handler for `generate-course` never
awaits the generation itself — it only awaits scheduling the task — so the request completes
and the connection can close while `_run_course_generation` keeps running independently on the
server event loop. `GET /agents/course-progress/{course_id}` (`get_course_generation_progress`,
`repo://backend/api/src/agents/routers.py#L123-L148`) is a stateless read of `get_progress`
plus the same ownership check, so any subsequent request (from a refreshed page or a different
tab) can resume observing the same in-flight task.

## LangGraph pipeline: `course_generator`

`create_graph()` (`repo://backend/agents/course_generator/graph.py`) builds a linear
`StateGraph` over `AgentState` (`repo://backend/agents/course_generator/state.py`) with five
nodes run in sequence, each bumping the shared progress counter for its `course_id`:

1. **`load_data_db`** (`repo://backend/agents/course_generator/nodes/load_data_db.py`,
   step 1) — loads the `Course` row and its `CourseFile` rows from the database, and raises
   if the course does not exist. Populates `state["course_input"]` (`CourseInput`: title,
   description, `modules_count_ai_generated`, `duration_minutes`, list of file paths).
2. **`load_data`** (`repo://backend/agents/course_generator/nodes/load_data.py`, step 2) —
   downloads each course file from SeaweedFS (`api.storage.seaweedfs.download_file`), writes
   it to a temp file, and extracts its text with `agents.base.loaders.base.DataLoader`.
   Concatenates the extracted text of all files into `state["source_content"]`; raises if
   *no* file could be loaded at all (individual file failures are only logged).
3. **`summarize_content`** (`repo://backend/agents/course_generator/nodes/summarize.py`,
   step 3) — loads the `course_summarizer` LLM configuration via `get_llm_config(db,
   "course_summarizer")`, builds a chat model with `create_chat_llm`, and invokes it with a
   prompt combining the configured prompt template, course metadata, and `source_content`.
   Stores the free-text summary in `state["summarize_content"]`; raises on an empty summary.
4. **`plan_content`** (`repo://backend/agents/course_generator/nodes/planner.py`, step 4) —
   loads the `course_planner` LLM configuration, and calls
   `model.with_structured_output(CourseGenerated, method="json_schema")` so the provider
   enforces the nested `CourseGenerated` schema server-side rather than relying on
   tool-calling (important because the schema nests modules → learn blocks/practice
   questions, which some models otherwise return as a JSON-encoded string instead of a
   structured array). Raises if the model returns a course with zero modules.
5. **`save_to_db`** (`repo://backend/agents/course_generator/nodes/save_to_db.py`, step 5) —
   persists the structured result (see next section) and issues the single `db.commit()`
   that finalizes the whole run.

```mermaid
sequenceDiagram
    participant Lector
    participant API as generate_course (router)
    participant Registry as progress.py registry
    participant Task as _run_course_generation
    participant Graph as course_generator LangGraph
    participant DB as Database

    Lector->>API: POST /agents/generate-course?course_id
    API->>DB: validate ownership + status in (draft, failed)
    API->>Registry: is_running(course_id)?
    alt already running
        Registry-->>API: True
        API-->>Lector: empty response (poll progress)
    else not running
        Registry-->>API: False
        API->>Registry: set_progress(step=0)
        API->>Task: asyncio.create_task(...)
        API->>Registry: register_task(course_id, task)
        API-->>Lector: 200 response (task now running)
        Task->>DB: open new SessionLocal()
        Task->>Graph: CourseGeneratorService.generate()
        Graph->>Graph: load_data_db -> load_data -> summarize_content -> plan_content -> save_to_db
        alt pipeline succeeds
            Graph->>DB: commit modules/learn blocks/questions, status=generated
            Task->>Registry: mark_completed(course_id)
        else pipeline raises
            Task->>Registry: mark_failed(course_id, error)
            Task->>DB: rollback(); UPDATE Course SET status=failed; commit
        end
        Task->>Registry: unregister_task(course_id)
    end
    loop client polling
        Lector->>API: GET /agents/course-progress/course_id
        API->>Registry: get_progress(course_id)
        Registry-->>Lector: step/total/label/status/error
    end
```
*Request/task flow for triggering, running, and polling AI course generation, including the failure branch.*

## Structured LLM output schemas and persistence mapping

`agents/course_generator/state.py` defines the Pydantic models that constrain what the
`plan_content` node's structured-output call may produce:

- `CourseGenerated { title, modules: list[ModuleGenerated] }`
- `ModuleGenerated { title, perex, neuro_principle_code, krauu_competence_codes: list[str],
  bloom_level_codes: list[str], learn_blocks: list[LearnBlockGenerated], practice_questions:
  list[PracticeQuestionGenerated] }`
- `LearnBlockGenerated { content }`
- `PracticeQuestionGenerated { question_type: QuestionType, question, correct_answer?,
  example_answer?, closed_options: list[PracticeOptionGenerated], open_keywords:
  list[QuestionKeywordGenerated] }`

These schemas are deliberately separate from the API response schemas in
`api/src/agents/schemas.py`; they exist purely to constrain the LLM's structured output and
are consumed only inside the pipeline. `save_to_db_node` maps them onto ORM rows with several
important invariants worth knowing when changing either side:

- The course row itself is updated in place (`UPDATE Course SET status='generated',
  summary=...`), not recreated.
- Each `ModuleGenerated` becomes one `models.Module` row; `neuro_principle_code`,
  `krauu_competence_codes`, and `bloom_level_codes` are *codes*, not database IDs — the node
  looks each one up against the corresponding catalog table (`NeuroPrinciple`,
  `KrauuCompetence`, `BloomLevel`) filtered by `is_active`, and silently drops codes that do
  not resolve (logging a warning), falling back to catalog code `NP-01` when the neuro
  principle code is unrecognized. A module can end up with no KRAUU competences or Bloom
  levels linked if the model returned only invalid codes.
- **At most one `learn_blocks` entry per module** is allowed; more than one raises a
  `ValueError` and aborts the whole save (and, by extension, the whole generation run, via the
  failure path described above). Each learn block is stored as one `models.LearnBlock` row.
- Practice questions are saved directly under the module (not nested under the learn block).
  For `question_type == "closed"`, a missing `correct_answer` is repaired by falling back to
  the first `closed_options` entry if any exist, otherwise the question is skipped entirely;
  for `question_type == "open"`, a missing `example_answer` is replaced with a fixed fallback
  string. `closed_options` become `models.PracticeOption` rows and `open_keywords` become
  `models.QuestionKeyword` rows, both keyed by the freshly flushed `question_id`.
- The whole node performs a single `db.commit()` at the end; there is no partial commit per
  module, so a mid-loop exception (e.g. the "too many learn blocks" `ValueError`) leaves the
  transaction uncommitted and lets the router's failure handling roll everything back.

## Related pages

- [Data Model](../architecture/data-model.md) — schema for `Course`, `Module`, `LearnBlock`,
  `PracticeQuestion`, and the catalog tables (`NeuroPrinciple`, `KrauuCompetence`,
  `BloomLevel`) that generation writes into.
- [Learning Model](../concepts/learning-model.md) — the pedagogical shape (modules, one learn
  block per module, practice questions) that the generated content must conform to.
- [External Services](../integrations/external-services.md) — SeaweedFS file storage and LLM
  provider configuration (`get_llm_config`/`create_chat_llm`) used by `load_data` and the
  LLM-calling nodes.
- [Assessment and Practice Workflow](assessment-and-practice.md) — what happens to the
  generated practice questions and learn blocks after generation, during study and
  assessment.

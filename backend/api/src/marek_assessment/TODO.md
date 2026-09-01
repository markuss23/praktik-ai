# TODO — nahrazení `assessments/` modulem `marek_assessment`

- [ ] Doplnit DELETE endpoint pro odpojení formátu od kurzu (chybí oproti starému `assessments/routers.py`)
- [ ] Rozhodnout o mechanismu `AssessmentTurn` — zachovat historii tahů, nebo vědomě zůstat jen u JSONB `result` (dopad na budoucí formáty jako open_questions/AI procvičování)
- [ ] Sjednotit `submit_answer` — odpověď přesunout z query parametru do request body (konzistence s ostatními POST endpointy)
- [ ] Přidat typovaný Pydantic response model pro `get_session_history` (místo `list[dict]`)
- [ ] Ošetřit stavy `awaiting_review`, `passed`, `failed`, `abandoned` (aktuálně se nastavuje jen `in_progress`/`completed`)
- [ ] Napsat testy pro `marek_assessment` (controllers, routers, utils)
- [ ] Ověřit/promyslet `is_required` a `is_enabled` na `CourseAssessment`
- [ ] Smazat starý modul `src/assessments/` a odregistrovat `assessments_router` z `routers.py`
- [ ] Přejmenovat/přesunout `marek_assessment` na finální název (např. `assessments`), včetně cest (`/m-assessments` → `/assessments`)
- [ ] Aktualizovat OpenAPI klienta pro frontend, až se bude modul napojovat na UI (zatím frontend na žádný z modulů nesahá)

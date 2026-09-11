# TODO — `assessments/` (dřív `marek_assessment`)

- [x] Smazat starý modul `src/assessments/` a odregistrovat `assessments_router` z `routers.py`
- [x] Přejmenovat/přesunout `marek_assessment` na finální název `assessments`, včetně cest (`/m-assessments` → `/assessments`)
- [x] Smazat osiřelý `agents/assessments/` (service vrstva starého modulu, nikým nevolaná)
- [x] Doplnit DELETE endpoint pro odpojení formátu od kurzu (soft delete, `DELETE /assessments/{course_assessment_id}`)
- [ ] Rozhodnout o mechanismu `AssessmentTurn` — zachovat historii tahů, nebo vědomě zůstat jen u JSONB `result` (dopad na budoucí formáty jako open_questions/AI procvičování)
- [ ] Sjednotit `submit_answer` — odpověď přesunout z query parametru do request body (konzistence s ostatními POST endpointy)
- [ ] Přidat typovaný Pydantic response model pro `get_session_history` (místo `list[dict]`)
- [x] Ošetřit `passed`/`failed` — přidán `pass_threshold` do `ClosedQuestionsSettings`, session po dokončení dostane `passed`/`failed` + `is_passed` místo vždy `completed`
- [ ] `awaiting_review` a `abandoned` zůstávají nepoužité — `closed_questions` je nepotřebuje (žádné hodnocení člověkem, žádný mechanismus na opuštění session)
- [ ] Napsat testy (controllers, routers, utils)
- [x] Ověřit/promyslet `is_required` a `is_enabled` na `CourseAssessment` — vynuceno gate hierarchií v `start_session` (`_assert_prerequisites_passed`): practice (is_required) → assessment; assessment (is_required, napříč moduly) → course_final. `is_required=False` zůstává dobrovolné. Nahradilo smazané `Course.min_modules_to_open_final_exam`.
- [x] Doplnit enrollment kontrolu na runtime endpointy (`start_session`, `get_current_session`, `submit_answer`, `get_session_history`) — volají `check_enrollment` (bez `bypass_for_owner`), dřív chyběla úplně

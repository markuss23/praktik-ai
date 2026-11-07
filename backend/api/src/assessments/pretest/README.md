# Pretest (`pretest`)

Krátký test na začátku modulu, který odemyká practice. Struktura je pevná: 2 uzavřené otázky a pak 1 otevřená. Je to lehký concept check, ne zkouška.

## Metodika

1. Otázky vygeneruje AI spolu s kurzem (generátor kurzu, uzel `enrich`). Uloží se do `course_assessment.settings`.
2. Lektor může měnit obsah otázek (texty, možnosti, správnou odpověď, klíčové body) přes `GET/PUT /assessments/{id}/pretest`. Strukturu 2 + 1 ani pravidla měnit nemůže.
3. Student odpoví na dvě uzavřené otázky (kliká) a jednu otevřenou (píše).
4. Na každou otázku má 3 pokusy.
5. Projde jen se všemi třemi otázkami správně.

## Settings (`course_assessment.settings`)

```json
{
  "closed": [
    {"question": "...", "options": ["a", "b", "c"], "correct_index": 0},
    {"question": "...", "options": ["a", "b", "c"], "correct_index": 2}
  ],
  "open": {
    "question": "...",
    "example_answer": "Vzorová odpověď",
    "keywords": ["bod 1", "bod 2", "bod 3"]
  }
}
```

- `closed` má přesně 2 položky (`CLOSED_COUNT`). Možnosti se nesmí opakovat.
- `open.keywords` jsou klíčové body dobré odpovědi. Nesmí se opakovat.
- `default_settings` je `{}`. Bez otázek od generátoru kurzu pretest neprojde validací a nedá se spustit.

Pravidla nejsou v settings, ale jako konstanty v `service.py`:

| Konstanta | Hodnota | Význam |
| --- | --- | --- |
| `MAX_ATTEMPTS` | 3 | Pokusy na otázku. |
| `PASS_THRESHOLD` | 1.0 | Pro úspěch musí být správně 3 ze 3. |

## State (`session.state`)

```json
{"current": 0, "attempts_used": 0, "correct_count": 0, "last_answer": ""}
```

`current` 0–1 jsou uzavřené otázky, 2 je otevřená. Otázky se čtou ze `settings`.

## Průběh

**`initial_state`**: prázdný state. Otázky už zvalidoval `parse_settings`.

**`view`**: u uzavřené otázky `question` a `options`. U otevřené jen `question` (`options = null`).

**`evaluate_answer`**

- **Uzavřená otázka**: odpověď je **index možnosti** (`"0"`, `"1"`, ...), ne text jako u `closed_questions`. Neplatný index vrátí 422 a nepočítá se jako pokus.
- **Otevřená otázka**: hodnotí ji sdílený `agents/open_question_evaluator.py` s vlastním, mírnějším promptem `evaluator_prompt.md`. Dostane vzorovou odpověď a klíčové body. Vrátí `is_correct` a `feedback`.
- Špatně a zbývají pokusy: stejná otázka, `finished = False`.
- Po poslední otázce `score = correct_count / 3 * 100` a `is_passed = score_ratio >= 1.0`.

## Typing guard

`TYPED_ANSWER` je funkce. Vrací `True` jen u otevřené otázky (`current == 2`). U uzavřených se kliká, takže se rychlost psaní nekontroluje.

## Kontexty

Jen `pretest`.

## Generování (`generator.py`)

- Volá ho generátor kurzu: `create_pretest_llm` jednou v hlavním vlákně (čte DB), `generate_pretest` pak paralelně pro každý modul.
- Jedno volání LLM se structured outputem `PretestGenerated`. Pevná pole vynutí poměr 2 + 1.
- `validate_generated` kontroluje to, co schéma neumí: přesně 3 možnosti, neopakující se možnosti, `correct_answer` doslova shodný s jednou možností, přesně 3 klíčové body.
- Při chybě jeden opravný pokus s výpisem chyb. Když selže i ten, vyhodí `ValueError`.
- Možnosti zamíchá a správnou odpověď převede z textu na index.

## Prompty

| Klíč `system_setting` | Soubor | Účel |
| --- | --- | --- |
| `pretest` | `prompt.md` | Generování otázek. |
| `open_question_evaluator` | `evaluator_prompt.md` | Hodnocení otevřené otázky. Model se bere ze sdíleného klíče, prompt z této složky. |

## Testy

Vlastní test zatím nemá.

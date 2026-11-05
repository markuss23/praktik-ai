# Uzavřené otázky AI (`closed_questions_ai`)

Interakční formát s uzavřenými otázkami, které vygeneruje AI z učebního textu při startu session. Vyhodnocení už je bez AI a deleguje se na [`closed_questions`](../closed_questions/README.md).

## Metodika

1. Lektor formát jen připojí ke kurzu a nastaví počet otázek a pravidla.
2. Při startu session AI vygeneruje `question_count` otázek z učebního textu. Každý student tak dostane jinou sadu.
3. Dál se postupuje stejně jako u `closed_questions`: pokusy na otázku, podíl zvládnutých otázek.

## Settings (`course_assessment.settings`)

| Pole | Default | Význam |
|---|---|---|
| `question_count` | 5 | Kolik otázek AI vygeneruje (1–20). |
| `max_attempts` | 3 | Počet pokusů na jednu otázku (≥ 1). |
| `pass_threshold` | 0.75 | Podíl zvládnutých otázek pro `is_passed` (0–1). |

## State (`session.state`)

Stejný jako u `closed_questions`, navíc pole `questions`:

```json
{
  "current": 0,
  "attempts_used": 0,
  "correct_count": 0,
  "questions": [
    {"question": "...", "options": ["...", "...", "..."], "correct_index": 2}
  ]
}
```

Vygenerované otázky i se správnou odpovědí jsou jen v `session.state`. Student je nevidí, `view` vrací otázku bez `correct_index`.

## Průběh

**`initial_state`**: spustí generátor (`agents/generator/`, LangGraph):
1. `load_context` načte aktivní learn blocky. Při nastaveném `module_id` jen z modulu, u `course_final` ze všech modulů kurzu.
2. `generate_questions` zavolá LLM se structured outputem (`GeneratedQuestions`).
   - Vezme nejvýš `question_count` otázek.
   - Nevalidní otázky (např. `correct_index` mimo `options`) přeskočí s varováním.
   - Možnosti zamíchá, protože LLM dává správnou odpověď často na stejnou pozici.
3. Pokud nezbude žádná validní otázka, generování selže.

AI může vrátit méně otázek, než je `question_count`. Skóre se pak počítá z toho, co přišlo.

**`view`** a **`evaluate_answer`**: složí `ClosedQuestionsSettings` z otázek ve state a pravidel z `cfg` a zavolají `closed_questions`. Pak vrátí `questions` zpátky do nového state. Odpověď je tedy taky **text možnosti**.

## Kontexty

`practice`, `assessment`, `course_final`.

## Prompty

| Klíč `system_setting` | Soubor | Účel |
|---|---|---|
| `closed_questions_ai` | `agents/generator/prompt.md` | Generování otázek. |

Text promptu je v souboru. Z DB se čte jen model, přes `get_llm_config`.

## Testy

`tests/test_closed_questions_ai.py`, `tests/test_closed_questions_didactic.py`.

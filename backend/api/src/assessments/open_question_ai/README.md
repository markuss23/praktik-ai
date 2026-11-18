# Otevřená otázka AI (`open_question_ai`)

Interakční formát s jednou otevřenou otázkou. AI ji vygeneruje z učebního textu a pak hodnotí odpověď studenta skórem a slovní zpětnou vazbou.

## Metodika

1. Lektor formát jen připojí ke kurzu a nastaví pokusy a práh.
2. Při startu session AI vygeneruje jednu otázku z učebního textu modulu.
3. Student napíše odpověď. AI ji ohodnotí skórem 0–100 a napíše zpětnou vazbu.
4. Pod prahem a se zbývajícími pokusy student odpověď upraví a pošle znovu. Otázka zůstává stejná.
5. Session končí při úspěchu nebo po vyčerpání pokusů.

## Settings (`course_assessment.settings`)

| Pole | Default | Význam |
| --- | --- | --- |
| `max_attempts` | 3 | Počet pokusů. |
| `pass_threshold` | 0.75 | Minimální `score / 100` pro úspěch (0–1). |

## State (`session.state`)

```json
{"question": "Vysvětli, proč ...", "attempts_used": 1, "last_answer": "...", "ai_style": ""}
```

- `question` je vygenerovaná otázka (max. 255 znaků).
- `last_answer` je předchozí odpověď. Typing guard ji porovnává s novou, viz `TYPED_ANSWER`.
- `ai_style` je blok stylu z profilu pro prompt evaluátoru. Plní ho `start_session`, když student pošle `use_profile_style=true` a kontext je `practice`. Délku bere z osy `dens` jako mentor. `""` = bez stylu.

## Průběh

**`initial_state`**: spustí generátor (`agents/generator/`):

1. `load_context` načte modul podle `module_id` a vezme obsah jeho **prvního** aktivního learn blocku. Relace `Module.learn_blocks` nemá `order_by`, takže „první“ určuje DB.
2. `generate_question` zavolá LLM. Celá textová odpověď je otázka.

**`view`**: vrátí `question`.

**`evaluate_answer`**: spustí evaluátor (`agents/evaluator/`):

1. `load_context` načte stejný učební text.
2. `evaluate_answer` pošle LLM text, otázku a odpověď. LLM vrátí:

   ```text
   SCORE: <0-100>
   FEEDBACK: <text>
   ```

   Když se `SCORE` nedá přečíst, je skóre 0. Když chybí `FEEDBACK`, celá odpověď LLM jde do feedbacku.
3. `is_correct = score / 100 >= pass_threshold`.
4. Špatně a zbývají pokusy: `finished = False` a feedback pro studenta.
5. Jinak `finished = True`, `score` z AI, `is_passed = is_correct` a feedback.

## Typing guard

`TYPED_ANSWER = True`. Odpověď se píše, takže `submit_answer` odmítne text vložený příliš rychle (`typed_too_fast`). Vychází přitom z `state.last_answer`.

## Kontexty

V `seed.py` povolené `practice`, `assessment`, `course_final`.

Pozor: generátor i evaluátor potřebují `module_id`. U `course_final` je `module_id` prázdné, takže tam formát nenajde text.

## Prompty

| Klíč `system_setting` | Soubor | Účel |
| --- | --- | --- |
| `open_question_ai` | `agents/generator/prompt.md` | Generování otázky. |
| `open_question_ai_evaluator` | `agents/evaluator/prompt.md` | Hodnocení odpovědi. |

Texty promptů jsou v souborech. Z DB se čte jen model, přes `get_llm_config`.

## Testy

Vlastní test zatím nemá. Self-check `_parse_evaluation` je v `agents/evaluator/nodes/evaluate_answer.py` (`__main__`).

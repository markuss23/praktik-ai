# Uzavřené otázky (`closed_questions`)

Interakční formát s pevnou sadou uzavřených otázek. Otázky napíše lektor do `settings`. Vyhodnocení je bez AI.

Formát slouží i jako základ pro [`closed_questions_ai`](../closed_questions_ai/README.md), který mu předává vlastní otázky.

## Metodika

1. Lektor napíše otázky. Každá má 2–6 možností a jednu správnou.
2. Student dostává otázky jednu po druhé, bez správné odpovědi.
3. Na každou otázku má `max_attempts` pokusů. Při špatné odpovědi a zbývajících pokusech dostane stejnou otázku znovu.
4. Otázka je zvládnutá, když ji student trefí v rámci pokusů. Po vyčerpání pokusů se jde dál a otázka se nepočítá.
5. Na konci se spočítá podíl zvládnutých otázek.

## Settings (`course_assessment.settings`)

| Pole | Default | Význam |
| --- | --- | --- |
| `questions` | `[]` | Seznam otázek, viz níže. Prázdný seznam projde validací, ale start session vrátí 422. |
| `max_attempts` | 3 | Počet pokusů na jednu otázku (≥ 1). |
| `pass_threshold` | 0.75 | Podíl zvládnutých otázek pro `is_passed` (0–1). |

Jedna otázka (`ClosedQuestionItem`):

```json
{"question": "Kolik je 2 + 2?", "options": ["3", "4", "5"], "correct_index": 1}
```

`correct_index` musí ukazovat do `options`, jinak validace selže.

## State (`session.state`)

```json
{"current": 0, "attempts_used": 0, "correct_count": 0}
```

- `current` je index aktuální otázky v `settings.questions`.
- `attempts_used` jsou pokusy spotřebované na aktuální otázku.
- `correct_count` je počet zvládnutých otázek.

Otázky se do state nekopírují. Čtou se ze `settings`.

## Průběh

**`initial_state`**: když `questions` chybí, vrátí 422 „Test zatím nemá žádné otázky.“ Jinak prázdný state.

**`view`**: vrátí `question` a `options` aktuální otázky, bez `correct_index`.

**`evaluate_answer`**

- Odpověď je **text možnosti**, ne index. Porovnává se `answer.strip() == options[correct_index]`.
- Špatně a zbývají pokusy: `is_correct = False`, `finished = False`, stejná otázka.
- Jinak se jde na další otázku. Po poslední otázce:
  - `score = correct_count / počet otázek * 100` (zaokrouhleno na 1 desetinné místo)
  - `is_passed = podíl >= pass_threshold`
  - `finished = True`

`feedback` je vždy `None`.

## Kontexty

`practice`, `assessment`, `course_final`.

## Testy

Vlastní test zatím nemá.

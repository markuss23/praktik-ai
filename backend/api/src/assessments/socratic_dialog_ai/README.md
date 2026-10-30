# Sokratovský dialog AI (`socratic_dialog_ai`)

Interakční formát, kde AI vede se studentem rozhovor o tématu, které si sama vymyslí z učebního textu. Klade jen otázky a v průběhu nedává verdikt.

> **Stav:** zatím jen kostra. Funkce v `service.py` vyhodí `NotImplementedError`. Formát není v `FORMATS`, takže ho žádný endpoint nevidí.

## Metodika

1. Garant formát jen připojí ke kurzu a nastaví délku a elo.
2. AI z učebního textu vymyslí téma (`topic`) a položí první otázku. Každý student tak může dostat jiné téma.
3. Student odpoví a AI navazuje další otázkou. Odpověď neprozradí a neřekne, jestli je dobře nebo špatně.
4. Rozhovor má 2–6 kroků. Jeden krok je jedna odpověď studenta.
5. Na konci AI shrne průběh rozhovoru: co student promyslel a kde váhal. Shrnutí neobsahuje známku.

Formát potřebuje paměť konverzace. AI při každém kroku dostane celou dosavadní historii.

## Settings (`course_assessment.settings`)

| Pole | Default | Význam |
|---|---|---|
| `min_turns` | 2 | Nejmenší počet kroků (2–6). Dřív AI nesmí ukončit. |
| `max_turns` | 6 | Největší počet kroků (2–6). Po něm rozhovor končí vždy. |
| `start_elo` | 1000 | Počáteční elo. |
| `min_elo` / `max_elo` | 800 / 1200 | Rozsah, na který se elo ořízne. |
| `max_step` | 50 | O kolik nejvýš může AI posunout elo za jeden krok. |
| `pass_elo` | 1000 | Hranice pro `is_passed`. |

Union `AssessmentSettings` zkouší formáty zleva doprava. Pole `min_turns` žádný jiný formát nemá a ostatní formáty mají `extra="forbid"`, takže si nastavení tohoto formátu nespletou se svým. Všechna pole mají default, takže by tenhle formát prošel i s `{}`. Proto je `SocraticDialogAISettings` v unionu až úplně na konci.

## State (`session.state`)

```json
{
  "topic": "Proč fotosyntéza potřebuje světlo",
  "turns": [
    {"role": "assistant", "content": "Co je podle tebe ...?", "delta": null},
    {"role": "student", "content": "...", "delta": 20}
  ],
  "elo": 1020,
  "summary": "",
  "last_answer": "..."
}
```

- `topic` je téma, které AI vymyslela v `initial_state`. Platí pro celý rozhovor.
- `turns` je paměť konverzace. Ukládá se jen sem, tabulka `assessment_turn` se nepoužívá.
- `delta` je změna elo, kterou AI dala za odpověď studenta.
- Typing guard v `submit_answer` čte `last_answer`, viz `TYPED_ANSWER`.

## Průběh

**`initial_state`**
- Načte učební text. Pokud je nastavené `module_id`, vezme text modulu. U `course_final` `module_id` chybí, tak vezme texty všech modulů kurzu.
- Jedno volání AI vrátí téma i první otázku:
  ```
  TÉMA: <téma>
  OTÁZKA: <první otázka>
  ```
- Výsledek: `topic`, `turns = [otázka]`, `elo = start_elo`.

**`view`**
- Vrátí `question` = poslední zpráva AI.

**`evaluate_answer`**
1. Přidá do `turns` tah studenta.
2. Zavolá AI s tématem, učebním textem a celou historií. AI odpoví ve formátu:
   ```
   DELTA: <-max_step..max_step>
   OTÁZKA: <další otázka>   nebo   KONEC
   ```
3. Spočítá nové elo: `clamp(elo + clamp(delta, ±max_step), min_elo, max_elo)`.
4. Rozhovor končí, když `kroky >= max_turns`, nebo když AI napíše `KONEC` a zároveň `kroky >= min_turns`. Pak:
   - Druhé volání AI napíše shrnutí. Uloží se do `state.summary` a do `feedback`.
   - `score = (elo - min_elo) / (max_elo - min_elo) * 100`
   - `is_passed = elo >= pass_elo`
   - `finished = True`
5. Jinak přidá otázku do `turns` a vrátí `finished = False`, `is_correct = True` (formát verdikt nemá) a `feedback = None`.

Student elo během rozhovoru nevidí. Projeví se až ve výsledném `score` a `is_passed`.

## Kontexty

`practice`, `assessment`, `course_final`. Pretest ne.

## Prompty (`system_setting`)

- `socratic_dialog_ai_topic`: vymyslí z učebního textu téma a první otázku.
- `socratic_dialog_ai`: tazatel. Klade jednu otázku za krok, odpověď neprozradí, před `min_turns` nesmí napsat KONEC.
- `socratic_dialog_ai_summary`: shrnutí průběhu rozhovoru v 3–5 větách, bez známky.

Texty promptů budou v `topic_prompt.md`, `prompt.md` a `summary_prompt.md` stejně jako u ostatních formátů. Z DB se čte jen model, přes `get_llm_config` a `create_chat_llm` v `agents/base/llm.py`.

## TODO pro napojení

- [ ] Doplnit pole do `schemas.py` a logiku do `service.py`.
- [ ] Přidat `"socratic_dialog_ai": socratic_dialog_ai` do `FORMATS` v `assessments/utils.py`.
- [x] Přidat `SocraticDialogAISettings` na konec unionu `AssessmentSettings` v `assessments/schemas.py`.
- [x] Přidat formát do `ASSESSMENT_TYPES` v `seed.py`.
- [ ] Přidat prompty do `SYSTEM_SETTINGS` v `seed.py`.
- [ ] Migrace `0022_assessment_type_socratic_dialog_ai.sql`: řádek v `assessment_type` a tři řádky v `system_setting`.
- [ ] Testy v `backend/tests/test_socratic_dialog_ai.py` s mockovaným LLM: konec po `max_turns`, ignorovaný KONEC před `min_turns`, oříznutí elo.

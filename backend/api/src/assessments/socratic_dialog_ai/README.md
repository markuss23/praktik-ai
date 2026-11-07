# Sokratovský dialog AI (`socratic_dialog_ai`)

AI vede se studentem rozhovor o tématu, které si sama vymyslí z učebního textu. Klade jen otázky a v průběhu nedává verdikt.

## Metodika

1. Lektor formát připojí ke kurzu a nastaví délku a elo.
2. AI z učebního textu vymyslí téma a první otázku. Každý student může dostat jiné téma.
3. Student odpoví, AI navazuje další otázkou. Odpověď neprozradí ani neřekne, jestli je dobře.
4. Rozhovor má `min_turns`–`max_turns` kroků (default 2–4). Krok = jedna odpověď studenta.
5. Na konci AI shrne, co student promyslel a kde váhal. Bez známky.

## Settings (`course_assessment.settings`)

| Pole | Default | Význam |
| --- | --- | --- |
| `min_turns` | 2 | Nejmenší počet kroků (1–10). Dřív AI nesmí ukončit. |
| `max_turns` | 4 | Největší počet kroků (2–10). Po něm rozhovor končí vždy. |
| `start_elo` | 1000 | Počáteční elo. |
| `min_elo` / `max_elo` | 800 / 1200 | Rozsah, na který se elo ořízne. |
| `max_step` | 50 | Největší posun elo za jeden krok (1–100). |
| `pass_elo` | 1200 | Hranice pro `is_passed`. |

Validace navíc vyžaduje `min_turns <= max_turns`, `min_elo <= start_elo <= max_elo`, `min_elo < max_elo` a `pass_elo` mezi `min_elo` a `max_elo`.

Všechna pole mají default, takže projde i `{}`. Proto je `SocraticDialogAISettings` v unionu `AssessmentSettings` až na konci.

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

- `turns` je celá paměť konverzace. Tabulka `assessment_turn` se nepoužívá.
- `delta` je změna elo za odpověď studenta.

## Průběh

**`initial_state`**: načte učební text modulu, u `course_final` všech modulů kurzu. Jedno volání AI vrátí téma a první otázku (`TÉMA:` / `OTÁZKA:`).

**`view`**: vrátí poslední otázku AI.

**`evaluate_answer`**

1. Přidá tah studenta a zavolá AI s tématem, textem a celou historií. AI vrátí `DELTA:` a `OTÁZKA:` nebo `KONEC`.
2. Nové elo: `clamp(elo + clamp(delta, ±max_step), min_elo, max_elo)`.
3. Konec nastane při `kroky >= max_turns`, nebo při `KONEC` a `kroky >= min_turns`. Pak:
   - druhé volání AI napíše shrnutí do `summary` a `feedback`,
   - `score = (elo - min_elo) / (max_elo - min_elo) * 100`,
   - `is_passed = elo >= pass_elo`.
4. Jinak přidá další otázku a vrátí `finished = False`, `is_correct = True`. Verdikt v průběhu není a student elo nevidí.

`TYPED_ANSWER = True`: `submit_answer` odmítne příliš rychle vložený text (`typed_too_fast`).

## Kontexty

`practice`, `assessment`, `course_final`.

## Prompty

| Klíč `system_setting` | Soubor | Účel |
| --- | --- | --- |
| `socratic_dialog_ai_topic` | `agents/topic/prompt.md` | Téma a první otázka. |
| `socratic_dialog_ai` | `agents/dialog/prompt.md` | Další otázka, nebo KONEC. |
| `socratic_dialog_ai_summary` | `agents/summary/prompt.md` | Shrnutí v 3–5 větách. |

Z DB se čte jen model (`get_llm_config`).

## Testy

Vlastní test zatím nemá. Self-checky parserů jsou v `agents/dialog/nodes/ask.py` a `agents/topic/nodes/generate_topic.py` (`__main__`).

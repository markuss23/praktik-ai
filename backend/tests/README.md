# Testy

Spouští se z adresáře `backend/`.

```bash
uv sync                  # poprvé: nainstaluje i pytest (dev závislost)
uv run pytest tests      # všechny rychlé testy
```

Rychlé testy nepotřebují databázi, API klíče ani síť. LLM a DB se v nich nahrazují mockem.

## Co tu je

| Soubor | Co testuje |
|---|---|
| `test_closed_questions_ai.py` | Formát `closed_questions_ai`: nastavení, start session, vyhodnocení odpovědí, skóre, uložení stavu do DB a zpět |
| `test_submit_answer_typing.py` | Odmítnutí vložené (nereálně rychle napsané) odpovědi v `submit_answer` u psaných formátů |
| `test_closed_questions_didactic.py` | Didaktickou kvalitu AI otázek podle pravidel z `prompt.md` (počet, 3–4 možnosti, žádné duplicity, žádné „všechny uvedené“, délka možností…) |

## Živý test se skutečným LLM

Volá skutečný model, takže stojí peníze. Ve výchozím stavu se přeskakuje.

```bash
RUN_LLM_TESTS=1 uv run --env-file ../.env pytest tests -k live -s
```

- `--env-file ../.env` načte `ANTHROPIC_API_KEY` z kořenového `.env`
- `-s` vypíše vygenerované otázky
- model změníš přes `LLM_TEST_MODEL=...` (výchozí `claude-opus-5-5`)

## Užitečné přepínače

```bash
uv run pytest tests -k didactic   # jen testy, jejichž název obsahuje "didactic"
uv run pytest tests -x            # zastaví se na první chybě
uv run pytest tests --lf          # jen testy, které minule selhaly
```

## Nový test

Soubor pojmenuj `tests/test_<něco>.py` a funkce `test_<něco>()`. Importy fungují jako v aplikaci (`from api.src... import ...`), zařizuje to `pythonpath` v `pyproject.toml`. Async funkce volej přes `asyncio.run(...)`, pytest-asyncio tu není.

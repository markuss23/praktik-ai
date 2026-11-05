"""Kontrola, že odpověď na závěrečný test mohla vzniknout psaním.

Frontend vkládání do odpovědi blokuje, jenže prohlížeč má student pod
kontrolou. Server proto porovná, kolik znaků odpověď nově obsahuje, s časem,
který na napsání byl — od vygenerování otázky, u dalšího pokusu od toho
předchozího (odpověď v poli zůstává a student ji jen upravuje). Tohle z
prohlížeče zfalšovat nejde, dá se jen počkat.
"""

import re
from datetime import UTC, datetime
from difflib import SequenceMatcher

# Rychlý písař vydrží zhruba 8–10 znaků za sekundu; 12 nechává rezervu, aby
# se poctivé odpovědi neodmítaly. Prvních pár znaků je „zdarma" (krátké
# odpovědi, drobné opravy těsně po předchozím pokusu).
MAX_CHARS_PER_SECOND = 12
FREE_CHARS = 40

# Slovo i s mezerami za ním — porovnává se po slovech. Po znacích by se
# v dlouhém předchozím textu našlo skoro každé písmeno a úplně jiný text by
# vypadal jako „beze změny" (a bylo by to i řádově pomalejší).
_WORD = re.compile(r"\S+\s*")


def inserted_chars(previous: str, current: str) -> int:
    """Počet znaků nových nebo přepsaných slov v `current` oproti `previous`."""
    if not previous:
        return len(current)
    previous_words = _WORD.findall(previous)
    current_words = _WORD.findall(current)
    # autojunk by častá slova („a", „je") bral jako šum a shodné úseky by
    # se nenašly — přírůstek by vycházel přehnaně.
    matcher = SequenceMatcher(None, previous_words, current_words, autojunk=False)
    return sum(
        len("".join(current_words[j1:j2]))
        for tag, _i1, _i2, j1, j2 in matcher.get_opcodes()
        if tag in ("insert", "replace")
    )


def typed_too_fast(previous: str, current: str, since: datetime) -> bool:
    """True, když by nový text vyžadoval nereálnou rychlost psaní."""
    elapsed = (datetime.now(UTC) - since).total_seconds()
    allowed = FREE_CHARS + MAX_CHARS_PER_SECOND * max(elapsed, 0.0)
    return inserted_chars(previous, current) > allowed

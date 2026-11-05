"""
Jednorázová aktualizace tabulky system_setting podle SYSTEM_SETTINGS ze seed.py.

seed_db() plní system_setting jen když je tabulka prázdná, takže změny promptů
v seed.py se do už naseedované DB sami nepromítnou. Tento skript existující
záznamy (podle `key`) přepíše aktuálními hodnotami a chybějící doplní.

Spuštění z adresáře backend/:
    python -m scripts.update_system_settings            # všechny klíče
    python -m scripts.update_system_settings course_planner  # jen vybrané klíče

POZOR: přepíše name/model/prompt/description — ruční úpravy provedené přes
admin dashboard u dotčených klíčů budou ztraceny.
"""

import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from api.database import SessionLocal
from api.models import SystemSetting
from api.seed import SYSTEM_SETTINGS

FIELDS = ("name", "model", "prompt", "description")


def update_system_settings(keys: set[str] | None = None) -> None:
    db: Session = SessionLocal()
    try:
        for row in SYSTEM_SETTINGS:
            key = row["key"]
            if keys and key not in keys:
                continue

            setting = db.scalar(
                select(SystemSetting).where(
                    SystemSetting.key == key,
                    SystemSetting.is_active.is_(True),
                )
            )

            if setting is None:
                db.add(SystemSetting(**row))
                print(f"[+] {key}: vytvořeno")
                continue

            changed = [f for f in FIELDS if getattr(setting, f) != row.get(f)]
            if not changed:
                print(f"[=] {key}: beze změny")
                continue

            for f in changed:
                setattr(setting, f, row.get(f))
            print(f"[~] {key}: aktualizováno ({', '.join(changed)})")

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    update_system_settings(set(sys.argv[1:]) or None)

"""
Spustí SQL migrace z migrations/, které ještě neběžely, a zapíše je do tabulky schema_migration.

Pořadí = abecední pořadí názvů souborů (0001_..., 0002_...). Bere jen soubory začínající
číslicí, takže migration_script.sql se přeskočí. Každá migrace běží ve vlastní transakci;
když selže, skript skončí s exit 1 a migrace se nezapíše.

Spuštění z adresáře backend/:
    python -m scripts.migrate              # spustí čekající migrace
    python -m scripts.migrate --status     # jen vypíše poslední spuštěnou a čekající
    python -m scripts.migrate --baseline   # označí všechny současné soubory jako spuštěné, nic nespustí

Je-li schema_migration prázdná, první běh udělá baseline automaticky.
"""

import logging
import sys
import time
from pathlib import Path

from api.config import settings
from api.database import engine

MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / "migrations"

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS schema_migration (
  filename VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
"""
INSERT = "INSERT INTO schema_migration (filename) VALUES (%s) ON CONFLICT DO NOTHING"
LAST = "SELECT filename, applied_at FROM schema_migration ORDER BY applied_at DESC, filename DESC LIMIT 1"

logger = logging.getLogger("migrate")


def main(args: list[str]) -> None:
    started = time.perf_counter()
    if not MIGRATIONS_DIR.is_dir():
        logger.error("složka s migracemi nenalezena: %s", MIGRATIONS_DIR)
        sys.exit(1)
    files = sorted(MIGRATIONS_DIR.glob("[0-9]*.sql"))

    raw = engine.raw_connection()
    try:
        pg = raw.driver_connection
        assert pg is not None
        pg.autocommit = True  # transakce řídí níže pg.transaction()
        pg.execute(CREATE_TABLE)
        applied = {row[0] for row in pg.execute("SELECT filename FROM schema_migration")}
        pending = [f for f in files if f.name not in applied]
        logger.info("složka %s: %d souborů, v DB zapsáno %d", MIGRATIONS_DIR, len(files), len(applied))

        auto_baseline = not applied and "--status" not in args
        if "--baseline" in args or auto_baseline:
            reason = "schema_migration je prázdná" if auto_baseline else "--baseline"
            logger.info("baseline (%s): označuji %d souborů jako spuštěné, nic nespouštím", reason, len(pending))
            with pg.transaction():
                for f in pending:
                    pg.execute(INSERT, (f.name,))
                    logger.debug("označeno %s", f.name)
        elif not pending:
            logger.info("žádná čekající migrace")
        else:
            logger.info("čeká %d: %s", len(pending), ", ".join(f.name for f in pending))
            if "--status" not in args:
                for f in pending:
                    logger.info("spouštím %s", f.name)
                    t = time.perf_counter()
                    try:
                        with pg.transaction():
                            pg.execute(f.read_text(encoding="utf-8"))  # bez parametrů = víc příkazů v jednom souboru OK
                            pg.execute(INSERT, (f.name,))
                    except Exception:
                        logger.exception("migrace %s selhala, rollback, nic z ní se neuložilo", f.name)
                        sys.exit(1)
                    logger.info("hotovo %s za %d ms", f.name, (time.perf_counter() - t) * 1000)

        last = pg.execute(LAST).fetchone()
        if last:
            logger.info(
                "poslední spuštěná: %s (%s), celkem %.1f s",
                last[0], f"{last[1]:%Y-%m-%d %H:%M}", time.perf_counter() - started,
            )
        else:
            logger.info("žádná migrace zatím nezapsaná")
    finally:
        raw.close()


if __name__ == "__main__":
    logging.basicConfig(
        level=settings.log_level.upper(),
        format="%(asctime)s %(levelname)s [%(process)d] %(name)s: %(message)s",
    )
    main(sys.argv[1:])

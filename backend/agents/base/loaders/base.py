"""Základní třída a typy pro data loadery."""

from abc import ABC, abstractmethod
from enum import StrEnum
from pathlib import Path


class SourceType(StrEnum):
    """Typy podporovaných datových zdrojů."""

    MARKDOWN = "md"
    TEXT = "txt"
    CSV = "csv"
    DOCS = "docs"  # Pro budoucí Google Docs API


class BaseLoader(ABC):
    """Abstraktní základní třída pro všechny loadery."""

    @abstractmethod
    def load(self, source: str) -> str:
        """Načte data ze zdroje a vrátí text."""
        pass

    @staticmethod
    def validate_file_exists(file_path: str) -> Path:
        """Ověří, že soubor existuje."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Soubor nenalezen: {file_path}")
        return path


class DataLoader:
    """Univerzální loader s autodetekcí typu souboru."""

    def __init__(self) -> None:
        from agents.base.loaders.markdown import MarkdownLoader
        # from agents.base.loaders.text import TextLoader
        # from agents.base.loaders.csv_loader import CSVLoader

        self._loaders = {
            SourceType.MARKDOWN: MarkdownLoader(),
            # SourceType.TEXT: TextLoader(),
            # SourceType.CSV: CSVLoader(),
        }

    def _detect_type(self, source: str) -> SourceType:
        """Detekuje typ souboru podle přípony."""
        path = Path(source)
        suffix: str = path.suffix.lower()

        type_mapping: dict[str, SourceType] = {
            ".md": SourceType.MARKDOWN,
            ".csv": SourceType.CSV,
            ".txt": SourceType.TEXT,
        }

        return type_mapping.get(suffix, SourceType.TEXT)

    def load(self, source: str, source_type: SourceType | None = None) -> str:
        """
        Načte data ze zdroje.

        Args:
            source: Cesta k souboru
            source_type: Typ zdroje (volitelné, autodetekce podle přípony)

        Returns:
            Načtený text
        """
        if source_type is None:
            source_type = self._detect_type(source)

        loader = self._loaders.get(source_type)
        if not loader:
            raise ValueError(f"Nepodporovaný typ zdroje: {source_type}")

        return loader.load(source)

    def load_multiple(self, sources: list[str]) -> str:
        """
        Načte více souborů a spojí jejich obsah.

        Args:
            sources: Seznam cest k souborům

        Returns:
            Spojený text ze všech zdrojů
        """
        ...

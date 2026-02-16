"""Loader pro Markdown soubory."""

from agents.base.loaders.base import BaseLoader
import pathlib


class MarkdownLoader(BaseLoader):
    """Načítá Markdown soubory."""

    def load(self, source: str) -> str:
        """
        Načte obsah Markdown souboru.

        Args:
            source: Cesta k .md souboru

        Returns:
            Obsah souboru jako text
        """
        path: pathlib.Path = self.validate_file_exists(source)

        if path.suffix.lower() != ".md":
            raise ValueError(f"Očekáván .md soubor, ale dostal: {path.suffix}")

        with pathlib.Path(path).open("r", encoding="utf-8") as f:
            return f.read()

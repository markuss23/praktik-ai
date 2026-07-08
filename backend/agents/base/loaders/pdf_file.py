"""Loader pro PDF soubory."""

from pathlib import Path

from pypdf import PdfReader

from agents.base.loaders.base import BaseLoader


class PdfLoader(BaseLoader):
    """Načítá obsah z PDF souborů."""

    def load(self, source: str) -> str:
        """
        Načte textový obsah PDF souboru.

        Args:
            source: Cesta k .pdf souboru

        Returns:
            Obsah souboru jako text
        """

        path: Path = self.validate_file_exists(source)
        if path.suffix.lower() != ".pdf":
            raise ValueError(f"Očekáván .pdf soubor, ale dostal: {path.suffix}")

        reader = PdfReader(str(path))
        pages_text = [page.extract_text() or "" for page in reader.pages]

        return "\n".join(text for text in pages_text if text.strip())

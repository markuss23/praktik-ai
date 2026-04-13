from pathlib import Path

from docx import Document
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph

from agents.base.loaders.base import BaseLoader


class DocxLoader(BaseLoader):
    """Načítá obsah z DOCX souborů."""

    def load(self, source: str) -> str:
        """
        Načte obsah DOCX souboru včetně tabulek ve správném pořadí.

        Args:
            source: Cesta k .docx souboru

        Returns:
            Obsah souboru jako text
        """

        path: Path = self.validate_file_exists(source)

        if path.suffix.lower() != ".docx":
            raise ValueError(f"Očekáván .docx soubor, ale dostal: {path.suffix}")

        document: Document = Document(path)
        full_text = []

        for block in document.element.body:
            if block.tag == qn("w:p"):
                para = Paragraph(block, document)
                if para.text.strip():
                    full_text.append(para.text)
            elif block.tag == qn("w:tbl"):
                table = Table(block, document)
                for row in table.rows:
                    cells = [cell.text.strip() for cell in row.cells]
                    full_text.append(" | ".join(cells))

        return "\n".join(full_text)

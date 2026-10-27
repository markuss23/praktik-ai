"""Základní třída pro data loadery a převod libovolného souboru na text."""

import io
from abc import ABC, abstractmethod
from pathlib import Path

from markitdown import MarkItDown, StreamInfo
from openai import OpenAI

AUDIO_VIDEO = (".mp3", ".mp4", ".m4a", ".wav", ".webm", ".mpeg", ".mpga")
# Přípony, které MarkItDown (s nainstalovanými extras) umí převést na text
MARKITDOWN = (
    ".pdf", ".docx", ".pptx", ".xlsx", ".xls", ".csv", ".html", ".htm",
    ".txt", ".text", ".md", ".markdown", ".json", ".jsonl",
    ".epub", ".ipynb", ".zip", ".jpg", ".jpeg", ".png",
)  # fmt: skip
SUPPORTED_EXTENSIONS = AUDIO_VIDEO + MARKITDOWN
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB, limit přepisu audia v OpenAI


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


def file_to_text(content: bytes, filename: str) -> str:
    """Převede obsah souboru na text (Markdown).

    Audio/video se přepíše přes OpenAI, ostatní formáty (PDF, DOCX, PPTX,
    XLSX, HTML, obrázky, ...) převede MarkItDown; obrázky popíše gpt-4o.
    """
    client = OpenAI()
    suffix = Path(filename).suffix.lower()

    if suffix in AUDIO_VIDEO:
        return client.audio.transcriptions.create(
            model="gpt-4o-transcribe",
            file=(filename, content),
        ).text

    md = MarkItDown(llm_client=client, llm_model="gpt-4o")
    return md.convert_stream(
        io.BytesIO(content),
        stream_info=StreamInfo(extension=suffix, filename=filename),
    ).text_content

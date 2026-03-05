import httpx

from api.config import settings


def _filer_url(path: str) -> str:
    """Sestaví plnou URL na Filer endpoint."""
    base = settings.seaweedfs.filer_url.rstrip("/")
    path = path.lstrip("/")
    return f"{base}/{path}"


def upload_file(
    remote_path: str,
    content: bytes,
    filename: str,
    content_type: str = "application/octet-stream",
) -> str:
    """
    Nahraje soubor do SeaweedFS Filer.

    Args:
        remote_path: Cesta v SeaweedFS, např. „courses/42/soubor.pdf"
        content:     Binární obsah souboru
        filename:    Původní název souboru (pro Content-Disposition)
        content_type: MIME typ souboru

    Returns:
        Plná URL souboru na Fileru (pro uložení do DB jako file_path)

    Raises:
        httpx.HTTPStatusError: Pokud Filer vrátí chybu
    """
    url = _filer_url(remote_path)
    with httpx.Client() as client:
        # SeaweedFS Filer vyžaduje multipart/form-data (jako curl -F "file=@...")
        response = client.post(
            url,
            files={"file": (filename, content, content_type)},
        )
        response.raise_for_status()
    return url


def download_file(remote_path: str) -> bytes:
    """
    Stáhne soubor ze SeaweedFS Filer.

    Args:
        remote_path: Cesta v SeaweedFS, např. „courses/42/soubor.pdf"

    Returns:
        Binární obsah souboru

    Raises:
        httpx.HTTPStatusError: Pokud soubor neexistuje nebo Filer vrátí chybu
    """
    url = _filer_url(remote_path)
    with httpx.Client() as client:
        response = client.get(url)
        response.raise_for_status()
    return response.content


def delete_file(remote_path: str) -> None:
    """
    Smaže soubor ze SeaweedFS Filer.

    Args:
        remote_path: Cesta v SeaweedFS, např. „courses/42/soubor.pdf"

    Raises:
        httpx.HTTPStatusError: Pokud Filer vrátí chybu
    """
    url = _filer_url(remote_path)
    with httpx.Client() as client:
        response = client.delete(url)
        response.raise_for_status()

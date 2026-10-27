"""
Controllery pro obrázky vkládané v rich-text editoru.
"""

import mimetypes
import uuid

import httpx
from fastapi import HTTPException, UploadFile
from fastapi.responses import Response

from api.storage import seaweedfs
from api.src.editor_images.schemas import EditorImageUploaded

_REMOTE_PREFIX = "editor-images"
_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
_ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
}


async def upload_editor_image(file: UploadFile) -> EditorImageUploaded:
    """Nahraje obrázek vložený v rich-text editoru do SeaweedFS."""
    content_type = file.content_type or ""
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Nepodporovaný typ obrázku")

    content = await file.read()
    if len(content) > _MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Obrázek nesmí být větší než 10 MB")

    ext = mimetypes.guess_extension(content_type) or ""
    filename = f"{uuid.uuid4().hex}{ext}"
    remote_path = f"{_REMOTE_PREFIX}/{filename}"

    seaweedfs.upload_file(remote_path, content, filename, content_type)

    return EditorImageUploaded(url=f"/api/v1/editor-images/{filename}")


def get_editor_image(filename: str) -> Response:
    """Vrátí obrázek nahraný přes rich-text editor."""
    if "/" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Neplatný název souboru")

    remote_path = f"{_REMOTE_PREFIX}/{filename}"
    try:
        content = seaweedfs.download_file(remote_path)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=404, detail="Obrázek nenalezen") from e

    media_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    return Response(content=content, media_type=media_type)

from fastapi import APIRouter, File, UploadFile
from fastapi.responses import Response

from api.dependencies import require_role
from api.src.editor_images.controllers import get_editor_image, upload_editor_image
from api.src.editor_images.schemas import EditorImageUploaded

router = APIRouter(
    prefix="/editor-images",
    tags=["Editor Images"],
    dependencies=[require_role("user")],
)
public_router = APIRouter(prefix="/editor-images", tags=["Editor Images"])


@router.post("", operation_id="upload_editor_image")
async def endp_upload_editor_image(
    file: UploadFile = File(...),  # noqa: B008
) -> EditorImageUploaded:
    return await upload_editor_image(file)


@public_router.get("/{filename}", operation_id="get_editor_image")
async def endp_get_editor_image(filename: str) -> Response:
    """Veřejný endpoint — obrázky se v editoru zobrazují jako <img src=...> bez auth hlaviček."""
    return get_editor_image(filename)

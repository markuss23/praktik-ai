"""
Controllery pro náhledový obrázek kurzu.

Každý obrázek (nahraný z počítače i vygenerovaný AI) se normalizuje na 1280×720
WebP: ořízne se na střed do poměru 16:9 a zmenší / zvětší. Frontend posílá už
oříznutý výřez, normalizace tady je pojistka pro libovolný vstup.
"""

import io
import uuid

import httpx
from fastapi import HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image, ImageOps
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from api import models
from api.authorization import validate_owner_or_superadmin
from api.src.common.utils import assert_course_editable, get_or_404
from api.src.courses.schemas import CourseImage, course_image_url
from api.storage import seaweedfs

COURSE_IMAGE_SIZE = (1280, 720)
_REMOTE_PREFIX = "course-images"
_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
_ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
_WEBP_QUALITY = 85


def normalize_course_image(content: bytes) -> bytes:
    """Převede obrázek na 1280×720 WebP (ořez na střed do 16:9 + změna velikosti).

    Průhlednost se slije na bílé pozadí, aby PNG s alfou nevypadalo v kartě černě.

    Raises:
        HTTPException: 415 pro nepodporovaný formát, 400 pro nečitelný obrázek.
    """
    try:
        with Image.open(io.BytesIO(content)) as source:
            if source.format not in _ALLOWED_FORMATS:
                raise HTTPException(
                    status_code=415, detail="Podporované formáty jsou JPG, PNG a WebP"
                )
            image = ImageOps.exif_transpose(source)
            if image.mode in ("RGBA", "LA", "PA") or "transparency" in image.info:
                rgba = image.convert("RGBA")
                image = Image.new("RGB", rgba.size, (255, 255, 255))
                image.paste(rgba, mask=rgba.getchannel("A"))
            else:
                image = image.convert("RGB")

            fitted = ImageOps.fit(image, COURSE_IMAGE_SIZE, Image.Resampling.LANCZOS)
    except HTTPException:
        raise
    except (OSError, ValueError, Image.DecompressionBombError) as e:
        raise HTTPException(status_code=400, detail="Soubor není platný obrázek") from e

    output = io.BytesIO()
    fitted.save(output, format="WEBP", quality=_WEBP_QUALITY, method=6)
    return output.getvalue()


def store_course_image(db: Session, course: models.Course, normalized: bytes) -> str:
    """Uloží normalizovaný obrázek do SeaweedFS a nastaví ho kurzu jako náhled.

    Každá verze dostane nový název souboru (kvůli cache, viz `course_image_url`),
    předchozí soubor se po uložení smaže.

    Returns:
        Cestu nového obrázku v SeaweedFS.
    """
    filename = f"cover-{uuid.uuid4().hex[:12]}.webp"
    remote_path = f"{_REMOTE_PREFIX}/{course.course_id}/{filename}"
    try:
        seaweedfs.upload_file(remote_path, normalized, filename, "image/webp")
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=502, detail="Úložiště souborů je nedostupné"
        ) from e

    previous = course.image_path
    course.image_path = remote_path
    db.commit()

    if previous and previous != remote_path:
        _delete_quietly(previous)
    return remote_path


def _delete_quietly(remote_path: str) -> None:
    """Smaže starý obrázek; když se to nepovede, zůstane v úložišti jen jako sirotek."""
    try:
        seaweedfs.delete_file(remote_path)
    except httpx.HTTPError:
        pass


async def upload_course_image(
    db: Session, course_id: int, file: UploadFile, user: models.User
) -> CourseImage:
    """Nahraje vlastní náhledový obrázek kurzu (vlastník nebo superadmin)."""
    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")
    validate_owner_or_superadmin(course, user, "kurz")
    # Obrázek je součást kurzu — po odeslání ke schválení se mění jen přes vrácení do úprav
    assert_course_editable(course)

    content = await file.read(_MAX_FILE_SIZE + 1)
    if len(content) > _MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Obrázek nesmí být větší než 10 MB")

    # Změna velikosti velké fotky trvá stovky ms — mimo event loop.
    normalized = await run_in_threadpool(normalize_course_image, content)
    store_course_image(db, course, normalized)
    return CourseImage(image_url=course_image_url(course.course_id, course.image_path))


def delete_course_image(db: Session, course_id: int, user: models.User) -> None:
    """Odebere náhledový obrázek, kurz se vrátí k výchozímu."""
    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")
    validate_owner_or_superadmin(course, user, "kurz")
    assert_course_editable(course)

    previous = course.image_path
    if previous is None:
        return
    course.image_path = None
    db.commit()
    _delete_quietly(previous)


def get_course_image(db: Session, course_id: int, filename: str) -> Response:
    """Vrátí náhledový obrázek kurzu (veřejně, zobrazuje se jako <img src=...>).

    Vrací se vždy aktuální obrázek. Dlouhou cache dostane jen URL aktuální verze
    (název souboru z `course_image_url`) — starý odkaz, třeba z dřív načteného
    seznamu kurzů, ukáže nový obrázek, ale do cache se pod ním neuloží.
    """
    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen")
    if not course.image_path:
        raise HTTPException(status_code=404, detail="Kurz nemá náhledový obrázek")

    try:
        content = seaweedfs.download_file(course.image_path)
    except httpx.HTTPError as e:
        if isinstance(e, httpx.HTTPStatusError) and e.response.status_code == 404:
            raise HTTPException(
                status_code=404, detail="Obrázek už není v úložišti"
            ) from e
        raise HTTPException(
            status_code=502, detail="Úložiště souborů je nedostupné"
        ) from e

    is_current = course.image_path.rsplit("/", 1)[-1] == filename
    cache_control = "public, max-age=31536000, immutable" if is_current else "no-cache"
    return Response(
        content=content,
        media_type="image/webp",
        headers={"Cache-Control": cache_control},
    )

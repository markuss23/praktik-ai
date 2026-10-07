from pydantic import BaseModel


class EditorImageUploaded(BaseModel):
    url: str

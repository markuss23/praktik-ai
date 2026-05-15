"""
Controllers pro práci s veřejnými materiály (pub_resource).
Rozděleno podle CRUD operací.
"""

from api.src.resources.controllers.create import (
    create_resource,
    upload_resource_file,
)
from api.src.resources.controllers.read import (
    get_resources,
    get_resource,
    get_resource_files,
)

__all__ = [
    # Create operations
    "create_resource",
    "upload_resource_file",
    # Read operations
    "get_resources",
    "get_resource",
    "get_resource_files",
]

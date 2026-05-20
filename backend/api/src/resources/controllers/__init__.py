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

from api.src.resources.controllers.delete import (
    delete_resource,
    delete_resource_file,
)

from api.src.resources.controllers.update import (
    update_resource,
    update_resource_status,
    update_resource_public_state,
)

__all__ = [
    # Create operations
    "create_resource",
    "upload_resource_file",
    # Read operations
    "get_resources",
    "get_resource",
    "get_resource_files",
    # Delete operations
    "delete_resource",
    "delete_resource_file",
    # Update operations
    "update_resource",
    "update_resource_status",
    "update_resource_public_state",
]

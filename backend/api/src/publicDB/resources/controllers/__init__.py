"""
Controllers pro práci s veřejnými materiály (pub_resource).
Rozděleno podle CRUD operací.
"""

from api.src.publicDB.resources.controllers.create import (
    create_resource,
    upload_resource_file,
    create_resource_fork,
)
from api.src.publicDB.resources.controllers.read import (
    get_resources,
    get_resource,
    get_resource_files,
)

from api.src.publicDB.resources.controllers.delete import (
    delete_resource,
    delete_resource_file,
)

from api.src.publicDB.resources.controllers.update import (
    update_resource,
    update_resource_status,
    update_resource_public_state,
)

__all__ = [
    # Create operations
    "create_resource",
    "upload_resource_file",
    "create_resource_fork",
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

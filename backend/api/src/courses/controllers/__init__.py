"""
Controllers pro práci s kurzy.
Rozděleno podle CRUD operací.
"""

from api.src.courses.controllers.create import (
    create_course,
    upload_course_file,
    create_course_link,
)
from api.src.courses.controllers.read import (
    get_courses,
    get_course,
    get_course_files,
    get_course_links,
)
from api.src.courses.controllers.update import (
    update_course,
)
from api.src.courses.controllers.delete import (
    delete_course,
    delete_course_file,
    delete_course_link,
)

__all__ = [
    # Create operations
    "create_course",
    "upload_course_file",
    "create_course_link",
    # Read operations
    "get_courses",
    "get_course",
    "get_course_files",
    "get_course_links",
    # Update operations
    "update_course",
    # Delete operations
    "delete_course",
    "delete_course_file",
    "delete_course_link",
]

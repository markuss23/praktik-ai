from typing import Annotated

from fastapi import Query


INCLUDE_INACTIVE_ANNOTATION = Annotated[
    bool, Query(description="Include inactive records")
]

TEXT_SEARCH_ANNOTATION = Annotated[
    str | None, Query(description="Text to search for")
]

IS_PUBLISHED_ANNOTATION = Annotated[
    bool, Query(description="Filter by published status")
]

COURSE_BLOCK_ID_ANNOTATION = Annotated[
    int | None, Query(description="Filter by course block ID")
]

COURSE_TARGET_ID_ANNOTATION = Annotated[
    int | None, Query(description="Filter by course target ID")
]

COURSE_SUBJECT_ID_ANNOTATION = Annotated[
    int | None, Query(description="Filter by course subject ID")
]

COURSE_STATUS_ANNOTATION = Annotated[
    str | None, Query(description="Filter by course status")
]
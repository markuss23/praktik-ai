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
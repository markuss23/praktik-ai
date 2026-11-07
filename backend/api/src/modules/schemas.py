from datetime import datetime
from pydantic import Field
from api.src.common.schemas import ORMModel
from api.src.activities.schemas import LearnBlock
from api.src.catalogs.schemas import BloomLevel, KrauuCompetence, NeuroPrinciple


class ModuleBase(ORMModel):
    title: str = Field(min_length=1, max_length=200)
    perex: str = Field(default="", max_length=255)
    neuro_principle_ids: list[int] = Field(
        min_length=1,
        description="ID neurovědních principů navázaných na modul (lze vybrat více, alespoň jeden)",
    )


BLOOM_IDS_FIELD = Field(
    min_length=1,
    description="ID Bloomových úrovní (lze vybrat více, alespoň jedna)",
)

KRAUU_IDS_FIELD = Field(
    min_length=1,
    description="ID KRAUU kompetencí (lze vybrat více, alespoň jedna; oblasti vybírat nelze)",
)


class ModuleCreate(ModuleBase):
    course_id: int = Field(description="FK na course.course_id")
    krauu_competence_ids: list[int] = KRAUU_IDS_FIELD
    bloom_level_ids: list[int] = BLOOM_IDS_FIELD


class ModuleUpdate(ModuleBase):
    # is_active: bool = True
    krauu_competence_ids: list[int] = KRAUU_IDS_FIELD
    bloom_level_ids: list[int] = BLOOM_IDS_FIELD


class Module(ModuleBase):
    module_id: int
    course_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    learn_blocks: list[LearnBlock] = []
    neuro_principle_ids: list[int] = Field(validation_alias="neuro_principle_id_list")
    neuro_principles: list[NeuroPrinciple] = Field(
        default=[], validation_alias="neuro_principle_list"
    )
    krauu_competences: list[KrauuCompetence] = Field(
        default=[], validation_alias="krauu_competence_list"
    )
    bloom_levels: list[BloomLevel] = Field(
        default=[], validation_alias="bloom_level_list"
    )

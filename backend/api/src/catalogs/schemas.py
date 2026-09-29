from api.src.common.schemas import ORMModel


class CourseBlock(ORMModel):
    block_id: int
    code: str
    name: str
    description: str


class CourseTarget(ORMModel):
    target_id: int
    code: str
    name: str
    description: str


class CourseSubject(ORMModel):
    subject_id: int
    code: str
    name: str


class CourseRequirement(ORMModel):
    requirement_id: int
    code: str
    name: str
    description: str


class CourseEqfLevel(ORMModel):
    eqf_level_id: int
    code: str
    name: str
    description: str


class CourseType(ORMModel):
    type_id: int
    code: str
    name: str
    description: str


class NeuroPrinciple(ORMModel):
    principle_id: int
    code: str
    name: str
    description: str


class KrauuCompetence(ORMModel):
    krauu_id: int
    parent_id: int | None = None
    code: str
    name: str
    description: str


class BloomLevel(ORMModel):
    bloom_id: int
    code: str
    name: str
    description: str


class CrossSubject(ORMModel):
    cross_id: int
    code: str
    name: str
    description: str

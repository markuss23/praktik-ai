"""Union AssessmentSettings vybírá zleva doprava první shodu. Nový formát se samými
defaulty by mohl „spolknout“ cizí settings. Test hlídá, že defaulty každého formátu
projdou unionem jako vlastní třída.

Spuštění: cd backend && uv run pytest api/src/assessments
"""

from pydantic import TypeAdapter, ValidationError

from api.src.assessments.schemas import AssessmentSettings
from api.src.assessments.utils import FORMATS


def test_defaults_round_trip_to_own_class():
    union = TypeAdapter(AssessmentSettings)
    for code, fmt in FORMATS.items():
        try:
            defaults = fmt.Settings().model_dump()
        except ValidationError:
            continue  # povinná pole (pretest): samé defaulty nemá, nic nespolkne
        assert type(union.validate_python(defaults)) is fmt.Settings, code

"""AI styl z profilu studenta pro AI formáty v kontextu practice.

Student ho zvolí při startu session (`use_profile_style`). Mimo practice se ignoruje.
Text se ukládá do state.ai_style, takže platí pro celou session.
"""

from sqlalchemy.orm import Session

from agents.mentor.nodes.generate_answer import ANSWER_LENGTH
from agents.mentor.nodes.load_learn_block_data import format_ai_style
from api import models
from api.enums import AssessmentContext
from api.src.users.controllers import get_user_ai_style


def profile_ai_style(
    db: Session, user: models.User, course_assessment: models.CourseAssessment
) -> str:
    """Blok do system promptu, nebo "" když se styl nepoužije."""
    if course_assessment.context != AssessmentContext.practice:
        return ""
    options = get_user_ai_style(db, user.user_id)
    text = (
        "\n\nSTYL KOMUNIKACE (zvolil si ho student; mění jen podání textu pro studenta, "
        "ne hodnocení ani formát výstupu):\n" + format_ai_style(options)
    )
    # Osa Informační hustota -> délka jako u mentora
    length = next((ANSWER_LENGTH[o.code] for o in options if o.code in ANSWER_LENGTH), None)
    if length:
        text += f"\n- Text pro studenta maximálně {length} znaků"
    return text

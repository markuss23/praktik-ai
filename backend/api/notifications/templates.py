"""
Šablony (předmět + text) e-mailů o událostech kurzu.
"""

from typing import Literal

from api.enums import NotificationEvent

# Vztah příjemce ke kurzu – určuje variantu textu a odkaz v e-mailu
Audience = Literal["owner", "superadmin", "reviewer", "approver", "student"]

# Odkazy ({url}, {profile_url}) jsou zatím z textů vynechané; kontext je dál obsahuje,
# takže je lze do šablon kdykoliv vrátit.
_FOOTER_OPTIONAL = "\n\nTyto notifikace můžete vypnout v nastavení profilu."
_FOOTER_MANDATORY = "\n\nTento e-mail vyžaduje vaši akci, proto ho nelze vypnout."

# (událost, audience) -> (předmět, tělo)
TEMPLATES: dict[tuple[NotificationEvent, Audience], tuple[str, str]] = {
    (NotificationEvent.course_generated, "owner"): (
        "Kurz „{title}“ je vygenerován",
        "Dobrý den,\n\ngenerování kurzu „{title}“ bylo úspěšně dokončeno. "
        "Nyní si ho můžete prohlédnout a upravit.",
    ),
    (NotificationEvent.course_generation_failed, "owner"): (
        "Generování kurzu „{title}“ selhalo",
        "Dobrý den,\n\ngenerování kurzu „{title}“ se nezdařilo. Zkuste ho prosím spustit znovu.",
    ),
    (NotificationEvent.course_generation_failed, "superadmin"): (
        "[Diagnostika] Generování kurzu „{title}“ selhalo",
        "Dobrý den,\n\ngenerování kurzu „{title}“ (ID {course_id}, vlastník {owner}) se nezdařilo. "
        "Podrobnosti najdete v logu API.",
    ),
    (NotificationEvent.course_submitted, "reviewer"): (
        "Kurz „{title}“ čeká na schválení",
        "Dobrý den,\n\nuživatel {owner} odeslal kurz „{title}“ ke schválení.",
    ),
    (NotificationEvent.course_approved, "owner"): (
        "Kurz „{title}“ byl schválen",
        "Dobrý den,\n\nváš kurz „{title}“ byl schválen uživatelem {actor}. "
        "Nyní ho můžete publikovat.",
    ),
    (NotificationEvent.course_rejected, "owner"): (
        "Kurz „{title}“ byl zamítnut",
        "Dobrý den,\n\nváš kurz „{title}“ byl uživatelem {actor} vrácen k přepracování.\n\n"
        "Připomínky garanta najdete v kurzu.",
    ),
    (NotificationEvent.course_approval_revoked, "owner"): (
        "Schválení kurzu „{title}“ bylo zrušeno",
        "Dobrý den,\n\nschválení vašeho kurzu „{title}“ zrušil uživatel {actor} "
        "a kurz byl stažen z publikace.",
    ),
    (NotificationEvent.course_approval_revoked, "approver"): (
        "Schválení kurzu „{title}“ bylo zrušeno",
        "Dobrý den,\n\nschválení kurzu „{title}“, který jste dříve schválil(a), "
        "zrušil uživatel {actor}.",
    ),
    (NotificationEvent.course_archived, "student"): (
        "Kurz „{title}“ byl archivován",
        "Dobrý den,\n\nkurz „{title}“, do kterého jste zapsán(a), byl archivován.",
    ),
}


def render_email(
    event: NotificationEvent,
    audience: Audience,
    context: dict[str, str],
    mandatory: bool,
) -> tuple[str, str]:
    """
    Sestaví předmět a textové tělo e-mailu pro danou událost a příjemce.

    Args:
        event: Událost kurzu (E1–E7).
        audience: Vztah příjemce ke kurzu, určuje variantu textu.
        context: Hodnoty pro šablonu: title, course_id, actor, owner, url a profile_url
            (url a profile_url šablony zatím nepoužívají).
        mandatory: True, pokud příjemce notifikaci nemůže vypnout. Určuje patičku
            (u volitelných upozornění, že ji lze vypnout v nastavení profilu).

    Returns:
        Dvojici (předmět, tělo).

    Raises:
        KeyError: Pro kombinaci událost × audience neexistuje šablona (chyba v kódu).
    """
    subject, body = TEMPLATES[(event, audience)]
    body += _FOOTER_MANDATORY if mandatory else _FOOTER_OPTIONAL
    return subject.format(**context), body.format(**context)

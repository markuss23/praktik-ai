"""
Nízkoúrovňové odesílání e-mailů přes SMTP.
"""

import logging
import smtplib
from email.message import EmailMessage

from api.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body_text: str, body_html: str | None = None) -> bool:
    """
    Odešle jeden e-mail jednomu příjemci přes SMTP server nastavený v settings.smtp.

    Každý příjemce dostává vlastní e-mail, takže v hlavičce To: nikdy nevidí adresy
    ostatních. Funkce je synchronní (blokující) a volá se z background tasku nebo
    vlákna. Výjimky neprobublávají, selhání se pouze zaloguje, aby neovlivnilo
    změnu stavu kurzu ani odeslání ostatním příjemcům.

    Args:
        to: E-mailová adresa jediného příjemce.
        subject: Předmět e-mailu.
        body_text: Textová (plain-text) verze těla e-mailu.
        body_html: Volitelná HTML verze těla, posílá se jako alternativa k textu.

    Returns:
        True při úspěchu nebo když je odesílání vypnuté (SMTP__ENABLED=false),
        False při chybě odeslání.
    """
    cfg = settings.smtp
    if not cfg.enabled:
        return True

    msg = EmailMessage()
    msg["From"] = cfg.sender
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body_text)
    if body_html:
        msg.add_alternative(body_html, subtype="html")

    try:
        with smtplib.SMTP(cfg.host, cfg.port, timeout=10) as smtp:
            if cfg.use_tls:
                smtp.starttls()
            if cfg.username:
                smtp.login(cfg.username, cfg.password or "")
            smtp.send_message(msg)
        return True
    except Exception:
        logger.exception("Odeslání e-mailu na %s selhalo", to)
        return False

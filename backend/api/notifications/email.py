"""
Nízkoúrovňové odesílání e-mailů přes SMTP.
"""

import logging
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage

from api.config import settings
from api.enums import EmailStatus

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SendResult:
    """
    Výsledek pokusu o odeslání e-mailu.

    Attributes:
        status: sent = odesláno, failed = chyba SMTP, skipped = odesílání vypnuté.
        error: Text chyby, pokud odeslání selhalo.
    """

    status: EmailStatus
    error: str | None = None

    @property
    def ok(self) -> bool:
        """True, pokud odeslání neselhalo (sent i skipped jsou v pořádku)."""
        return self.status != EmailStatus.failed


def send_email(to: str, subject: str, body_text: str, body_html: str | None = None) -> SendResult:
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
        SendResult se stavem sent, skipped (SMTP__ENABLED=false) nebo failed
        včetně textu chyby.
    """
    cfg = settings.smtp
    if not cfg.enabled:
        return SendResult(EmailStatus.skipped)

    msg = EmailMessage()
    msg["From"] = cfg.sender
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body_text)
    if body_html:
        msg.add_alternative(body_html, subtype="html")

    smtp_class = smtplib.SMTP_SSL if cfg.use_ssl else smtplib.SMTP
    try:
        with smtp_class(cfg.host, cfg.port, timeout=10) as smtp:
            if cfg.use_tls and not cfg.use_ssl:
                smtp.starttls()
            if cfg.username:
                smtp.login(cfg.username, cfg.password or "")
            smtp.send_message(msg)
        return SendResult(EmailStatus.sent)
    except Exception as exc:
        logger.exception("Odeslání e-mailu na %s selhalo", to)
        return SendResult(EmailStatus.failed, f"{type(exc).__name__}: {exc}")

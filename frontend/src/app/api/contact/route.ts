import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

type ContactPayload = {
  name?: string;
  email?: string;
  role?: string;
  topic?: string;
  subject?: string;
  message?: string;
  consent?: boolean;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  let body: ContactPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  const email = (body.email ?? '').trim();
  const role = (body.role ?? '').trim();
  const topic = (body.topic ?? '').trim();
  const subject = (body.subject ?? '').trim();
  const message = (body.message ?? '').trim();

  if (!name || !email || !subject || !message) {
    return NextResponse.json(
      { error: 'Vyplňte prosím všechna povinná pole.' },
      { status: 400 }
    );
  }
  if (!isEmail(email)) {
    return NextResponse.json({ error: 'Zadejte platný e-mail.' }, { status: 400 });
  }
  if (!body.consent) {
    return NextResponse.json(
      { error: 'Pro odeslání je nutný souhlas se zpracováním údajů.' },
      { status: 400 }
    );
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.CONTACT_FROM_EMAIL ?? user;
  const to = process.env.CONTACT_TO_EMAIL ?? 'dejduu@gmail.com';

  if (!host || !user || !pass || !from) {
    console.error(
      '[contact] Chybí SMTP konfigurace (SMTP_HOST / SMTP_USER / SMTP_PASSWORD / CONTACT_FROM_EMAIL).'
    );
    return NextResponse.json(
      { error: 'Server není nakonfigurován pro odesílání e-mailů.' },
      { status: 500 }
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h2 style="color:#047857; margin-bottom: 16px;">Nová zpráva z kontaktního formuláře</h2>
      <table style="border-collapse: collapse;">
        <tr><td style="padding:4px 12px 4px 0; color:#6b7280;">Jméno</td><td>${escapeHtml(name)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0; color:#6b7280;">E-mail</td><td>${escapeHtml(email)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0; color:#6b7280;">Role</td><td>${escapeHtml(role)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0; color:#6b7280;">Téma</td><td>${escapeHtml(topic)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0; color:#6b7280;">Předmět</td><td>${escapeHtml(subject)}</td></tr>
      </table>
      <hr style="margin:16px 0; border:none; border-top:1px solid #e5e7eb;" />
      <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
    </div>
  `;

  const text = [
    `Nová zpráva z kontaktního formuláře`,
    ``,
    `Jméno: ${name}`,
    `E-mail: ${email}`,
    `Role: ${role}`,
    `Téma: ${topic}`,
    `Předmět: ${subject}`,
    ``,
    message,
  ].join('\n');

  try {
    await transporter.sendMail({
      from: `"Praktik-AI kontakt" <${from}>`,
      to,
      replyTo: `"${name}" <${email}>`,
      subject: `[Kontakt Praktik-AI] ${subject}`,
      text,
      html,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[contact] sendMail failed:', err);
    return NextResponse.json(
      { error: 'E-mail se nepodařilo odeslat. Zkuste to prosím znovu později.' },
      { status: 502 }
    );
  }
}

'use client';

import { useState } from 'react';
import { motion } from 'motion/react';

const EMAIL_CONTACTS = [
  { label: 'Obecné dotazy', value: 'info@praktik-ai.cz' },
  { label: 'Technická podpora', value: 'podpora@praktik-ai.cz' },
  { label: 'Pro učitele a školy', value: 'ucitele@praktik-ai.cz' },
];

const PHONE_CONTACTS = [
  { label: 'Telefon', value: '+420 475 286 222' },
  { label: 'Úřední hodiny', value: 'Po–Pá, 9:00–16:00' },
];

const ADDRESS_CONTACTS = [
  { label: 'Adresa', value: 'Pasteurova 3544/1, 400 96 Ústí nad Labem' },
  { label: 'Datová schránka', value: '6nhj9dq' },
];

const ROLE_OPTIONS = ['Student', 'Učitel', 'Škola / instituce', 'Jiné'];
const TOPIC_OPTIONS = ['Obecný dotaz', 'Technická podpora', 'Spolupráce', 'Zpětná vazba'];

const cardHover = {
  scale: 1.02,
  y: -4,
  transition: { type: 'spring' as const, stiffness: 300, damping: 22 },
};

type SubmitStatus =
  | { state: 'idle' }
  | { state: 'submitting' }
  | { state: 'success' }
  | { state: 'error'; message: string };

export function ContactSection() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: ROLE_OPTIONS[0],
    topic: TOPIC_OPTIONS[0],
    subject: '',
    message: '',
    consent: false,
  });
  const [status, setStatus] = useState<SubmitStatus>({ state: 'idle' });

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status.state === 'submitting') return;

    setStatus({ state: 'submitting' });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({
          state: 'error',
          message: data?.error ?? 'Zprávu se nepodařilo odeslat.',
        });
        return;
      }
      setStatus({ state: 'success' });
      setForm({
        name: '',
        email: '',
        role: ROLE_OPTIONS[0],
        topic: TOPIC_OPTIONS[0],
        subject: '',
        message: '',
        consent: false,
      });
    } catch {
      setStatus({
        state: 'error',
        message: 'Síťová chyba — zkontrolujte připojení a zkuste to znovu.',
      });
    }
  };

  const isSubmitting = status.state === 'submitting';

  return (
    <section className="bg-white py-12 sm:py-16">
      <div
        className="mx-auto px-4 sm:px-6 lg:px-[100px]"
        style={{ maxWidth: '1440px', width: '100%' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Levý sloupec — kontakt info */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <p className="text-2xl font-semibold tracking-[0.2em] text-emerald-700 mb-4">
              KONTAKT
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-4">
              Spojte se s námi
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-xl mb-8">
              Praktik-AI je vzdělávací platforma pro učitele, kteří chtějí využívat umělou
              inteligenci ve výuce. Napište nám, ať už potřebujete pomoct s kurzem, zajímá vás
              spolupráce, nebo máte nápad, jak platformu vylepšit.
            </p>

            <div className="space-y-8">
              <div>
                <h3 className="text-xs font-semibold tracking-[0.15em] text-gray-500 mb-3">
                  NAPIŠTE E-MAIL
                </h3>
                <ul className="space-y-2">
                  {EMAIL_CONTACTS.map((c) => (
                    <li
                      key={c.value}
                      className="grid grid-cols-[160px_1fr] text-sm sm:text-base"
                    >
                      <span className="text-gray-500">{c.label}</span>
                      <a
                        href={`mailto:${c.value}`}
                        className="text-gray-900 hover:text-emerald-700 transition-colors"
                      >
                        {c.value}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold tracking-[0.15em] text-gray-500 mb-3">
                  ZAVOLEJTE
                </h3>
                <ul className="space-y-2">
                  {PHONE_CONTACTS.map((c) => (
                    <li
                      key={c.label}
                      className="grid grid-cols-[160px_1fr] text-sm sm:text-base"
                    >
                      <span className="text-gray-500">{c.label}</span>
                      <span className="text-gray-900">{c.value}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold tracking-[0.15em] text-gray-500 mb-3">
                  KDE NÁS NAJDETE
                </h3>
                <ul className="space-y-2">
                  {ADDRESS_CONTACTS.map((c) => (
                    <li
                      key={c.label}
                      className="grid grid-cols-[160px_1fr] text-sm sm:text-base"
                    >
                      <span className="text-gray-500">{c.label}</span>
                      <span className="text-gray-900">{c.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Pravý sloupec — formulář */}
          <motion.form
            onSubmit={onSubmit}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            whileHover={cardHover}
            className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
              Napište nám zprávu
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="contact-name"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Jméno a příjmení <span className="text-emerald-700">*</span>
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={onChange}
                  placeholder="Jan Novák"
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-email"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  E-mail <span className="text-emerald-700">*</span>
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={onChange}
                  placeholder="jan@email.cz"
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-role"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Role
                </label>
                <select
                  id="contact-role"
                  name="role"
                  value={form.role}
                  onChange={onChange}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="contact-topic"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Téma dotazu
                </label>
                <select
                  id="contact-topic"
                  name="topic"
                  value={form.topic}
                  onChange={onChange}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  {TOPIC_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="contact-subject"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Předmět <span className="text-emerald-700">*</span>
                </label>
                <input
                  id="contact-subject"
                  name="subject"
                  type="text"
                  required
                  value={form.subject}
                  onChange={onChange}
                  placeholder="Stručně popište téma"
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="contact-message"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Zpráva <span className="text-emerald-700">*</span>
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={5}
                  value={form.message}
                  onChange={onChange}
                  placeholder="Napište nám, s čím vám můžeme pomoct…"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-y"
                />
              </div>

              <div className="sm:col-span-2 flex items-start gap-2">
                <input
                  id="contact-consent"
                  name="consent"
                  type="checkbox"
                  required
                  checked={form.consent}
                  onChange={onChange}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="contact-consent" className="text-xs text-gray-600 cursor-pointer">
                  Souhlasím se zpracováním osobních údajů pro účely vyřízení dotazu.
                </label>
              </div>

              <div className="sm:col-span-2 flex flex-col gap-3">
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={isSubmitting ? undefined : { scale: 1.02 }}
                  whileTap={isSubmitting ? undefined : { scale: 0.98 }}
                  className="inline-flex w-fit items-center justify-center h-11 px-6 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Odesílám…' : 'Odeslat zprávu'}
                </motion.button>

                {status.state === 'success' && (
                  <p
                    role="status"
                    className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2"
                  >
                    Zpráva byla úspěšně odeslána. Brzy se vám ozveme.
                  </p>
                )}
                {status.state === 'error' && (
                  <p
                    role="alert"
                    className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2"
                  >
                    {status.message}
                  </p>
                )}
              </div>
            </div>
          </motion.form>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;

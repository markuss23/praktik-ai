'use client';

import { useState } from 'react';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import type { PretestSettings } from '@/api';
import { Button, Textarea } from '@/components/ui';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';

// Stejná pravidla jako pretest na backendu (assessments/pretest/service.py)
const MAX_ATTEMPTS = 3;

interface AnsweredQuestion {
  question: string;
  answer: string;
  isCorrect: boolean;
  note: string | null;
}

interface PretestPreviewProps {
  /** undefined = načítá se, null = modul pretest nemá nebo nejde načíst */
  content: PretestSettings | null | undefined;
  onComplete: () => void;
}

/**
 * Pretest v náhledu pro autora — stejný průchod jako u studenta (otázky po
 * jedné, 3 pokusy), ale vyhodnocuje se lokálně a nic se neukládá. Otevřenou
 * odpověď AI v náhledu nehodnotí, ukáže se vzorová odpověď.
 */
export function PretestPreview({ content, onComplete }: PretestPreviewProps) {
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [answered, setAnswered] = useState<AnsweredQuestion[]>([]);
  const [correctCount, setCorrectCount] = useState(0);

  const restart = () => {
    setIndex(0);
    setAttempts(0);
    setSelected(null);
    setAnswer('');
    setAnswered([]);
    setCorrectCount(0);
  };

  const continueButton = (
    <div className="flex justify-end mt-8 pt-6 border-t border-border">
      <Button
        variant="plain"
        onClick={onComplete}
        className={cn(BTN_KEEP_BOX, 'inline-flex items-center gap-2 text-primary-foreground font-semibold py-2.5 px-6 rounded-md transition-all hover:opacity-90 hover:shadow-md')}
        style={{ backgroundColor: 'var(--primary)' }}
      >
        Pokračovat na test
      </Button>
    </div>
  );

  if (content === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-gradient-r" />
      </div>
    );
  }

  if (content === null) {
    return (
      <div>
        <h3 className="text-xl font-bold text-foreground mb-2">Procvičování</h3>
        <p className="text-sm text-muted-foreground">
          Modul nemá pretest (nebo ho nejde načíst), student by začal rovnou dalším procvičováním.
        </p>
        {continueButton}
      </div>
    );
  }

  const total = content.closed.length + 1;
  const finished = index >= total;
  const isOpen = index === content.closed.length;
  const closed = !finished && !isOpen ? content.closed[index] : null;

  const submit = () => {
    if (closed) {
      if (selected === null) return;
      const isCorrect = selected === closed.correctIndex;
      const used = attempts + 1;
      setAnswered((prev) => [...prev, { question: closed.question, answer: closed.options[selected], isCorrect, note: null }]);
      setSelected(null);
      // Špatně a zbývají pokusy — stejná otázka znovu
      if (!isCorrect && used < MAX_ATTEMPTS) {
        setAttempts(used);
        return;
      }
      if (isCorrect) setCorrectCount((c) => c + 1);
      setAttempts(0);
      setIndex((i) => i + 1);
      return;
    }
    if (!answer.trim()) return;
    setAnswered((prev) => [...prev, {
      question: content.open.question,
      answer: answer.trim(),
      isCorrect: true,
      note: `V náhledu se otevřená odpověď nehodnotí. Vzorová odpověď: ${content.open.exampleAnswer}`
        + (content.open.keywords.length > 0 ? ` (klíčové body: ${content.open.keywords.join(', ')})` : ''),
    }]);
    setCorrectCount((c) => c + 1);
    setAnswer('');
    setIndex((i) => i + 1);
  };

  const passed = correctCount === total;

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-foreground">Procvičování</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Pretest: dvě otázky s výběrem a jedna otevřená, na každou tři pokusy, splnit je potřeba všechny.
        </p>
      </div>

      {answered.length > 0 && (
        <div className="space-y-3 mb-6">
          {answered.map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border ${item.isCorrect ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}
            >
              <div className="flex items-start gap-2">
                {item.isCorrect
                  ? <CheckCircle className="size-5 text-success shrink-0 mt-0.5" />
                  : <XCircle className="size-5 text-destructive shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.question}</p>
                  <p className="text-sm text-muted-foreground mt-1 break-words">
                    Vaše odpověď: <span className="font-medium">{item.answer}</span>
                  </p>
                  {item.note && <p className="text-sm text-muted-foreground mt-1">{item.note}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {finished ? (
        <div className={`p-4 rounded-lg border ${passed ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
          <div className="flex flex-wrap items-center gap-3">
            {passed ? <CheckCircle className="size-6 text-success shrink-0" /> : <XCircle className="size-6 text-destructive shrink-0" />}
            <p className={`grow font-semibold ${passed ? 'text-success' : 'text-destructive'}`}>
              {passed ? 'Pretest splněn' : 'Pretest nesplněn'} — {correctCount} z {total}
            </p>
            <Button variant="outline" size="sm" onClick={restart}>Projít znovu</Button>
          </div>
        </div>
      ) : (
        <div>
          {attempts > 0 && (
            <p role="status" className="mb-3 text-sm font-medium text-destructive">
              Nesprávně — zkuste to znovu ({MAX_ATTEMPTS - attempts} {MAX_ATTEMPTS - attempts === 1 ? 'pokus' : 'pokusy'}).
            </p>
          )}
          <p className="font-semibold text-foreground mb-4 leading-relaxed">
            {closed ? closed.question : content.open.question}
          </p>
          {closed ? (
            <div className="space-y-2">
              {closed.options.map((option, idx) => (
                <label
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selected === idx ? 'border-gradient-r/30 bg-gradient-r/10' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`preview-pretest-${index}`}
                    checked={selected === idx}
                    onChange={() => setSelected(idx)}
                    className="size-4 text-gradient-r focus:ring-gradient-r/30"
                  />
                  <span className="text-sm text-foreground">{option}</span>
                </label>
              ))}
            </div>
          ) : (
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Napište svou odpověď..."
              rows={4}
              className={cn("field-sizing-fixed min-h-0", "w-full border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gradient-r/30 focus:border-gradient-r/30 resize-none")}
            />
          )}
          <div className="flex justify-end mt-4">
            <Button
              variant="plain"
              onClick={submit}
              disabled={closed ? selected === null : !answer.trim()}
              className={cn(BTN_KEEP_BOX, 'inline-flex items-center gap-2 text-primary-foreground font-semibold py-2.5 px-6 rounded-md transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed')}
              style={{ backgroundColor: 'var(--gradient-r)' }}
            >
              Odevzdat
            </Button>
          </div>
        </div>
      )}

      <p className="mt-6 rounded-lg border border-dashed border-gradient-r/40 bg-gradient-r/5 px-4 py-3 text-sm text-muted-foreground">
        Další formáty procvičování, které jste k modulu připojili, se v náhledu nespouští.
      </p>
      {continueButton}
    </div>
  );
}

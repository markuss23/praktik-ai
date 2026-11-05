'use client';

import { useId, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button, Textarea } from '@/components/ui';
import { BTN_KEEP_BOX, cn, czechPlural } from '@/lib/utils';

export interface LocalQuestion {
  question: string;
  /** Možnosti uzavřené otázky; bez nich je otázka otevřená. */
  options?: string[];
  correctIndex?: number;
  /** Otevřená otázka se v náhledu nehodnotí — místo hodnocení se ukáže tahle poznámka. */
  openNote?: string;
}

interface AnsweredQuestion {
  question: string;
  answer: string;
  isCorrect: boolean;
  note: string | null;
}

interface LocalQuestionRunnerProps {
  /** Aspoň jedna otázka */
  questions: LocalQuestion[];
  /** Pokusy na jednu otázku */
  maxAttempts: number;
  /** Podíl zvládnutých otázek potřebný ke splnění (0–1) */
  passThreshold: number;
  onFinished?: (passed: boolean) => void;
}

/**
 * Průchod otázkami v náhledu pro autora — stejná pravidla jako session na
 * backendu (otázky po jedné, pokusy na otázku, práh splnění), ale hodnotí se
 * lokálně a nic se neukládá.
 */
export function LocalQuestionRunner({ questions, maxAttempts, passThreshold, onFinished }: LocalQuestionRunnerProps) {
  // Na stránce jich může být víc — radio skupiny se nesmí potkat
  const radioName = useId();
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [answered, setAnswered] = useState<AnsweredQuestion[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [attemptsRanOut, setAttemptsRanOut] = useState(false);

  const restart = () => {
    setIndex(0);
    setAttempts(0);
    setSelected(null);
    setAnswer('');
    setAnswered([]);
    setCorrectCount(0);
    setAttemptsRanOut(false);
  };

  const total = questions.length;
  const finished = index >= total;
  const current = finished ? null : questions[index];
  const options = current?.options;

  const goNext = (isCorrect: boolean) => {
    const count = correctCount + (isCorrect ? 1 : 0);
    setCorrectCount(count);
    setAttempts(0);
    setAttemptsRanOut(!isCorrect);
    setIndex(index + 1);
    if (index + 1 >= total) onFinished?.(count / total >= passThreshold);
  };

  const submit = () => {
    if (!current) return;
    if (options) {
      if (selected === null) return;
      const isCorrect = selected === current.correctIndex;
      const used = attempts + 1;
      setAnswered((prev) => [...prev, { question: current.question, answer: options[selected], isCorrect, note: null }]);
      setSelected(null);
      // Špatně a zbývají pokusy — stejná otázka znovu
      if (!isCorrect && used < maxAttempts) {
        setAttempts(used);
        return;
      }
      goNext(isCorrect);
      return;
    }
    if (!answer.trim()) return;
    setAnswered((prev) => [...prev, { question: current.question, answer: answer.trim(), isCorrect: true, note: current.openNote ?? null }]);
    setAnswer('');
    goNext(true);
  };

  const passed = total > 0 && correctCount / total >= passThreshold;
  const attemptsLeft = maxAttempts - attempts;

  return (
    <div>
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
              {passed ? 'Splněno' : 'Nesplněno'} — {correctCount} z {total}
            </p>
            <Button variant="outline" size="sm" onClick={restart}>Projít znovu</Button>
          </div>
        </div>
      ) : current && (
        <div>
          {attemptsRanOut && (
            <p role="status" className="mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              Na předchozí otázku vám došly pokusy — počítá se jako nesprávná.
            </p>
          )}
          {attempts > 0 && (
            <p role="status" className="mb-3 text-sm font-medium text-destructive">
              Nesprávně — zkuste to znovu ({attemptsLeft} {czechPlural(attemptsLeft, 'pokus', 'pokusy', 'pokusů')}).
            </p>
          )}
          <p className="font-semibold text-foreground mb-4 leading-relaxed">{current.question}</p>
          {options ? (
            <div className="space-y-2">
              {options.map((option, idx) => (
                <label
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selected === idx ? 'border-gradient-r/30 bg-gradient-r/10' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`${radioName}-${index}`}
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
              disabled={options ? selected === null : !answer.trim()}
              className={cn(BTN_KEEP_BOX, 'inline-flex items-center gap-2 text-primary-foreground font-semibold py-2.5 px-6 rounded-md transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed')}
              style={{ backgroundColor: 'var(--gradient-r)' }}
            >
              Odevzdat
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

import { Sparkles } from 'lucide-react';
import type { AssessmentFormatSettings } from '@/lib/api-client';
import { aiFormatDescription } from '@/lib/assessment-labels';

interface AiFormatPlaceholderProps {
  code: string;
  settings: AssessmentFormatSettings | null;
  /** Závěrečný test kurzu — AI vychází z obsahu celého kurzu */
  courseLevel?: boolean;
  /** Doplňující věta pod popisem */
  note?: string;
}

/**
 * Místo otázek AI formátu — ty vzniknou až ve chvíli, kdy student formát
 * spustí. Ukáže, co student dostane a podle jakých pravidel.
 */
export function AiFormatPlaceholder({ code, settings, courseLevel = false, note }: AiFormatPlaceholderProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed border-gradient-r/40 bg-gradient-r/5 px-4 py-3">
      <Sparkles className="mt-0.5 size-5 shrink-0 text-gradient-r" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">Generuje AI při spuštění</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {aiFormatDescription(code, settings, courseLevel ? 'course' : 'module')}
        </p>
        {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';

/** Průběh se po dokončení testu nepodařilo obnovit — odemčení dalších částí na něm závisí. */
export function ProgressStaleNotice({ onRetry }: { onRetry: () => void | Promise<void> }) {
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
      <p className="text-sm text-destructive">
        Průběh modulu se nepodařilo aktualizovat, takže se další části zatím neodemkly.
      </p>
      <Button variant="outline" size="sm" onClick={retry} disabled={retrying}>
        Zkusit znovu
      </Button>
    </div>
  );
}

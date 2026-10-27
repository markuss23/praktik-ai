'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { wikiSync } from '@/lib/api-client';
import { useRole } from '@/hooks/useRole';
import { Button } from '@/components/ui';

// Backend stav poslední synchronizace nevystavuje -  jen informace pro toho, kdo ho z tohoto prohlížeče spustil.
const LAST_SYNC_KEY = 'praktik-ai:wiki-last-sync';

interface LastSync {
  at: string;
  pagesProcessed: number;
}

function readLastSync(): LastSync | null {
  try {
    const raw = localStorage.getItem(LAST_SYNC_KEY);
    const parsed = raw ? (JSON.parse(raw) as LastSync) : null;
    return parsed && typeof parsed.at === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Správa wiki agenta
 */
export function WikiSyncView() {
  const { isSuperAdmin } = useRole();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ pagesProcessed: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<LastSync | null>(null);

  useEffect(() => {
    setLastSync(readLastSync());
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const data = await wikiSync();
      setResult(data);
      const record: LastSync = { at: new Date().toISOString(), pagesProcessed: data.pagesProcessed };
      setLastSync(record);
      try {
        localStorage.setItem(LAST_SYNC_KEY, JSON.stringify(record));
      } catch {
        // zápis do localStorage je best-effort
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Synchronizace wiki selhala.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex-1 lg:overflow-y-auto p-6 lg:p-8 bg-muted min-h-full">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Wiki agent</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Wiki chat odpovídá uživatelům z naindexovaného obsahu projektové wiki. Synchronizace stáhne
        aktuální wiki a znovu ji naindexuje — doporučuje se po větších změnách spustit ručně.
      </p>

      <div className="max-w-2xl space-y-6">
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-base font-bold text-foreground mb-1">Synchronizace a re-indexace</h2>
          <p className="text-sm text-muted-foreground">
            Na pozadí běží automaticky (interval 12 hodin). Ruční spuštění je vyhrazené superadminům.
          </p>

          {lastSync && (
            <p className="mt-4 text-xs text-muted-foreground">
              Poslední ruční spuštění z tohoto prohlížeče:{' '}
              <span className="text-foreground">
                {new Date(lastSync.at).toLocaleString('cs-CZ')}
              </span>{' '}
              · zpracováno {lastSync.pagesProcessed} stránek
            </p>
          )}

          {isSuperAdmin ? (
            <div className="mt-5">
              <Button variant="brand-solid" onClick={handleSync} disabled={syncing}>
                {syncing ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <RefreshCw data-icon="inline-start" />
                )}
                {syncing ? 'Synchronizuji…' : 'Spustit synchronizaci'}
              </Button>
              {syncing && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Stahuje se wiki, může to trvat několik
                  minut. Nezavírejte stránku.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3">
              <ShieldAlert className="size-4 shrink-0 text-muted-foreground mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Ruční synchronizaci může spustit jen superadmin. Wiki se i tak reindexuje
                automaticky na pozadí.
              </p>
            </div>
          )}

          {result && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-card p-3">
              <CheckCircle2 className="size-4 shrink-0 text-gradient-r mt-0.5" />
              <p className="text-sm text-foreground">
                {result.message} Zpracováno {result.pagesProcessed} stránek.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

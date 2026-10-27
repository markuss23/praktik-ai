'use client';

import Link from 'next/link';
import { AlertTriangle, Megaphone } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui-kit/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui-kit/dialog';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ChangelogMarkdown } from './ChangelogMarkdown';

/**
 * Novinky na platformě: tlačítko (spouštěč) + modální okno s celým
 * changelogem. Spouštěč je kitové `outline` tlačítko — sekundární akce
 * vedle hlavního CTA; `className` doladí velikost podle místa použití.
 * Okno je kitový `Dialog` ve stejné skladbě jako projektový `Modal` —
 * hlavička, rolovací obsah, patička. Markdown se stahuje serverově
 * (`fetchChangelog`) a přichází jako prop; `null` = nepodařilo se.
 */
export function ChangelogDialog({
  markdown,
  className,
}: {
  markdown: string | null;
  className?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger className={cn(buttonVariants({ variant: 'outline', size: 'xl' }), className)}>
        <Megaphone aria-hidden data-icon="inline-start" strokeWidth={1.8} />
        Novinky
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 rounded-2xl p-0 sm:max-w-2xl">
        <DialogHeader className="flex-row items-center gap-4 border-b p-5 pr-12 sm:p-6 sm:pr-14">
          <span
            aria-hidden
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[#0D2F31] text-[#D1E7D9] shadow"
          >
            <Megaphone className="size-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-lg leading-tight font-extrabold tracking-tight sm:text-xl">
              Novinky na platformě
            </DialogTitle>
            <DialogDescription className="mt-1">
              Co je nového, co jsme upravili a opravili.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-8">
          {markdown ? (
            <ChangelogMarkdown markdown={markdown} />
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <AlertTriangle className="mb-3 size-10 text-warning" />
              <p className="mb-1 font-semibold text-foreground">Novinky se nepodařilo načíst</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Obsah momentálně není dostupný. Zkuste to prosím později.
              </p>
            </div>
          )}
        </div>

        {/* Kitová patička počítá s paddingem obsahu — tady ho okno nemá. */}
        <DialogFooter className="mx-0 mb-0 rounded-b-2xl">
          <Link href={ROUTES.CHANGELOG} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Celý přehled novinek
          </Link>
          <DialogClose render={<Button size="lg" />}>Zavřít</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

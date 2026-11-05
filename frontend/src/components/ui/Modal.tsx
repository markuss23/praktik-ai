'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui-kit/dialog';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Doplňující text pod titulkem (napojený jako aria-description dialogu). */
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Tailwind max-width třída, např. `max-w-lg`. */
  maxWidth?: string;
  // lg = p-6 místo kitového p-4 pro obsáhlejší obsah
  padding?: 'default' | 'lg';
  className?: string;
}

/**
 * Projektový wrapper nad kitovým `Dialog` — drží imperativní `isOpen`/`onClose`
 * API, na kterém visí zbytek appky. Overlay, focus trap, scroll lock, Escape
 * a stacking řeší Base UI dialog, takže tady žádný ruční `fixed inset-0` ani z-index.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-md',
  padding = 'default',
  className,
}: ModalProps) {
  const isLg = padding === 'lg';
  // `DialogContent` má vlastní `sm:max-w-sm`; volanou šířku proto posíláme i s
  // `sm:` variantou, jinak by ji responzivní třída kitu na větších displejích přebila.
  const widthClasses = maxWidth
    .split(' ')
    .filter(Boolean)
    .flatMap((token) => [token, `sm:${token}`]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={cn(
          // Volaná šířka přepíše kitové `max-w-[calc(100%-2rem)]`, okraj na mobilu proto drží `w-*`.
          'w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto]',
          widthClasses,
          // Close button kitu je zarovnaný na p-4, posun drží osu s titulkem
          isLg && 'gap-6 p-6 *:data-[slot=dialog-close]:top-4 *:data-[slot=dialog-close]:right-4',
          className,
        )}
      >
        <DialogHeader>
          <DialogTitle className="pr-8 break-words">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto">{children}</div>
        {footer ? (
          <DialogFooter className={cn(isLg && '-mx-6 -mb-6 px-6')}>{footer}</DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

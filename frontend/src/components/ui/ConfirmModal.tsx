'use client';

import { AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '../ui-kit/button';
import { Modal } from './Modal';

export type ConfirmVariant = 'primary' | 'danger' | 'warning';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Mapování projektové varianty na kitové tlačítko + barvu ikony. */
const VARIANTS: Record<
  ConfirmVariant,
  { button: 'default' | 'destructive' | 'warning'; icon: typeof AlertTriangle; iconClass: string }
> = {
  primary: { button: 'default', icon: HelpCircle, iconClass: 'bg-primary/10 text-primary' },
  danger: {
    button: 'destructive',
    icon: AlertTriangle,
    iconClass: 'bg-destructive/10 text-destructive',
  },
  warning: { button: 'warning', icon: AlertTriangle, iconClass: 'bg-warning/15 text-warning' },
};

/**
 * Potvrzovací dialog pro významné / obtížně vratné akce.
 * Staví na `Modal` (tedy kitovém `Dialog`) a kitovém `Button`.
 */
export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Potvrdit',
  cancelLabel = 'Zrušit',
  loading = false,
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { button, icon: Icon, iconClass } = VARIANTS[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!loading) onCancel();
      }}
      title={title}
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="outline" size="lg" disabled={loading} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={button} size="lg" disabled={loading} onClick={onConfirm}>
            {loading ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                Zpracovávám…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-md', iconClass)}>
          <Icon className="size-5" />
        </div>
        <p className="pt-1.5 text-sm break-words text-muted-foreground">{message}</p>
      </div>
    </Modal>
  );
}

export default ConfirmModal;

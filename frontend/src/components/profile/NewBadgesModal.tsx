'use client';

import { motion } from 'motion/react';
import { PartyPopper } from 'lucide-react';

import { Button, Modal } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Badge } from './ProfileBadgesCard';

interface NewBadgesModalProps {
  isOpen: boolean;
  badges: Badge[];
  onConfirm: () => void;
}

/** Barva odznaku z dat → tokenový tint (žádné raw Tailwind palety). */
const BADGE_COLORS: Record<string, string> = {
  orange: 'border-brand-accent/30 bg-brand-accent/10 text-brand-accent',
  green: 'border-success/30 bg-success/10 text-success',
  purple: 'border-gradient-r/30 bg-gradient-r/10 text-gradient-r',
  blue: 'border-tip/30 bg-tip/10 text-tip',
  red: 'border-destructive/30 bg-destructive/10 text-destructive',
};

export function NewBadgesModal({ isOpen, badges, onConfirm }: NewBadgesModalProps) {
  return (
    <Modal
      isOpen={isOpen && badges.length > 0}
      // Zavření = potvrzení; odznaky se tím označí jako viděné.
      onClose={onConfirm}
      title="Nové odznaky!"
      description="Gratulujeme k vašemu pokroku!"
      maxWidth="max-w-md"
      footer={
        <Button size="lg" className="w-full" onClick={onConfirm}>
          Super, díky!
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <PartyPopper className="mx-auto size-10 text-primary" />

        {badges.map((badge, idx) => (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.15, duration: 0.4, ease: 'easeOut' }}
            className={cn(
              'flex items-center gap-4 rounded-xl border p-4',
              BADGE_COLORS[badge.color] ?? BADGE_COLORS.green,
            )}
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-card shadow-sm">
              <span className="text-2xl">{badge.icon}</span>
            </div>
            <div>
              <p className="text-base font-bold text-foreground">{badge.title}</p>
              <p className="text-sm text-muted-foreground">{badge.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </Modal>
  );
}

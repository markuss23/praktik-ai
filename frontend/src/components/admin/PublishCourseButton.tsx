'use client';

import { useState } from 'react';
import { Globe } from 'lucide-react';
import { Button, ConfirmModal, useToast } from '@/components/ui';
import { updateCoursePublished } from '@/lib/api-client';

interface PublishCourseButtonProps {
  courseId: number;
  courseTitle: string;
  onPublished: () => void;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

// Publikovani schvaleneho kurzu s potvrzenim (garant, vlastnik, superadmin)
export function PublishCourseButton({ courseId, courseTitle, onPublished, size = 'lg', className }: PublishCourseButtonProps) {
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const publish = async () => {
    setPublishing(true);
    try {
      await updateCoursePublished(courseId, true);
      setConfirmOpen(false);
      toast.success('Kurz je teď dostupný studentům v katalogu.', 'Kurz publikován');
      onPublished();
    } catch (err) {
      toast.error(err, 'Kurz se nepodařilo publikovat.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    // Klik a klavesy z tlacitka i z modalu (React je bubla i z portalu) nesmi otevrit klikaci kartu kurzu
    <div className="contents" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <Button
        size={size}
        className={className}
        tooltip="Zpřístupní kurz studentům v katalogu"
        onClick={() => setConfirmOpen(true)}
      >
        <Globe data-icon="inline-start" />
        Publikovat
      </Button>
      <ConfirmModal
        isOpen={confirmOpen}
        title="Publikovat kurz"
        message={`Opravdu chcete publikovat kurz „${courseTitle}"? Stane se dostupným studentům.`}
        confirmLabel="Publikovat"
        variant="primary"
        loading={publishing}
        onConfirm={publish}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

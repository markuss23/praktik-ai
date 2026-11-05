'use client';

import type { PretestSettings } from '@/api';
import { LocalQuestionRunner, type LocalQuestion } from './LocalQuestionRunner';

// Stejná pravidla jako pretest na backendu (assessments/pretest/service.py)
const MAX_ATTEMPTS = 3;

interface PretestPreviewProps {
  content: PretestSettings;
}

/**
 * Pretest v náhledu pro autora — stejný průchod jako u studenta (otázky po
 * jedné, 3 pokusy, splnit je potřeba všechny), ale vyhodnocuje se lokálně
 * a nic se neukládá. Otevřenou odpověď AI v náhledu nehodnotí, ukáže se
 * vzorová odpověď.
 */
export function PretestPreview({ content }: PretestPreviewProps) {
  const { open } = content;
  const questions: LocalQuestion[] = [
    ...content.closed,
    {
      question: open.question,
      openNote: `V náhledu se otevřená odpověď nehodnotí. Vzorová odpověď: ${open.exampleAnswer}`
        + (open.keywords.length > 0 ? ` (klíčové body: ${open.keywords.join(', ')})` : ''),
    },
  ];

  return <LocalQuestionRunner questions={questions} maxAttempts={MAX_ATTEMPTS} passThreshold={1} />;
}

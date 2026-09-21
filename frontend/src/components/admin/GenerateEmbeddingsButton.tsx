'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';

interface GenerateEmbeddingsButtonProps {
  // Handler for generating embeddings 
  onClick: () => void;
  // Whether embeddings are currently being generated
  isLoading: boolean;
  // Whether embeddings have already been generated
  isDone: boolean;
  // Icon size (default: 16) 
  iconSize?: number;
}

/**
 * Button for generating course embeddings.
 */
export function GenerateEmbeddingsButton({
  onClick,
  isLoading,
  isDone,
  iconSize = 16,
}: GenerateEmbeddingsButtonProps) {
  return (
    <Button
      size="icon"
      onClick={onClick}
      disabled={isDone || isLoading}
      className={cn(
        BTN_KEEP_BOX,
        'p-2 rounded-md bg-tip text-primary-foreground',
        isDone ? 'cursor-not-allowed' : isLoading ? 'cursor-wait' : 'hover:bg-tip/80',
      )}
      title={isDone ? 'Embeddingy vygenerovány' : 'Generovat embeddingy'}
    >
      {isLoading ? (
        <div
          className="border-2 border-white border-t-transparent rounded-full animate-spin"
          style={{ width: iconSize - 2, height: iconSize - 2 }}
        />
      ) : (
        <Sparkles size={iconSize} />
      )}
    </Button>
  );
}

export default GenerateEmbeddingsButton;

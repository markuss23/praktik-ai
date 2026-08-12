'use client';

import { Sparkles } from 'lucide-react';

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
    <button
      onClick={onClick}
      disabled={isDone || isLoading}
      className={`p-2 text-primary-foreground rounded-md transition-colors ${
        isDone
          ? 'bg-tip cursor-not-allowed'
          : isLoading
            ? 'bg-tip cursor-wait'
            : 'bg-tip hover:bg-tip/80'
      }`}
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
    </button>
  );
}

export default GenerateEmbeddingsButton;

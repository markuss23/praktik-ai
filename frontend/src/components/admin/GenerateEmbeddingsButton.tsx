'use client';

import { Sparkles } from 'lucide-react';

interface GenerateEmbeddingsButtonProps {
  /** Handler for generating embeddings */
  onClick: () => void;
  /** Whether embeddings are currently being generated */
  isLoading: boolean;
  /** Whether embeddings have already been generated */
  isDone: boolean;
  /** Icon size (default: 16) */
  iconSize?: number;
}

/**
 * Button for generating course embeddings.
 * Shows loading spinner during generation and disabled state when complete.
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
      className={`p-2 text-white rounded-md transition-colors ${
        isDone
          ? 'bg-blue-300 cursor-not-allowed'
          : isLoading
            ? 'bg-blue-400 cursor-wait'
            : 'bg-blue-600 hover:bg-blue-700'
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

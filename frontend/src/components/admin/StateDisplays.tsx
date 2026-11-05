'use client';

import { PageSpinner } from '@/components/ui';

interface LoadingStateProps {
  message?: string;
}

/**
 * Reusable loading state component
 */
export function LoadingState({ message = 'Načítání...' }: LoadingStateProps) {
  return <PageSpinner message={message} />;
}

interface ErrorStateProps {
  message: string;
}

/**
 * Reusable error state component
 */
export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="flex-1 p-8">
      <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-md text-destructive">
        {message}
      </div>
    </div>
  );
}

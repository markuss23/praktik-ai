'use client';

interface LoadingStateProps {
  message?: string;
}

/**
 * Reusable loading state component
 */
export function LoadingState({ message = 'Načítání...' }: LoadingStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-gray-500">{message}</div>
    </div>
  );
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
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
        {message}
      </div>
    </div>
  );
}

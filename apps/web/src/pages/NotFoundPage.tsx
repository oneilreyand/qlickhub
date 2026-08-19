import React from 'react';
import { ErrorBoundaryFallback } from '../components/ui/organisms/ErrorBoundary';

export const NotFoundPage: React.FC = () => {
  return (
    <ErrorBoundaryFallback
      title="Page Not Found (404)"
      description="The page you are looking for does not exist, has been removed, or is temporarily unavailable."
      showHomeButton={true}
    />
  );
};

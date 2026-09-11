import React from 'react';
import { ErrorBoundaryFallback } from '../components/ui/organisms/ErrorBoundary';

export const NotFoundPage: React.FC = () => {
  return (
    <ErrorBoundaryFallback
      title="Halaman Tidak Ditemukan (404)"
      description="Halaman yang Anda cari tidak tersedia, telah dihapus, atau sedang tidak dapat diakses."
      showHomeButton={true}
    />
  );
};

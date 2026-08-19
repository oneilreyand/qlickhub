import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';

export const ERROR_BOUNDARY_ILLUSTRATION_URL =
  'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787020942/404.png';

export interface ErrorBoundaryFallbackProps {
  error?: Error | null;
  resetErrorBoundary?: () => void;
  title?: string;
  description?: string;
  showHomeButton?: boolean;
}

export const ErrorBoundaryFallback: React.FC<ErrorBoundaryFallbackProps> = ({
  error,
  resetErrorBoundary,
  title = 'Something went wrong',
  description = 'An unexpected error occurred while rendering this section. You can try refreshing or returning to the Work Hub.',
  showHomeButton = true,
}) => {
  const handleReload = () => {
    if (resetErrorBoundary) {
      resetErrorBoundary();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    window.location.href = '/work';
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <Card className="w-full max-w-xl p-8 sm:p-10 text-center border-stone-200/80 shadow-md space-y-6">
        <div className="flex justify-center">
          <img
            src={ERROR_BOUNDARY_ILLUSTRATION_URL}
            alt="Error Illustration"
            className="dark:hidden w-full max-w-[280px] sm:max-w-[360px] md:max-w-[420px] h-auto max-h-64 sm:max-h-76 object-contain mx-auto transition-transform duration-300 hover:scale-[1.02] drop-shadow-xs"
            loading="lazy"
          />
          <div className="hidden dark:flex items-center justify-center py-4">
            <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-amber-950/40 border border-amber-800/60 shadow-inner">
              <div className="absolute inset-0 rounded-3xl bg-amber-500/10 blur-xl pointer-events-none" />
              <AlertTriangle className="h-9 w-9 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-[11px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Error Boundary</span>
          </div>
          <h2 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">
            {title}
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        {error && (
          <details className="text-left bg-stone-50 dark:bg-stone-900 rounded-xl p-3 border border-stone-200 dark:border-stone-800 text-xs">
            <summary className="cursor-pointer font-medium text-stone-700 dark:text-stone-300 select-none">
              Technical details
            </summary>
            <pre className="mt-2 overflow-x-auto text-[11px] text-red-600 dark:text-red-400 font-mono whitespace-pre-wrap break-all">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          </details>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            onClick={handleReload}
            variant="primary"
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Try Again
          </Button>
          {showHomeButton && (
            <Button
              onClick={handleGoHome}
              variant="outline"
              leftIcon={<Home className="h-4 w-4" />}
            >
              Back to Work Hub
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((props: { error: Error; reset: () => void }) => React.ReactNode);
  onReset?: () => void;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Unhandled error caught by ErrorBoundary:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({
          error: this.state.error || new Error('Unknown error'),
          reset: this.handleReset,
        });
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorBoundaryFallback
          error={this.state.error}
          resetErrorBoundary={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}

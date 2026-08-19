import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';

export const ACCESS_RESTRICTED_ILLUSTRATION_URL =
  'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787022062/ChatGPT_Image_Aug_18_2026_10_00_36_AM.png';

export interface AccessRestrictedProps {
  title?: string;
  description?: React.ReactNode;
  workspaceName?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export const AccessRestricted: React.FC<AccessRestrictedProps> = ({
  title = 'Access Restricted',
  description,
  workspaceName,
  actionLabel = 'Return to Work Hub',
  actionHref = '/work',
  onAction,
}) => {
  const defaultDescription = workspaceName
    ? `Only workspace administrators or owners are authorized to manage workspace settings, members, and policies for "${workspaceName}".`
    : 'You do not have permission to access or manage this resource. Please contact your workspace administrator.';

  return (
    <div className="py-12 px-4 max-w-2xl mx-auto text-center animate-fadeIn">
      <Card className="p-8 sm:p-12 space-y-6 text-center border-stone-200/80 shadow-md">
        <div className="flex justify-center">
          <img
            src={ACCESS_RESTRICTED_ILLUSTRATION_URL}
            alt="Access Restricted Illustration"
            className="dark:hidden w-full max-w-[280px] sm:max-w-[360px] md:max-w-[420px] h-auto max-h-64 sm:max-h-76 object-contain mx-auto transition-transform duration-300 hover:scale-[1.02] drop-shadow-xs"
            loading="lazy"
          />
          <div className="hidden dark:flex items-center justify-center py-4">
            <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-amber-950/40 border border-amber-800/60 shadow-inner">
              <div className="absolute inset-0 rounded-3xl bg-amber-500/10 blur-xl pointer-events-none" />
              <ShieldAlert className="h-9 w-9 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-[11px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Access Control</span>
          </div>
          <h2 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">
            {title}
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
            {description || defaultDescription}
          </p>
        </div>

        <div className="pt-2">
          {onAction ? (
            <Button onClick={onAction} size="lg" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              {actionLabel}
            </Button>
          ) : (
            <Link to={actionHref}>
              <Button size="lg" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                {actionLabel}
              </Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
};

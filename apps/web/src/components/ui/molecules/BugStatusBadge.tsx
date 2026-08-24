import React from 'react';
import { AlertCircle, CheckCircle2, Clock3, RotateCcw, Wrench } from 'lucide-react';
import type { BugStatus } from '@qlick/contracts';
import { Badge } from '../atoms/Badge';

const statusPresentation: Record<
  BugStatus,
  { label: string; variant: 'blocked' | 'brand' | 'review' | 'passed'; icon: React.ReactNode }
> = {
  open: {
    label: 'Open',
    variant: 'blocked',
    icon: <AlertCircle className="h-3 w-3" aria-hidden="true" />,
  },
  in_progress: {
    label: 'In progress',
    variant: 'brand',
    icon: <Clock3 className="h-3 w-3" aria-hidden="true" />,
  },
  resolved: {
    label: 'Resolved · Retest needed',
    variant: 'review',
    icon: <Wrench className="h-3 w-3" aria-hidden="true" />,
  },
  verified: {
    label: 'Verified',
    variant: 'passed',
    icon: <CheckCircle2 className="h-3 w-3" aria-hidden="true" />,
  },
  reopened: {
    label: 'Reopened',
    variant: 'blocked',
    icon: <RotateCcw className="h-3 w-3" aria-hidden="true" />,
  },
};

export const BugStatusBadge: React.FC<{ status: BugStatus }> = ({ status }) => {
  const presentation = statusPresentation[status];
  return (
    <Badge variant={presentation.variant} size="sm" icon={presentation.icon}>
      {presentation.label}
    </Badge>
  );
};

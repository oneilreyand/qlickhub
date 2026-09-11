import React from 'react';
import { TaskStatus } from '@qlick/contracts';
import { Badge, BadgeProps } from '../atoms/Badge';

export type TaskQaState = 'Passed' | 'In Review' | 'Blocked' | 'Draft';

export type TaskStatusInput = TaskStatus | TaskQaState;

export const TaskStatusBadge: React.FC<{ state: TaskStatusInput; size?: 'sm' | 'md' }> = ({
  state,
  size = 'sm',
}) => {
  let variant: BadgeProps['variant'] = 'neutral';
  let label = String(state);

  switch (state) {
    case 'done':
    case 'Passed':
      variant = 'passed';
      label = state === 'done' ? 'Selesai' : 'Lulus';
      break;
    case 'in_review':
    case 'In Review':
      variant = 'review';
      label = 'Dalam Review';
      break;
    case 'changes_requested':
      variant = 'blocked';
      label = 'Perlu Perbaikan';
      break;
    case 'in_progress':
      variant = 'info';
      label = 'Sedang Dikerjakan';
      break;
    case 'canceled':
    case 'Blocked':
      variant = 'blocked';
      label = state === 'canceled' ? 'Dibatalkan' : 'Terblokir';
      break;
    case 'todo':
    case 'Draft':
    default:
      variant = 'draft';
      label = state === 'todo' ? 'Belum Dikerjakan' : 'Draf';
      break;
  }

  return (
    <Badge variant={variant} size={size}>
      {label}
    </Badge>
  );
};

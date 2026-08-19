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
      label = state === 'done' ? 'Done' : 'Passed';
      break;
    case 'in_review':
    case 'In Review':
      variant = 'review';
      label = 'In Review';
      break;
    case 'changes_requested':
      variant = 'blocked';
      label = 'Changes Requested';
      break;
    case 'in_progress':
      variant = 'info';
      label = 'In Progress';
      break;
    case 'canceled':
    case 'Blocked':
      variant = 'blocked';
      label = state === 'canceled' ? 'Canceled' : 'Blocked';
      break;
    case 'todo':
    case 'Draft':
    default:
      variant = 'draft';
      label = state === 'todo' ? 'To Do' : 'Draft';
      break;
  }

  return (
    <Badge variant={variant} size={size}>
      {label}
    </Badge>
  );
};

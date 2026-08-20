import React from 'react';
import type { TaskComment } from '@qlick/contracts';
import { TaskCommentBox } from './TaskCommentBox';

export interface SubtaskCommentBoxProps {
  comments: TaskComment[];
  currentUserId?: string;
  members?: Array<{ userId: string; role: string; user?: { name?: string; email?: string } }>;
  onPostComment: (body: string, parentCommentId?: string | null, mentionedUserIds?: string[]) => Promise<void> | void;
  onUpdateComment?: (commentId: string, body: string) => Promise<void> | void;
  onDeleteComment?: (commentId: string) => Promise<void> | void;
  variant?: 'thread' | 'bubble';
  title?: string;
  placeholder?: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  maxHeight?: string;
}

export const SubtaskCommentBox: React.FC<SubtaskCommentBoxProps> = ({
  comments,
  currentUserId,
  members = [],
  onPostComment,
  onUpdateComment,
  onDeleteComment,
  variant = 'bubble',
  title = 'Subtask Collaboration Discussion',
  placeholder = 'Tulis pesan untuk tim (FE, BE, QA, PO)... (Shift+Enter untuk baris baru)',
  isLoading = false,
  error = null,
  onRetry,
  maxHeight = 'max-h-[340px]',
}) => {
  return (
    <TaskCommentBox
      comments={comments}
      currentUserId={currentUserId}
      members={members}
      variant={variant}
      title={title}
      placeholder={placeholder}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      maxHeight={maxHeight}
      onPostComment={async (body, parentCommentId, mentionedUserIds) => {
        await onPostComment(body, parentCommentId, mentionedUserIds);
      }}
      onUpdateComment={onUpdateComment}
      onDeleteComment={onDeleteComment}
    />
  );
};


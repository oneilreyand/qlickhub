import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Trash2,
  Sparkles,
  Volume2,
} from 'lucide-react';
import type { TaskComment } from '@qlick/contracts';
import { Button } from '../atoms/Button';
import { IconButton } from '../atoms/IconButton';
import { Avatar } from '../atoms/Avatar';
import { Textarea } from '../atoms/Textarea';
import { LoadingSpinner } from '../atoms/LoadingSpinner';

export interface SubtaskCommentBoxProps {
  comments: TaskComment[];
  currentUserId?: string;
  members?: Array<{ userId: string; role: string; user?: { name?: string; email?: string } }>;
  onPostComment: (body: string, parentCommentId?: string | null) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
}

export const SubtaskCommentBox: React.FC<SubtaskCommentBoxProps> = ({
  comments,
  currentUserId,
  members = [],
  onPostComment,
  onDeleteComment,
}) => {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getAuthorName = (authorId: string) => {
    const member = members.find((m) => m.userId === authorId);
    return member?.user?.name || member?.user?.email || 'Team Member';
  };

  const getAuthorRole = (authorId: string) => {
    const member = members.find((m) => m.userId === authorId);
    return member?.role?.toUpperCase() || 'MEMBER';
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onPostComment(commentText.trim(), replyParentId);
      setCommentText('');
      setReplyParentId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!onDeleteComment) return;
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    setDeletingId(commentId);
    try {
      await onDeleteComment(commentId);
    } finally {
      setDeletingId(null);
    }
  };

  const quickTopics = [
    { label: 'FE Query', tag: '[FE Query]: ' },
    { label: 'BE Contract', tag: '[BE Contract]: ' },
    { label: 'QA Blocker', tag: '[QA Blocker]: ' },
    { label: 'Ready for Review', tag: '[Ready for Review]: ' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-stone-400" />
          <span>Subtask Collaboration Discussion ({comments.length})</span>
        </span>
      </div>

      {/* Comment List */}
      {comments.length === 0 ? (
        <div className="p-4 text-center rounded-xl border border-dashed border-stone-200 dark:border-stone-800 bg-white/40 dark:bg-stone-900/40">
          <MessageSquare className="h-5 w-5 text-stone-400 mx-auto mb-1" />
          <p className="text-xs text-stone-500 dark:text-stone-400">
            No discussion on this subtask yet. Start the conversation below!
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {comments.map((comment) => {
            const authorName = getAuthorName(comment.authorId);
            const authorRole = getAuthorRole(comment.authorId);
            const isMe = comment.authorId === currentUserId;

            return (
              <div
                key={comment.id}
                className={`p-2.5 rounded-xl border transition-all text-xs ${
                  isMe
                    ? 'border-indigo-100 bg-indigo-50/40 dark:border-indigo-950 dark:bg-indigo-950/20'
                    : 'border-stone-200/80 bg-white dark:border-stone-800 dark:bg-stone-900'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Avatar name={authorName} size="sm" className="h-5 w-5 text-[10px]" />
                    <span className="font-bold text-stone-900 dark:text-stone-100 truncate">
                      {authorName}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                      {authorRole}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                    <span>
                      {new Date(comment.createdAt || Date.now()).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {isMe && onDeleteComment && (
                      <IconButton
                        label="Delete comment"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(comment.id)}
                        disabled={deletingId === comment.id}
                        className="h-5 w-5 text-stone-400 hover:text-rose-500"
                      >
                        {deletingId === comment.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </IconButton>
                    )}
                  </div>
                </div>

                <p className="text-xs text-stone-800 dark:text-stone-200 whitespace-pre-wrap leading-relaxed">
                  {comment.body}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Topic Chips & @channel broadcast */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        <button
          type="button"
          onClick={() => {
            if (!commentText.includes('@channel')) {
              setCommentText((prev) => (prev ? `@channel ${prev}` : '@channel '));
            }
          }}
          className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all ${
            commentText.includes('@channel')
              ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-stone-950 shadow-xs'
              : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/60'
          }`}
          title="Notify all members involved in this task"
        >
          <Volume2 className="h-3 w-3" />
          <span>@channel</span>
        </button>

        <span className="text-[10px] font-bold text-stone-400 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-500" />
          <span>Quick Topic:</span>
        </span>
        {quickTopics.map((topic) => (
          <button
            key={topic.label}
            type="button"
            onClick={() => {
              if (!commentText.includes(topic.tag)) {
                setCommentText(topic.tag + commentText);
              }
            }}
            className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold transition-colors"
          >
            {topic.label}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="space-y-2">
        <Textarea
          id="subtask-comment-input"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Tektokan / share notes with FE, BE, or QA on this subtask..."
          rows={2}
          className="text-xs"
        />

        <div className="flex justify-end">
          <Button
            size="sm"
            variant="primary"
            type="submit"
            isLoading={isSubmitting}
            disabled={!commentText.trim()}
            className="h-7 text-xs px-3"
            leftIcon={<Send className="h-3 w-3" />}
          >
            Send Note
          </Button>
        </div>
      </form>
    </div>
  );
};

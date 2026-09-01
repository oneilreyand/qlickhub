import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Trash2,
  Edit2,
  Reply,
  Volume2,
  Image as ImageIcon,
  Video as VideoIcon,
  CornerDownRight,
  X,
} from 'lucide-react';
import type { TaskComment } from '@qlick/contracts';
import { Button } from '../atoms/Button';
import { IconButton } from '../atoms/IconButton';
import { Avatar } from '../atoms/Avatar';
import { Textarea } from '../atoms/Textarea';
import { LoadingSpinner } from '../atoms/LoadingSpinner';
import { Skeleton } from '../atoms/Skeleton';
import { Alert } from '../atoms/Alert';
import { DiscussionMediaRenderer } from './DiscussionMediaRenderer';
import { Modal } from './Modal';

export const EMPTY_DISCUSSION_ILLUSTRATION_URL =
  'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787024196/ChatGPT_Image_Aug_18_2026_10_33_27_AM.png';

export interface TaskCommentBoxProps {
  comments?: TaskComment[];
  currentUserId?: string;
  members?: Array<{ userId: string; role: string; user?: { name?: string; email?: string } }>;
  onPostComment: (body: string, parentCommentId?: string | null, mentionedUserIds?: string[]) => Promise<void> | void;
  onUpdateComment?: (commentId: string, body: string) => Promise<void> | void;
  onDeleteComment?: (commentId: string) => Promise<void> | void;
  canManageComments?: boolean;
  title?: string;
  showMentionChips?: boolean;
  placeholder?: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyIllustrationUrl?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  variant?: 'thread' | 'bubble';
  maxHeight?: string;
}

export const TaskCommentBox: React.FC<TaskCommentBoxProps> = ({
  comments = [],
  currentUserId,
  members = [],
  onPostComment,
  onUpdateComment,
  onDeleteComment,
  canManageComments = true,
  title,
  showMentionChips = true,
  placeholder,
  isLoading = false,
  error = null,
  onRetry,
  emptyIllustrationUrl = EMPTY_DISCUSSION_ILLUSTRATION_URL,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  variant = 'thread',
  maxHeight = 'max-h-[340px]',
}) => {
  const isBubble = variant === 'bubble';
  const defaultTitle = title || (isBubble ? 'Subtask Collaboration Discussion' : 'Working Task Discussion');

  const [commentText, setCommentText] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<{ id: string; isBubble: boolean } | null>(
    null,
  );

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (
      messagesEndRef.current &&
      typeof messagesEndRef.current.scrollIntoView === 'function'
    ) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  // Group top-level comments and attach nested replies cleanly
  const rootComments = useMemo(() => {
    const map = new Map<string, TaskComment & { repliesList: TaskComment[] }>();
    const roots: (TaskComment & { repliesList: TaskComment[] })[] = [];
    const safeComments = comments || [];

    // First pass: register root comments
    for (const c of safeComments) {
      if (!c.parentCommentId) {
        const item = { ...c, repliesList: [...(c.replies || [])] };
        map.set(c.id, item);
        roots.push(item);
      }
    }

    // Second pass: attach child comments
    for (const c of safeComments) {
      if (c.parentCommentId && map.has(c.parentCommentId)) {
        const parent = map.get(c.parentCommentId)!;
        const existingIdx = parent.repliesList.findIndex((r) => r.id === c.id);
        if (existingIdx >= 0) {
          parent.repliesList[existingIdx] = { ...parent.repliesList[existingIdx], ...c };
        } else {
          parent.repliesList.push(c);
        }
      }
    }

    return roots;
  }, [comments]);

  useEffect(() => {
    if (isBubble) {
      scrollToBottom('smooth');
    }
  }, [comments.length, rootComments.length, isBubble]);

  const getAuthorName = (authorId: string, fallbackName?: string) => {
    if (fallbackName) return fallbackName;
    const member = members.find((m) => m.userId === authorId);
    return member?.user?.name || member?.user?.email || 'Team Member';
  };

  const getAuthorRole = (authorId: string) => {
    const member = members.find((m) => m.userId === authorId);
    return member?.role?.toUpperCase() || 'MEMBER';
  };

  const canManage = (comment: TaskComment) => {
    return !comment.deletedAt && (comment.authorId === currentUserId || canManageComments);
  };

  const handleSendRoot = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const hasText = Boolean(commentText.trim());
    if (!hasText || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onPostComment(commentText.trim(), null, mentionedUserIds);
      setCommentText('');
      setMentionedUserIds([]);
      if (isBubble) {
        setTimeout(() => scrollToBottom('smooth'), 100);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isBubble && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendRoot();
    }
  };

  const handleSendReply = async (parentId: string) => {
    const hasText = Boolean(replyText.trim());
    if (!hasText || isSubmittingReply) return;

    setIsSubmittingReply(true);
    try {
      await onPostComment(replyText.trim(), parentId);
      setReplyText('');
      setReplyParentId(null);
      if (isBubble) {
        setTimeout(() => scrollToBottom('smooth'), 100);
      }
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editingCommentText.trim() || isSavingEdit || !onUpdateComment) return;

    setIsSavingEdit(true);
    try {
      await onUpdateComment(commentId, editingCommentText.trim());
      setEditingCommentId(null);
      setEditingCommentText('');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = (commentId: string) => {
    if (!onDeleteComment) return;
    setCommentToDelete({ id: commentId, isBubble });
  };

  const handleConfirmDelete = async () => {
    if (!commentToDelete || !onDeleteComment) return;
    const targetId = commentToDelete.id;
    setDeletingId(targetId);
    try {
      await onDeleteComment(targetId);
      setCommentToDelete(null);
    } finally {
      setDeletingId(null);
    }
  };

  const totalCommentsCount = useMemo(() => {
    let count = comments.length;
    for (const c of comments) {
      if (c.replies && c.replies.length > 0) {
        count += c.replies.length;
      }
    }
    return count;
  }, [comments]);

  const defaultPlaceholder =
    placeholder ||
    (isBubble
      ? 'Tulis pesan untuk tim (FE, BE, QA, PO)... (Shift+Enter untuk baris baru)'
      : 'Write a message to your team (FE, BE, QA, PO)... (Paste link gambar, video, Figma, Drive, atau PR)');

  // ==========================================
  // VARIANT: BUBBLE (WhatsApp / Slack Upward Layout)
  // ==========================================
  if (isBubble) {
    return (
      <div className="flex flex-col rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#1C1A19] overflow-hidden shadow-xs">
        {/* Header Bar */}
        <div className="px-4 py-3 border-b border-stone-200/80 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#22201F] dark:text-[#B1E743]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-900 dark:text-stone-100">
              {defaultTitle}
            </h3>
            {totalCommentsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#B1E743] text-[#141413] shadow-xs">
                {totalCommentsCount}
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            Thread Live
          </span>
        </div>

        {/* Messages Scroll Area (WhatsApp / Slack Upward Flow) */}
        <div
          ref={chatScrollContainerRef}
          className={`flex-1 p-4 overflow-y-auto ${maxHeight} space-y-4 bg-stone-50/50 dark:bg-[#141413]`}
        >
          {isLoading && comments.length === 0 ? (
            <div className="space-y-3 py-4">
              <Skeleton variant="text" className="h-10 w-2/3" />
              <Skeleton variant="text" className="h-10 w-1/2 ml-auto" />
              <Skeleton variant="text" className="h-10 w-3/4" />
            </div>
          ) : error ? (
            <Alert tone="error" title="Discussion unavailable">
              <div className="flex items-center justify-between gap-3">
                <span>{error}</span>
                {onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry}>
                    Retry
                  </Button>
                )}
              </div>
            </Alert>
          ) : rootComments.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <div className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500">
                <MessageSquare className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                Belum ada pesan di diskusi ini
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 max-w-xs mx-auto">
                Kirim pesan, bagikan link gambar, video, Figma, atau catatan teknis di bawah.
              </p>
            </div>
          ) : (
            rootComments.map((comment) => {
              const isMe = comment.authorId === currentUserId;
              const authorName = getAuthorName(comment.authorId, comment.authorName);
              const authorRole = getAuthorRole(comment.authorId);
              const isEditing = editingCommentId === comment.id;
              const isReplying = replyParentId === comment.id;

              return (
                <div key={comment.id} className="space-y-2">
                  {/* Bubble Container: isMe (Kanan / Self) vs Others (Kiri) */}
                  <div className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMe && (
                      <Avatar
                        name={authorName}
                        size="sm"
                        className="h-7 w-7 shrink-0 text-xs mt-1 shadow-xs"
                      />
                    )}

                    <div className={`flex flex-col max-w-[82%] sm:max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                      {/* Header Info Above Bubble */}
                      <div className="flex items-center gap-1.5 px-1 pb-1 text-[10px] text-stone-500 dark:text-stone-400">
                        {isMe ? (
                          <>
                            <span>
                              {new Date(comment.createdAt || Date.now()).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span>•</span>
                            <span className="px-1.5 py-0.2 rounded-xs text-[9px] font-extrabold bg-[#B1E743] text-[#141413]">
                              Anda ({authorRole})
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-stone-800 dark:text-stone-200">
                              {authorName}
                            </span>
                            <span className="px-1.5 py-0.2 rounded-xs text-[9px] font-extrabold uppercase bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                              {authorRole}
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(comment.createdAt || Date.now()).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </>
                        )}

                        {comment.editedAt && !comment.deletedAt && (
                          <span className="italic text-stone-400 text-[9px]">(diedit)</span>
                        )}
                      </div>

                      {/* Chat Bubble Body with Subtask Theme Colors */}
                      <div
                        className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs transition-all ${
                          isMe
                            ? 'bg-[#B1E743] text-[#141413] rounded-tr-xs dark:bg-[#B1E743] dark:text-[#141413] font-medium border border-[#9ed336]'
                            : 'bg-white dark:bg-[#1C1A19] border border-stone-200/80 dark:border-stone-800 text-stone-900 dark:text-stone-100 rounded-tl-xs'
                        }`}
                      >
                        {isEditing ? (
                          <div className="space-y-2 min-w-[200px]">
                            <Textarea
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              rows={2}
                              className="text-xs bg-white text-stone-900 dark:bg-stone-950 dark:text-stone-100"
                            />
                            <div className="flex gap-1.5 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingCommentId(null)}
                                className="h-6 text-[10px] px-2"
                              >
                                Batal
                              </Button>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleSaveEdit(comment.id)}
                                isLoading={isSavingEdit}
                                disabled={!editingCommentText.trim()}
                                className="h-6 text-[10px] px-2.5"
                              >
                                Simpan
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className={comment.deletedAt ? 'italic opacity-60' : ''}>
                            <DiscussionMediaRenderer content={comment.body} />
                          </div>
                        )}

                        {/* Mentions badge */}
                        {comment.mentions && comment.mentions.length > 0 && !comment.deletedAt && (
                          <div className="flex items-center gap-1 text-[10px] opacity-85 pt-1.5 font-bold">
                            <span>@</span>
                            {comment.mentions.map((m) => m.userName).join(', ')}
                          </div>
                        )}
                      </div>

                      {/* Actions Toolbar */}
                      {!comment.deletedAt && (
                        <div className="flex items-center gap-2 pt-1 px-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyParentId(isReplying ? null : comment.id);
                              setReplyText('');
                            }}
                            className="text-stone-500 hover:text-[#22201F] dark:hover:text-[#B1E743] font-bold flex items-center gap-1 transition-colors"
                          >
                            <Reply className="h-2.5 w-2.5" />
                            <span>{isReplying ? 'Batal' : 'Balas'}</span>
                          </button>

                          {canManage(comment) && onUpdateComment && !isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentText(comment.body);
                              }}
                              className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                              title="Edit pesan"
                            >
                              <Edit2 className="h-2.5 w-2.5" />
                            </button>
                          )}

                          {canManage(comment) && onDeleteComment && (
                            <button
                              type="button"
                              onClick={() => handleDelete(comment.id)}
                              disabled={deletingId === comment.id}
                              className="text-stone-400 hover:text-rose-500 transition-colors"
                              title="Hapus pesan"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nested Replies with Connecting Subtask Theme Line */}
                  {comment.repliesList && comment.repliesList.length > 0 && (
                    <div className="pl-8 sm:pl-11 space-y-2.5 pt-1 border-l-2 border-[#B1E743]/40 dark:border-[#B1E743]/40 ml-3.5">
                      {comment.repliesList.map((reply) => {
                        const isReplyMe = reply.authorId === currentUserId;
                        const replyAuthorName = getAuthorName(reply.authorId, reply.authorName);
                        const replyAuthorRole = getAuthorRole(reply.authorId);
                        const isReplyEditing = editingCommentId === reply.id;

                        return (
                          <div
                            key={reply.id}
                            className={`flex items-start gap-2 ${isReplyMe ? 'flex-row-reverse' : 'flex-row'}`}
                          >
                            {!isReplyMe && (
                              <Avatar
                                name={replyAuthorName}
                                size="sm"
                                className="h-5 w-5 shrink-0 text-[10px] mt-1"
                              />
                            )}

                            <div className={`flex flex-col max-w-[85%] ${isReplyMe ? 'items-end' : 'items-start'}`}>
                              <div className="flex items-center gap-1 px-1 pb-0.5 text-[9px] text-stone-500 dark:text-stone-400">
                                {isReplyMe ? (
                                  <>
                                    <span>
                                      {new Date(reply.createdAt || Date.now()).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                    <span>•</span>
                                    <span className="px-1 py-0.2 rounded-xs text-[8px] font-extrabold bg-[#B1E743] text-[#141413]">
                                      Anda
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="font-bold text-stone-800 dark:text-stone-200">
                                      {replyAuthorName}
                                    </span>
                                    <span className="px-1 py-0.2 rounded-xs text-[8px] font-bold uppercase bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                                      {replyAuthorRole}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {new Date(reply.createdAt || Date.now()).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </>
                                )}
                              </div>

                              <div
                                className={`p-2.5 rounded-xl text-xs leading-relaxed shadow-2xs ${
                                  isReplyMe
                                    ? 'bg-[#B1E743] text-[#141413] rounded-tr-xs dark:bg-[#B1E743] dark:text-[#141413] font-medium border border-[#9ed336]'
                                    : 'bg-white dark:bg-[#1C1A19] border border-stone-200/80 dark:border-stone-800 text-stone-900 dark:text-stone-100 rounded-tl-xs'
                                }`}
                              >
                                {isReplyEditing ? (
                                  <div className="space-y-1.5 min-w-[180px]">
                                    <Textarea
                                      value={editingCommentText}
                                      onChange={(e) => setEditingCommentText(e.target.value)}
                                      rows={2}
                                      className="text-xs bg-white text-stone-900 dark:bg-stone-950 dark:text-stone-100"
                                    />
                                    <div className="flex gap-1 justify-end">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingCommentId(null)}
                                        className="h-5 text-[9px] px-1.5"
                                      >
                                        Batal
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="primary"
                                        onClick={() => handleSaveEdit(reply.id)}
                                        isLoading={isSavingEdit}
                                        className="h-5 text-[9px] px-2"
                                      >
                                        Simpan
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <DiscussionMediaRenderer content={reply.body} />
                                )}
                              </div>

                              {!reply.deletedAt && canManage(reply) && (
                                <div className="flex items-center gap-1.5 pt-0.5 px-1 text-[9px]">
                                  {onUpdateComment && !isReplyEditing && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingCommentId(reply.id);
                                        setEditingCommentText(reply.body);
                                      }}
                                      className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                                    >
                                      <Edit2 className="h-2 w-2" />
                                    </button>
                                  )}
                                  {onDeleteComment && (
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(reply.id)}
                                      className="text-stone-400 hover:text-rose-500"
                                    >
                                      <Trash2 className="h-2 w-2" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Inline Reply Input */}
                  {isReplying && (
                    <div className="pl-8 sm:pl-11 pt-1 animate-fadeIn">
                      <div className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-stone-800 dark:text-stone-200">
                          <span className="flex items-center gap-1">
                            <CornerDownRight className="h-3 w-3" /> Membalas @{authorName}...
                          </span>
                          <button
                            type="button"
                            onClick={() => setReplyParentId(null)}
                            className="text-stone-400 hover:text-stone-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>

                        <Textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`Tulis balasan langsung untuk @${authorName}...`}
                          rows={2}
                          className="text-xs bg-white dark:bg-stone-900"
                        />

                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setReplyParentId(null)}
                            className="h-6 text-[10px] px-2"
                          >
                            Batal
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleSendReply(comment.id)}
                            isLoading={isSubmittingReply}
                            disabled={!replyText.trim()}
                            className="h-6 text-[10px] px-2.5"
                            rightIcon={<Send className="h-2.5 w-2.5" />}
                          >
                            Kirim Balasan
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Sticky Bottom Input Bar */}
        <div className="p-3 border-t border-stone-200/80 dark:border-stone-800 bg-white/95 dark:bg-[#1C1A19]/95 backdrop-blur-xs space-y-2">
          {/* Quick Toolbar matching subtask discussion */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (!commentText.includes('@channel')) {
                  setCommentText((prev) => (prev ? `@channel ${prev}` : '@channel '));
                }
              }}
              className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 transition-all ${
                commentText.includes('@channel')
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/60'
              }`}
              title="Broadcast ke semua anggota di subtask ini"
            >
              <Volume2 className="h-3 w-3" />
              <span>@channel</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const url = window.prompt('Masukkan URL Gambar / Screenshot (https://...):');
                if (url && url.trim()) {
                  setCommentText((prev) => (prev ? `${prev}\n${url.trim()}` : url.trim()));
                }
              }}
              className="text-[10px] px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold transition-colors flex items-center gap-1"
            >
              <ImageIcon className="h-3 w-3 text-stone-600 dark:text-stone-300" />
              <span>+ Image Link</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const url = window.prompt('Masukkan URL Video YouTube / Loom / MP4 (https://...):');
                if (url && url.trim()) {
                  setCommentText((prev) => (prev ? `${prev}\n${url.trim()}` : url.trim()));
                }
              }}
              className="text-[10px] px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold transition-colors flex items-center gap-1"
            >
              <VideoIcon className="h-3 w-3 text-stone-600 dark:text-stone-300" />
              <span>+ Video Link</span>
            </button>
          </div>

          {/* Text Input & Send */}
          <form onSubmit={handleSendRoot} className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={defaultPlaceholder}
                rows={2}
                className="text-xs resize-none bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800"
              />
            </div>

            <Button
              size="sm"
              variant="primary"
              type="submit"
              isLoading={isSubmitting}
              disabled={!commentText.trim()}
              className="h-9 px-3.5 shrink-0 rounded-xl"
              rightIcon={<Send className="h-3.5 w-3.5" />}
            >
              Kirim
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // VARIANT: THREAD (Forum List Style - Default)
  // ==========================================
  return (
    <div className="space-y-4">
      {/* Title Header */}
      {defaultTitle && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-stone-400" />
            <span>{defaultTitle}</span>
            {totalCommentsCount > 0 && (
              <span className="text-stone-400 font-semibold">({totalCommentsCount})</span>
            )}
          </span>
        </div>
      )}

      {/* Main Comment Input Area */}
      <div className="space-y-3">

        {/* Mention Members Toolbar (Optional for Task Level) */}
        {showMentionChips && members.length > 0 && (
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider dark:text-stone-400">
              Mention Members / Broadcast (Optional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {/* @channel broadcast chip */}
              <button
                type="button"
                onClick={() => {
                  if (!commentText.includes('@channel')) {
                    setCommentText((prev) => (prev ? `@channel ${prev}` : '@channel '));
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  commentText.includes('@channel')
                    ? 'bg-amber-500 text-white shadow-xs dark:bg-amber-400 dark:text-stone-950 ring-2 ring-amber-500/30'
                    : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/60'
                }`}
                title="Broadcast ke semua orang di task ini (Reporter, Assignee, Subtask Assignees, Komentator)"
              >
                <Volume2 className="h-3 w-3" />
                <span>@channel</span>
                <span className="text-[9px] uppercase px-1 rounded font-extrabold bg-amber-500/20">
                  Semua di task
                </span>
              </button>

              {members.map((member) => {
                const isSelected = mentionedUserIds.includes(member.userId);
                const name = member.user?.name || member.user?.email || member.userId.substring(0, 6);
                return (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setMentionedUserIds(mentionedUserIds.filter((id) => id !== member.userId));
                      } else {
                        setMentionedUserIds([...mentionedUserIds, member.userId]);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-[#B1E743] text-[#141413] font-bold shadow-xs dark:bg-[#B1E743] dark:text-[#141413]'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                    }`}
                  >
                    <span>@{name}</span>
                    <span
                      className={`text-[9px] uppercase px-1 rounded font-bold ${
                        isSelected
                          ? 'bg-[#141413]/15 text-[#141413] dark:bg-[#141413]/20 dark:text-[#141413]'
                          : 'bg-black/10 text-stone-600 dark:bg-white/10 dark:text-stone-400'
                      }`}
                    >
                      {member.role}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Action Chips: @channel, + Image Link, + Video Link */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {!showMentionChips && (
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
          )}

          <button
            type="button"
            onClick={() => {
              const url = window.prompt('Masukkan URL Gambar / Screenshot (https://...):');
              if (url && url.trim()) {
                setCommentText((prev) => (prev ? `${prev}\n${url.trim()}` : url.trim()));
              }
            }}
            className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold transition-colors flex items-center gap-1"
            title="Insert image link (auto-previewed in chat)"
          >
            <ImageIcon className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            <span>+ Image Link</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const url = window.prompt('Masukkan URL Video YouTube / Loom / MP4 (https://...):');
              if (url && url.trim()) {
                setCommentText((prev) => (prev ? `${prev}\n${url.trim()}` : url.trim()));
              }
            }}
            className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold transition-colors flex items-center gap-1"
            title="Insert video link (auto-previewed in chat)"
          >
            <VideoIcon className="h-3 w-3 text-red-500" />
            <span>+ Video Link</span>
          </button>
        </div>

        {/* Text Input Box Form */}
        <form onSubmit={handleSendRoot} className="space-y-2">
          <Textarea
            id="task-comment-input"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={defaultPlaceholder}
            rows={3}
            className="text-xs"
          />

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-stone-400 italic">
              Tips: Paste link gambar, screenshot, video (YouTube/Loom), Figma, Drive, atau web link untuk preview otomatis.
            </span>

            <Button
              size="sm"
              variant="primary"
              type="submit"
              isLoading={isSubmitting}
              disabled={!commentText.trim()}
              className="h-7 text-xs px-3"
              rightIcon={<Send className="h-3 w-3" />}
            >
              Post Message
            </Button>
          </div>
        </form>
      </div>

      {/* Loading Skeleton */}
      {isLoading && comments.length === 0 ? (
        <Skeleton variant="text" className="h-20 w-full" />
      ) : error ? (
        <Alert tone="error" title="Discussion unavailable">
          <div className="flex items-center justify-between gap-3">
            <span>{error}</span>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        </Alert>
      ) : rootComments.length === 0 ? (
        /* Empty Discussion State */
        <div className="py-10 sm:py-12 px-4 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl bg-stone-50/50 dark:bg-stone-900/30 space-y-4 animate-fadeIn">
          <div className="flex justify-center">
            {emptyIllustrationUrl ? (
              <img
                src={emptyIllustrationUrl}
                alt="No discussion messages"
                className="dark:hidden w-full max-w-[260px] sm:max-w-[320px] md:max-w-[380px] h-auto max-h-60 sm:max-h-72 object-contain mx-auto transition-transform duration-300 hover:scale-[1.03] drop-shadow-xs"
                loading="lazy"
              />
            ) : null}
            <div className={`${emptyIllustrationUrl ? 'hidden dark:flex' : 'flex'} items-center justify-center py-2`}>
              <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-stone-900 border border-stone-800 shadow-inner">
                <div className="absolute inset-0 rounded-2xl bg-[#B1E743]/10 blur-lg pointer-events-none" />
                <MessageSquare className="h-7 w-7 text-[#B1E743]" />
              </div>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-medium max-w-sm mx-auto leading-relaxed">
            No messages in this discussion thread. Be the first to start the conversation!
          </p>
        </div>
      ) : (
        /* Comments List */
        <div className="space-y-3">
          {rootComments.map((comment) => {
            const authorName = getAuthorName(comment.authorId, comment.authorName);
            const authorRole = getAuthorRole(comment.authorId);
            const isMe = comment.authorId === currentUserId;
            const isEditing = editingCommentId === comment.id;
            const isReplying = replyParentId === comment.id;

            return (
              <div key={comment.id} className="space-y-2">
                {/* Parent Comment Card */}
                <div
                  className={`p-3 rounded-xl border transition-all text-xs shadow-xs ${
                    isMe
                      ? 'border-l-4 border-l-[#B1E743] bg-[#B1E743]/10 dark:bg-[#B1E743]/10 border-[#B1E743]/40 dark:border-[#B1E743]/30'
                      : 'border-l-4 border-l-stone-400 dark:border-l-stone-600 bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Avatar name={authorName} size="sm" className="h-5 w-5 text-[10px]" />
                      <span className="font-bold text-stone-900 dark:text-stone-100 truncate">{authorName}</span>
                      {isMe ? (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#B1E743] text-[#141413] shadow-xs">
                          Anda ({authorRole})
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                          {authorRole}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                      <span>
                        {new Date(comment.createdAt || Date.now()).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {/* Edited indicator */}
                      {comment.editedAt && !comment.deletedAt && (
                        <span
                          className="text-[9px] text-stone-400 italic bg-stone-100 dark:bg-stone-800 px-1 py-0.2 rounded"
                          title={`Diedit pada ${new Date(comment.editedAt).toLocaleTimeString()}`}
                        >
                          ✏️ diedit
                        </span>
                      )}

                      {/* Edit Button */}
                      {canManage(comment) && onUpdateComment && !isEditing && (
                        <IconButton
                          label="Edit message"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditingCommentText(comment.body);
                          }}
                          className="h-5 w-5 text-stone-400 hover:text-stone-900 dark:hover:text-[#B1E743]"
                        >
                          <Edit2 className="h-3 w-3" />
                        </IconButton>
                      )}

                      {/* Delete Button */}
                      {canManage(comment) && onDeleteComment && (
                        <IconButton
                          label="Delete message"
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

                  {/* Body / Editor */}
                  {isEditing ? (
                    <div className="space-y-2 mt-1.5">
                      <Textarea
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                        rows={2}
                        className="text-xs"
                      />
                      <div className="flex gap-1.5 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingCommentId(null)}
                          className="h-6 text-[11px] px-2"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleSaveEdit(comment.id)}
                          isLoading={isSavingEdit}
                          disabled={!editingCommentText.trim()}
                          className="h-6 text-[11px] px-2.5"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className={comment.deletedAt ? 'italic text-stone-400' : ''}>
                      <DiscussionMediaRenderer content={comment.body} />
                    </div>
                  )}

                  {/* Mentions tags list */}
                  {comment.mentions && comment.mentions.length > 0 && !comment.deletedAt && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium pt-1">
                      <span>Mentions:</span>
                      {comment.mentions.map((m) => (
                        <span key={m.userId} className="bg-amber-100 dark:bg-amber-950/60 px-1 rounded">
                          @{m.userName}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Reply Trigger Button */}
                  {!comment.deletedAt && (
                    <div className="pt-1.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (isReplying) {
                            setReplyParentId(null);
                            setReplyText('');
                          } else {
                            setReplyParentId(comment.id);
                            setReplyText('');
                          }
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline transition-all"
                      >
                        <Reply className="h-3 w-3" />
                        <span>{isReplying ? 'Batal Balas' : 'Balas'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Nested Replies List */}
                {comment.repliesList && comment.repliesList.length > 0 && (
                  <div className="pl-4 sm:pl-6 border-l-2 border-[#B1E743]/40 dark:border-[#B1E743]/40 space-y-2 pt-0.5">
                    {comment.repliesList.map((reply) => {
                      const replyAuthorName = getAuthorName(reply.authorId, reply.authorName);
                      const replyAuthorRole = getAuthorRole(reply.authorId);
                      const isReplyMe = reply.authorId === currentUserId;
                      const isReplyEditing = editingCommentId === reply.id;

                      return (
                        <div
                          key={reply.id}
                          className={`p-2.5 rounded-xl border transition-all text-xs ${
                            isReplyMe
                              ? 'border-l-3 border-l-[#B1E743] bg-[#B1E743]/10 dark:bg-[#B1E743]/10 border-[#B1E743]/30 dark:border-[#B1E743]/30'
                              : 'border-l-3 border-l-stone-300 dark:border-l-stone-700 bg-white dark:bg-stone-900 border-stone-200/60 dark:border-stone-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <CornerDownRight className="h-3 w-3 text-stone-400 shrink-0" />
                              <Avatar name={replyAuthorName} size="sm" className="h-4 w-4 text-[9px]" />
                              <span className="font-bold text-stone-900 dark:text-stone-100 truncate">
                                {replyAuthorName}
                              </span>
                              {isReplyMe ? (
                                <span className="text-[8px] font-extrabold px-1 py-0.2 rounded bg-[#B1E743] text-[#141413]">
                                  Anda
                                </span>
                              ) : (
                                <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                                  {replyAuthorRole}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                              <span>
                                {new Date(reply.createdAt || Date.now()).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>

                              {reply.editedAt && !reply.deletedAt && (
                                <span
                                  className="text-[9px] text-stone-400 italic bg-stone-100 dark:bg-stone-800 px-1 py-0.2 rounded"
                                  title={`Diedit pada ${new Date(reply.editedAt).toLocaleTimeString()}`}
                                >
                                  ✏️ diedit
                                </span>
                              )}

                              {canManage(reply) && onUpdateComment && !isReplyEditing && (
                                <IconButton
                                  label="Edit reply"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingCommentId(reply.id);
                                    setEditingCommentText(reply.body);
                                  }}
                                  className="h-4 w-4 text-stone-400 hover:text-stone-900 dark:hover:text-[#B1E743]"
                                >
                                  <Edit2 className="h-2.5 w-2.5" />
                                </IconButton>
                              )}

                              {canManage(reply) && onDeleteComment && (
                                <IconButton
                                  label="Delete reply"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(reply.id)}
                                  disabled={deletingId === reply.id}
                                  className="h-4 w-4 text-stone-400 hover:text-rose-500"
                                >
                                  {deletingId === reply.id ? (
                                    <LoadingSpinner size="sm" />
                                  ) : (
                                    <Trash2 className="h-2.5 w-2.5" />
                                  )}
                                </IconButton>
                              )}
                            </div>
                          </div>

                          {isReplyEditing ? (
                            <div className="space-y-1.5 mt-1">
                              <Textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                rows={2}
                                className="text-xs"
                              />
                              <div className="flex gap-1.5 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingCommentId(null)}
                                  className="h-5 text-[10px] px-2"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleSaveEdit(reply.id)}
                                  isLoading={isSavingEdit}
                                  disabled={!editingCommentText.trim()}
                                  className="h-5 text-[10px] px-2"
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className={reply.deletedAt ? 'italic text-stone-400' : ''}>
                              <DiscussionMediaRenderer content={reply.body} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Inline Reply Input Box */}
                {isReplying && (
                  <div className="pl-4 sm:pl-6 border-l-2 border-amber-300 dark:border-amber-700/80 pt-1">
                    <div className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/70 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300">
                        <span className="flex items-center gap-1">
                          <CornerDownRight className="h-3 w-3" /> Membalas @{authorName}...
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyParentId(null);
                            setReplyText('');
                          }}
                          className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Tulis balasan langsung untuk @${authorName}... (Paste link gambar, video, Figma, atau PR)`}
                        rows={2}
                        className="text-xs bg-white dark:bg-stone-900"
                      />

                      <div className="flex items-center justify-between gap-1.5 pt-0.5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const url = window.prompt('Masukkan URL Gambar (https://...):');
                              if (url && url.trim()) {
                                setReplyText((prev) => (prev ? `${prev}\n${url.trim()}` : url.trim()));
                              }
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 font-semibold hover:text-amber-600 flex items-center gap-1"
                            title="Insert image link"
                          >
                            <ImageIcon className="h-2.5 w-2.5 text-emerald-500" />
                            <span>+ Gambar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const url = window.prompt('Masukkan URL Video YouTube / Loom (https://...):');
                              if (url && url.trim()) {
                                setReplyText((prev) => (prev ? `${prev}\n${url.trim()}` : url.trim()));
                              }
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 font-semibold hover:text-amber-600 flex items-center gap-1"
                            title="Insert video link"
                          >
                            <VideoIcon className="h-2.5 w-2.5 text-red-500" />
                            <span>+ Video</span>
                          </button>
                        </div>

                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReplyParentId(null);
                              setReplyText('');
                            }}
                            className="h-6 text-[11px] px-2"
                          >
                            Batal
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleSendReply(comment.id)}
                            isLoading={isSubmittingReply}
                            disabled={!replyText.trim()}
                            className="h-6 text-[11px] px-2.5"
                            rightIcon={<Send className="h-2.5 w-2.5" />}
                          >
                            Kirim Balasan
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Load More Pagination */}
          {hasMore && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadMore}
                isLoading={isLoadingMore}
                className="text-xs"
              >
                Load More Comments
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modal: Delete Comment Confirmation */}
      <Modal
        isOpen={Boolean(commentToDelete)}
        onClose={() => {
          if (!deletingId) setCommentToDelete(null);
        }}
        title={commentToDelete?.isBubble ? 'Delete message?' : 'Delete comment?'}
        description={
          commentToDelete?.isBubble
            ? 'This action will remove the message from this discussion.'
            : 'This action will remove the comment and any direct replies from this task discussion.'
        }
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-stone-600 dark:text-stone-300">
            Are you sure you want to delete this {commentToDelete?.isBubble ? 'message' : 'comment'}? This action cannot be undone.
          </p>
          <div className="flex flex-col-reverse gap-2 border-t border-stone-100 pt-3 dark:border-stone-800 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommentToDelete(null)}
              disabled={Boolean(deletingId)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void handleConfirmDelete()}
              isLoading={Boolean(deletingId)}
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            >
              Delete {commentToDelete?.isBubble ? 'Message' : 'Comment'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

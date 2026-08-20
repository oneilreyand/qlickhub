import React, { useState, useEffect } from 'react';
import {
  FileText,
  MessageSquare,
  Settings,
  AlertCircle,
} from 'lucide-react';
import type { Task, TaskPriority, TaskComment, DeliveryArea } from '@qlick/contracts';
import { AccordionItem, AccordionTrigger, AccordionContent, useAccordion } from '../atoms/Accordion';
import { SubtaskSummaryRow } from '../molecules/SubtaskSummaryRow';
import { SubtaskDescriptionEditor } from '../molecules/SubtaskDescriptionEditor';
import { SubtaskCommentBox } from '../molecules/SubtaskCommentBox';
import { Tabs, TabItem } from '../molecules/Tabs';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { Input } from '../atoms/Input';
import { LoadingSpinner } from '../atoms/LoadingSpinner';
import { taskService } from '../../../lib/api/taskService';
import { useAppDispatch } from '../../../store/hooks';
import { enqueueSnackbar } from '../../../store/uiSlice';
import { useRealtimeEvents } from '../../../hooks/useRealtimeEvents';

export interface SubtaskAccordionItemProps {
  subtask: Task;
  workspaceId: string;
  currentUserId?: string;
  members?: Array<{ userId: string; role: string; user?: { name?: string; email?: string } }>;
  canMutate?: boolean;
  initialUnreadCount?: number;
  onClearUnread?: () => void;
  onSubtaskUpdated?: (updated: Task) => void;
}

export const SubtaskAccordionItem: React.FC<SubtaskAccordionItemProps> = ({
  subtask,
  workspaceId,
  currentUserId,
  members = [],
  canMutate = true,
  initialUnreadCount = 0,
  onClearUnread,
  onSubtaskUpdated,
}) => {
  const dispatch = useAppDispatch();
  const accordionContext = useAccordion();
  const isItemExpanded = accordionContext?.expandedItems.includes(subtask.id) || false;
  const [activeTab, setActiveTab] = useState<'description' | 'discussion' | 'settings'>('description');

  const currentUserRole = members.find((m) => m.userId === currentUserId)?.role;
  const isPlanner = Boolean(currentUserRole && ['owner', 'admin', 'po'].includes(currentUserRole));

  // Subtask local comments data
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [hasUnreadComment, setHasUnreadComment] = useState(initialUnreadCount > 0);
  const [unreadCommentCount, setUnreadCommentCount] = useState(initialUnreadCount);

  useEffect(() => {
    if (initialUnreadCount > 0) {
      setHasUnreadComment(true);
      setUnreadCommentCount(initialUnreadCount);
    }
  }, [initialUnreadCount]);

  // Connect realtime SSE event listener for subtask discussions
  useRealtimeEvents({
    workspaceId,
    enableToast: false,
    onCommentCreated: (payload) => {
      if (payload.taskId !== subtask.id) return;
      setComments((prev) => {
        if (!payload.comment.parentCommentId) {
          const exists = prev.some((c) => c.id === payload.comment.id);
          if (exists) return prev;
          return [...prev, payload.comment];
        }

        // If comment is a thread reply, nest under parent comment
        let matchedParent = false;
        const updated = prev.map((parent) => {
          if (parent.id === payload.comment.parentCommentId) {
            matchedParent = true;
            const replies = parent.replies || [];
            const exists = replies.some((r) => r.id === payload.comment.id);
            if (exists) return parent;
            return {
              ...parent,
              replies: [...replies, payload.comment],
            };
          }
          return parent;
        });

        if (!matchedParent) {
          const exists = prev.some((c) => c.id === payload.comment.id);
          if (exists) return prev;
          return [...prev, payload.comment];
        }

        return updated;
      });
      const isFromOtherUser = !currentUserId || payload.authorId !== currentUserId;
      if (isFromOtherUser && (!isItemExpanded || activeTab !== 'discussion')) {
        setHasUnreadComment(true);
        setUnreadCommentCount((prev) => prev + 1);
      }
    },
    onCommentUpdated: (payload) => {
      if (payload.taskId !== subtask.id) return;
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === payload.comment.id) {
            return { ...c, ...payload.comment, body: payload.comment.body, editedAt: payload.comment.editedAt };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === payload.comment.id
                  ? { ...r, ...payload.comment, body: payload.comment.body, editedAt: payload.comment.editedAt }
                  : r
              ),
            };
          }
          return c;
        })
      );
    },
    onCommentDeleted: (payload) => {
      if (payload.taskId !== subtask.id) return;
      setComments((prev) =>
        prev
          .filter((c) => c.id !== payload.commentId)
          .map((c) => ({
            ...c,
            replies: c.replies ? c.replies.filter((r) => r.id !== payload.commentId) : [],
          }))
      );
    },
  });


  // Settings / Meta local states
  const [priority, setPriority] = useState<TaskPriority>(subtask.priority);
  const [assigneeId, setAssigneeId] = useState(subtask.assigneeId || '');
  const [startDate, setStartDate] = useState(subtask.startDate || '');
  const [dueDate, setDueDate] = useState(subtask.dueDate || '');
  const [reviewNotes, setReviewNotes] = useState(subtask.reviewNotes || '');
  const [deliveryArea, setDeliveryArea] = useState<DeliveryArea | ''>(subtask.deliveryArea || '');
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setPriority(subtask.priority);
    setAssigneeId(subtask.assigneeId || '');
    setStartDate(subtask.startDate || '');
    setDueDate(subtask.dueDate || '');
    setReviewNotes(subtask.reviewNotes || '');
    setDeliveryArea(subtask.deliveryArea || '');
  }, [subtask.id, subtask.priority, subtask.assigneeId, subtask.startDate, subtask.dueDate, subtask.reviewNotes, subtask.deliveryArea]);

  const assigneeMember = members.find((m) => m.userId === subtask.assigneeId);
  const assigneeName = assigneeMember?.user?.name || assigneeMember?.user?.email;

  const filteredMembers = React.useMemo(() => {
    const area = deliveryArea || subtask.deliveryArea;
    if (!area) return members;
    return members.filter((m) => {
      const planner = ['owner', 'admin', 'po'].includes(m.role);
      if (planner) return true;
      if (area === 'frontend' || area === 'backend') return m.role === 'dev';
      if (area === 'qa') return m.role === 'qa';
      return true;
    });
  }, [members, deliveryArea, subtask.deliveryArea]);

  // Load comments for this subtask
  const loadSubtaskData = async () => {
    if (isLoadingData) return;
    setIsLoadingData(true);
    setLoadError(null);
    try {
      const commsRes = await taskService.listTaskComments(workspaceId, subtask.id);
      setComments(commsRes.comments || []);
      setHasLoadedData(true);
    } catch (err) {
      console.error('Failed to load subtask workspace data', err);
      setLoadError('Failed to load subtask details.');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isItemExpanded && !hasLoadedData && !isLoadingData) {
      void loadSubtaskData();
    }
  }, [isItemExpanded, hasLoadedData, isLoadingData]);


  const handleSaveDescription = async (newDescription: string) => {
    try {
      const updated = await taskService.updateTask(workspaceId, subtask.id, {
        description: newDescription,
      });
      dispatch(enqueueSnackbar('Subtask description saved', 'success'));
      onSubtaskUpdated?.(updated);
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to save description', 'error'));
      throw err;
    }
  };

  const handlePostComment = async (body: string, parentCommentId?: string | null) => {
    try {
      const newComment = await taskService.createTaskComment(workspaceId, subtask.id, {
        body,
        mentionedUserIds: [],
        parentCommentId: parentCommentId || undefined,
      });
      setComments((prev) => {
        const exists = prev.some((c) => c.id === newComment.id);
        if (exists) return prev;
        return [...prev, newComment];
      });
      dispatch(enqueueSnackbar('Note added to subtask', 'success'));
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to post note', 'error'));
      throw err;
    }
  };

  const handleUpdateComment = async (commentId: string, body: string) => {
    try {
      const updated = await taskService.updateTaskComment(workspaceId, subtask.id, commentId, { body });
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return { ...c, ...updated, body, editedAt: updated.editedAt || new Date().toISOString() };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId
                  ? { ...r, ...updated, body, editedAt: updated.editedAt || new Date().toISOString() }
                  : r
              ),
            };
          }
          return c;
        })
      );
      dispatch(enqueueSnackbar('Comment updated', 'success'));
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to update comment', 'error'));
      throw err;
    }
  };


  const handleDeleteComment = async (commentId: string) => {
    try {
      await taskService.deleteTaskComment(workspaceId, subtask.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      dispatch(enqueueSnackbar('Comment deleted', 'success'));
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to delete comment', 'error'));
      throw err;
    }
  };


  const handleSaveMeta = async () => {
    if (startDate && dueDate && startDate > dueDate) {
      dispatch(enqueueSnackbar('Start date cannot be after due date', 'error'));
      return;
    }
    setIsSavingMeta(true);
    try {
      const updated = await taskService.updateTask(workspaceId, subtask.id, {
        priority,
        assigneeId: assigneeId || null,
        startDate: startDate || null,
        dueDate: dueDate || null,
        reviewNotes: reviewNotes || null,
        deliveryArea: deliveryArea === '' ? undefined : deliveryArea,
      });
      dispatch(enqueueSnackbar('Subtask details updated', 'success'));
      onSubtaskUpdated?.(updated);
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to update details', 'error'));
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleAccordionOpen = () => {
    if (!hasLoadedData) {
      void loadSubtaskData();
    }
    if (activeTab === 'discussion') {
      setHasUnreadComment(false);
      setUnreadCommentCount(0);
      onClearUnread?.();
    }
  };

  const handleTabChange = (t: string) => {
    setActiveTab(t as any);
    if (t === 'discussion') {
      setHasUnreadComment(false);
      setUnreadCommentCount(0);
      onClearUnread?.();
    }
  };

  const totalCommentsCount = React.useMemo(() => {
    let count = comments.length;
    for (const c of comments) {
      if (c.replies && c.replies.length > 0) {
        count += c.replies.length;
      }
    }
    return count;
  }, [comments]);

  const tabs: TabItem[] = [
    {
      id: 'description',
      label: 'Description',
      icon: <FileText className="h-3.5 w-3.5" />,
    },
    {
      id: 'discussion',
      label: 'Discussion',
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      count: totalCommentsCount > 0 ? totalCommentsCount : undefined,
      badge: hasUnreadComment ? (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 shadow-xs ring-1 ring-amber-500/50 animate-pulse"
          title={`${unreadCommentCount} pesan diskusi baru masuk`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-stone-950" />
          +{unreadCommentCount} Baru
        </span>
      ) : undefined,
    },
    {
      id: 'settings',
      label: 'Details',
      icon: <Settings className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <AccordionItem id={subtask.id}>
      <AccordionTrigger onClick={handleAccordionOpen}>
        <SubtaskSummaryRow
          subtask={subtask}
          assigneeName={assigneeName}
          commentCount={totalCommentsCount}
          hasUnreadComment={hasUnreadComment}
          unreadCommentCount={unreadCommentCount}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      </AccordionTrigger>

      <AccordionContent>
        {isLoadingData && !hasLoadedData ? (
          <div className="flex items-center justify-center py-6 gap-2 text-xs text-stone-500">
            <LoadingSpinner size="sm" />
            <span>Loading subtask workspace...</span>
          </div>
        ) : loadError ? (
          <div className="p-3 text-rose-500 text-xs">
            {loadError}
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* Reviewer Notes Banner if Changes Requested */}
            {subtask.reviewNotes && (
              <div className="p-2.5 rounded-xl bg-rose-50/90 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 space-y-1 text-xs">
                <span className="font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-3.5 w-3.5" /> Reviewer Notes:
                </span>
                <p className="leading-relaxed">{subtask.reviewNotes}</p>
              </div>
            )}

            {/* Inner Subtask Tabs */}
            <div className="border-b border-stone-200 dark:border-stone-800 pb-1">
              <Tabs
                tabs={tabs}
                activeTabId={activeTab}
                onChange={handleTabChange}
                variant="underline"
              />
            </div>


            {/* Tab 1: Description & Technical Guidance (Editable only by PO/Admin/Owner) */}
            {activeTab === 'description' && (
              <SubtaskDescriptionEditor
                description={subtask.description}
                onSave={handleSaveDescription}
                canEdit={canMutate && isPlanner}
                deliveryArea={subtask.deliveryArea}
              />
            )}

            {/* Tab 2: Discussion & Rich Media Chat */}
            {activeTab === 'discussion' && (
              <SubtaskCommentBox
                comments={comments}
                currentUserId={currentUserId}
                members={members}
                onPostComment={handlePostComment}
                onUpdateComment={handleUpdateComment}
                onDeleteComment={handleDeleteComment}
              />
            )}


            {/* Tab 3: Settings & Metadata (Editable only by PO/Admin/Owner) */}
            {activeTab === 'settings' && (
              <div className="space-y-3 p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-stone-600 dark:text-stone-400 font-bold mb-1">
                      Delivery Area
                    </label>
                    <Select
                      value={deliveryArea}
                      onChange={(e) => setDeliveryArea(e.target.value as DeliveryArea | '')}
                      disabled={!canMutate || !isPlanner}
                    >
                      <option value="">None</option>
                      <option value="frontend">Frontend</option>
                      <option value="backend">Backend</option>
                      <option value="mobile">Mobile</option>
                      <option value="fullstack">Fullstack</option>
                      <option value="qa">QA</option>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-stone-600 dark:text-stone-400 font-bold mb-1">
                      Assignee
                    </label>
                    <Select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      disabled={!canMutate || !isPlanner}
                    >
                      <option value="">Unassigned</option>
                      {filteredMembers.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.user?.name || m.user?.email || m.userId} ({m.role.toUpperCase()})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-stone-600 dark:text-stone-400 font-bold mb-1">
                      Priority
                    </label>
                    <Select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TaskPriority)}
                      disabled={!canMutate || !isPlanner}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-stone-600 dark:text-stone-400 font-bold mb-1">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={!canMutate || !isPlanner}
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 dark:text-stone-400 font-bold mb-1">
                      Due Date
                    </label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      disabled={!canMutate || !isPlanner}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-stone-600 dark:text-stone-400 font-bold mb-1">
                    Reviewer Notes / Feedback
                  </label>
                  <Input
                    type="text"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="e.g. Please add error handling for 422 before marking done"
                    disabled={!canMutate || !isPlanner}
                  />
                </div>

                {canMutate && isPlanner && (
                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleSaveMeta}
                      isLoading={isSavingMeta}
                    >
                      Save Details
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
};

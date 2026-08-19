import React, { useState, useEffect } from 'react';
import {
  FileText,
  Paperclip,
  MessageSquare,
  Settings,
  AlertCircle,
} from 'lucide-react';
import type { Task, TaskStatus, TaskPriority, TaskAttachment, TaskComment, DeliveryArea } from '@qlick/contracts';
import { AccordionItem, AccordionTrigger, AccordionContent, useAccordion } from '../atoms/Accordion';
import { SubtaskSummaryRow } from '../molecules/SubtaskSummaryRow';
import { SubtaskDescriptionEditor } from '../molecules/SubtaskDescriptionEditor';
import { SubtaskAttachmentsBox } from '../molecules/SubtaskAttachmentsBox';
import { SubtaskCommentBox } from '../molecules/SubtaskCommentBox';
import { Tabs, TabItem } from '../molecules/Tabs';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { Input } from '../atoms/Input';
import { LoadingSpinner } from '../atoms/LoadingSpinner';
import { attachmentService } from '../../../lib/api/attachmentService';
import { taskService } from '../../../lib/api/taskService';
import { useAppDispatch } from '../../../store/hooks';
import { enqueueSnackbar } from '../../../store/uiSlice';

export interface SubtaskAccordionItemProps {
  subtask: Task;
  workspaceId: string;
  currentUserId?: string;
  members?: Array<{ userId: string; role: string; user?: { name?: string; email?: string } }>;
  canMutate?: boolean;
  onSubtaskUpdated?: (updated: Task) => void;
  onStatusChange?: (subtaskId: string, newStatus: TaskStatus) => void;
}

export const SubtaskAccordionItem: React.FC<SubtaskAccordionItemProps> = ({
  subtask,
  workspaceId,
  currentUserId,
  members = [],
  canMutate = true,
  onSubtaskUpdated,
  onStatusChange,
}) => {
  const dispatch = useAppDispatch();
  const accordionContext = useAccordion();
  const isItemExpanded = accordionContext?.expandedItems.includes(subtask.id) || false;
  const [activeTab, setActiveTab] = useState<'description' | 'attachments' | 'discussion' | 'settings'>('description');

  // Subtask local data
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

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
      const isPlanner = ['owner', 'admin', 'po'].includes(m.role);
      if (isPlanner) return true;
      if (area === 'frontend' || area === 'backend') return m.role === 'dev';
      if (area === 'qa') return m.role === 'qa';
      return true;
    });
  }, [members, deliveryArea, subtask.deliveryArea]);

  // Load attachments and comments for this subtask
  const loadSubtaskData = async () => {
    if (isLoadingData) return;
    setIsLoadingData(true);
    setLoadError(null);
    try {
      const [atts, commsRes] = await Promise.all([
        attachmentService.listAttachments(workspaceId, subtask.id),
        taskService.listTaskComments(workspaceId, subtask.id),
      ]);
      setAttachments(atts || []);
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

  const handleAccordionOpen = () => {
    if (!hasLoadedData) {
      void loadSubtaskData();
    }
  };

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

  const handleAttachmentUploaded = (newAtt: TaskAttachment) => {
    setAttachments((prev) => [newAtt, ...prev]);
    dispatch(enqueueSnackbar('Attachment uploaded to subtask', 'success'));
  };

  const handleAttachmentDeleted = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
    dispatch(enqueueSnackbar('Attachment removed', 'success'));
  };

  const handlePostComment = async (body: string, parentCommentId?: string | null) => {
    try {
      const newComment = await taskService.createTaskComment(workspaceId, subtask.id, {
        body,
        mentionedUserIds: [],
        parentCommentId: parentCommentId || undefined,
      });
      setComments((prev) => [...prev, newComment]);
      dispatch(enqueueSnackbar('Note added to subtask', 'success'));
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to post note', 'error'));
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

  const tabs: TabItem[] = [
    {
      id: 'description',
      label: 'Description',
      icon: <FileText className="h-3.5 w-3.5" />,
    },
    {
      id: 'attachments',
      label: 'Evidence & Files',
      icon: <Paperclip className="h-3.5 w-3.5" />,
      count: attachments.length > 0 ? attachments.length : undefined,
    },
    {
      id: 'discussion',
      label: 'Discussion',
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      count: comments.length > 0 ? comments.length : undefined,
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
          commentCount={comments.length}
          attachmentCount={attachments.length}
          currentUserId={currentUserId}
          currentUserRole={members.find((m) => m.userId === currentUserId)?.role}
          onStatusChange={onStatusChange}
          canMutate={canMutate}
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
                onChange={(t) => setActiveTab(t as any)}
                variant="underline"
              />
            </div>

            {/* Tab 1: Description & Technical Guidance */}
            {activeTab === 'description' && (
              <SubtaskDescriptionEditor
                description={subtask.description}
                onSave={handleSaveDescription}
                canEdit={canMutate}
                deliveryArea={subtask.deliveryArea}
              />
            )}

            {/* Tab 2: Evidence & Images */}
            {activeTab === 'attachments' && (
              <SubtaskAttachmentsBox
                workspaceId={workspaceId}
                subtaskId={subtask.id}
                attachments={attachments}
                onAttachmentUploaded={handleAttachmentUploaded}
                onAttachmentDeleted={handleAttachmentDeleted}
                canUpload={canMutate}
              />
            )}

            {/* Tab 3: Discussion & Chat */}
            {activeTab === 'discussion' && (
              <SubtaskCommentBox
                comments={comments}
                currentUserId={currentUserId}
                members={members}
                onPostComment={handlePostComment}
                onDeleteComment={handleDeleteComment}
              />
            )}

            {/* Tab 4: Settings & Metadata */}
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
                      disabled={!canMutate}
                    >
                      <option value="">None</option>
                      <option value="frontend">Frontend</option>
                      <option value="backend">Backend</option>
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
                      disabled={!canMutate}
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
                      disabled={!canMutate}
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
                      disabled={!canMutate}
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
                      disabled={!canMutate}
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
                    disabled={!canMutate}
                  />
                </div>

                {canMutate && (
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

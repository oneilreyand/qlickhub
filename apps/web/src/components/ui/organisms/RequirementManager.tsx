import React, { useState, useEffect, useCallback } from 'react';
import {
  AcceptanceCriterion,
  Requirement,
  RequirementDetailResponse,
  RequirementStatus,
  TaskRequirementLink,
  WorkspaceRole,
} from '@qlick/contracts';
import { requirementService } from '../../../lib/api/requirementService';
import { suggestRequirementCode } from '../../../lib/requirements/suggestRequirementCode';
import { RequirementFormModal } from '../molecules/RequirementFormModal';
import { Button } from '../atoms/Button';
import { IconButton } from '../atoms/IconButton';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';
import { Badge } from '../atoms/Badge';
import { Skeleton } from '../atoms/Skeleton';
import { Checkbox } from '../atoms/Checkbox';
import { FormattedText } from '../atoms/FormattedText';
import { EmptyState } from '../molecules/EmptyState';
import { Modal } from '../molecules/Modal';
import { Alert } from '../atoms/Alert';
import {
  FileText,
  Plus,
  Search,
  ExternalLink,
  Link as LinkIcon,
  Unlink,
  Edit2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Layers,
  Lock,
  Trash2,
} from 'lucide-react';

export interface RequirementManagerProps {
  workspaceId: string;
  taskId?: string;
  userRole: WorkspaceRole;
  onRequirementChanged?: () => void;
  onPlanSubtask?: (requirement: Requirement) => void;
  initialState?: RequirementManagerInitialState;
}

export interface RequirementManagerInitialState {
  requirements: Requirement[];
  taskLinks: TaskRequirementLink[];
  error: string | null;
}

export const RequirementManager: React.FC<RequirementManagerProps> = ({
  workspaceId,
  taskId,
  userRole,
  onRequirementChanged,
  onPlanSubtask,
  initialState,
}) => {
  const [requirements, setRequirements] = useState<Requirement[]>(initialState?.requirements || []);
  const [taskLinks, setTaskLinks] = useState<TaskRequirementLink[]>(initialState?.taskLinks || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(!initialState);
  const [error, setError] = useState<string | null>(initialState?.error || null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Expanded details map
  const [expandedReqId, setExpandedReqId] = useState<string | null>(null);
  const [requirementDetails, setRequirementDetails] = useState<
    Record<string, RequirementDetailResponse>
  >({});
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});

  // Acceptance Criterion editor state
  const [criterionEditor, setCriterionEditor] = useState<{
    requirementId: string;
    criterion?: AcceptanceCriterion;
  } | null>(null);
  const [criterionText, setCriterionText] = useState('');
  const [criterionError, setCriterionError] = useState<string | null>(null);
  const [isCriterionSaving, setIsCriterionSaving] = useState(false);
  const [criterionActionId, setCriterionActionId] = useState<string | null>(null);

  // Action loading state per requirement ID
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedRequirementIds, setSelectedRequirementIds] = useState<string[]>([]);
  const [isBulkCorrectionOpen, setIsBulkCorrectionOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'unlink' | 'deprecate' | 'delete'>('unlink');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const canManage = ['owner', 'admin', 'po'].includes(userRole);

  const loadData = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [reqs, links] = await Promise.all([
        requirementService.listRequirements(workspaceId),
        taskId
          ? requirementService.listTaskRequirementLinks(workspaceId, taskId)
          : Promise.resolve([]),
      ]);
      setRequirements(reqs || []);
      setTaskLinks(links || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load requirements.');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, taskId]);

  useEffect(() => {
    setExpandedReqId(null);
    setRequirementDetails({});
    setDetailErrors({});
    setSelectedRequirementIds([]);
    setCriterionEditor(null);
    if (initialState) {
      setRequirements(initialState.requirements);
      setTaskLinks(initialState.taskLinks);
      setError(initialState.error);
      setIsLoading(false);
      return;
    }
    setTaskLinks([]);
    void loadData();
  }, [initialState, loadData]);

  const loadDetail = async (reqId: string) => {
    if (requirementDetails[reqId] && !detailErrors[reqId]) return;
    setIsLoadingDetail(true);
    setDetailErrors((current) => {
      const next = { ...current };
      delete next[reqId];
      return next;
    });
    try {
      const detail = await requirementService.getRequirement(workspaceId, reqId);
      setRequirementDetails((prev) => ({ ...prev, [reqId]: detail }));
    } catch (error) {
      setDetailErrors((current) => ({
        ...current,
        [reqId]: error instanceof Error ? error.message : 'Unable to load Requirement details.',
      }));
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleToggleExpand = (reqId: string) => {
    if (expandedReqId === reqId) {
      setExpandedReqId(null);
    } else {
      setExpandedReqId(reqId);
      loadDetail(reqId);
    }
  };

  const handleSaveRequirement = async (
    data: {
      code?: string;
      title: string;
      description?: string | null;
      url?: string | null;
      status?: RequirementStatus;
    },
    shouldPlanSubtask = false,
  ) => {
    if (!canManage) return;
    setIsSaving(true);
    try {
      if (editingRequirement) {
        const updated = await requirementService.updateRequirement(
          workspaceId,
          editingRequirement.id,
          data,
        );
        setRequirements((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        if (requirementDetails[editingRequirement.id]) {
          const detail = await requirementService.getRequirement(
            workspaceId,
            editingRequirement.id,
          );
          setRequirementDetails((prev) => ({ ...prev, [editingRequirement.id]: detail }));
        }
      } else {
        const created = await requirementService.createRequirement(workspaceId, data);
        if (taskId) {
          await requirementService.linkRequirement(workspaceId, taskId, created.id);
        }
        await loadData();
        if (shouldPlanSubtask) {
          onPlanSubtask?.(created);
        }
      }
      onRequirementChanged?.();
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkToTask = async (reqId: string) => {
    if (!canManage || !taskId) return;
    setActionLoadingId(reqId);
    try {
      const link = await requirementService.linkRequirement(workspaceId, taskId, reqId);
      setTaskLinks((prev) => [...prev, link]);
      onRequirementChanged?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to link requirement.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnlinkFromTask = async (reqId: string) => {
    if (!canManage || !taskId) return;
    setActionLoadingId(reqId);
    try {
      await requirementService.unlinkRequirement(workspaceId, taskId, reqId);
      setTaskLinks((prev) => prev.filter((l) => l.requirementId !== reqId));
      onRequirementChanged?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to unlink requirement.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleRequirementSelection = (requirementId: string) => {
    setSelectedRequirementIds((current) =>
      current.includes(requirementId)
        ? current.filter((id) => id !== requirementId)
        : [...current, requirementId],
    );
  };

  const openCriterionEditor = (requirementId: string, criterion?: AcceptanceCriterion) => {
    setCriterionEditor({ requirementId, criterion });
    setCriterionText(criterion?.text || '');
    setCriterionError(null);
  };

  const closeCriterionEditor = () => {
    if (isCriterionSaving) return;
    setCriterionEditor(null);
    setCriterionText('');
    setCriterionError(null);
  };

  const handleSaveCriterion = async () => {
    if (!canManage || !criterionEditor) return;
    const text = criterionText.trim();
    if (!text) {
      setCriterionError('Acceptance Criterion is required.');
      return;
    }

    setIsCriterionSaving(true);
    setCriterionError(null);
    try {
      const saved = criterionEditor.criterion
        ? await requirementService.updateAcceptanceCriterion(
            workspaceId,
            criterionEditor.requirementId,
            criterionEditor.criterion.id,
            { text },
          )
        : await requirementService.createAcceptanceCriterion(
            workspaceId,
            criterionEditor.requirementId,
            { text },
          );

      setRequirementDetails((current) => {
        const detail = current[criterionEditor.requirementId];
        if (!detail) return current;
        const existing = detail.acceptanceCriteria || [];
        const acceptanceCriteria = criterionEditor.criterion
          ? existing.map((criterion) => (criterion.id === saved.id ? saved : criterion))
          : [...existing, saved].sort((a, b) => a.sequence - b.sequence);
        return {
          ...current,
          [criterionEditor.requirementId]: { ...detail, acceptanceCriteria },
        };
      });
      setCriterionEditor(null);
      setCriterionText('');
      onRequirementChanged?.();
    } catch (error) {
      setCriterionError(
        error instanceof Error ? error.message : 'Unable to save the Acceptance Criterion.',
      );
    } finally {
      setIsCriterionSaving(false);
    }
  };

  const handleCriterionStatusChange = async (
    requirementId: string,
    criterion: AcceptanceCriterion,
  ) => {
    if (!canManage) return;
    setCriterionActionId(criterion.id);
    setDetailErrors((current) => {
      const next = { ...current };
      delete next[requirementId];
      return next;
    });
    try {
      const updated = await requirementService.updateAcceptanceCriterion(
        workspaceId,
        requirementId,
        criterion.id,
        { status: criterion.status === 'active' ? 'deprecated' : 'active' },
      );
      setRequirementDetails((current) => {
        const detail = current[requirementId];
        if (!detail) return current;
        return {
          ...current,
          [requirementId]: {
            ...detail,
            acceptanceCriteria: (detail.acceptanceCriteria || []).map((item) =>
              item.id === updated.id ? updated : item,
            ),
          },
        };
      });
      onRequirementChanged?.();
    } catch (error) {
      setDetailErrors((current) => ({
        ...current,
        [requirementId]:
          error instanceof Error
            ? error.message
            : 'Unable to update the Acceptance Criterion status.',
      }));
    } finally {
      setCriterionActionId(null);
    }
  };

  const handleToggleAllLinkedSelection = () => {
    const linkedIds = filteredLinkedRequirements.map((requirement) => requirement.id);
    const allFilteredLinkedAreSelected =
      linkedIds.length > 0 && linkedIds.every((id) => selectedRequirementIds.includes(id));

    setSelectedRequirementIds((current) =>
      allFilteredLinkedAreSelected
        ? current.filter((id) => !linkedIds.includes(id))
        : Array.from(new Set([...current, ...linkedIds])),
    );
  };

  const handleBulkCorrection = async () => {
    if (!canManage || !taskId || selectedRequirementIds.length === 0) return;

    setIsBulkSaving(true);
    setError(null);
    try {
      await requirementService.bulkCorrectTaskRequirements(workspaceId, taskId, {
        requirementIds: selectedRequirementIds,
        action: bulkAction,
        ...(bulkAction === 'delete' ? { confirmation: deleteConfirmation } : {}),
      });
      setSelectedRequirementIds([]);
      setDeleteConfirmation('');
      setIsBulkCorrectionOpen(false);
      await loadData();
      onRequirementChanged?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to apply the bulk correction.');
    } finally {
      setIsBulkSaving(false);
    }
  };

  const isLinked = (reqId: string) => taskLinks.some((l) => l.requirementId === reqId);

  const matchesSearch = (requirement: Requirement) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      requirement.title.toLowerCase().includes(q) ||
      requirement.code.toLowerCase().includes(q) ||
      (requirement.description && requirement.description.toLowerCase().includes(q))
    );
  };

  const isTaskContext = Boolean(taskId);
  const linkedRequirements = isTaskContext
    ? requirements.filter((requirement) => isLinked(requirement.id))
    : requirements;
  const availableRequirements =
    isTaskContext && canManage
      ? requirements.filter((requirement) => !isLinked(requirement.id))
      : [];
  const filteredLinkedRequirements = linkedRequirements.filter(matchesSearch);
  const filteredAvailableRequirements = availableRequirements.filter(matchesSearch);
  const searchableRequirementCount = isTaskContext
    ? linkedRequirements.length + availableRequirements.length
    : requirements.length;
  const selectedLinkedRequirementCount = selectedRequirementIds.filter((id) =>
    linkedRequirements.some((requirement) => requirement.id === id),
  ).length;
  const allFilteredLinkedAreSelected =
    filteredLinkedRequirements.length > 0 &&
    filteredLinkedRequirements.every((requirement) =>
      selectedRequirementIds.includes(requirement.id),
    );
  const suggestedCode = taskId
    ? suggestRequirementCode(linkedRequirements, requirements)
    : undefined;

  type RequirementDisplayEntry =
    | { kind: 'requirement'; requirement: Requirement }
    | { kind: 'linked-empty' }
    | { kind: 'available-heading' }
    | { kind: 'available-empty' };

  const displayEntries: RequirementDisplayEntry[] = [];
  if (isTaskContext) {
    if (filteredLinkedRequirements.length > 0) {
      displayEntries.push(
        ...filteredLinkedRequirements.map((requirement) => ({
          kind: 'requirement' as const,
          requirement,
        })),
      );
    } else {
      displayEntries.push({ kind: 'linked-empty' });
    }

    if (canManage) {
      displayEntries.push({ kind: 'available-heading' });
      if (filteredAvailableRequirements.length > 0) {
        displayEntries.push(
          ...filteredAvailableRequirements.map((requirement) => ({
            kind: 'requirement' as const,
            requirement,
          })),
        );
      } else {
        displayEntries.push({ kind: 'available-empty' });
      }
    }
  } else {
    displayEntries.push(
      ...filteredLinkedRequirements.map((requirement) => ({
        kind: 'requirement' as const,
        requirement,
      })),
    );
  }

  const getStatusBadge = (status: RequirementStatus) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="passed" size="sm">
            Active
          </Badge>
        );
      case 'draft':
        return (
          <Badge variant="neutral" size="sm">
            Draft
          </Badge>
        );
      case 'deprecated':
        return (
          <Badge variant="review" size="sm">
            Deprecated
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4" data-testid="requirement-manager">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-[#B1E743] dark:text-[#B1E743]" />
            <span>
              {isTaskContext ? 'Linked Requirements' : 'Requirements'} ({linkedRequirements.length})
            </span>
          </h4>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            {isTaskContext
              ? canManage
                ? 'Review linked requirements or add an existing Workspace Requirement.'
                : 'Requirements linked to this task. Product Owners and Admins manage links.'
              : canManage
                ? 'Manage structured Requirements, their Acceptance Criteria, and specific source links.'
                : 'Read-only access. Product Owners and Admins manage Requirements and Acceptance Criteria.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!canManage && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded-lg">
              <Lock className="h-3 w-3" />
              <span>Read-Only</span>
            </span>
          )}

          {canManage && (
            <>
              {isTaskContext && linkedRequirements.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedLinkedRequirementCount === 0}
                  onClick={() => setIsBulkCorrectionOpen(true)}
                  data-testid="bulk-correct-requirements-btn"
                >
                  Correct selected ({selectedLinkedRequirementCount})
                </Button>
              )}
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                disabled={isLoading}
                title={isLoading ? 'Loading Requirement codes' : undefined}
                onClick={() => {
                  setEditingRequirement(null);
                  setIsModalOpen(true);
                }}
                data-testid="create-requirement-btn"
              >
                New Requirement
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && <Alert tone="error">{error}</Alert>}

      {/* Search Input */}
      {searchableRequirementCount > 0 && (
        <div className="relative">
          <Input
            placeholder="Search requirements by code, title, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-3.5 w-3.5" />}
            className="text-xs"
          />
        </div>
      )}

      {isTaskContext && canManage && filteredLinkedRequirements.length > 0 && !isLoading && (
        <Checkbox
          id="select-all-linked-requirements"
          checked={allFilteredLinkedAreSelected}
          onChange={handleToggleAllLinkedSelection}
          label={`Select all ${filteredLinkedRequirements.length} linked Requirements`}
          className="text-xs"
        />
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-2.5" data-testid="requirement-loading">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : displayEntries.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'No matching requirements' : 'No requirements found'}
          description={
            searchQuery
              ? 'Try adjusting your search terms.'
              : canManage
                ? 'Create the first Requirement and define its testable Acceptance Criteria.'
                : 'No Requirements have been linked yet by the Product Owner.'
          }
          icon={<FileText className="h-8 w-8 text-stone-400" />}
          actionLabel={canManage && !searchQuery ? 'Create Requirement' : undefined}
          onAction={
            canManage && !searchQuery
              ? () => {
                  setEditingRequirement(null);
                  setIsModalOpen(true);
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-2.5" data-testid="requirement-list">
          {displayEntries.map((entry) => {
            if (entry.kind === 'linked-empty') {
              return (
                <EmptyState
                  key="linked-requirements-empty"
                  title={searchQuery ? 'No linked requirements match' : 'No requirement linked'}
                  description={
                    searchQuery
                      ? 'Try adjusting your search terms.'
                      : 'This task does not have a linked Requirement yet.'
                  }
                  icon={<FileText className="h-8 w-8 text-stone-400" />}
                />
              );
            }

            if (entry.kind === 'available-heading') {
              return (
                <div
                  key="available-requirements-heading"
                  className="pt-3 mt-1 border-t border-stone-200 dark:border-stone-800"
                >
                  <h5 className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Available Workspace Requirements ({availableRequirements.length})
                  </h5>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    These Requirements are available to link and are not counted as part of this
                    task.
                  </p>
                </div>
              );
            }

            if (entry.kind === 'available-empty') {
              return (
                <p
                  key="available-requirements-empty"
                  className="text-[11px] text-stone-400 dark:text-stone-500 italic"
                >
                  {searchQuery
                    ? 'No available Workspace Requirements match your search.'
                    : 'All Workspace Requirements are already linked to this task.'}
                </p>
              );
            }

            const req = entry.requirement;
            const linked = isLinked(req.id);
            const isExpanded = expandedReqId === req.id;
            const detail = requirementDetails[req.id];
            const isActionLoading = actionLoadingId === req.id;

            return (
              <div
                key={req.id}
                data-testid={'requirement-item-' + req.id}
                className={`p-3 sm:p-3.5 rounded-xl border transition-all ${
                  linked
                    ? 'border-[#B1E743]/50 bg-[#B1E743]/5 dark:border-[#B1E743]/30 dark:bg-[#B1E743]/5'
                    : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    {taskId && canManage && linked && (
                      <Checkbox
                        id={`select-requirement-${req.id}`}
                        checked={selectedRequirementIds.includes(req.id)}
                        onChange={() => handleToggleRequirementSelection(req.id)}
                        aria-label={`Select ${req.code}: ${req.title}`}
                        className="shrink-0"
                      />
                    )}
                    <span className="font-mono text-[11px] font-bold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded shrink-0">
                      {req.code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                          {req.title}
                        </span>
                        {getStatusBadge(req.status)}
                        {linked && (
                          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Linked to this task</span>
                          </span>
                        )}
                      </div>

                      {req.url && (
                        <a
                          href={req.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Source / Reference: ${req.url}`}
                          className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-[11px] font-medium text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400 sm:max-w-md"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="shrink-0">Source / Reference:</span>
                          <span className="truncate">{req.url}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <IconButton
                      size="sm"
                      variant="ghost"
                      label={isExpanded ? 'Collapse details' : 'Expand details'}
                      onClick={() => handleToggleExpand(req.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </IconButton>

                    {canManage && (
                      <IconButton
                        size="sm"
                        variant="ghost"
                        label="Edit requirement"
                        onClick={() => {
                          setEditingRequirement(req);
                          setIsModalOpen(true);
                        }}
                        data-testid={'edit-requirement-' + req.id}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </IconButton>
                    )}

                    {taskId &&
                      canManage &&
                      (linked ? (
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={isActionLoading}
                          onClick={() => handleUnlinkFromTask(req.id)}
                          leftIcon={<Unlink className="h-3 w-3 text-rose-500" />}
                          className="hover:border-rose-300 hover:text-rose-600 dark:hover:text-rose-400"
                        >
                          Unlink
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={isActionLoading}
                          onClick={() => handleLinkToTask(req.id)}
                          leftIcon={<LinkIcon className="h-3 w-3 text-stone-500" />}
                        >
                          Link
                        </Button>
                      ))}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800 text-xs space-y-2.5">
                    {req.description && (
                      <div>
                        <span className="font-semibold text-stone-600 dark:text-stone-400 block mb-0.5">
                          Description:
                        </span>
                        <FormattedText content={req.description} />
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="font-semibold text-stone-600 dark:text-stone-400">
                          Acceptance Criteria (
                          {detail ? (detail.acceptanceCriteria || []).length : '...'})
                        </span>
                        {canManage && detail && (
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<Plus className="h-3.5 w-3.5" />}
                            onClick={() => openCriterionEditor(req.id)}
                          >
                            Add Acceptance Criterion
                          </Button>
                        )}
                      </div>

                      {detailErrors[req.id] && (
                        <Alert tone="error">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <span>{detailErrors[req.id]}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void loadDetail(req.id)}
                            >
                              Retry
                            </Button>
                          </div>
                        </Alert>
                      )}

                      {isLoadingDetail && !detail ? (
                        <div className="space-y-2" aria-label="Loading Acceptance Criteria">
                          <Skeleton className="h-12 w-full rounded-xl" />
                        </div>
                      ) : detail && (detail.acceptanceCriteria || []).length > 0 ? (
                        <div className="space-y-2">
                          {(detail.acceptanceCriteria || []).map((criterion) => (
                            <div
                              key={criterion.id}
                              className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-950/50 sm:flex-row sm:items-start sm:justify-between"
                            >
                              <div className="flex min-w-0 items-start gap-2">
                                <span className="shrink-0 rounded-md bg-stone-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                                  {criterion.code}
                                </span>
                                <div className="min-w-0">
                                  <p
                                    className={`whitespace-pre-wrap leading-relaxed ${
                                      criterion.status === 'deprecated'
                                        ? 'text-stone-400 line-through dark:text-stone-500'
                                        : 'text-stone-800 dark:text-stone-200'
                                    }`}
                                  >
                                    {criterion.text}
                                  </p>
                                  {criterion.status === 'deprecated' && (
                                    <span className="mt-1 inline-block text-[10px] font-semibold uppercase text-amber-600 dark:text-amber-400">
                                      Deprecated
                                    </span>
                                  )}
                                </div>
                              </div>
                              {canManage && (
                                <div className="flex shrink-0 flex-wrap gap-1.5 self-end sm:self-start">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openCriterionEditor(req.id, criterion)}
                                  >
                                    Edit {criterion.code}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    isLoading={criterionActionId === criterion.id}
                                    onClick={() =>
                                      void handleCriterionStatusChange(req.id, criterion)
                                    }
                                  >
                                    {criterion.status === 'active'
                                      ? `Deactivate ${criterion.code}`
                                      : `Reactivate ${criterion.code}`}
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : detail ? (
                        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-[11px] text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300">
                          No Acceptance Criteria defined. Add testable outcomes before using this
                          Requirement for delivery.
                        </div>
                      ) : null}
                    </div>

                    {/* Linked tasks summary */}
                    <div>
                      <span className="font-semibold text-stone-600 dark:text-stone-400 flex items-center gap-1 mb-1">
                        <Layers className="h-3.5 w-3.5 text-stone-400" />
                        <span>Covering Tasks ({detail ? detail.linkedTasks.length : '...'})</span>
                      </span>
                      {isLoadingDetail && !detail ? (
                        <Skeleton className="h-6 w-48 rounded" />
                      ) : detail && detail.linkedTasks.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {detail.linkedTasks.map((t) => (
                            <span
                              key={t.taskId}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
                            >
                              <span className="font-medium truncate max-w-[180px]">{t.title}</span>
                              <span className="text-[10px] text-stone-400 uppercase font-mono">
                                ({t.status})
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-stone-400 italic">
                          No tasks currently linked.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <RequirementFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRequirement(null);
        }}
        onSave={(data) => handleSaveRequirement(data)}
        onSaveAndPlan={
          taskId && onPlanSubtask && !editingRequirement
            ? (data) => handleSaveRequirement(data, true)
            : undefined
        }
        initialData={editingRequirement}
        suggestedCode={editingRequirement ? undefined : suggestedCode}
        isSaving={isSaving}
      />

      <Modal
        isOpen={Boolean(criterionEditor)}
        onClose={closeCriterionEditor}
        title={
          criterionEditor?.criterion ? 'Edit Acceptance Criterion' : 'Add Acceptance Criterion'
        }
        description="Define one observable and testable outcome for this Requirement."
        primaryActionLabel={criterionEditor?.criterion ? 'Update Criterion' : 'Create Criterion'}
        secondaryActionLabel="Cancel"
        onPrimaryAction={() => void handleSaveCriterion()}
        isPrimaryLoading={isCriterionSaving}
        size="lg"
      >
        <div className="space-y-3">
          {criterionError && <Alert tone="error">{criterionError}</Alert>}
          <Textarea
            label="Acceptance Criterion"
            value={criterionText}
            onChange={(event) => setCriterionText(event.target.value)}
            placeholder="e.g. Given valid payment details, when the user confirms, then the order is created once."
            rows={4}
            disabled={isCriterionSaving}
            autoFocus
          />
        </div>
      </Modal>

      <Modal
        isOpen={isBulkCorrectionOpen}
        onClose={() => {
          if (!isBulkSaving) {
            setIsBulkCorrectionOpen(false);
            setDeleteConfirmation('');
          }
        }}
        title={`Correct ${selectedLinkedRequirementCount} Requirement${selectedLinkedRequirementCount === 1 ? '' : 's'}`}
        description="Choose how to correct only the selected Requirements currently linked to this task."
        primaryActionLabel={
          bulkAction === 'unlink'
            ? 'Unlink selected'
            : bulkAction === 'deprecate'
              ? 'Deprecate selected'
              : 'Delete permanently'
        }
        secondaryActionLabel="Cancel"
        onPrimaryAction={handleBulkCorrection}
        isPrimaryLoading={isBulkSaving}
        isPrimaryDisabled={bulkAction === 'delete' && deleteConfirmation !== 'DELETE'}
        primaryActionVariant={bulkAction === 'delete' ? 'destructive' : 'primary'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              type="button"
              aria-pressed={bulkAction === 'unlink'}
              onClick={() => setBulkAction('unlink')}
              variant={bulkAction === 'unlink' ? 'secondary' : 'outline'}
              className={`h-auto min-h-[88px] justify-start whitespace-normal px-3 py-2.5 text-left ${
                bulkAction === 'unlink'
                  ? 'border border-[#B1E743] bg-[#B1E743]/10 dark:border-[#B1E743] dark:bg-[#B1E743]/10'
                  : ''
              }`}
            >
              <span>
                <span className="block text-sm font-semibold">Unlink from this Feature</span>
                <span className="mt-0.5 block text-xs font-normal text-stone-500 dark:text-stone-400">
                  Removes only this Feature mapping. The Requirement remains reusable elsewhere.
                </span>
              </span>
            </Button>
            <Button
              type="button"
              aria-pressed={bulkAction === 'deprecate'}
              onClick={() => setBulkAction('deprecate')}
              variant={bulkAction === 'deprecate' ? 'secondary' : 'outline'}
              className={`h-auto min-h-[88px] justify-start whitespace-normal px-3 py-2.5 text-left ${
                bulkAction === 'deprecate'
                  ? 'border border-[#B1E743] bg-[#B1E743]/10 dark:border-[#B1E743] dark:bg-[#B1E743]/10'
                  : ''
              }`}
            >
              <span>
                <span className="block text-sm font-semibold">Mark as deprecated</span>
                <span className="mt-0.5 block text-xs font-normal text-stone-500 dark:text-stone-400">
                  Keeps all existing links and history, but marks the Requirement as no longer
                  valid.
                </span>
              </span>
            </Button>
            <Button
              type="button"
              aria-pressed={bulkAction === 'delete'}
              onClick={() => setBulkAction('delete')}
              variant={bulkAction === 'delete' ? 'destructive' : 'outline'}
              className="h-auto min-h-[88px] justify-start whitespace-normal px-3 py-2.5 text-left"
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              <span>
                <span className="block text-sm font-semibold">Delete mistaken Requirements</span>
                <span className="mt-0.5 block text-xs font-normal opacity-80">
                  Permanently removes only unused mistakes after backend safety checks.
                </span>
              </span>
            </Button>
          </div>

          {bulkAction === 'delete' ? (
            <div className="space-y-3">
              <Alert tone="warning" title="Permanent and irreversible">
                Deletion is rejected if a selected Requirement is linked elsewhere or used by a Test
                Case or Bug. Use deprecated when delivery history exists.
              </Alert>
              <Input
                label="Type DELETE to confirm"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                disabled={isBulkSaving}
              />
            </div>
          ) : (
            <Alert tone="info">
              Existing Test Case, Bug, and activity history are retained. This operation is recorded
              in the Feature activity log.
            </Alert>
          )}
        </div>
      </Modal>
    </div>
  );
};

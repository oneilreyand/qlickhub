import React from 'react';
import { FileCode2, User, Lock, Plus, Trash2, Bug } from 'lucide-react';
import type {
  Task,
  TaskDocumentLink,
  ProductBrief,
  ProductBriefScopeItem,
  ProductBriefAcceptanceCriterion,
} from '@qlick/contracts';
import type { WorkspaceMemberItem } from '../../../../lib/api/workspaceService';

import { Card } from '../../atoms/Card';
import { Button } from '../../atoms/Button';
import { IconButton } from '../../atoms/IconButton';
import { Skeleton } from '../../atoms/Skeleton';
import { Alert } from '../../atoms/Alert';
import { RichTextEditor } from '../../molecules/RichTextEditor';
import { RequirementManager } from '../RequirementManager';

export interface TaskDetailSpecsTabProps {
  task: Task;
  activeWorkspaceId: string | null;
  userRole: string;
  canPlan: boolean;
  canManageQaDocs: boolean;
  productBrief: ProductBrief | null;
  isLoadingProductBrief: boolean;
  productBriefError: string | null;
  productBriefTitle: string;
  onProductBriefTitleChange: (title: string) => void;
  productBriefContent: string;
  onProductBriefContentChange: (content: string) => void;
  productBriefInScope: ProductBriefScopeItem[];
  productBriefOutScope: ProductBriefScopeItem[];
  productBriefAcceptanceCriteria: ProductBriefAcceptanceCriterion[];
  productBriefOwnerId: string;
  isSavingProductBrief: boolean;
  onAddScopeItem: (kind: 'in' | 'out') => void;
  onUpdateScopeItem: (kind: 'in' | 'out', id: string, text: string) => void;
  onRemoveScopeItem: (kind: 'in' | 'out', id: string) => void;
  onAddAcceptanceCriterion: () => void;
  onUpdateAcceptanceCriterion: (id: string, text: string) => void;
  onRemoveAcceptanceCriterion: (id: string) => void;
  onSaveProductBrief: () => void;
  onReloadProductBrief: () => void;
  taskQaDocLinks: TaskDocumentLink[];
  isLoadingQaDocs: boolean;
  onOpenCreateQaDocModal: () => void;
  onUnlinkQaDoc: (documentId: string) => void;
  onRequirementChanged: () => void;
  members: WorkspaceMemberItem[];
  currentUserId: string | null;
}

export const TaskDetailSpecsTab: React.FC<TaskDetailSpecsTabProps> = ({
  task,
  activeWorkspaceId,
  userRole,
  canPlan,
  canManageQaDocs,
  productBrief,
  isLoadingProductBrief,
  productBriefError,
  productBriefTitle,
  onProductBriefTitleChange,
  productBriefContent,
  onProductBriefContentChange,
  productBriefInScope,
  productBriefOutScope,
  productBriefAcceptanceCriteria,
  productBriefOwnerId,
  isSavingProductBrief,
  onAddScopeItem,
  onUpdateScopeItem,
  onRemoveScopeItem,
  onAddAcceptanceCriterion,
  onUpdateAcceptanceCriterion,
  onRemoveAcceptanceCriterion,
  onSaveProductBrief,
  onReloadProductBrief,
  taskQaDocLinks,
  isLoadingQaDocs,
  onOpenCreateQaDocModal,
  onUnlinkQaDoc,
  onRequirementChanged,
  members,
  currentUserId,
}) => {
  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-4 border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900/90">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <FileCode2 className="h-5 w-5 text-[#22201F] dark:text-[#B1E743]" />
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Specifications & Requirements
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Define task specifications, scope, acceptance criteria, and requirement links.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Persisted Specification Brief */}
          <div className="space-y-4 rounded-xl border border-[#B1E743]/30 bg-[#B1E743]/5 p-4 dark:border-[#B1E743]/20 dark:bg-[#B1E743]/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Specification Brief
                </h4>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  The versioned specification source of truth. Use scope for commitments; create
                  Subtasks for execution work.
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-[#B1E743]/20 px-2 py-1 text-[11px] font-bold text-[#141413] dark:bg-[#B1E743]/20 dark:text-[#B1E743]">
                {productBrief ? `v${productBrief.currentVersion.version}` : 'New draft'}
              </span>
            </div>

            {isLoadingProductBrief ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-44 w-full rounded-xl" />
              </div>
            ) : productBriefError ? (
              <Alert tone="error" title="Specification Brief unavailable">
                <div className="flex items-center justify-between gap-3">
                  <span>{productBriefError}</span>
                  <Button size="sm" variant="outline" onClick={onReloadProductBrief}>
                    Retry
                  </Button>
                </div>
              </Alert>
            ) : (
              <>
                {!canPlan && (
                  <Alert tone="info" title="Read-only Specification Brief">
                    Only a Product Owner, Admin, or Owner can update Specification Brief content and
                    scope.
                  </Alert>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="product-brief-title"
                      className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1"
                    >
                      Specification Title
                    </label>
                    <textarea
                      id="product-brief-title"
                      value={productBriefTitle}
                      onChange={(event) => onProductBriefTitleChange(event.target.value)}
                      disabled={!canPlan}
                      rows={2}
                      placeholder="Specification brief title..."
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 leading-relaxed placeholder-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400/10 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 disabled:opacity-60 disabled:cursor-not-allowed resize-y break-words whitespace-pre-wrap"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="product-brief-owner"
                      className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1"
                    >
                      Specification Owner / PO
                    </label>
                    {(() => {
                      const specOwnerMember =
                        members.find((member) => member.userId === productBriefOwnerId) ||
                        members.find(
                          (member) =>
                            member.userId ===
                            (productBrief?.document.ownerId || task.reporterId || currentUserId),
                        );
                      const specOwnerName =
                        specOwnerMember?.user?.name ||
                        specOwnerMember?.user?.email ||
                        (productBriefOwnerId ? productBriefOwnerId : 'Product Owner');
                      const specOwnerRole = specOwnerMember?.role
                        ? specOwnerMember.role.toUpperCase()
                        : 'PO';

                      return (
                        <div
                          id="product-brief-owner"
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-stone-200 bg-stone-100/80 text-xs text-stone-800 dark:border-stone-800 dark:bg-stone-900/80 dark:text-stone-200 min-h-[46px]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                              <User className="h-3.5 w-3.5" />
                            </div>
                            <span className="font-semibold truncate">{specOwnerName}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                              {specOwnerRole === 'OWNER' ? 'OWNER' : 'PO'}
                            </span>
                          </div>
                          <div
                            className="flex items-center gap-1 text-[10px] text-stone-400 dark:text-stone-500 shrink-0"
                            title="Specification owner terkunci pada akun PO / Creator dan tidak dapat diubah"
                          >
                            <Lock className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" />
                            <span className="hidden sm:inline font-medium">Terkunci</span>
                          </div>
                        </div>
                      );
                    })()}
                    <p className="mt-1 text-[10px] text-stone-400 dark:text-stone-500">
                      Akun PO / Creator pembuat spesifikasi ini terkunci secara permanen dan tidak
                      dapat diubah.
                    </p>
                  </div>
                </div>

                <RichTextEditor
                  id="product-brief-content"
                  label="Specification context & details"
                  value={productBriefContent}
                  onChange={onProductBriefContentChange}
                  disabled={!canPlan}
                  minRows={10}
                  placeholder="Explain the problem, intended user outcome, behaviour, decisions, and supporting images or links in Markdown..."
                />

                {/* Scope & Acceptance Criteria Section */}
                <div className="space-y-4">
                  {/* In Scope */}
                  <div className="space-y-3 rounded-xl border border-[#B1E743]/40 bg-[#B1E743]/5 p-4 dark:border-[#B1E743]/30 dark:bg-[#B1E743]/10">
                    <div>
                      <h5 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#B1E743]" />
                        In Scope
                      </h5>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                        Deliverables and commitments included in this task.
                      </p>
                    </div>
                    <div className="space-y-2.5">
                      {productBriefInScope.map((item) => (
                        <div key={item.id} className="flex items-start gap-2">
                          <textarea
                            aria-label="In Scope item"
                            value={item.text}
                            onChange={(event) =>
                              onUpdateScopeItem('in', item.id, event.target.value)
                            }
                            disabled={!canPlan}
                            rows={2}
                            placeholder="Tuliskan deliverable / spesifikasi in scope secara rinci (bisa paragraf panjang)..."
                            className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-900 shadow-xs outline-none transition focus:border-[#B1E743] focus:ring-2 focus:ring-[#B1E743]/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 disabled:opacity-60 resize-y"
                          />
                          {canPlan && (
                            <IconButton
                              label="Remove In Scope item"
                              size="sm"
                              variant="ghost"
                              onClick={() => onRemoveScopeItem('in', item.id)}
                              className="mt-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </IconButton>
                          )}
                        </div>
                      ))}
                    </div>
                    {canPlan && (
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                        onClick={() => onAddScopeItem('in')}
                      >
                        Add In Scope
                      </Button>
                    )}
                  </div>

                  {/* Out of Scope */}
                  <div className="space-y-3 rounded-xl border border-stone-200/80 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-900/30">
                    <div>
                      <h5 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-stone-400" />
                        Out of Scope
                      </h5>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        Explicit exclusions and boundaries for this task.
                      </p>
                    </div>
                    <div className="space-y-2.5">
                      {productBriefOutScope.map((item) => (
                        <div key={item.id} className="flex items-start gap-2">
                          <textarea
                            aria-label="Out of Scope item"
                            value={item.text}
                            onChange={(event) =>
                              onUpdateScopeItem('out', item.id, event.target.value)
                            }
                            disabled={!canPlan}
                            rows={2}
                            placeholder="Tuliskan batasan / hal yang out of scope secara rinci (bisa paragraf panjang)..."
                            className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-900 shadow-xs outline-none transition focus:border-[#B1E743] focus:ring-2 focus:ring-[#B1E743]/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 disabled:opacity-60 resize-y"
                          />
                          {canPlan && (
                            <IconButton
                              label="Remove Out of Scope item"
                              size="sm"
                              variant="ghost"
                              onClick={() => onRemoveScopeItem('out', item.id)}
                              className="mt-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </IconButton>
                          )}
                        </div>
                      ))}
                    </div>
                    {canPlan && (
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                        onClick={() => onAddScopeItem('out')}
                      >
                        Add Out of Scope
                      </Button>
                    )}
                  </div>

                  {/* Acceptance Criteria */}
                  <div className="space-y-3 rounded-xl border border-stone-200/80 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-900/30">
                    <div>
                      <h5 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        Acceptance Criteria
                      </h5>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        Observable delivery targets and acceptance criteria for completion.
                      </p>
                    </div>
                    <div className="space-y-2.5">
                      {productBriefAcceptanceCriteria.map((criterion) => (
                        <div key={criterion.id} className="flex items-start gap-2">
                          <textarea
                            aria-label="Acceptance criterion"
                            value={criterion.text}
                            onChange={(event) =>
                              onUpdateAcceptanceCriterion(criterion.id, event.target.value)
                            }
                            disabled={!canPlan}
                            rows={2}
                            placeholder="Tuliskan kriteria penerimaan (Acceptance Criteria) secara lengkap dalam bentuk paragraf atau spesifikasi teknis..."
                            className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-900 shadow-xs outline-none transition focus:border-[#B1E743] focus:ring-2 focus:ring-[#B1E743]/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 disabled:opacity-60 resize-y"
                          />
                          {canPlan && (
                            <IconButton
                              label="Remove acceptance criterion"
                              size="sm"
                              variant="ghost"
                              onClick={() => onRemoveAcceptanceCriterion(criterion.id)}
                              className="mt-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </IconButton>
                          )}
                        </div>
                      ))}
                    </div>
                    {canPlan && (
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                        onClick={onAddAcceptanceCriterion}
                      >
                        Add Acceptance Criterion
                      </Button>
                    )}
                  </div>
                </div>

                {canPlan && (
                  <div className="flex justify-end border-t border-stone-200 dark:border-stone-800 pt-3">
                    <Button
                      size="sm"
                      variant="primary"
                      isLoading={isSavingProductBrief}
                      disabled={!productBriefTitle.trim()}
                      onClick={onSaveProductBrief}
                    >
                      Save new version
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Requirement & Specifications Management Section */}
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3 dark:border-stone-800 dark:bg-stone-950/40">
            <RequirementManager
              workspaceId={activeWorkspaceId || ''}
              taskId={task.id}
              userRole={(userRole || 'dev') as any}
              onRequirementChanged={onRequirementChanged}
            />
          </div>

          {/* QA Documents & Test Plans Section */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Bug className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>QA Test Plans & Verification Docs ({(taskQaDocLinks || []).length})</span>
                </span>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                  {canManageQaDocs
                    ? 'Test plans, test scenarios, and QA sign-off documents linked to this task.'
                    : 'Authored by QA Engineer, Admin, or Owner for quality verification.'}
                </p>
              </div>

              {canManageQaDocs && (
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<Plus className="h-3 w-3" />}
                  onClick={onOpenCreateQaDocModal}
                >
                  New QA Doc
                </Button>
              )}
            </div>

            {isLoadingQaDocs ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : (taskQaDocLinks || []).length === 0 ? (
              <div className="p-3 text-center border border-dashed border-emerald-200 dark:border-emerald-900/60 rounded-xl">
                <p className="text-xs text-stone-500 italic">
                  {canManageQaDocs
                    ? 'No QA test documents linked to this task yet. Click "New QA Doc" to author a test plan.'
                    : 'No QA test documents attached to this task yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {taskQaDocLinks.map((link) => {
                  const versionNum =
                    typeof link.document?.currentVersion === 'number'
                      ? link.document.currentVersion
                      : (link.document?.currentVersion as any)?.version || 1;
                  return (
                    <div
                      key={link.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-stone-200 bg-white text-xs dark:border-stone-800 dark:bg-stone-900 gap-2 shadow-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {link.document?.docType === 'test_plan'
                            ? 'Test Plan'
                            : link.document?.docType === 'test_strategy'
                              ? 'Test Strategy'
                              : link.document?.docType === 'release_report'
                                ? 'Release Report'
                                : link.document?.docType === 'qa_guide'
                                  ? 'QA Guide'
                                  : 'QA Doc'}
                        </span>
                        <span className="font-bold text-stone-900 dark:text-stone-100 truncate">
                          {link.document?.title || 'QA Document'}
                        </span>
                        <span className="text-[11px] font-mono text-stone-400">v{versionNum}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {canManageQaDocs && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-stone-600 hover:text-rose-600 hover:border-rose-300 dark:text-stone-400 dark:hover:text-rose-400"
                            onClick={() => onUnlinkQaDoc(link.documentId)}
                          >
                            Unlink
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

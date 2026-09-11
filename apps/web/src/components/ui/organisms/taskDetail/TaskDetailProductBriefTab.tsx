import React, { useEffect, useState } from 'react';
import { BookOpen, Link as LinkIcon, Lock, Plus, Trash2 } from 'lucide-react';
import type {
  ProductBrief,
  ProductBriefScopeItem,
  ProductBriefStatus,
  Task,
  WorkspaceRole,
} from '@qlick/contracts';

import { qaDocumentService } from '../../../../lib/api/qaDocumentService';
import { Alert } from '../../atoms/Alert';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { IconButton } from '../../atoms/IconButton';
import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { RichTextEditor } from '../../molecules/RichTextEditor';

export interface TaskDetailProductBriefTabProps {
  task: Task;
  workspaceId: string;
  userRole: WorkspaceRole | string;
  productBrief: ProductBrief | null;
  loadError: string | null;
  onReload: () => void;
  onSaved?: (brief: ProductBrief) => void;
}

const isPlanner = (role: string) => ['owner', 'admin', 'po'].includes(role);

const newScopeItem = (position: number): ProductBriefScopeItem => ({
  id: crypto.randomUUID(),
  text: '',
  position,
});

export const TaskDetailProductBriefTab: React.FC<TaskDetailProductBriefTabProps> = ({
  task,
  workspaceId,
  userRole,
  productBrief,
  loadError,
  onReload,
  onSaved,
}) => {
  const canPlan = isPlanner(userRole);
  const [currentBrief, setCurrentBrief] = useState(productBrief);
  const [title, setTitle] = useState('');
  const [contentMarkdown, setContentMarkdown] = useState('');
  const [inScope, setInScope] = useState<ProductBriefScopeItem[]>([]);
  const [outScope, setOutScope] = useState<ProductBriefScopeItem[]>([]);
  const [status, setStatus] = useState<ProductBriefStatus>('draft');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentBrief(productBrief);
    setTitle(productBrief?.document.title || `${task.title} Product Brief`);
    setContentMarkdown(productBrief?.currentVersion.contentMarkdown || '');
    setInScope(productBrief?.currentVersion.inScope || []);
    setOutScope(productBrief?.currentVersion.outScope || []);
    setStatus(productBrief?.document.status || 'draft');
    setSaveError(null);
  }, [productBrief, task.id, task.title]);

  const updateScopeItem = (kind: 'in' | 'out', id: string, text: string) => {
    const update = (items: ProductBriefScopeItem[]) =>
      items.map((item) => (item.id === id ? { ...item, text } : item));
    if (kind === 'in') setInScope(update);
    else setOutScope(update);
  };

  const removeScopeItem = (kind: 'in' | 'out', id: string) => {
    const remove = (items: ProductBriefScopeItem[]) =>
      items.filter((item) => item.id !== id).map((item, position) => ({ ...item, position }));
    if (kind === 'in') setInScope(remove);
    else setOutScope(remove);
  };

  const normalizedScope = (items: ProductBriefScopeItem[]) =>
    items
      .filter((item) => item.text.trim())
      .map((item, position) => ({ ...item, text: item.text.trim(), position }));

  const handleSave = async () => {
    const normalizedTitle = title.trim();
    if (!canPlan || !normalizedTitle || isSaving) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const saved = await qaDocumentService.upsertProductBrief(workspaceId, task.id, {
        title: normalizedTitle,
        contentMarkdown,
        inScope: normalizedScope(inScope),
        outScope: normalizedScope(outScope),
        // Preserve historical Product Brief criteria without presenting them as canonical.
        acceptanceCriteria: currentBrief?.currentVersion.acceptanceCriteria || [],
        ownerId: currentBrief?.document.ownerId || task.reporterId || undefined,
        status,
      });
      setCurrentBrief(saved);
      setTitle(saved.document.title);
      setContentMarkdown(saved.currentVersion.contentMarkdown);
      setInScope(saved.currentVersion.inScope);
      setOutScope(saved.currentVersion.outScope);
      setStatus(saved.document.status);
      onSaved?.(saved);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save the Product Brief.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderScope = (
    kind: 'in' | 'out',
    heading: string,
    description: string,
    items: ProductBriefScopeItem[],
  ) => (
    <section
      className={`space-y-3 rounded-xl border p-4 ${
        kind === 'in'
          ? 'border-[#B1E743]/40 bg-[#B1E743]/5 dark:border-[#B1E743]/30 dark:bg-[#B1E743]/10'
          : 'border-stone-200 bg-stone-50/60 dark:border-stone-800 dark:bg-stone-950/40'
      }`}
      aria-labelledby={`product-brief-${kind}-scope-heading`}
    >
      <div>
        <h3
          id={`product-brief-${kind}-scope-heading`}
          className="text-sm font-bold text-stone-900 dark:text-stone-100"
        >
          {heading}
        </h3>
        <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">{description}</p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-3 text-[11px] text-stone-500 dark:border-stone-700 dark:text-stone-400">
          No {heading.toLowerCase()} items defined.
        </p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-start gap-2">
              <label htmlFor={`${kind}-scope-${item.id}`} className="sr-only">
                {heading} item {index + 1}
              </label>
              <textarea
                id={`${kind}-scope-${item.id}`}
                aria-label={`${heading} item ${index + 1}`}
                value={item.text}
                onChange={(event) => updateScopeItem(kind, item.id, event.target.value)}
                disabled={!canPlan || isSaving}
                rows={2}
                className="min-h-[72px] w-full resize-y rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-900 outline-none transition focus:border-[#B1E743] focus:ring-2 focus:ring-[#B1E743]/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              />
              {canPlan && (
                <IconButton
                  label={`Remove ${heading} item ${index + 1}`}
                  size="sm"
                  variant="ghost"
                  disabled={isSaving}
                  onClick={() => removeScopeItem(kind, item.id)}
                  className="shrink-0 text-stone-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              )}
            </div>
          ))}
        </div>
      )}

      {canPlan && (
        <Button
          size="sm"
          variant="outline"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          disabled={isSaving}
          onClick={() =>
            kind === 'in'
              ? setInScope((items) => [...items, newScopeItem(items.length)])
              : setOutScope((items) => [...items, newScopeItem(items.length)])
          }
        >
          Add {heading}
        </Button>
      )}
    </section>
  );

  if (loadError) {
    return (
      <Card className="border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900/90 sm:p-5">
        <Alert tone="error" title="Product Brief unavailable">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{loadError}</span>
            <Button size="sm" variant="outline" onClick={onReload}>
              Retry
            </Button>
          </div>
        </Alert>
      </Card>
    );
  }

  if (!currentBrief && !canPlan) {
    return (
      <Card className="border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900/90 sm:p-5">
        <Alert tone="info" title="No Product Brief yet">
          A Product Owner, Admin, or Owner must define the Feature context and scope.
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="space-y-5 border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900/90 sm:p-5">
      <div className="flex flex-col gap-3 border-b border-stone-100 pb-4 dark:border-stone-800 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2.5">
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-[#B1E743]" />
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Product Brief
            </h2>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
              Feature context, external references, commitments, and explicit exclusions.
            </p>
          </div>
        </div>
        <span className="self-start rounded-lg bg-[#B1E743]/20 px-2 py-1 text-[11px] font-bold text-[#141413] dark:text-[#B1E743]">
          {currentBrief ? `v${currentBrief.currentVersion.version}` : 'New draft'}
        </span>
      </div>

      {!canPlan && (
        <Alert tone="info" title="Read-only Product Brief">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Only a Product Owner, Admin, or Owner can create a new
            version.
          </span>
        </Alert>
      )}
      {saveError && <Alert tone="error">{saveError}</Alert>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <Input
          label="Product Brief Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={!canPlan || isSaving}
          error={!title.trim() ? 'A Product Brief title is required.' : undefined}
        />
        <Select
          label="Brief Status"
          value={status}
          onChange={(event) => setStatus(event.target.value as ProductBriefStatus)}
          disabled={!canPlan || isSaving}
        >
          <option value="draft">Draft</option>
          <option value="in_review">In review</option>
          <option value="approved">Approved</option>
        </Select>
      </div>

      <Alert tone="info" title="Where external links belong">
        <span className="inline-flex items-start gap-1.5">
          <LinkIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Add the primary PRD, Figma, research,
          and technical-spec links here with clear Markdown labels. Use a Requirement source URL
          only when it points to the exact section defining that Requirement.
        </span>
      </Alert>

      <RichTextEditor
        id="product-brief-context"
        label="Product context and external references"
        value={contentMarkdown}
        onChange={setContentMarkdown}
        disabled={!canPlan || isSaving}
        minRows={8}
        placeholder="Explain the problem, user outcome, decisions, and supporting links. Example: [Primary PRD](https://...)"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {renderScope(
          'in',
          'In Scope',
          'Deliverables and commitments included in this Feature.',
          inScope,
        )}
        {renderScope(
          'out',
          'Out of Scope',
          'Explicit exclusions that prevent scope ambiguity and creep.',
          outScope,
        )}
      </div>

      {canPlan && (
        <div className="flex justify-end border-t border-stone-100 pt-4 dark:border-stone-800">
          <Button
            size="sm"
            variant="primary"
            isLoading={isSaving}
            disabled={!title.trim()}
            onClick={() => void handleSave()}
          >
            Save new version
          </Button>
        </div>
      )}
    </Card>
  );
};

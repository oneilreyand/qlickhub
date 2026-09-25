import React, { useEffect, useState } from 'react';
import { BookOpen, Lock, Plus, Trash2 } from 'lucide-react';
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
  onDirtyChange?: (isDirty: boolean) => void;
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
  onDirtyChange,
}) => {
  const canPlan = isPlanner(userRole);
  const [currentBrief, setCurrentBrief] = useState(productBrief);
  const [title, setTitle] = useState(productBrief?.document.title || `Brief Produk ${task.title}`);
  const [contentMarkdown, setContentMarkdown] = useState(
    productBrief?.currentVersion.contentMarkdown || '',
  );
  const [inScope, setInScope] = useState<ProductBriefScopeItem[]>(
    productBrief?.currentVersion.inScope || [],
  );
  const [outScope, setOutScope] = useState<ProductBriefScopeItem[]>(
    productBrief?.currentVersion.outScope || [],
  );
  const [status, setStatus] = useState<ProductBriefStatus>(
    productBrief?.document.status || 'draft',
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentBrief(productBrief);
    setTitle(productBrief?.document.title || `Brief Produk ${task.title}`);
    setContentMarkdown(productBrief?.currentVersion.contentMarkdown || '');
    setInScope(productBrief?.currentVersion.inScope || []);
    setOutScope(productBrief?.currentVersion.outScope || []);
    setStatus(productBrief?.document.status || 'draft');
    setSaveError(null);
  }, [productBrief, task.id, task.title]);

  const normalizedScope = (items: ProductBriefScopeItem[]) =>
    items
      .filter((item) => item.text.trim())
      .map((item, position) => ({ ...item, text: item.text.trim(), position }));
  const normalizedCurrentScope = (items: ProductBriefScopeItem[]) =>
    items.map(({ id, text, position }) => ({ id, text: text.trim(), position }));
  const initialTitle = currentBrief?.document.title || `Brief Produk ${task.title}`;
  const hasUnsavedChanges =
    canPlan &&
    (title.trim() !== initialTitle ||
      contentMarkdown !== (currentBrief?.currentVersion.contentMarkdown || '') ||
      status !== (currentBrief?.document.status || 'draft') ||
      JSON.stringify(normalizedScope(inScope)) !==
        JSON.stringify(normalizedCurrentScope(currentBrief?.currentVersion.inScope || [])) ||
      JSON.stringify(normalizedScope(outScope)) !==
        JSON.stringify(normalizedCurrentScope(currentBrief?.currentVersion.outScope || [])));

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

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
      setSaveError(error instanceof Error ? error.message : 'Brief Produk tidak dapat disimpan.');
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
        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{description}</p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-3 text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400">
          Belum ada item {heading.toLowerCase()}.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-200/80 text-xs font-bold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                {index + 1}
              </span>
              <label htmlFor={`${kind}-scope-${item.id}`} className="sr-only">
                Item {heading} {index + 1}
              </label>
              <input
                type="text"
                id={`${kind}-scope-${item.id}`}
                aria-label={`Item ${heading} ${index + 1}`}
                value={item.text}
                onChange={(event) => updateScopeItem(kind, item.id, event.target.value)}
                disabled={!canPlan || isSaving}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-900 outline-none transition focus:border-[#B1E743] focus:ring-2 focus:ring-[#B1E743]/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              />
              {canPlan && (
                <IconButton
                  label={`Hapus item ${heading} ${index + 1}`}
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
          Tambah {heading}
        </Button>
      )}
    </section>
  );

  if (loadError) {
    return (
      <Card className="border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900/90 sm:p-5">
        <Alert tone="error" title="Brief Produk tidak tersedia">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{loadError}</span>
            <Button size="sm" variant="outline" onClick={onReload}>
              Coba lagi
            </Button>
          </div>
        </Alert>
      </Card>
    );
  }

  if (!currentBrief && !canPlan) {
    return (
      <Card className="border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900/90 sm:p-5">
        <Alert tone="info" title="Brief Produk belum tersedia">
          Product Owner, Admin, atau Owner perlu menentukan konteks dan cakupan Feature.
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
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">Brief Produk</h2>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
              Konteks Feature, referensi eksternal, komitmen, dan batasan cakupan yang jelas.
            </p>
          </div>
        </div>
        <span className="self-start rounded-lg bg-[#B1E743]/20 px-2.5 py-1 text-xs font-bold text-[#141413] dark:text-[#B1E743]">
          {currentBrief ? `v${currentBrief.currentVersion.version}` : 'Draf baru'}
        </span>
      </div>

      {!canPlan && (
        <Alert tone="info" title="Brief Produk hanya dapat dilihat">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Hanya Product Owner, Admin, atau Owner yang dapat
            membuat versi baru.
          </span>
        </Alert>
      )}
      {saveError && <Alert tone="error">{saveError}</Alert>}
      {hasUnsavedChanges && (
        <Alert tone="warning" title="Perubahan belum disimpan">
          Simpan sebagai versi baru sebelum berpindah bagian atau menutup detail Task.
        </Alert>
      )}

      {/* 2-column layout: Editor kiri + Metadata & Scope kanan — mengikuti pola Tab Ringkasan Task */}
      <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-12">
        {/* Kolom kiri: RichTextEditor konteks & referensi (7/12) */}
        <div className="min-w-0 xl:col-span-7 xl:h-full">
          <RichTextEditor
            id="product-brief-context"
            label="Konteks produk dan referensi eksternal"
            helperText="Tambahkan tautan utama PRD, Figma, riset, dan spesifikasi teknis di sini dengan format [Nama](url)."
            value={contentMarkdown}
            onChange={setContentMarkdown}
            disabled={!canPlan || isSaving}
            minRows={12}
            fillHeight
            placeholder="Jelaskan masalah, hasil bagi pengguna, keputusan, dan tautan pendukung. Contoh: [PRD Utama](https://...)"
          />
        </div>

        {/* Kolom kanan: Judul, Status, Dalam & Di Luar Cakupan, Simpan (5/12) */}
        <div className="min-w-0 space-y-4 xl:col-span-5">
          <div className="grid grid-cols-1 gap-3">
            <Input
              label="Judul Brief Produk"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={!canPlan || isSaving}
              error={!title.trim() ? 'Judul Brief Produk wajib diisi.' : undefined}
            />
            <Select
              label="Status Brief Produk"
              value={status}
              onChange={(event) => setStatus(event.target.value as ProductBriefStatus)}
              disabled={!canPlan || isSaving}
            >
              <option value="draft">Draf</option>
              <option value="in_review">Dalam Review</option>
              <option value="approved">Disetujui</option>
            </Select>
          </div>

          {renderScope(
            'in',
            'Dalam Cakupan',
            'Hasil kerja dan komitmen yang termasuk dalam Feature ini.',
            inScope,
          )}
          {renderScope(
            'out',
            'Di Luar Cakupan',
            'Pengecualian yang jelas untuk mencegah ambiguitas dan perluasan cakupan.',
            outScope,
          )}

          {canPlan && (
            <div className="flex justify-end border-t border-stone-100 pt-4 dark:border-stone-800">
              <Button
                size="sm"
                variant="primary"
                isLoading={isSaving}
                disabled={!title.trim() || !hasUnsavedChanges}
                onClick={() => void handleSave()}
              >
                Simpan Versi Baru
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

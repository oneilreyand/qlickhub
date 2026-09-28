import React, { useState, useEffect } from 'react';
import {
  FolderTreeNode,
  GeneratedTaskDraft,
  TargetPlatform,
  TaskPriority,
  DeliveryArea,
} from '@qlick/contracts';
import { Modal } from '../molecules/Modal';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { enqueueSnackbar } from '../../../store/uiSlice';
import { RootState } from '../../../store/store';
import { aiTaskGeneratorService } from '../../../lib/api/aiTaskGeneratorService';
import {
  Sparkles,
  Layers,
  FileText,
  ListChecks,
  CheckSquare,
  Square,
  Trash2,
  Plus,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export interface AiTaskGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (taskId: string) => void;
  folders: FolderTreeNode[];
  defaultFolderId?: string | null;
}

const QUICK_PROMPTS = [
  {
    label: 'Pembayaran QRIS',
    prompt:
      'Integrasi checkout dengan pembayaran QRIS dinamis, validasi callback webhook, auto-expired setelah 15 menit, dan halaman verifikasi bukti bayar.',
  },
  {
    label: 'Google OAuth SSO',
    prompt:
      'Fitur login satu-klik menggunakan Google OAuth2 SSO, verifikasi token di backend, auto-create user profile baru, dan proteksi brute-force.',
  },
  {
    label: 'Ekspor Laporan Excel',
    prompt:
      'Fitur ekspor laporan transaksi berkala ke format XLSX dan CSV dengan filter rentang tanggal, status, dan pengiriman notifikasi ketika file siap diunduh.',
  },
];

export const AiTaskGeneratorModal: React.FC<AiTaskGeneratorModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  folders,
  defaultFolderId,
}) => {
  const dispatch = useAppDispatch();
  const { activeWorkspaceId } = useAppSelector((state: RootState) => state.workspace);

  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [prompt, setPrompt] = useState('');
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId || null);
  const [targetPlatforms, setTargetPlatforms] = useState<TargetPlatform[]>([
    'web',
    'backend',
    'qa',
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preview editable state
  const [draft, setDraft] = useState<GeneratedTaskDraft | null>(null);
  const [activeTab, setActiveTab] = useState<'task' | 'brief' | 'requirements' | 'subtasks'>('task');

  // Input states for new items in preview
  const [newInScope, setNewInScope] = useState('');
  const [newOutScope, setNewOutScope] = useState('');
  const [newAcText, setNewAcText] = useState<{ [reqIndex: number]: string }>({});

  useEffect(() => {
    if (isOpen) {
      setFolderId(defaultFolderId || null);
    } else {
      // Reset on close
      setStep('input');
      setPrompt('');
      setDraft(null);
      setActiveTab('task');
    }
  }, [isOpen, defaultFolderId]);

  const flattenFolders = (
    items: FolderTreeNode[],
    depth = 0,
  ): { id: string; name: string; depth: number }[] => {
    let result: { id: string; name: string; depth: number }[] = [];
    for (const item of items) {
      result.push({ id: item.id, name: item.name, depth });
      if (item.children && item.children.length > 0) {
        result = result.concat(flattenFolders(item.children, depth + 1));
      }
    }
    return result;
  };

  const flatFolders = flattenFolders(folders);

  const togglePlatform = (p: TargetPlatform) => {
    if (targetPlatforms.includes(p)) {
      if (targetPlatforms.length > 1) {
        setTargetPlatforms(targetPlatforms.filter((item) => item !== p));
      }
    } else {
      setTargetPlatforms([...targetPlatforms, p]);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;

    if (!prompt.trim() || prompt.trim().length < 5) {
      dispatch(enqueueSnackbar('Prompt minimal 5 karakter deskriptif.', 'error'));
      return;
    }

    setIsGenerating(true);
    try {
      const generated = await aiTaskGeneratorService.generateDraft(activeWorkspaceId, {
        prompt: prompt.trim(),
        folderId: folderId || undefined,
        targetPlatforms,
      });

      setDraft(generated);
      setStep('preview');
      setActiveTab('task');
      dispatch(enqueueSnackbar('Draf Feature berhasil dibuat! Silakan tinjau sebelum disimpan.', 'success'));
    } catch (err) {
      dispatch(
        enqueueSnackbar(
          err instanceof Error ? err.message : 'Gagal membuat draf task dengan AI.',
          'error',
        ),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!activeWorkspaceId || !draft) return;

    if (!draft.task.title.trim()) {
      dispatch(enqueueSnackbar('Judul Task wajib diisi.', 'error'));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await aiTaskGeneratorService.applyDraft(activeWorkspaceId, {
        folderId: folderId || undefined,
        task: {
          title: draft.task.title.trim(),
          description: draft.task.description.trim(),
          priority: draft.task.priority,
        },
        productBrief: draft.productBrief,
        requirements: draft.requirements,
        subtasks: draft.subtasks,
      });

      dispatch(
        enqueueSnackbar(
          `Feature "${result.task.title}" berhasil dibuat dengan ${result.createdSubtaskCount} subtask dan ${result.createdRequirementCount} requirement.`,
          'success',
        ),
      );

      onCreated?.(result.task.id);
      onClose();
    } catch (err) {
      dispatch(
        enqueueSnackbar(
          err instanceof Error ? err.message : 'Gagal menyimpan Feature ke sistem.',
          'error',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper mutation functions for preview editing
  const updateTaskField = <K extends keyof GeneratedTaskDraft['task']>(
    field: K,
    value: GeneratedTaskDraft['task'][K],
  ) => {
    if (!draft) return;
    setDraft({
      ...draft,
      task: {
        ...draft.task,
        [field]: value,
      },
    });
  };

  const updateBriefContext = (context: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      productBrief: {
        ...draft.productBrief,
        context,
      },
    });
  };

  const addInScopeItem = () => {
    if (!draft || !newInScope.trim()) return;
    setDraft({
      ...draft,
      productBrief: {
        ...draft.productBrief,
        inScope: [...draft.productBrief.inScope, newInScope.trim()],
      },
    });
    setNewInScope('');
  };

  const removeInScopeItem = (index: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      productBrief: {
        ...draft.productBrief,
        inScope: draft.productBrief.inScope.filter((_, i) => i !== index),
      },
    });
  };

  const addOutScopeItem = () => {
    if (!draft || !newOutScope.trim()) return;
    setDraft({
      ...draft,
      productBrief: {
        ...draft.productBrief,
        outScope: [...draft.productBrief.outScope, newOutScope.trim()],
      },
    });
    setNewOutScope('');
  };

  const removeOutScopeItem = (index: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      productBrief: {
        ...draft.productBrief,
        outScope: draft.productBrief.outScope.filter((_, i) => i !== index),
      },
    });
  };

  const toggleSubtask = (index: number) => {
    if (!draft) return;
    const updated = [...draft.subtasks];
    updated[index] = {
      ...updated[index],
      enabled: !updated[index].enabled,
    };
    setDraft({ ...draft, subtasks: updated });
  };

  const removeSubtask = (index: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      subtasks: draft.subtasks.filter((_, i) => i !== index),
    });
  };

  const addAcToRequirement = (reqIndex: number) => {
    const text = newAcText[reqIndex];
    if (!draft || !text || !text.trim()) return;

    const updatedReqs = [...draft.requirements];
    updatedReqs[reqIndex] = {
      ...updatedReqs[reqIndex],
      acceptanceCriteria: [...updatedReqs[reqIndex].acceptanceCriteria, text.trim()],
    };
    setDraft({ ...draft, requirements: updatedReqs });
    setNewAcText({ ...newAcText, [reqIndex]: '' });
  };

  const removeAcFromRequirement = (reqIndex: number, acIndex: number) => {
    if (!draft) return;
    const updatedReqs = [...draft.requirements];
    updatedReqs[reqIndex] = {
      ...updatedReqs[reqIndex],
      acceptanceCriteria: updatedReqs[reqIndex].acceptanceCriteria.filter((_, i) => i !== acIndex),
    };
    setDraft({ ...draft, requirements: updatedReqs });
  };

  const getDeliveryAreaBadge = (area: DeliveryArea) => {
    switch (area) {
      case 'frontend':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-800';
      case 'backend':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'mobile':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'qa':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      case 'fullstack':
      default:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'input' ? '✨ Generator Task & Feature AI' : 'Pratinjau & Edit Draf Feature (AI)'}
      description={
        step === 'input'
          ? 'Tulis deskripsi ide fitur, sistem AI Studio (Gemini) akan menyusun Task, Brief Produk, Requirement, dan Subtask.'
          : 'Tinjau dan sesuaikan draf usulan AI sebelum disimpan secara permanen ke sistem (AI-001).'
      }
      size="3xl"
    >
      {step === 'input' ? (
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Prompt Deskripsi Fitur <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Contoh: Buatkan fitur pembayaran QRIS dinamis untuk checkout e-commerce dengan notifikasi webhook, batas waktu bayar 15 menit, dan halaman bukti pembayaran..."
              rows={4}
              required
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#B1E743] resize-y"
            />
          </div>

          {/* Quick template prompt chips */}
          <div>
            <span className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
              Ide Prompt Cepat:
            </span>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(qp.prompt)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors"
                >
                  💡 {qp.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Lokasi Folder Target
              </label>
              <Select
                value={folderId || ''}
                onChange={(e) => setFolderId(e.target.value ? e.target.value : null)}
                aria-label="Lokasi folder target"
              >
                <option value="">Tanpa Folder (Root Workspace)</option>
                {flatFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {'\u00A0'.repeat(f.depth * 4)}
                    {f.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Target Subtask Area
              </label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(
                  [
                    { id: 'web', label: 'Frontend (Web)' },
                    { id: 'backend', label: 'Backend' },
                    { id: 'mobile', label: 'Mobile' },
                    { id: 'qa', label: 'QA Testing' },
                  ] as const
                ).map((item) => {
                  const isSelected = targetPlatforms.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => togglePlatform(item.id)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition-colors ${
                        isSelected
                          ? 'bg-[#B1E743]/20 border-[#B1E743] text-stone-900 dark:text-stone-100'
                          : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 text-stone-500'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* AI Governance Policy Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-300 mt-3">
            <ShieldCheck className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <span className="font-semibold">Tata Kelola AI (Policy AI-001):</span> AI Studio hanya
              menghasilkan draf rancangan. Data tidak akan langsung diubah di database sebelum Anda
              meninjau dan menekan tombol persetujuan pada langkah berikutnya.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-stone-100 dark:border-stone-800 pt-4 mt-6">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isGenerating}
              disabled={isGenerating || !prompt.trim()}
            >
              <Sparkles className="h-4 w-4 mr-1.5 text-stone-950" />
              Generate Draf Feature
            </Button>
          </div>
        </form>
      ) : (
        /* STEP 2: INTERACTIVE PREVIEW & EDIT */
        draft && (
          <div className="space-y-4">
            {/* Tabs Navigation */}
            <div className="flex border-b border-stone-200 dark:border-stone-800 space-x-2">
              <button
                type="button"
                onClick={() => setActiveTab('task')}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === 'task'
                    ? 'border-[#B1E743] text-stone-900 dark:text-stone-100'
                    : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Detail Task
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('brief')}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === 'brief'
                    ? 'border-[#B1E743] text-stone-900 dark:text-stone-100'
                    : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Brief Produk ({draft.productBrief.inScope.length} Scope)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('requirements')}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === 'requirements'
                    ? 'border-[#B1E743] text-stone-900 dark:text-stone-100'
                    : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                }`}
              >
                <ListChecks className="h-3.5 w-3.5" />
                Requirements ({draft.requirements.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('subtasks')}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === 'subtasks'
                    ? 'border-[#B1E743] text-stone-900 dark:text-stone-100'
                    : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                }`}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Subtasks ({draft.subtasks.filter((s) => s.enabled).length}/{draft.subtasks.length})
              </button>
            </div>

            {/* TAB CONTENT: TASK DETAIL */}
            {activeTab === 'task' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Judul Task (Feature Root) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={draft.task.title}
                    onChange={(e) => updateTaskField('title', e.target.value)}
                    maxLength={200}
                    placeholder="Judul Feature"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Prioritas
                    </label>
                    <Select
                      value={draft.task.priority}
                      onChange={(e) => updateTaskField('priority', e.target.value as TaskPriority)}
                    >
                      <option value="low">Rendah (Low)</option>
                      <option value="medium">Sedang (Medium)</option>
                      <option value="high">Tinggi (High)</option>
                      <option value="urgent">Mendesak (Urgent)</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Folder Tujuan
                    </label>
                    <Select
                      value={folderId || ''}
                      onChange={(e) => setFolderId(e.target.value ? e.target.value : null)}
                    >
                      <option value="">Tanpa Folder (Root Workspace)</option>
                      {flatFolders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {'\u00A0'.repeat(f.depth * 4)}
                          {f.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Deskripsi Ringkas Feature
                  </label>
                  <textarea
                    value={draft.task.description}
                    onChange={(e) => updateTaskField('description', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#B1E743] resize-y"
                  />
                </div>
              </div>
            )}

            {/* TAB CONTENT: PRODUCT BRIEF */}
            {activeTab === 'brief' && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Konteks & Latar Belakang Masalah
                  </label>
                  <textarea
                    value={draft.productBrief.context}
                    onChange={(e) => updateBriefContext(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#B1E743]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* IN SCOPE */}
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-3">
                    <span className="block text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-2">
                      In-Scope (Dikerjakan):
                    </span>
                    <ul className="space-y-1.5 mb-2 max-h-48 overflow-y-auto pr-1">
                      {draft.productBrief.inScope.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between gap-2 text-xs text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-900 px-2.5 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40"
                        >
                          <span className="truncate">✓ {item}</span>
                          <button
                            type="button"
                            onClick={() => removeInScopeItem(idx)}
                            className="text-stone-400 hover:text-rose-500 shrink-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-1.5">
                      <Input
                        value={newInScope}
                        onChange={(e) => setNewInScope(e.target.value)}
                        placeholder="Tambah poin in-scope..."
                        className="text-xs h-8"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addInScopeItem();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={addInScopeItem}
                        className="h-8 px-2.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* OUT OF SCOPE */}
                  <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 p-3">
                    <span className="block text-xs font-bold text-amber-800 dark:text-amber-300 mb-2">
                      Out-of-Scope (Tidak Dikerjakan):
                    </span>
                    <ul className="space-y-1.5 mb-2 max-h-48 overflow-y-auto pr-1">
                      {draft.productBrief.outScope.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between gap-2 text-xs text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-900 px-2.5 py-1.5 rounded-lg border border-amber-100 dark:border-amber-900/40"
                        >
                          <span className="truncate">✕ {item}</span>
                          <button
                            type="button"
                            onClick={() => removeOutScopeItem(idx)}
                            className="text-stone-400 hover:text-rose-500 shrink-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-1.5">
                      <Input
                        value={newOutScope}
                        onChange={(e) => setNewOutScope(e.target.value)}
                        placeholder="Tambah poin out-of-scope..."
                        className="text-xs h-8"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addOutScopeItem();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={addOutScopeItem}
                        className="h-8 px-2.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: REQUIREMENTS */}
            {activeTab === 'requirements' && (
              <div className="space-y-3 pt-1 max-h-96 overflow-y-auto pr-1">
                {draft.requirements.map((req, reqIdx) => (
                  <div
                    key={reqIdx}
                    className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        {reqIdx + 1}. {req.title}
                      </span>
                    </div>

                    {req.description && (
                      <p className="text-xs text-stone-600 dark:text-stone-400">{req.description}</p>
                    )}

                    <div>
                      <span className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1.5">
                        Acceptance Criteria (Kriteria Penerimaan Pengujian):
                      </span>
                      <ul className="space-y-1 mb-2">
                        {req.acceptanceCriteria.map((ac, acIdx) => (
                          <li
                            key={acIdx}
                            className="flex items-start justify-between gap-2 text-xs bg-white dark:bg-stone-800/80 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700/60"
                          >
                            <span className="text-stone-700 dark:text-stone-300">
                              <span className="font-semibold text-stone-500 mr-1.5">
                                AC-{acIdx + 1}:
                              </span>
                              {ac}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeAcFromRequirement(reqIdx, acIdx)}
                              className="text-stone-400 hover:text-rose-500 shrink-0 mt-0.5"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </li>
                        ))}
                      </ul>

                      <div className="flex gap-1.5">
                        <Input
                          value={newAcText[reqIdx] || ''}
                          onChange={(e) =>
                            setNewAcText({ ...newAcText, [reqIdx]: e.target.value })
                          }
                          placeholder="Tambah acceptance criterion (AC)..."
                          className="text-xs h-7"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addAcToRequirement(reqIdx);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addAcToRequirement(reqIdx)}
                          className="h-7 px-2 text-xs"
                        >
                          + Tambah AC
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB CONTENT: SUBTASKS */}
            {activeTab === 'subtasks' && (
              <div className="space-y-2 pt-1 max-h-96 overflow-y-auto pr-1">
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
                  Pilih subtask yang ingin dibuat (centang untuk mengaktifkan, uncheck untuk membatalkan):
                </p>
                {draft.subtasks.map((sub, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-all ${
                      sub.enabled
                        ? 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm'
                        : 'border-stone-100 dark:border-stone-900 bg-stone-50/60 dark:bg-stone-900/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => toggleSubtask(idx)}
                        className="mt-0.5 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 shrink-0"
                      >
                        {sub.enabled ? (
                          <CheckSquare className="h-4 w-4 text-[#7BB80E] dark:text-[#B1E743]" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${getDeliveryAreaBadge(
                              sub.deliveryArea,
                            )}`}
                          >
                            {sub.deliveryArea}
                          </span>
                          <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                            {sub.title}
                          </span>
                        </div>
                        {sub.description && (
                          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                            {sub.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeSubtask(idx)}
                      className="text-stone-400 hover:text-rose-500 shrink-0 p-1"
                      title="Hapus subtask dari draf"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* FOOTER ACTIONS */}
            <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-800 pt-4 mt-6">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep('input')}
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Ubah Prompt
              </Button>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose}>
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleApply}
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5 text-stone-950" />
                  Terapkan & Buat Feature
                </Button>
              </div>
            </div>
          </div>
        )
      )}
    </Modal>
  );
};

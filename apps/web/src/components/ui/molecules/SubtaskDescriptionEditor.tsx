import React, { useState } from 'react';
import {
  Edit2,
  Check,
  X,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { FormattedText } from '../atoms/FormattedText';
import { Textarea } from '../atoms/Textarea';

export interface SubtaskDescriptionEditorProps {
  description?: string | null;
  onSave: (newDescription: string) => Promise<void>;
  canEdit?: boolean;
  deliveryArea?: string | null;
}

export const SubtaskDescriptionEditor: React.FC<SubtaskDescriptionEditorProps> = ({
  description = '',
  onSave,
  canEdit = true,
  deliveryArea,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(description || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEditing = () => {
    setValue(description || '');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setValue(description || '');
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(value.trim());
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const insertTemplate = (snippet: string) => {
    setValue((prev) => (prev ? `${prev}\n\n${snippet}` : snippet));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-stone-400" />
          <span>Technical Description & Instructions</span>
        </span>

        {canEdit && !isEditing && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px] text-stone-600 hover:text-indigo-600 dark:text-stone-400 dark:hover:text-indigo-400"
            leftIcon={<Edit2 className="h-3 w-3" />}
            onClick={handleStartEditing}
          >
            {description ? 'Edit Description' : 'Add Description'}
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-3 shadow-xs">
          {/* Quick Snippet Helpers */}
          <div className="flex items-center gap-1.5 flex-wrap pb-1 border-b border-stone-100 dark:border-stone-800">
            <span className="text-[10px] font-bold text-stone-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>Quick Template:</span>
            </span>
            <button
              type="button"
              onClick={() =>
                insertTemplate(
                  `### Implementation Steps\n- [ ] 1. Define interface / schema\n- [ ] 2. Core implementation\n- [ ] 3. Write unit tests`
                )
              }
              className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium transition-colors"
            >
              + Checklist Steps
            </button>
            {deliveryArea === 'frontend' && (
              <button
                type="button"
                onClick={() =>
                  insertTemplate(
                    `### UI Specifications\n- State management: Redux thunk / slice\n- Error handling: Global snackbar on 4xx/5xx\n- Component level: Atom/Molecule reuse`
                  )
                }
                className="text-[10px] px-2 py-0.5 rounded-md bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-medium transition-colors"
              >
                + FE Contract
              </button>
            )}
            {deliveryArea === 'backend' && (
              <button
                type="button"
                onClick={() =>
                  insertTemplate(
                    `### API & DB Specs\n- Route: ` + '`METHOD /v1/endpoint`' + `\n- Authorization: Workspace policy check\n- Input Validation: Zod schema`
                  )
                }
                className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-medium transition-colors"
              >
                + BE Route Specs
              </button>
            )}
            {deliveryArea === 'mobile' && (
              <button
                type="button"
                onClick={() =>
                  insertTemplate(
                    `### Mobile Specifications\n- Target Platform: iOS 17+ / Android 14+\n- Permissions: Camera / Biometrics / Notifications\n- Network: Offline-first queue with auto-sync`
                  )
                }
                className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-medium transition-colors"
              >
                + Mobile Specs
              </button>
            )}
            {deliveryArea === 'fullstack' && (
              <button
                type="button"
                onClick={() =>
                  insertTemplate(
                    `### Fullstack Implementation Specs\n- [ ] 1. Backend Route & DB Migration\n- [ ] 2. Contracts schema & validation\n- [ ] 3. Frontend UI Component & Redux Integration\n- [ ] 4. E2E verification`
                  )
                }
                className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 font-medium transition-colors"
              >
                + Fullstack Flow
              </button>
            )}
            {deliveryArea === 'qa' && (
              <button
                type="button"
                onClick={() =>
                  insertTemplate(
                    `### QA Verification Scope\n- [ ] Positive test cases executed\n- [ ] Edge cases & validation errors tested\n- [ ] Evidence screenshot attached`
                  )
                }
                className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-medium transition-colors"
              >
                + QA Scope
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                insertTemplate(
                  `![Screenshot / Image Attachment](https://example.com/screenshot.png)`
                )
              }
              className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium transition-colors flex items-center gap-1"
            >
              <ImageIcon className="h-3 w-3 text-indigo-500" />
              <span>+ Image Link</span>
            </button>
            <button
              type="button"
              onClick={() =>
                insertTemplate(
                  `https://cdn.example.com/demo.mp4`
                )
              }
              className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium transition-colors flex items-center gap-1"
            >
              <VideoIcon className="h-3 w-3 text-red-500" />
              <span>+ Video Link</span>
            </button>
          </div>

          <Textarea
            id="subtask-description-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            placeholder="Describe what needs to be implemented or tested in this subtask (supports Markdown, checklist, and code blocks)..."
            className="text-xs font-mono"
            autoFocus
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              className="h-7 text-xs px-2.5"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleSave}
              isLoading={isSaving}
              className="h-7 text-xs px-2.5"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Save Description
            </Button>
          </div>
        </div>
      ) : description ? (
        <div className="rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/60 dark:bg-stone-900/60 p-3 text-xs leading-relaxed text-stone-800 dark:text-stone-200">
          <FormattedText content={description} />
        </div>
      ) : (
        <p className="text-xs italic text-stone-400 dark:text-stone-500 py-1">
          No description provided for this subtask yet.
        </p>
      )}
    </div>
  );
};

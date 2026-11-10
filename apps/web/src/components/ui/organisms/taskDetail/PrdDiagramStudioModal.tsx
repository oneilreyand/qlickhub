import React, { useId, useMemo, useState } from 'react';
import { inspectPrdDiagrams, putPrdDiagram, type PrdDiagramMatch } from '@qlick/contracts';
import { Modal } from '../../molecules/Modal';
import { MermaidViewer } from '../../molecules/MermaidViewer';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Textarea } from '../../atoms/Textarea';
import { Select } from '../../atoms/Select';
import { Alert } from '../../atoms/Alert';

export interface PrdDiagramStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Receives the complete updated document, never a snippet to append again. */
  onApplyToPrd: (markdown: string) => void;
  documentMarkdown?: string;
  initialTarget?: PrdDiagramMatch | null;
  maxLength?: number;
  documentLabel?: string;
  disabled?: boolean;
}

/** Closed instances do not keep drafts from another Feature or a previous editing session. */
export const PrdDiagramStudioModal: React.FC<PrdDiagramStudioModalProps> = (props) =>
  props.isOpen ? <MermaidDocumentEditor {...props} /> : null;

function MermaidDocumentEditor({
  onClose,
  onApplyToPrd,
  documentMarkdown = '',
  initialTarget = null,
  maxLength = 5000,
  documentLabel = 'PRD',
  disabled = false,
}: PrdDiagramStudioModalProps) {
  const id = useId();
  const [openedDocument] = useState(documentMarkdown);
  const [snapshot] = useState(() => inspectPrdDiagrams(documentMarkdown));
  const [target, setTarget] = useState<PrdDiagramMatch | null>(initialTarget);
  const [newId] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState(initialTarget?.title ?? '');
  const [source, setSource] = useState(initialTarget?.source ?? '');
  const [preview, setPreview] = useState<{ status: string; source: string }>({
    status: 'loading',
    source: '',
  });
  const [applyError, setApplyError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);
  const [confirmSelection, setConfirmSelection] = useState(false);
  const code = source.trim();
  const result = useMemo(() => {
    try {
      if (!title.trim() || !code) return { markdown: null, error: null };
      if (!target && documentMarkdown !== openedDocument) {
        throw new Error('Dokumen berubah sejak editor dibuka. Tutup dan buka ulang editor.');
      }
      return {
        markdown: putPrdDiagram(
          documentMarkdown,
          { id: target?.id ?? newId, title, source: code },
          target,
          maxLength,
        ),
        error: null,
      };
    } catch (error) {
      return {
        markdown: null,
        error: error instanceof Error ? error.message : 'Diagram tidak dapat diperbarui.',
      };
    }
  }, [documentMarkdown, openedDocument, title, code, target, newId, maxLength]);
  const valid = preview.status === 'valid' && preview.source === code;
  const issue = disabled
    ? 'Dokumen hanya dapat dilihat saat ini.'
    : (snapshot.errors[0] ?? result.error ?? applyError);
  const requestClose = () => (dirty ? setConfirmClose(true) : onClose());
  const selectTarget = (key: string) => {
    const next = key === '' ? null : snapshot.diagrams[Number(key)];
    setTarget(next);
    setTitle(next?.title ?? '');
    setSource(next?.source ?? '');
    setDirty(false);
    setApplyError(null);
    setConfirmSelection(false);
    setPendingSelection(null);
  };
  const apply = () => {
    if (!result.markdown || !valid || disabled || issue) return;
    try {
      onApplyToPrd(result.markdown);
      onClose();
    } catch (error) {
      setApplyError(error instanceof Error ? error.message : 'Gagal memperbarui draf.');
    }
  };
  return (
    <Modal
      isOpen
      onClose={requestClose}
      title={target ? 'Edit Diagram' : 'Tambah Diagram'}
      description="Tempel kode Mermaid, periksa preview, lalu masukkan ke draf dokumen."
      size="4xl"
      primaryActionLabel={target ? 'Perbarui Diagram' : `Sisipkan ke ${documentLabel}`}
      onPrimaryAction={apply}
      isPrimaryDisabled={disabled || !valid || !result.markdown || Boolean(issue)}
      secondaryActionLabel="Batal"
    >
      <div className="space-y-4" data-testid="prd-diagram-studio">
        {snapshot.diagrams.length > 0 && (
          <Select
            id={`${id}-target`}
            label="Diagram yang disunting"
            disabled={disabled}
            value={
              target
                ? String(
                    snapshot.diagrams.findIndex(
                      (d) => d.start === target.start && d.raw === target.raw,
                    ),
                  )
                : ''
            }
            onChange={(event) => {
              if (dirty) {
                setPendingSelection(event.target.value);
                setConfirmSelection(true);
              } else selectTarget(event.target.value);
            }}
          >
            <option value="">Buat diagram baru</option>
            {snapshot.diagrams.map((diagram, index) => (
              <option key={diagram.start} value={index}>
                {diagram.title}
              </option>
            ))}
          </Select>
        )}
        {confirmSelection && (
          <Alert tone="warning" title="Ganti diagram?">
            <p>Perubahan kode yang belum dimasukkan ke draf akan dibuang.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => selectTarget(pendingSelection ?? '')}
              >
                Buang dan ganti
              </Button>
              <Button type="button" variant="ghost" onClick={() => setConfirmSelection(false)}>
                Lanjut menyunting
              </Button>
            </div>
          </Alert>
        )}
        {issue && (
          <Alert tone="error" title="Diagram belum dapat dimasukkan">
            {issue}
          </Alert>
        )}
        <Input
          id={`${id}-title`}
          label="Judul diagram"
          value={title}
          maxLength={200}
          disabled={disabled}
          onChange={(event) => {
            setTitle(event.target.value);
            setDirty(true);
            setApplyError(null);
          }}
        />
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Textarea
              id={`${id}-source`}
              label="Kode Mermaid"
              value={source}
              rows={14}
              disabled={disabled}
              placeholder="Tempel kode Mermaid dari AI atau tulis di sini."
              className="font-mono"
              onChange={(event) => {
                setSource(event.target.value);
                setDirty(true);
                setApplyError(null);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Masukkan isi kode tanpa pembungkus ```mermaid.
            </p>
          </div>
          <section className="min-w-0 space-y-2" aria-label="Preview diagram">
            <h4 className="text-sm font-semibold text-foreground">Preview</h4>
            {code ? (
              <MermaidViewer
                code={code}
                title={title.trim() || 'Preview diagram'}
                onStatusChange={(status, renderedSource) =>
                  setPreview({ status, source: renderedSource })
                }
              />
            ) : (
              <p className="rounded-2xl border border-border bg-surface-elevated p-6 text-sm text-muted-foreground">
                Preview muncul setelah kode Mermaid diisi.
              </p>
            )}
          </section>
        </div>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {result.markdown
            ? `${result.markdown.length.toLocaleString('id-ID')} / ${maxLength.toLocaleString('id-ID')} karakter dokumen. `
            : ''}
          Perubahan masuk ke draf. Simpan dokumen untuk menyimpannya ke server.
        </p>
        {confirmClose && (
          <Alert tone="warning" title="Buang perubahan diagram?">
            <p>Kode yang belum dimasukkan ke draf akan hilang.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Buang perubahan
              </Button>
              <Button type="button" variant="ghost" onClick={() => setConfirmClose(false)}>
                Lanjut menyunting
              </Button>
            </div>
          </Alert>
        )}
      </div>
    </Modal>
  );
}

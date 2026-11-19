import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileUp, XCircle } from 'lucide-react';
import type { MemberImportResult, MemberImportRowInput } from '@qlick/contracts';
import { Modal } from '../molecules/Modal';
import { Textarea } from '../atoms/Textarea';
import { Alert } from '../atoms/Alert';
import { Badge } from '../atoms/Badge';
import {
  MEMBER_IMPORT_CSV_EXAMPLE,
  parseMemberImportCsv,
} from '../../../lib/utils/memberImportCsv';
import { MEMBER_ROLE_LABEL, SPECIALTY_LABEL } from './memberAccessLabels';

/**
 * MEMBER-ACCESS-HUB P4: bulk invite from CSV. Step 1 reads a file or pasted text; step 2 shows
 * the server's per-row validation. Only valid rows are processed, all together.
 */
export interface MemberImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  preview: MemberImportResult | null;
  isBusy: boolean;
  onPreview: (rows: MemberImportRowInput[]) => void;
  onCommit: (rows: MemberImportRowInput[]) => void;
  onBack: () => void;
}

export const MemberImportModal: React.FC<MemberImportModalProps> = ({
  isOpen,
  onClose,
  preview,
  isBusy,
  onPreview,
  onCommit,
  onBack,
}) => {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<MemberImportRowInput[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setText('');
    setFileName(null);
    setParsed([]);
    setParseError(null);
  }, [isOpen]);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setText(await file.text());
    setParseError(null);
  };

  const check = () => {
    const result = parseMemberImportCsv(text);
    setParseError(result.error);
    setParsed(result.rows);
    if (!result.error) onPreview(result.rows);
  };

  const inPreview = preview !== null;
  const validCount = preview?.validCount ?? 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Impor anggota dari CSV"
      description="Kolom: email, workspace (nama atau slug), role (admin, po, dev, qa), spesialisasi (untuk Developer, pisahkan dengan ;)."
      size="3xl"
      primaryActionLabel={inPreview ? `Proses ${validCount} baris valid` : 'Periksa file'}
      onPrimaryAction={inPreview ? () => onCommit(parsed) : check}
      isPrimaryDisabled={isBusy || (inPreview ? validCount === 0 : !text.trim())}
      isPrimaryLoading={isBusy}
      secondaryActionLabel="Batal"
      additionalActionLabel={inPreview ? 'Kembali' : undefined}
      onAdditionalAction={onBack}
    >
      {!inPreview ? (
        <div className="space-y-4">
          <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-stone-300 p-4 text-center text-xs text-stone-500 hover:border-[#B1E743] dark:border-stone-700 dark:text-stone-400">
            <FileUp className="h-5 w-5 text-stone-600 dark:text-stone-300" />
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {fileName ?? 'Pilih file .csv'}
            </span>
            <span>atau tempel isinya di bawah</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              aria-label="File CSV anggota"
              onChange={(event) => void readFile(event.target.files?.[0])}
            />
          </label>
          <Textarea
            label="Isi CSV"
            rows={7}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setParseError(null);
            }}
            placeholder={MEMBER_IMPORT_CSV_EXAMPLE}
            className="font-mono text-xs"
          />
          {parseError && (
            <Alert tone="error" title="File belum bisa dibaca">
              {parseError}
            </Alert>
          )}
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Maksimal 200 baris. Hanya Workspace aktif yang Anda kelola. Peran Owner tidak bisa
            diberikan lewat impor. Belum ada yang berubah sampai Anda menekan tombol proses.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2" role="status">
            <Badge variant="passed">{preview.validCount} valid</Badge>
            <Badge variant={preview.invalidCount > 0 ? 'blocked' : 'neutral'}>
              {preview.invalidCount} tidak valid
            </Badge>
          </div>
          {preview.invalidCount > 0 && (
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Baris tidak valid dilewati. Perbaiki file lalu periksa lagi bila ingin ikut diproses.
            </p>
          )}
          <ol className="max-h-[50vh] divide-y divide-stone-100 overflow-y-auto rounded-2xl border border-stone-200 dark:divide-stone-800 dark:border-stone-800">
            {preview.rows.map((row) => (
              <li key={row.line} className="flex gap-3 px-3 py-2.5 text-xs">
                <span className="w-6 shrink-0 pt-0.5 text-right font-mono text-stone-400">
                  {row.line}
                </span>
                {row.status === 'valid' ? (
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                    aria-label="Valid"
                  />
                ) : (
                  <XCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
                    aria-label="Tidak valid"
                  />
                )}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="break-all font-semibold text-stone-900 dark:text-stone-100">
                    {row.email || '(email kosong)'}
                  </p>
                  {row.status === 'valid' ? (
                    <p className="text-stone-600 dark:text-stone-400">
                      {row.action === 'restore' ? 'Pulihkan akses' : 'Tambah'} ke{' '}
                      <strong>{row.workspaceName}</strong> sebagai{' '}
                      {row.role ? MEMBER_ROLE_LABEL[row.role] : '-'}
                      {row.specialties.length > 0 &&
                        ` (${row.specialties.map((s) => SPECIALTY_LABEL[s]).join(', ')})`}
                    </p>
                  ) : (
                    <ul className="list-disc space-y-0.5 pl-4 text-rose-700 dark:text-rose-300">
                      {row.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Modal>
  );
};

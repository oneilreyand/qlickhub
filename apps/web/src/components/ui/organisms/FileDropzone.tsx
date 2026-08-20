import React, { useState } from 'react';
import { UploadCloud, File, X } from 'lucide-react';

export interface FileDropzoneProps {
  onFilesSelected?: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFilesSelected,
  accept = '.pdf,.doc,.docx,.png,.jpg',
  maxFiles = 5,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).slice(0, maxFiles);
      setSelectedFiles(filesArray);
      if (onFilesSelected) onFilesSelected(filesArray);
    }
  };

  const removeFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    if (onFilesSelected) onFilesSelected(updated);
  };

  return (
    <div className="w-full space-y-3">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files) {
            const filesArray = Array.from(e.dataTransfer.files).slice(0, maxFiles);
            setSelectedFiles(filesArray);
            if (onFilesSelected) onFilesSelected(filesArray);
          }
        }}
        className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
          isDragOver
            ? 'border-[#B1E743] bg-lime-50/40 dark:border-[#B1E743] dark:bg-stone-900'
            : 'border-stone-300 bg-stone-50/50 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900/40 dark:hover:border-stone-700 dark:hover:bg-stone-900/60'
        }`}
      >
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#B1E743]/20 text-[#141413] shadow-xs border border-[#B1E743]/50 dark:border-stone-800 dark:bg-stone-800 dark:text-[#B1E743]">
          <UploadCloud className="h-5 w-5" />
        </div>
        <p className="mt-3 text-xs font-semibold text-stone-800 dark:text-stone-200">
          <span className="text-stone-900 hover:underline font-bold dark:text-[#B1E743]">Click to upload</span> or drag & drop files
        </p>
        <p className="mt-1 text-[11px] text-stone-400 dark:text-stone-500">PDF, DOCX, PNG up to 10MB (max {maxFiles} files)</p>
        <input
          type="file"
          className="sr-only"
          accept={accept}
          multiple
          onChange={handleFileChange}
        />
      </label>

      {/* Selected File List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
            >
              <div className="flex items-center gap-2.5 truncate">
                <File className="h-4 w-4 text-stone-700 shrink-0 dark:text-[#B1E743]" />
                <span className="font-semibold text-stone-800 truncate dark:text-stone-200">{file.name}</span>
                <span className="text-[10px] text-stone-400 dark:text-stone-500">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                aria-label="Remove file"
                className="grid h-6 w-6 place-items-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

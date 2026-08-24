import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  Eye,
  Edit3,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { FormattedText } from '../atoms/FormattedText';

export interface RichTextEditorProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  minRows?: number;
  error?: string;
  helperText?: string;
  className?: string;
  defaultTab?: 'write' | 'preview';
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder = 'Write details, requirements, or formatted notes...',
  disabled = false,
  required = false,
  minRows = 4,
  error,
  helperText,
  className = '',
  defaultTab = 'preview',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>(defaultTab);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageAltInput, setImageAltInput] = useState('');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoTitleInput, setVideoTitleInput] = useState('');

  // Auto-expand textarea height dynamically when not in fullscreen
  const adjustTextareaHeight = useCallback(() => {
    if (isFullscreen) return;
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const calculatedHeight = Math.max(textarea.scrollHeight, minRows * 24);
      textarea.style.height = `${calculatedHeight}px`;
    }
  }, [minRows, isFullscreen]);

  useEffect(() => {
    if (activeTab === 'write') {
      adjustTextareaHeight();
    }
  }, [value, activeTab, isFullscreen, adjustTextareaHeight]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isFullscreen]);

  const handleInsertUrlImage = () => {
    if (!imageUrlInput.trim()) return;
    const alt = imageAltInput.trim() || 'Image';
    const imageMarkdown = `\n![${alt}](${imageUrlInput.trim()})\n`;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + imageMarkdown + value.substring(end);
      onChange(newValue);
    } else {
      onChange(value + imageMarkdown);
    }
    setImageUrlInput('');
    setImageAltInput('');
    setIsImageModalOpen(false);
  };

  const handleInsertUrlVideo = () => {
    if (!videoUrlInput.trim()) return;
    const title = videoTitleInput.trim() || 'Video Attachment';
    const videoMarkdown = `\n![${title}](${videoUrlInput.trim()})\n`;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + videoMarkdown + value.substring(end);
      onChange(newValue);
    } else {
      onChange(value + videoMarkdown);
    }
    setVideoUrlInput('');
    setVideoTitleInput('');
    setIsVideoModalOpen(false);
  };

  // Insert or wrap text at the current cursor position
  const applyFormat = (prefix: string, suffix = '', defaultText = '') => {
    const textarea = textareaRef.current;
    if (!textarea || disabled) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || defaultText;

    const replacement = `${prefix}${selectedText}${suffix}`;
    const newValue = value.substring(0, start) + replacement + value.substring(end);

    onChange(newValue);

    // Re-position cursor inside formatting
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length;
      textarea.setSelectionRange(
        selectedText ? newCursorPos : start + prefix.length,
        selectedText ? newCursorPos : start + prefix.length,
      );
      adjustTextareaHeight();
    }, 0);
  };

  // Block line prefixing (e.g. #, ##, -, 1., >)
  const applyLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea || disabled) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const currentLine = value.substring(lineStart, start);

    // If line already starts with prefix, don't duplicate
    if (currentLine.startsWith(prefix)) {
      return;
    }

    const newValue = value.substring(0, lineStart) + prefix + value.substring(lineStart);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
      adjustTextareaHeight();
    }, 0);
  };

  // Handle smart Word-like Enter key behavior & shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Keyboard Shortcuts
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        applyFormat('**', '**', 'bold text');
        return;
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        applyFormat('*', '*', 'italic text');
        return;
      }
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        applyFormat('[', '](https://example.com)', 'link text');
        return;
      }
    }

    // Tab key indent
    if (e.key === 'Tab') {
      e.preventDefault();
      applyFormat('  ');
      return;
    }

    // Smart Enter key (lists continuation & cleanup)
    if (e.key === 'Enter' && !e.shiftKey) {
      const cursor = textarea.selectionStart;
      const lineStart = value.lastIndexOf('\n', cursor - 1) + 1;
      const currentLine = value.substring(lineStart, cursor);

      // Checklist continuation
      if (/^-\s+\[([ xX])\]\s+/.test(currentLine)) {
        if (currentLine.trim() === '- [ ]' || currentLine.trim() === '- [x]') {
          // Empty checklist -> exit list
          e.preventDefault();
          const newValue = value.substring(0, lineStart) + value.substring(cursor);
          onChange(newValue);
          return;
        }
        e.preventDefault();
        const newValue = value.substring(0, cursor) + '\n- [ ] ' + value.substring(cursor);
        onChange(newValue);
        setTimeout(() => {
          textarea.setSelectionRange(cursor + 7, cursor + 7);
          adjustTextareaHeight();
        }, 0);
        return;
      }

      // Bullet list continuation
      if (/^[-*]\s+/.test(currentLine)) {
        if (currentLine.trim() === '-' || currentLine.trim() === '*') {
          // Empty bullet -> exit list
          e.preventDefault();
          const newValue = value.substring(0, lineStart) + value.substring(cursor);
          onChange(newValue);
          return;
        }
        e.preventDefault();
        const match = currentLine.match(/^([-*]\s+)/);
        const prefix = match ? match[1] : '- ';
        const newValue = value.substring(0, cursor) + '\n' + prefix + value.substring(cursor);
        onChange(newValue);
        setTimeout(() => {
          textarea.setSelectionRange(cursor + prefix.length + 1, cursor + prefix.length + 1);
          adjustTextareaHeight();
        }, 0);
        return;
      }

      // Numbered list continuation
      const numMatch = currentLine.match(/^(\d+)\.\s+/);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        if (currentLine.trim() === `${num}.`) {
          // Empty numbered line -> exit list
          e.preventDefault();
          const newValue = value.substring(0, lineStart) + value.substring(cursor);
          onChange(newValue);
          return;
        }
        e.preventDefault();
        const nextNumPrefix = `${num + 1}. `;
        const newValue =
          value.substring(0, cursor) + '\n' + nextNumPrefix + value.substring(cursor);
        onChange(newValue);
        setTimeout(() => {
          textarea.setSelectionRange(
            cursor + nextNumPrefix.length + 1,
            cursor + nextNumPrefix.length + 1,
          );
          adjustTextareaHeight();
        }, 0);
        return;
      }

      // Blockquote continuation
      if (currentLine.startsWith('> ')) {
        if (currentLine.trim() === '>') {
          e.preventDefault();
          const newValue = value.substring(0, lineStart) + value.substring(cursor);
          onChange(newValue);
          return;
        }
        e.preventDefault();
        const newValue = value.substring(0, cursor) + '\n> ' + value.substring(cursor);
        onChange(newValue);
        setTimeout(() => {
          textarea.setSelectionRange(cursor + 3, cursor + 3);
          adjustTextareaHeight();
        }, 0);
        return;
      }
    }
  };

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {/* Backdrop when fullscreen */}
      {isFullscreen && (
        <div
          onClick={() => setIsFullscreen(false)}
          className="fixed inset-x-0 bottom-0 top-20 z-50 bg-black/60 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Label and Header Row */}
      {label && !isFullscreen && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={id}
            className="block text-xs font-bold text-stone-700 dark:text-stone-300"
          >
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        </div>
      )}

      {/* Editor Box */}
      <div
        className={`rounded-xl border transition-all overflow-hidden bg-white dark:bg-stone-900 ${
          isFullscreen
            ? 'fixed inset-x-4 bottom-4 top-24 sm:inset-x-10 sm:bottom-10 sm:top-28 z-50 flex flex-col shadow-2xl border-stone-300 dark:border-stone-700'
            : error
              ? 'border-rose-500 ring-1 ring-rose-500/20'
              : 'border-stone-200 focus-within:border-stone-400 focus-within:ring-2 focus-within:ring-stone-400/10 dark:border-stone-800 dark:focus-within:border-stone-700'
        }`}
      >
        {/* Formatting Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-1 border-b border-stone-200 bg-stone-50/80 px-2 py-1.5 dark:border-stone-800 dark:bg-stone-950/60 shrink-0">
          {/* Action Button Group */}
          <div className="flex flex-wrap items-center gap-0.5">
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => applyFormat('**', '**', 'bold')}
              title="Bold (Ctrl+B)"
              className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 disabled:opacity-40 transition-colors"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => applyFormat('*', '*', 'italic')}
              title="Italic (Ctrl+I)"
              className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 disabled:opacity-40 transition-colors"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => applyFormat('~~', '~~', 'text')}
              title="Strikethrough"
              className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 disabled:opacity-40 transition-colors"
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => applyFormat('`', '`', 'code')}
              title="Inline Code"
              className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 disabled:opacity-40 transition-colors"
            >
              <Code className="h-3.5 w-3.5" />
            </button>

            <div className="mx-1 h-4 w-px bg-stone-300 dark:bg-stone-700" />

            {/* Headings */}
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => applyLinePrefix('# ')}
              title="Heading 1"
              className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 disabled:opacity-40 transition-colors"
            >
              <Heading1 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => applyLinePrefix('## ')}
              title="Heading 2"
              className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 disabled:opacity-40 transition-colors"
            >
              <Heading2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => applyLinePrefix('### ')}
              title="Heading 3"
              className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 disabled:opacity-40 transition-colors"
            >
              <Heading3 className="h-3.5 w-3.5" />
            </button>

            <div className="mx-1 h-4 w-px bg-stone-300 dark:bg-stone-700" />

            {/* Lists & Blocks */}
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => applyLinePrefix('- ')}
              title="Bullet List"
              className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 disabled:opacity-40 transition-colors"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => applyLinePrefix('1. ')}
              title="Numbered List"
              className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 disabled:opacity-40 transition-colors"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => applyLinePrefix('- [ ] ')}
              title="Task Checklist"
              className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 disabled:opacity-40 transition-colors"
            >
              <CheckSquare className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => applyLinePrefix('> ')}
              title="Blockquote"
              className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 disabled:opacity-40 transition-colors"
            >
              <Quote className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => applyFormat('[', '](https://)', 'link')}
              title="Insert Link (Ctrl+K)"
              className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 disabled:opacity-40 transition-colors"
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => setIsImageModalOpen(true)}
              title="Insert Image Link (PNG, JPG, WebP, etc.)"
              className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 disabled:opacity-40 transition-colors"
            >
              <ImageIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => setIsVideoModalOpen(true)}
              title="Insert Video Link (MP4, YouTube, or Loom)"
              className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 disabled:opacity-40 transition-colors"
            >
              <VideoIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled || activeTab === 'preview'}
              onClick={() => applyFormat('\n---\n')}
              title="Horizontal Divider"
              className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 disabled:opacity-40 transition-colors"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Right Group: Mode Switcher & Fullscreen Maximize */}
          <div className="flex items-center gap-1.5">
            {/* Mode Switcher: Write vs Preview */}
            <div className="flex items-center gap-1 bg-stone-200/70 p-0.5 rounded-lg dark:bg-stone-800/80">
              <button
                type="button"
                onClick={() => setActiveTab('write')}
                className={`flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-md transition-all ${
                  activeTab === 'write'
                    ? 'bg-white text-stone-900 shadow-2xs dark:bg-stone-700 dark:text-white'
                    : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
              >
                <Edit3 className="h-3 w-3" />
                Write
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-md transition-all ${
                  activeTab === 'preview'
                    ? 'bg-white text-stone-900 shadow-2xs dark:bg-stone-700 dark:text-white'
                    : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
              >
                <Eye className="h-3 w-3" />
                Preview
              </button>
            </div>

            {/* Expand / Minimize Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand Fullscreen / Focus Mode'}
              className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 transition-colors"
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div
          className={
            activeTab === 'write'
              ? `p-2.5 ${isFullscreen ? 'flex-1 overflow-y-auto' : ''}`
              : 'hidden'
          }
        >
          <textarea
            id={id}
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            required={required}
            rows={minRows}
            className={`w-full bg-transparent text-xs text-stone-800 dark:text-stone-200 placeholder-stone-400 outline-none leading-relaxed font-sans disabled:cursor-not-allowed disabled:opacity-70 ${
              isFullscreen ? 'h-full resize-none' : 'resize-y min-h-[80px]'
            }`}
          />
        </div>
        {activeTab === 'preview' && (
          <div
            className={`p-4 overflow-y-auto bg-stone-50/50 dark:bg-stone-950/40 ${
              isFullscreen ? 'flex-1 min-h-[300px]' : 'min-h-[100px] max-h-[420px]'
            }`}
          >
            {value && value.trim() ? (
              <FormattedText content={value} />
            ) : (
              <p className="text-xs italic text-stone-400 dark:text-stone-500">
                {placeholder || 'No content provided. Switch to Write mode to add text.'}
              </p>
            )}
          </div>
        )}

        {/* Status / Footer Bar */}
        <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50/50 px-3 py-1 text-[10px] text-stone-400 dark:border-stone-800/60 dark:bg-stone-950/40 dark:text-stone-500 shrink-0">
          <span className="italic">
            {isFullscreen
              ? 'Press Esc to exit Fullscreen'
              : 'Tip: Insert media links with Image or Video toolbar buttons'}
          </span>
          <span className="font-mono">
            {wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} chars
          </span>
        </div>
      </div>

      {/* Insert Image Link Modal */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setIsImageModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 dark:bg-stone-900 dark:border-stone-800 p-5 space-y-4 z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-brand-600" />
                <span>Insert Image Link</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 dark:hover:text-stone-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Image URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/screenshot.png"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 outline-none focus:border-brand-500"
                  autoFocus
                />
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 pt-1">
                  Image Description / Caption (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Reproduction Screenshot or UI Mockup"
                  value={imageAltInput}
                  onChange={(e) => setImageAltInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImageModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!imageUrlInput.trim()}
                  onClick={handleInsertUrlImage}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 dark:bg-brand-500 dark:text-stone-900 dark:hover:bg-brand-400 disabled:opacity-40"
                >
                  Insert Image Link
                </button>
              </div>

              <p className="text-[11px] text-stone-400 italic text-center pt-1">
                Supports PNG, JPG, GIF, WebP, and SVG links with zoom lightbox preview.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Insert Video Link Modal */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setIsVideoModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 dark:bg-stone-900 dark:border-stone-800 p-5 space-y-4 z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <VideoIcon className="h-4 w-4 text-red-500" />
                <span>Insert Video Link</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 dark:hover:text-stone-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Video URL / Embed Link <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/demo.mp4 or YouTube / Loom link"
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 outline-none focus:border-brand-500"
                  autoFocus
                />
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 pt-1">
                  Video Title / Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bug Reproduction Demo or Walkthrough"
                  value={videoTitleInput}
                  onChange={(e) => setVideoTitleInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!videoUrlInput.trim()}
                  onClick={handleInsertUrlVideo}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 dark:bg-brand-500 dark:text-stone-900 dark:hover:bg-brand-400 disabled:opacity-40"
                >
                  Insert Video Link
                </button>
              </div>

              <p className="text-[11px] text-stone-400 italic text-center pt-1">
                Supports MP4, WebM direct videos, YouTube videos, and Loom recordings.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
      {helperText && !error && (
        <p className="text-[11px] text-stone-500 dark:text-stone-400">{helperText}</p>
      )}
    </div>
  );
};

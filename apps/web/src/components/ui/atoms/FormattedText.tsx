import React, { useState } from 'react';
import {
  ZoomIn,
  Image as ImageIcon,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  Lightbulb,
  Target,
  ClipboardCheck,
  Code2,
} from 'lucide-react';
import { ImageLightboxModal } from '../molecules/ImageLightboxModal';

export interface FormattedTextProps {
  content: string;
  className?: string;
  onImageClick?: (src: string, alt: string) => void;
}

export const FormattedText: React.FC<FormattedTextProps> = ({
  content,
  className = '',
  onImageClick,
}) => {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>('');

  if (!content || !content.trim()) {
    return <span className="text-stone-400 italic">No description provided.</span>;
  }

  const handleImageClick = (src: string, alt: string) => {
    if (onImageClick) {
      onImageClick(src, alt);
    } else {
      setLightboxSrc(src);
      setLightboxAlt(alt);
    }
  };

  const renderImageCard = (src: string, alt?: string, key?: string | number) => {
    const title = alt && alt !== 'Image' && alt !== 'Image Attachment' ? alt : undefined;
    return (
      <div
        key={key}
        onClick={() => handleImageClick(src, alt || 'Image Preview')}
        className="group relative my-2 overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-900/5 dark:bg-stone-900/60 max-w-xl cursor-pointer transition-all hover:shadow-md hover:border-stone-400 dark:hover:border-stone-600"
      >
        <img
          src={src}
          alt={alt || 'Image Attachment'}
          className="max-h-96 w-full object-contain rounded-xl bg-stone-950/20 transition-transform duration-200 group-hover:scale-[1.01]"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold pointer-events-none backdrop-blur-[2px]">
          <ZoomIn className="h-4 w-4" />
          <span>Klik untuk Memperbesar</span>
        </div>
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-bold text-white flex items-center gap-1 backdrop-blur-xs">
          <ImageIcon className="h-2.5 w-2.5 text-emerald-400" />
          <span>IMAGE</span>
        </div>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-all text-[9px] font-bold flex items-center gap-1 backdrop-blur-xs"
        >
          <span>Buka</span>
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
        {title && (
          <div className="border-t border-stone-200/60 bg-white/80 dark:border-stone-800/60 dark:bg-stone-900/80 px-3 py-1.5 text-[11px] text-stone-600 dark:text-stone-300">
            {title}
          </div>
        )}
      </div>
    );
  };

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];

  const parseInlineFormatting = (text: string): React.ReactNode[] => {
    // Parser for explicit Markdown images, mentions, **bold**, *italic*, ~~strikethrough~~, `code`, and explicit Markdown links [text](url)
    const regex = /(!\[.*?\]\(.*?\)|@\w+|(?:\*\*.*?\*\*|\*.*?\*|~~.*?~~|`.*?`|\[.*?\]\(.*?\)))/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      // Explicit Markdown image: ![alt](url)
      const imgMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imgMatch) {
        const alt = imgMatch[1] || 'Image';
        const src = imgMatch[2];
        return renderImageCard(src, alt, `img-${index}`);
      }

      // Mentions
      if (part.toLowerCase() === '@channel' || part.toLowerCase() === '@all') {
        return (
          <span
            key={`mention-${index}`}
            className="inline-flex items-center px-1.5 py-0.2 rounded-md font-bold text-[10px] bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 mr-1"
          >
            {part}
          </span>
        );
      }
      if (part.startsWith('@') && part.length > 1) {
        return (
          <span
            key={`mention-${index}`}
            className="font-bold text-[#141413] dark:text-[#B1E743] bg-[#B1E743]/20 dark:bg-[#B1E743]/20 px-1 py-0.2 rounded"
          >
            {part}
          </span>
        );
      }

      // Bold, Italic, Strikethrough, Code
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={index} className="font-bold text-stone-900 dark:text-stone-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        return (
          <em key={index} className="italic text-stone-800 dark:text-stone-200">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
        return (
          <del key={index} className="line-through text-stone-400 dark:text-stone-500">
            {part.slice(2, -2)}
          </del>
        );
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code
            key={index}
            className="rounded bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 font-mono text-[11px] text-amber-600 dark:text-amber-400 border border-stone-200 dark:border-stone-700"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // Explicit Markdown link: [text](url)
      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        return (
          <a
            key={index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-900 hover:text-stone-950 dark:text-[#B1E743] underline font-medium inline-flex items-center gap-0.5"
          >
            <span>{linkMatch[1]}</span>
            <ExternalLink className="h-2.5 w-2.5 inline shrink-0" />
          </a>
        );
      }

      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Code block toggle
    if (trimmedLine.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="my-2 rounded-xl bg-stone-900 dark:bg-stone-950 p-3 text-xs text-stone-100 overflow-x-auto font-mono border border-stone-800"
          >
            <code>{codeBlockBuffer.join('\n')}</code>
          </pre>,
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    // Empty line -> paragraph spacing
    if (!trimmedLine) {
      elements.push(<div key={`empty-${i}`} className="h-2" />);
      continue;
    }

    // Standalone explicit Markdown Image line: ![alt](url)
    const standaloneImgMatch = trimmedLine.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (standaloneImgMatch) {
      const alt = standaloneImgMatch[1] || 'Image';
      const src = standaloneImgMatch[2];
      elements.push(renderImageCard(src, alt, `img-block-${i}`));
      continue;
    }

    // ── GFM Table Detection ──────────────────────────────────────────────────
    if (
      line.trim().startsWith('|') &&
      i + 1 < lines.length &&
      /^\|[\s|:\-]+\|/.test(lines[i + 1].trim())
    ) {
      const tableLines: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith('|')) {
        tableLines.push(lines[j]);
        j++;
      }

      const parseRow = (row: string): string[] =>
        row
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((cell) => cell.trim());

      const separatorCells = parseRow(tableLines[1] ?? '');
      const alignments: ('left' | 'center' | 'right')[] = separatorCells.map((cell) => {
        if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
        if (cell.endsWith(':')) return 'right';
        return 'left';
      });

      const alignClass = (a: 'left' | 'center' | 'right') =>
        a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left';

      const headerCells = parseRow(tableLines[0]);
      const bodyRows = tableLines.slice(2).map(parseRow);

      elements.push(
        <div
          key={`table-${i}`}
          className="my-3 w-full overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs"
        >
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-stone-100 dark:bg-stone-900/80">
                {headerCells.map((cell, ci) => (
                  <th
                    key={ci}
                    className={`border-b border-stone-200 dark:border-stone-800 px-3 py-2 font-bold text-stone-700 dark:text-stone-300 whitespace-nowrap ${alignClass(alignments[ci] ?? 'left')}`}
                  >
                    {parseInlineFormatting(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-stone-100 dark:border-stone-800/60 last:border-0 odd:bg-white even:bg-stone-50/60 dark:odd:bg-transparent dark:even:bg-stone-900/30 transition-colors hover:bg-stone-100/70 dark:hover:bg-stone-800/30"
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-3 py-2 text-stone-800 dark:text-stone-200 leading-relaxed ${alignClass(alignments[ci] ?? 'left')}`}
                    >
                      {parseInlineFormatting(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );

      i = j - 1;
      continue;
    }
    // ── End Table Detection ──────────────────────────────────────────────────

    // Headings
    if (line.startsWith('# ')) {
      elements.push(
        <h1
          key={`h1-${i}`}
          className="text-base font-extrabold text-stone-900 dark:text-stone-100 mt-3 mb-1"
        >
          {parseInlineFormatting(line.slice(2))}
        </h1>,
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-2.5 mb-1"
        >
          {parseInlineFormatting(line.slice(3))}
        </h2>,
      );
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-xs font-bold text-stone-900 dark:text-stone-100 mt-2 mb-0.5"
        >
          {parseInlineFormatting(line.slice(4))}
        </h3>,
      );
      continue;
    }

    // Horizontal Rule
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={`hr-${i}`} className="my-3 border-stone-200 dark:border-stone-800" />);
      continue;
    }

    // GitHub Alerts / Callouts: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION], > [!DANGER]
    const alertMatch = line.match(
      /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|DANGER|INFO|BUG)\]\s*(.*)$/i,
    );
    if (alertMatch) {
      const type = alertMatch[1].toUpperCase();
      const firstLineText = alertMatch[2];

      const alertLines: string[] = [];
      if (firstLineText.trim()) {
        alertLines.push(firstLineText.trim());
      }
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith('> ') && !lines[j].match(/^>\s*\[!/)) {
        alertLines.push(lines[j].slice(2).trim());
        j++;
      }

      let bgClass =
        'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-200';
      let icon = <Info className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />;
      let label = 'Note';

      if (type === 'TIP' || type === 'HINT') {
        bgClass =
          'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200';
        icon = (
          <Lightbulb className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        );
        label = 'Tip';
      } else if (type === 'IMPORTANT') {
        bgClass =
          'bg-[#B1E743]/10 dark:bg-[#B1E743]/10 border-[#B1E743]/40 dark:border-[#B1E743]/40 text-[#141413] dark:text-[#B1E743]';
        icon = (
          <CheckCircle2 className="h-4 w-4 text-[#141413] dark:text-[#B1E743] shrink-0 mt-0.5" />
        );
        label = 'Important';
      } else if (type === 'WARNING' || type === 'CAUTION') {
        bgClass =
          'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200';
        icon = (
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        );
        label = 'Warning';
      } else if (type === 'DANGER' || type === 'BUG') {
        bgClass =
          'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200';
        icon = (
          <AlertOctagon className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        );
        label = 'Caution';
      }

      elements.push(
        <div
          key={`alert-${i}`}
          className={`p-3.5 my-2.5 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${bgClass}`}
        >
          {icon}
          <div className="flex-1 space-y-1">
            <span className="font-extrabold uppercase tracking-wider text-[10px] block opacity-90">
              {label}
            </span>
            {alertLines.map((al, idx) => (
              <div key={idx} className="font-medium">
                {parseInlineFormatting(al)}
              </div>
            ))}
          </div>
        </div>,
      );

      i = j - 1;
      continue;
    }

    // Standard Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-4 border-amber-500 bg-amber-500/5 px-3 py-1.5 my-1.5 rounded-r-lg text-xs italic text-stone-700 dark:text-stone-300"
        >
          {parseInlineFormatting(line.slice(2))}
        </blockquote>,
      );
      continue;
    }

    // Smart Section Header: Acceptance Criteria
    const isAcHeader =
      /^(?:###\s+|##\s+|\*\*)?(Acceptance Criteria|Kriteria Penerimaan)[:*]*\s*$/i.test(
        trimmedLine,
      );
    if (isAcHeader) {
      elements.push(
        <div
          key={`sec-ac-${i}`}
          className="mt-4 mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider pb-1 border-b border-emerald-200 dark:border-emerald-900/50"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Acceptance Criteria</span>
        </div>,
      );
      continue;
    }

    // Smart Section Header: Objective & Scope
    const isObjHeader =
      /^(?:###\s+|##\s+|\*\*)?(Objective|Tujuan|Background Context|Scope|Ruang Lingkup)[:*]*\s*$/i.test(
        trimmedLine,
      );
    if (isObjHeader) {
      elements.push(
        <div
          key={`sec-obj-${i}`}
          className="mt-4 mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-stone-900 dark:text-[#B1E743] uppercase tracking-wider pb-1 border-b border-stone-200 dark:border-stone-800"
        >
          <Target className="h-3.5 w-3.5" />
          <span>Objective & Context</span>
        </div>,
      );
      continue;
    }

    // Smart Section Header: Testing Checklist
    const isTestHeader =
      /^(?:###\s+|##\s+|\*\*)?(Testing Checklist|Steps to Reproduce|Langkah Pengujian)[:*]*\s*$/i.test(
        trimmedLine,
      );
    if (isTestHeader) {
      elements.push(
        <div
          key={`sec-test-${i}`}
          className="mt-4 mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-sky-700 dark:text-sky-400 uppercase tracking-wider pb-1 border-b border-sky-200 dark:border-sky-900/50"
        >
          <ClipboardCheck className="h-3.5 w-3.5" />
          <span>Testing Checklist</span>
        </div>,
      );
      continue;
    }

    // Smart Section Header: Technical Specs & Deliverables
    const isTechHeader =
      /^(?:###\s+|##\s+|\*\*)?(Technical Specifications|Deliverables|Output Teknis)[:*]*\s*$/i.test(
        trimmedLine,
      );
    if (isTechHeader) {
      elements.push(
        <div
          key={`sec-tech-${i}`}
          className="mt-4 mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-stone-900 dark:text-[#B1E743] uppercase tracking-wider pb-1 border-b border-stone-200 dark:border-stone-800"
        >
          <Code2 className="h-3.5 w-3.5" />
          <span>Technical Deliverables & Specs</span>
        </div>,
      );
      continue;
    }

    // Task Checklist
    if (line.startsWith('- [ ] ') || line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
      const isChecked = line.startsWith('- [x] ') || line.startsWith('- [X] ');
      elements.push(
        <div key={`check-${i}`} className="flex items-start gap-2 my-1 text-xs">
          <input
            type="checkbox"
            checked={isChecked}
            readOnly
            className="mt-0.5 h-3.5 w-3.5 rounded border-stone-300 dark:border-stone-700 text-brand-600 focus:ring-0 cursor-default"
          />
          <span
            className={
              isChecked
                ? 'line-through text-stone-400 dark:text-stone-500'
                : 'text-stone-800 dark:text-stone-200 font-medium'
            }
          >
            {parseInlineFormatting(line.slice(6))}
          </span>
        </div>,
      );
      continue;
    }

    // Bullet List
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div
          key={`bullet-${i}`}
          className="flex items-start gap-2 my-0.5 text-xs text-stone-800 dark:text-stone-200 pl-2"
        >
          <span className="text-amber-500 font-bold leading-none select-none">•</span>
          <span className="flex-1">{parseInlineFormatting(line.slice(2))}</span>
        </div>,
      );
      continue;
    }

    // Numbered List
    const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div
          key={`num-${i}`}
          className="flex items-start gap-2 my-0.5 text-xs text-stone-800 dark:text-stone-200 pl-2"
        >
          <span className="font-mono font-bold text-stone-400 dark:text-stone-500 text-[11px] min-w-4 select-none">
            {numMatch[1]}.
          </span>
          <span className="flex-1">{parseInlineFormatting(numMatch[2])}</span>
        </div>,
      );
      continue;
    }

    // Regular Paragraph
    elements.push(
      <div
        key={`p-${i}`}
        className="text-xs text-stone-800 dark:text-stone-200 leading-relaxed my-0.5"
      >
        {parseInlineFormatting(line)}
      </div>,
    );
  }

  // Handle unclosed code block
  if (inCodeBlock && codeBlockBuffer.length > 0) {
    elements.push(
      <pre
        key="code-unclosed"
        className="my-2 rounded-xl bg-stone-900 dark:bg-stone-950 p-3 text-xs text-stone-100 overflow-x-auto font-mono border border-stone-800"
      >
        <code>{codeBlockBuffer.join('\n')}</code>
      </pre>,
    );
  }

  return (
    <>
      <div className={`space-y-0.5 font-sans leading-normal ${className}`}>{elements}</div>
      {lightboxSrc && (
        <ImageLightboxModal
          isOpen={true}
          src={lightboxSrc}
          alt={lightboxAlt}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </>
  );
};

/**
 * Utility to strip markdown syntax for clean plain text preview in tables and cards.
 */
export function stripMarkdown(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/^>+\s*\[!.*?\]/gm, '')
    .replace(/^#+\s+/gm, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/-\s+\[[ xX]\]\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
}

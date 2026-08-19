import React, { useState } from 'react';
import { ZoomIn, Image as ImageIcon } from 'lucide-react';
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

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];

  const parseInlineFormatting = (text: string): React.ReactNode[] => {
    // Parser for images, **bold**, *italic*, ~~strikethrough~~, `code`, and [links](url)
    const regex = /(!\[.*?\]\(.*?\)|(?:\*\*.*?\*\*|\*.*?\*|~~.*?~~|`.*?`|\[.*?\]\(.*?\)))/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      // Check for Image format: ![alt](url)
      const imgMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imgMatch) {
        const alt = imgMatch[1] || 'Image';
        const src = imgMatch[2];
        return (
          <span
            key={`img-${index}`}
            onClick={() => handleImageClick(src, alt)}
            className="group relative my-2 block overflow-hidden rounded-xl border border-stone-200/80 bg-stone-100/60 dark:border-stone-800 dark:bg-stone-900/60 max-w-xl cursor-zoom-in transition-all hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500"
          >
            <img
              src={src}
              alt={alt}
              className="max-h-96 w-full object-contain transition-transform duration-200 group-hover:scale-[1.01]"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg bg-stone-900/80 px-2 py-1 text-[11px] font-medium text-white shadow backdrop-blur-xs opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <ZoomIn className="h-3.5 w-3.5" />
              <span>Enlarge image</span>
            </span>
            {alt && (
              <span className="block border-t border-stone-200/60 bg-white/80 px-3 py-1.5 text-[11px] text-stone-600 dark:border-stone-800/60 dark:bg-stone-900/80 dark:text-stone-300">
                <ImageIcon className="inline h-3 w-3 mr-1 text-stone-400" />
                {alt}
              </span>
            )}
          </span>
        );
      }

      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return <strong key={index} className="font-bold text-stone-900 dark:text-stone-100">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        return <em key={index} className="italic text-stone-800 dark:text-stone-200">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
        return <del key={index} className="line-through text-stone-400 dark:text-stone-500">{part.slice(2, -2)}</del>;
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
      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        return (
          <a
            key={index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 underline font-medium"
          >
            {linkMatch[1]}
          </a>
        );
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="my-2 rounded-xl bg-stone-900 dark:bg-stone-950 p-3 text-xs text-stone-100 overflow-x-auto font-mono border border-stone-800"
          >
            <code>{codeBlockBuffer.join('\n')}</code>
          </pre>
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
    if (!line.trim()) {
      elements.push(<div key={`empty-${i}`} className="h-2" />);
      continue;
    }

    // Standalone Image line: ![alt](url)
    const standaloneImgMatch = line.trim().match(/^!\[(.*?)\]\((.*?)\)$/);
    if (standaloneImgMatch) {
      const alt = standaloneImgMatch[1] || 'Image';
      const src = standaloneImgMatch[2];
      elements.push(
        <div
          key={`img-block-${i}`}
          onClick={() => handleImageClick(src, alt)}
          className="group relative my-2 overflow-hidden rounded-xl border border-stone-200/80 bg-stone-100/60 dark:border-stone-800 dark:bg-stone-900/60 max-w-xl cursor-zoom-in transition-all hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500"
        >
          <img
            src={src}
            alt={alt}
            className="max-h-96 w-full object-contain transition-transform duration-200 group-hover:scale-[1.01]"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg bg-stone-900/80 px-2 py-1 text-[11px] font-medium text-white shadow backdrop-blur-xs opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <ZoomIn className="h-3.5 w-3.5" />
            <span>Enlarge image</span>
          </div>
          {alt && (
            <div className="border-t border-stone-200/60 bg-white/80 px-3 py-1.5 text-[11px] text-stone-600 dark:border-stone-800/60 dark:bg-stone-900/80 dark:text-stone-300">
              <ImageIcon className="inline h-3 w-3 mr-1 text-stone-400" />
              {alt}
            </div>
          )}
        </div>
      );
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-base font-extrabold text-stone-900 dark:text-stone-100 mt-3 mb-1">
          {parseInlineFormatting(line.slice(2))}
        </h1>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-2.5 mb-1">
          {parseInlineFormatting(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-xs font-bold text-stone-900 dark:text-stone-100 mt-2 mb-0.5">
          {parseInlineFormatting(line.slice(4))}
        </h3>
      );
      continue;
    }

    // Horizontal Rule
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={`hr-${i}`} className="my-3 border-stone-200 dark:border-stone-800" />);
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-4 border-amber-500 bg-amber-500/5 px-3 py-1.5 my-1.5 rounded-r-lg text-xs italic text-stone-700 dark:text-stone-300"
        >
          {parseInlineFormatting(line.slice(2))}
        </blockquote>
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
            className="mt-0.5 h-3.5 w-3.5 rounded border-stone-300 dark:border-stone-700 text-brand-600 focus:ring-0"
          />
          <span className={isChecked ? 'line-through text-stone-400 dark:text-stone-500' : 'text-stone-800 dark:text-stone-200'}>
            {parseInlineFormatting(line.slice(6))}
          </span>
        </div>
      );
      continue;
    }

    // Bullet List
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2 my-0.5 text-xs text-stone-800 dark:text-stone-200 pl-2">
          <span className="text-amber-500 font-bold leading-none select-none">•</span>
          <span className="flex-1">{parseInlineFormatting(line.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Numbered List
    const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2 my-0.5 text-xs text-stone-800 dark:text-stone-200 pl-2">
          <span className="font-mono font-bold text-stone-400 dark:text-stone-500 text-[11px] min-w-4 select-none">
            {numMatch[1]}.
          </span>
          <span className="flex-1">{parseInlineFormatting(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Regular Paragraph
    elements.push(
      <p key={`p-${i}`} className="text-xs text-stone-800 dark:text-stone-200 leading-relaxed my-0.5">
        {parseInlineFormatting(line)}
      </p>
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
      </pre>
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
    .replace(/^#+\s+/gm, '') // Remove headers
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // Remove bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // Remove italic
    .replace(/~~(.*?)~~/g, '$1') // Remove strikethrough
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // Remove inline/code blocks
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
    .replace(/^>\s+/gm, '') // Remove quotes
    .replace(/^[-*+]\s+/gm, '') // Remove bullets
    .replace(/^\d+\.\s+/gm, '') // Remove numbers
    .replace(/-\s+\[[ xX]\]\s+/gm, '') // Remove checklists
    .replace(/\n+/g, ' ') // Replace newlines with spaces for single line preview
    .trim();
}

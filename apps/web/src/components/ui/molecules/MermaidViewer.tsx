import React, { useEffect, useState, useRef } from 'react';
import { ZoomIn, AlertCircle, Code, Eye, RefreshCw } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from '../atoms/Button';

export interface MermaidViewerProps {
  code: string;
  title?: string;
  className?: string;
  onStatusChange?: (status: 'loading' | 'valid' | 'error', source: string) => void;
  onEdit?: () => void;
}

let mermaidPromise: Promise<any> | null = null;

async function getMermaidInstance(): Promise<any> {
  if (typeof window === 'undefined') return null;
  if ((window as any).__qlick_mermaid) {
    return (window as any).__qlick_mermaid;
  }
  if (!mermaidPromise) {
    mermaidPromise = (async () => {
      try {
        const importDynamic = new Function('modulePath', 'return import(modulePath)');
        const mod = await importDynamic(
          'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs',
        );
        const instance = mod.default || mod;
        (window as any).__qlick_mermaid = instance;
        return instance;
      } catch (err) {
        mermaidPromise = null;
        throw err;
      }
    })();
  }
  return mermaidPromise;
}

export const MermaidViewer: React.FC<MermaidViewerProps> = ({
  code,
  title = 'Diagram Alur Sistem',
  className = '',
  onStatusChange,
  onEdit,
}) => {
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRawCode, setShowRawCode] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef(onStatusChange);
  useEffect(() => {
    statusRef.current = onStatusChange;
  }, [onStatusChange]);
  const [retry, setRetry] = useState(0);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark')),
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const cleanCode = code.trim();

    if (!cleanCode) {
      setSvgHtml(null);
      setError('Kode diagram kosong');
      setIsLoading(false);
      statusRef.current?.('error', cleanCode);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSvgHtml(null);
    statusRef.current?.('loading', cleanCode);

    const renderDiagram = async () => {
      try {
        const mermaid = await getMermaidInstance();
        if (isCancelled) return;
        if (!mermaid) {
          throw new Error('Engine Mermaid tidak tersedia di environment ini.');
        }

        mermaid.initialize?.({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: isDark ? 'dark' : 'neutral',
          themeVariables: {
            fontFamily: 'Inter, sans-serif',
            primaryColor: '#B1E743',
            primaryTextColor: '#141413',
            primaryBorderColor: '#3F6212',
            lineColor: isDark ? '#94A3B8' : '#475569',
          },
        });
        const uniqueId = `mmd-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, cleanCode);
        if (!isCancelled) {
          statusRef.current?.('valid', cleanCode);
          setSvgHtml(svg);
          setError(null);
        }
      } catch (err: any) {
        if (!isCancelled) {
          statusRef.current?.('error', cleanCode);
          // Tangani error sintaks atau jaringan
          setError(err?.message || 'Gagal merender diagram Mermaid');
          setSvgHtml(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    const timer = window.setTimeout(() => void renderDiagram(), 250);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [code, retry, isDark]);

  return (
    <div
      data-testid="mermaid-viewer"
      className={`my-3 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs dark:border-stone-800 dark:bg-stone-900/60 ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap gap-2 items-center justify-between border-b border-stone-100 bg-stone-50/70 px-4 py-2.5 dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-[#166534] dark:bg-[#B1E743]" />
          <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">{title}</h4>
          <span className="rounded-md bg-stone-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-400">
            Mermaid
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {onEdit && (
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              Edit Diagram
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowRawCode((prev) => !prev)}
            title={showRawCode ? 'Tampilkan diagram' : 'Lihat kode sumber'}
            className="h-7 px-2 text-xs text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
          >
            {showRawCode ? (
              <>
                <Eye className="mr-1 h-3.5 w-3.5" />
                <span>Visual</span>
              </>
            ) : (
              <>
                <Code className="mr-1 h-3.5 w-3.5" />
                <span>Kode</span>
              </>
            )}
          </Button>

          {svgHtml && !showRawCode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsLightboxOpen(true)}
              title="Perbesar diagram"
              className="h-7 px-2 text-xs"
              data-testid="mermaid-zoom-button"
            >
              <ZoomIn className="mr-1 h-3.5 w-3.5" />
              <span>Perbesar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Konten Rendering */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-stone-400">
            <RefreshCw className="h-5 w-5 animate-spin text-[#166534] dark:text-[#B1E743]" />
            <p className="mt-2 text-xs">Memuat diagram alur...</p>
          </div>
        ) : showRawCode ? (
          <pre className="overflow-x-auto rounded-xl bg-stone-950 p-3 font-mono text-xs text-stone-100 border border-stone-800">
            <code>{code}</code>
          </pre>
        ) : error ? (
          <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                  Gagal Merender Diagram Alur
                </p>
                <p className="mt-0.5 text-xs text-rose-700 dark:text-rose-400 break-words">
                  {error}
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => setRetry((v) => v + 1)}>
              Coba lagi
            </Button>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Sintaks Asli:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-stone-900 p-2.5 font-mono text-xs text-stone-200">
                <code>{code}</code>
              </pre>
            </div>
          </div>
        ) : (
          <div
            ref={containerRef}
            data-testid="mermaid-svg-container"
            className="flex justify-center overflow-x-auto py-2 [&_svg]:max-w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgHtml || '' }}
          />
        )}
      </div>

      {/* Lightbox Modal */}
      <Modal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        title={title}
        size="lg"
      >
        <div className="max-h-[75vh] overflow-auto p-4 bg-stone-50 dark:bg-stone-950 rounded-xl flex justify-center [&_svg]:max-w-none [&_svg]:w-full [&_svg]:h-auto">
          <div dangerouslySetInnerHTML={{ __html: svgHtml || '' }} />
        </div>
      </Modal>
    </div>
  );
};

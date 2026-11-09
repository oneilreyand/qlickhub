import { inspectPrdDiagrams, type PrdDiagramMatch } from '@qlick/contracts';
import { MermaidViewer } from './MermaidViewer';
import { Alert } from '../atoms/Alert';

/** Shows actual diagram blocks in a document draft; no example or fallback records. */
export function PrdDiagramList({
  markdown,
  onEdit,
}: {
  markdown: string;
  onEdit?: (diagram: PrdDiagramMatch) => void;
}) {
  const { diagrams, errors } = inspectPrdDiagrams(markdown);
  return (
    <div className="min-w-0 space-y-3">
      {errors.length > 0 && (
        <Alert tone="error" title="Struktur diagram perlu diperbaiki">
          {errors[0]}
        </Alert>
      )}
      {diagrams.map((diagram) => (
        <MermaidViewer
          key={diagram.start}
          code={diagram.source}
          title={diagram.title}
          onEdit={onEdit && !errors.length ? () => onEdit(diagram) : undefined}
        />
      ))}
    </div>
  );
}

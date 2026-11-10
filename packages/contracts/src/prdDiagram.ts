import { z } from 'zod';

export const PrdDiagramSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  source: z.string().trim().min(1).max(100_000),
});
export type PrdDiagram = z.infer<typeof PrdDiagramSchema>;

export interface PrdDiagramMatch {
  start: number;
  end: number;
  raw: string;
  source: string;
  title: string;
  id?: string;
  revision?: number;
}

const OPEN = '<!-- qlick-diagram:v1 ';
const CLOSE = '<!-- /qlick-diagram -->';
const metadataSchema = PrdDiagramSchema.omit({ source: true }).strict();

/** Scans top-level fences; marker-like text inside code is never interpreted as metadata. */
export function inspectPrdDiagrams(markdown: string): {
  diagrams: PrdDiagramMatch[];
  errors: string[];
} {
  const lines = [...markdown.matchAll(/[^\n]*(?:\n|$)/g)].filter((m) => m[0].length);
  const diagrams: PrdDiagramMatch[] = [];
  const errors: string[] = [];
  const ids = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    const startLine = i;
    const line = lines[i][0].trim();
    let metadata: z.infer<typeof metadataSchema> | undefined;
    if (line.startsWith('<!-- qlick-diagram:')) {
      try {
        if (!line.startsWith(OPEN) || !line.endsWith(' -->')) throw new Error();
        metadata = metadataSchema.parse(JSON.parse(line.slice(OPEN.length, -4)));
      } catch {
        errors.push(
          'Metadata diagram tidak valid. Perbaiki blok sumber sebelum menyunting diagram.',
        );
        continue;
      }
      i++;
    } else if (line === CLOSE) {
      errors.push('Penutup diagram tidak memiliki pembuka yang valid.');
      continue;
    }
    const opening = lines[i]?.[0].trim().match(/^(`{3,}|~{3,})([^`~]*)$/);
    if (!opening) {
      if (metadata) errors.push('Blok diagram harus berisi fenced Mermaid.');
      // Do not consume the following line when a marker is malformed.
      if (metadata) i--;
      continue;
    }
    const fence = opening[1];
    const language = opening[2].trim().toLowerCase();
    const sourceLines: string[] = [];
    i++;
    while (
      i < lines.length &&
      !new RegExp(`^${fence[0]}{${fence.length},}\\s*$`).test(lines[i][0].trim())
    ) {
      sourceLines.push(lines[i][0].replace(/\r?\n$/, ''));
      i++;
    }
    const closed = i < lines.length;
    if (metadata && (!closed || language !== 'mermaid' || lines[i + 1]?.[0].trim() !== CLOSE)) {
      errors.push('Blok diagram tidak lengkap atau bukan Mermaid.');
      continue;
    }
    if (language !== 'mermaid' || !closed) continue;
    if (metadata) i++;
    const start = lines[startLine].index!;
    // Preserve the surrounding newline separately from the exact replaceable block.
    const end = lines[i].index! + lines[i][0].replace(/\r?\n$/, '').length;
    const source = sourceLines.join('\n');
    if (metadata) {
      if (!PrdDiagramSchema.safeParse({ ...metadata, source }).success) {
        errors.push('Isi diagram kosong atau melebihi batas.');
        continue;
      }
      if (ids.has(metadata.id)) errors.push('ID diagram duplikat. Perbaiki ID sebelum menyunting.');
      ids.add(metadata.id);
    }
    diagrams.push({
      start,
      end,
      raw: markdown.slice(start, end),
      source,
      title: metadata?.title ?? `Diagram ${diagrams.length + 1}`,
      id: metadata?.id,
      revision: metadata?.revision,
    });
  }
  return { diagrams, errors };
}

export function serializePrdDiagram(input: PrdDiagram): string {
  const { source, ...metadata } = PrdDiagramSchema.parse(input);
  const json = JSON.stringify(metadata).replace(
    /[<>&]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
  const longest = Math.max(0, ...[...source.matchAll(/`+/g)].map((m) => m[0].length));
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `${OPEN}${json} -->\n${fence}mermaid\n${source}\n${fence}\n${CLOSE}`;
}

/** Replaces only a reviewed exact target. A changed/deleted target never becomes an append. */
export function putPrdDiagram(
  markdown: string,
  input: Pick<PrdDiagram, 'id' | 'title' | 'source'>,
  target: PrdDiagramMatch | null = null,
  maxLength = 100_000,
): string {
  const parsed = inspectPrdDiagrams(markdown);
  if (parsed.errors.length) throw new Error(parsed.errors[0]);
  const current = target
    ? parsed.diagrams.find((d) => (target.id ? d.id === target.id : d.start === target.start))
    : undefined;
  if (target && (!current || current.raw !== target.raw)) {
    throw new Error('Diagram berubah sejak dibuka. Tutup editor dan buka ulang diagram terbaru.');
  }
  const diagram = PrdDiagramSchema.parse({
    ...input,
    id: current?.id ?? input.id,
    schemaVersion: 1,
    revision: (current?.revision ?? 0) + 1,
  });
  if (current?.id && current.title === diagram.title && current.source.trim() === diagram.source)
    return markdown;
  if (!target && parsed.diagrams.some((d) => d.id === diagram.id))
    throw new Error('ID diagram sudah digunakan.');
  const block = serializePrdDiagram(diagram);
  const result = current
    ? markdown.slice(0, current.start) + block + markdown.slice(current.end)
    : markdown + (markdown ? '\n\n' : '') + block;
  if (result.length > maxLength)
    throw new Error(
      `Dokumen melebihi batas ${maxLength.toLocaleString('id-ID')} karakter. Ringkas kode atau konteks.`,
    );
  return result;
}

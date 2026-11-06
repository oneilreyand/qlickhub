import type { TaskComment } from '@qlick/contracts';

/**
 * E2E-SDLC-FLOW P7 (AC-14): Developer menyebut build dan lingkungan saat "Kirim ke QA". Tanpa
 * migrasi, keduanya disimpan sebagai baris berlabel di komentar `ready_for_qa` dan dibaca lagi
 * untuk mengisi awal form siklus uji QA.
 */
const BUILD_LABEL = 'Build';
const ENVIRONMENT_LABEL = 'Lingkungan';

export interface QaHandoffBuild {
  build: string;
  environment: string;
  createdAt: string;
}

export function formatQaHandoffBody(
  message: string | undefined,
  build: string | undefined,
  environment: string | undefined,
): string | undefined {
  const lines: string[] = [];
  if (build?.trim()) lines.push(`${BUILD_LABEL}: ${build.trim()}`);
  if (environment?.trim()) lines.push(`${ENVIRONMENT_LABEL}: ${environment.trim()}`);
  const note = message?.trim() ?? '';
  const body = [note, lines.join('\n')].filter(Boolean).join('\n\n');
  return body || undefined;
}

function readLine(body: string, label: string) {
  const match = body.match(new RegExp(`^${label}:[ \\t]*(.+)$`, 'm'));
  return match ? match[1].trim().slice(0, 100) : '';
}

export function parseQaHandoffBuild(comment: Pick<TaskComment, 'body' | 'createdAt'>) {
  const build = readLine(comment.body, BUILD_LABEL);
  const environment = readLine(comment.body, ENVIRONMENT_LABEL);
  if (!build && !environment) return null;
  return { build, environment, createdAt: comment.createdAt } satisfies QaHandoffBuild;
}

/** Serah-terima terbaru yang menyebut build, dari komentar `ready_for_qa` beberapa subtask. */
export function latestQaHandoffBuild(
  comments: Array<Pick<TaskComment, 'body' | 'createdAt' | 'handoffKind'>>,
): QaHandoffBuild | null {
  return (
    comments
      .filter((comment) => comment.handoffKind === 'ready_for_qa')
      .map(parseQaHandoffBuild)
      .filter((item): item is QaHandoffBuild => item !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}

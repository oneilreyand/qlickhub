import type { TestCase } from '@qlick/contracts';

/** Catatan temuan terisi dari Test Case dan hasil aktual; QA boleh mengubahnya sebelum kirim. */
export function buildFollowUpNotes(
  testCase: Pick<TestCase, 'title' | 'preconditions' | 'testData' | 'steps' | 'expectedResult'>,
  actualResult: string | null,
): string {
  const lines: string[] = [`Test Case: ${testCase.title}`];
  if (testCase.preconditions) lines.push(`Prasyarat: ${testCase.preconditions}`);
  if (testCase.testData) lines.push(`Data uji: ${testCase.testData}`);
  if (testCase.steps.length > 0) {
    lines.push('Langkah:', ...testCase.steps.map((step, index) => `${index + 1}. ${step}`));
  }
  if (testCase.expectedResult) lines.push(`Hasil diharapkan: ${testCase.expectedResult}`);
  lines.push(`Hasil aktual: ${actualResult?.trim() || '—'}`);
  return lines.join('\n');
}

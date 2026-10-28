import { describe, expect, it } from 'vitest';
import type { Task } from '@qlick/contracts';
import { computeDeveloperReadiness } from '../useDeveloperReadiness';

const task = (deliveryArea: string, status: string, title = 't'): Task =>
  ({ id: title + status + deliveryArea, deliveryArea, status, title }) as unknown as Task;

describe('computeDeveloperReadiness', () => {
  it('menghitung in_review dan done sebagai siap, mengabaikan QA dan canceled', () => {
    const result = computeDeveloperReadiness([
      task('frontend', 'in_review', 'A'),
      task('backend', 'in_progress', 'B'),
      task('backend', 'done', 'C'),
      task('qa', 'todo', 'Q'),
      task('frontend', 'canceled', 'X'),
    ]);
    expect(result).toMatchObject({
      total: 3,
      ready: 2,
      pendingTitles: ['B'],
      isReadyToTest: false,
    });
  });

  it('siap diuji bila semua subtask Developer siap', () => {
    expect(
      computeDeveloperReadiness([task('frontend', 'done'), task('qa', 'todo')]).isReadyToTest,
    ).toBe(true);
  });

  it('tidak siap bila belum ada subtask Developer', () => {
    expect(computeDeveloperReadiness([task('qa', 'todo')]).isReadyToTest).toBe(false);
  });
});

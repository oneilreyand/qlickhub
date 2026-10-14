import { runRules } from './rules.mjs';

export const BASELINE_VERSION = 1;

const id = (item) => `${item.rule} ${item.key}`;

export function emptyBaseline() {
  return { version: BASELINE_VERSION, gaps: [] };
}

/** Validates the baseline file shape; throws with a readable message. */
export function checkBaseline(baseline) {
  if (!baseline || baseline.version !== BASELINE_VERSION || !Array.isArray(baseline.gaps)) {
    throw new Error(`Baseline harus berbentuk { "version": ${BASELINE_VERSION}, "gaps": [...] }.`);
  }
  for (const item of baseline.gaps) {
    if (typeof item.rule !== 'string' || typeof item.key !== 'string') {
      throw new Error('Setiap entri baseline wajib punya "rule" dan "key".');
    }
  }
  return baseline;
}

/**
 * Compares current gaps with the baseline (ratchet).
 * - `added`: gaps not in the baseline → block the change.
 * - `known`: gaps already accepted in the baseline → report only.
 * - `resolved`: baseline entries that no longer occur → can be removed with --shrink.
 */
export function compare(gaps, baseline) {
  const accepted = new Set(checkBaseline(baseline).gaps.map(id));
  const current = new Set(gaps.map(id));
  return {
    added: gaps.filter((item) => !accepted.has(id(item))),
    known: gaps.filter((item) => accepted.has(id(item))),
    resolved: baseline.gaps.filter((item) => !current.has(id(item))),
  };
}

export function evaluate(data, config, baseline) {
  const gaps = runRules(data, config);
  return { gaps, ...compare(gaps, baseline) };
}

const toEntry = ({ rule, key, file }) => ({ rule, key, file });

/** Baseline holding every current gap; only allowed when no baseline exists yet. */
export function initialBaseline(gaps) {
  return { version: BASELINE_VERSION, gaps: gaps.map(toEntry) };
}

/** Removes resolved entries. Never adds an entry, so the baseline can only shrink. */
export function shrinkBaseline(baseline, gaps) {
  const current = new Set(gaps.map(id));
  return {
    version: BASELINE_VERSION,
    gaps: checkBaseline(baseline).gaps.filter((item) => current.has(id(item))),
  };
}

export function summarize(result) {
  const byRule = {};
  for (const item of result.gaps) byRule[item.rule] = (byRule[item.rule] ?? 0) + 1;
  return {
    total: result.gaps.length,
    added: result.added.length,
    known: result.known.length,
    resolved: result.resolved.length,
    byRule,
  };
}

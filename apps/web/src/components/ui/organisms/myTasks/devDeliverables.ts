/**
 * Canonical Indonesian labels for developer deliverables embedded in task descriptions.
 */
export const DELIVERABLE_LABELS = {
  PR: 'Tautan PR',
  BRANCH: 'Branch',
  STAGING: 'URL Staging',
  HANDOFF: 'Petunjuk Handoff',
} as const;

/**
 * Legacy English labels accepted for backward compatibility.
 */
export const LEGACY_DELIVERABLE_LABELS = {
  PR: ['PR Link', 'PR URL'],
  BRANCH: ['Branch'],
  STAGING: ['Staging URL', 'Staging Link'],
  HANDOFF: ['Handoff Instructions'],
} as const;

export const ALL_DELIVERABLE_LABELS = [
  DELIVERABLE_LABELS.PR,
  ...LEGACY_DELIVERABLE_LABELS.PR,
  DELIVERABLE_LABELS.BRANCH,
  ...LEGACY_DELIVERABLE_LABELS.BRANCH,
  DELIVERABLE_LABELS.STAGING,
  ...LEGACY_DELIVERABLE_LABELS.STAGING,
  DELIVERABLE_LABELS.HANDOFF,
  ...LEGACY_DELIVERABLE_LABELS.HANDOFF,
] as const;

const ESCAPED_LABELS_PATTERN = [...new Set(ALL_DELIVERABLE_LABELS)]
  .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');

const DELIVERABLE_LINE_REGEX = new RegExp(
  `^[-*]?\\s*\\*\\*(?:${ESCAPED_LABELS_PATTERN})\\*\\*:`,
  'i',
);

export interface ParsedDeliverables {
  pr: string;
  branch: string;
  staging: string;
  handoff: string;
  notes: string;
}

/**
 * Strips all deliverable lines (canonical Indonesian and legacy English) from the description.
 */
export const stripDeliverablesFromDescription = (desc?: string | null): string => {
  if (!desc) return '';
  return desc
    .split(/\r?\n/)
    .filter((line) => !DELIVERABLE_LINE_REGEX.test(line.trim()))
    .join('\n')
    .trim();
};

const matchDeliverableField = (text: string, labels: readonly string[]): string => {
  const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(
    `(?:^|\\r?\\n)\\s*[-*]?\\s*\\*\\*(?:${escaped})\\*\\*:\\s*([^\\r\\n]+)`,
    'i',
  );
  const match = text.match(regex);
  return match ? match[1].trim() : '';
};

/**
 * Parses embedded deliverables (PR URL, branch name, staging URL, handoff) from task description.
 * Supports both canonical Indonesian labels and legacy English labels for backward compatibility.
 */
export const parseDeliverablesFromDescription = (desc?: string | null): ParsedDeliverables => {
  if (!desc) {
    return { pr: '', branch: '', staging: '', handoff: '', notes: '' };
  }

  const pr = matchDeliverableField(desc, [DELIVERABLE_LABELS.PR, ...LEGACY_DELIVERABLE_LABELS.PR]);

  let branch = matchDeliverableField(desc, [
    DELIVERABLE_LABELS.BRANCH,
    ...LEGACY_DELIVERABLE_LABELS.BRANCH,
  ]);
  if (branch) {
    branch = branch.replace(/^`+|`+$/g, '').trim();
  }

  const staging = matchDeliverableField(desc, [
    DELIVERABLE_LABELS.STAGING,
    ...LEGACY_DELIVERABLE_LABELS.STAGING,
  ]);

  const handoff = matchDeliverableField(desc, [
    DELIVERABLE_LABELS.HANDOFF,
    ...LEGACY_DELIVERABLE_LABELS.HANDOFF,
  ]);

  const notes = stripDeliverablesFromDescription(desc);

  return { pr, branch, staging, handoff, notes };
};

/**
 * Builds the combined markdown description containing developer notes and structured deliverables.
 * Strips any pre-existing deliverable lines from `notes` first to guarantee repeated saves
 * never duplicate deliverable rows.
 */
export const buildCombinedDescription = (
  notes: string,
  pr: string,
  branch: string,
  staging: string,
  extraHandoff?: string,
): string => {
  const parts: string[] = [];
  const cleanNotes = stripDeliverablesFromDescription(notes);
  if (cleanNotes) {
    parts.push(cleanNotes);
  }

  const deliverableItems: string[] = [];
  if (pr && pr.trim()) {
    deliverableItems.push(`- **${DELIVERABLE_LABELS.PR}**: ${pr.trim()}`);
  }
  if (branch && branch.trim()) {
    const cleanBranch = branch.trim().replace(/^`+|`+$/g, '');
    deliverableItems.push(`- **${DELIVERABLE_LABELS.BRANCH}**: \`${cleanBranch}\``);
  }
  if (staging && staging.trim()) {
    deliverableItems.push(`- **${DELIVERABLE_LABELS.STAGING}**: ${staging.trim()}`);
  }
  if (extraHandoff && extraHandoff.trim()) {
    deliverableItems.push(`- **${DELIVERABLE_LABELS.HANDOFF}**: ${extraHandoff.trim()}`);
  }

  if (deliverableItems.length > 0) {
    if (parts.length > 0) parts.push('');
    parts.push(...deliverableItems);
  }

  return parts.join('\n');
};

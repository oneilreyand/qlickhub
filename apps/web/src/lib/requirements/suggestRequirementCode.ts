import type { Requirement } from '@qlick/contracts';

interface RequirementCodeSeries {
  prefix: string;
  count: number;
  maximum: number;
  width: number;
  latestCreatedAt: number;
}

const parseRequirementCode = (requirement: Requirement) => {
  const code = requirement.code.trim().toUpperCase();
  const match = code.match(/^(.+?)(\d+)$/);
  if (!match) return null;

  return {
    prefix: match[1],
    value: Number(match[2]),
    width: match[2].length,
    createdAt: Date.parse(requirement.createdAt) || 0,
  };
};

/**
 * Continues the dominant numeric code series already used by the current Task.
 * The suggestion is presentation guidance only; Workspace uniqueness remains
 * enforced by the authenticated backend when the Requirement is persisted.
 */
export const suggestRequirementCode = (
  linkedRequirements: Requirement[],
  workspaceRequirements: Requirement[],
): string => {
  const seriesByPrefix = new Map<string, RequirementCodeSeries>();

  linkedRequirements.forEach((requirement) => {
    const parsed = parseRequirementCode(requirement);
    if (!parsed || !Number.isSafeInteger(parsed.value)) return;

    const current = seriesByPrefix.get(parsed.prefix);
    seriesByPrefix.set(parsed.prefix, {
      prefix: parsed.prefix,
      count: (current?.count || 0) + 1,
      maximum: Math.max(current?.maximum || 0, parsed.value),
      width: Math.max(current?.width || 0, parsed.width),
      latestCreatedAt: Math.max(current?.latestCreatedAt || 0, parsed.createdAt),
    });
  });

  const selectedSeries = [...seriesByPrefix.values()].sort(
    (left, right) =>
      right.count - left.count ||
      right.latestCreatedAt - left.latestCreatedAt ||
      right.maximum - left.maximum ||
      left.prefix.localeCompare(right.prefix),
  )[0] || {
    prefix: 'REQ-',
    count: 0,
    maximum: 0,
    width: 3,
    latestCreatedAt: 0,
  };

  const usedCodes = new Set(
    workspaceRequirements.map((requirement) => requirement.code.trim().toUpperCase()),
  );
  let nextNumber = selectedSeries.maximum + 1;
  let suggestion = `${selectedSeries.prefix}${String(nextNumber).padStart(selectedSeries.width, '0')}`;

  while (usedCodes.has(suggestion)) {
    nextNumber += 1;
    suggestion = `${selectedSeries.prefix}${String(nextNumber).padStart(selectedSeries.width, '0')}`;
  }

  return suggestion;
};

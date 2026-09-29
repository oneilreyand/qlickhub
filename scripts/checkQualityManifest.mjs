import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const manifestDirectory = path.join(repositoryRoot, 'quality', 'manifests');

export const QUALITY_SCOPES = ['ui', 'dataAccess', 'performance', 'ai'];
const evidenceStatuses = new Set(['planned', 'collected', 'blocked', 'not_applicable']);
const hexDigestPattern = /^sha256:[a-f0-9]{64}$/;
const gitCommitPattern = /^[a-f0-9]{40,64}$/;
const approvalMarkerPattern = /<!--\s*qlickhub-agent-approval:v1\s*([\s\S]*?)\s*-->/;
const ownerAssociation = 'OWNER';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function isSafeRelativeFile(value) {
  return isNonEmptyString(value) && !path.isAbsolute(value) && !value.split('/').includes('..');
}

function isIsoDateTime(value) {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function validateApproval(approval, manifest, relativeFile) {
  const errors = [];
  if (!approval || typeof approval !== 'object' || Array.isArray(approval)) {
    return [`${relativeFile} must declare approval for version 2.`];
  }
  if (approval.authority !== 'github') {
    errors.push(`${relativeFile} must use github as the version 2 approval authority.`);
  }
  if (
    !isNonEmptyString(approval.recordUrl) ||
    !approval.recordUrl.startsWith('https://github.com/')
  ) {
    errors.push(`${relativeFile} must declare a GitHub approval recordUrl.`);
  }
  for (const field of ['recordId', 'approvedBy']) {
    if (!isNonEmptyString(approval[field])) {
      errors.push(`${relativeFile} must declare approval.${field}.`);
    }
  }
  if (!isNonEmptyString(approval.planDigest) || !hexDigestPattern.test(approval.planDigest)) {
    errors.push(
      `${relativeFile} must declare approval.planDigest as sha256:<64 lowercase hex chars>.`,
    );
  }
  if (
    !isNonEmptyString(approval.baselineCommit) ||
    !gitCommitPattern.test(approval.baselineCommit)
  ) {
    errors.push(`${relativeFile} must declare approval.baselineCommit as a Git commit hash.`);
  }
  if (!isIsoDateTime(approval.approvedAt) || !isIsoDateTime(approval.expiresAt)) {
    errors.push(
      `${relativeFile} must declare ISO approval.approvedAt and approval.expiresAt values.`,
    );
  } else if (Date.parse(approval.expiresAt) <= Date.parse(approval.approvedAt)) {
    errors.push(`${relativeFile} approval.expiresAt must be later than approval.approvedAt.`);
  }
  if (!Array.isArray(approval.allowedFiles) || approval.allowedFiles.length === 0) {
    errors.push(`${relativeFile} must declare non-empty approval.allowedFiles.`);
  } else if (approval.allowedFiles.some((file) => !isSafeRelativeFile(file))) {
    errors.push(`${relativeFile} has an invalid approval.allowedFiles entry.`);
  } else if (
    Array.isArray(manifest.changedFiles) &&
    manifest.changedFiles.some((file) => !approval.allowedFiles.includes(file))
  ) {
    errors.push(`${relativeFile} declares changedFiles outside approval.allowedFiles.`);
  } else if (
    Array.isArray(manifest.changedFiles) &&
    approval.allowedFiles.some((file) => !manifest.changedFiles.includes(file))
  ) {
    errors.push(`${relativeFile} approval.allowedFiles must exactly match changedFiles.`);
  }
  if (
    !approval.roleScope ||
    typeof approval.roleScope !== 'object' ||
    Array.isArray(approval.roleScope)
  ) {
    errors.push(`${relativeFile} must declare approval.roleScope.`);
  } else {
    const { targetRoles, preservedRoles } = approval.roleScope;
    if (!Array.isArray(targetRoles) || !Array.isArray(preservedRoles)) {
      errors.push(`${relativeFile} must declare roleScope targetRoles and preservedRoles arrays.`);
    } else if ([...targetRoles, ...preservedRoles].some((role) => !isNonEmptyString(role))) {
      errors.push(`${relativeFile} has an invalid approval.roleScope role.`);
    } else if (targetRoles.some((role) => preservedRoles.includes(role))) {
      errors.push(`${relativeFile} approval.roleScope cannot target and preserve the same role.`);
    }
  }
  if (
    !Array.isArray(approval.allowedStateChanges) ||
    approval.allowedStateChanges.length === 0 ||
    approval.allowedStateChanges.some((step) => !isNonEmptyString(step))
  ) {
    errors.push(`${relativeFile} must declare non-empty approval.allowedStateChanges.`);
  }
  return errors;
}

export function inferQualityScopes(changedFiles) {
  const scopes = new Set();

  for (const file of changedFiles) {
    if (file.startsWith('apps/web/src/') || file.startsWith('apps/web/e2e/')) {
      scopes.add('ui');
      scopes.add('performance');
    }
    if (
      file.startsWith('apps/api/src/db/') ||
      file.startsWith('apps/api/src/db/migrations/') ||
      file.includes('/repositories/') ||
      file.includes('/services/')
    ) {
      scopes.add('dataAccess');
      scopes.add('performance');
    }
    if (file.startsWith('apps/api/src/modules/ai/') || file.includes('AiTaskGenerator')) {
      scopes.add('ai');
    }
  }

  return [...scopes].sort();
}

export function validateManifest(manifest, relativeFile = 'manifest.json') {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return [`${relativeFile} must contain a JSON object.`];
  }
  if (![1, 2].includes(manifest.version)) {
    errors.push(`${relativeFile} must set version to 1 or 2.`);
  }
  if (typeof manifest.id !== 'string' || !/^[A-Z0-9][A-Z0-9_-]+$/.test(manifest.id)) {
    errors.push(`${relativeFile} has an invalid id.`);
  }
  if (!Array.isArray(manifest.changedFiles) || manifest.changedFiles.length === 0) {
    errors.push(`${relativeFile} must declare at least one changedFiles entry.`);
  } else {
    for (const changedFile of manifest.changedFiles) {
      if (!isSafeRelativeFile(changedFile)) {
        errors.push(`${relativeFile} has an invalid changedFiles entry.`);
        break;
      }
    }
  }
  if (!Array.isArray(manifest.scopes)) {
    errors.push(`${relativeFile} must declare scopes as an array.`);
  } else {
    const seenScopes = new Set();
    for (const scope of manifest.scopes) {
      if (!QUALITY_SCOPES.includes(scope))
        errors.push(`${relativeFile} has an unknown scope: ${scope}.`);
      if (seenScopes.has(scope)) errors.push(`${relativeFile} repeats scope: ${scope}.`);
      seenScopes.add(scope);
    }
  }
  if (
    !manifest.evidence ||
    typeof manifest.evidence !== 'object' ||
    Array.isArray(manifest.evidence)
  ) {
    errors.push(`${relativeFile} must declare evidence by scope.`);
  } else if (Array.isArray(manifest.scopes)) {
    for (const scope of manifest.scopes) {
      const evidence = manifest.evidence[scope];
      if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
        errors.push(`${relativeFile} is missing evidence for ${scope}.`);
        continue;
      }
      if (!evidenceStatuses.has(evidence.status)) {
        errors.push(`${relativeFile} has an invalid evidence status for ${scope}.`);
      }
      if (
        !Array.isArray(evidence.artifacts) ||
        evidence.artifacts.some((artifact) => typeof artifact !== 'string')
      ) {
        errors.push(`${relativeFile} must use a string artifacts array for ${scope}.`);
      } else if (evidence.status === 'collected' && evidence.artifacts.length === 0) {
        errors.push(`${relativeFile} marks ${scope} collected without an artifact.`);
      }
    }
  }
  if (manifest.version === 2) {
    errors.push(...validateApproval(manifest.approval, manifest, relativeFile));
  }
  return errors;
}

function normalizedStrings(values) {
  return [...values].sort();
}

function approvalPayload(manifest) {
  const { approval } = manifest;
  return {
    taskId: manifest.id,
    planDigest: approval.planDigest,
    baselineCommit: approval.baselineCommit,
    approvedAt: approval.approvedAt,
    expiresAt: approval.expiresAt,
    allowedFiles: normalizedStrings(approval.allowedFiles),
    roleScope: {
      targetRoles: normalizedStrings(approval.roleScope.targetRoles),
      preservedRoles: normalizedStrings(approval.roleScope.preservedRoles),
    },
    allowedStateChanges: normalizedStrings(approval.allowedStateChanges),
  };
}

export function approvalPlanPath(manifest) {
  return path.join('docs', 'plans', `${manifest.id.replaceAll('-', '_')}_PLAN.md`);
}

export function validatePlanDigest(manifest, readFile = fs.readFileSync) {
  if (manifest.version !== 2 || !manifest.approval) return [];

  const relativePlanPath = approvalPlanPath(manifest);
  const planPath = path.join(repositoryRoot, relativePlanPath);
  try {
    const actualDigest = `sha256:${createHash('sha256').update(readFile(planPath)).digest('hex')}`;
    if (actualDigest !== manifest.approval.planDigest) {
      return [`${manifest.id} approval planDigest does not match ${relativePlanPath}.`];
    }
  } catch {
    return [`${manifest.id} approval plan is unavailable at ${relativePlanPath}.`];
  }
  return [];
}

export function parseGitHubApprovalComment(body) {
  if (!isNonEmptyString(body)) return { error: 'approval comment has no body.' };
  const match = body.match(approvalMarkerPattern);
  if (!match)
    return { error: 'approval comment is missing the qlickhub-agent-approval:v1 marker.' };
  try {
    return { payload: JSON.parse(match[1]) };
  } catch {
    return { error: 'approval comment marker must contain valid JSON.' };
  }
}

export function validateGitHubApprovalRecord(
  manifest,
  comment,
  { baseCommit, now = new Date().toISOString() } = {},
) {
  const errors = [];
  if (manifest.version !== 2 || !manifest.approval) {
    return [`${manifest.id} is not a version 2 approval manifest.`];
  }
  const { approval } = manifest;
  if (comment?.user?.login !== approval.approvedBy) {
    errors.push(`${manifest.id} approval comment author does not match approvedBy.`);
  }
  if (comment?.author_association !== ownerAssociation) {
    errors.push(`${manifest.id} approval comment author must be the repository owner.`);
  }
  if (comment?.html_url !== approval.recordUrl) {
    errors.push(`${manifest.id} approval comment URL does not match recordUrl.`);
  }
  const parsed = parseGitHubApprovalComment(comment?.body);
  if (parsed.error) {
    errors.push(`${manifest.id} ${parsed.error}`);
  } else if (
    JSON.stringify(normalizeApprovalPayload(parsed.payload)) !==
    JSON.stringify(approvalPayload(manifest))
  ) {
    errors.push(`${manifest.id} approval comment payload does not match the manifest scope.`);
  }
  if (baseCommit && approval.baselineCommit !== baseCommit) {
    errors.push(`${manifest.id} approval baselineCommit does not match the CI base commit.`);
  }
  if (Date.parse(approval.expiresAt) <= Date.parse(now)) {
    errors.push(`${manifest.id} approval has expired.`);
  }
  return errors;
}

function normalizeApprovalPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  return {
    ...payload,
    allowedFiles: Array.isArray(payload.allowedFiles)
      ? normalizedStrings(payload.allowedFiles)
      : payload.allowedFiles,
    roleScope:
      payload.roleScope && typeof payload.roleScope === 'object'
        ? {
            ...payload.roleScope,
            targetRoles: Array.isArray(payload.roleScope.targetRoles)
              ? normalizedStrings(payload.roleScope.targetRoles)
              : payload.roleScope.targetRoles,
            preservedRoles: Array.isArray(payload.roleScope.preservedRoles)
              ? normalizedStrings(payload.roleScope.preservedRoles)
              : payload.roleScope.preservedRoles,
          }
        : payload.roleScope,
    allowedStateChanges: Array.isArray(payload.allowedStateChanges)
      ? normalizedStrings(payload.allowedStateChanges)
      : payload.allowedStateChanges,
  };
}

export async function fetchGitHubApprovalComment({
  repository,
  recordId,
  token,
  fetchImpl = fetch,
}) {
  const response = await fetchImpl(
    `https://api.github.com/repos/${repository}/issues/comments/${encodeURIComponent(recordId)}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );
  if (!response.ok) {
    throw new Error(`GitHub approval record lookup failed with HTTP ${response.status}.`);
  }
  return response.json();
}

export async function resolveGitHubApprovals({
  changedFiles,
  manifests,
  repository,
  token,
  baseCommit,
  fetchImpl,
}) {
  const matchingVersion2Manifests = manifests.filter(
    (manifest) =>
      manifest.version === 2 && manifest.changedFiles.every((file) => changedFiles.includes(file)),
  );
  const issues = [];
  const approvedFiles = new Set(
    matchingVersion2Manifests.flatMap((manifest) => manifest.changedFiles),
  );
  for (const changedFile of changedFiles) {
    if (!approvedFiles.has(changedFile)) {
      issues.push(`${changedFile} is not covered by a version 2 approval manifest.`);
    }
  }
  for (const manifest of matchingVersion2Manifests) {
    if (!repository || !token) {
      issues.push(
        `${manifest.id} cannot resolve its GitHub approval record without repository and token.`,
      );
      continue;
    }
    try {
      const comment = await fetchGitHubApprovalComment({
        repository,
        recordId: manifest.approval.recordId,
        token,
        fetchImpl,
      });
      issues.push(...validateGitHubApprovalRecord(manifest, comment, { baseCommit }));
    } catch (error) {
      issues.push(`${manifest.id} ${error.message}`);
    }
  }
  return { matchingVersion2Manifests, issues };
}

export function assessManifests(changedFiles, manifests) {
  const requiredScopes = inferQualityScopes(changedFiles);
  const issues = [];
  const matchingManifests = manifests.filter((manifest) =>
    manifest.changedFiles.some((changedFile) => changedFiles.includes(changedFile)),
  );

  for (const scope of requiredScopes) {
    const coveringManifest = matchingManifests.find((manifest) => manifest.scopes.includes(scope));
    if (!coveringManifest) {
      issues.push(`No manifest covers inferred ${scope} scope.`);
      continue;
    }
    const evidence = coveringManifest.evidence?.[scope];
    if (!evidence || evidence.status !== 'collected') {
      issues.push(`${coveringManifest.id} has no collected evidence for ${scope}.`);
    }
  }

  return { requiredScopes, matchingManifests, issues };
}

function parseArguments(argv) {
  const options = { mode: 'report', approvalMode: 'off', base: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--mode') options.mode = argv[++index];
    if (argv[index] === '--approval-mode') options.approvalMode = argv[++index];
    if (argv[index] === '--base') options.base = argv[++index];
  }
  if (!['report', 'enforce'].includes(options.mode)) {
    throw new Error('--mode must be report or enforce.');
  }
  if (!['off', 'report', 'enforce'].includes(options.approvalMode)) {
    throw new Error('--approval-mode must be off, report, or enforce.');
  }
  return options;
}

function gitFiles(args) {
  return execFileSync('git', args, { cwd: repositoryRoot, encoding: 'utf8' })
    .split('\n')
    .map((file) => file.trim())
    .filter(Boolean);
}

export function mergeChangedFiles(...fileLists) {
  return [...new Set(fileLists.flat())].sort();
}

export function changedFilesFromGit(base) {
  if (base) return gitFiles(['diff', '--name-only', `${base}..HEAD`]);

  // A local report must cover both tracked worktree/staged changes and newly created files.
  // `git diff` alone deliberately omits untracked files, which would hide the riskiest
  // early-stage changes from the evidence report.
  return mergeChangedFiles(
    gitFiles(['diff', '--name-only', 'HEAD']),
    gitFiles(['ls-files', '--others', '--exclude-standard']),
  );
}

function readManifests() {
  if (!fs.existsSync(manifestDirectory)) return { manifests: [], errors: [] };
  const manifests = [];
  const errors = [];
  for (const entry of fs.readdirSync(manifestDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const filePath = path.join(manifestDirectory, entry.name);
    const relativeFile = path.relative(repositoryRoot, filePath);
    try {
      const manifest = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      errors.push(...validateManifest(manifest, relativeFile));
      manifests.push(manifest);
    } catch (error) {
      errors.push(`${relativeFile} is not valid JSON: ${error.message}`);
    }
  }
  return { manifests, errors };
}

export function runQualityCheck({ changedFiles, manifests, manifestErrors, mode }) {
  const assessment = assessManifests(changedFiles, manifests);
  const issues = [...manifestErrors, ...assessment.issues];
  return { ...assessment, issues, mode };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const run = async () => {
    const options = parseArguments(process.argv.slice(2));
    const changedFiles = changedFilesFromGit(options.base);
    const { manifests, errors: manifestErrors } = readManifests();
    const result = runQualityCheck({ changedFiles, manifests, manifestErrors, mode: options.mode });

    console.log(`Quality gate (${result.mode}) inspected ${changedFiles.length} changed file(s).`);
    console.log(`Inferred scopes: ${result.requiredScopes.join(', ') || 'none'}.`);
    for (const issue of result.issues) console.warn(`QUALITY GAP: ${issue}`);
    if (result.issues.length === 0) console.log('Quality evidence coverage is complete.');
    if (result.mode === 'enforce' && result.issues.length > 0) process.exitCode = 1;
    if (options.approvalMode !== 'off') {
      const approvalResult = await resolveGitHubApprovals({
        changedFiles,
        manifests,
        repository: process.env.GITHUB_REPOSITORY,
        token: process.env.GITHUB_TOKEN,
        baseCommit: options.base,
      });
      for (const manifest of approvalResult.matchingVersion2Manifests) {
        approvalResult.issues.push(...validatePlanDigest(manifest));
      }
      console.log(
        `Approval gate (${options.approvalMode}) inspected ${approvalResult.matchingVersion2Manifests.length} version 2 manifest(s).`,
      );
      for (const issue of approvalResult.issues) console.warn(`APPROVAL GAP: ${issue}`);
      if (options.approvalMode === 'enforce' && approvalResult.issues.length > 0) {
        process.exitCode = 1;
      }
    }
  };
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { extractPolicyIds } from './checkDocs.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const executionRecordDirectory = path.join(repositoryRoot, 'quality', 'execution-records');

const modes = new Set(['read-only', 'dry-run']);
const evidenceLevels = new Set(['E1', 'E2', 'E3', 'E4']);
const supportedCapabilities = new Set([
  'fs:read',
  'fs:write',
  'exec:test',
  'git:commit',
  'deploy:preview',
  'deploy:production',
  'secret:read',
  'secret:rotate',
  'data:write',
  'rbac:write',
]);
const readOnlyDeniedCapabilities = new Set([
  'fs:write',
  'git:commit',
  'deploy:preview',
  'deploy:production',
  'secret:read',
  'secret:rotate',
  'data:write',
  'rbac:write',
]);
const locallyUnavailableCapabilities = new Set([
  'git:commit',
  'deploy:preview',
  'deploy:production',
  'secret:read',
  'secret:rotate',
  'data:write',
  'rbac:write',
]);
const taskIdPattern = /^[A-Z0-9][A-Z0-9_-]+$/;
const commitPattern = /^[a-f0-9]{40,64}$/;
const identityPattern = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isSafeRelativePath(value) {
  return (
    isNonEmptyString(value) &&
    !path.isAbsolute(value) &&
    !value.includes('\\') &&
    ![...value].some(
      (character) => character.codePointAt(0) < 32 || character.codePointAt(0) === 127,
    ) &&
    !/^[a-zA-Z]:/.test(value) &&
    value !== '.' &&
    !value.endsWith('/') &&
    !value.split('/').includes('..') &&
    value === path.posix.normalize(value) &&
    !value.startsWith('./')
  );
}

function isIsoDateTime(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
  )
    return false;
  const timestamp = Date.parse(value);
  const normalized = value.includes('.') ? value : value.replace('Z', '.000Z');
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === normalized;
}

function validateStringArray(value, field, errors, { minItems = 1 } = {}) {
  if (
    !Array.isArray(value) ||
    value.length < minItems ||
    value.some((item) => !isNonEmptyString(item))
  ) {
    errors.push(`Execution Record ${field} must be a non-empty string array.`);
    return;
  }
  if (new Set(value).size !== value.length) {
    errors.push(`Execution Record ${field} must not repeat entries.`);
  }
}

export function validateExecutionRecord(
  record,
  { now = new Date().toISOString(), knownPolicyIds } = {},
) {
  const errors = [];
  if (!isPlainObject(record)) return ['Execution Record must be a JSON object.'];
  if (!isIsoDateTime(now))
    errors.push('Execution Record evaluation time must be a UTC ISO timestamp.');
  if (containsSecretMaterial(record)) {
    errors.push(
      'Execution Record contains recognised secret material; remove it before evaluation.',
    );
  }

  if (record.version !== 1) errors.push('Execution Record version must be 1.');
  if (!isNonEmptyString(record.taskId) || !taskIdPattern.test(record.taskId)) {
    errors.push('Execution Record taskId is invalid.');
  }
  if (!modes.has(record.mode)) errors.push('Execution Record mode must be read-only or dry-run.');
  if (!isNonEmptyString(record.baselineCommit) || !commitPattern.test(record.baselineCommit)) {
    errors.push('Execution Record baselineCommit must be a Git commit hash.');
  }

  validateStringArray(record.allowedPaths, 'allowedPaths', errors);
  if (
    Array.isArray(record.allowedPaths) &&
    record.allowedPaths.some((file) => !isSafeRelativePath(file))
  ) {
    errors.push('Execution Record allowedPaths contains an unsafe repository-relative path.');
  }

  for (const field of ['requestedCapabilities', 'prohibitedCapabilities']) {
    validateStringArray(record[field], field, errors);
    if (Array.isArray(record[field])) {
      for (const capability of record[field]) {
        if (!supportedCapabilities.has(capability)) {
          errors.push(`Execution Record ${field} contains an unsupported capability.`);
        }
      }
    }
  }
  if (
    Array.isArray(record.requestedCapabilities) &&
    Array.isArray(record.prohibitedCapabilities) &&
    record.requestedCapabilities.some((capability) =>
      record.prohibitedCapabilities.includes(capability),
    )
  ) {
    errors.push('Execution Record cannot request and prohibit the same capability.');
  }
  if (record.mode === 'read-only' && Array.isArray(record.requestedCapabilities)) {
    for (const capability of record.requestedCapabilities) {
      if (readOnlyDeniedCapabilities.has(capability)) {
        errors.push(`Execution Record read-only mode cannot request ${capability}.`);
      }
    }
  }

  if (record.mode === 'read-only' && !Array.isArray(record.stateChanges)) {
    errors.push('Execution Record read-only mode must declare stateChanges as an array.');
  } else if (record.mode !== 'read-only') {
    validateStringArray(record.stateChanges, 'stateChanges', errors);
  } else if (record.stateChanges.length !== 0) {
    errors.push('Execution Record read-only mode must have no stateChanges.');
  }

  if (!Array.isArray(record.acceptanceCriteria) || record.acceptanceCriteria.length === 0) {
    errors.push('Execution Record acceptanceCriteria must be a non-empty array.');
  } else {
    const ids = new Set();
    for (const criterion of record.acceptanceCriteria) {
      if (
        !isPlainObject(criterion) ||
        !isNonEmptyString(criterion.id) ||
        !taskIdPattern.test(criterion.id)
      ) {
        errors.push('Execution Record acceptanceCriteria contains an invalid id.');
        continue;
      }
      if (ids.has(criterion.id))
        errors.push(`Execution Record repeats acceptance criterion ${criterion.id}.`);
      ids.add(criterion.id);
      if (!evidenceLevels.has(criterion.evidenceLevel)) {
        errors.push(`Execution Record ${criterion.id} has an invalid evidenceLevel.`);
      }
      if (!isNonEmptyString(criterion.description)) {
        errors.push(`Execution Record ${criterion.id} must describe its evidence target.`);
      }
      if (
        !isNonEmptyString(criterion.evidenceCommand) ||
        !Array.isArray(record.evidenceCommands) ||
        !record.evidenceCommands.includes(criterion.evidenceCommand)
      ) {
        errors.push(`Execution Record ${criterion.id} must map to a declared evidenceCommand.`);
      }
    }
  }
  validateStringArray(record.evidenceCommands, 'evidenceCommands', errors);

  if (!isNonEmptyString(record.executor) || !identityPattern.test(record.executor))
    errors.push('Execution Record executor must be a valid identity.');
  if (!isNonEmptyString(record.verifier) || !identityPattern.test(record.verifier))
    errors.push('Execution Record verifier must be a valid identity.');
  if (isNonEmptyString(record.executor) && record.executor === record.verifier) {
    errors.push('Execution Record verifier must be operationally distinct from executor.');
  }

  if (!isIsoDateTime(record.leaseExpiresAt)) {
    errors.push('Execution Record leaseExpiresAt must be an ISO timestamp.');
  } else if (isIsoDateTime(now) && Date.parse(record.leaseExpiresAt) <= Date.parse(now)) {
    errors.push('Execution Record lease has expired.');
  }
  if (!Number.isInteger(record.retryLimit) || record.retryLimit < 0 || record.retryLimit > 3) {
    errors.push('Execution Record retryLimit must be an integer from 0 to 3.');
  }
  if (
    !Number.isInteger(record.timeoutMinutes) ||
    record.timeoutMinutes < 1 ||
    record.timeoutMinutes > 60
  ) {
    errors.push('Execution Record timeoutMinutes must be an integer from 1 to 60.');
  }
  if (
    typeof record.costBudgetUsd !== 'number' ||
    !Number.isFinite(record.costBudgetUsd) ||
    record.costBudgetUsd < 0
  ) {
    errors.push('Execution Record costBudgetUsd must be a non-negative number.');
  }
  if (!isPlainObject(record.recovery)) {
    errors.push('Execution Record recovery is required.');
  } else {
    for (const field of ['rollbackTarget', 'quarantineAction']) {
      if (!isNonEmptyString(record.recovery[field])) {
        errors.push(`Execution Record recovery.${field} is required.`);
      }
    }
  }

  validateStringArray(record.policyIds, 'policyIds', errors);
  if (knownPolicyIds instanceof Set && Array.isArray(record.policyIds)) {
    for (const policyId of record.policyIds) {
      if (!knownPolicyIds.has(policyId)) {
        errors.push('Execution Record references an unknown Policy ID.');
      }
    }
  }
  return errors;
}

export function redactForAudit(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(
      /\b(DATABASE_URL|JWT_SECRET|[A-Z0-9_]*API(?:_|-)?KEY|[A-Z0-9_]*TOKEN|[A-Z0-9_]*PASSWORD)\s*=\s*[^\s]+/gi,
      '$1=[REDACTED]',
    )
    .replace(/(Authorization\s*:\s*Bearer)\s+[^\s]+/gi, '$1 [REDACTED]')
    .replace(/\b(?:postgres|postgresql):\/\/[^\s]+/gi, '[REDACTED_CONNECTION_STRING]');
}

function containsSecretMaterial(value) {
  if (typeof value === 'string') return redactForAudit(value) !== value;
  if (Array.isArray(value)) return value.some(containsSecretMaterial);
  if (isPlainObject(value))
    return Object.entries(value).some(
      ([key, item]) => containsSecretMaterial(key) || containsSecretMaterial(item),
    );
  return false;
}

function safeAuditString(value, predicate) {
  return typeof value === 'string' && predicate(value) && !containsSecretMaterial(value)
    ? value
    : null;
}

export function evaluateExecutionPolicy(
  record,
  {
    targetPath,
    capability,
    now = new Date().toISOString(),
    knownPolicyIds,
    baselineCommit,
    clockSource = 'system',
  } = {},
) {
  const reasons = validateExecutionRecord(record, { now, knownPolicyIds });
  if (!commitPattern.test(baselineCommit ?? '')) {
    reasons.push('Observed repository baseline is unavailable.');
  } else if (record?.baselineCommit !== baselineCommit) {
    reasons.push('Execution Record baselineCommit does not match observed Git HEAD.');
  }
  if (!(knownPolicyIds instanceof Set) || knownPolicyIds.size === 0) {
    reasons.push('Authoritative Policy Registry is unavailable.');
  }
  if (!isSafeRelativePath(targetPath)) {
    reasons.push('Requested targetPath must be a safe repository-relative path.');
  } else if (!Array.isArray(record?.allowedPaths) || !record.allowedPaths.includes(targetPath)) {
    reasons.push('Requested targetPath is outside allowedPaths.');
  }
  if (!supportedCapabilities.has(capability)) {
    reasons.push('Requested capability is unsupported.');
  } else if (
    !Array.isArray(record?.requestedCapabilities) ||
    !record.requestedCapabilities.includes(capability)
  ) {
    reasons.push('Requested capability was not declared by the Execution Record.');
  } else if (record.prohibitedCapabilities?.includes(capability)) {
    reasons.push('Requested capability is prohibited by the Execution Record.');
  }
  if (locallyUnavailableCapabilities.has(capability)) {
    reasons.push(`Requested capability ${capability} is not available in local dry-run.`);
  }

  if (containsSecretMaterial(targetPath) || containsSecretMaterial(capability)) {
    reasons.push('Request contains recognised secret material; audit values were suppressed.');
  }
  const audit = {
    taskId: safeAuditString(record?.taskId, (value) => taskIdPattern.test(value)),
    mode: modes.has(record?.mode) ? record.mode : null,
    baselineCommit: safeAuditString(baselineCommit, (value) => commitPattern.test(value)),
    evaluatedAt: isIsoDateTime(now) ? now : null,
    clockSource: clockSource === 'simulation' ? 'simulation' : 'system',
    targetPath: safeAuditString(targetPath, isSafeRelativePath),
    capability: supportedCapabilities.has(capability) ? capability : null,
    executor: safeAuditString(record?.executor, (value) => identityPattern.test(value)),
    verifier: safeAuditString(record?.verifier, (value) => identityPattern.test(value)),
  };
  return {
    decision: reasons.length === 0 ? 'allow' : 'deny',
    capabilityIssued: false,
    reasons,
    audit,
  };
}

function knownPolicyIdsFromRegistry() {
  const registryPath = path.join(repositoryRoot, 'docs', 'POLICY_REGISTRY.md');
  const content = fs.readFileSync(registryPath, 'utf8');
  return new Set(extractPolicyIds(content));
}

function gitOutput(args) {
  return execFileSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
}

export function captureRepositorySnapshot() {
  const files = [
    ...new Set(
      gitOutput(['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
        .split('\0')
        .filter(Boolean),
    ),
  ].sort();
  const digest = createHash('sha256');
  for (const file of files) {
    const target = path.join(repositoryRoot, file);
    let stat;
    try {
      stat = fs.lstatSync(target);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      // Tracked deleted files are still listed by Git.
      digest.update(`${JSON.stringify([file, 'missing'])}\n`);
      continue;
    }
    const kind = stat.isSymbolicLink() ? 'symlink' : stat.isFile() ? 'file' : 'directory';
    const bytes = stat.isSymbolicLink()
      ? fs.readlinkSync(target)
      : stat.isFile()
        ? fs.readFileSync(target)
        : '';
    const contentHash = createHash('sha256').update(bytes).digest('hex');
    digest.update(`${JSON.stringify([file, stat.mode, kind, contentHash])}\n`);
  }
  return {
    head: gitOutput(['rev-parse', 'HEAD']).trim(),
    fileCount: files.length,
    contentDigest: digest.digest('hex'),
    indexDigest: createHash('sha256')
      .update(gitOutput(['ls-files', '--stage', '-z']))
      .digest('hex'),
    statusDigest: createHash('sha256')
      .update(gitOutput(['status', '--porcelain=v1', '--untracked-files=all', '-z']))
      .digest('hex'),
  };
}

function parseArguments(argv) {
  const options = {
    record: undefined,
    targetPath: undefined,
    capability: undefined,
    now: undefined,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (
      !['--record', '--path', '--capability', '--now'].includes(value) ||
      index + 1 >= argv.length ||
      argv[index + 1].startsWith('--')
    ) {
      throw new Error('CLI requires a known option and a value.');
    }
    if (value === '--record') options.record = argv[++index];
    else if (value === '--path') options.targetPath = argv[++index];
    else if (value === '--capability') options.capability = argv[++index];
    else if (value === '--now') options.now = argv[++index];
  }
  if (
    !isSafeRelativePath(options.record) ||
    !options.record.startsWith('quality/execution-records/')
  ) {
    throw new Error('--record must be a safe path inside quality/execution-records/.');
  }
  return options;
}

function loadRecord(relativePath) {
  const absolutePath = fs.realpathSync(path.resolve(repositoryRoot, relativePath));
  const realRecordDirectory = fs.realpathSync(executionRecordDirectory);
  if (!absolutePath.startsWith(`${realRecordDirectory}${path.sep}`)) {
    throw new Error('--record escapes quality/execution-records/.');
  }
  if (fs.statSync(absolutePath).size > 64 * 1024) throw new Error('Execution Record is too large.');
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const argv = process.argv.slice(2);
    if (argv.length === 1 && argv[0] === '--snapshot') {
      console.log(JSON.stringify(captureRepositorySnapshot(), null, 2));
    } else {
      const options = parseArguments(argv);
      const record = loadRecord(options.record);
      const decision = evaluateExecutionPolicy(record, {
        targetPath: options.targetPath ?? record.allowedPaths?.[0],
        capability: options.capability ?? 'fs:read',
        now: options.now,
        knownPolicyIds: knownPolicyIdsFromRegistry(),
        baselineCommit: gitOutput(['rev-parse', 'HEAD']).trim(),
        clockSource: options.now === undefined ? 'system' : 'simulation',
      });
      console.log(JSON.stringify(decision, null, 2));
      if (decision.decision === 'deny') process.exitCode = 1;
    }
  } catch {
    // A parser or filesystem exception can embed the original input. Never echo it.
    console.error(
      'Execution policy check failed: invalid arguments, record, or repository context.',
    );
    process.exitCode = 1;
  }
}

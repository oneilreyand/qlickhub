import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');

const requiredFiles = [
  'AGENTS.md',
  'AGENT_REPORT_TEMPLATE.md',
  'TODO.md',
  '.github/pull_request_template.md',
  'docs/0_PRODUCT_KNOWLEDGE_MAP.md',
  'docs/1_ARCHITECTURE.md',
  'docs/2_WORKFLOW_AND_ROLES.md',
  'docs/3_UI_ATOMIC_DESIGN_SYSTEM.md',
  'docs/4_AGENT_DEV_GUIDELINES.md',
  'docs/POLICY_REGISTRY.md',
  'docs/DEPLOYMENT_AND_ENVIRONMENTS.md',
  'docs/features/README.md',
  'docs/features/FEATURE_CATALOG.md',
  'docs/features/ROLE_FLOWS.md',
  'docs/features/FEATURE_TEMPLATE.md',
];

const featureHeadings = [
  '## 1. Tujuan dan Pengguna',
  '## 2. Requirement dan Acceptance Criteria',
  '## 3. Alur Lintas Peran',
  '## 4. Data dan Relasi',
  '## 5. API dan Shared Contract',
  '## 6. Authorization',
  '## 7. UI dan Interaction States',
  '## 8. Pengujian dan Evidence',
  '## 9. Release dan Readiness',
  '## 10. Traceability',
];

const featureMetadata = ['Status', 'Owner', 'Last reviewed', 'Applicable Policy IDs'];
const allowedFeatureStatuses = new Set(['Draft', 'Active', 'Superseded', 'Archived']);
const featureFolderRequiredFiles = [
  'README.md',
  'product.md',
  'contracts.md',
  'authorization.md',
  'testing.md',
  'roles/owner-admin.md',
  'roles/po.md',
  'roles/developer.md',
  'roles/qa.md',
];

const featureNavigationRequirements = {
  'docs/features/FEATURE_CATALOG.md': [
    '## Cara memakai katalog',
    '## 1. Planning, Delivery, dan Task Hub',
    '## 2. QA, Evidence, Bug, dan Release Readiness',
    '## 3. Workspace, Membership, dan Collaboration',
    '## 4. Security dan Reliability',
    '## 5. AI Assistance',
  ],
  'docs/features/ROLE_FLOWS.md': ['## Owner / Admin', '## Product Owner', '## Developer', '## QA'],
};

export function extractPolicyIds(markdown) {
  return [...markdown.matchAll(/^\|\s*([A-Z]+-\d{3})\s*\|/gm)].map((match) => match[1]);
}

export function extractReferencedPolicyIds(markdown) {
  return new Set(markdown.match(/\b[A-Z]+-\d{3}\b/g) ?? []);
}

export function extractMarkdownLinks(markdown) {
  const withoutCodeFences = markdown.replace(/```[\s\S]*?```/g, '');
  return [...withoutCodeFences.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1].trim());
}

function collectMarkdownFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectMarkdownFiles(entryPath);
    }
    return entry.isFile() && entry.name.endsWith('.md') ? [entryPath] : [];
  });
}

function resolveLocalLink(sourceFile, rawTarget) {
  const normalizedTarget = rawTarget.replace(/^<|>$/g, '').split('#')[0].trim();
  if (
    normalizedTarget.length === 0 ||
    normalizedTarget.startsWith('#') ||
    /^[a-z][a-z\d+.-]*:/i.test(normalizedTarget)
  ) {
    return null;
  }
  return path.resolve(path.dirname(sourceFile), decodeURIComponent(normalizedTarget));
}

function validateRequiredFiles(errors) {
  for (const relativeFile of requiredFiles) {
    if (!fs.existsSync(path.join(repositoryRoot, relativeFile))) {
      errors.push(`Required documentation file is missing: ${relativeFile}`);
    }
  }
}

function validateKnowledgeEntryPoint(errors) {
  const agentsPath = path.join(repositoryRoot, 'AGENTS.md');
  if (!fs.existsSync(agentsPath)) return;

  const agents = fs.readFileSync(agentsPath, 'utf8');
  if (!agents.includes('docs/0_PRODUCT_KNOWLEDGE_MAP.md')) {
    errors.push('AGENTS.md must require docs/0_PRODUCT_KNOWLEDGE_MAP.md as the entry point.');
  }
  if (!agents.includes('npm run docs:check')) {
    errors.push('AGENTS.md must document the mandatory npm run docs:check gate.');
  }

  const packagePath = path.join(repositoryRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  if (!packageJson.scripts?.['docs:check']) {
    errors.push('package.json must define the docs:check script.');
  }
  if (!packageJson.scripts?.validate?.includes('docs:check')) {
    errors.push('The validate script must include docs:check so CI enforces documentation rules.');
  }
}

function validatePolicyRegistry(errors) {
  const registryPath = path.join(repositoryRoot, 'docs/POLICY_REGISTRY.md');
  if (!fs.existsSync(registryPath)) return new Set();

  const registry = fs.readFileSync(registryPath, 'utf8');
  const policyIds = extractPolicyIds(registry);
  const duplicates = policyIds.filter((id, index) => policyIds.indexOf(id) !== index);
  for (const id of new Set(duplicates)) {
    errors.push(`Duplicate Policy ID in docs/POLICY_REGISTRY.md: ${id}`);
  }
  if (policyIds.length === 0) {
    errors.push('docs/POLICY_REGISTRY.md must define at least one Policy ID table row.');
  }
  return new Set(policyIds);
}

export function validateFeatureCard(content, policyIds, relativeFile = 'feature.md') {
  const errors = [];
  for (const heading of featureHeadings) {
    if (!content.includes(heading)) {
      errors.push(`${relativeFile} is missing required heading: ${heading}`);
    }
  }

  for (const field of featureMetadata) {
    if (!new RegExp(`^\\*\\*${field}:\\*\\*\\s*\\S+`, 'm').test(content)) {
      errors.push(`${relativeFile} is missing metadata field: ${field}`);
    }
  }

  const status = content.match(/^\*\*Status:\*\*\s*([^\s]+)/m)?.[1];
  if (status && !allowedFeatureStatuses.has(status)) {
    errors.push(`${relativeFile} has unsupported Status: ${status}`);
  }

  const referencedPolicyIds = extractReferencedPolicyIds(content);
  if (referencedPolicyIds.size === 0) {
    errors.push(`${relativeFile} must cite at least one Policy ID.`);
  }
  for (const id of referencedPolicyIds) {
    if (!policyIds.has(id)) {
      errors.push(`${relativeFile} references unknown Policy ID: ${id}`);
    }
  }

  if (status === 'Active' && /\b(?:TBD|YYYY-MM-DD)\b|\[FEATURE-ID\]/.test(content)) {
    errors.push(`${relativeFile} is Active but still contains an unresolved placeholder.`);
  }
  return errors;
}

export function validateFeatureFolder(fileNames, relativeDirectory = 'feature') {
  const available = new Set(fileNames);
  return featureFolderRequiredFiles
    .filter((file) => !available.has(file))
    .map((file) => `${relativeDirectory} is missing required file: ${file}`);
}

export function validateFeatureNavigation(content, requiredHeadings, relativeFile) {
  return requiredHeadings
    .filter((heading) => !content.includes(heading))
    .map((heading) => `${relativeFile} is missing required navigation heading: ${heading}`);
}

export function validateFeatureCatalog(content, legacyFeatureFileNames, relativeFile) {
  const linkCounts = new Map();
  const expected = new Set(legacyFeatureFileNames);

  for (const rawTarget of extractMarkdownLinks(content)) {
    const targetFile = path.basename(rawTarget.replace(/^<|>$/g, '').split('#')[0].trim());
    if (expected.has(targetFile)) {
      linkCounts.set(targetFile, (linkCounts.get(targetFile) ?? 0) + 1);
    }
  }

  const errors = [];
  for (const fileName of [...expected].sort()) {
    const count = linkCounts.get(fileName) ?? 0;
    if (count === 0) errors.push(`${relativeFile} is missing legacy Feature link: ${fileName}`);
    if (count > 1) errors.push(`${relativeFile} repeats legacy Feature link: ${fileName}`);
  }
  return errors;
}

function legacyFeatureCardFiles(featuresDirectory) {
  return fs
    .readdirSync(featuresDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(featuresDirectory, entry.name))
    .filter(
      (file) =>
        !['README.md', 'FEATURE_TEMPLATE.md', 'FEATURE_CATALOG.md', 'ROLE_FLOWS.md'].includes(
          path.basename(file),
        ),
    );
}

function validateFeatureCards(policyIds, errors) {
  const featuresDirectory = path.join(repositoryRoot, 'docs/features');
  if (!fs.existsSync(featuresDirectory)) return;

  const featureFiles = legacyFeatureCardFiles(featuresDirectory);

  for (const featureFile of featureFiles) {
    const relativeFile = path.relative(repositoryRoot, featureFile);
    const content = fs.readFileSync(featureFile, 'utf8');
    errors.push(...validateFeatureCard(content, policyIds, relativeFile));
  }

  const featureDirectories = fs
    .readdirSync(featuresDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== '_template');

  for (const featureDirectory of featureDirectories) {
    const absoluteDirectory = path.join(featuresDirectory, featureDirectory.name);
    const relativeDirectory = path.relative(repositoryRoot, absoluteDirectory);
    const markdownFiles = collectMarkdownFiles(absoluteDirectory);
    const relativeFiles = markdownFiles.map((file) => path.relative(absoluteDirectory, file));
    errors.push(...validateFeatureFolder(relativeFiles, relativeDirectory));

    const readmePath = path.join(absoluteDirectory, 'README.md');
    if (fs.existsSync(readmePath)) {
      errors.push(
        ...validateFeatureCard(
          fs.readFileSync(readmePath, 'utf8'),
          policyIds,
          path.relative(repositoryRoot, readmePath),
        ),
      );
    }
  }
}

function validateFeatureNavigationDocuments(errors) {
  for (const [relativeFile, headings] of Object.entries(featureNavigationRequirements)) {
    const absoluteFile = path.join(repositoryRoot, relativeFile);
    if (!fs.existsSync(absoluteFile)) continue;
    errors.push(
      ...validateFeatureNavigation(fs.readFileSync(absoluteFile, 'utf8'), headings, relativeFile),
    );
  }

  const featuresDirectory = path.join(repositoryRoot, 'docs/features');
  const catalogPath = path.join(featuresDirectory, 'FEATURE_CATALOG.md');
  if (fs.existsSync(catalogPath)) {
    errors.push(
      ...validateFeatureCatalog(
        fs.readFileSync(catalogPath, 'utf8'),
        legacyFeatureCardFiles(featuresDirectory).map((file) => path.basename(file)),
        'docs/features/FEATURE_CATALOG.md',
      ),
    );
  }
}

function validateLocalLinks(errors) {
  const filesToCheck = [
    path.join(repositoryRoot, 'AGENTS.md'),
    ...collectMarkdownFiles(path.join(repositoryRoot, 'docs')).filter((file) => {
      const relativeFile = path.relative(repositoryRoot, file);
      return (
        /^docs\/[0-4]_/.test(relativeFile) ||
        relativeFile === 'docs/POLICY_REGISTRY.md' ||
        relativeFile === 'docs/DEPLOYMENT_AND_ENVIRONMENTS.md' ||
        relativeFile.startsWith('docs/features/')
      );
    }),
  ];

  for (const sourceFile of filesToCheck) {
    const content = fs.readFileSync(sourceFile, 'utf8');
    for (const rawTarget of extractMarkdownLinks(content)) {
      const target = resolveLocalLink(sourceFile, rawTarget);
      if (target && !fs.existsSync(target)) {
        errors.push(
          `${path.relative(repositoryRoot, sourceFile)} has a broken local link: ${rawTarget}`,
        );
      }
    }
  }
}

export function runDocumentationChecks() {
  const errors = [];
  validateRequiredFiles(errors);
  validateKnowledgeEntryPoint(errors);
  const policyIds = validatePolicyRegistry(errors);
  validateFeatureCards(policyIds, errors);
  validateFeatureNavigationDocuments(errors);
  validateLocalLinks(errors);
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = runDocumentationChecks();
  if (errors.length > 0) {
    console.error(`Documentation governance failed with ${errors.length} error(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log('Documentation governance passed.');
  }
}

import { execFileSync } from 'node:child_process';
import { packageJsonAdapter } from '../adapters/packageJson.mjs';
import { expressRoutesAdapter } from '../adapters/expressRoutes.mjs';
import { zodContractsAdapter } from '../adapters/zodContracts.mjs';
import { sequelizeModelsAdapter } from '../adapters/sequelizeModels.mjs';
import { markdownDocsAdapter } from '../adapters/markdownDocs.mjs';
import { linkFeatures } from './link.mjs';
import { SCHEMA_VERSION, validate } from './schema.mjs';

/** Built-in adapters. A project selects them by id in `docsys.config.json` → `adapters`. */
export const ADAPTERS = new Map(
  [
    packageJsonAdapter,
    expressRoutesAdapter,
    zodContractsAdapter,
    sequelizeModelsAdapter,
    markdownDocsAdapter,
  ].map((adapter) => [adapter.id, adapter]),
);

const EMPTY = () => ({
  stack: { node: null, groups: [], manifests: [], workflows: [] },
  features: [],
  endpoints: [],
  contracts: [],
  erd: { entities: [], relations: [] },
  policies: [],
  adrs: [],
  todo: [],
  uxMatrix: { roles: [], source: null, criteria: [], rows: [] },
  warnings: [],
});

function gitCommit(root) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Runs the configured adapters and returns validated docs data.
 * `now` and `commit` can be injected for deterministic tests.
 */
export function extract({
  root,
  config,
  now = new Date(),
  commit = gitCommit(root),
  adapters = ADAPTERS,
}) {
  const data = EMPTY();
  const used = [];
  for (const id of config.adapters ?? []) {
    const adapter = adapters.get(id);
    if (!adapter)
      throw new Error(`Unknown adapter "${id}". Known: ${[...adapters.keys()].join(', ')}`);
    const { warnings = [], ...part } = adapter.extract({ root, config });
    for (const [key, value] of Object.entries(part)) {
      if (!(key in data)) throw new Error(`Adapter "${id}" returned unknown section "${key}"`);
      data[key] = value;
    }
    data.warnings.push(...warnings);
    used.push(id);
  }
  linkFeatures(root, data, config.links);
  for (const feature of data.features) delete feature.sourceFiles;

  const result = {
    meta: {
      schemaVersion: SCHEMA_VERSION,
      project: config.project ?? { name: 'Project' },
      commit,
      generatedAt: now.toISOString(),
      adapters: used,
    },
    ...data,
  };
  const errors = validate(result);
  if (errors.length)
    throw new Error(`docs-data failed schema validation:\n- ${errors.slice(0, 20).join('\n- ')}`);
  return result;
}

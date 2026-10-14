import { exists, findFiles, readJson, readText } from '../core/files.mjs';

/**
 * Stack adapter: reads package manifests, the Node version file and CI workflows.
 *
 * config.stack = {
 *   manifests: ["package.json", "apps/*\/package.json"],
 *   nodeVersionFile: ".nvmrc",
 *   workflows: ".github/workflows/*.yml",
 *   groups: [{ id, name, manifest, packages: [{ name, label? }] }]
 * }
 */
export const packageJsonAdapter = {
  id: 'package-json',
  extract({ root, config }) {
    const settings = config.stack ?? {};
    const manifests = findFiles(root, settings.manifests ?? ['package.json']).map((file) => {
      const json = readJson(root, file);
      const dependencies = { ...(json.dependencies ?? {}) };
      const devDependencies = { ...(json.devDependencies ?? {}) };
      return {
        file,
        name: json.name ?? file,
        scripts: Object.keys(json.scripts ?? {}).sort(),
        dependencies,
        devDependencies,
      };
    });
    const byFile = new Map(manifests.map((manifest) => [manifest.file, manifest]));

    const groups = (settings.groups ?? []).map((group) => {
      const manifest = byFile.get(group.manifest);
      const items = (group.packages ?? []).map((entry) => {
        const spec = typeof entry === 'string' ? { name: entry } : entry;
        const version =
          manifest?.dependencies[spec.name] ?? manifest?.devDependencies[spec.name] ?? null;
        return {
          name: spec.name,
          label: spec.label ?? spec.name,
          version: version ? version.replace(/^[\^~>=<\s]+/, '') : null,
          found: Boolean(version),
        };
      });
      return { id: group.id, name: group.name, manifest: group.manifest, items };
    });

    let node = null;
    if (settings.nodeVersionFile && exists(root, settings.nodeVersionFile)) {
      node = readText(root, settings.nodeVersionFile).trim();
    }

    const workflows = settings.workflows
      ? findFiles(root, settings.workflows).map((file) => ({
          file,
          jobs: workflowJobs(readText(root, file)),
        }))
      : [];

    return { stack: { node, groups, manifests, workflows } };
  },
};

/** Returns top-level job ids of a GitHub Actions workflow without a YAML dependency. */
export function workflowJobs(yaml) {
  const lines = yaml.split('\n');
  const start = lines.findIndex((line) => /^jobs:\s*$/.test(line));
  if (start < 0) return [];
  const jobs = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break;
    const match = line.match(/^ {2}([A-Za-z0-9_-]+):\s*$/);
    if (match) jobs.push(match[1]);
  }
  return jobs;
}

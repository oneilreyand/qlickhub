import { readText } from './files.mjs';

/** Normalizes a route path for matching: drops configured prefixes and unifies parameters. */
export function normalizePath(routePath, stripPrefixes = []) {
  let value = routePath;
  for (const prefix of stripPrefixes) {
    if (value === prefix) value = '/';
    else if (value.startsWith(`${prefix}/`)) value = value.slice(prefix.length);
  }
  return value.replace(/:[A-Za-z_]\w*/g, ':').replace(/\{[^}/]+\}/g, ':');
}

/** Normalizes free text so that documented paths can be compared with normalized routes. */
export function normalizeText(text, stripPrefixes = []) {
  let value = text;
  for (const prefix of stripPrefixes) value = value.split(`${prefix}/`).join('/');
  return value.replace(/:[A-Za-z_]\w*/g, ':').replace(/\{[^}/\s]+\}/g, ':');
}

/**
 * True when `normalizedPath` appears in `normalizedText` as a whole path (not as the prefix of a
 * longer path). The root path `/` never matches by itself.
 */
export function mentionsPath(normalizedText, normalizedPath) {
  if (normalizedPath === '/' || normalizedPath.length < 3) return false;
  let index = normalizedText.indexOf(normalizedPath);
  while (index >= 0) {
    const before = normalizedText[index - 1] ?? ' ';
    const after = normalizedText[index + normalizedPath.length] ?? ' ';
    const cleanBefore = !/[A-Za-z0-9_-]/.test(before);
    const cleanAfter = !/[A-Za-z0-9_/:-]/.test(after);
    if (cleanBefore && cleanAfter) return true;
    index = normalizedText.indexOf(normalizedPath, index + 1);
  }
  return false;
}

/** Adds `endpoints` and `contracts` references to every Feature from the text of its documents. */
export function linkFeatures(root, data, settings = {}) {
  const strip = settings.stripPrefixes ?? [];
  const endpoints = data.endpoints.map((endpoint) => ({
    key: endpoint.key,
    normalized: normalizePath(endpoint.path, strip),
  }));
  const contractNames = data.contracts.map((contract) => contract.name);
  for (const feature of data.features) {
    const text = feature.sourceFiles.map((file) => readText(root, file)).join('\n');
    const normalized = normalizeText(text, strip);
    feature.endpoints = endpoints
      .filter((endpoint) => mentionsPath(normalized, endpoint.normalized))
      .map((endpoint) => endpoint.key)
      .sort();
    feature.contracts = contractNames
      .filter((name) => new RegExp(`\\b${name}\\b`).test(text))
      .sort();
  }
  // A folder Feature whose README has no title of its own borrows the title of its TODO item.
  const todoTitles = new Map((data.todo ?? []).map((item) => [item.id, item.title]));
  for (const feature of data.features) {
    if (feature.title === feature.id && todoTitles.has(feature.id))
      feature.title = todoTitles.get(feature.id);
  }
  const documented = new Set(data.features.flatMap((feature) => feature.endpoints));
  for (const endpoint of data.endpoints) {
    endpoint.features = data.features
      .filter((feature) => feature.endpoints.includes(endpoint.key))
      .map((feature) => feature.id);
    endpoint.documented = documented.has(endpoint.key);
  }
}

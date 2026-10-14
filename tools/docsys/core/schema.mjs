import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA_VERSION = 1;
const schemaFile = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'schema',
  'docs-data.schema.json',
);

export function loadSchema() {
  return JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
}

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function matchesType(value, expected) {
  const actual = typeOf(value);
  return []
    .concat(expected)
    .some((type) => type === actual || (type === 'number' && actual === 'integer'));
}

/**
 * Validates a value against the subset of JSON Schema used by docs-data.schema.json
 * (type, required, properties, items, enum). Returns a list of error strings.
 */
export function validate(value, schema = loadSchema(), at = '$') {
  const errors = [];
  if (schema.type && !matchesType(value, schema.type)) {
    return [`${at}: expected ${[].concat(schema.type).join('|')}, got ${typeOf(value)}`];
  }
  if (schema.enum && !schema.enum.includes(value))
    errors.push(`${at}: ${JSON.stringify(value)} not in enum`);
  if (typeOf(value) === 'object') {
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${at}: missing required "${key}"`);
    }
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (key in value) errors.push(...validate(value[key], child, `${at}.${key}`));
    }
  }
  if (typeOf(value) === 'array' && schema.items) {
    value.forEach((item, index) => errors.push(...validate(item, schema.items, `${at}[${index}]`)));
  }
  return errors;
}

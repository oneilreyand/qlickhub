/**
 * Completeness rules. Each rule turns docs data into gaps:
 * { rule, key, file, message, fix }. `key` is stable so a gap can be stored in the baseline.
 * Rules are enabled per project with `config.completeness.rules` (default: all).
 */

const gap = (rule, key, file, message, fix) => ({ rule, key, file: file ?? null, message, fix });

export const RULES = [
  {
    id: 'DS-R01',
    title: 'Endpoint belum disebut di dokumen fitur',
    check(data) {
      return data.endpoints
        .filter((endpoint) => !endpoint.documented)
        .map((endpoint) =>
          gap(
            'DS-R01',
            `endpoint:${endpoint.key}`,
            `${endpoint.file}:${endpoint.line}`,
            `${endpoint.key} tidak disebut di dokumen fitur mana pun.`,
            'Sebut path endpoint (mis. di contracts.md fitur terkait) dalam PR yang sama.',
          ),
        );
    },
  },
  {
    id: 'DS-R02',
    title: 'Model belum dipetakan ke domain ERD',
    check(data, config) {
      const domains = config.erd?.domains ?? {};
      const mapped = new Set(Object.values(domains).flat());
      return data.erd.entities
        .filter((entity) => !mapped.has(entity.name))
        .map((entity) =>
          gap(
            'DS-R02',
            `model:${entity.name}`,
            entity.file,
            `${entity.name} belum masuk domain mana pun di docsys.config.json → erd.domains.`,
            `Tambahkan "${entity.name}" ke salah satu domain di erd.domains.`,
          ),
        );
    },
  },
  {
    id: 'DS-R03',
    title: 'Item TODO tanpa baris Layer',
    check(data, config) {
      const file = config.markdown?.todo?.file ?? 'TODO.md';
      return data.todo
        .filter((item) => !item.done && !item.layer?.valid)
        .map((item) =>
          gap(
            'DS-R03',
            `todo:${item.id}`,
            file,
            item.layer
              ? `${item.id} memakai nilai Layer yang tidak dikenal.`
              : `${item.id} belum punya baris Layer.`,
            'Tambahkan "Layer: PRD=…, BE=…, FE=…" dengan nilai Todo, In progress, Done, atau N/A.',
          ),
        );
    },
  },
  {
    id: 'DS-R04',
    title: 'Role belum punya alur di UX matrix',
    check(data, config) {
      const file = config.markdown?.uxMatrix?.file ?? null;
      const covered = new Set(data.uxMatrix.rows.map((row) => row.role));
      return data.uxMatrix.roles
        .filter((role) => !covered.has(role))
        .map((role) =>
          gap(
            'DS-R04',
            `ux-role:${role}`,
            file,
            `Role "${role}" belum punya baris alur di UX matrix.`,
            'Tambahkan minimal satu baris | Role | Alur | … | untuk role ini (nilai boleh "Belum dinilai").',
          ),
        );
    },
  },
  {
    id: 'DS-R05',
    title: 'Fitur belum ada di katalog',
    check(data, config) {
      const catalog = config.markdown?.features?.catalog ?? null;
      return data.features
        .filter((feature) => feature.catalogStatus == null)
        .map((feature) =>
          gap(
            'DS-R05',
            `catalog:${feature.id}`,
            catalog,
            `${feature.id} belum tercantum di katalog fitur.`,
            `Tambahkan baris yang menautkan ${feature.file} di katalog fitur.`,
          ),
        );
    },
  },
];

export function runRules(data, config) {
  const enabled = new Set(config.completeness?.rules ?? RULES.map((rule) => rule.id));
  return RULES.filter((rule) => enabled.has(rule.id))
    .flatMap((rule) => rule.check(data, config))
    .sort((a, b) => (a.rule + a.key < b.rule + b.key ? -1 : 1));
}

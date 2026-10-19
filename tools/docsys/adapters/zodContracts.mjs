import ts from 'typescript';
import { findFiles, readText, sortBy } from '../core/files.mjs';

function isExported(statement) {
  return statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
}

/** Walks a call chain (`z.object({...}).strict().refine(...)`) down to its root call. */
function rootCall(expression) {
  let node = expression;
  while (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
    const inner = node.expression.expression;
    if (ts.isCallExpression(inner)) node = inner;
    else break;
  }
  return node;
}

function objectKeys(literal) {
  if (!literal || !ts.isObjectLiteralExpression(literal)) return [];
  return literal.properties
    .map((property) =>
      property.name && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
        ? property.name.text
        : null,
    )
    .filter(Boolean);
}

export function describeSchema(initializer) {
  if (!ts.isCallExpression(initializer))
    return { kind: 'alias', fields: [], values: [], extends: null };
  const root = rootCall(initializer);
  if (!ts.isCallExpression(root) || !ts.isPropertyAccessExpression(root.expression)) {
    return { kind: 'other', fields: [], values: [], extends: null };
  }
  const owner = root.expression.expression.getText();
  const method = root.expression.name.text;
  if (owner === 'z' && method === 'object') {
    return { kind: 'object', fields: objectKeys(root.arguments[0]), values: [], extends: null };
  }
  if (owner === 'z' && method === 'enum') {
    const list = root.arguments[0];
    const values =
      list && ts.isArrayLiteralExpression(list)
        ? list.elements.filter(ts.isStringLiteral).map((element) => element.text)
        : [];
    return { kind: 'enum', fields: [], values, extends: null };
  }
  if (owner !== 'z' && (method === 'extend' || method === 'merge')) {
    return { kind: 'object', fields: objectKeys(root.arguments[0]), values: [], extends: owner };
  }
  return {
    kind: owner === 'z' ? method : 'other',
    fields: [],
    values: [],
    extends: owner === 'z' ? null : owner,
  };
}

/** config.contracts = { include: ["contracts/src/*.ts"], exclude: [...], suffix: "Schema" } */
export const zodContractsAdapter = {
  id: 'zod-contracts',
  extract({ root, config }) {
    const settings = config.contracts;
    if (!settings) return { contracts: [] };
    const suffix = settings.suffix ?? 'Schema';
    const contracts = [];
    for (const file of findFiles(root, settings.include, settings.exclude ?? [])) {
      const source = ts.createSourceFile(file, readText(root, file), ts.ScriptTarget.Latest, true);
      for (const statement of source.statements) {
        if (!ts.isVariableStatement(statement) || !isExported(statement)) continue;
        for (const declaration of statement.declarationList.declarations) {
          if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
          const name = declaration.name.text;
          if (!name.endsWith(suffix)) continue;
          const line = source.getLineAndCharacterOfPosition(declaration.getStart()).line + 1;
          contracts.push({ name, file, line, ...describeSchema(declaration.initializer) });
        }
      }
    }
    return { contracts: sortBy(contracts, 'file', 'name') };
  },
};

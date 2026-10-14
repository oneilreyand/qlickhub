import path from 'node:path';
import ts from 'typescript';
import { findFiles, readText, sortBy } from '../core/files.mjs';

const ASSOCIATIONS = new Set(['hasMany', 'belongsTo', 'hasOne', 'belongsToMany']);

function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

function propertyMap(literal) {
  const map = new Map();
  if (!literal || !ts.isObjectLiteralExpression(literal)) return map;
  for (const property of literal.properties) {
    if (!ts.isPropertyAssignment(property) || !property.name) continue;
    const key =
      ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
        ? property.name.text
        : null;
    if (key) map.set(key, property.initializer);
  }
  return map;
}

function literalValue(node) {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  return null;
}

function attribute(name, initializer) {
  if (!ts.isObjectLiteralExpression(initializer)) {
    return {
      name,
      column: name,
      type: initializer.getText().replace(/^DataTypes\./, ''),
      allowNull: null,
      primaryKey: false,
    };
  }
  const props = propertyMap(initializer);
  return {
    name,
    column: literalValue(props.get('field')) ?? name,
    type:
      props
        .get('type')
        ?.getText()
        .replace(/^DataTypes\./, '') ?? null,
    allowNull: literalValue(props.get('allowNull')),
    primaryKey: literalValue(props.get('primaryKey')) === true,
  };
}

/** `X.init({ attributes }, { tableName })` calls in one model file. */
export function modelsInFile(source, file) {
  const models = [];
  visit(source, (node) => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    if (node.expression.name.text !== 'init' || !ts.isIdentifier(node.expression.expression))
      return;
    const [attributes, options] = node.arguments;
    if (!attributes || !ts.isObjectLiteralExpression(attributes)) return;
    const optionMap = propertyMap(options);
    models.push({
      name: node.expression.expression.text,
      table: literalValue(optionMap.get('tableName')),
      file,
      attributes: [...propertyMap(attributes)].map(([key, value]) => attribute(key, value)),
    });
  });
  return models;
}

/** `A.hasMany(B, { as, foreignKey })` calls. */
export function associationsInFile(source, file) {
  const result = [];
  visit(source, (node) => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    const type = node.expression.name.text;
    if (!ASSOCIATIONS.has(type) || !ts.isIdentifier(node.expression.expression)) return;
    const target = node.arguments[0];
    if (!target || !ts.isIdentifier(target)) return;
    const options = propertyMap(node.arguments[1]);
    result.push({
      from: node.expression.expression.text,
      type,
      to: target.text,
      as: literalValue(options.get('as')),
      foreignKey:
        literalValue(options.get('foreignKey')) ?? options.get('foreignKey')?.getText() ?? null,
      through: literalValue(options.get('through')) ?? options.get('through')?.getText() ?? null,
      file,
      group: path.posix
        .basename(file)
        .replace(/Associations?\.ts$/, '')
        .replace(/\.ts$/, ''),
    });
  });
  return result;
}

/**
 * config.models = {
 *   include: ["apps/api/src/db/models/*.ts"], exclude: [...],
 *   associations: ["apps/api/src/db/models/associations/*.ts"]
 * }
 */
export const sequelizeModelsAdapter = {
  id: 'sequelize-models',
  extract({ root, config }) {
    const settings = config.models;
    if (!settings) return { erd: { entities: [], relations: [] } };
    const parse = (file) =>
      ts.createSourceFile(file, readText(root, file), ts.ScriptTarget.Latest, true);
    const entities = [];
    for (const file of findFiles(root, settings.include, settings.exclude ?? [])) {
      entities.push(...modelsInFile(parse(file), file));
    }
    const relations = [];
    for (const file of findFiles(root, settings.associations ?? [], settings.exclude ?? [])) {
      relations.push(...associationsInFile(parse(file), file));
    }
    const known = new Set(entities.map((entity) => entity.name));
    const warnings = relations
      .filter((relation) => !known.has(relation.from) || !known.has(relation.to))
      .map((relation) => ({
        adapter: 'sequelize-models',
        file: relation.file,
        reason: `unknown-model:${relation.from}->${relation.to}`,
      }));
    return {
      erd: {
        entities: sortBy(entities, 'name'),
        relations: sortBy(relations, 'from', 'type', 'to', 'as'),
      },
      warnings,
    };
  },
};

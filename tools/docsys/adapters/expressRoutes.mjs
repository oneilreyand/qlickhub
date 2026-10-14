import path from 'node:path';
import ts from 'typescript';
import { findFiles, readText, sortBy } from '../core/files.mjs';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'all']);

function parse(root, file) {
  return ts.createSourceFile(file, readText(root, file), ts.ScriptTarget.Latest, true);
}

function stringValues(node) {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
  if (ts.isArrayLiteralExpression(node)) {
    const values = node.elements.map((element) =>
      ts.isStringLiteral(element) || ts.isNoSubstitutionTemplateLiteral(element)
        ? element.text
        : null,
    );
    return values.every((value) => value !== null) ? values : null;
  }
  return null;
}

function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

export function joinPath(prefix, routePath) {
  const joined = `${prefix.replace(/\/$/, '')}/${routePath.replace(/^\//, '')}`;
  return joined.length > 1 ? joined.replace(/\/$/, '') : joined;
}

/** Names of variables created with `Router()` / `express.Router()` / `express()`. */
export function routerNames(sourceFile) {
  const names = new Set();
  visit(sourceFile, (node) => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer) return;
    if (!ts.isCallExpression(node.initializer)) return;
    const callee = node.initializer.expression.getText();
    if (/(^|\.)Router$/.test(callee) || callee === 'express') names.add(node.name.text);
  });
  return names;
}

/**
 * Maps a router created inside a factory function to the variable that stores the factory result:
 * `function createX() { const router = Router(); ... }` + `export const xRoutes = createX();`
 */
export function factoryAliases(sourceFile) {
  const functions = new Map();
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) {
      functions.set(statement.name.text, routerNames(statement.body));
    }
  }
  const aliases = new Map();
  visit(sourceFile, (node) => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer) return;
    if (!ts.isCallExpression(node.initializer) || !ts.isIdentifier(node.initializer.expression))
      return;
    for (const inner of functions.get(node.initializer.expression.text) ?? []) {
      aliases.set(inner, node.name.text);
    }
  });
  return aliases;
}

/** Route registrations `<router>.<method>(path, ...handlers)` in one file. */
export function routeCalls(sourceFile) {
  const calls = [];
  const warnings = [];
  const routers = routerNames(sourceFile);
  visit(sourceFile, (node) => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    const method = node.expression.name.text;
    if (!HTTP_METHODS.has(method)) return;
    const target = node.expression.expression;
    if (!ts.isIdentifier(target) || !routers.has(target.text)) return;
    const paths = stringValues(node.arguments[0]);
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    if (!paths) {
      // A dynamic path cannot be documented reliably; report it instead of guessing.
      if (node.arguments.length > 1)
        warnings.push({ file: sourceFile.fileName, line, reason: 'dynamic-path' });
      return;
    }
    const handlerArgs = node.arguments.slice(1);
    const last = handlerArgs[handlerArgs.length - 1];
    const handler = last && ts.isIdentifier(last) ? last.text : last ? 'inline' : null;
    const middleware = handlerArgs
      .slice(0, -1)
      .map((arg) => arg.getText(sourceFile).replace(/\s+/g, ' ').slice(0, 120));
    for (const routePath of paths) {
      calls.push({
        router: target.text,
        method: method.toUpperCase(),
        path: routePath,
        handler,
        middleware,
        line,
      });
    }
  });
  return { calls, warnings };
}

/** `app.use('/prefix', identifier)` mounts plus the import source of each identifier. */
export function mounts(sourceFile, appFile) {
  const imports = new Map();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) continue;
    const specifier = statement.moduleSpecifier.text;
    if (!specifier.startsWith('.')) continue;
    const resolved = path.posix
      .normalize(path.posix.join(path.posix.dirname(appFile), specifier))
      .replace(/\.js$/, '.ts');
    const bindings = statement.importClause.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) imports.set(element.name.text, resolved);
    }
    if (statement.importClause.name) imports.set(statement.importClause.name.text, resolved);
  }
  const result = [];
  visit(sourceFile, (node) => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    if (node.expression.name.text !== 'use') return;
    const prefixes = stringValues(node.arguments[0]);
    if (!prefixes) return;
    for (const argument of node.arguments.slice(1)) {
      if (!ts.isIdentifier(argument) || !imports.has(argument.text)) continue;
      for (const prefix of prefixes) {
        result.push({ prefix, router: argument.text, file: imports.get(argument.text) });
      }
    }
  });
  return result;
}

/**
 * config.routes = { app: "src/app.ts", include: [...globs], exclude: [...globs], appRouter: "app" }
 */
export const expressRoutesAdapter = {
  id: 'express-routes',
  extract({ root, config }) {
    const settings = config.routes;
    if (!settings) return { endpoints: [] };
    const appSource = parse(root, settings.app);
    const mountList = mounts(appSource, settings.app);
    const endpoints = [];
    const warnings = [];

    const appCalls = routeCalls(appSource);
    warnings.push(...appCalls.warnings);
    for (const call of appCalls.calls.filter((c) => c.router === (settings.appRouter ?? 'app'))) {
      endpoints.push(toEndpoint(call, call.path, settings.app, 'app'));
    }

    for (const file of findFiles(root, settings.include, settings.exclude ?? [])) {
      if (file === settings.app) continue;
      const source = parse(root, file);
      const aliases = factoryAliases(source);
      const { calls, warnings: fileWarnings } = routeCalls(source);
      warnings.push(...fileWarnings);
      const fileMounts = mountList.filter((mount) => mount.file === file);
      for (const call of calls) {
        const router = aliases.get(call.router) ?? call.router;
        const routerMounts = fileMounts.filter((mount) => mount.router === router);
        if (routerMounts.length === 0) {
          warnings.push({ file, line: call.line, reason: `router-not-mounted:${call.router}` });
          continue;
        }
        for (const mount of routerMounts) {
          endpoints.push(toEndpoint(call, joinPath(mount.prefix, call.path), file, moduleOf(file)));
        }
      }
    }
    return {
      endpoints: sortBy(endpoints, 'path', 'method'),
      warnings: warnings.map((w) => ({ adapter: 'express-routes', ...w })),
    };
  },
};

function moduleOf(file) {
  const match = file.match(/modules\/([^/]+)\//);
  return match ? match[1] : path.posix.basename(path.posix.dirname(file));
}

function toEndpoint(call, fullPath, file, module) {
  return {
    key: `${call.method} ${fullPath}`,
    method: call.method,
    path: fullPath,
    module,
    file,
    line: call.line,
    handler: call.handler,
    middleware: call.middleware,
  };
}

#!/usr/bin/env node
/* global process, console, URL */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extract } from './core/extract.mjs';
import { RULES } from './core/rules.mjs';
import {
  emptyBaseline,
  evaluate,
  initialBaseline,
  shrinkBaseline,
  summarize,
} from './core/completeness.mjs';

// docsys CLI
//   node tools/docsys/cli.mjs extract [--root <dir>] [--config <file>]
//   node tools/docsys/cli.mjs portal  [--root <dir>] [--port 4310] [--build]
//   node tools/docsys/cli.mjs completeness [--root <dir>]        (DOCSYS_MODE=report: never blocks)
//   node tools/docsys/cli.mjs baseline --init | --shrink [--root <dir>]

const toolRoot = path.dirname(fileURLToPath(import.meta.url));
const portalSource = path.join(toolRoot, 'portal');

function options(argv) {
  const result = {
    root: process.cwd(),
    config: 'docsys.config.json',
    port: 4310,
    build: false,
    init: false,
    shrink: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--root') result.root = path.resolve(argv[++index]);
    else if (arg === '--config') result.config = argv[++index];
    else if (arg === '--port') result.port = Number(argv[++index]);
    else if (arg === '--build') result.build = true;
    else if (arg === '--init') result.init = true;
    else if (arg === '--shrink') result.shrink = true;
  }
  return result;
}

function loadConfig(root, file) {
  const absolute = path.resolve(root, file);
  if (!fs.existsSync(absolute)) throw new Error(`Config not found: ${file}`);
  return JSON.parse(fs.readFileSync(absolute, 'utf8'));
}

function outputDir(root, config) {
  return path.resolve(root, config.output ?? '.docsys');
}

function runExtract(opts) {
  const config = loadConfig(opts.root, opts.config);
  const started = Date.now();
  const data = extract({ root: opts.root, config });
  // The portal shows documentation gaps, so the latest completeness result travels with the data.
  const result = evaluate(data, config, readBaseline(baselinePath(opts.root, config)));
  const added = new Set(result.added.map((item) => `${item.rule} ${item.key}`));
  data.completeness = {
    rules: RULES.map((rule) => ({ id: rule.id, title: rule.title })),
    summary: summarize(result),
    gaps: result.gaps.map((item) => ({
      ...item,
      status: added.has(`${item.rule} ${item.key}`) ? 'new' : 'known',
    })),
  };
  const directory = outputDir(opts.root, config);
  fs.mkdirSync(directory, { recursive: true });
  const target = path.join(directory, 'docs-data.json');
  fs.writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`);
  const summary = [
    `${data.features.length} fitur`,
    `${data.endpoints.length} endpoint`,
    `${data.contracts.length} schema`,
    `${data.erd.entities.length} model`,
    `${data.policies.length} policy`,
    `${data.adrs.length} ADR`,
    `${data.todo.length} TODO`,
  ].join(', ');
  console.log(
    `docsys: ${path.relative(opts.root, target)} ditulis (${summary}) dalam ${Date.now() - started} ms.`,
  );
  if (data.warnings.length) {
    console.log(`docsys: ${data.warnings.length} peringatan adapter:`);
    for (const warning of data.warnings.slice(0, 20)) {
      console.log(
        `  - [${warning.adapter}] ${warning.file ?? ''}${warning.line ? `:${warning.line}` : ''} ${warning.reason}`,
      );
    }
  }
}

function baselinePath(root, config) {
  return path.resolve(root, config.completeness?.baseline ?? 'quality/doc-baseline.json');
}

function readBaseline(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : emptyBaseline();
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function printGaps(title, gaps, limit = 50) {
  if (!gaps.length) return;
  console.log(title);
  for (const item of gaps.slice(0, limit)) {
    console.log(`  ✗ [${item.rule}] ${item.message}`);
    if (item.file) console.log(`      file: ${item.file}`);
    console.log(`      perbaikan: ${item.fix}`);
  }
  if (gaps.length > limit)
    console.log(`  … dan ${gaps.length - limit} lainnya (lihat report.json).`);
}

function runCompleteness(opts) {
  const config = loadConfig(opts.root, opts.config);
  const data = extract({ root: opts.root, config });
  const file = baselinePath(opts.root, config);
  const result = evaluate(data, config, readBaseline(file));
  const summary = summarize(result);
  const reportMode = process.env.DOCSYS_MODE === 'report';
  const policy = config.completeness?.policyLabel ?? '';
  const exception = config.completeness?.exceptionHint ?? '';
  writeJson(path.join(outputDir(opts.root, config), 'report.json'), {
    meta: { commit: data.meta.commit, generatedAt: data.meta.generatedAt, reportMode },
    summary,
    added: result.added,
    known: result.known,
    resolved: result.resolved,
  });
  const rules = Object.entries(summary.byRule)
    .map(([rule, count]) => `${rule}=${count}`)
    .join(', ');
  console.log(
    `docsys completeness: ${summary.total} gap (${rules || 'tidak ada'}); ${summary.known} sudah di baseline, ${summary.added} baru, ${summary.resolved} sudah beres.`,
  );
  printGaps(`Gap BARU (tidak ada di baseline${policy ? `, ${policy}` : ''}):`, result.added);
  if (summary.resolved) {
    console.log(
      `docsys: ${summary.resolved} entri baseline sudah beres — jalankan \`npm run docs:baseline -- --shrink\`.`,
    );
  }
  if (summary.added && !reportMode) {
    console.error(`docsys: gagal — lengkapi dokumen di atas.${exception ? ` ${exception}` : ''}`);
    process.exitCode = 1;
  } else if (summary.added) {
    console.log('docsys: DOCSYS_MODE=report — gap baru tidak memblokir. Catat alasannya di PR.');
  }
}

function runBaseline(opts) {
  const config = loadConfig(opts.root, opts.config);
  const file = baselinePath(opts.root, config);
  const relative = path.relative(opts.root, file);
  if (opts.init === opts.shrink) throw new Error('Pakai tepat satu: --init atau --shrink.');
  const data = extract({ root: opts.root, config });
  const result = evaluate(data, config, readBaseline(file));
  if (opts.init) {
    if (fs.existsSync(file))
      throw new Error(`${relative} sudah ada; --init hanya untuk baseline pertama.`);
    writeJson(file, initialBaseline(result.gaps));
    console.log(`docsys: ${relative} dibuat dengan ${result.gaps.length} gap.`);
    return;
  }
  const before = readBaseline(file);
  const after = shrinkBaseline(before, result.gaps);
  writeJson(file, after);
  console.log(`docsys: ${relative} ${before.gaps.length} → ${after.gaps.length} entri.`);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function buildPortal(opts) {
  const config = loadConfig(opts.root, opts.config);
  const directory = outputDir(opts.root, config);
  const target = path.join(directory, 'portal');
  fs.mkdirSync(target, { recursive: true });
  for (const file of fs.readdirSync(portalSource))
    fs.copyFileSync(path.join(portalSource, file), path.join(target, file));
  const dataFile = path.join(directory, 'docs-data.json');
  // file:// pages cannot fetch(); the static build embeds the data as a script instead.
  const embedded = fs.existsSync(dataFile) ? fs.readFileSync(dataFile, 'utf8') : 'null';
  fs.writeFileSync(path.join(target, 'data.js'), `window.__DOCS_DATA__ = ${embedded.trim()};\n`);
  console.log(`docsys: portal statis ditulis ke ${path.relative(opts.root, target)}/index.html`);
}

function servePortal(opts) {
  const config = loadConfig(opts.root, opts.config);
  const dataFile = path.join(outputDir(opts.root, config), 'docs-data.json');
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    let file;
    if (url.pathname === '/docs-data.json') file = dataFile;
    else if (url.pathname === '/data.js') {
      response.writeHead(200, { 'content-type': TYPES['.js'] });
      response.end('window.__DOCS_DATA__ = undefined;\n');
      return;
    } else {
      const name = url.pathname === '/' ? 'index.html' : path.basename(url.pathname);
      file = path.join(portalSource, name);
    }
    if (!fs.existsSync(file)) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    response.writeHead(200, {
      'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    fs.createReadStream(file).pipe(response);
  });
  server.listen(opts.port, '127.0.0.1', () => {
    console.log(`docsys: portal berjalan di http://localhost:${opts.port} (Ctrl+C untuk berhenti)`);
    if (!fs.existsSync(dataFile))
      console.log('docsys: data belum ada — jalankan `npm run docs:extract` lalu muat ulang.');
  });
}

const [command, ...rest] = process.argv.slice(2);
try {
  const opts = options(rest);
  if (command === 'extract') runExtract(opts);
  else if (command === 'portal') (opts.build ? buildPortal : servePortal)(opts);
  else if (command === 'completeness') runCompleteness(opts);
  else if (command === 'baseline') runBaseline(opts);
  else
    throw new Error(
      'Usage: node tools/docsys/cli.mjs <extract|portal|completeness|baseline> [--root dir] [--config file] [--port n] [--build] [--init|--shrink]',
    );
} catch (error) {
  console.error(`docsys: ${error.message}`);
  process.exitCode = 1;
}

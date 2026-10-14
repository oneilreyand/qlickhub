#!/usr/bin/env node
/* global process, console, URL */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extract } from './core/extract.mjs';

// docsys CLI (DOC-PORTAL, ADR-033)
//   node tools/docsys/cli.mjs extract [--root <dir>] [--config <file>]
//   node tools/docsys/cli.mjs portal  [--root <dir>] [--port 4310] [--build]

const toolRoot = path.dirname(fileURLToPath(import.meta.url));
const portalSource = path.join(toolRoot, 'portal');

function options(argv) {
  const result = { root: process.cwd(), config: 'docsys.config.json', port: 4310, build: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--root') result.root = path.resolve(argv[++index]);
    else if (arg === '--config') result.config = argv[++index];
    else if (arg === '--port') result.port = Number(argv[++index]);
    else if (arg === '--build') result.build = true;
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
  else
    throw new Error(
      'Usage: node tools/docsys/cli.mjs <extract|portal> [--root dir] [--config file] [--port n] [--build]',
    );
} catch (error) {
  console.error(`docsys: ${error.message}`);
  process.exitCode = 1;
}

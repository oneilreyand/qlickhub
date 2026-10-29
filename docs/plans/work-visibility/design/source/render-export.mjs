// Render satu artboard canvas (.dc.html) menjadi PNG untuk ekspor desain (DOC-007).
// Pakai: node render-export.mjs <artboard.dc.html> <out.png> <lebar> <tinggi>
// Lalu konversi ke WebP (mis. `cwebp -q 80 out.png -o out.webp`) sebelum commit.
// Ini renderer sederhana untuk {{hole}}, <sc-for>, dan <sc-if>; runtime canvas tetap acuan visual.
import { chromium } from 'playwright';
import fs from 'node:fs';
const src = process.argv[2], out = process.argv[3], width = +process.argv[4], height = +process.argv[5];
const html = fs.readFileSync(src, 'utf8');
const xdc = html.match(/<x-dc>([\s\S]*)<\/x-dc>/)[1];
const helmet = (xdc.match(/<helmet>([\s\S]*?)<\/helmet>/)||['',''])[1];
const body = xdc.replace(/<helmet>[\s\S]*?<\/helmet>/, '').replace(/<sc-(for|if)\b/g, '<template data-sc="$1"').replace(/<\/sc-(for|if)>/g, '</template>');
const script = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width, height } });
  await p.setContent(`<!doctype html><html lang="id"><head><meta charset="utf-8">${helmet}</head><body><template id="t">${body}</template><div id="root"></div></body></html>`, { waitUntil: 'networkidle' }).catch(()=>{});
  await p.evaluate((script) => {
    class DCLogic { constructor(){ this.props = {}; this.state = {}; } setState(){} }
    const Component = new Function('DCLogic', script + '; return Component;')(DCLogic);
    const vals = new Component().renderVals();
    const get = (scope, key) => { key = key.trim(); if (key === 'true') return true; if (key === 'false') return false;
      return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope); };
    const interp = (s, scope) => s.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, k) => { const v = get(scope, k); return v == null ? '' : v; });
    const expand = (node, scope) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === 3) { child.textContent = interp(child.textContent, scope); continue; }
        if (child.nodeType !== 1) continue;
        const tag = child.tagName.toLowerCase() === 'template' && child.dataset.sc ? 'sc-' + child.dataset.sc : child.tagName.toLowerCase();
        const inner = () => child.content.cloneNode(true);
        if (tag === 'sc-for') {
          const list = get(scope, child.getAttribute('list').replace(/[{}]/g, '')) || []; const as = child.getAttribute('as');
          const frag = document.createDocumentFragment();
          list.forEach((item, i) => { const c = inner();
            expand(c, { ...scope, [as]: item, $index: i }); frag.appendChild(c); });
          child.replaceWith(frag); continue;
        }
        if (tag === 'sc-if') {
          const v = get(scope, child.getAttribute('value').replace(/[{}]/g, ''));
          if (!v) { child.remove(); continue; }
          const c = inner(); expand(c, scope); child.replaceWith(c); continue;
        }
        for (const a of [...child.attributes]) if (a.value.includes('{{')) child.setAttribute(a.name, interp(a.value, scope));
        expand(child, scope);
      }
    };
    const root = document.getElementById('root'); root.appendChild(document.getElementById('t').content.cloneNode(true)); expand(root, vals);
  }, script);
  await p.waitForTimeout(800);
  await p.screenshot({ path: out, fullPage: true }); await b.close();
})();

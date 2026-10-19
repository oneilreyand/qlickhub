/* global window, document, location, fetch */
/* docsys portal — renders docs-data.json (schemaVersion 1). No framework, no network beyond the data file. */
(function () {
  'use strict';

  var SCHEMA_VERSION = 1;
  var main = document.getElementById('main');
  var data = null;

  var PAGES = [
    { id: 'home', label: 'Beranda & Stack', ready: true },
    { id: 'fitur', label: 'Fitur & Kontrak API', ready: true },
    { id: 'erd', label: 'ERD', ready: true },
    { id: 'governance', label: 'Governance', ready: true },
    { id: 'todo', label: 'TODO aktif', ready: true },
    { id: 'ux', label: 'UI/UX Matrix', ready: true },
  ];

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function route() {
    var parts = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
    return {
      page: parts[0] || 'home',
      a: decodeURIComponent(parts[1] || ''),
      b: decodeURIComponent(parts[2] || ''),
    };
  }

  function statusChip(status) {
    var s = String(status || '—');
    var cls = /^(Active|Accepted|Disetujui|Selesai|Done)/i.test(s)
      ? 'ok'
      : /(Blocked|Superseded)/i.test(s)
        ? 'bad'
        : /(Draft|Proposed|Menunggu|pending|ongoing|progress)/i.test(s)
          ? 'warn'
          : /development|test/i.test(s)
            ? 'info'
            : '';
    return '<span class="chip ' + cls + '">' + esc(s) + '</span>';
  }

  function renderNav(current) {
    var links = PAGES.map(function (page) {
      if (!page.ready) {
        return (
          '<span aria-disabled="true" title="Dibangun di Phase 3">' +
          esc(page.label) +
          ' <small>Phase 3</small></span>'
        );
      }
      var href = page.id === 'home' ? '#/' : '#/' + page.id;
      var cur = page.id === current ? ' aria-current="page"' : '';
      var gaps = data && PAGE_RULES[page.id] ? gapsFor(PAGE_RULES[page.id]).length : 0;
      var badge = gaps
        ? ' <small class="badge" aria-label="' + gaps + ' gap dokumen">' + gaps + '</small>'
        : '';
      return '<a href="' + href + '"' + cur + '>' + esc(page.label) + badge + '</a>';
    }).join('');
    document.getElementById('nav-links').innerHTML = links;
    if (data) {
      var meta = data.meta;
      document.getElementById('project-name').textContent = meta.project.name;
      document.querySelector('.brand-mark').textContent = (meta.project.name || 'D')
        .charAt(0)
        .toUpperCase();
      document.title = meta.project.name + ' — Dev Portal';
      document.getElementById('nav-meta').innerHTML =
        '<div>Commit <span class="mono">' +
        esc((meta.commit || 'tanpa git').slice(0, 7)) +
        '</span></div>' +
        '<div>Dibuat ' +
        esc(new Date(meta.generatedAt).toLocaleString('id-ID')) +
        '</div>';
    }
  }

  function stateView(title, body, command) {
    return (
      '<section class="state card" role="status"><h1>' +
      esc(title) +
      '</h1><p>' +
      esc(body) +
      '</p>' +
      (command ? '<pre class="code">' + esc(command) + '</pre>' : '') +
      '</section>'
    );
  }

  /* ---------- Beranda & Stack ---------- */
  function homePage() {
    var documented = data.endpoints.filter(function (e) {
      return e.documented;
    }).length;
    var stats = [
      [data.features.length, 'Feature'],
      [data.endpoints.length, 'Endpoint (' + documented + ' tercatat di dokumen fitur)'],
      [data.contracts.length, 'Schema kontrak'],
      [data.erd.entities.length, 'Model data'],
      [data.adrs.length, 'ADR'],
      [data.policies.length, 'Policy'],
      [data.todo.length, 'TODO terbuka'],
    ];
    var groups = data.stack.groups
      .map(function (group) {
        var rows = group.items
          .map(function (item) {
            return (
              '<div class="kv"><span>' +
              esc(item.label) +
              '</span><span>' +
              esc(item.version || 'tidak ditemukan') +
              '</span></div>'
            );
          })
          .join('');
        return (
          '<div class="card stack-card"><div><div class="mono muted" style="font-size:12px">' +
          esc(group.manifest) +
          '</div><h3>' +
          esc(group.name) +
          '</h3></div>' +
          rows +
          '</div>'
        );
      })
      .join('');
    var infra =
      '<div class="card stack-card"><div><div class="mono muted" style="font-size:12px">.nvmrc · .github/workflows</div><h3>Runtime & CI</h3></div>' +
      '<div class="kv"><span>Node.js</span><span>' +
      esc(data.stack.node || '—') +
      '</span></div>' +
      data.stack.workflows
        .map(function (w) {
          return (
            '<div class="kv"><span>' +
            esc(w.file.split('/').pop()) +
            '</span><span>' +
            esc(w.jobs.join(', ') || '—') +
            '</span></div>'
          );
        })
        .join('') +
      '</div>';
    var warnings = data.warnings.length
      ? '<section class="section"><h2>Peringatan extractor</h2><div class="table-box"><table><thead><tr><th>Adapter</th><th>File</th><th>Alasan</th></tr></thead><tbody>' +
        data.warnings
          .map(function (w) {
            return (
              '<tr><td class="mono">' +
              esc(w.adapter) +
              '</td><td class="mono">' +
              esc((w.file || '') + (w.line ? ':' + w.line : '')) +
              '</td><td>' +
              esc(w.reason) +
              '</td></tr>'
            );
          })
          .join('') +
        '</tbody></table></div></section>'
      : '';
    return (
      '<header class="page-head"><div class="lead"><span class="eyebrow">' +
      esc(data.meta.project.tagline || 'Dev Portal') +
      '</span>' +
      '<h1>' +
      esc(data.meta.project.name) +
      ' Dev Portal</h1>' +
      '<p class="muted">Dibangkitkan otomatis dari repo. Jalankan <span class="mono">npm run docs:extract</span> untuk memperbarui.</p></div></header>' +
      '<section class="stats" aria-label="Ringkasan">' +
      stats
        .map(function (s) {
          return (
            '<div class="card stat"><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div>'
          );
        })
        .join('') +
      '</section>' +
      searchSection() +
      completenessSection() +
      '<section class="section"><div class="section-head"><h2>Stack yang digunakan</h2><span class="muted" style="font-size:13px">Versi dari package.json</span></div>' +
      '<div class="grid">' +
      groups +
      infra +
      '</div></section>' +
      warnings
    );
  }

  /* ---------- Fitur & Kontrak API ---------- */
  function endpointTable(endpoints) {
    if (!endpoints.length) return '<p class="muted">Tidak ada endpoint.</p>';
    return (
      '<div class="table-box"><table><thead><tr><th>Method</th><th>Path</th><th>Handler</th><th>Sumber</th><th>Fitur</th></tr></thead><tbody>' +
      endpoints
        .map(function (e) {
          return (
            '<tr><td><span class="method m-' +
            esc(e.method) +
            '">' +
            esc(e.method) +
            '</span></td>' +
            '<td class="mono nowrap">' +
            esc(e.path) +
            '</td><td class="mono">' +
            esc(e.handler || '—') +
            '</td>' +
            '<td class="mono nowrap">' +
            esc(e.file.split('/').pop() + ':' + e.line) +
            '</td>' +
            '<td>' +
            (e.features.length
              ? e.features
                  .map(function (f) {
                    return '<a href="#/fitur/' + encodeURIComponent(f) + '">' + esc(f) + '</a>';
                  })
                  .join(', ')
              : '<span class="chip warn">Belum tercatat</span>') +
            '</td></tr>'
          );
        })
        .join('') +
      '</tbody></table></div>'
    );
  }

  function contractTable(contracts) {
    if (!contracts.length) return '<p class="muted">Tidak ada schema.</p>';
    return (
      '<div class="table-box"><table><thead><tr><th>Schema</th><th>Jenis</th><th>Field / nilai</th><th>File</th></tr></thead><tbody>' +
      contracts
        .map(function (c) {
          var detail = c.kind === 'enum' ? c.values.join(' | ') : c.fields.join(', ');
          if (c.extends) detail = 'extends ' + c.extends + (detail ? ' + ' + detail : '');
          return (
            '<tr><td class="mono">' +
            esc(c.name) +
            '</td><td>' +
            esc(c.kind) +
            '</td><td class="mono">' +
            esc(detail || '—') +
            '</td>' +
            '<td class="mono nowrap">' +
            esc(c.file.split('/').pop() + ':' + c.line) +
            '</td></tr>'
          );
        })
        .join('') +
      '</tbody></table></div>'
    );
  }

  function featureList(selected) {
    var byArea = {};
    data.features.forEach(function (f) {
      var area = f.area || (f.kind === 'folder' ? 'Feature folder (SDLC)' : 'Belum di katalog');
      (byArea[area] = byArea[area] || []).push(f);
    });
    return Object.keys(byArea)
      .sort()
      .map(function (area) {
        return (
          '<div class="list-group">' +
          esc(area) +
          '</div>' +
          byArea[area]
            .map(function (f) {
              var cur = f.id === selected ? ' aria-current="true"' : '';
              return (
                '<a href="#/fitur/' +
                encodeURIComponent(f.id) +
                '"' +
                cur +
                ' data-search="' +
                esc((f.title + ' ' + f.id + ' ' + area).toLowerCase()) +
                '">' +
                '<span>' +
                esc(f.title || f.id) +
                '</span><small>' +
                esc(f.catalogStatus || f.status || '—') +
                ' · ' +
                f.endpoints.length +
                ' endpoint</small></a>'
              );
            })
            .join('')
        );
      })
      .join('');
  }

  function featureDetail(feature, tab) {
    if (!feature) return '<div class="card detail"><p class="muted">Pilih fitur di kiri.</p></div>';
    var base = '#/fitur/' + encodeURIComponent(feature.id) + '/';
    var tabs = [
      ['ringkasan', 'Ringkasan'],
      ['endpoint', 'Endpoint (' + feature.endpoints.length + ')'],
      ['kontrak', 'Kontrak (' + feature.contracts.length + ')'],
    ];
    if (feature.stages.length) tabs.push(['tahap', 'Stage Tracker']);
    var current = tabs.some(function (t) {
      return t[0] === tab;
    })
      ? tab
      : 'ringkasan';
    var body;
    if (current === 'ringkasan') {
      body =
        '<dl style="display:grid;grid-template-columns:max-content 1fr;gap:8px 16px;margin:0">' +
        [
          ['Tujuan', feature.purpose],
          ['Pembaca utama', feature.readers],
          ['Owner', feature.owner],
          ['Policy', feature.policies.join(', ')],
          ['Sumber', feature.file],
        ]
          .map(function (row) {
            return (
              '<dt class="muted">' +
              esc(row[0]) +
              '</dt><dd style="margin:0" class="' +
              (row[0] === 'Sumber' ? 'mono' : '') +
              '">' +
              esc(row[1] || '—') +
              '</dd>'
            );
          })
          .join('') +
        '</dl>';
    } else if (current === 'endpoint') {
      var keys = {};
      feature.endpoints.forEach(function (k) {
        keys[k] = true;
      });
      body = endpointTable(
        data.endpoints.filter(function (e) {
          return keys[e.key];
        }),
      );
    } else if (current === 'kontrak') {
      var names = {};
      feature.contracts.forEach(function (n) {
        names[n] = true;
      });
      body = contractTable(
        data.contracts.filter(function (c) {
          return names[c.name];
        }),
      );
    } else {
      body =
        '<div class="table-box"><table><thead><tr><th>Tahap</th><th>Dokumen</th><th>Status</th><th>Gerbang</th><th>Disetujui</th></tr></thead><tbody>' +
        feature.stages
          .map(function (s) {
            return (
              '<tr><td>' +
              esc(s.stage) +
              '</td><td class="mono">' +
              esc(s.documents) +
              '</td><td>' +
              statusChip(s.status) +
              '</td><td>' +
              esc(s.gate || '—') +
              '</td><td class="muted">' +
              esc(s.approvedBy || '—') +
              '</td></tr>'
            );
          })
          .join('') +
        '</tbody></table></div>';
    }
    return (
      '<section class="card detail" aria-label="Detail fitur"><div class="chips"><span class="chip mono">' +
      esc(feature.id) +
      '</span>' +
      statusChip(feature.catalogStatus || feature.status) +
      (feature.area
        ? '<span class="muted" style="font-size:13px">' + esc(feature.area) + '</span>'
        : '') +
      '</div>' +
      '<h2 style="font-size:24px">' +
      esc(feature.title || feature.id) +
      '</h2>' +
      '<nav class="tabs" aria-label="Bagian fitur">' +
      tabs
        .map(function (t) {
          return (
            '<a href="' +
            base +
            t[0] +
            '"' +
            (t[0] === current ? ' aria-current="page"' : '') +
            '>' +
            esc(t[1]) +
            '</a>'
          );
        })
        .join('') +
      '</nav>' +
      body +
      '</section>'
    );
  }

  function fiturPage(r) {
    var view = ['_endpoint', '_kontrak', '_gap'].indexOf(r.a) >= 0 ? r.a : 'fitur';
    var tabs =
      '<nav class="tabs" aria-label="Tampilan">' +
      [
        ['fitur', 'Per fitur', '#/fitur'],
        ['_endpoint', 'Semua endpoint (' + data.endpoints.length + ')', '#/fitur/_endpoint'],
        ['_kontrak', 'Semua kontrak (' + data.contracts.length + ')', '#/fitur/_kontrak'],
        ['_gap', 'Gap dokumen (' + gapsFor(PAGE_RULES.fitur).length + ')', '#/fitur/_gap'],
      ]
        .map(function (t) {
          return (
            '<a href="' +
            t[2] +
            '"' +
            (t[0] === view ? ' aria-current="page"' : '') +
            '>' +
            esc(t[1]) +
            '</a>'
          );
        })
        .join('') +
      '</nav>';
    var head =
      '<header class="page-head"><div class="lead"><h1>Fitur & Kontrak API</h1>' +
      '<p class="muted">Dari dokumen fitur, route Express, dan schema Zod.</p></div></header>' +
      tabs;
    if (view === '_endpoint') {
      return (
        head +
        '<label class="field">Cari endpoint<input type="search" data-filter="rows" placeholder="Path, method, modul"></label>' +
        endpointTable(data.endpoints)
      );
    }
    if (view === '_gap') return head + gapTable(gapsFor(PAGE_RULES.fitur));
    if (view === '_kontrak') {
      return (
        head +
        '<label class="field">Cari schema<input type="search" data-filter="rows" placeholder="Nama schema atau field"></label>' +
        contractTable(data.contracts)
      );
    }
    var selectedId = r.a || (data.features[0] && data.features[0].id);
    var feature = data.features.filter(function (f) {
      return f.id === selectedId;
    })[0];
    return (
      head +
      '<div class="split"><section class="card list" aria-label="Daftar fitur">' +
      '<label class="field">Filter fitur<input type="search" data-filter="list" placeholder="Nama fitur atau area"></label>' +
      featureList(selectedId) +
      '</section>' +
      featureDetail(feature, r.b) +
      '</div>'
    );
  }

  /* ---------- Gaps (completeness) ---------- */
  var PAGE_RULES = {
    fitur: ['DS-R01', 'DS-R05'],
    erd: ['DS-R02'],
    todo: ['DS-R03'],
    ux: ['DS-R04'],
  };

  function gapsFor(rules) {
    var all = (data.completeness && data.completeness.gaps) || [];
    return all.filter(function (g) {
      return rules.indexOf(g.rule) >= 0;
    });
  }

  function ruleTitle(id) {
    var rules = (data.completeness && data.completeness.rules) || [];
    var found = rules.filter(function (r) {
      return r.id === id;
    })[0];
    return found ? found.title : id;
  }

  function gapTable(gaps) {
    if (!data.completeness) {
      return '<p class="muted">Laporan kelengkapan belum ada. Jalankan <span class="mono">npm run docs:extract</span>.</p>';
    }
    if (!gaps.length) return '<p class="chip ok">Tidak ada gap untuk bagian ini.</p>';
    return (
      '<div class="table-box"><table><thead><tr><th>Rule</th><th>Gap</th><th>File</th><th>Status</th><th>Perbaikan</th></tr></thead><tbody>' +
      gaps
        .map(function (g) {
          return (
            '<tr><td class="mono nowrap" title="' +
            esc(ruleTitle(g.rule)) +
            '">' +
            esc(g.rule) +
            '</td>' +
            '<td>' +
            esc(g.message) +
            '</td><td class="mono">' +
            esc(g.file || '—') +
            '</td>' +
            '<td>' +
            (g.status === 'new'
              ? '<span class="chip bad">Baru</span>'
              : '<span class="chip warn">Baseline</span>') +
            '</td>' +
            '<td class="muted">' +
            esc(g.fix) +
            '</td></tr>'
          );
        })
        .join('') +
      '</tbody></table></div>'
    );
  }

  function completenessSection() {
    if (!data.completeness) return '';
    var s = data.completeness.summary;
    var rows = data.completeness.rules
      .map(function (rule) {
        var count = s.byRule[rule.id] || 0;
        return (
          '<tr><td class="mono">' +
          esc(rule.id) +
          '</td><td>' +
          esc(rule.title) +
          '</td>' +
          '<td>' +
          (count
            ? '<span class="chip warn">' + count + '</span>'
            : '<span class="chip ok">0</span>') +
          '</td></tr>'
        );
      })
      .join('');
    return (
      '<section class="section"><div class="section-head"><h2>Kelengkapan dokumen</h2>' +
      '<span class="muted" style="font-size:13px">' +
      s.total +
      ' gap · ' +
      s.known +
      ' di baseline · ' +
      s.added +
      ' baru · ' +
      s.resolved +
      ' sudah beres</span></div>' +
      '<div class="table-box"><table><thead><tr><th>Rule</th><th>Pemeriksaan</th><th>Gap</th></tr></thead><tbody>' +
      rows +
      '</tbody></table></div></section>'
    );
  }

  /* ---------- Global search ---------- */
  function searchIndex() {
    var items = [];
    data.features.forEach(function (f) {
      items.push({
        kind: 'Fitur',
        label: f.title || f.id,
        sub: f.id,
        href: '#/fitur/' + encodeURIComponent(f.id),
      });
    });
    data.endpoints.forEach(function (e) {
      items.push({ kind: 'Endpoint', label: e.key, sub: e.module, href: '#/fitur/_endpoint' });
    });
    data.contracts.forEach(function (c) {
      items.push({ kind: 'Schema', label: c.name, sub: c.file, href: '#/fitur/_kontrak' });
    });
    data.erd.entities.forEach(function (m) {
      items.push({
        kind: 'Model',
        label: m.name,
        sub: m.table,
        href: '#/erd/_all/' + encodeURIComponent(m.name),
      });
    });
    data.policies.forEach(function (p) {
      items.push({ kind: 'Policy', label: p.id, sub: p.summary, href: '#/governance' });
    });
    data.adrs.forEach(function (a) {
      items.push({ kind: 'ADR', label: a.id, sub: a.title, href: '#/governance' });
    });
    data.todo.forEach(function (t) {
      items.push({ kind: 'TODO', label: t.id, sub: t.title, href: '#/todo' });
    });
    return items;
  }

  function searchSection() {
    return (
      '<section class="section"><label class="field">Cari di seluruh portal' +
      '<input type="search" data-filter="global" placeholder="Fitur, endpoint, schema, model, policy, ADR, TODO"></label>' +
      '<div id="search-results" class="search-results" aria-live="polite"></div></section>'
    );
  }

  function renderSearch(q) {
    var box = document.getElementById('search-results');
    if (!box) return;
    if (q.length < 2) {
      box.innerHTML = '';
      return;
    }
    var hits = searchIndex()
      .filter(function (item) {
        return (item.label + ' ' + item.sub + ' ' + item.kind).toLowerCase().indexOf(q) >= 0;
      })
      .slice(0, 30);
    box.innerHTML = hits.length
      ? '<ul class="hits">' +
        hits
          .map(function (h) {
            return (
              '<li><a href="' +
              h.href +
              '"><span class="chip">' +
              esc(h.kind) +
              '</span> <span class="mono">' +
              esc(h.label) +
              '</span> <span class="muted">' +
              esc(String(h.sub || '').slice(0, 90)) +
              '</span></a></li>'
            );
          })
          .join('') +
        '</ul>'
      : '<p class="muted">Tidak ada hasil.</p>';
  }

  /* ---------- ERD ---------- */
  function domainOf(name) {
    var domains = data.erd.domains || {};
    for (var key in domains) {
      if (domains[key].indexOf(name) >= 0) return key;
    }
    return 'Tanpa domain';
  }

  function erdPage(r) {
    var domains = Object.keys(data.erd.domains || {});
    if (
      data.erd.entities.some(function (e) {
        return domainOf(e.name) === 'Tanpa domain';
      })
    )
      domains.push('Tanpa domain');
    var current = r.a && r.a !== '_all' ? r.a : '_all';
    var chips =
      '<nav class="chips" aria-label="Filter domain">' +
      [['_all', 'Semua']]
        .concat(
          domains.map(function (d) {
            return [d, d];
          }),
        )
        .map(function (d) {
          return (
            '<a class="pill" href="#/erd/' +
            encodeURIComponent(d[0]) +
            '"' +
            (d[0] === current ? ' aria-current="page"' : '') +
            '>' +
            esc(d[1]) +
            '</a>'
          );
        })
        .join('') +
      '</nav>';
    var shown = data.erd.entities.filter(function (e) {
      return current === '_all' || domainOf(e.name) === current;
    });
    var byDomain = {};
    shown.forEach(function (e) {
      (byDomain[domainOf(e.name)] = byDomain[domainOf(e.name)] || []).push(e);
    });
    var cards = Object.keys(byDomain)
      .map(function (d) {
        return (
          '<div class="card stack-card"><div class="section-head"><h3>' +
          esc(d) +
          '</h3><span class="muted" style="font-size:12px">' +
          byDomain[d].length +
          ' entitas</span></div>' +
          '<div class="chips">' +
          byDomain[d]
            .map(function (e) {
              var href = '#/erd/' + encodeURIComponent(current) + '/' + encodeURIComponent(e.name);
              return (
                '<a class="ent" href="' +
                href +
                '"' +
                (e.name === r.b ? ' aria-current="true"' : '') +
                '>' +
                esc(e.table || e.name) +
                '</a>'
              );
            })
            .join('') +
          '</div></div>'
        );
      })
      .join('');
    var entity = data.erd.entities.filter(function (e) {
      return e.name === r.b;
    })[0];
    var detail = entity
      ? entityDetail(entity)
      : '<p class="muted">Pilih entitas untuk melihat kolom dan relasinya.</p>';
    return (
      '<header class="page-head"><div class="lead"><h1>Entity Relationship</h1>' +
      '<p class="muted">' +
      data.erd.entities.length +
      ' model · ' +
      data.erd.relations.length +
      ' relasi · dibangkitkan dari model dan file asosiasi.</p></div></header>' +
      chips +
      '<div class="grid">' +
      cards +
      '</div>' +
      '<section class="card detail" aria-label="Detail entitas">' +
      detail +
      '</section>' +
      '<section class="section"><h2>Gap ERD</h2>' +
      gapTable(gapsFor(PAGE_RULES.erd)) +
      '</section>'
    );
  }

  function entityDetail(entity) {
    var cols = entity.attributes
      .map(function (a) {
        return (
          '<tr><td class="mono">' +
          esc(a.column) +
          (a.primaryKey ? ' <span class="chip ok">PK</span>' : '') +
          '</td><td class="mono">' +
          esc(a.type || '—') +
          '</td>' +
          '<td>' +
          (a.allowNull === false ? 'wajib' : a.allowNull === true ? 'boleh kosong' : '—') +
          '</td><td class="mono muted">' +
          esc(a.name) +
          '</td></tr>'
        );
      })
      .join('');
    var rels = data.erd.relations.filter(function (rel) {
      return rel.from === entity.name || rel.to === entity.name;
    });
    var relRows = rels
      .map(function (rel) {
        var other = rel.from === entity.name ? rel.to : rel.from;
        var dir = rel.from === entity.name ? rel.type : 'dirujuk lewat ' + rel.type;
        return (
          '<tr><td>' +
          esc(dir) +
          '</td><td><a class="mono" href="#/erd/_all/' +
          encodeURIComponent(other) +
          '">' +
          esc(other) +
          '</a></td>' +
          '<td class="mono">' +
          esc(rel.as || '—') +
          '</td><td class="mono">' +
          esc(rel.foreignKey || '—') +
          '</td></tr>'
        );
      })
      .join('');
    return (
      '<div class="chips"><span class="chip mono">' +
      esc(entity.name) +
      '</span><span class="muted" style="font-size:13px">' +
      esc(domainOf(entity.name)) +
      '</span></div>' +
      '<h2 style="font-size:22px" class="mono">' +
      esc(entity.table || entity.name) +
      '</h2>' +
      '<p class="muted mono" style="font-size:12px">' +
      esc(entity.file) +
      '</p>' +
      '<div class="table-box"><table><thead><tr><th>Kolom</th><th>Tipe</th><th>Null</th><th>Atribut</th></tr></thead><tbody>' +
      cols +
      '</tbody></table></div>' +
      '<h3>Relasi (' +
      rels.length +
      ')</h3>' +
      (rels.length
        ? '<div class="table-box"><table><thead><tr><th>Jenis</th><th>Entitas</th><th>Alias</th><th>Foreign key</th></tr></thead><tbody>' +
          relRows +
          '</tbody></table></div>'
        : '<p class="muted">Tidak ada relasi.</p>')
    );
  }

  /* ---------- Governance ---------- */
  function governancePage() {
    var areas = {};
    data.policies.forEach(function (p) {
      (areas[p.area || 'Lainnya'] = areas[p.area || 'Lainnya'] || []).push(p);
    });
    var max = Math.max.apply(
      null,
      Object.keys(areas)
        .map(function (k) {
          return areas[k].length;
        })
        .concat([1]),
    );
    var bars = Object.keys(areas)
      .sort(function (a, b) {
        return areas[b].length - areas[a].length;
      })
      .map(function (k) {
        var w = Math.round((areas[k].length / max) * 100);
        return (
          '<div class="bar-row"><span>' +
          esc(k) +
          '</span><span class="bar"><span style="width:' +
          w +
          '%"></span></span><span class="mono">' +
          areas[k].length +
          '</span></div>'
        );
      })
      .join('');
    var policyRows = data.policies
      .map(function (p) {
        return (
          '<tr><td class="mono nowrap">' +
          esc(p.id) +
          '</td><td>' +
          esc(p.area) +
          '</td><td>' +
          esc(p.summary) +
          '</td></tr>'
        );
      })
      .join('');
    var adrRows = data.adrs
      .slice()
      .reverse()
      .map(function (a) {
        return (
          '<tr><td class="mono nowrap">' +
          esc(a.id) +
          '</td><td>' +
          esc(a.title) +
          '</td><td>' +
          statusChip(a.status) +
          '</td><td class="nowrap muted">' +
          esc(a.date || '—') +
          '</td></tr>'
        );
      })
      .join('');
    return (
      '<header class="page-head"><div class="lead"><h1>Governance & aturan pengembangan</h1>' +
      '<p class="muted">Policy registry, ADR, dan pemeriksaan kelengkapan dokumen.</p></div></header>' +
      '<div class="grid"><section class="card stack-card"><h2>Policy per area (' +
      data.policies.length +
      ')</h2>' +
      bars +
      '</section>' +
      '<section class="card stack-card"><h2>Pemeriksaan kelengkapan</h2>' +
      completenessRules() +
      '</section></div>' +
      '<section class="section"><h2>ADR (' +
      data.adrs.length +
      ')</h2><div class="table-box"><table><thead><tr><th>ADR</th><th>Judul</th><th>Status</th><th>Tanggal</th></tr></thead><tbody>' +
      adrRows +
      '</tbody></table></div></section>' +
      '<section class="section"><h2>Policy</h2><label class="field">Cari policy<input type="search" data-filter="rows" placeholder="ID, area, atau isi aturan"></label>' +
      '<div class="table-box"><table><thead><tr><th>ID</th><th>Area</th><th>Aturan</th></tr></thead><tbody>' +
      policyRows +
      '</tbody></table></div></section>'
    );
  }

  function completenessRules() {
    if (!data.completeness) return '<p class="muted">Belum ada laporan.</p>';
    return data.completeness.rules
      .map(function (rule) {
        var n = data.completeness.summary.byRule[rule.id] || 0;
        return (
          '<div class="kv"><span><span class="mono">' +
          esc(rule.id) +
          '</span> ' +
          esc(rule.title) +
          '</span><span>' +
          n +
          '</span></div>'
        );
      })
      .join('');
  }

  /* ---------- TODO ---------- */
  var LAYER_CLASS = { Done: 'ok', 'In progress': 'info', Todo: '', 'N/A': '' };

  function layerChip(value) {
    if (!value) return '<span class="chip">Belum ditandai</span>';
    return '<span class="chip ' + (LAYER_CLASS[value] || 'bad') + '">' + esc(value) + '</span>';
  }

  function todoPage(r) {
    var statuses = ['Semua'].concat(
      data.todo
        .map(function (t) {
          return t.status;
        })
        .filter(function (s, i, all) {
          return all.indexOf(s) === i;
        }),
    );
    var current = r.a || 'Semua';
    var chips =
      '<nav class="chips" aria-label="Filter status">' +
      statuses
        .map(function (s) {
          return (
            '<a class="pill" href="#/todo/' +
            encodeURIComponent(s) +
            '"' +
            (s === current ? ' aria-current="page"' : '') +
            '>' +
            esc(s) +
            '</a>'
          );
        })
        .join('') +
      '</nav>';
    var rows = data.todo
      .filter(function (t) {
        return current === 'Semua' || t.status === current;
      })
      .map(function (t) {
        var layer = t.layer || {};
        return (
          '<tr><td style="min-width:280px"><div class="mono" style="font-size:12px;color:var(--accent)">' +
          esc(t.id) +
          '</div><div>' +
          esc(t.title) +
          '</div>' +
          (t.blocker
            ? '<div class="muted" style="font-size:12px">Blocker: ' + esc(t.blocker) + '</div>'
            : '') +
          '</td>' +
          '<td>' +
          statusChip(t.status) +
          '</td><td>' +
          layerChip(layer.prd) +
          '</td><td>' +
          layerChip(layer.be) +
          '</td><td>' +
          layerChip(layer.fe) +
          '</td>' +
          '<td class="nowrap muted">' +
          esc(t.owner) +
          ' · ' +
          esc(t.since || '—') +
          '</td></tr>'
        );
      })
      .join('');
    var count = function (s) {
      return data.todo.filter(function (t) {
        return t.status === s;
      }).length;
    };
    return (
      '<header class="page-head"><div class="lead"><h1>TODO aktif</h1><p class="muted">' +
      data.todo.length +
      ' item terbuka · ' +
      count('In progress') +
      ' in progress · ' +
      count('Blocked') +
      ' blocked. Kolom PRD/BE/FE dari baris <span class="mono">Layer:</span>.</p></div></header>' +
      chips +
      '<div class="table-box"><table><thead><tr><th>Pekerjaan</th><th>Status</th><th>PRD</th><th>BE</th><th>FE</th><th>Pemilik · sejak</th></tr></thead><tbody>' +
      rows +
      '</tbody></table></div>' +
      '<section class="section"><h2>Gap TODO</h2>' +
      gapTable(gapsFor(PAGE_RULES.todo)) +
      '</section>'
    );
  }

  /* ---------- UI/UX Matrix ---------- */
  function scoreChip(value) {
    var v = String(value || '').trim();
    var cls = /^Lancar/i.test(v)
      ? 'ok'
      : /^Perlu/i.test(v)
        ? 'warn'
        : /^Bermasalah/i.test(v)
          ? 'bad'
          : /spec|png|ada/i.test(v) && !/Belum/i.test(v)
            ? 'info'
            : '';
    return '<span class="chip ' + cls + '">' + esc(v || '—') + '</span>';
  }

  function uxPage(r) {
    var ux = data.uxMatrix;
    var roles = ux.roles.length
      ? ux.roles
      : ux.rows
          .map(function (row) {
            return row.role;
          })
          .filter(function (v, i, a) {
            return a.indexOf(v) === i;
          });
    var current = r.a && roles.indexOf(r.a) >= 0 ? r.a : roles[0];
    if (!ux.source) {
      return (
        '<header class="page-head"><div class="lead"><h1>UI/UX Matrix</h1></div></header>' +
        stateView(
          'UX matrix belum ada',
          'Buat file UX matrix sesuai config agar alur per role bisa dinilai.',
          '',
        ) +
        gapTable(gapsFor(PAGE_RULES.ux))
      );
    }
    var chips =
      '<nav class="chips" aria-label="Pilih role">' +
      roles
        .map(function (role) {
          return (
            '<a class="pill" href="#/ux/' +
            encodeURIComponent(role) +
            '"' +
            (role === current ? ' aria-current="page"' : '') +
            '>' +
            esc(role) +
            '</a>'
          );
        })
        .join('') +
      '</nav>';
    var rows = ux.rows.filter(function (row) {
      return row.role === current;
    });
    var criteria = ux.criteria.length
      ? ux.criteria
      : rows.length
        ? Object.keys(rows[0].scores)
        : [];
    var body = rows
      .map(function (row) {
        return (
          '<tr><th scope="row" style="background:var(--surface);color:var(--ink);font-weight:500">' +
          esc(row.flow) +
          '</th>' +
          criteria
            .map(function (c) {
              return '<td>' + scoreChip(row.scores[c]) + '</td>';
            })
            .join('') +
          '</tr>'
        );
      })
      .join('');
    return (
      '<header class="page-head"><div class="lead"><h1>UI/UX Matrix</h1><p class="muted">Sumber: <span class="mono">' +
      esc(ux.source) +
      '</span> · ' +
      ux.rows.length +
      ' alur.</p></div></header>' +
      chips +
      (rows.length
        ? '<div class="table-box"><table><thead><tr><th>Alur · ' +
          esc(current) +
          '</th>' +
          criteria
            .map(function (c) {
              return '<th>' + esc(c) + '</th>';
            })
            .join('') +
          '</tr></thead><tbody>' +
          body +
          '</tbody></table></div>'
        : '<p class="muted">Role ini belum punya baris alur.</p>') +
      '<section class="section"><h2>Gap UX matrix</h2>' +
      gapTable(gapsFor(PAGE_RULES.ux)) +
      '</section>'
    );
  }

  function bindFilters() {
    Array.prototype.forEach.call(main.querySelectorAll('input[data-filter]'), function (input) {
      input.addEventListener('input', function () {
        var q = input.value.trim().toLowerCase();
        if (input.dataset.filter === 'global') {
          renderSearch(q);
        } else if (input.dataset.filter === 'list') {
          Array.prototype.forEach.call(main.querySelectorAll('.list a'), function (a) {
            a.hidden = q && a.dataset.search.indexOf(q) < 0;
          });
        } else {
          Array.prototype.forEach.call(main.querySelectorAll('tbody tr'), function (tr) {
            tr.hidden = q && tr.textContent.toLowerCase().indexOf(q) < 0;
          });
        }
      });
    });
  }

  function render() {
    var r = route();
    var page = PAGES.filter(function (p) {
      return p.id === r.page && p.ready;
    })[0]
      ? r.page
      : 'home';
    renderNav(page);
    var views = {
      fitur: fiturPage,
      erd: erdPage,
      governance: governancePage,
      todo: todoPage,
      ux: uxPage,
    };
    main.innerHTML = (views[page] || homePage)(r);
    bindFilters();
  }

  function fail(title, body, command) {
    renderNav('home');
    main.innerHTML = stateView(title, body, command);
  }

  function start(json) {
    if (json == null) {
      fail(
        'Data portal belum dibuat',
        'Jalankan extractor dari root repo, lalu muat ulang halaman ini.',
        'npm run docs:extract',
      );
      return;
    }
    if (!json.meta || json.meta.schemaVersion !== SCHEMA_VERSION) {
      fail(
        'Format data tidak cocok',
        'docs-data.json memakai schemaVersion ' +
          (json.meta && json.meta.schemaVersion) +
          ', portal ini membutuhkan ' +
          SCHEMA_VERSION +
          '. Jalankan ulang extractor.',
        'npm run docs:extract',
      );
      return;
    }
    data = json;
    window.addEventListener('hashchange', render);
    render();
  }

  if (typeof window.__DOCS_DATA__ !== 'undefined') {
    start(window.__DOCS_DATA__);
  } else {
    fetch('docs-data.json', { cache: 'no-store' })
      .then(function (response) {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.text().then(function (text) {
          try {
            return JSON.parse(text);
          } catch (parseError) {
            throw new Error('File bukan JSON yang valid', { cause: parseError });
          }
        });
      })
      .then(start)
      .catch(function (error) {
        fail(
          'Data portal tidak bisa dibaca',
          String(error.message || error),
          'npm run docs:extract',
        );
      });
  }
})();

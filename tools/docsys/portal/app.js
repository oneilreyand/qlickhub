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
    { id: 'erd', label: 'ERD', ready: false },
    { id: 'governance', label: 'Governance', ready: false },
    { id: 'todo', label: 'TODO aktif', ready: false },
    { id: 'ux', label: 'UI/UX Matrix', ready: false },
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
      return '<a href="' + href + '"' + cur + '>' + esc(page.label) + '</a>';
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
    var view = r.a === '_endpoint' || r.a === '_kontrak' ? r.a : 'fitur';
    var tabs =
      '<nav class="tabs" aria-label="Tampilan">' +
      [
        ['fitur', 'Per fitur', '#/fitur'],
        ['_endpoint', 'Semua endpoint (' + data.endpoints.length + ')', '#/fitur/_endpoint'],
        ['_kontrak', 'Semua kontrak (' + data.contracts.length + ')', '#/fitur/_kontrak'],
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

  function bindFilters() {
    Array.prototype.forEach.call(main.querySelectorAll('input[data-filter]'), function (input) {
      input.addEventListener('input', function () {
        var q = input.value.trim().toLowerCase();
        if (input.dataset.filter === 'list') {
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
    main.innerHTML = page === 'fitur' ? fiturPage(r) : homePage();
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

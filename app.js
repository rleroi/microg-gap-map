(function () {
  'use strict';

  var ICONS = { works: '✓', mostly: '✓', partial: '◐', missing: '✕', blocked: '⊘', notIntended: '–' };
  var ORDER = ['works', 'mostly', 'partial', 'missing', 'blocked', 'notIntended'];
  var REPO = 'https://github.com/microg/GmsCore/issues/';
  var MIN_WEIGHT = 6;

  var state = { data: null, visible: new Set(ORDER) };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else if (k === 'style') node.setAttribute('style', attrs[k]);
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function demand(f) {
    return (f.issues || []).reduce(function (sum, i) { return sum + (i.reactions || 0); }, 0);
  }

  function weight(f) {
    return Math.max(demand(f), MIN_WEIGHT);
  }

  function color(status) {
    return 'var(--' + status + ')';
  }

  // Squarified treemap (Bruls, Huizing, van Wijk) on a w×h rectangle.
  function squarify(items, x, y, w, h) {
    var total = items.reduce(function (s, it) { return s + it.value; }, 0);
    var scale = (w * h) / total;
    var nodes = items.map(function (it) { return { item: it, area: it.value * scale }; })
      .sort(function (a, b) { return b.area - a.area; });
    var out = [];
    var row = [];
    var rect = { x: x, y: y, w: w, h: h };

    function worst(r, side) {
      var s = r.reduce(function (t, n) { return t + n.area; }, 0);
      var max = Math.max.apply(null, r.map(function (n) { return n.area; }));
      var min = Math.min.apply(null, r.map(function (n) { return n.area; }));
      return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min));
    }

    function layoutRow(r) {
      var s = r.reduce(function (t, n) { return t + n.area; }, 0);
      if (rect.w >= rect.h) {
        var colW = s / rect.h;
        var cy = rect.y;
        r.forEach(function (n) { var hh = n.area / colW; out.push({ item: n.item, x: rect.x, y: cy, w: colW, h: hh }); cy += hh; });
        rect = { x: rect.x + colW, y: rect.y, w: rect.w - colW, h: rect.h };
      } else {
        var rowH = s / rect.w;
        var cx = rect.x;
        r.forEach(function (n) { var ww = n.area / rowH; out.push({ item: n.item, x: cx, y: rect.y, w: ww, h: rowH }); cx += ww; });
        rect = { x: rect.x, y: rect.y + rowH, w: rect.w, h: rect.h - rowH };
      }
    }

    while (nodes.length) {
      var side = Math.min(rect.w, rect.h);
      var next = nodes[0];
      if (!row.length || worst(row.concat([next]), side) <= worst(row, side)) {
        row.push(nodes.shift());
      } else {
        layoutRow(row);
        row = [];
      }
    }
    if (row.length) layoutRow(row);
    return out;
  }

  var tip = document.getElementById('tip');

  function showTip(evt, f) {
    var st = state.data.statuses[f.status];
    var d = demand(f);
    tip.innerHTML = '';
    tip.appendChild(el('b', { text: f.name }));
    tip.appendChild(el('div', { text: ICONS[f.status] + ' ' + st.label }));
    tip.appendChild(el('div', { 'class': 'muted', text: d ? d + ' reactions on related issues' : 'No tracked demand' }));
    if (f.bounty) tip.appendChild(el('div', { text: 'Bounty: ' + f.bounty }));
    tip.style.display = 'block';
    moveTip(evt);
  }

  function moveTip(evt) {
    var pad = 14;
    var w = tip.offsetWidth;
    var h = tip.offsetHeight;
    var x = evt.clientX + pad;
    var y = evt.clientY + pad;
    if (x + w > window.innerWidth - 8) x = evt.clientX - w - pad;
    if (y + h > window.innerHeight - 8) y = evt.clientY - h - pad;
    tip.style.left = Math.max(8, x) + 'px';
    tip.style.top = Math.max(8, y) + 'px';
  }

  function hideTip() { tip.style.display = 'none'; }

  function openDetail(f) {
    var st = state.data.statuses[f.status];
    var body = document.getElementById('dlgBody');
    body.innerHTML = '';
    var close = el('button', { 'class': 'close', type: 'button', 'aria-label': 'Close', text: '×' });
    close.addEventListener('click', function () { document.getElementById('dlg').close(); });
    body.appendChild(close);
    body.appendChild(el('h2', { text: f.name }));
    body.appendChild(el('span', { 'class': 'status-pill', style: '--c:' + color(f.status) }, [
      el('span', { 'class': 'icon', text: ICONS[f.status] }),
      el('span', { text: st.label })
    ]));
    body.appendChild(el('p', { text: f.note || st.desc }));
    if (f.progress) body.appendChild(el('p', { 'class': 'progress', text: f.progress }));
    if (f.bounty) body.appendChild(el('p', { 'class': 'progress', text: 'Open bounty: ' + f.bounty }));
    if (f.issues && f.issues.length) {
      var rows = f.issues.map(function (i) {
        return el('tr', null, [
          el('td', null, [el('a', { href: REPO + i.n, target: '_blank', rel: 'noopener', text: '#' + i.n })]),
          el('td', { text: i.state }),
          el('td', { 'class': 'num', text: String(i.reactions) }),
          el('td', { 'class': 'num', text: String(i.comments) })
        ]);
      });
      body.appendChild(el('table', null, [
        el('thead', null, [el('tr', null, [
          el('th', { text: 'Issue' }), el('th', { text: 'State' }),
          el('th', { 'class': 'num', text: 'Reactions' }), el('th', { 'class': 'num', text: 'Comments' })
        ])]),
        el('tbody', null, rows)
      ]));
    }
    if (f.links && f.links.length) {
      body.appendChild(el('div', { 'class': 'links' }, f.links.map(function (l) {
        return el('a', { href: l.url, target: '_blank', rel: 'noopener', text: l.label + ' ↗' });
      })));
    }
    document.getElementById('dlg').showModal();
  }

  function renderSummary() {
    var feats = state.data.features;
    var counts = {};
    feats.forEach(function (f) { counts[f.status] = (counts[f.status] || 0) + 1; });
    document.getElementById('total').textContent = feats.length;

    var bar = document.getElementById('bar');
    bar.innerHTML = '';
    var label = [];
    ORDER.forEach(function (s) {
      if (!counts[s]) return;
      bar.appendChild(el('span', { style: 'flex:' + counts[s] + ';background:' + color(s), title: state.data.statuses[s].label + ': ' + counts[s] }));
      label.push(state.data.statuses[s].label + ' ' + counts[s]);
    });
    bar.setAttribute('aria-label', label.join(', '));

    var chips = document.getElementById('chips');
    chips.innerHTML = '';
    ORDER.forEach(function (s) {
      if (!counts[s]) return;
      var btn = el('button', { 'class': 'chip', type: 'button', 'aria-pressed': String(state.visible.has(s)), title: state.data.statuses[s].desc }, [
        el('span', { 'class': 'dot', style: 'background:' + color(s) }),
        el('span', { text: ICONS[s] + ' ' + state.data.statuses[s].label }),
        el('span', { 'class': 'count', text: String(counts[s]) })
      ]);
      btn.addEventListener('click', function () {
        if (state.visible.has(s) && state.visible.size === 1) state.visible = new Set(ORDER);
        else if (state.visible.size === ORDER.length) state.visible = new Set([s]);
        else if (state.visible.has(s)) state.visible.delete(s);
        else state.visible.add(s);
        renderSummary();
        applyFilter();
      });
      chips.appendChild(btn);
    });
  }

  function renderAreas() {
    var host = document.getElementById('areas');
    host.innerHTML = '';
    state.data.areas.forEach(function (area) {
      var feats = state.data.features.filter(function (f) { return f.area === area.id; });
      if (!feats.length) return;
      var gaps = feats.filter(function (f) { return f.status === 'missing' || f.status === 'partial'; }).length;
      var total = feats.reduce(function (s, f) { return s + demand(f); }, 0);
      var map = el('div', { 'class': 'map' });
      host.appendChild(el('div', { 'class': 'area' }, [
        el('h3', { text: area.label }),
        el('div', { 'class': 'meta', text: feats.length + ' features · ' + gaps + ' open gaps · ' + total + ' reactions' }),
        map
      ]));
      layoutMap(map, feats);
    });
    applyFilter();
  }

  function layoutMap(map, feats) {
    var W = map.clientWidth;
    var H = map.clientHeight;
    var gap = 2;
    var cells = squarify(feats.map(function (f) { return { value: weight(f), f: f }; }), 0, 0, W, H);
    map.innerHTML = '';
    cells.forEach(function (c) {
      var f = c.item.f;
      var w = Math.max(0, c.w - gap);
      var h = Math.max(0, c.h - gap);
      var size = (w < 64 || h < 30) ? ' tiny micro' : ((w < 90 || h < 70) ? ' tiny' : '');
      var d = demand(f);
      var sub = el('span', { 'class': 'sub' }, [
        el('span', { 'class': 'icon', text: ICONS[f.status] }),
        el('span', { text: state.data.statuses[f.status].label }),
        d ? el('span', { text: '· ' + d + ' ♥' }) : null,
        f.bounty ? el('span', { 'class': 'bounty', text: f.bounty }) : null
      ]);
      var tile = el('button', {
        'class': 'tile' + size, type: 'button', 'data-status': f.status,
        'aria-label': f.name + ', ' + state.data.statuses[f.status].label + (d ? ', ' + d + ' reactions' : ''),
        style: '--c:' + color(f.status) + ';left:' + c.x + 'px;top:' + c.y + 'px;width:' + w + 'px;height:' + h + 'px'
      }, [el('span', { 'class': 'in' }, [el('span', { 'class': 'name', text: (size === ' tiny' ? ICONS[f.status] + ' ' : '') + f.name }), el('span', { 'class': 'micro-icon', 'aria-hidden': 'true', text: ICONS[f.status] }), sub])]);
      tile.addEventListener('mouseenter', function (e) { showTip(e, f); });
      tile.addEventListener('mousemove', moveTip);
      tile.addEventListener('mouseleave', hideTip);
      tile.addEventListener('focus', function () { var r = tile.getBoundingClientRect(); showTip({ clientX: r.right, clientY: r.top }, f); });
      tile.addEventListener('blur', hideTip);
      tile.addEventListener('click', function () { hideTip(); openDetail(f); });
      map.appendChild(tile);
    });
  }

  function applyFilter() {
    document.querySelectorAll('.tile').forEach(function (t) {
      t.classList.toggle('dim', !state.visible.has(t.getAttribute('data-status')));
    });
  }

  function renderTable() {
    var rows = state.data.features.slice().sort(function (a, b) { return demand(b) - demand(a); }).map(function (f) {
      var area = state.data.areas.find(function (a) { return a.id === f.area; });
      return el('tr', null, [
        el('td', { text: f.name }),
        el('td', { text: area ? area.label : '' }),
        el('td', { text: ICONS[f.status] + ' ' + state.data.statuses[f.status].label }),
        el('td', { 'class': 'num', text: String(demand(f)) }),
        el('td', null, (f.issues || []).map(function (i, idx) {
          var a = el('a', { href: REPO + i.n, target: '_blank', rel: 'noopener', text: '#' + i.n });
          var span = el('span', null, [a]);
          if (idx) span.insertBefore(document.createTextNode(', '), a);
          return span;
        }))
      ]);
    });
    var host = document.getElementById('table');
    host.innerHTML = '';
    host.appendChild(el('table', null, [
      el('thead', null, [el('tr', null, [
        el('th', { text: 'Feature' }), el('th', { text: 'Area' }), el('th', { text: 'Status' }),
        el('th', { text: 'Reactions' }), el('th', { text: 'Issues' })
      ])]),
      el('tbody', null, rows)
    ]));
  }

  function renderSources() {
    var s = state.data.sources;
    var p = document.getElementById('sources');
    p.innerHTML = '';
    p.appendChild(document.createTextNode('Status: '));
    p.appendChild(el('a', { href: s.status.url, target: '_blank', rel: 'noopener', text: s.status.label }));
    p.appendChild(document.createTextNode('. Demand: '));
    p.appendChild(el('a', { href: s.demand.url, target: '_blank', rel: 'noopener', text: s.demand.label }));
    p.appendChild(document.createTextNode('. App-specific problems: '));
    p.appendChild(el('a', { href: s.problemApps.url, target: '_blank', rel: 'noopener', text: s.problemApps.label }));
    p.appendChild(document.createTextNode('. Data updated ' + state.data.updated + '.'));
  }

  function setupTheme() {
    var btn = document.getElementById('theme');
    var stored = null;
    try { stored = localStorage.getItem('gapmap-theme'); } catch (e) { /* storage unavailable */ }
    if (stored) document.documentElement.setAttribute('data-theme', stored);
    btn.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('gapmap-theme', next); } catch (e) { /* storage unavailable */ }
    });
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (state.data) renderAreas(); }, 150);
  });

  setupTheme();
  fetch('data.json').then(function (r) { return r.json(); }).then(function (data) {
    state.data = data;
    renderSummary();
    renderAreas();
    renderTable();
    renderSources();
  }).catch(function () {
    document.getElementById('areas').textContent = 'Could not load data.json.';
  });
})();

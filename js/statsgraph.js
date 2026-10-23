// 統計ページのグラフ（2026-10-23）。stats.html の「グラフ」から呼ばれる。表と同じ /api/stats の結果（しぼりこみ・外す設定も同じ）を絵にする
// 方針：比べたい物ごとに1つのグラフ。色は「何か」を見分けるためだけに使い、数字は文字で出す（色だけに頼らない）。
//   色は 暗い背景で色覚の差があっても見分けやすい3色（検証ツールで確認ずみ：青 #3987e5・橙 #d95926・緑 #199e70）。4つ目が要る時は形・灰色で分ける
//   件数が10未満の点・棒はうすくする（表の灰色の行と同じ）。点や棒にふれる（タップする）と、くわしい数字が出る
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var INK = '#e8e6df', SUB = '#9aa1ad', MUTED = '#7d8490', GRID = '#2c3039', AXIS = '#3e4552', SURF = '#1f232b';
  var C3 = ['#3987e5', '#d95926', '#199e70'], GRAY = '#8a8f99';
  var CMD_COLOR = { captain: C3[0], witch: C3[1], engineer: C3[2] };
  // レア度：レア＝橙・ひし形、アンコモン＝青・四角、コモン＝緑・丸、スターター＝灰・白抜きの丸（色と形の両方で見分ける）
  var RARITY = {
    4: { name: 'レア', color: C3[1], shape: 'diamond' },
    3: { name: 'アンコモン', color: C3[0], shape: 'square' },
    2: { name: 'コモン', color: C3[2], shape: 'circle' },
    1: { name: 'スターター', color: GRAY, shape: 'ring' }
  };
  var FEW = 10;

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, attrs) {
    var t = el('text', Object.assign({ x: x, y: y, fill: SUB, 'font-size': 11 }, attrs || {}), parent);
    t.textContent = s; return t;
  }
  function pct1(v) { return v == null ? '—' : (v * 100).toFixed(1) + '%'; }
  function pt(v) { return v == null ? '—' : (v > 0 ? '+' : '') + (v * 100).toFixed(1) + 'pt'; }
  function niceMax(v) { if (v <= 0) return 1; var e = Math.pow(10, Math.floor(Math.log10(v))), m = v / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * e; }
  function ticks(max, n) { var st = niceMax(max / (n || 4)), out = []; for (var v = 0; v <= max + 1e-9; v += st) out.push(v); return out; }

  // ---- 説明の吹き出し（ふれる・タップで出す） ----
  var tip;
  function tipEl() {
    if (tip) return tip;
    tip = document.createElement('div'); tip.className = 'gtip'; tip.hidden = true; document.body.appendChild(tip);
    document.addEventListener('pointerdown', function (e) { if (!e.target.closest || !e.target.closest('[data-hit]')) tip.hidden = true; });
    window.addEventListener('scroll', function () { tip.hidden = true; }, { passive: true });
    return tip;
  }
  function hover(node, html) {
    node.setAttribute('data-hit', '1'); node.style.cursor = 'pointer';
    function show(e) {
      var t = tipEl(); t.innerHTML = html; t.hidden = false;
      var w = t.offsetWidth, h = t.offsetHeight, x = e.clientX + 12, y = e.clientY - h - 10;
      if (x + w > window.innerWidth - 8) x = Math.max(8, e.clientX - w - 12);
      if (y < 8) y = e.clientY + 16;
      t.style.left = x + 'px'; t.style.top = y + 'px';
    }
    node.addEventListener('pointerenter', show); node.addEventListener('pointermove', show);
    node.addEventListener('pointerdown', show);
    node.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') tipEl().hidden = true; });
  }

  // 形（レア度用）
  function shape(g, kind, x, y, r, color, faded) {
    var op = faded ? 0.35 : 0.9, n;
    if (kind === 'square') n = el('rect', { x: x - r * 0.85, y: y - r * 0.85, width: r * 1.7, height: r * 1.7, rx: 1.5, fill: color }, g);
    else if (kind === 'diamond') n = el('path', { d: 'M' + x + ' ' + (y - r * 1.15) + 'L' + (x + r * 1.15) + ' ' + y + 'L' + x + ' ' + (y + r * 1.15) + 'L' + (x - r * 1.15) + ' ' + y + 'Z', fill: color }, g);
    else if (kind === 'ring') n = el('circle', { cx: x, cy: y, r: r * 0.85, fill: 'none', stroke: color, 'stroke-width': 2 }, g);
    else n = el('circle', { cx: x, cy: y, r: r, fill: color }, g);
    n.setAttribute('opacity', op);
    if (kind !== 'ring') { n.setAttribute('stroke', SURF); n.setAttribute('stroke-width', 1.5); }   // 重なった時に見分けるための縁
    return n;
  }
  function legend(box, items, onToggle) {
    var lg = document.createElement('div'); lg.className = 'glegend';
    items.forEach(function (it) {
      var b = document.createElement(onToggle ? 'button' : 'span'); if (onToggle) b.type = 'button';
      b.className = 'gkey' + (it.off ? ' off' : '');
      var sw = document.createElementNS(NS, 'svg'); sw.setAttribute('width', 14); sw.setAttribute('height', 14);
      if (it.shape) shape(sw, it.shape, 7, 7, 5, it.color, false);
      else el('rect', { x: 1, y: 3, width: 12, height: 8, rx: 2, fill: it.color }, sw);
      b.appendChild(sw); b.appendChild(document.createTextNode(it.name));
      if (onToggle) b.addEventListener('click', function () { onToggle(it); });
      lg.appendChild(b);
    });
    box.appendChild(lg);
  }
  function card(id, title, note) {
    var s = document.createElement('section'); s.id = 'g-' + id; s.className = 'gcard';
    s.innerHTML = '<h2>' + title + '</h2>' + (note ? '<p class="note">' + note + '</p>' : '');
    return s;
  }
  function empty(s, msg) { var p = document.createElement('p'); p.className = 'gempty'; p.textContent = msg || 'まだデータがありません'; s.appendChild(p); return s; }
  function svgBox(s, w, h) { var v = el('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h, role: 'img' }); s.appendChild(v); return v; }

  // ============================================================
  // 1. 指揮官ごとのクリア率（アセンションごと）：点＋95%の幅
  // ============================================================
  function commanders(H, W) {
    var s = card('cmd', '指揮官ごとのクリア率', '点がクリア率、縦の線が95%の幅（本当の値が入るめやす）。白抜きの点は勝ち負けが10ラン未満。線どうしが重なっている所は、差があるとは言えません。');
    var rows = H.d.overview.filter(function (r) { return r.wins + r.loses > 0; });
    if (!rows.length) return empty(s);
    var cmds = Object.keys(H.CMD), ascs = [];
    rows.forEach(function (r) { if (ascs.indexOf(r.asc) < 0) ascs.push(r.asc); });
    ascs.sort(function (a, b) { return a - b; });
    legend(s, cmds.map(function (c) { return { name: H.CMD[c], color: CMD_COLOR[c] || GRAY }; }));
    var h = 240, m = { l: 40, r: 74, t: 10, b: 34 }, iw = W - m.l - m.r, ih = h - m.t - m.b;
    var v = svgBox(s, W, h), g = el('g', { transform: 'translate(' + m.l + ',' + m.t + ')' }, v);
    var y = function (p) { return ih - p * ih; }, band = iw / ascs.length;
    [0, 0.25, 0.5, 0.75, 1].forEach(function (t) {
      el('line', { x1: 0, x2: iw, y1: y(t), y2: y(t), stroke: t === 0 ? AXIS : GRID }, g);
      txt(g, -6, y(t) + 4, Math.round(t * 100) + '%', { 'text-anchor': 'end', fill: MUTED });
    });
    if (H.base != null) {
      el('line', { x1: 0, x2: iw, y1: y(H.base), y2: y(H.base), stroke: SUB, 'stroke-dasharray': '3 4' }, g);
      txt(g, iw - 2, y(H.base) - 4, '全体 ' + Math.round(H.base * 100) + '%', { fill: SUB, 'font-size': 10, 'text-anchor': 'end' });
    }
    ascs.forEach(function (a, i) { txt(g, band * (i + 0.5), ih + 18, 'A' + a, { 'text-anchor': 'middle', fill: MUTED }); });
    txt(g, iw / 2, ih + 32, 'アセンション', { 'text-anchor': 'middle', fill: MUTED, 'font-size': 10 });
    var off = Math.min(12, band / 5), ends = [];
    cmds.forEach(function (c, ci) {
      var col = CMD_COLOR[c] || GRAY, dx = (ci - (cmds.length - 1) / 2) * off, prev = null, last = null;
      ascs.forEach(function (a, i) {
        var r = rows.filter(function (q) { return q.cmd === c && q.asc === a; })[0]; if (!r) { prev = null; return; }
        var n = r.wins + r.loses, p = r.wins / n, e = H.ci(p, n) || 0, cx = band * (i + 0.5) + dx;
        if (prev) el('line', { x1: prev[0], y1: prev[1], x2: cx, y2: y(p), stroke: col, 'stroke-width': 1.5, opacity: 0.45 }, g);
        el('line', { x1: cx, x2: cx, y1: y(Math.min(1, p + e)), y2: y(Math.max(0, p - e)), stroke: col, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: n < FEW ? 0.5 : 0.9 }, g);
        var dot = n < FEW ? el('circle', { cx: cx, cy: y(p), r: 4.5, fill: SURF, stroke: col, 'stroke-width': 2 }, g) : el('circle', { cx: cx, cy: y(p), r: 5, fill: col, stroke: SURF, 'stroke-width': 2 }, g);
        var hit = el('rect', { x: cx - Math.max(8, off / 2), y: 0, width: Math.max(16, off), height: ih, fill: 'transparent' }, g);
        hover(hit, '<b>' + H.CMD[c] + '・A' + a + '</b><br>クリア率 ' + pct1(p) + '（±' + Math.round(e * 100) + '）<br>' + r.wins + '勝 ' + r.loses + '敗' + (r.abandons ? '・やめた ' + r.abandons : ''));
        prev = [cx, y(p)]; last = { y: y(p), c: c };
        void dot;
      });
      if (last) ends.push(last);
    });
    // 線の右はしに名前（重ならないように少しずらす）
    ends.sort(function (a, b) { return a.y - b.y; });
    for (var i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
    ends.forEach(function (e) { txt(g, iw + 4, e.y + 4, H.CMD[e.c], { fill: INK, 'font-size': 10.5 }); });
    return s;
  }

  // ============================================================
  // 2. カード：取られた率（人気）× 勝率の差（強さ）の散らばり
  // ============================================================
  var cardFilter = { kind: 'all', off: {} };
  function cards(H, W) {
    var s = card('cards', 'カード：人気と強さ', '横＝報酬で取られた率（右ほど人気）、縦＝そのカードがデッキにあったランの勝率と全体の勝率の差（上ほど勝てている）。点の大きさ＝デッキにあったランの数。うすい点は10ラン未満。勝ったランは長くカードが多いので、どのカードも少し上に出やすい。スターターは報酬に出ないので入らない。');
    var all = H.cards.filter(function (r) { return r.offR > 0 && r.runs > 0 && H.rar(r.card, 'card') !== 1; });
    if (!all.length) return empty(s);
    // しぼりこみ：種類・レア度（凡例をタップで消す・出す）
    var bar = document.createElement('div'); bar.className = 'gtools';
    [['all', 'すべて'], ['tower', 'タワー'], ['skill', 'スキル']].forEach(function (k) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = k[1]; if (cardFilter.kind === k[0]) b.className = 'on';
      b.addEventListener('click', function () { cardFilter.kind = k[0]; redraw(); });
      bar.appendChild(b);
    });
    s.appendChild(bar);
    legend(s, [4, 3, 2].map(function (k) { return { k: k, name: RARITY[k].name, color: RARITY[k].color, shape: RARITY[k].shape, off: cardFilter.off[k] }; }),
      function (it) { cardFilter.off[it.k] = !cardFilter.off[it.k]; redraw(); });
    var rows = all.filter(function (r) {
      var c = H.G.CARDS[r.card] || {}; if (cardFilter.off[H.rar(r.card, 'card')]) return false;
      return cardFilter.kind === 'all' || c.kind === cardFilter.kind;
    });
    function redraw() { var n = cards(H, W); s.replaceWith(n); }
    if (!rows.length) return empty(s, '選んだ条件のカードがありません');
    var h = Math.round(Math.min(420, Math.max(300, W * 0.75))), m = { l: 44, r: 12, t: 26, b: 36 }, iw = W - m.l - m.r, ih = h - m.t - m.b;
    var v = svgBox(s, W, h), g = el('g', { transform: 'translate(' + m.l + ',' + m.t + ')' }, v);
    var ym = 0.1; rows.forEach(function (r) { var dv = H.diff(r); if (dv != null) ym = Math.max(ym, Math.abs(dv)); });
    ym = Math.min(0.6, Math.ceil(ym * 10 + 0.5) / 10);
    var x = function (p) { return p * iw; }, y = function (dv) { return ih / 2 - dv / ym * ih / 2; };
    // 平均の取られた率（縦の点線）
    var oT = 0, oO = 0; rows.forEach(function (r) { oT += r.takeR; oO += r.offR; }); var avg = oO ? oT / oO : 0;
    // 4つの区切りの名前（うすく）
    var Q = [['不人気だが勝てる', 4, 12, 'start'], ['人気で勝てる', iw - 4, 12, 'end'], ['不人気で勝てない', 4, ih - 6, 'start'], ['人気だが勝てない', iw - 4, ih - 6, 'end']];
    Q.forEach(function (q) { txt(g, q[1], q[2], q[0], { fill: '#5d6472', 'font-size': 10, 'text-anchor': q[3] }); });
    [0, 0.25, 0.5, 0.75, 1].forEach(function (t) {
      el('line', { x1: x(t), x2: x(t), y1: 0, y2: ih, stroke: GRID }, g);
      txt(g, x(t), ih + 16, Math.round(t * 100) + '%', { 'text-anchor': t === 0 ? 'start' : t === 1 ? 'end' : 'middle', fill: MUTED });
    });
    [-ym, -ym / 2, 0, ym / 2, ym].forEach(function (t) {
      el('line', { x1: 0, x2: iw, y1: y(t), y2: y(t), stroke: t === 0 ? AXIS : GRID, 'stroke-width': t === 0 ? 1.5 : 1 }, g);
      txt(g, -6, y(t) + 4, (t > 0 ? '+' : '') + Math.round(t * 100), { 'text-anchor': 'end', fill: MUTED });
    });
    el('line', { x1: x(avg), x2: x(avg), y1: 0, y2: ih, stroke: SUB, 'stroke-dasharray': '3 4' }, g);
    txt(g, x(avg) + 4, ih - 20, '平均 ' + Math.round(avg * 100) + '%', { fill: SUB, 'font-size': 10 });
    txt(g, iw / 2, ih + 31, '報酬で取られた率 →', { 'text-anchor': 'middle', fill: MUTED, 'font-size': 10 });
    txt(g, -m.l + 2, -14, '↑ 勝率の差（ポイント）', { fill: MUTED, 'font-size': 10 });
    var maxRuns = Math.max.apply(null, rows.map(function (r) { return r.runs; }));
    var pts = rows.map(function (r) {
      var p = r.takeR / r.offR, dv = H.diff(r); if (dv == null) return null;
      return { r: r, cx: x(p), cy: y(Math.max(-ym, Math.min(ym, dv))), rad: 3.5 + 7 * Math.sqrt(r.runs / maxRuns), p: p, dv: dv, few: r.runs < FEW };
    }).filter(Boolean).sort(function (a, b) { return b.rad - a.rad; });   // 大きい点を先に描く（小さい点が隠れない）
    pts.forEach(function (q) {
      var rk = RARITY[H.rar(q.r.card, 'card')] || RARITY[2];
      shape(g, rk.shape, q.cx, q.cy, q.rad, rk.color, q.few);
      var hit = el('circle', { cx: q.cx, cy: q.cy, r: Math.max(12, q.rad + 4), fill: 'transparent' }, g);
      hover(hit, '<b>' + H.cardName(q.r.card) + '</b>（' + rk.name + '）<br>取られた率 ' + pct1(q.p) + '（' + q.r.takeR + '/' + q.r.offR + '）<br>勝率 ' + pct1(q.r.wins / q.r.runs) + '・全体との差 ' + pt(q.dv) +
        '<br>デッキにあったラン ' + q.r.runs + (q.r.offS ? '<br>商人で買われた率 ' + pct1(q.r.takeS / q.r.offS) : ''));
    });
    // 名前を出すのは、10ラン以上の点のうち、真ん中（平均・差0）から遠い6つだけ（全部に出すと読めない）
    var lab = pts.filter(function (q) { return !q.few; }).map(function (q) {
      return { q: q, d: Math.pow((q.p - avg) / 0.5, 2) + Math.pow(q.dv / ym, 2) };
    }).sort(function (a, b) { return b.d - a.d; }).slice(0, 6), used = [];
    lab.forEach(function (o) {
      var q = o.q, right = q.cx < iw * 0.7, lx = q.cx + (right ? q.rad + 4 : -q.rad - 4), ly = q.cy + 4;
      if (used.some(function (u) { return Math.abs(u[0] - lx) < 60 && Math.abs(u[1] - ly) < 12; })) return;
      used.push([lx, ly]);
      txt(g, lx, ly, H.cardName(q.r.card), { fill: INK, 'font-size': 10.5, 'text-anchor': right ? 'start' : 'end', 'pointer-events': 'none' });
    });
    return s;
  }

  // ============================================================
  // 3. レリック：勝率の差（点＋95%の幅）と、商人で買われた率
  // ============================================================
  function relicDiff(H, W) {
    var s = card('relic', 'レリック：持っていたランの勝率（全体との差）', '0の線より右なら、持っていたランの勝率が全体より高い。横の線は95%の幅で、0の線にかかっていれば差があるとは言えない。うすい行は10ラン未満。指揮官のレリック（スターター）は指揮官の差そのもの。');
    var rows = H.relics.filter(function (r) { return r.runs > 0 && H.diff(r) != null; });
    if (!rows.length) return empty(s);
    legend(s, [4, 3, 2, 1].map(function (k) { return { name: RARITY[k].name, color: RARITY[k].color, shape: RARITY[k].shape }; }));
    rows.sort(function (a, b) { return H.diff(b) - H.diff(a); });
    var rh = 24, lw = Math.min(118, W * 0.34), m = { l: lw, r: 40, t: 18, b: 22 }, iw = W - m.l - m.r, h = m.t + m.b + rows.length * rh;
    var v = svgBox(s, W, h), g = el('g', { transform: 'translate(' + m.l + ',' + m.t + ')' }, v);
    var xm = 0.1; rows.forEach(function (r) { var dv = H.diff(r), e = H.ci(r.wins / r.runs, r.runs) || 0; xm = Math.max(xm, Math.abs(dv) + e); });
    xm = Math.min(1, Math.ceil(xm * 10) / 10);
    var x = function (dv) { return iw / 2 + dv / xm * iw / 2; }, ih = rows.length * rh;
    [-xm, -xm / 2, 0, xm / 2, xm].forEach(function (t) {
      el('line', { x1: x(t), x2: x(t), y1: -4, y2: ih, stroke: t === 0 ? AXIS : GRID, 'stroke-width': t === 0 ? 1.5 : 1 }, g);
      txt(g, x(t), ih + 15, (t > 0 ? '+' : '') + Math.round(t * 100), { 'text-anchor': 'middle', fill: MUTED, 'font-size': 10 });
    });
    txt(g, x(0), -6, '全体と同じ', { 'text-anchor': 'middle', fill: MUTED, 'font-size': 10 });
    txt(g, iw + 6, -6, 'ラン', { fill: MUTED, 'font-size': 10 });
    rows.forEach(function (r, i) {
      var cy = i * rh + rh / 2, dv = H.diff(r), p = r.wins / r.runs, e = H.ci(p, r.runs) || 0, few = r.runs < FEW;
      var rk = RARITY[H.rar(r.relic, 'relic')] || RARITY[2];
      if (i % 2 === 0) el('rect', { x: -lw, y: i * rh, width: W, height: rh, fill: 'rgba(255,255,255,0.025)' }, g);
      txt(g, -8, cy + 4, H.relicName(r.relic), { 'text-anchor': 'end', fill: few ? MUTED : INK, 'font-size': 11.5 });
      el('line', { x1: x(Math.max(-xm, dv - e)), x2: x(Math.min(xm, dv + e)), y1: cy, y2: cy, stroke: rk.color, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: few ? 0.35 : 0.75 }, g);
      shape(g, rk.shape, x(dv), cy, 5, rk.color, few);
      txt(g, iw + 6, cy + 4, String(r.runs), { fill: few ? MUTED : SUB, 'font-size': 10.5 });
      var hit = el('rect', { x: -lw, y: i * rh, width: W, height: rh, fill: 'transparent' }, g);
      hover(hit, '<b>' + H.relicName(r.relic) + '</b>（' + rk.name + '）<br>持っていたランの勝率 ' + pct1(p) + '（±' + Math.round(e * 100) + '）<br>全体との差 ' + pt(dv) + '<br>持っていたラン ' + r.runs +
        '<br>出た ' + (r.offS + r.drop) + '・取った ' + (r.takeS + r.drop) + (r.offS ? '<br>商人：並んだ ' + r.offS + '・買った ' + r.takeS : ''));
    });
    return s;
  }
  function relicShop(H, W) {
    var s = card('relicshop', 'レリック：商人で買われた率', '商人に並んだ時に買われた割合（選べるのは商人だけなので、人気はここで比べる）。棒の右は「買った/並んだ」。うすい棒は並んだ回数が10未満。');
    var rows = H.relics.filter(function (r) { return r.offS > 0; });
    if (!rows.length) return empty(s, 'まだ商人に並んだ記録がありません');
    rows.sort(function (a, b) { return b.takeS / b.offS - a.takeS / a.offS || b.offS - a.offS; });
    legend(s, [4, 3, 2].map(function (k) { return { name: RARITY[k].name, color: RARITY[k].color }; }));
    return hbars(s, W, rows.map(function (r) {
      var rk = RARITY[H.rar(r.relic, 'relic')] || RARITY[2], p = r.takeS / r.offS;
      return { label: H.relicName(r.relic), v: p, color: rk.color, few: r.offS < FEW, right: r.takeS + '/' + r.offS,
        tip: '<b>' + H.relicName(r.relic) + '</b>（' + rk.name + '）<br>買われた率 ' + pct1(p) + '<br>並んだ ' + r.offS + '・買った ' + r.takeS };
    }), 1, function (t) { return Math.round(t * 100) + '%'; });
  }

  // 横棒のグラフ（共通）：rows＝{label, v, color, few, right, tip, med}、max＝目盛りの最大
  function hbars(s, W, rows, max, fmt, medLabel) {
    var rh = 22, lw = Math.min(124, W * 0.36), m = { l: lw, r: 58, t: 6, b: 22 }, iw = W - m.l - m.r, ih = rows.length * rh, h = m.t + m.b + ih;
    var v = svgBox(s, W, h), g = el('g', { transform: 'translate(' + m.l + ',' + m.t + ')' }, v);
    var x = function (val) { return Math.max(0, val) / max * iw; };
    ticks(max, 4).forEach(function (t) {
      el('line', { x1: x(t), x2: x(t), y1: 0, y2: ih, stroke: t === 0 ? AXIS : GRID }, g);
      txt(g, x(t), ih + 15, fmt(t), { 'text-anchor': 'middle', fill: MUTED, 'font-size': 10 });
    });
    rows.forEach(function (r, i) {
      var y0 = i * rh, bw = Math.max(2, x(r.v));
      txt(g, -8, y0 + rh / 2 + 4, r.label, { 'text-anchor': 'end', fill: r.few ? MUTED : INK, 'font-size': 11.5 });
      // 棒：左（0の線）は角なし、右はしだけ丸める
      el('path', { d: 'M0 ' + (y0 + 4) + 'H' + (bw - 3) + 'a3 3 0 0 1 3 3V' + (y0 + rh - 7) + 'a3 3 0 0 1 -3 3H0Z', fill: r.color, opacity: r.few ? 0.35 : 0.85 }, g);
      if (r.med != null) el('line', { x1: x(r.med), x2: x(r.med), y1: y0 + 2, y2: y0 + rh - 2, stroke: INK, 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
      txt(g, bw + 5, y0 + rh / 2 + 4, r.right, { fill: r.few ? MUTED : SUB, 'font-size': 10.5 });
      var hit = el('rect', { x: -lw, y: y0, width: W, height: rh, fill: 'transparent' }, g);
      hover(hit, r.tip);
    });
    if (medLabel) txt(g, iw, ih + 15, medLabel, { 'text-anchor': 'end', fill: MUTED, 'font-size': 10 });
    return s;
  }

  // ============================================================
  // 4. 負けた場所：層ごとに、階ごとの負けた数（マスの種類で色分け）
  // ============================================================
  function deaths(H, W) {
    var s = card('deaths', '負けた場所', '層ごとに、何階で負けたか。色はマスの種類。棒が高い所が、いちばん負けている場所。');
    var rows = H.d.deaths; if (!rows.length) return empty(s, 'まだ負けた記録がありません');
    var KIND = [['battle', '戦闘', C3[0]], ['elite', 'エリート', C3[1]], ['boss', 'ボス', C3[2]], ['other', 'そのほか', '#c98500']];
    var kOf = function (at) { return at === 'battle' ? 'battle' : at === 'elite' ? 'elite' : at === 'boss' || at === 'boss2' ? 'boss' : 'other'; };
    legend(s, KIND.filter(function (k) { return rows.some(function (r) { return kOf(r.at) === k[0]; }); }).map(function (k) { return { name: k[1], color: k[2] }; }));
    var acts = [], maxF = 0, by = {}, ymax = 0;
    rows.forEach(function (r) {
      if (acts.indexOf(r.act) < 0) acts.push(r.act);
      var f = Math.max(0, r.floor), k = r.act + '|' + f; maxF = Math.max(maxF, f);
      var o = by[k] || (by[k] = { battle: 0, elite: 0, boss: 0, other: 0, list: [] });
      o[kOf(r.at)] += r.n; o.list.push(r);
    });
    Object.keys(by).forEach(function (k) { var o = by[k]; ymax = Math.max(ymax, o.battle + o.elite + o.boss + o.other); });
    acts.sort();
    var total = rows.reduce(function (a, r) { return a + r.n; }, 0), yTop = niceMax(ymax);
    acts.forEach(function (a) {
      var h = 140, m = { l: 34, r: 8, t: 30, b: 26 }, iw = W - m.l - m.r, ih = h - m.t - m.b;
      var v = svgBox(s, W, h), g = el('g', { transform: 'translate(' + m.l + ',' + m.t + ')' }, v);
      var nA = rows.filter(function (r) { return r.act === a; }).reduce(function (x, r) { return x + r.n; }, 0);
      txt(g, -m.l + 2, -14, H.actName(a) + '（' + nA + '件・' + Math.round(nA / total * 100) + '%）', { fill: INK, 'font-size': 12 });
      var bw = iw / (maxF + 1), y = function (n) { return ih - n / yTop * ih; };
      ticks(yTop, 2).forEach(function (t) { el('line', { x1: 0, x2: iw, y1: y(t), y2: y(t), stroke: t === 0 ? AXIS : GRID }, g); txt(g, -6, y(t) + 4, String(t), { 'text-anchor': 'end', fill: MUTED, 'font-size': 10 }); });
      for (var f = 0; f <= maxF; f++) {
        var o = by[a + '|' + f], x0 = f * bw + 1, w = Math.max(2, bw - 2);
        if ((f + 1) % (maxF > 16 ? 2 : 1) === 0 || f === 0) txt(g, x0 + w / 2, ih + 14, String(f + 1), { 'text-anchor': 'middle', fill: MUTED, 'font-size': 9.5 });
        if (!o) continue;
        var acc = 0, segs = KIND.filter(function (k) { return o[k[0]]; });
        segs.forEach(function (k, si) {
          var n = o[k[0]], top = y(acc + n), bot = y(acc), hh = bot - top - (si < segs.length - 1 ? 2 : 0);   // 色の間に2pxのすき間
          if (si === segs.length - 1) el('path', { d: 'M' + x0 + ' ' + bot + 'V' + (top + 3) + 'a3 3 0 0 1 3 -3H' + (x0 + w - 3) + 'a3 3 0 0 1 3 3V' + bot + 'Z', fill: k[2] }, g);
          else el('rect', { x: x0, y: bot - hh, width: w, height: Math.max(1, hh), fill: k[2] }, g);
          acc += n;
        });
        var hit = el('rect', { x: f * bw, y: 0, width: bw, height: ih, fill: 'transparent' }, g);
        hover(hit, '<b>' + H.actName(a) + ' ' + (f + 1) + '階</b><br>' + o.list.map(function (r) { return (H.AT[r.at] || r.at) + ' ' + r.n + '件'; }).join('<br>'));
      }
      txt(g, iw, ih + 24, '階', { 'text-anchor': 'end', fill: MUTED, 'font-size': 10 });
    });
    return s;
  }

  // ============================================================
  // 5. マップ・敵・タワー：横棒
  // ============================================================
  function maps(H, W) {
    var s = card('maps', 'マップごとの、1戦で減ったライフ', '棒＝平均、白い縦線＝中央値。層の順に並べ、同じ層の中は多い順。うすい棒は10戦未満。');
    var rows = H.d.maps.filter(function (r) { return r.n > 0; });
    if (!rows.length) return empty(s);
    rows.sort(function (a, b) { return a.act - b.act || (b.life_lost || 0) - (a.life_lost || 0); });
    var mx = niceMax(Math.max.apply(null, rows.map(function (r) { return Math.max(r.life_lost || 0, r.med_life_lost || 0); })) || 1);
    var KC = { battle: C3[0], elite: C3[1], boss: C3[2] };
    legend(s, [['battle', '戦闘'], ['elite', 'エリート'], ['boss', 'ボス']].filter(function (k) { return rows.some(function (r) { return r.kind === k[0]; }); }).map(function (k) { return { name: k[1], color: KC[k[0]] }; }));
    return hbars(s, W, rows.map(function (r) {
      return { label: H.mapName(r.map) + (r.act ? '・' + r.act : ''), v: r.life_lost || 0, med: r.med_life_lost, color: KC[r.kind] || GRAY, few: r.n < FEW,
        right: (Math.round((r.life_lost || 0) * 10) / 10) + '（' + r.n + '戦）',
        tip: '<b>' + H.mapName(r.map) + '</b>（' + H.actName(r.act) + '・' + (H.AT[r.kind] || r.kind) + '）<br>減ったライフ 平均 ' + (Math.round((r.life_lost || 0) * 10) / 10) + '・中央値 ' + (r.med_life_lost == null ? '—' : r.med_life_lost) + '・最大 ' + r.life_max + '<br>戦闘数 ' + r.n + '・負け ' + r.lost + '<br>通した敵 平均 ' + (Math.round((r.leaked || 0) * 10) / 10) };
    }), mx, function (t) { return String(t); });
  }
  function enemies(H, W) {
    var s = card('enemies', '敵ごとの、1戦で減らされたライフ', '出た戦闘1つあたり、その敵に減らされたライフの平均（多い順に15種類まで）。うすい棒は出た戦闘が10未満。');
    var en = {};
    H.d.enemySeen.forEach(function (r) { en[r.enemy] = { enemy: r.enemy, fights: r.fights, spawned: r.spawned, life: 0 }; });
    H.d.enemyDmg.forEach(function (r) { var o = en[r.enemy] || (en[r.enemy] = { enemy: r.enemy, fights: 0, spawned: 0, life: 0 }); o.life = r.life; });
    var rows = Object.keys(en).map(function (k) { return en[k]; }).filter(function (r) { return r.fights > 0; })
      .map(function (r) { r.per = r.life / r.fights; return r; }).sort(function (a, b) { return b.per - a.per; }).slice(0, 15);
    if (!rows.length) return empty(s);
    var mx = niceMax(rows[0].per || 1);
    return hbars(s, W, rows.map(function (r) {
      return { label: H.enemyName(r.enemy), v: r.per, color: C3[1], few: r.fights < FEW, right: (Math.round(r.per * 10) / 10) + '',
        tip: '<b>' + H.enemyName(r.enemy) + '</b><br>1戦あたり ' + (Math.round(r.per * 10) / 10) + '<br>出た戦闘 ' + r.fights + '・出た数 ' + r.spawned + '<br>減らしたライフの合計 ' + r.life + (r.spawned ? '<br>100体あたり ' + (Math.round(r.life / r.spawned * 1000) / 10) : '') };
    }), mx, function (t) { return String(t); });
  }
  function towers(H, W) {
    var s = card('towers', 'タワーごとの、1戦で与えたダメージ', '使った戦闘1つあたりのダメージ（多い順）。棒の右は「1戦あたりダメージ・倒した数」。うすい棒は使った戦闘が10未満。');
    var rows = H.d.towers.filter(function (r) { return r.fights > 0; }).map(function (r) { return { r: r, per: r.dmg / r.fights, k: r.kills / r.fights }; }).sort(function (a, b) { return b.per - a.per; });
    if (!rows.length) return empty(s);
    var mx = niceMax(rows[0].per || 1);
    return hbars(s, W, rows.map(function (o) {
      return { label: H.srcName(o.r.src), v: o.per, color: C3[0], few: o.r.fights < FEW, right: Math.round(o.per) + '・' + (Math.round(o.k * 10) / 10) + '体',
        tip: '<b>' + H.srcName(o.r.src) + '</b><br>1戦あたりダメージ ' + Math.round(o.per) + '<br>1戦あたり倒した数 ' + (Math.round(o.k * 10) / 10) + '<br>使った戦闘 ' + o.r.fights };
    }), mx, function (t) { return t >= 1000 ? (t / 1000) + 'k' : String(t); });
  }

  // ---- まとめて描く ----
  var LIST = [
    ['cmd', '指揮官', commanders], ['cards', 'カード', cards], ['relic', 'レリック', relicDiff], ['relicshop', 'レリック購入', relicShop],
    ['deaths', '負けた場所', deaths], ['maps', 'マップ', maps], ['enemies', '敵', enemies], ['towers', 'タワー', towers]
  ];
  function render(H, main) {
    // グラフの幅＝カードの内側の幅（main の左右の余白・カードの余白と枠を引く）
    var cs = getComputedStyle(main), inner = main.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var W = Math.max(280, Math.min(790, inner) - 28), out = [];
    LIST.forEach(function (it) {
      var sec;
      try { sec = it[2](H, W); } catch (e) { sec = card(it[0], it[1], ''); empty(sec, 'グラフを作れませんでした（' + e.message + '）'); }
      main.appendChild(sec); out.push([sec, it[1]]);
    });
    return out;
  }
  window.StatsGraph = { render: render };
})();

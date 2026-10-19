// ワールドマップ（全体マップ）の背景：層ごとの景色をドット絵で描く（画像ファイルは使わない）
// 第1層 草原：草のむら・川・木・花 ／ 第2層 雪山：雪原・山・凍った湖・雪の針葉樹 ／ 第3層 火山：黒い岩・溶岩の川・ひび・上に大きな火山
// 上に重ねる小さな動き：草原＝ホタル、雪山＝ふる雪、火山＝舞い上がる火の粉
'use strict';
(function () {
  var G = window.G = window.G || {};
  var P = 3;   // 背景の1ドット＝画面の3px

  function hash(x, y, s) {
    var h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  // なめらかなでこぼこ（値ノイズ）
  function noise(x, y, s) {
    var x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function fbm(x, y, s) { return noise(x, y, s) * 0.6 + noise(x * 2.1, y * 2.1, s + 7) * 0.3 + noise(x * 4.3, y * 4.3, s + 13) * 0.1; }
  function rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

  var THEMES = {
    grass: { base: ['#2a4f25', '#30592a', '#376431', '#3f7037'], speck: ['#4f8a3d', '#264d24'], river: ['#2a5a86', '#3672a2', '#5f9ccc'], bank: '#6e6a3e',
      tree: { dark: '#1d3a1c', mid: '#2f6a2c', light: '#4f8f3d', trunk: '#4a3420' }, flower: ['#f4e36a', '#f0f0f0', '#e889a8'] },
    snow: { base: ['#b9c8da', '#c8d5e4', '#d6e0ec', '#e3ebf4'], speck: ['#ffffff', '#a8b8cc'], river: ['#8fbedc', '#a9d2ea', '#e2f4ff'], bank: '#9fb0c4',
      tree: { dark: '#1e3a34', mid: '#2c5248', light: '#ffffff', trunk: '#3e3026' }, flower: ['#ffffff'] },
    volcano: { base: ['#1f1715', '#271d1a', '#30241f', '#3a2c26'], speck: ['#4a382f', '#140e0c'], river: ['#c8341a', '#ff6a2a', '#ffc04a'], bank: '#5a2416',
      tree: { dark: '#140e0c', mid: '#2e2420', light: '#4a3a32', trunk: '#ff6a2a' }, flower: ['#ff8a2a', '#ffd84a'] }
  };

  // 背景を1枚作る（w,h：マップの画面上の大きさ、seed：層ごとに変える）
  function build(theme, w, h, seed) {
    var T = THEMES[theme] || THEMES.grass, cw = Math.ceil(w / P), ch = Math.ceil(h / P);
    var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    var g = cv.getContext('2d'), img = g.createImageData(cw, ch), d = img.data;
    var base = T.base.map(rgb), speck = T.speck.map(rgb), riv = T.river.map(rgb), bank = rgb(T.bank);
    // 川（溶岩・凍った川）の中心：上から下へくねくね
    function riverX(y) { return cw * (0.18 + 0.1 * Math.sin(y / 23 + seed) + 0.05 * Math.sin(y / 9.7 + seed * 2)); }
    function river2X(y) { return cw * (0.82 + 0.08 * Math.sin(y / 31 + seed * 3)); }
    for (var y = 0; y < ch; y++) for (var x = 0; x < cw; x++) {
      var n = fbm(x / 16, y / 16, seed), c = base[n < 0.38 ? 0 : n < 0.5 ? 1 : n < 0.62 ? 2 : 3];
      var r = hash(x, y, seed + 3);
      if (r < 0.04) c = speck[r < 0.02 ? 0 : 1 % speck.length];
      // 川
      var rw = theme === 'volcano' ? 2.4 : 3.2;
      var dx = Math.min(Math.abs(x - riverX(y)), theme === 'grass' ? 99 : Math.abs(x - river2X(y)) + (theme === 'snow' ? 99 : 0));
      if (dx < rw + 1.2) c = bank;
      if (dx < rw) c = riv[dx < rw * 0.35 ? 2 : dx < rw * 0.7 ? 1 : 0];
      if (dx < rw && theme !== 'volcano' && hash(x, y, seed + 9) < 0.05) c = riv[2];
      var i = (y * cw + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // 火山：溶岩のまわりのぼんやりした光
    if (theme === 'volcano') {
      g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,90,30,0.07)';
      for (y = 0; y < ch; y += 2) { g.fillRect(riverX(y) - 7, y, 14, 2); g.fillRect(river2X(y) - 6, y, 12, 2); }
      g.globalCompositeOperation = 'source-over';
      // ひび（細い線、ところどころ赤く光る）
      for (var k = 0; k < Math.floor(ch / 14); k++) {
        var cx = hash(k, 1, seed) * cw, cy = hash(k, 2, seed) * ch, ang = hash(k, 3, seed) * Math.PI * 2;
        for (var s = 0; s < 14; s++) { ang += (hash(k, s, seed + 5) - 0.5) * 1.1; cx += Math.cos(ang); cy += Math.sin(ang); g.fillStyle = hash(k, s, seed + 6) < 0.25 ? '#c8341a' : '#120c0a'; g.fillRect(Math.round(cx), Math.round(cy), 1, 1); }
      }
    }
    // 雪山：凍った湖（だ円・ひび）
    if (theme === 'snow') {
      for (k = 0; k < Math.floor(ch / 70) + 1; k++) {
        var lx = cw * (0.35 + hash(k, 4, seed) * 0.3), ly = ch * (0.12 + hash(k, 5, seed) * 0.8), rx = 9 + hash(k, 6, seed) * 6, ry = 5 + hash(k, 7, seed) * 3;
        for (y = -ry - 1; y <= ry + 1; y++) for (x = -rx - 1; x <= rx + 1; x++) {
          var e = (x * x) / (rx * rx) + (y * y) / (ry * ry);
          if (e > 1.15) continue;
          g.fillStyle = e > 0.85 ? '#e8f2fa' : hash(x, y, k + seed) < 0.05 ? '#ffffff' : (y < -ry * 0.3 ? '#b8dcf2' : '#9ccbe8');
          g.fillRect(Math.round(lx + x), Math.round(ly + y), 1, 1);
        }
      }
    }
    // 木・山・岩（上から順に描いて重なりを自然に）
    var things = [];
    var cnt = Math.floor(cw * ch / 160);
    for (k = 0; k < cnt; k++) {
      var tx = Math.floor(hash(k, 11, seed) * cw), ty = Math.floor(hash(k, 12, seed) * ch);
      if (Math.abs(tx - riverX(ty)) < 6 || (theme !== 'grass' && Math.abs(tx - river2X(ty)) < 6)) continue;
      // 木は集まって生える（ノイズの高い所）
      var f = fbm(tx / 22, ty / 22, seed + 21);
      var kind = theme === 'snow' && f > 0.66 ? 'mount' : theme === 'volcano' && f > 0.68 ? 'spire' : f > 0.52 ? 'tree' : hash(k, 13, seed) < 0.25 ? 'rock' : hash(k, 14, seed) < 0.5 ? 'flower' : null;
      if (kind) things.push({ x: tx, y: ty, k: kind, v: hash(k, 15, seed) });
    }
    things.sort(function (a, b) { return a.y - b.y; });
    things.forEach(function (o) { drawThing(g, T, theme, o); });
    // 火山の層：一番上（ボスのあたり）に大きな火山
    if (theme === 'volcano') drawVolcano(g, Math.round(cw / 2), 26);
    if (theme === 'snow') drawBigMountain(g, Math.round(cw / 2), 28);
    return cv;
  }
  function px(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(x, y, w || 1, h || 1); }
  function drawThing(g, T, theme, o) {
    var x = o.x, y = o.y, t = T.tree;
    if (o.k === 'tree') {
      if (theme === 'grass') {      // 丸い木
        px(g, t.trunk, x, y + 3, 1, 2);
        px(g, t.dark, x - 2, y - 1, 5, 4); px(g, t.dark, x - 1, y - 2, 3, 1);
        px(g, t.mid, x - 1, y - 1, 3, 2); px(g, t.light, x - 1, y - 1, 1, 1);
        px(g, 'rgba(0,0,0,.3)', x - 1, y + 4, 4, 1);
      } else if (theme === 'snow') { // 雪の針葉樹
        px(g, t.trunk, x, y + 3, 1, 1);
        px(g, t.dark, x, y - 3, 1, 1); px(g, t.dark, x - 1, y - 2, 3, 2); px(g, t.mid, x - 2, y, 5, 3);
        px(g, t.light, x, y - 3, 1, 1); px(g, t.light, x - 1, y - 1, 1, 1); px(g, t.light, x - 2, y + 1, 2, 1);
        px(g, 'rgba(60,80,110,.25)', x - 1, y + 4, 4, 1);
      } else {                       // 火山：枯れた黒い木（先が赤い）
        px(g, t.mid, x, y - 2, 1, 6); px(g, t.mid, x - 1, y - 1, 1, 1); px(g, t.mid, x + 1, y, 1, 1); px(g, t.mid, x - 2, y - 2, 1, 1);
        if (o.v < 0.3) px(g, '#ff6a2a', x, y - 3, 1, 1);
      }
    } else if (o.k === 'rock') {
      var rc = theme === 'snow' ? ['#7d8a9c', '#eef4fa'] : theme === 'volcano' ? ['#4a3a32', '#6a564a'] : ['#6e6e6a', '#9ca1a7'];
      px(g, rc[0], x - 1, y, 3, 2); px(g, rc[1], x - 1, y, 2, 1);
    } else if (o.k === 'flower') {
      px(g, T.flower[Math.floor(o.v * T.flower.length)], x, y, 1, 1);
      if (theme === 'volcano' && o.v < 0.5) px(g, 'rgba(255,120,40,.35)', x - 1, y - 1, 3, 3);
    } else if (o.k === 'mount') {    // 雪山：小さな山（三角・上が白い・右側が影）
      var hh = 6 + Math.round(o.v * 5);
      for (var i = 0; i < hh; i++) {
        var hw = Math.round(i * 0.9), cap = i < hh * 0.4;
        px(g, cap ? '#ffffff' : '#8692a6', x - hw, y - hh + i, hw + 1, 1);
        px(g, cap ? '#d2deec' : '#5f6b80', x + 1, y - hh + i, hw, 1);
        px(g, '#4a5468', x - hw - 1, y - hh + i, 1, 1); px(g, '#4a5468', x + hw + 1, y - hh + i, 1, 1);
      }
    } else if (o.k === 'spire') {    // 火山：とがった岩
      var sh = 5 + Math.round(o.v * 6);
      for (i = 0; i < sh; i++) px(g, i % 3 === 0 ? '#3a2c26' : '#2a201c', x - Math.floor(i / 3), y - sh + i, Math.floor(i / 3) * 2 + 1, 1);
      if (o.v < 0.4) px(g, '#ff6a2a', x, y - 2, 1, 1);
    }
  }
  function drawVolcano(g, cx, top) {
    var H = 22;
    for (var i = 0; i < H; i++) {
      var w = 6 + i * 2.2;
      px(g, '#2a1e1a', Math.round(cx - w / 2), top + i, Math.round(w), 1);
      px(g, '#4e382c', Math.round(cx - w / 2), top + i, Math.round(w * 0.35), 1);
      px(g, '#9a4a26', Math.round(cx - w / 2), top + i, 1, 1); px(g, '#9a4a26', Math.round(cx + w / 2) - 1, top + i, 1, 1);
    }
    // 火口と流れ出す溶岩
    px(g, '#ffc04a', cx - 2, top, 5, 1); px(g, '#ff6a2a', cx - 3, top + 1, 7, 1);
    for (i = 2; i < H; i++) { var lx = Math.round(cx + Math.sin(i / 3) * 2); px(g, i < 8 ? '#ffb347' : '#ff6a2a', lx, top + i, 1, 1); if (i > 10) px(g, '#c8341a', lx + 1, top + i, 1, 1); }
    g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,100,30,0.12)'; g.fillRect(cx - 12, top - 8, 24, 10); g.globalCompositeOperation = 'source-over';
  }
  function drawBigMountain(g, cx, top) {
    var H = 26;
    for (var i = 0; i < H; i++) {
      var hw = Math.round(i * 1.25), cap = i < 9 + Math.round(Math.sin(i * 1.7) * 1.5);
      px(g, cap ? '#ffffff' : '#7a869a', cx - hw, top + i, hw + 1, 1);
      px(g, cap ? '#cfdbea' : '#56627a', cx + 1, top + i, hw, 1);
      px(g, '#4a5468', cx - hw - 1, top + i, 1, 1); px(g, '#4a5468', cx + hw + 1, top + i, 1, 1);   // ふち（雪の地面と見分ける）
    }
  }
  // ---- 上に重ねる小さな動き ----
  var fxCv = null, fxT = null, parts = [], fxTheme = null;
  function startFx(theme, scrollEl) {
    if (!fxCv) { fxCv = document.createElement('canvas'); fxCv.className = 'world-fx'; fxCv.setAttribute('aria-hidden', 'true'); }
    var box = scrollEl.parentNode; if (fxCv.parentNode !== box) box.appendChild(fxCv);
    // マップの見えている所（スクロールする枠）にぴったり重ねる
    var r = scrollEl.getBoundingClientRect(), cw = Math.max(1, Math.ceil(r.width / P)), ch = Math.max(1, Math.ceil(r.height / P));
    fxCv.style.left = r.left + 'px'; fxCv.style.top = r.top + 'px'; fxCv.style.width = (cw * P) + 'px'; fxCv.style.height = (ch * P) + 'px';
    fxCv.width = cw; fxCv.height = ch;
    if (fxTheme !== theme || !parts.length) {
      fxTheme = theme; parts = [];
      var n = theme === 'snow' ? 70 : theme === 'volcano' ? 45 : 26;
      for (var i = 0; i < n; i++) parts.push(newPart(theme, cw, ch, true));
    }
    if (fxT) clearInterval(fxT);
    fxT = setInterval(function () {
      if (G.currentScreen !== 'world') return;
      var g = fxCv.getContext('2d'); g.clearRect(0, 0, cw, ch);
      parts.forEach(function (p, i) {
        p.t += 0.07; p.x += p.vx + Math.sin(p.t * p.w) * p.sway; p.y += p.vy;
        if (p.y > ch + 2 || p.y < -2 || p.x < -2 || p.x > cw + 2 || p.t > p.life) parts[i] = p = newPart(theme, cw, ch, false);
        var a = theme === 'grass' ? 0.4 + 0.6 * Math.max(0, Math.sin(p.t * 2.2 + p.ph)) : theme === 'volcano' ? Math.max(0, 1 - p.t / p.life) : 0.9;
        g.globalAlpha = a; g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
        if (theme !== 'snow' && p.s === 1 && a > 0.6) { g.globalAlpha = a * 0.25; g.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3); }
      });
      g.globalAlpha = 1;
    }, 66);
  }
  function newPart(theme, cw, ch, anyY) {
    var r = Math.random;
    if (theme === 'snow') return { x: r() * cw, y: anyY ? r() * ch : -1, vx: -0.08, vy: 0.25 + r() * 0.35, sway: 0.15, w: 1 + r(), t: r() * 6, ph: 0, life: 1e9, s: r() < 0.25 ? 2 : 1, c: '#ffffff' };
    if (theme === 'volcano') return { x: r() * cw, y: anyY ? r() * ch : ch + 1, vx: 0.05, vy: -(0.3 + r() * 0.5), sway: 0.2, w: 1.5 + r(), t: anyY ? r() * 4 : 0, ph: 0, life: 3 + r() * 4, s: 1, c: r() < 0.5 ? '#ff8a2a' : '#ffd84a' };
    return { x: r() * cw, y: r() * ch, vx: (r() - 0.5) * 0.1, vy: (r() - 0.5) * 0.08, sway: 0.12, w: 0.7 + r(), t: r() * 6, ph: r() * 6, life: 30 + r() * 30, s: 1, c: '#e8ff8a' };
  }

  var cache = {};
  // showWorld から呼ぶ：map（#world-map）の後ろに背景、scroll（#world-scroll）の上に動き
  G.worldBg = function (act, theme, mapEl, scrollEl) {
    var w = scrollEl.clientWidth || mapEl.clientWidth, h = mapEl.clientHeight, key = act + ':' + theme + ':' + w + 'x' + h;
    var cv = mapEl.querySelector('canvas.world-bg');
    if (!cv) { cv = document.createElement('canvas'); cv.className = 'world-bg'; cv.setAttribute('aria-hidden', 'true'); mapEl.insertBefore(cv, mapEl.firstChild); }
    if (cv.dataset.key !== key) {
      var src = cache[key] || (cache[key] = build(theme, w, h, act * 17 + 5));
      cv.width = src.width; cv.height = src.height; cv.getContext('2d').drawImage(src, 0, 0); cv.dataset.key = key;
    }
    var mw = mapEl.clientWidth;
    cv.style.width = (cv.width * P) + 'px'; cv.style.height = (cv.height * P) + 'px';
    cv.style.left = Math.round((mw - w) / 2) + 'px';
    startFx(theme, scrollEl);
  };
})();

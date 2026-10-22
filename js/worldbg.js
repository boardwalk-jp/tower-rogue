// ワールドマップ（全体マップ）の背景：層ごとの景色をドット絵で描く（画像ファイルは使わない）
// 第1層 草原：草のむら・川・木・花 ／ 第2層 雪山：雪原・山・凍った湖・雪の針葉樹 ／ 第3層 火山：黒い岩・溶岩の川・ひび・上に大きな火山
// 上に重ねる小さな動き：草原＝ホタル、雪山＝ふる雪、火山＝舞い上がる火の粉
'use strict';
(function () {
  var G = window.G = window.G || {};
  var P = 2;   // 背景の1ドット＝画面の2px（2026-10-22 に3→2。戦闘画面の細かさに近づけた）

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

  // ======================================================================
  // 2026-10-22 新デザイン：戦闘画面と同じ「左上から光」「黒いふち取りなし」の描き方で、ドットを細かく（1ドット＝2px）
  //   地面は戦闘画面と同じ色に、なめらかな起伏の明暗をつける。川・凍った川・溶岩の川は岸のふちに光と影。
  //   木・雪の木・岩の柱・岩は小さな立体の絵を、上から順に並べて描く。いちばん上（ボスのあたり）に層ごとの目印
  // ======================================================================
  var GROUND = {
    grass:   { c: ['#3f7a37', '#468338', '#4f8f40', '#5a9846'], hi: '#6aa852', lo: '#2f5e2a', tuft: '#2c5a28' },
    snow:    { c: ['#d3dbe6', '#dde4ee', '#e7edf5', '#f1f5fa'], hi: '#ffffff', lo: '#b4c0d0', tuft: '#a8b4c4' },
    volcano: { c: ['#2c2224', '#31272a', '#372c2e', '#3d3133'], hi: '#4a3c3e', lo: '#241a1c', tuft: '#171011' }
  };
  function build(theme, w, h, seed) {
    var T = THEMES[theme] || THEMES.grass, GD = GROUND[theme] || GROUND.grass, cw = Math.ceil(w / P), ch = Math.ceil(h / P);
    var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    var g = cv.getContext('2d'), img = g.createImageData(cw, ch), d = img.data, x, y, k, i;
    var gc = GD.c.map(rgb), ghi = rgb(GD.hi), glo = rgb(GD.lo);
    // 川の通り道（上から下へくねくね）。草原は1本、雪山・火山は2本
    function riverX(y) { return cw * (0.14 + 0.08 * Math.sin(y / 46 + seed) + 0.04 * Math.sin(y / 19 + seed * 2)); }
    function river2X(y) { return cw * (0.86 + 0.06 * Math.sin(y / 62 + seed * 3)); }
    function rdist(x, y) { var a = Math.abs(x - riverX(y)); return theme === 'grass' ? a : Math.min(a, Math.abs(x - river2X(y))); }
    var RW = theme === 'volcano' ? 4.2 : 5.5;
    var RV = theme === 'grass' ? ['#2a5a8a', '#3a78b0', '#5a9cd0', '#a8d4f0'] : theme === 'snow' ? ['#8ab4d4', '#a8cce4', '#c6e2f4', '#ffffff'] : ['#a82814', '#d84418', '#ff7a24', '#ffd060'];
    var rv = RV.map(rgb), rimUp = rgb(theme === 'volcano' ? '#120a08' : theme === 'snow' ? '#7a8aa0' : '#3a4a24'), rimDn = rgb(theme === 'volcano' ? '#ff9a3a' : theme === 'snow' ? '#ffffff' : '#a8a070');
    function H(x, y) { return fbm(x / 22, y / 22, seed); }
    for (y = 0; y < ch; y++) for (x = 0; x < cw; x++) {
      var hv = H(x, y), lit = hv - H(x + 1, y + 1), c = gc[hv < 0.4 ? 0 : hv < 0.5 ? 1 : hv < 0.6 ? 2 : 3];
      var LT = theme === 'volcano' ? 0.022 : theme === 'grass' ? 0.017 : 0.012;   // 起伏の明暗が出すぎない強さ（地域ごと）
      if (lit > LT) c = ghi; else if (lit < -LT * 1.2) c = glo;   // 起伏：左上を向いた面は明るく、右下を向いた面は暗い
      var r = hash(x, y, seed + 3);
      if (r < 0.03) c = r < 0.015 ? ghi : glo;
      var dd = rdist(x, y);
      if (dd < RW + 1.6) {   // 川の岸：上（奥）のふちは暗く、下（手前）のふちは明るい
        c = dd < RW + 0.6 ? (hash(x, y, 77) < 0.5 ? rimUp : rimDn) : glo;
      }
      if (dd < RW) {
        var t2 = dd / RW; c = rv[t2 < 0.3 ? 2 : t2 < 0.65 ? 1 : 0];
        if (theme !== 'volcano' && hash(x, y, seed + 9) < 0.04) c = rv[3];
        if (theme === 'volcano' && t2 < 0.4 && fbm(x / 6, y / 10, 99) > 0.66) c = rv[3];
      }
      i = (y * cw + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    if (theme === 'volcano') {   // 溶岩の川のまわりの光と、地面のひび
      g.globalCompositeOperation = 'lighter';
      for (y = 0; y < ch; y += 2) { g.fillStyle = 'rgba(255,90,30,0.06)'; g.fillRect(riverX(y) - 12, y, 24, 2); g.fillRect(river2X(y) - 12, y, 24, 2); }
      g.globalCompositeOperation = 'source-over';
      for (k = 0; k < Math.floor(ch / 10); k++) {
        var cx = hash(k, 1, seed) * cw, cy = hash(k, 2, seed) * ch, ang = hash(k, 3, seed) * Math.PI * 2;
        for (var s2 = 0; s2 < 18; s2++) { ang += (hash(k, s2, seed + 5) - 0.5) * 1.1; cx += Math.cos(ang); cy += Math.sin(ang); px(g, hash(k, s2, seed + 6) < 0.3 ? '#ff5a1a' : '#120c0a', Math.round(cx), Math.round(cy)); }
      }
    }
    if (theme === 'snow') {   // 凍った湖：角の丸い形・上のふちに雪・白いひび
      for (k = 0; k < Math.floor(ch / 150) + 1; k++) {
        var lx = cw * (0.32 + hash(k, 4, seed) * 0.36), ly = ch * (0.15 + hash(k, 5, seed) * 0.75), rx = 14 + hash(k, 6, seed) * 10, ry = 7 + hash(k, 7, seed) * 4;
        for (y = -ry - 2; y <= ry + 2; y++) for (x = -rx - 2; x <= rx + 2; x++) {
          var e = (x * x) / (rx * rx) + (y * y) / (ry * ry); if (e > 1.2) continue;
          px(g, e > 0.9 ? (y < 0 ? '#ffffff' : '#9fb2c8') : (y < -ry * 0.3 ? '#c6e2f4' : '#a8d0ea'), Math.round(lx + x), Math.round(ly + y));
        }
        for (i = 0; i < 3; i++) { var sx0 = lx - rx * 0.6 + i * rx * 0.5; for (var q = 0; q < 6; q++) px(g, '#ffffff', Math.round(sx0 + q), Math.round(ly - 2 + ((q + i) % 3))); }
      }
    }
    // 木・岩などを並べる（集まって生える所＝ノイズの高い所）。まん中の道すじは少しまばらに（マスが見やすいように）
    var things = [], cnt = Math.floor(cw * ch / (theme === 'grass' ? 125 : theme === 'snow' ? 95 : 105));
    for (k = 0; k < cnt; k++) {
      var tx = Math.floor(hash(k, 11, seed) * cw), ty = Math.floor(hash(k, 12, seed) * ch);
      if (rdist(tx, ty) < RW + 5 || ty < 46) continue;
      var f = fbm(tx / 26, ty / 26, seed + 21), mid = Math.abs(tx / cw - 0.5) < 0.3;
      if (mid && hash(k, 16, seed) < 0.7) continue;
      var kind = theme === 'snow' && f > 0.66 ? 'mount' : theme === 'volcano' && f > 0.64 ? 'spire' : f > 0.5 ? 'tree' : hash(k, 13, seed) < 0.18 ? 'rock' : hash(k, 14, seed) < 0.35 ? 'flower' : null;
      if (kind) things.push({ x: tx, y: ty, k: kind, v: hash(k, 15, seed) });
    }
    things.sort(function (a, b) { return a.y - b.y; });
    things.forEach(function (o) { thing2(g, T, theme, o); });
    // いちばん上：層ごとの目印（ボスのいる所）
    var mx = Math.round(cw / 2);
    if (theme === 'volcano') volcano2(g, mx, 8); else if (theme === 'snow') mountain2(g, mx, 6); else mesa(g, mx, 10);
    return cv;
  }
  function px(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(x, y, w || 1, h || 1); }
  function ellP(g, c, cx, cy, rx, ry) { for (var dy = -ry; dy <= ry; dy++) { var hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry || 1)))); px(g, c, cx - hw, cy + dy, hw * 2 + 1, 1); } }
  // 小さな立体の絵（左上から光）。(x,y)＝足もと
  function thing2(g, T, theme, o) {
    var x = o.x, y = o.y, v = o.v;
    if (o.k === 'tree') {
      if (theme === 'grass') {        // 丸い木：影・幹・3段の葉（奥は暗く、左上は明るい）
        ellP(g, 'rgba(0,0,0,.28)', x + 1, y, 4, 1);
        px(g, '#5a3a20', x, y - 4, 2, 4); px(g, '#3e2814', x + 1, y - 4, 1, 4);
        ellP(g, '#2a5e28', x, y - 7, 5, 4); ellP(g, '#3c8436', x - 1, y - 8, 4, 3); ellP(g, '#56a046', x - 2, y - 9, 2, 2); px(g, '#8cd06a', x - 3, y - 10);
      } else if (theme === 'snow') {  // 雪の針葉樹：3段の三角。上は雪、右は影
        ellP(g, 'rgba(60,80,110,.25)', x + 1, y, 4, 1);
        px(g, '#4a3220', x, y - 2, 1, 2);
        [[0, 5, 4], [-4, 4, 3], [-7, 3, 3]].forEach(function (L) { for (var j = 0; j < L[2] + 1; j++) { var hw = Math.round(L[1] * (j + 1) / (L[2] + 1)); px(g, j < 1 ? '#ffffff' : '#2d6a5a', x - hw, y - 3 + L[0] - L[2] + j, hw + 1, 1); px(g, j < 1 ? '#c4d4e6' : '#1f4a44', x + 1, y - 3 + L[0] - L[2] + j, hw, 1); } });
      } else {                         // 火山：枯れた黒い木
        px(g, '#2e2420', x, y - 7, 1, 7); px(g, '#2e2420', x - 2, y - 6, 2, 1); px(g, '#2e2420', x + 1, y - 4, 2, 1); px(g, '#4a3a32', x - 1, y - 7, 1, 2);
        if (v < 0.35) px(g, '#ff6a2a', x, y - 8);
      }
    } else if (o.k === 'rock') {
      var rc = theme === 'snow' ? ['#6c7686', '#8b95a5', '#ffffff'] : theme === 'volcano' ? ['#2f2523', '#463836', '#ff6a2a'] : ['#575a61', '#7b7e86', '#a0a3ab'];
      ellP(g, 'rgba(0,0,0,.25)', x + 1, y, 3, 1); ellP(g, rc[0], x, y - 1, 3, 2); ellP(g, rc[1], x - 1, y - 2, 2, 1); px(g, rc[2], x - 2, y - 3, 2, 1);
    } else if (o.k === 'flower') {
      if (theme === 'grass') { px(g, T.flower[Math.floor(v * T.flower.length)], x, y); px(g, '#2c5a28', x, y + 1); }
      else if (theme === 'volcano') { px(g, '#ff8a2a', x, y); g.globalAlpha = 0.3; px(g, '#ff6a2a', x - 1, y - 1, 3, 3); g.globalAlpha = 1; }
      else { px(g, '#ffffff', x, y, 2, 1); px(g, '#b4c0d0', x, y + 1, 2, 1); }
    } else if (o.k === 'mount') {     // 雪山：小さな山（左は明るく右は影・上は雪）
      var hh = 9 + Math.round(v * 7);
      for (var i = 0; i < hh; i++) { var hw2 = Math.round(i * 0.95), cap = i < hh * 0.4 + Math.sin(i * 2) ; px(g, cap ? '#ffffff' : '#8592a6', x - hw2, y - hh + i, hw2 + 1, 1); px(g, cap ? '#c4d0e0' : '#5f6b80', x + 1, y - hh + i, hw2, 1); }
      px(g, '#4e586c', x - hh + 1, y - 1, hh * 2 - 1, 1);
    } else if (o.k === 'spire') {     // 火山：とがった岩の柱（左は明るく右は影・すき間に赤い光）
      var sh = 8 + Math.round(v * 8);
      for (i = 0; i < sh; i++) { var hw3 = 1 + Math.floor(i / 2.5); px(g, '#4a3c38', x - hw3, y - sh + i, hw3, 1); px(g, '#2e2220', x, y - sh + i, hw3, 1); }
      if (v < 0.5) px(g, '#ff6a2a', x, y - Math.round(sh * 0.5), 1, 2);
    }
  }
  // 草原の目印：切り立った茶色い岩山（台形に近い形）。左の面は明るく、右の面は影、上は平らで草が少し、横に地層のすじ（2026-10-22）
  function mesa(g, cx, top) {
    var H = 34, topW = 40, botW = 74, i, x;
    ellP(g, 'rgba(0,0,0,.3)', cx + 4, top + H + 1, botW / 2 + 4, 4);
    for (i = 0; i < H; i++) {
      var w = Math.round(topW + (botW - topW) * Math.pow(i / H, 1.4)), l = cx - (w >> 1), split = Math.round(w * 0.55);
      var band = (i % 7 === 3) || (i % 11 === 8);
      px(g, band ? '#946438' : '#a87a4a', l, top + i, split, 1);          // 左（光の当たる面）
      px(g, band ? '#5a3a20' : '#6a4628', l + split, top + i, w - split, 1);   // 右（影の面）
      px(g, '#c49a64', l, top + i, 1, 1);                                  // 左のふちのハイライト
      px(g, '#4a2e18', l + w - 1, top + i, 1, 1);                          // 右のふちの暗い線
    }
    px(g, '#c49a64', cx - topW / 2, top - 2, topW, 2); px(g, '#d8b07a', cx - topW / 2, top - 2, topW * 0.55, 1);   // 平らな上の面
    for (x = cx - topW / 2; x < cx + topW / 2; x += 3) px(g, '#4f8a3e', x, top - 3 - ((x * 7) % 2), 2, 1);           // 上のふちの草
    for (i = 0; i < 6; i++) { var cxk = cx - 20 + i * 8 + ((i * 5) % 3); for (var j = 0; j < 7 + (i % 3) * 3; j++) px(g, '#4a2e18', cxk + ((j * 3) % 2), top + 6 + j * 3 + (i % 2) * 2, 1, 2); }   // 縦のひび
    [[-34, 2], [30, 3], [-24, 1], [38, 1]].forEach(function (q) { ellP(g, '#6a4628', cx + q[0], top + H - 1, q[1] + 2, q[1] + 1); px(g, '#a87a4a', cx + q[0] - 2, top + H - 2 - q[1], 2, 1); });   // ふもとの岩
  }
  // （旧）草原の目印：丘の上の石の遺跡（くずれた城壁・アーチ・旗）。今は使っていない
  function ruins(g, cx, top) {
    ellP(g, '#3a7032', cx, top + 34, 46, 10); ellP(g, '#4a8a3e', cx - 6, top + 31, 36, 7);
    var S = { t: '#b3aea2', f: '#87827a', s: '#66625b', hi: '#cdc8bc', d: '#42403b' };
    function blk(bx, by, w, h) { px(g, S.f, bx, by - h, w, h); px(g, S.s, bx + w - 2, by - h, 2, h); px(g, S.hi, bx, by - h, 1, h); px(g, S.t, bx, by - h - 2, w, 2); px(g, S.d, bx, by - 1, w, 1); for (var r = by - 3; r > by - h; r -= 3) px(g, S.s, bx + 1, r, w - 2, 1); }
    blk(cx - 30, top + 32, 12, 18); blk(cx - 18, top + 32, 36, 12); blk(cx + 18, top + 32, 12, 22); blk(cx - 6, top + 26, 12, 20);
    px(g, '#1a1410', cx - 3, top + 18, 6, 8); ellP(g, '#1a1410', cx, top + 18, 3, 2);        // アーチの入口
    for (var i = 0; i < 4; i++) px(g, S.t, cx - 29 + i * 3, top + 12 - (i % 2) * 2, 2, 2);  // くずれたぎざぎざ
    px(g, '#5b4632', cx + 23, top + 2, 1, 9); px(g, '#c8341a', cx + 24, top + 2, 5, 3); px(g, '#8a2414', cx + 24, top + 4, 5, 1);   // 旗
  }
  // 雪山の目印：大きな雪山（左は明るく右は影・雪の帽子・岩のすじ）
  function mountain2(g, cx, top) {
    var H = 40;
    for (var i = 0; i < H; i++) {
      var hw = Math.round(i * 1.35), cap = i < 15 + Math.round(Math.sin(i * 1.7) * 2);
      px(g, cap ? '#ffffff' : '#7a869a', cx - hw, top + i, hw + 1, 1);
      px(g, cap ? '#c8d4e4' : '#56627a', cx + 1, top + i, hw, 1);
      if (!cap && i % 5 === 0) px(g, '#9aa6ba', cx - hw + 3, top + i, Math.round(hw * 0.4), 1);
    }
    px(g, '#4e586c', cx - 54, top + H, 109, 1);
  }
  // 火山の目印：大きな火山（左は少し明るく右は影・火口と流れる溶岩・光）
  function volcano2(g, cx, top) {
    var H = 38;
    for (var i = 0; i < H; i++) {
      var w = 8 + i * 2.6, l = Math.round(cx - w / 2);
      px(g, '#3a2c2a', l, top + i, Math.round(w / 2), 1); px(g, '#241a1a', l + Math.round(w / 2), top + i, Math.round(w / 2), 1);
      px(g, '#5a4642', l, top + i, 2, 1);
    }
    px(g, '#ffd060', cx - 3, top, 7, 1); px(g, '#ff7a24', cx - 4, top + 1, 9, 1);
    for (i = 2; i < H; i++) { var lx = Math.round(cx + Math.sin(i / 3.5) * 3); px(g, i < 10 ? '#ffb040' : '#ff6a2a', lx, top + i, 2, 1); if (i > 14) px(g, '#c8341a', lx + 2, top + i, 1, 1); }
    g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,100,30,0.14)'; g.fillRect(cx - 18, top - 10, 36, 14); g.globalCompositeOperation = 'source-over';
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

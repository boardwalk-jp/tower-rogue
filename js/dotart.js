// ドット絵（1マス24×18ドットの疑似3D）：道具と、背景まわりの絵（木・雪の木・火山の岩柱・岩・砦）
// 試作「ドット疑似3D 比較台」の絵をそのまま移したもの。見る角度は48°（マスの縦＝18ドット、高さ1あたり＝16÷16ドット）
// 使い方：G.DotArt.build() で絵を作り置きする。1つの絵は { cv, ax, ay, topY }
//   cv：絵のcanvas／ax, ay：足もと（地面に置く点）の位置／topY：足もとから見た絵のてっぺん（負の数）
'use strict';
var G = window.G = window.G || {};

(function () {
  var TW = 24, TD = 18, HU = 16;
  function ds(v) { return Math.max(1, Math.round(v * TD / 18)); }
  function hs(v) { return Math.max(1, Math.round(v * HU / 16)); }

  // ---------- 1ドット単位で描く道具 ----------
  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d'); g.imageSmoothingEnabled = false; return { cv: c, c: g }; }
  function R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); }
  function ell(c, cx, cy, rx, ry, col) {
    cx = Math.round(cx); cy = Math.round(cy); c.fillStyle = col;
    if (ry < 1) { c.fillRect(cx - rx, cy, 2 * rx + 1, 1); return; }
    for (var dy = -ry; dy <= ry; dy++) {
      var k = dy / ry, hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - k * k)));
      c.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
    }
  }
  function disc(c, cx, cy, r, col) { ell(c, cx, cy, r, r, col); }

  // 立体の部品：上の面(t)・手前の面(f)・右の影(s)・ハイライト(hi)・線(d)
  function box(c, cx, by, w, dp, hh, P) {
    var x0 = cx - (w >> 1), sw = Math.max(2, w >> 2);
    R(c, x0, by - hh, w, hh, P.f);
    R(c, x0 + w - sw, by - hh, sw, hh, P.s);
    R(c, x0, by - hh, 1, hh, P.hi);
    R(c, x0, by - 1, w, 1, P.d);
    R(c, x0, by - hh - dp, w, dp, P.t);
    R(c, x0, by - hh - dp, w, 1, P.hi);
    R(c, x0 + w - 1, by - hh - dp, 1, dp, P.s);
  }
  function cyl(c, cx, bc, rx, hh, P) {
    var ry = Math.max(2, Math.round(rx * TD / TW));
    for (var i = -rx; i <= rx; i++) {
      var k = i / rx, eh = Math.round(ry * Math.sqrt(Math.max(0, 1 - k * k)));
      var col = k < -0.45 ? P.hi : k < 0.15 ? P.f : k < 0.6 ? P.s : P.d;
      R(c, cx + i, bc - hh, 1, hh + eh, col);
    }
    ell(c, cx, bc - hh, rx, ry, P.t);
    return ry;
  }

  // ---------- 色 ----------
  var P_ROCK = { t: '#807d78', f: '#5f5c58', s: '#43413e', hi: '#9d9a94', d: '#262523' };
  var P_CAST = { t: '#d6ceb8', f: '#aaa18c', s: '#857d6b', hi: '#e8e0ca', d: '#4f4a3f' };

  function done(s, ax, ay, topY) { return { cv: s.cv, ax: ax, ay: ay, topY: topY }; }

  // ---------- 木（草原） ----------
  function buildTree(v) {
    var s = mk(30, 44), c = s.c, cx = 15, by = 38, k = v ? 0.85 : 1;
    R(c, cx - 1, by - hs(8), 3, hs(8), '#6b4a2a'); R(c, cx + 1, by - hs(8), 1, hs(8), '#4a321a');
    disc(c, cx, by - hs(11 * k), Math.round(8 * k), '#2a6628');
    disc(c, cx - 1, by - hs(15 * k), Math.round(7 * k), '#3c8a36');
    disc(c, cx + 2, by - hs(17 * k), Math.round(5 * k), '#4a9c40');
    disc(c, cx - 3, by - hs(19 * k), 2, '#7cc860');
    ell(c, cx, by - hs(9), 6, 2, '#245a24');
    return done(s, cx, by, 0);
  }

  // ---------- 雪の針葉樹（雪山） ----------
  function cone(c, cx, y0, h, hw, P) {   // 三角の1段。上の部分は雪、左は明るく右は影
    var snowRows = Math.round(h * 0.42), j, half;
    for (j = 0; j < h; j++) {
      half = Math.max(1, Math.round(hw * (j + 1) / h));
      var snow = j < snowRows, lit = snow ? P.snL : P.gL, shd = snow ? P.snS : P.gS;
      R(c, cx - half, y0 + j, half + 1, 1, lit);
      R(c, cx + 1, y0 + j, half, 1, shd);
      if (j === snowRows) for (var i = -half; i <= half; i += 2) R(c, cx + i, y0 + j, 1, 1, i < 0 ? P.snL : P.snS);
      if (j === h - 1) R(c, cx - half, y0 + j, half * 2 + 1, 1, P.gD);
    }
  }
  function buildPine(v) {
    var s = mk(30, 46), c = s.c, cx = 15, by = 42, P = { snL: '#f4f8fc', snS: '#c4d4e6', gL: '#2d6a5a', gS: '#1f4a44', gD: '#14302c' };
    R(c, cx - 1, by - hs(6), 3, hs(6), '#5a3a22'); R(c, cx + 1, by - hs(6), 1, hs(6), '#3e2814');
    ell(c, cx, by - 1, 6, 2, '#dfe8f2');
    if (v) { cone(c, cx, by - 17, 13, 9, P); cone(c, cx, by - 27, 12, 7, P); cone(c, cx, by - 36, 11, 5, P); R(c, cx, by - 38, 1, 2, P.snL); }
    else { cone(c, cx, by - 18, 14, 10, P); cone(c, cx, by - 29, 13, 8, P); cone(c, cx, by - 39, 12, 6, P); R(c, cx, by - 41, 1, 2, P.snL); }
    return done(s, cx, by, 0);
  }

  // ---------- 火山の岩の柱（火山） ----------
  function spike(c, cx, by, H, hw, lean, P) {   // 上が細い岩の柱。左は明るく右は影
    for (var j = 0; j < H; j++) {
      var half = Math.round(1 + hw * Math.pow(j / Math.max(1, H - 1), 0.85)), x = cx + Math.round((H - 1 - j) / H * lean);
      R(c, x - half, by - H + j, half + 1, 1, P.l);
      R(c, x + 1, by - H + j, half, 1, P.d);
      R(c, x - half, by - H + j, 1, 1, P.hi); R(c, x + half, by - H + j, 1, 1, P.e);
    }
  }
  function buildSpire(v) {
    var s = mk(30, 46), c = s.c, cx = 15, by = 42, P = { l: '#4a3c38', d: '#2e2220', hi: '#6a5a54', e: '#1a1210' };
    ell(c, cx, by - 1, 11, 3, '#2e2220'); ell(c, cx - 2, by - 2, 8, 2, '#3a2a28');
    spike(c, cx - 8, by - 1, 18, 4, v ? 1 : -1, P);
    spike(c, cx + 1, by - 1, 36, 8, v ? 3 : 2, P);
    // 割れ目のマグマ
    R(c, cx - 2 + (v ? 1 : 0), by - 27, 1, 3, '#ff6a2a'); R(c, cx - 1 + (v ? 1 : 0), by - 24, 1, 2, '#ffb040');
    R(c, cx + 3, by - 16, 1, 3, '#ff6a2a'); R(c, cx + 3, by - 15, 1, 1, '#ffd84a');
    R(c, cx - 9, by - 8, 1, 2, '#ff6a2a');
    R(c, cx + 8, by - 3, 1, 1, '#ff8a2a'); R(c, cx - 6, by - 2, 1, 1, '#ffb040');
    return done(s, cx, by, 0);
  }

  // ---------- 岩（草原・雪山・火山で色と形を変える） ----------
  function buildRock(kind) {
    var s = mk(24, 20), c = s.c;
    if (kind === 'snow') {          // 雪をかぶった岩：上が白く、下の岩肌は青灰色
      ell(c, 12, 14, 9, 5, '#4f5868'); ell(c, 11, 12, 8, 5, '#6c7686'); ell(c, 10, 10, 7, 4, '#8b95a5');
      ell(c, 10, 8, 6, 3, '#e8f0f8'); ell(c, 9, 7, 4, 2, '#ffffff'); ell(c, 14, 9, 3, 2, '#cfdcec');
      R(c, 5, 12, 2, 1, '#aeb8c6'); R(c, 15, 13, 3, 1, '#3e4654');
    } else if (kind === 'volcano') { // 黒い溶岩岩：ごつごつして、すき間に赤い光
      ell(c, 12, 14, 9, 5, '#1c1514'); ell(c, 11, 12, 8, 5, '#2f2523'); ell(c, 10, 10, 6, 4, '#463836');
      ell(c, 9, 8, 3, 2, '#5e4c48'); R(c, 8, 7, 2, 1, '#7e6862');
      R(c, 13, 10, 1, 3, '#ff6a2a'); R(c, 14, 12, 1, 2, '#ffb040'); R(c, 7, 13, 2, 1, '#ff6a2a'); R(c, 16, 14, 1, 1, '#ff8a2a');
    } else {                         // 草原：灰色の岩
      ell(c, 12, 14, 8, 5, '#575a61'); ell(c, 11, 12, 7, 4, '#7b7e86'); ell(c, 10, 10, 4, 2, '#a0a3ab'); R(c, 8, 9, 2, 1, '#cfd2da');
      R(c, 5, 14, 3, 1, '#3e4047'); ell(c, 4, 15, 2, 1, '#3a6a30');
    }
    return done(s, 12, 15, 0);
  }

  // ---------- 砦（ゴール） ----------

  function banner(c, x, y, w, h, col, trim) {   // 垂れ幕（上のまん中が x、下は切れこみ、まん中に金のしるし）
    var x0 = x - (w >> 1);
    R(c, x0, y, w, h, col); R(c, x0, y, w, 1, trim);
    R(c, x - 1, y + 4, 2, 2, trim); R(c, x - 2, y + 5, 4, 1, trim); R(c, x - 1, y + 6, 2, 1, trim);
    R(c, x - 1, y + h - 3, 2, 3, 'rgba(0,0,0,0)');
    c.clearRect(x - 1, y + h - 1, 2, 1); c.clearRect(x, y + h - 2, 1, 1);
  }
  function torch(c, x, y) { R(c, x, y, 1, 4, '#4a2e16'); R(c, x - 1, y - 2, 3, 2, '#ff8a2a'); R(c, x, y - 3, 1, 1, '#ffd84a'); }

  // 石の要塞（ゴール）。地域ごとに少し変える（草原＝土台にこけ、雪山＝屋上に雪とつらら、火山＝黒っぽい石とすす）
  function hsh(x, y) { var h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  var FORT_P = {
    grass:   { t: '#bcbfc6', f: ['#959aa4', '#8b909a', '#a0a5ae'], m: '#6e737e', s: 'rgba(24,28,40,.34)', hi: '#d6d9df', d: '#30333c', cap: '#cdd0d6', ban: '#b02c34', glow: '#ffd27a' },
    snow:    { t: '#f4f8fc', f: ['#9aa0ac', '#8f95a2', '#a6abb6'], m: '#737a88', s: 'rgba(24,30,48,.34)', hi: '#dfe3ea', d: '#30343e', cap: '#ffffff', ban: '#a82a36', glow: '#ffd27a' },
    volcano: { t: '#8a8488', f: ['#6e696e', '#646064', '#78737a'], m: '#4c484e', s: 'rgba(10,6,8,.38)', hi: '#a29ca2', d: '#1e1b1e', cap: '#9a9498', ban: '#7e1a22', glow: '#ffb040' }
  };
  function buildFort(theme) {
    var P = FORT_P[theme], snow = theme === 'snow', volc = theme === 'volcano';
    var s = mk(112, 106), c = s.c, cx = 56, by = 100, i;
    // 石を積んだ手前の面：段ごとにずらした石、石ごとに少し色を変える、右の端は影
    function masonry(x, y, w, h, seed) {
      for (var r = 0; r < h; r += 4) {
        var off = ((r >> 2) & 1) ? 4 : 0;
        for (var bx = -off; bx < w; bx += 8) {
          var x0 = Math.max(0, bx), x1 = Math.min(w, bx + 8), hv = hsh(seed + bx, r);
          R(c, x + x0, y + r, x1 - x0, Math.min(4, h - r), P.f[hv < 0.55 ? 0 : hv < 0.8 ? 1 : 2]);
          if (bx > 0) R(c, x + bx, y + r, 1, Math.min(3, h - r), P.m);
        }
        if (r + 3 < h) R(c, x, y + r + 3, w, 1, P.m);
      }
      var sw = Math.max(2, w >> 2); c.fillStyle = P.s; c.fillRect(x + w - sw, y, sw, h);
      R(c, x, y, 1, h, P.hi);
    }
    // 屋上のぎざぎざ（奥の列→手前の列）と、手前の面の上の出っぱり（石の受け）
    function parapet(x, yTop, w, dp) {
      var q;
      for (q = 1; q < w - 2; q += 6) { R(c, x + q, yTop - dp - 3, 4, 3, P.f[1]); R(c, x + q, yTop - dp - 3, 4, 1, P.cap); }
      R(c, x, yTop - dp, 2, dp, P.f[1]); R(c, x + w - 2, yTop - dp, 2, dp, P.f[1]);
      for (q = 1; q < w - 2; q += 6) {
        R(c, x + q, yTop - 4, 4, 4, P.f[0]); R(c, x + q, yTop - 4, 1, 4, P.hi); R(c, x + q + 3, yTop - 4, 1, 4, P.m);
        R(c, x + q, yTop - 5, 4, 1, P.cap);
      }
      R(c, x - 1, yTop, w + 2, 2, P.f[2]); R(c, x - 1, yTop, w + 2, 1, P.hi);           // 出っぱりの帯
      for (q = 1; q < w; q += 3) R(c, x + q, yTop + 2, 1, 1, P.d);                        // 帯の下の影（石の受け）
    }
    // 1つの塔（または壁）：屋上の床、石の面、下の太い土台、屋上のぎざぎざ
    function block(bcx, bby, w, dp, hh, seed) {
      var x0 = bcx - (w >> 1), q, sw = Math.max(2, w >> 2);
      R(c, x0, bby - hh - dp, w, dp, P.t);
      if (snow) for (q = 0; q < w; q += 2) R(c, x0 + q, bby - hh - dp + (hsh(seed, q) < 0.5 ? 1 : 2), 1, 1, '#dfe8f2');
      masonry(x0, bby - hh, w, hh, seed);
      R(c, x0 - 1, bby - 5, w + 2, 5, P.f[1]); R(c, x0 - 1, bby - 5, w + 2, 1, P.hi); R(c, x0 - 1, bby - 1, w + 2, 1, P.d);
      c.fillStyle = P.s; c.fillRect(x0 + w - sw, bby - 5, sw + 1, 5);
      parapet(x0, bby - hh, w, dp);
      if (snow) { R(c, x0 - 1, bby - hh - 1, w + 2, 1, '#ffffff'); for (q = 2; q < w; q += 5) if (hsh(seed + 3, q) < 0.6) R(c, x0 + q, bby - hh + 2, 1, 1 + ((q * 7) % 3), '#cfe6f6'); }
      if (volc) { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x0 - 1, bby - 10, w + 2, 5); }
      if (theme === 'grass') for (q = 0; q < w; q += 3) if (hsh(seed + 9, q) < 0.45) R(c, x0 + q, bby - 2 - ((q * 5) % 3), 1, 2, '#4f7a3a');
      return x0;
    }
    function slit(x, y) { R(c, x, y, 2, 7, P.d); R(c, x - 1, y + 2, 4, 2, P.d); R(c, x, y + 1, 1, 5, '#000000'); }
    function win(x, y) { R(c, x - 1, y - 1, 6, 8, P.hi); R(c, x, y, 4, 6, '#1c1410'); R(c, x + 1, y + 2, 2, 3, P.glow); R(c, x - 1, y + 6, 6, 1, P.m); }
    function flagPole(x, y, h, col) { R(c, x, y - h, 1, h, '#4a3220'); R(c, x, y - h - 1, 1, 1, '#d8b040'); R(c, x + 1, y - h, 7, 4, col); R(c, x + 1, y - h + 4, 4, 1, col); R(c, x + 1, y - h, 7, 1, 'rgba(255,255,255,.25)'); }

    ell(c, cx + 3, by, 50, 5, 'rgba(0,0,0,.24)');                                                // 地面の影
    block(cx, by - 4, 84, 8, 22, 11);                                                            // 奥の壁（塔と門のあいだ）
    [-38, 38].forEach(function (dx, k) {                                                         // 左右の角の塔
      var tx = cx + dx;
      block(tx, by, 22, 12, 38, 30 + k * 17);
      slit(tx - 1, by - 31); slit(tx - 1, by - 18);
      flagPole(tx + (dx < 0 ? -7 : 5), by - 38 - 12 - 2, 10, P.ban);
    });
    block(cx, by + 1, 34, 14, 48, 77);                                                           // まん中の門の塔
    // 門：石のアーチ（明るい石のふち・まん中にかなめ石）、半分上げた鉄格子、開いた木の扉
    var gw = 16, gh = 22, gxa = cx - (gw >> 1), gyTop = by + 1 - gh;
    for (i = 0; i <= 8; i++) { var a = Math.PI * i / 8, ax = Math.round(cx - Math.cos(a) * 10), ay = Math.round(gyTop - Math.sin(a) * 6); R(c, ax - 1, ay - 1, 3, 3, i === 4 ? P.hi : P.f[2]); R(c, ax - 1, ay + 1, 3, 1, P.m); }
    R(c, gxa - 2, gyTop, 2, gh, P.f[2]); R(c, gxa + gw, gyTop, 2, gh, P.f[2]); R(c, gxa - 2, gyTop, 1, gh, P.hi);
    R(c, gxa, gyTop, gw, gh, '#120e0c'); ell(c, cx, gyTop, 8, 5, '#120e0c');
    R(c, gxa, gyTop + 4, 3, gh - 4, '#5a3a20'); R(c, gxa + gw - 3, gyTop + 4, 3, gh - 4, '#4a2e18');
    for (i = gxa + 1; i < gxa + gw; i += 3) { R(c, i, gyTop - 3, 1, 13, '#5c5f6a'); R(c, i, gyTop + 10, 1, 2, '#8a8e9a'); }
    R(c, gxa, gyTop + 1, gw, 1, '#5c5f6a'); R(c, gxa, gyTop + 6, gw, 1, '#5c5f6a');
    R(c, gxa - 1, by, gw + 2, 1, P.hi);
    // 門の上の窓・垂れ幕・旗・たいまつ
    win(cx - 2, by + 1 - 38);
    banner(c, cx - 12, by + 1 - 46, 7, 17, P.ban, '#e8c040'); banner(c, cx + 12, by + 1 - 46, 7, 17, P.ban, '#e8c040');
    flagPole(cx, by + 1 - 48 - 14 - 2, 14, '#d03a30');
    [-13, 13].forEach(function (dx) { var tx = cx + dx; c.fillStyle = 'rgba(255,170,60,.22)'; c.fillRect(tx - 3, by - 20, 7, 7); torch(c, tx, by - 15); });
    return done(s, cx, by, 0);
  }

  var built = null;
  G.DotArt = {
    TW: TW, TD: TD,
    mk: mk, R: R, ell: ell, disc: disc, box: box, cyl: cyl, fort: buildFort,
    build: function () {
      if (built) return built;
      built = { tree: [buildTree(0), buildTree(1)], pine: [buildPine(0), buildPine(1)], spire: [buildSpire(0), buildSpire(1)],
                rock: { grass: buildRock('grass'), snow: buildRock('snow'), volcano: buildRock('volcano') }, castle: { grass: buildFort('grass'), snow: buildFort('snow'), volcano: buildFort('volcano') } };
      return built;
    }
  };
})();

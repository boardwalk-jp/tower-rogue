// ドット絵（1マス24×18ドットの疑似3D）：道具と、背景まわりの絵（木・雪の木・火山の岩柱・岩・洞穴・城）
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

  // ---------- 岩 ----------
  function buildRock() {
    var s = mk(22, 18), c = s.c;
    ell(c, 11, 12, 8, 5, '#575a61'); ell(c, 10, 10, 7, 4, '#7b7e86'); ell(c, 9, 8, 4, 2, '#a0a3ab'); R(c, 7, 7, 2, 1, '#cfd2da');
    return done(s, 11, 14, 0);
  }

  // ---------- 入口の洞穴 ----------
  function box2(c, cx, by, w, dp, hh, P) { box(c, cx, by, w, dp, hh, P); }
  function buildGate() {
    var s = mk(36, 44), c = s.c, cx = 18, fb = 38;
    box2(c, cx, fb, 28, ds(8), hs(14), P_ROCK);
    R(c, cx - 6, fb - hs(10), 12, hs(10), '#0b0806'); ell(c, cx, fb - hs(10), 6, 4, '#0b0806');
    ell(c, cx - 9, fb - hs(14) - ds(3), 5, 3, P_ROCK.t); ell(c, cx + 8, fb - hs(14) - ds(3), 5, 3, P_ROCK.hi);
    return done(s, cx, fb, 0);
  }

  // ---------- 城 ----------
  function buildCastle() {
    var s = mk(112, 100), c = s.c, cx = 56, fb = 94, i, j;
    [-26, 26].forEach(function (dx) {
      var bc = fb - ds(12), tx = cx + dx;
      cyl(c, tx, bc, 10, hs(28), P_CAST);
      var tc = bc - hs(28), rh = hs(13);
      for (j = 0; j < rh; j++) { var half = Math.ceil(12 * (j + 1) / rh); R(c, tx - half, tc - rh + j, half, 1, '#d0503c'); R(c, tx, tc - rh + j, half + 1, 1, '#a03828'); }
      R(c, tx - 2, tc - 5, 3, 6, '#2a1d12');
    });
    var hh = hs(14), dp = ds(10);
    box(c, cx, fb, 72, dp, hh, P_CAST);
    for (i = 0; i < 8; i++) { var mx = cx - 36 + i * 9 + 1; R(c, mx, fb - hh - hs(4), 6, hs(4), P_CAST.f); R(c, mx, fb - hh - hs(4) - 2, 6, 2, P_CAST.t); }
    R(c, cx - 6, fb - hs(8), 12, hs(8), '#140e0a'); ell(c, cx, fb - hs(8), 6, 4, '#140e0a');
    for (i = -4; i <= 4; i += 2) R(c, cx + i, fb - hs(8) - 2, 1, hs(8) + 2, '#3a2a1c');
    R(c, cx + 26, fb - ds(12) - hs(28) - hs(13) - 14, 1, 14, '#6b4a2a'); R(c, cx + 27, fb - ds(12) - hs(28) - hs(13) - 14, 6, 4, '#d04030');
    return done(s, cx, fb, 0);
  }

  var built = null;
  G.DotArt = {
    TW: TW, TD: TD,
    mk: mk, R: R, ell: ell, disc: disc, box: box, cyl: cyl,
    build: function () {
      if (built) return built;
      built = { tree: [buildTree(0), buildTree(1)], pine: [buildPine(0), buildPine(1)], spire: [buildSpire(0), buildSpire(1)],
                rock: buildRock(), gate: buildGate(), castle: buildCastle() };
      return built;
    }
  };
})();

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

  // ---------- 砦（ゴール）。見た目の候補を3つ作って比べられるようにしてある ----------
  var P_STONE = { t: '#b4b8c0', f: '#8c909a', s: '#6a6e7a', hi: '#cdd1d9', d: '#363944' };
  var P_WOOD = { t: '#b88c54', f: '#8d6034', s: '#62411f', hi: '#d09f66', d: '#2c1a0c' };

  function bricks(c, x, y, w, h, col) {   // 石のレンガ目（横線と、段ごとにずらした縦線）
    for (var r = 0; r < h; r += 4) {
      R(c, x, y + r, w, 1, col);
      for (var q = ((r >> 2) & 1) * 3; q < w; q += 6) R(c, x + q, y + r + 1, 1, 3, col);
    }
  }
  function merlons(c, x, y, w, P) {   // 城壁の上のぎざぎざ（手前の面の上に出る）
    for (var i = 0; i < w; i += 6) { R(c, x + i, y - 3, 4, 3, P.f); R(c, x + i, y - 4, 4, 1, P.t); R(c, x + i + 3, y - 3, 1, 3, P.s); }
  }
  function flag(c, x, y, h, col, col2) {  // 旗ざお（地面側が (x, y)）
    R(c, x, y - h, 1, h, '#5a3a1e'); R(c, x + 1, y - h, 7, 5, col); R(c, x + 1, y - h + 4, 5, 1, col2); R(c, x + 1, y - h + 5, 3, 1, col);
  }
  function banner(c, x, y, w, h, col, trim) {   // 垂れ幕（上のまん中が x、下は切れこみ、まん中に金のしるし）
    var x0 = x - (w >> 1);
    R(c, x0, y, w, h, col); R(c, x0, y, w, 1, trim);
    R(c, x - 1, y + 4, 2, 2, trim); R(c, x - 2, y + 5, 4, 1, trim); R(c, x - 1, y + 6, 2, 1, trim);
    R(c, x - 1, y + h - 3, 2, 3, 'rgba(0,0,0,0)');
    c.clearRect(x - 1, y + h - 1, 2, 1); c.clearRect(x, y + h - 2, 1, 1);
  }
  function torch(c, x, y) { R(c, x, y, 1, 4, '#4a2e16'); R(c, x - 1, y - 2, 3, 2, '#ff8a2a'); R(c, x, y - 3, 1, 1, '#ffd84a'); }

  // 案A：木の砦。丸太の柵、四すみの見はりやぐら、丸太の門
  function fortWood() {
    var s = mk(104, 92), c = s.c, cx = 52, by = 86, P = P_WOOD, i, j;
    // 影
    ell(c, cx + 2, by - 1, 48, 5, 'rgba(0,0,0,.22)');
    // 柵（とがった丸太がならぶ）。奥の列→手前の列
    for (i = 0; i < 2; i++) {
      var yb = by - 3 - (1 - i) * 3;
      for (var x = 6 + i * 2; x < 98; x += 4) {
        var hh = 20 + ((x * 7 + i * 3) % 5), top = yb - hh;
        R(c, x, top + 2, 3, hh - 2, P.f); R(c, x, top + 2, 1, hh - 2, P.hi); R(c, x + 2, top + 2, 1, hh - 2, P.s);
        R(c, x + 1, top, 1, 2, P.f); R(c, x + 1, top, 1, 1, P.hi);
        R(c, x, yb - 1, 3, 1, P.d);
      }
    }
    for (j = 0; j < 2; j++) R(c, 6, by - 12 - j * 7, 92, 1, '#d4c08a');   // なわの帯
    // 見はりやぐら（左右）
    [-34, 34].forEach(function (dx) {
      var tx = cx + dx, ty = by - 4;
      for (var k = -1; k <= 1; k += 2) { R(c, tx + k * 7 - 1, ty - 40, 3, 40, P.f); R(c, tx + k * 7 - 1, ty - 40, 1, 40, P.hi); R(c, tx + k * 7 + 1, ty - 40, 1, 40, P.s); }
      for (k = 0; k < 14; k++) { R(c, tx - 6 + k, ty - 8 - Math.round(k * 22 / 14), 1, 1, P.s); R(c, tx + 6 - k, ty - 8 - Math.round(k * 22 / 14), 1, 1, P.d); }   // ななめの補強材
      box(c, tx, ty - 36, 22, 8, 4, P);                                  // 見はり台
      R(c, tx - 11, ty - 36 - 4 - 8, 1, 8, P.d); R(c, tx + 10, ty - 36 - 4 - 8, 1, 8, P.d);
      R(c, tx - 11, ty - 36 - 5, 22, 1, P.d); R(c, tx - 11, ty - 36 - 8, 22, 1, P.hi);           // 手すり
      R(c, tx - 9, ty - 36 - 4, 18, 4, P.f); R(c, tx - 9, ty - 36 - 4, 18, 1, P.hi);               // 台の前の板
      R(c, tx - 4, ty - 36 - 3, 2, 2, '#14100a'); R(c, tx + 3, ty - 36 - 3, 2, 2, '#14100a');
      // 屋根（板ぶき）
      for (j = 0; j < 12; j++) { var half = 3 + j; R(c, tx - half - 1, ty - 36 - 8 - 12 + j, half + 1, 1, j % 3 === 2 ? '#8a3a2a' : '#a8483a'); R(c, tx, ty - 36 - 8 - 12 + j, half + 1, 1, j % 3 === 2 ? '#5a2a20' : '#74342a'); }
      R(c, tx, ty - 36 - 8 - 14, 1, 2, P.d);
    });
    flag(c, cx - 34, by - 4 - 36 - 8 - 12 - 2, 8, '#d04030', '#f0c040');
    // 門：太い柱と横木、ひらいた扉
    R(c, cx - 14, by - 36, 5, 36, P.f); R(c, cx - 14, by - 36, 1, 36, P.hi); R(c, cx - 11, by - 36, 2, 36, P.s);
    R(c, cx + 9, by - 36, 5, 36, P.f); R(c, cx + 9, by - 36, 1, 36, P.hi); R(c, cx + 12, by - 36, 2, 36, P.s);
    R(c, cx - 10, by - 18, 20, 18, '#140c06');
    ell(c, cx, by - 18, 10, 3, '#140c06');
    R(c, cx - 10, by - 17, 3, 17, P.f); R(c, cx - 10, by - 17, 1, 17, P.hi); R(c, cx - 8, by - 17, 1, 17, P.s);   // ひらいた扉（左）
    R(c, cx + 7, by - 17, 3, 17, P.f); R(c, cx + 9, by - 17, 1, 17, P.s);                                       // （右）
    box(c, cx, by - 36, 32, 6, 5, P);                                    // 門の上の横木
    banner(c, cx, by - 36 - 6 - 2, 10, 12, '#c23a30', '#f0c040');
    torch(c, cx - 17, by - 20); torch(c, cx + 17, by - 20);
    // 手前のくいの罠（交差した丸太）
    [-24, 24].forEach(function (dx) {
      for (var k = 0; k < 9; k++) { R(c, cx + dx - 5 + k, by - 2 - k, 2, 1, P.f); R(c, cx + dx + 4 - k, by - 2 - k, 2, 1, P.s); }
      R(c, cx + dx - 5, by - 3, 1, 1, P.hi);
    });
    return done(s, cx, by, 0);
  }

  // 案B：石の要塞。厚い石の壁、四角い角の塔、まん中の門の塔とはね橋
  function fortStone() {
    var s = mk(104, 96), c = s.c, cx = 52, by = 90, P = P_STONE, i;
    ell(c, cx + 2, by - 1, 49, 5, 'rgba(0,0,0,.22)');
    // 壁（左右）
    box(c, cx, by - 2, 94, 8, 17, P); bricks(c, cx - 47, by - 2 - 17 + 1, 94, 16, P.s);
    R(c, cx - 47, by - 2 - 17 - 8, 94, 1, P.hi); merlons(c, cx - 46, by - 2 - 17 - 8 + 8, 92, P);
    // 角の塔（四角）
    [-35, 35].forEach(function (dx) {
      var tx = cx + dx;
      box(c, tx, by, 22, 10, 34, P); bricks(c, tx - 11, by - 33, 22, 33, P.s);
      R(c, tx - 11, by - 34, 22, 1, P.hi);
      merlons(c, tx - 10, by - 34 - 10 + 10, 20, P);
      R(c, tx - 1, by - 24, 2, 7, P.d); R(c, tx - 1, by - 14, 2, 5, P.d);        // 矢の穴
      R(c, tx - 11, by - 34 - 10 - 1, 1, 1, P.hi);
    });
    // 門の塔（まん中）
    box(c, cx, by + 1, 32, 12, 44, P); bricks(c, cx - 16, by + 1 - 43, 32, 43, P.s);
    R(c, cx - 16, by + 1 - 44, 32, 1, P.hi);
    merlons(c, cx - 15, by + 1 - 44 - 12 + 12, 30, P);
    // 門（アーチ＋鉄格子）
    R(c, cx - 8, by - 18, 16, 19, '#141418'); ell(c, cx, by - 18, 8, 5, '#141418');
    for (i = -6; i <= 6; i += 3) R(c, cx + i, by - 21, 1, 22, '#6a6c76');
    R(c, cx - 7, by - 14, 14, 1, '#6a6c76'); R(c, cx - 7, by - 8, 14, 1, '#6a6c76');
    R(c, cx - 10, by - 20, 1, 21, P.hi); R(c, cx + 9, by - 20, 1, 21, P.d);
    // 垂れ幕と旗、たいまつ
    banner(c, cx - 11, by - 40, 7, 16, '#b02c34', '#e8c040'); banner(c, cx + 11, by - 40, 7, 16, '#b02c34', '#e8c040');
    R(c, cx - 3, by - 34, 6, 7, '#141418'); R(c, cx - 3, by - 34, 6, 1, P.hi);   // 窓
    flag(c, cx, by + 1 - 44 - 12 - 1, 14, '#d03a30', '#f0c040');
    torch(c, cx - 12, by - 14); torch(c, cx + 12, by - 14);
    return done(s, cx, by, 0);
  }

  // 案C：見はり塔の関門。低い石の壁と丸太の柵、まん中に木のやぐらをのせた高い塔
  function fortTower() {
    var s = mk(104, 104), c = s.c, cx = 52, by = 98, i, j, P = P_STONE, W = P_WOOD;
    ell(c, cx + 2, by - 1, 49, 5, 'rgba(0,0,0,.22)');
    // 低い石の壁の上に丸太の柵
    box(c, cx, by - 1, 94, 7, 10, P); bricks(c, cx - 47, by - 10, 94, 9, P.s);
    for (var x = cx - 46; x < cx + 46; x += 4) {
      var top = by - 10 - 10 - ((x * 5) % 3);
      R(c, x, top + 2, 3, 12, W.f); R(c, x, top + 2, 1, 12, W.hi); R(c, x + 2, top + 2, 1, 12, W.s); R(c, x + 1, top, 1, 2, W.f);
    }
    // 角の低い丸い塔
    [-40, 40].forEach(function (dx) {
      var tx = cx + dx, bc = by - 6;
      cyl(c, tx, bc, 9, 22, P); R(c, tx - 9, bc - 22 - 2, 19, 2, P.d);
      for (i = -8; i <= 8; i += 6) { R(c, tx + i, bc - 22 - 6, 4, 4, P.f); R(c, tx + i, bc - 22 - 7, 4, 1, P.t); }
      R(c, tx - 1, bc - 14, 2, 5, P.d);
    });
    // まん中の高い塔：石の土台＋木の見はり台＋屋根
    box(c, cx, by, 30, 12, 38, P); bricks(c, cx - 15, by - 37, 30, 37, P.s); R(c, cx - 15, by - 38, 30, 1, P.hi);
    R(c, cx - 7, by - 17, 14, 17, '#141418'); ell(c, cx, by - 17, 7, 4, '#141418');          // 門
    for (i = -5; i <= 5; i += 2) R(c, cx + i, by - 19, 1, 19, '#4a3220');
    R(c, cx - 8, by - 19, 1, 19, P.hi); R(c, cx + 8, by - 19, 1, 19, P.d);
    // 見はり台（石の塔より少しはり出す）
    box(c, cx, by - 38 - 12, 38, 10, 14, W);
    R(c, cx - 19, by - 38 - 12 - 14, 38, 1, W.hi);
    for (i = -15; i <= 15; i += 6) R(c, cx + i - 1, by - 38 - 12 - 12, 3, 8, '#14100a');      // まど
    for (i = -18; i <= 18; i += 4) R(c, cx + i, by - 38 - 12 - 14 - 3, 1, 3, W.d);              // 手すりのくい
    // 屋根（青ぐろい瓦）
    for (j = 0; j < 14; j++) { var half = 6 + Math.round(j * 1.4); R(c, cx - half, by - 38 - 12 - 14 - 14 + j, half, 1, j % 3 === 2 ? '#3a4c70' : '#4a608c'); R(c, cx, by - 38 - 12 - 14 - 14 + j, half + 1, 1, j % 3 === 2 ? '#222f4a' : '#2e3e60'); }
    R(c, cx - 1, by - 38 - 12 - 14 - 14 - 3, 2, 4, '#d0a040');
    flag(c, cx + 1, by - 38 - 12 - 14 - 14 - 3, 12, '#d03a30', '#f0c040');
    banner(c, cx - 22, by - 38 - 6, 7, 14, '#b02c34', '#e8c040'); banner(c, cx + 22, by - 38 - 6, 7, 14, '#b02c34', '#e8c040');
    torch(c, cx - 12, by - 12); torch(c, cx + 12, by - 12);
    return done(s, cx, by, 0);
  }

  var FORTS = { A: fortWood, B: fortStone, C: fortTower };
  function pickFort() {   // 比べるための仮の切り替え：アドレスの最後に ?fort=A（木）/ B（石）/ C（塔）をつける
    var m = /[?&]fort=([ABC])/.exec(window.location.search || '');
    return m ? m[1] : 'B';
  }
  var built = null;
  G.DotArt = {
    TW: TW, TD: TD,
    mk: mk, R: R, ell: ell, disc: disc, box: box, cyl: cyl, forts: FORTS,
    build: function () {
      if (built) return built;
      built = { tree: [buildTree(0), buildTree(1)], pine: [buildPine(0), buildPine(1)], spire: [buildSpire(0), buildSpire(1)],
                rock: { grass: buildRock('grass'), snow: buildRock('snow'), volcano: buildRock('volcano') }, castle: FORTS[pickFort()]() };
      return built;
    }
  };
})();

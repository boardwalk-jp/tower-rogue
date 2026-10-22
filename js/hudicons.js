// 上の帯（戦闘・ワールドマップ・報酬などの画面）と、山札・捨て札のアイコン（2026-10-23 新規・オーナー指定）
// 画像ファイルは使わず、コードでドット絵を描く。決まりはレリックの絵（relicart.js）と同じ
//   ・光は左上から。左上の面は明るく、右下の面は暗く。黒いふち取りはしない
//   ・足もとに薄い影
// 使い方：HTML に <span class="hico" data-ico="名前"></span> を置くと、読み込んだ時に中へ <canvas> を入れる
//   名前：help（遊び方の本）・flame（炎＝アセンション）・map（地図）・deck（デッキ）・gear（設定の歯車）
//         drawpile（山札）・discard（捨て札）
// 表示の大きさは css の .hico-◯◯ で決める（ドットの大きさがそろうように、絵の大きさのちょうど2倍）
'use strict';
(function () {
  var G = window.G = window.G || {};
  var T = null;   // relicart.js の描く道具（R・ell・poly・line・shadow・shade）を借りる

  function R(c, col, x, y, w, h) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w || 1, h || 1); }

  var SIZE = { help: 14, flame: 10, map: 14, deck: 14, gear: 14, drawpile: 16, discard: 16 };
  var DRAW = {};

  // 遊び方：開いた本（クリーム色のページ・茶色の表紙・赤いしおり）
  DRAW.help = function (c) {
    R(c, '#7a4a28', 0, 3, 14, 10); R(c, '#a8683a', 0, 3, 14, 1);          // 表紙（ページの下からのぞく）
    R(c, '#f4e8c8', 1, 2, 6, 10); R(c, '#e2d2a8', 7, 2, 6, 10);           // 左のページ（明るい）・右のページ（少し暗い）
    R(c, '#fffaf0', 1, 2, 6, 1); R(c, '#c8b488', 7, 11, 6, 1);
    R(c, '#9a8458', 6, 2, 1, 10); R(c, '#b8a074', 7, 2, 1, 10);          // まん中のとじ目
    [4, 6, 8].forEach(function (y) { R(c, '#a8987a', 2, y, 3); R(c, '#9a8a6a', 8, y, 4); });   // 文字の行
    R(c, '#d83a2a', 10, 0, 2, 4); R(c, '#ff7a5a', 10, 0, 1, 3); R(c, '#d83a2a', 10, 4); R(c, '#d83a2a', 11, 4);   // しおり
  };

  // 炎：赤いそと側・オレンジ・まん中は黄色
  DRAW.flame = function (c) {
    T.poly(c, '#d8402a', [[5, 0], [7, 2], [9, 5], [9, 8], [7, 10], [3, 10], [1, 8], [1, 5], [2, 3], [3, 5], [4, 2]]);
    T.poly(c, '#ff8a2a', [[5.5, 3], [7.5, 6], [7.5, 8.5], [6.5, 10], [3.5, 10], [2.5, 8.5], [3, 6.5], [4, 7]]);
    T.poly(c, '#ffe07a', [[5, 6], [6.5, 8], [6, 10], [4, 10], [3.5, 8.5]]);
    R(c, '#ffb08a', 4, 2); R(c, '#ff9a6a', 2, 4);   // 左上のふちの光
  };

  // 地図：上下が巻いた羊皮紙。点線の道と赤いバツじるし
  DRAW.map = function (c) {
    R(c, '#e8d4a0', 2, 2, 10, 10);                 // 紙
    R(c, '#f6e8c4', 2, 2, 10, 1); R(c, '#f6e8c4', 2, 2, 1, 10);   // 左上の明るいふち
    R(c, '#c8ae78', 11, 3, 1, 9); R(c, '#c8ae78', 3, 11, 9, 1);    // 右下の暗いふち
    // 巻いた所（上と下）
    R(c, '#b08a50', 1, 1, 12, 2); R(c, '#d8b878', 1, 1, 12, 1); R(c, '#7a5a30', 12, 1, 1, 2);
    R(c, '#b08a50', 1, 11, 12, 2); R(c, '#d8b878', 1, 11, 12, 1); R(c, '#7a5a30', 12, 11, 1, 2);
    // 点線の道
    [[3, 9], [4, 8], [5, 8], [6, 7], [7, 6], [7, 5]].forEach(function (p, i) { if (i % 2 === 0) R(c, '#8a6a3a', p[0], p[1]); });
    R(c, '#8a6a3a', 5, 8);
    // バツじるし
    R(c, '#d83a2a', 8, 3); R(c, '#d83a2a', 10, 3); R(c, '#d83a2a', 9, 4); R(c, '#d83a2a', 8, 5); R(c, '#d83a2a', 10, 5);
    R(c, '#ff7a5a', 8, 3);
  };

  // カードの裏（x,y,w,h）：まわりは明るい青、中は深い青、まん中に金のひし形
  function cardBack(c, x, y, w, h, P) {
    R(c, P.edge, x, y, w, h);
    R(c, P.hi, x, y, w, 1); R(c, P.hi, x, y, 1, h);
    R(c, P.dk, x + w - 1, y + 1, 1, h - 1); R(c, P.dk, x + 1, y + h - 1, w - 1, 1);
    R(c, P.in, x + 2, y + 2, w - 4, h - 4);
    var cx = x + Math.floor(w / 2), cy = y + Math.floor(h / 2);
    R(c, P.gem, cx - 1, cy, 3, 1); R(c, P.gem, cx, cy - 1, 1, 3); R(c, P.gemHi, cx, cy - 1);
  }
  var BLUE = { edge: '#6a9ad8', hi: '#a8ccf4', dk: '#2e4e88', in: '#2a4a8a', gem: '#e6b84a', gemHi: '#fff0a0' };
  var BLUE2 = { edge: '#4a76b0', hi: '#7aa4d4', dk: '#22396a', in: '#203a6e', gem: '#b8923a', gemHi: '#e6c870' };

  // デッキ：2枚重なったカードの裏
  DRAW.deck = function (c) {
    cardBack(c, 5, 1, 8, 11, BLUE2);
    cardBack(c, 1, 3, 8, 11, BLUE);
  };

  // 設定の歯車：8本の歯。左上ほど明るい鋼の色、まん中は穴
  DRAW.gear = function (c) {
    var P = { hi: '#eef2f6', f: '#b8c2cc', s: '#8490a0', d: '#56606e' };
    for (var y = 0; y < 14; y++) for (var x = 0; x < 14; x++) {
      var dx = x + 0.5 - 7, dy = y + 0.5 - 7, r = Math.sqrt(dx * dx + dy * dy), a = Math.atan2(dy, dx);
      var tooth = Math.cos(a * 8) > 0.3;
      if (r > (tooth ? 6.6 : 5.0) || r < 2.1) continue;
      var k = (dx + dy) / 8;
      if (r < 3.1) k = -k;            // 穴のふちは逆（左上が暗く、右下が明るい）
      R(c, T.shade(k, P), x, y);
    }
  };

  // 山札：3枚重ねたカードの裏（まっすぐ積んである）
  DRAW.drawpile = function (c) {
    cardBack(c, 5, 0, 10, 13, BLUE2);
    cardBack(c, 3, 1, 10, 13, BLUE2);
    cardBack(c, 1, 2, 10, 13, BLUE);
  };

  // ななめのカード（まん中 cx,cy・幅 w・高さ h・かたむき ang（ラジアン））。ふちは左上が明るく右下が暗い
  function tiltCard(c, cx, cy, w, h, ang, A) {
    var co = Math.cos(ang), si = Math.sin(ang);
    for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) {
      var dx = x + 0.5 - cx, dy = y + 0.5 - cy, u = dx * co + dy * si, v = -dx * si + dy * co;
      if (Math.abs(u) > w / 2 || Math.abs(v) > h / 2) continue;
      var edge = Math.abs(u) > w / 2 - 1.2 || Math.abs(v) > h / 2 - 1.2;
      R(c, edge ? (u + v < 0 ? A.hi : A.e) : A.in, x, y);
    }
  }
  // 捨て札：使い終わって、ななめに散らばった2枚のカード（くすんだ紫）
  DRAW.discard = function (c) {
    tiltCard(c, 10, 7.5, 8, 11, 0.38, { e: '#4e4268', hi: '#6e6290', in: '#352c4c' });
    tiltCard(c, 6.5, 8.5, 8, 11, -0.22, { e: '#7a6a98', hi: '#b0a0cc', in: '#4a3e66' });
    R(c, '#c8a0e8', 6, 7); R(c, '#c8a0e8', 5, 8); R(c, '#c8a0e8', 7, 8); R(c, '#c8a0e8', 6, 9); R(c, '#f0dcff', 6, 7);   // 紫のしるし
  };

  function draw(name) {
    if (!T) T = G.RelicArt && G.RelicArt.tools;
    var n = SIZE[name], c = document.createElement('canvas');
    if (!n || !T || !DRAW[name]) return c;
    c.width = n; c.height = n;
    var g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    DRAW[name](g);
    c.className = 'hico-c hico-' + name;
    return c;
  }
  G.HudArt = { draw: draw };

  function fill() {
    document.querySelectorAll('.hico[data-ico]').forEach(function (s) {
      if (s.firstChild) return;
      s.appendChild(draw(s.dataset.ico));
    });
  }
  fill();
})();

// 戦闘画面の新デザイン（2026-10-23 オーナー決定：案A改「石の砦」）で使う模様を、コードで作る
// 画像ファイルは使わない。小さな <canvas> にドットで描き、CSS の変数（--t-stone など）に入れる。使う所は css/style.css の「戦闘画面の新デザイン」
//   --t-stone：背景の石積み（32×32）   --t-merlon：城壁の上のぎざぎざ（32×14）   --t-wall：城壁の正面の石（32×16）   --t-rivet：ボタンの四すみの鉄のびょう（4×4）
// 決まった数から作るので、毎回同じ模様になる
'use strict';
(function () {
  function tex(w, h, fn) { var c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d')); return 'url(' + c.toDataURL() + ')'; }
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function R(g, col, x, y, w, h) { g.fillStyle = col; g.fillRect(x, y, w || 1, h || 1); }
  // 1つの石：左上のふちは明るく、右下のふちは暗い
  function block(g, x, y, w, h, f, hi, dk) { R(g, f, x, y, w, h); R(g, hi, x, y, w, 1); R(g, hi, x, y, 1, h); R(g, dk, x + w - 1, y + 1, 1, h - 1); R(g, dk, x + 1, y + h - 1, w - 1, 1); }

  var stone = tex(32, 32, function (g) {
    R(g, '#0c100e', 0, 0, 32, 32);
    for (var r = 0; r < 4; r++) for (var i = -1; i < 3; i++) {
      var x = i * 16 + (r % 2 ? 8 : 0) + 1, y = r * 8 + 1;
      block(g, x, y, 14, 6, ['#28302b', '#2c3530', '#242b27'][Math.floor(rnd() * 3)], '#3a443e', '#1a201c');
      if (rnd() < 0.5) R(g, '#323b36', x + 3 + Math.floor(rnd() * 8), y + 2 + Math.floor(rnd() * 2), 2, 1);   // 石の小さな傷
    }
  });
  var merlon = tex(32, 14, function (g) {
    [2, 18].forEach(function (x) { block(g, x, 0, 12, 8, '#4a544e', '#6a766f', '#2e3632'); R(g, '#3a433e', x + 2, 4, 8, 1); });
    R(g, '#3e4843', 0, 8, 32, 6); R(g, '#5e6a63', 0, 8, 32, 1); R(g, '#262d29', 0, 13, 32, 1);
  });
  var wall = tex(32, 16, function (g) {
    R(g, '#1c221f', 0, 0, 32, 16);
    [[1, 1, 14, '#36403b'], [16, 1, 15, '#3a4440'], [-7, 9, 14, '#323b37'], [8, 9, 15, '#38423d'], [24, 9, 14, '#343e39']].forEach(function (b) { block(g, b[0], b[1], b[2], 6, b[3], '#4c5752', '#262d29'); });
  });
  var rivet = tex(4, 4, function (g) { R(g, '#8a929a', 1, 1, 2, 2); R(g, '#c8d0d8', 1, 1); R(g, '#40464c', 2, 2); });

  var s = document.documentElement.style;
  s.setProperty('--t-stone', stone); s.setProperty('--t-merlon', merlon); s.setProperty('--t-wall', wall); s.setProperty('--t-rivet', rivet);
})();

// 戦闘画面の新デザイン（2026-10-23 オーナー決定：案F1「砦の石壁と赤い垂れ幕」。色は地図の砦の絵に合わせた）で使う模様を、コードで作る
// 画像ファイルは使わない。小さな <canvas> にドットで描き、CSS の変数（--t-stone など）に入れる。使う所は css/style.css の「戦闘画面の新デザイン」
//   --t-stone：背景の石積み（32×32）   --t-merlon：城壁の上のぎざぎざ（32×14）   --t-wall：城壁の正面の石（32×16）
// 決まった数から作るので、毎回同じ模様になる
'use strict';
(function () {
  function tex(w, h, fn) { var c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d')); return 'url(' + c.toDataURL() + ')'; }
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function R(g, col, x, y, w, h) { g.fillStyle = col; g.fillRect(x, y, w || 1, h || 1); }
  // 1つの石：左上のふちは明るく、右下のふちは暗い
  function block(g, x, y, w, h, f, hi, dk) { R(g, f, x, y, w, h); R(g, hi, x, y, w, 1); R(g, hi, x, y, 1, h); R(g, dk, x + w - 1, y + 1, 1, h - 1); R(g, dk, x + 1, y + h - 1, w - 1, 1); }

  // 背景：砦の絵と同じ積み方（高さ4の段・幅8の石・段ごとに半分ずらす）を、砦の色を少し暗くして（2026-10-23 案F1）
  var stone = tex(32, 32, function (g) {
    R(g, '#3a3d47', 0, 0, 32, 32);
    for (var r = 0; r < 8; r++) for (var i = -1; i < 4; i++) block(g, i * 8 + (r % 2 ? 4 : 0), r * 4, 7, 3, ['#5c606b', '#555963', '#63676f'][Math.floor(rnd() * 3)], '#727680', '#464952');
  });
  // 城壁：上のぎざぎざと正面の石（砦の色）
  var merlon = tex(32, 14, function (g) {
    [2, 18].forEach(function (x) { block(g, x, 0, 12, 8, '#8b909a', '#d6d9df', '#6e737e'); R(g, '#7e838d', x + 2, 4, 8, 1); });
    R(g, '#7e838d', 0, 8, 32, 6); R(g, '#bcbfc6', 0, 8, 32, 1); R(g, '#4a4e58', 0, 13, 32, 1);
  });
  var wall = tex(32, 16, function (g) {
    R(g, '#4a4e58', 0, 0, 32, 16);
    [[1, 1, 14, '#6e737e'], [16, 1, 15, '#747983'], [-7, 9, 14, '#6a6f79'], [8, 9, 15, '#71767f'], [24, 9, 14, '#6c717b']].forEach(function (b) { block(g, b[0], b[1], b[2], 6, b[3], '#8b909a', '#555963'); });
  });

  var s = document.documentElement.style;
  s.setProperty('--t-stone', stone); s.setProperty('--t-merlon', merlon); s.setProperty('--t-wall', wall);
})();

// ============================================================
// 戦闘画面の見た目の切り替え（2026-10-23 オーナー指定）：'fort'＝砦（初期）／'classic'＝黒い背景（砦風にする前）
// - 選んだ物はこのブラウザに覚える。<html> に skin-classic を付け外しするだけ（css/style.css の最後を参照）
// - どちらの見た目で遊んでいるかを統計で見るため、記録を取る（run.js の report で送る）
//     run.log.sk：このランで戦闘画面を見ていた秒数 { f：砦, c：黒 }（メニューを開いている間・別のアプリに切り替えている間は数えない）
//     run.log.skSw：このランの中で切り替えた回数
//     towerRogue.skinSw：このブラウザで今までに切り替えた回数（ランの外＝タイトルで切り替えた分も入る）
// ============================================================
(function () {
  var G = window.G = window.G || {};
  var KEY = 'towerRogue.skin', SW_KEY = 'towerRogue.skinSw';
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var cur = load(KEY) === 'classic' ? 'classic' : 'fort';
  function apply() {
    document.documentElement.classList.toggle('skin-classic', cur === 'classic');
    // 地図の大きさを合わせ直す（地図の下の城壁の位置など）
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
  }
  function set(name) {
    name = name === 'classic' ? 'classic' : 'fort';
    if (name === cur) return;
    cur = name; store(KEY, cur);
    store(SW_KEY, String((+load(SW_KEY) || 0) + 1));
    var L = G.run && G.run.log; if (L) L.skSw = (L.skSw || 0) + 1;
    apply();
  }
  // 1秒ごとに、戦闘画面を見ている間だけ数える
  setInterval(function () {
    if (G.currentScreen !== 'game' || G.paused || document.hidden) return;
    var L = G.run && G.run.log; if (!L) return;
    if (!L.sk) L.sk = { f: 0, c: 0 };
    L.sk[cur === 'classic' ? 'c' : 'f']++;
  }, 1000);
  apply();
  G.Skin = { get: function () { return cur; }, set: set, toggle: function () { set(cur === 'classic' ? 'fort' : 'classic'); }, switches: function () { return +load(SW_KEY) || 0; } };
})();

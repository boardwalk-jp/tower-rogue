// 素材：アイコン（スキル・レリック・マップのマス・ハート）のドット絵をコードで作り、起動時に作り置きする（画像ファイルは使わない）
// タワーは js/towerart.js、敵・兵士・石の巨人は js/enemyart.js（24×18の疑似3D）
'use strict';
var G = window.G = window.G || {};

(function () {
  // 小さな方眼に色を塗っていく道具。最後に外側をふち取りして canvas に焼き付ける
  function Grid(w, h) { this.w = w; this.h = h; this.c = new Array(w * h).fill(null); }
  Grid.prototype.px = function (x, y, col) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.c[y * this.w + x] = col;
  };
  Grid.prototype.rect = function (x, y, w, h, col) {
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.px(x + i, y + j, col);
  };
  Grid.prototype.ell = function (cx, cy, rx, ry, col) {
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        var a = (x + 0.5 - cx) / rx, b = (y + 0.5 - cy) / ry;
        if (a * a + b * b <= 1) this.px(x, y, col);
      }
  };
  Grid.prototype.get = function (x, y) {
    return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.c[y * this.w + x] : null;
  };
  // 外側1ドットのふち取り
  Grid.prototype.outline = function (col) {
    var add = [];
    for (var y = 0; y < this.h; y++) for (var x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push([x, y]);
    }
    for (var i = 0; i < add.length; i++) this.px(add[i][0], add[i][1], col);
    return this;
  };
  Grid.prototype.bake = function (flip) {
    var cv = document.createElement('canvas'); cv.width = this.w; cv.height = this.h;
    var g = cv.getContext('2d');
    for (var y = 0; y < this.h; y++) for (var x = 0; x < this.w; x++) {
      var col = this.c[y * this.w + x]; if (!col) continue;
      g.fillStyle = col; g.fillRect(flip ? this.w - 1 - x : x, y, 1, 1);
    }
    return cv;
  };

  var OUT = '#16120f';



  // ---- タワーの絵は js/towerart.js に移した（24×18の疑似3D・段階②） ----




  // ---- スキルの絵（カード用、16×16） ----
  function icon(kind) {
    var g = new Grid(16, 16);
    switch (kind) {
      case 'eye':    g.ell(8, 8, 7, 4, '#eef2ea'); g.ell(8, 8, 3, 3, '#d94a3a'); g.ell(8, 8, 1.4, 1.4, '#1a1a1a'); g.px(7, 6, '#ffffff'); break;
      case 'bag':    g.ell(8, 10, 6, 5, '#a8742e'); g.rect(5, 3, 6, 3, '#a8742e'); g.rect(4, 5, 8, 1, '#6b4422'); g.rect(7, 8, 2, 5, '#e8d9b0'); g.rect(5, 10, 6, 1, '#e8d9b0'); break;
      case 'stone':  g.ell(8, 9, 7, 4, '#8b8f94'); g.ell(7, 8, 5, 2.5, '#b4b8bc'); g.rect(2, 3, 12, 1, '#ffffff'); g.px(13, 2, '#ffffff'); break;
      case 'coin':   g.ell(8, 8, 6.5, 6.5, '#d9a82a'); g.ell(8, 8, 5, 5, '#ffd84a'); g.rect(7, 4, 2, 8, '#b08218'); g.rect(5, 6, 6, 1, '#b08218'); g.rect(5, 9, 6, 1, '#b08218'); break;
      case 'hammer': g.rect(7, 6, 2, 9, '#8a5a2b'); g.rect(3, 2, 10, 4, '#8b8f94'); g.rect(3, 2, 10, 1, '#c3c7cc'); g.rect(12, 1, 2, 2, '#ffd84a'); break;
      case 'horn':   for (var i = 0; i < 10; i++) g.rect(2 + i, 9 - Math.floor(i / 2), 2, 2 + Math.floor(i / 2), '#d9b24a'); g.rect(12, 3, 2, 8, '#b08218'); g.px(1, 9, '#ffffff'); g.px(0, 7, '#ffffff'); break;
      case 'gear':   g.ell(8, 8, 6, 6, '#8b8f94'); for (var q = 0; q < 8; q++) { var an = q * Math.PI / 4; g.rect(Math.round(8 + Math.cos(an) * 6.5) - 1, Math.round(8 + Math.sin(an) * 6.5) - 1, 2, 2, '#8b8f94'); } g.ell(8, 8, 2.5, 2.5, '#16120f'); g.px(4, 5, '#c3c7cc'); g.rect(10, 1, 1, 4, '#ffe14d'); g.rect(11, 3, 1, 3, '#ffe14d'); break;
      case 'scroll': g.rect(3, 3, 10, 10, '#4a7ad0'); g.rect(3, 3, 10, 1, '#7aa8f0'); for (var y2 = 5; y2 < 12; y2 += 2) g.rect(5, y2, 6, 1, '#d8e8ff'); g.rect(2, 2, 2, 12, '#e8d9b0'); g.rect(12, 2, 2, 12, '#e8d9b0'); break;
      case 'meteor': g.ell(10, 10, 4, 4, '#8a4a2a'); g.ell(10, 10, 2.5, 2.5, '#ff8a2a'); g.px(11, 9, '#ffd84a'); for (var k2 = 0; k2 < 6; k2++) { g.px(1 + k2, 1 + k2, '#ff6a2a'); g.px(2 + k2, 1 + k2, '#ffd84a'); } break;
      case 'hourglass': g.rect(3, 1, 10, 2, '#8a5a2b'); g.rect(3, 13, 10, 2, '#8a5a2b'); for (var h2 = 0; h2 < 5; h2++) { g.rect(4 + h2, 3 + h2, 8 - h2 * 2, 1, '#bfe8ff'); g.rect(4 + h2, 12 - h2, 8 - h2 * 2, 1, '#bfe8ff'); } g.rect(6, 10, 4, 2, '#ffd84a'); g.px(7, 6, '#ffd84a'); g.px(8, 8, '#ffd84a'); break;
      case 'star': g.rect(7, 1, 2, 14, '#ffd84a'); g.rect(1, 6, 14, 3, '#ffd84a'); g.rect(4, 4, 8, 7, '#ffd84a'); g.rect(3, 11, 3, 3, '#ffd84a'); g.rect(10, 11, 3, 3, '#ffd84a'); g.px(6, 5, '#fff6c0'); g.rect(6, 7, 1, 2, '#b08218'); g.rect(9, 7, 1, 2, '#b08218'); break;
      case 'bandage': g.rect(3, 5, 10, 6, '#f0e8d8'); g.rect(1, 6, 2, 4, '#e0d8c8'); g.rect(13, 6, 2, 4, '#e0d8c8'); g.rect(7, 6, 2, 4, '#d94a3a'); g.rect(6, 7, 4, 2, '#d94a3a'); break;
      case 'target': g.ell(8, 8, 7, 7, '#d94a3a'); g.ell(8, 8, 5, 5, '#f0f0f0'); g.ell(8, 8, 3, 3, '#d94a3a'); g.ell(8, 8, 1.2, 1.2, '#f0f0f0'); g.rect(13, 1, 1, 6, '#8a5a2b'); g.px(14, 1, '#e8e8e8'); break;
      case 'poster': g.rect(2, 1, 12, 14, '#e8d9b0'); g.rect(2, 1, 12, 2, '#c8b88a'); g.ell(8, 7, 3, 3, '#6b4422'); g.rect(4, 11, 8, 1, '#d94a3a'); g.rect(5, 13, 6, 1, '#ffd84a'); break;
      case 'sword':  for (var k3 = 0; k3 < 9; k3++) { g.px(12 - k3, 2 + k3, '#e8ecf0'); g.px(13 - k3, 2 + k3, '#b4b8bc'); } g.rect(3, 10, 4, 1, '#d9b24a'); g.rect(4, 11, 1, 3, '#8a5a2b'); g.rect(6, 9, 1, 4, '#d9b24a'); break;
      case 'energy': g.rect(7, 1, 2, 14, '#5fc8ff'); g.rect(5, 3, 6, 10, '#5fc8ff'); g.rect(3, 5, 10, 6, '#5fc8ff'); g.rect(1, 7, 14, 2, '#5fc8ff'); g.rect(6, 4, 2, 4, '#e0faff'); g.rect(9, 9, 2, 2, '#2a98c8'); g.px(13, 2, '#ffffff'); g.px(12, 3, '#ffffff'); g.px(14, 3, '#ffffff'); g.px(13, 4, '#ffffff'); break;
      case 'box':    // びっくり箱：赤い箱のふたが開いて、ばねの先から顔が飛び出す
                     g.rect(2, 9, 12, 6, '#c8341a'); g.rect(2, 9, 12, 1, '#ff6a4a'); g.rect(10, 10, 4, 5, '#8a2010'); g.rect(6, 11, 4, 3, '#ffd84a'); g.px(7, 12, '#8a2010'); g.px(8, 12, '#8a2010');
                     g.rect(1, 6, 7, 2, '#ff6a4a'); g.rect(1, 7, 7, 1, '#c8341a');
                     g.px(9, 8, '#c3c7cc'); g.px(10, 7, '#c3c7cc'); g.px(9, 6, '#c3c7cc'); g.px(10, 5, '#c3c7cc');
                     g.ell(10, 3, 2.6, 2.6, '#f0e0c0'); g.px(9, 3, '#16120f'); g.px(11, 3, '#16120f'); g.px(10, 4, '#d94a3a'); g.rect(8, 0, 5, 1, '#3a7bd9'); break;
      case 'saw':    g.rect(2, 7, 12, 4, '#b4b8bc'); for (var x = 2; x < 14; x += 2) g.px(x, 11, '#8b8f94'); g.rect(11, 4, 4, 4, '#8a5a2b'); g.rect(3, 2, 6, 3, '#8a5a2b'); g.rect(4, 3, 4, 1, '#c08a4a'); break;
    }
    return g.outline(OUT).bake();
  }

  // ---- レリックの絵（14×14）。1つずつ違う形 ----
  function relicIcon(id) {
    var g = new Grid(14, 14), i;
    switch (id) {
      case 'sharp': for (i = 0; i < 6; i++) g.rect(7 - i, 1 + i, 1 + i * 2 > 11 ? 11 : 1 + i * 2, 1, i % 2 ? '#c3c7cc' : '#e8ecf0'); g.rect(6, 7, 2, 6, '#8a5a2b'); g.px(7, 1, '#ffffff'); break;
      case 'crystal': g.rect(5, 2, 4, 10, '#9a6ad8'); g.rect(4, 4, 6, 6, '#9a6ad8'); g.rect(6, 2, 1, 9, '#d8b8ff'); g.px(7, 1, '#d8b8ff'); g.px(7, 12, '#6a3aa8'); break;
      case 'oldmap': g.rect(1, 2, 12, 10, '#e8d9b0'); g.rect(1, 2, 12, 1, '#c8b88a'); g.rect(4, 4, 1, 4, '#a08a5a'); g.rect(4, 7, 4, 1, '#a08a5a'); g.px(9, 8, '#d94a3a'); g.px(10, 9, '#d94a3a'); g.px(10, 7, '#d94a3a'); g.px(8, 9, '#d94a3a'); break;
      case 'scale': g.rect(6, 2, 2, 10, '#d9a82a'); g.rect(1, 3, 12, 1, '#ffd84a'); g.rect(1, 4, 1, 3, '#d9a82a'); g.rect(12, 4, 1, 3, '#d9a82a'); g.rect(0, 7, 3, 1, '#ffd84a'); g.rect(11, 7, 3, 1, '#ffd84a'); g.rect(4, 12, 6, 1, '#d9a82a'); break;
      case 'vial': g.rect(5, 1, 4, 2, '#a8742e'); g.rect(6, 3, 2, 2, '#c8d8e0'); g.ell(7, 9, 4.5, 4, '#c8d8e0'); g.ell(7, 10, 3.5, 2.8, '#6ac83a'); g.px(5, 9, '#c8ffb0'); break;
      case 'frostbell': g.ell(7, 7, 5, 5.5, '#7ab8e0'); g.rect(2, 9, 10, 3, '#7ab8e0'); g.rect(1, 11, 12, 1, '#4a7aa8'); g.px(5, 4, '#e0f4ff'); g.px(7, 12, '#ffd84a'); g.rect(6, 0, 2, 2, '#4a7aa8'); break;
      case 'banner': g.rect(2, 1, 1, 12, '#8a5a2b'); g.rect(3, 1, 9, 6, '#d94a3a'); g.rect(3, 1, 9, 1, '#ff7a6a'); g.px(11, 7, '#d94a3a'); g.px(9, 7, '#d94a3a'); g.rect(6, 3, 3, 2, '#ffd84a'); break;
      case 'spring': g.ell(7, 8.5, 4.5, 4.5, '#3a8ad0'); g.rect(6, 2, 2, 3, '#3a8ad0'); g.px(7, 1, '#3a8ad0'); g.rect(5, 4, 4, 2, '#3a8ad0'); g.px(5, 7, '#bfe8ff'); g.px(5, 8, '#bfe8ff'); break;
      case 'seal': g.ell(7, 7, 6, 6, '#a82a2a'); g.ell(7, 7, 4, 4, '#d94a3a'); g.rect(5, 5, 4, 1, '#ffd84a'); g.rect(6, 6, 2, 3, '#ffd84a'); break;
      case 'blueprint': g.rect(1, 3, 11, 9, '#2a5aa8'); g.rect(3, 1, 11, 9, '#3a7ad0'); for (i = 3; i < 9; i += 2) g.rect(5, i, 7, 1, '#bfe0ff'); g.rect(5, 3, 1, 5, '#bfe0ff'); break;
      case 'wall': g.rect(0, 3, 14, 10, '#8b8f94'); for (i = 3; i < 13; i += 3) g.rect(0, i, 14, 1, '#5a5e64'); g.rect(4, 4, 1, 2, '#5a5e64'); g.rect(10, 4, 1, 2, '#5a5e64'); g.rect(7, 7, 1, 2, '#5a5e64'); g.rect(2, 10, 1, 2, '#5a5e64'); g.rect(11, 10, 1, 2, '#5a5e64'); g.rect(0, 3, 14, 1, '#b4b8bc'); break;
      case 'stone': g.rect(6, 1, 2, 12, '#5fd8ff'); g.rect(4, 3, 6, 8, '#5fd8ff'); g.rect(2, 5, 10, 4, '#5fd8ff'); g.rect(5, 4, 2, 3, '#e0faff'); g.rect(8, 8, 2, 2, '#2a98c8'); break;
      case 'conductor': g.rect(2, 3, 10, 9, '#a8d8f0'); g.rect(2, 3, 10, 1, '#e0f4ff'); g.rect(8, 1, 2, 4, '#ffe14d'); g.rect(6, 5, 3, 2, '#ffe14d'); g.rect(5, 7, 2, 4, '#ffe14d'); g.px(4, 11, '#ffe14d'); break;
      case 'oil': g.ell(7, 9, 5, 4.5, '#8a5a2b'); g.rect(5, 2, 4, 4, '#8a5a2b'); g.rect(4, 2, 6, 1, '#6b4422'); g.ell(7, 9, 2.5, 2.5, '#1e1a22'); g.px(6, 8, '#6a6478'); break;
      case 'brittle': g.rect(3, 1, 4, 6, '#e8f4ff'); g.rect(7, 4, 4, 7, '#c8e0f0'); g.rect(2, 8, 4, 5, '#d8ecf8'); g.px(6, 7, '#5fc8ff'); g.px(7, 8, '#5fc8ff'); g.px(5, 9, '#5fc8ff'); break;
      case 'plague': g.ell(7, 10, 6, 3, '#6a7a5a'); g.ell(7, 6, 4, 3.5, '#a8b890'); g.rect(5, 6, 1, 1, '#2a3a1a'); g.rect(8, 6, 1, 1, '#2a3a1a'); g.px(3, 2, '#a6e85a'); g.px(10, 1, '#a6e85a'); g.px(12, 4, '#a6e85a'); break;
      case 'magnet': g.rect(2, 2, 3, 8, '#d94a3a'); g.rect(9, 2, 3, 8, '#d94a3a'); g.ell(7, 9, 5, 3.5, '#d94a3a'); g.ell(7, 8, 2, 2, null); g.rect(5, 2, 4, 7, null); g.rect(2, 1, 3, 2, '#e8ecf0'); g.rect(9, 1, 3, 2, '#e8ecf0'); g.px(6, 12, '#ffd84a'); g.px(8, 12, '#ffd84a'); break;
      case 'anvil': g.rect(1, 3, 10, 3, '#5a5e64'); g.rect(11, 3, 3, 2, '#5a5e64'); g.rect(4, 6, 5, 3, '#4a4e54'); g.rect(2, 9, 9, 3, '#5a5e64'); g.rect(1, 3, 10, 1, '#8b8f94'); g.px(6, 1, '#ff8a2a'); g.px(8, 0, '#ffd84a'); break;
      case 'crown': g.rect(1, 6, 12, 6, '#ffd84a'); g.rect(1, 3, 2, 3, '#ffd84a'); g.rect(6, 1, 2, 5, '#ffd84a'); g.rect(11, 3, 2, 3, '#ffd84a'); g.rect(1, 11, 12, 1, '#d9a82a'); g.px(3, 8, '#d94a3a'); g.px(7, 8, '#3a7bd9'); g.px(10, 8, '#d94a3a'); break;
      case 'phoenix': for (i = 0; i < 11; i++) g.rect(2 + i, 12 - i, 2, 2, i < 4 ? '#ffd84a' : i < 8 ? '#ff8a2a' : '#d94a3a'); g.rect(8, 2, 3, 3, '#d94a3a'); g.px(4, 8, '#ff8a2a'); g.px(6, 6, '#ffd84a'); g.px(1, 13, '#8a5a2b'); break;
      // 指揮官のレリック
      case 'cmd_captain': g.rect(5, 0, 4, 5, '#3a6ab0'); g.rect(6, 0, 2, 5, '#d94a3a'); g.ell(7, 9, 4.5, 4.5, '#ffd84a'); g.ell(7, 9, 3, 3, '#d9a82a'); g.px(7, 7, '#fff6c0'); g.rect(6, 9, 3, 1, '#fff6c0'); g.px(7, 10, '#fff6c0'); break;
      case 'cmd_witch': for (i = 0; i < 10; i++) g.rect(3 + i, 12 - i, 2, 1, '#8a5a2b'); g.ell(11, 3, 2.5, 2.5, '#c79bff'); g.px(10, 2, '#ffffff'); g.px(13, 1, '#ffe14d'); g.px(8, 1, '#ffe14d'); g.px(13, 6, '#ffe14d'); break;
      case 'cmd_engineer': g.rect(1, 6, 12, 7, '#c8341a'); g.rect(1, 6, 12, 1, '#ff6a4a'); g.rect(4, 3, 6, 1, '#5a5e64'); g.rect(4, 3, 1, 3, '#5a5e64'); g.rect(9, 3, 1, 3, '#5a5e64'); g.rect(6, 8, 2, 2, '#d9a82a'); g.rect(1, 9, 12, 1, '#8a2010'); break;
      default: g.ell(7, 7, 5, 5, '#c8b88a');
    }
    return g.outline(OUT).bake();
  }
  // 新しい絵（js/relicart.js・20×20）があればそちらを使う。無ければ古い14×14の絵
  G.relicIcon = function (id) { if (!G.SPR.relic[id]) G.SPR.relic[id] = (G.RelicArt && G.RelicArt.draw(id)) || relicIcon(id); return G.SPR.relic[id]; };

  // ---- ワールドマップのマスの絵（14×14） ----
  function nodeIcon(kind) {
    var g = new Grid(14, 14);
    switch (kind) {
      case 'battle':  for (var i = 0; i < 10; i++) { g.px(2 + i, 2 + i, '#e8e8e8'); g.px(11 - i, 2 + i, '#e8e8e8'); }
                      g.rect(1, 10, 3, 1, '#8a5a2b'); g.rect(10, 10, 3, 1, '#8a5a2b'); g.rect(2, 11, 1, 2, '#8a5a2b'); g.rect(11, 11, 1, 2, '#8a5a2b'); break;
      case 'elite':   g.ell(7, 7, 5, 5, '#e8e0d0'); g.rect(4, 6, 2, 2, '#d94a3a'); g.rect(8, 6, 2, 2, '#d94a3a'); g.rect(5, 10, 4, 2, '#e8e0d0');
                      g.px(5, 11, '#1a1a1a'); g.px(7, 11, '#1a1a1a'); g.rect(1, 0, 2, 4, '#c9b48a'); g.rect(11, 0, 2, 4, '#c9b48a'); break;
      case 'event':   g.rect(4, 1, 6, 2, '#9fd0ff'); g.rect(9, 3, 2, 3, '#9fd0ff'); g.rect(6, 6, 3, 2, '#9fd0ff'); g.rect(6, 8, 2, 2, '#9fd0ff'); g.rect(6, 11, 2, 2, '#9fd0ff'); g.rect(3, 3, 2, 1, '#9fd0ff'); break;
      case 'shop':    g.ell(7, 8, 5.5, 5, '#a8742e'); g.rect(4, 2, 6, 2, '#a8742e'); g.ell(7, 8, 2.5, 2.5, '#ffd84a'); g.rect(6, 7, 2, 3, '#b08218'); break;
      case 'rest':    g.rect(2, 11, 10, 2, '#8a5a2b'); g.rect(3, 10, 8, 1, '#6b4422'); g.ell(7, 7, 3.5, 4, '#ff8a2a'); g.ell(7, 8, 2, 2.5, '#ffd84a'); g.px(7, 2, '#ff8a2a'); break;
      case 'boss':    g.ell(7, 8, 6, 5, '#b0703f'); g.rect(2, 1, 10, 3, '#ffd84a'); g.px(2, 0, '#ffd84a'); g.px(7, 0, '#ffd84a'); g.px(11, 0, '#ffd84a');
                      g.rect(4, 7, 2, 2, '#ffe14d'); g.rect(8, 7, 2, 2, '#ffe14d'); g.rect(4, 11, 6, 1, '#4a2a1a'); break;
    }
    return g.outline(OUT).bake();
  }


  function heart() {
    var g = new Grid(7, 6);
    g.rect(0, 1, 7, 2, '#ff5a5a'); g.rect(1, 0, 2, 1, '#ff5a5a'); g.rect(4, 0, 2, 1, '#ff5a5a');
    g.rect(1, 3, 5, 1, '#ff5a5a'); g.rect(2, 4, 3, 1, '#ff5a5a'); g.px(3, 5, '#ff5a5a'); g.px(1, 1, '#ffd0d0');
    return g.bake();
  }

  G.buildSprites = function () {
    var S = {   // 敵・兵士・石の巨人の絵は js/enemyart.js、タワーの絵は js/towerart.js で作る（24×18の疑似3D）
      icon: {}, node: {}, relic: {},
      heart: heart()
    };
    ['eye', 'bag', 'stone', 'coin', 'hammer', 'horn', 'saw', 'gear', 'scroll', 'meteor', 'sword', 'hourglass', 'star', 'bandage', 'target', 'poster', 'energy', 'box'].forEach(function (k) { S.icon[k] = icon(k); });
    ['battle', 'elite', 'event', 'shop', 'rest', 'boss'].forEach(function (k) { S.node[k] = nodeIcon(k); });
    G.TowerArt.apply(S);
    G.EnemyArt.apply(S);   // 敵の絵は js/enemyart.js（24×18の疑似3D・段階③）で、できた種類から上書きする   // タワーの絵は js/towerart.js（24×18の疑似3D）で作る
    G.SPR = S;
    return S;
  };
  // 右向きの絵を取り出す（大砲・弩砲は左右の向きがある）
  G.towerImg = function (type, lv, fire) {
    var spr = G.SPR[type][lv || 0][fire ? 1 : 0];
    return spr.r ? spr.r : spr;
  };
  // 小さな枠（カード・指揮官の絵など）にタワーを描く。はみ出す時だけ縮める（ぼかさない）。下のまん中にそろえる
  G.drawTowerFit = function (c, img, w, h) {
    var k = Math.min(1, w / img.width, h / img.height), dw = Math.round(img.width * k), dh = Math.round(img.height * k);
    c.imageSmoothingEnabled = false;
    c.drawImage(img, Math.round((w - dw) / 2), h - dh, dw, dh);
  };
})();

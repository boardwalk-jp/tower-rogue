// 素材：ドット絵をコードで1ドットずつ作り、起動時に作り置きする（画像ファイルは使わない）
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
  // 左右反転版もいっしょに作る
  function both(grid) { return { r: grid.bake(false), l: grid.bake(true) }; }

  var OUT = '#16120f';

  // ---- 敵 ----
  function slime(f) {
    // 下が平らなおまんじゅう形。コマ1はつぶれて横に広がる
    var g = new Grid(17, 13), sq = f === 1, B = 11;
    var rx = sq ? 7 : 6, ry = sq ? 7 : 9;
    g.ell(8.5, B + 1, rx, ry, '#3f9b3a');
    g.ell(8.5, B + 1, rx - 1, ry - 1.4, '#5cc350');
    g.rect(0, B + 1, 17, 2, null);
    g.rect(Math.round(8.5 - rx) + 1, B, Math.round(rx * 2) - 2, 1, '#3f9b3a');
    var top = B + 1 - ry;
    g.ell(6.5, top + 2.6, 1.6, 1, '#c9f7b0');
    var ey = Math.round(B - ry * 0.4);
    g.px(6, ey, '#10200e'); g.px(10, ey, '#10200e'); g.px(6, ey - 1, '#ffffff'); g.px(10, ey - 1, '#ffffff');
    return both(g.outline(OUT));
  }
  function goblin(f) {
    var g = new Grid(14, 17), skin = '#8bc34a', dark = '#5e8f2c';
    // 足（コマで前後に動く）
    if (f === 0) { g.rect(5, 13, 2, 3, '#4b3621'); g.rect(8, 13, 2, 2, '#4b3621'); g.px(8, 15, '#4b3621'); }
    else { g.rect(4, 13, 2, 2, '#4b3621'); g.px(4, 15, '#4b3621'); g.rect(8, 13, 2, 3, '#4b3621'); }
    g.rect(4, 8, 6, 5, '#7a5230'); g.rect(4, 11, 6, 1, '#5a3a1e');          // 服
    g.rect(3, 9, 1, 3, skin); g.rect(10, 9, 1, 2, skin);                     // 腕
    g.rect(11, 6, 1, 6, '#c9c9c9'); g.px(11, 5, '#ffffff');                  // 短剣
    g.ell(7, 5, 3.5, 3.2, skin); g.rect(4, 7, 6, 1, dark);                   // 頭
    g.px(2, 3, skin); g.px(3, 4, skin); g.px(12, 3, skin); g.px(11, 4, skin); // とがった耳
    g.px(5, 4, '#ffe14d'); g.px(8, 4, '#ffe14d');                            // 目
    g.px(6, 6, '#2b1d0e'); g.px(7, 6, '#2b1d0e');
    return both(g.outline(OUT));
  }
  function orc(f, pal) {
    pal = pal || {};
    var g = new Grid(20, 22), skin = pal.skin || '#6e9a4e', dark = pal.dark || '#4b6e33';
    var ar = pal.armor || ['#7d7d86', '#a0a0aa', '#55555e'];
    if (f === 0) { g.rect(6, 17, 3, 4, '#3b2a1a'); g.rect(11, 17, 3, 3, '#3b2a1a'); g.px(13, 20, '#3b2a1a'); }
    else { g.rect(6, 17, 3, 3, '#3b2a1a'); g.px(6, 20, '#3b2a1a'); g.rect(11, 17, 3, 4, '#3b2a1a'); }
    g.rect(4, 9, 12, 8, ar[0]);                    // よろい
    g.rect(4, 9, 12, 2, ar[1]); g.rect(4, 15, 12, 2, ar[2]);
    g.rect(9, 11, 2, 4, ar[2]);
    if (pal.trim) { g.rect(4, 11, 12, 1, pal.trim); g.rect(2, 9, 2, 2, ar[1]); g.rect(16, 9, 2, 2, ar[1]); }
    g.rect(2, 10, 2, 5, skin); g.rect(16, 10, 2, 4, skin);   // 腕
    // こん棒
    g.rect(17, 4, 2, 8, '#7a5230'); g.rect(16, 2, 4, 4, '#8e6a42'); g.px(16, 2, null); g.px(19, 2, null);
    g.ell(10, 5.5, 4.5, 4, skin); g.rect(6, 8, 8, 1, dark);  // 頭
    g.px(8, 4, '#ff4d3a'); g.px(12, 4, '#ff4d3a');           // 目
    g.px(8, 8, '#fff6e0'); g.px(12, 8, '#fff6e0'); g.px(8, 7, '#fff6e0'); g.px(12, 7, '#fff6e0'); // きば
    g.rect(7, 1, 6, 2, ar[2]); g.px(10, 0, ar[1]);   // かぶと
    if (pal.trim) { g.rect(6, 2, 8, 2, ar[0]); g.rect(6, 3, 8, 1, pal.trim); g.px(5, 1, ar[1]); g.px(14, 1, ar[1]); }
    return both(g.outline(OUT));
  }
  function wolf(f) {
    var g = new Grid(22, 14), fur = '#8a8f99', dark = '#5d626c', light = '#c4c8d0';
    // 脚（コマで前後）
    if (f === 0) { g.rect(5, 10, 2, 3, dark); g.rect(14, 10, 2, 3, dark); g.rect(8, 10, 2, 2, fur); g.rect(16, 10, 2, 2, fur); }
    else { g.rect(4, 10, 2, 2, dark); g.rect(15, 10, 2, 2, dark); g.rect(7, 10, 2, 3, fur); g.rect(17, 10, 2, 3, fur); }
    g.ell(11, 8, 7, 3.2, fur); g.rect(5, 9, 12, 1, dark);           // 胴
    g.rect(1, 5, 4, 2, fur); g.px(0, 4, fur);                        // しっぽ
    g.ell(17.5, 5.5, 3.5, 3, fur); g.rect(19, 6, 3, 2, light);       // 頭・鼻先
    g.px(16, 2, fur); g.px(17, 1, fur); g.px(18, 2, fur);            // 耳
    g.px(18, 5, '#ffd84a'); g.px(21, 6, '#1a1a1a');
    g.rect(8, 6, 6, 1, light);
    return both(g.outline(OUT));
  }
  function ogre(f, pal) {   // ボス：オーガ王（大きい・王冠）。pal で色違い（霜の巨人）
    pal = pal || {};
    var g = new Grid(34, 36), skin = pal.skin || '#b0703f', dark = pal.dark || '#7d4a26';
    if (f === 0) { g.rect(10, 28, 5, 7, '#3b2a1a'); g.rect(19, 28, 5, 6, '#3b2a1a'); g.rect(19, 34, 6, 1, '#3b2a1a'); }
    else { g.rect(10, 28, 5, 6, '#3b2a1a'); g.rect(9, 34, 6, 1, '#3b2a1a'); g.rect(19, 28, 5, 7, '#3b2a1a'); }
    g.ell(17, 21, 11, 9, skin); g.ell(17, 23, 9, 6, pal.belly || '#c98a55');       // 太った体
    g.rect(7, 25, 20, 4, '#6b2a2a'); g.rect(7, 25, 20, 1, '#8e3b3b'); g.rect(15, 25, 4, 4, '#d9b24a');  // 腰布・ベルト
    g.rect(3, 15, 4, 10, skin); g.rect(27, 14, 4, 9, skin);            // 腕
    g.rect(29, 2, 3, 16, '#6b4a2b'); g.ell(30.5, 4, 3.5, 4, '#8a6a42'); g.px(28, 2, '#c9c9c9'); g.px(33, 4, '#c9c9c9'); g.px(30, 0, '#c9c9c9');  // 大きなこん棒
    g.ell(17, 10, 7, 6, skin); g.rect(11, 14, 12, 1, dark);           // 頭
    g.rect(13, 9, 2, 2, '#ffe14d'); g.rect(19, 9, 2, 2, '#ffe14d');   // 目
    g.rect(13, 13, 1, 2, '#fff6e0'); g.rect(20, 13, 1, 2, '#fff6e0'); // きば
    g.rect(11, 2, 12, 3, '#ffd84a'); g.px(11, 1, '#ffd84a'); g.px(14, 0, '#ffd84a'); g.px(17, 1, '#ffd84a'); g.px(20, 0, '#ffd84a'); g.px(22, 1, '#ffd84a');  // 王冠
    g.px(14, 3, '#d94a3a'); g.px(17, 3, '#3a7bd9'); g.px(20, 3, '#d94a3a');
    return both(g.outline(OUT));
  }


  // ---- 追加のボス（2026-10-20） ----
  function slimeking(f) {            // スライムキング：王冠をかぶった大きな緑のスライム
    var g = new Grid(34, 30), sq = f === 1, B = 28, rx = sq ? 16 : 13.5, ry = sq ? 13 : 16;
    g.ell(17, B + 1, rx, ry, '#3f9b3a'); g.ell(17, B + 1, rx - 1.6, ry - 2, '#5cc350'); g.rect(0, B + 1, 34, 2, null);
    g.ell(10.5, B + 1 - ry + 5, 3, 1.8, '#c9f7b0');
    var ey = Math.round(B - ry * 0.5);
    g.rect(10, ey, 3, 3, '#1a0e24'); g.rect(21, ey, 3, 3, '#1a0e24'); g.px(11, ey, '#ffffff'); g.px(22, ey, '#ffffff');
    g.rect(9, ey - 2, 5, 1, '#1a3a1a'); g.rect(20, ey - 2, 5, 1, '#1a3a1a');                  // 怒った眉
    g.rect(11, ey + 6, 12, 1, '#1a0e24'); for (var i = 0; i < 6; i++) g.px(12 + i * 2, ey + 7, '#f4f4e8');  // ぎざぎざの口
    var ty = B + 1 - ry; g.rect(10, ty - 3, 14, 4, '#ffd84a'); for (i = 0; i < 4; i++) g.rect(10 + i * 4, ty - 6, 2, 3, '#ffd84a'); g.px(11, ty - 1, '#d94a3a'); g.px(17, ty - 1, '#3a7bd9'); g.px(23, ty - 1, '#d94a3a');
    return both(g.outline(OUT));
  }
  function wolfking(f) {             // 牙の王：王冠と傷のある大きな灰色のオオカミ
    var g = new Grid(40, 28), fur = '#6a7280', dark = '#3e4450', light = '#aab2bf';
    if (f === 0) { g.rect(9, 19, 3, 7, dark); g.rect(25, 19, 3, 7, dark); g.rect(13, 19, 3, 6, fur); g.rect(29, 19, 3, 6, fur); }
    else { g.rect(7, 20, 3, 5, dark); g.rect(27, 20, 3, 5, dark); g.rect(14, 19, 3, 7, fur); g.rect(30, 19, 3, 7, fur); }
    g.ell(20, 15, 14, 6, fur); g.rect(8, 18, 24, 1, dark); g.rect(10, 11, 18, 2, light);   // 胴・背のたてがみ
    g.rect(2, 9, 6, 3, fur); g.rect(0, 7, 3, 3, fur); g.px(0, 6, light);                      // しっぽ
    g.ell(32, 10, 5.5, 5, fur); g.rect(34, 11, 6, 4, light); g.px(39, 11, '#1a1a1a');          // 頭・鼻先
    g.rect(33, 15, 1, 2, '#fff6e0'); g.rect(37, 15, 1, 2, '#fff6e0');                          // きば
    g.px(29, 4, fur); g.px(30, 3, fur); g.px(31, 4, fur); g.px(32, 2, fur);                    // 耳
    g.px(33, 9, '#ff3a2a'); g.px(34, 9, '#ff3a2a'); g.rect(35, 6, 1, 5, '#d8d8d0');             // 目・顔の傷
    g.rect(28, 3, 9, 2, '#ffd84a'); g.px(28, 1, '#ffd84a'); g.px(31, 0, '#ffd84a'); g.px(34, 1, '#ffd84a'); g.px(36, 2, '#ffd84a'); g.px(31, 3, '#d94a3a');   // 王冠
    return both(g.outline(OUT));
  }
  function harpyqueen(f) {           // ハーピークイーン：王冠と大きな紫の翼の女王（空を飛ぶ）
    var g = new Grid(40, 30), w = '#7a4aa8', d = '#4e2c78', l = '#a87ad8';
    if (f === 0) { for (var i = 0; i < 11; i++) { g.rect(1 + i, 5 + Math.floor(i / 3), 2, 7, i % 2 ? w : l); g.rect(37 - i, 5 + Math.floor(i / 3), 2, 7, i % 2 ? w : l); } g.rect(0, 4, 4, 2, d); g.rect(36, 4, 4, 2, d); }
    else { for (var j = 0; j < 11; j++) { g.rect(1 + j, 13 - Math.floor(j / 3), 2, 8, j % 2 ? w : l); g.rect(37 - j, 13 - Math.floor(j / 3), 2, 8, j % 2 ? w : l); } g.rect(0, 20, 4, 2, d); g.rect(36, 20, 4, 2, d); }
    g.ell(20, 17, 4.5, 6, '#c89a6a'); g.rect(17, 19, 6, 3, '#f0e8d8');                         // 体・胸の羽
    g.ell(20, 8, 4, 4, '#f0c49a'); g.rect(15, 4, 10, 3, '#5a2a78'); g.rect(15, 7, 1, 6, '#5a2a78'); g.rect(24, 7, 1, 6, '#5a2a78');   // 顔・髪
    g.px(18, 8, '#2a1a10'); g.px(22, 8, '#2a1a10'); g.px(20, 10, '#d94a3a');
    g.rect(16, 1, 8, 2, '#ffd84a'); g.px(16, 0, '#ffd84a'); g.px(20, 0, '#ffd84a'); g.px(23, 0, '#ffd84a'); g.px(20, 2, '#d94a3a');   // 王冠
    g.rect(18, 24, 2, 4, '#e0b040'); g.rect(22, 24, 2, 4, '#e0b040'); g.rect(17, 27, 3, 1, '#e0b040'); g.rect(22, 27, 3, 1, '#e0b040');
    return both(g.outline(OUT));
  }
  function icecommander(f) {         // 氷の騎士団長：青白いよろい・羽飾り・大きな盾と剣
    var g = new Grid(36, 40), a = '#a8c8e0', hi = '#e0f0ff', sh = '#6a8aa8';
    if (f === 0) { g.rect(11, 31, 5, 8, sh); g.rect(20, 31, 5, 7, sh); g.rect(20, 38, 6, 1, sh); } else { g.rect(11, 31, 5, 7, sh); g.rect(10, 38, 6, 1, sh); g.rect(20, 31, 5, 8, sh); }
    g.rect(9, 14, 18, 18, a); g.rect(9, 14, 18, 2, hi); g.rect(9, 14, 2, 18, hi); g.rect(25, 14, 2, 18, sh); g.rect(9, 28, 18, 3, '#7aa0c0');   // 胴
    g.rect(16, 16, 4, 14, hi); g.rect(9, 24, 18, 2, '#ffffff');
    g.rect(3, 15, 6, 12, a); g.rect(3, 15, 6, 2, hi);                                                                                       // 左うで・肩
    g.ell(5, 24, 5, 7, '#d8ecff'); g.ell(5, 24, 3, 5, '#7aa0c0'); g.rect(4, 19, 2, 10, hi);                                                // 盾
    g.rect(27, 15, 5, 8, a); g.rect(31, 2, 2, 22, '#e8f4ff'); g.rect(29, 21, 6, 2, '#d9b24a'); g.px(32, 1, '#ffffff');                       // 右うで・剣
    g.ell(18, 9, 6, 6, a); g.rect(12, 9, 12, 2, '#16202c'); g.rect(13, 9, 2, 1, '#5fd0ff'); g.rect(21, 9, 2, 1, '#5fd0ff');                   // かぶと・目
    g.rect(16, 0, 4, 4, '#e0f8ff'); g.px(15, 1, '#e0f8ff'); g.px(20, 1, '#e0f8ff'); g.px(18, 4, hi);                                         // 羽飾り
    return both(g.outline(OUT));
  }
  function blizzardwitch(f) {        // 吹雪の魔女：とんがり帽子と長い白髪、氷のつえ
    var g = new Grid(30, 38), robe = '#8ab4e0', dk = '#4a6a9a', hat = '#3a5a9a';
    g.rect(7, 22, 14, 14, robe); g.rect(5, 30, 18, 6, robe); g.rect(5, 35, 18, 1, dk); g.rect(7, 22, 2, 14, '#b0d0f0'); g.rect(19, 22, 2, 14, dk);   // ローブ
    if (f === 1) { g.px(5, 36, robe); g.px(22, 36, robe); g.px(4, 35, robe); }
    g.rect(9, 24, 10, 2, '#e8f4ff'); g.rect(13, 26, 2, 8, '#e8f4ff');                                                                      // 帯
    g.rect(4, 24, 4, 8, robe); g.rect(20, 22, 4, 8, robe);                                                                                  // うで
    g.rect(25, 8, 2, 28, '#7a5a3a'); g.ell(26, 6, 3, 4, f ? '#e8ffff' : '#8ae0ff'); g.px(26, 1, '#ffffff'); g.px(24, 6, '#ffffff'); g.px(28, 6, '#ffffff');   // つえの氷
    g.ell(14, 15, 5, 5, '#f4d8c8'); g.rect(8, 13, 3, 14, '#f4f8ff'); g.rect(18, 13, 3, 14, '#f4f8ff');                                      // 顔・白髪
    g.px(12, 15, '#2a4a8a'); g.px(16, 15, '#2a4a8a'); g.px(14, 18, '#d94a6a');
    g.rect(5, 10, 20, 3, hat); g.rect(9, 5, 12, 5, hat); g.rect(12, 2, 7, 3, hat); g.px(18, 1, hat); g.px(20, 0, hat); g.rect(5, 12, 20, 1, '#9ab8e8');   // 帽子
    g.px(13, 8, '#ffffff'); g.px(17, 6, '#ffffff');
    return both(g.outline(OUT));
  }
  function flamegeneral(f) {         // 炎の将軍：赤黒いよろい・角のかぶと・燃える剣（ラスボス級）
    var g = new Grid(40, 42), a = '#6a1e1e', hi = '#a8382a', dk = '#2e0a0a', gold = '#ffb347';
    g.rect(4, 14, 7, 24, '#8a1a14'); g.rect(4, 36, 7, 2, dk);                                                                                 // マント
    if (f === 0) { g.rect(13, 33, 6, 8, dk); g.rect(22, 33, 6, 7, dk); g.rect(22, 40, 7, 1, dk); } else { g.rect(13, 33, 6, 7, dk); g.rect(12, 40, 7, 1, dk); g.rect(22, 33, 6, 8, dk); }
    g.rect(11, 15, 20, 19, a); g.rect(11, 15, 20, 2, hi); g.rect(11, 15, 2, 19, hi); g.rect(29, 15, 2, 19, dk); g.rect(11, 29, 20, 3, dk);     // 胴
    g.rect(18, 18, 6, 4, gold); g.rect(19, 19, 4, 2, '#ff6a2a'); g.rect(11, 26, 20, 2, gold);                                                  // 胸の紋・帯
    g.rect(7, 15, 6, 4, hi); g.rect(29, 15, 6, 4, hi); g.rect(8, 19, 4, 9, a); g.rect(30, 19, 4, 9, a);                                      // 肩・うで
    g.rect(34, 8, 2, 20, '#ffd8a0'); g.rect(32, 26, 6, 2, gold);                                                                              // 剣
    var fl = f === 0 ? 0 : 2; g.rect(33, 2 - fl, 4, 7 + fl, '#ff6a2a'); g.rect(34, 0 - fl, 2, 6 + fl, '#ffd84a'); g.px(32, 4, '#ff8a2a'); g.px(37, 5, '#ff8a2a');   // 剣の炎
    g.ell(21, 9, 7, 6.5, a); g.rect(15, 9, 12, 3, dk); g.rect(16, 9, 3, 2, '#ffe14d'); g.rect(23, 9, 3, 2, '#ffe14d');                       // かぶと・目
    g.rect(12, 2, 3, 8, '#f0e8d0'); g.px(11, 1, '#f0e8d0'); g.px(10, 0, '#f0e8d0'); g.rect(27, 2, 3, 8, '#f0e8d0'); g.px(30, 1, '#f0e8d0'); g.px(31, 0, '#f0e8d0');   // 角
    g.rect(17, 2, 8, 2, gold);
    return both(g.outline(OUT));
  }

  // ---- タワーの絵は js/towerart.js に移した（24×18の疑似3D・段階②） ----


  function bat(f, pal) {
    pal = pal || {};
    var g = new Grid(18, 12), c = pal.c || '#5b4a78', d = pal.d || '#3a2e52';
    g.ell(9, 6, 3, 3, c); g.px(8, 5, '#ff4d3a'); g.px(10, 5, '#ff4d3a'); g.px(7, 2, c); g.px(11, 2, c);
    if (f === 0) { g.rect(1, 3, 6, 2, d); g.rect(11, 3, 6, 2, d); g.px(0, 2, d); g.px(17, 2, d); }
    else { g.rect(1, 6, 6, 2, d); g.rect(11, 6, 6, 2, d); g.px(0, 8, d); g.px(17, 8, d); }
    return both(g.outline(OUT));
  }
  function shaman(f) {               // ゴブリン呪術師：紫のずきんと光る杖
    var g = new Grid(16, 19), skin = '#8bc34a';
    if (f === 0) { g.rect(5, 15, 2, 3, '#4b3621'); g.rect(8, 15, 2, 2, '#4b3621'); } else { g.rect(4, 15, 2, 2, '#4b3621'); g.rect(8, 15, 2, 3, '#4b3621'); }
    g.rect(3, 9, 8, 6, '#5a3a8a'); g.rect(3, 9, 1, 6, '#7a5aaa');
    g.ell(7, 6, 3.5, 3.2, skin); g.px(5, 6, '#ffe14d'); g.px(8, 6, '#ffe14d');
    g.rect(3, 2, 8, 3, '#5a3a8a'); g.px(4, 1, '#5a3a8a'); g.px(7, 0, '#5a3a8a'); g.rect(3, 4, 1, 3, '#5a3a8a'); g.rect(10, 4, 1, 3, '#5a3a8a');
    g.rect(13, 3, 1, 14, '#7a5230'); g.ell(13.5, 2, 2, 2, f ? '#bfffb0' : '#7fe06a');
    return both(g.outline(OUT));
  }
  function harpy(f) {                // ハーピー：茶色の翼と人の顔
    var g = new Grid(22, 15), w = '#9a6a3a', d = '#6a4422';
    g.ell(11, 8, 3, 4, '#c89a6a'); g.ell(11, 4, 2.5, 2.5, '#f0c49a'); g.rect(8, 1, 6, 2, '#5a3a1e'); g.px(10, 4, '#2a1a10'); g.px(12, 4, '#2a1a10');
    if (f === 0) { g.rect(1, 4, 7, 2, w); g.rect(14, 4, 7, 2, w); g.rect(0, 3, 3, 1, d); g.rect(19, 3, 3, 1, d); }
    else { g.rect(1, 8, 7, 2, w); g.rect(14, 8, 7, 2, w); g.rect(0, 10, 3, 1, d); g.rect(19, 10, 3, 1, d); }
    g.rect(10, 12, 1, 2, '#e0b040'); g.rect(12, 12, 1, 2, '#e0b040');
    return both(g.outline(OUT));
  }
  function wyvern(f) {               // ワイバーン：緑の翼のある竜（エリート）
    var g = new Grid(30, 20), c = '#4a8a3a', d = '#2e5a24', b = '#a8d080';
    g.ell(15, 11, 6, 3.5, c); g.ell(15, 12, 4, 2, b);
    g.rect(20, 7, 3, 4, c); g.ell(24, 6, 3, 2.2, c); g.px(25, 5, '#ffd84a'); g.rect(26, 7, 2, 1, '#e0e0d0');
    g.rect(4, 11, 6, 2, c); g.px(2, 12, c); g.px(3, 11, c);
    if (f === 0) { g.rect(10, 2, 9, 2, d); g.rect(9, 0, 3, 2, d); g.rect(17, 4, 3, 4, d); g.rect(11, 4, 6, 4, c); }
    else { g.rect(10, 13, 9, 2, d); g.rect(9, 15, 3, 2, d); g.rect(11, 9, 6, 4, d); }
    g.rect(13, 14, 2, 3, d); g.rect(17, 14, 2, 3, d);
    return both(g.outline(OUT));
  }
  function skeleton(f) {
    var g = new Grid(14, 18), b = '#e8e2d0', d = '#a8a090';
    if (f === 0) { g.rect(5, 13, 1, 4, b); g.rect(8, 13, 1, 3, b); g.px(9, 16, b); } else { g.rect(5, 13, 1, 3, b); g.px(4, 16, b); g.rect(8, 13, 1, 4, b); }
    g.rect(6, 8, 2, 5, b); for (var y = 8; y < 13; y += 2) g.rect(4, y, 6, 1, d);
    g.rect(3, 8, 1, 4, b); g.rect(10, 8, 1, 4, b); g.rect(11, 3, 1, 9, '#9a8a6a');
    g.ell(7, 4, 3.5, 3.2, b); g.rect(5, 4, 2, 2, '#1a1a1a'); g.rect(8, 4, 2, 2, '#1a1a1a'); g.rect(6, 7, 3, 1, d);
    return both(g.outline(OUT));
  }
  function kingslime(f, pal) {
    pal = pal || ['#7a3fa0', '#9a5fc8', '#d8b8f0'];
    var g = new Grid(26, 19), sq = f === 1, B = 17, rx = sq ? 12 : 10.5, ry = sq ? 11 : 14;
    g.ell(13, B + 1, rx, ry, pal[0]); g.ell(13, B + 1, rx - 1.5, ry - 2, pal[1]); g.rect(0, B + 1, 26, 2, null);
    g.ell(9.5, B + 1 - ry + 4, 2.5, 1.5, pal[2]);
    var ey = Math.round(B - ry * 0.4); g.rect(9, ey, 2, 2, '#1a0e24'); g.rect(15, ey, 2, 2, '#1a0e24');
    var ty = B + 1 - ry; g.rect(9, ty - 2, 8, 2, '#ffd84a'); g.px(9, ty - 3, '#ffd84a'); g.px(13, ty - 3, '#ffd84a'); g.px(16, ty - 3, '#ffd84a');
    return both(g.outline(OUT));
  }
  function yeti(f) {
    var g = new Grid(22, 24), w = '#e8eef5', s2 = '#b8c6d6';
    if (f === 0) { g.rect(7, 19, 3, 4, s2); g.rect(12, 19, 3, 3, s2); } else { g.rect(7, 19, 3, 3, s2); g.rect(12, 19, 3, 4, s2); }
    g.ell(11, 13, 8, 7, w); g.ell(11, 14, 5, 4, '#d6e0ec');
    g.rect(1, 9, 3, 9, w); g.rect(18, 9, 3, 9, w); g.rect(1, 17, 3, 2, '#7a8aa0'); g.rect(18, 17, 3, 2, '#7a8aa0');
    g.ell(11, 5, 5, 4.5, w); g.rect(8, 5, 6, 3, '#7a8aa0'); g.px(9, 5, '#4ea8ff'); g.px(12, 5, '#4ea8ff'); g.rect(9, 7, 4, 1, '#1a2230');
    return both(g.outline(OUT));
  }
  function salamander(f) {
    var g = new Grid(22, 12), c = '#d94a2a', d = '#8a2a1a', y = '#ffb347';
    g.rect(1, 6, 5, 2, c); g.px(0, 5, '#ffd84a'); g.px(1, 4, '#ff8a2a');         // しっぽの火
    g.ell(11, 7, 6.5, 2.6, c); g.rect(6, 6, 10, 1, y);
    if (f === 0) { g.rect(7, 9, 2, 2, d); g.rect(14, 9, 2, 2, d); } else { g.rect(8, 9, 2, 2, d); g.rect(13, 9, 2, 2, d); }
    g.ell(18, 6, 3.5, 2.4, c); g.px(19, 5, '#ffe14d'); g.rect(20, 7, 2, 1, d);
    return both(g.outline(OUT));
  }

  function dragon(f) {   // ラスボス：火竜（とても大きい・翼）
    var g = new Grid(46, 40), r = '#a8281e', d = '#6a1812', y = '#ffb347';
    var wy = f === 0 ? 0 : 5;   // 翼のはばたき
    for (var i = 0; i < 14; i++) { g.rect(3 + i, 4 + wy + Math.floor(i / 2), 2, 14 - Math.floor(i / 2) - wy, i % 3 === 0 ? d : '#8a2018'); }
    for (i = 0; i < 14; i++) { g.rect(29 + i, 4 + wy + Math.floor((13 - i) / 2), 2, 14 - Math.floor((13 - i) / 2) - wy, i % 3 === 0 ? d : '#8a2018'); }
    g.ell(23, 25, 12, 9, r); g.ell(23, 28, 8, 5, y);                       // 胴・おなか
    for (i = 0; i < 4; i++) g.rect(19 + i * 3, 25 + i, 6 - i, 1, '#e8902e');
    g.rect(13, 32, 5, 7, d); g.rect(28, 32, 5, 7, d); g.rect(12, 38, 7, 2, '#3a0a08'); g.rect(27, 38, 7, 2, '#3a0a08');
    g.rect(33, 27, 10, 3, r); g.rect(41, 24, 3, 4, r); g.px(44, 23, y);    // しっぽ
    g.rect(20, 9, 6, 9, r);                                                // 首
    g.ell(23, 7, 6, 5, r); g.rect(23, 6, 9, 5, r); g.rect(28, 9, 4, 2, d); // 頭・口
    g.rect(24, 4, 2, 2, '#ffe14d'); g.px(25, 4, '#1a1a1a');
    g.rect(18, 0, 2, 4, '#e8e0d0'); g.rect(22, 0, 2, 3, '#e8e0d0');       // 角
    if (f === 1) { g.rect(32, 9, 6, 2, '#ff6a2a'); g.rect(36, 8, 4, 4, '#ffd84a'); }   // 口の火
    return both(g.outline(OUT));
  }

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
  G.relicIcon = function (id) { if (!G.SPR.relic[id]) G.SPR.relic[id] = relicIcon(id); return G.SPR.relic[id]; };

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

  // ---- 地形の飾り（地域ごと） ----

  // ---- 道に置く物と兵舎 ----
  function soldier(f) {             // 兵士：青い服に兜と剣。コマ1は剣をふり下ろす
    var g = new Grid(10, 12);
    g.rect(3, 1, 4, 2, '#9aa2ac'); g.px(3, 0, '#c0c8d0'); g.px(4, 0, '#c0c8d0');
    g.rect(3, 3, 4, 2, '#f0c49a'); g.px(5, 3, '#2a1a10');
    g.rect(2, 5, 6, 4, '#3a6ad0'); g.rect(2, 5, 1, 4, '#5a8af0');
    g.rect(3, 9, 1, 3, '#4a3a2a'); g.rect(6, 9, 1, 3, '#4a3a2a');
    g.rect(0, 5, 2, 3, '#c0c8d8');
    if (f) g.rect(8, 6, 2, 1, '#e8ecf0'); else g.rect(8, 2, 1, 5, '#e8ecf0');
    g.px(8, 7, '#8a6a2a');
    return both(g.outline(OUT));
  }
  function golemUnit(f) {            // 石の巨人（道に出る）
    var g = new Grid(16, 18);
    if (f) { g.rect(3, 6, 3, 6, '#8b8f94'); g.rect(11, 3, 3, 6, '#8b8f94'); } else { g.rect(2, 7, 3, 7, '#8b8f94'); g.rect(11, 7, 3, 7, '#8b8f94'); }
    g.rect(5, 5, 6, 8, '#9fa3a8'); g.rect(5, 5, 6, 1, '#c3c7cc');
    g.rect(6, 1, 4, 4, '#9fa3a8'); g.px(7, 2, '#5fd8ff'); g.px(8, 2, '#5fd8ff');
    g.rect(5, 13, 2, 4, '#7d8186'); g.rect(9, 13, 2, 4, '#7d8186');
    g.px(7, 8, '#6d7177'); g.px(9, 10, '#6d7177');
    return both(g.outline(OUT));
  }
  function heart() {
    var g = new Grid(7, 6);
    g.rect(0, 1, 7, 2, '#ff5a5a'); g.rect(1, 0, 2, 1, '#ff5a5a'); g.rect(4, 0, 2, 1, '#ff5a5a');
    g.rect(1, 3, 5, 1, '#ff5a5a'); g.rect(2, 4, 3, 1, '#ff5a5a'); g.px(3, 5, '#ff5a5a'); g.px(1, 1, '#ffd0d0');
    return g.bake();
  }

  G.buildSprites = function () {
    var S = {
      slime: [slime(0), slime(1)],
      goblin: [goblin(0), goblin(1)],
      orc: [orc(0), orc(1)],
      knight: [orc(0, { skin: '#5d7f52', dark: '#3f5a37', armor: ['#4a4f5c', '#7d8496', '#2e323c'], trim: '#d9b24a' }),
               orc(1, { skin: '#5d7f52', dark: '#3f5a37', armor: ['#4a4f5c', '#7d8496', '#2e323c'], trim: '#d9b24a' })],
      wolf: [wolf(0), wolf(1)],
      bat: [bat(0), bat(1)],
      icebat: [bat(0, { c: '#7ab8e0', d: '#4a7aa8' }), bat(1, { c: '#7ab8e0', d: '#4a7aa8' })],
      iceknight: [orc(0, { skin: '#8ab0c8', dark: '#5a7a92', armor: ['#a8c8e0', '#e0f0ff', '#6a8aa8'], trim: '#ffffff' }),
                  orc(1, { skin: '#8ab0c8', dark: '#5a7a92', armor: ['#a8c8e0', '#e0f0ff', '#6a8aa8'], trim: '#ffffff' })],
      frostgiant: [ogre(0, { skin: '#9ac0d8', dark: '#5a7a92', belly: '#c8e0f0' }), ogre(1, { skin: '#9ac0d8', dark: '#5a7a92', belly: '#c8e0f0' })],
      magma: [kingslime(0, ['#a8281e', '#e0582a', '#ffd84a']), kingslime(1, ['#a8281e', '#e0582a', '#ffd84a'])],
      demon: [orc(0, { skin: '#c8402a', dark: '#7a2016', armor: ['#3a2a2a', '#5a4040', '#1e1414'], trim: '#ff8a2a' }),
              orc(1, { skin: '#c8402a', dark: '#7a2016', armor: ['#3a2a2a', '#5a4040', '#1e1414'], trim: '#ff8a2a' })],
      dragon: [dragon(0), dragon(1)], skeleton: [skeleton(0), skeleton(1)], kingslime: [kingslime(0), kingslime(1)],
      yeti: [yeti(0), yeti(1)], salamander: [salamander(0), salamander(1)],
      ogre: [ogre(0), ogre(1)], soldier: [soldier(0), soldier(1)], golemUnit: [golemUnit(0), golemUnit(1)],
      shaman: [shaman(0), shaman(1)], harpy: [harpy(0), harpy(1)], wyvern: [wyvern(0), wyvern(1)],
      goblinlord: [ogre(0, { skin: '#7aa83a', dark: '#4e7a22', belly: '#a8c870' }), ogre(1, { skin: '#7aa83a', dark: '#4e7a22', belly: '#a8c870' })],
      lich: [ogre(0, { skin: '#8a8aa8', dark: '#4e4e6a', belly: '#c8c8e0' }), ogre(1, { skin: '#8a8aa8', dark: '#4e4e6a', belly: '#c8c8e0' })],
      demonlord: [ogre(0, { skin: '#7a1e1e', dark: '#3a0a0a', belly: '#b04030' }), ogre(1, { skin: '#7a1e1e', dark: '#3a0a0a', belly: '#b04030' })],
      slimeking: [slimeking(0), slimeking(1)], wolfking: [wolfking(0), wolfking(1)], harpyqueen: [harpyqueen(0), harpyqueen(1)],
      icecommander: [icecommander(0), icecommander(1)], blizzardwitch: [blizzardwitch(0), blizzardwitch(1)], flamegeneral: [flamegeneral(0), flamegeneral(1)],
      icon: {}, node: {}, relic: {},
      heart: heart()
    };
    ['eye', 'bag', 'stone', 'coin', 'hammer', 'horn', 'saw', 'gear', 'scroll', 'meteor', 'sword', 'hourglass', 'star', 'bandage', 'target', 'poster', 'energy'].forEach(function (k) { S.icon[k] = icon(k); });
    ['battle', 'elite', 'event', 'shop', 'rest', 'boss'].forEach(function (k) { S.node[k] = nodeIcon(k); });
    G.TowerArt.apply(S);   // タワーの絵は js/towerart.js（24×18の疑似3D）で作る
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

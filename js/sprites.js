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

  // ---- タワー（lv：0〜2。強化すると旗の色と飾りが変わる） ----
  var FLAG = ['#d94a3a', '#3a7bd9', '#e6b84a'];
  function stoneBase(g, x, y, w, h) {
    g.rect(x, y, w, h, '#8b8f94');
    for (var j = 0; j < h; j += 3) for (var i = (j / 3) % 2 ? 0 : 2; i < w; i += 4) g.px(x + i, y + j, '#6d7177');
    g.rect(x, y + h - 1, w, 1, '#5b5f64');
    g.rect(x, y, 1, h, '#a6aaaf');
  }
  function archerTower(lv, fire) {
    var g = new Grid(18, 30);
    stoneBase(g, 3, 14, 12, 15);
    g.rect(1, 11, 16, 4, '#8a5a2b'); g.rect(1, 11, 16, 1, '#b07a42');      // 見張り台
    for (var i = 1; i < 17; i += 3) g.rect(i, 9, 2, 2, '#8a5a2b');
    // 弓兵
    g.rect(7, 4, 4, 5, '#2f6e3a'); g.ell(9, 3, 2, 2, '#f1c79b'); g.rect(7, 1, 4, 1, '#2f6e3a');
    if (fire) { g.rect(11, 3, 1, 5, '#c08a4a'); g.rect(12, 5, 3, 1, '#e6e6e6'); }
    else { g.rect(11, 3, 1, 5, '#c08a4a'); g.px(12, 5, '#e6e6e6'); }
    g.rect(14, 16 - lv, 1, 6 + lv, '#5b4632'); g.rect(15, 16 - lv, 2, 2, FLAG[lv]);  // 旗
    if (lv >= 2) { g.px(5, 20, '#e6b84a'); g.px(12, 20, '#e6b84a'); }
    return g.outline(OUT).bake();
  }
  function mageTower(lv, fire) {
    var g = new Grid(18, 34);
    stoneBase(g, 4, 17, 10, 16);
    g.rect(5, 22, 2, 3, '#2a1f45'); g.rect(11, 22, 2, 3, '#2a1f45');      // 窓
    g.px(5, 23, '#c79bff'); g.px(11, 23, '#c79bff');
    // とんがり屋根
    for (var r = 0; r < 10; r++) g.rect(9 - Math.ceil(r * 0.7) - 1, 7 + r, Math.ceil(r * 0.7) * 2 + 2, 1, r % 3 === 0 ? '#5a3a9a' : '#6f4cc0');
    g.rect(2, 17, 14, 1, '#4a2f80');
    // 水晶（撃つ瞬間に光る）
    var cr = fire ? '#ffffff' : (lv >= 2 ? '#ffd76a' : '#9be7ff');
    g.rect(8, 2, 2, 4, cr); g.px(9, 1, cr); g.px(8, 6, '#4aa8d8'); g.px(9, 6, '#4aa8d8');
    g.rect(14, 20 - lv, 1, 5 + lv, '#5b4632'); g.rect(15, 20 - lv, 2, 2, FLAG[lv]);
    return g.outline(OUT).bake();
  }
  function cannonTower(lv, fire) {
    var g = new Grid(22, 20);
    stoneBase(g, 2, 9, 16, 10);
    g.rect(1, 8, 18, 2, '#9fa3a8');
    for (var i = 1; i < 19; i += 4) g.rect(i, 6, 2, 2, '#9fa3a8');
    // 砲身（撃つと後ろに下がる）
    var bx = fire ? 5 : 7;
    g.rect(4, 6, 9, 2, '#7a5230'); g.rect(4, 6, 9, 1, '#9a6e40');          // 木の台
    g.rect(bx, 2, 11, 4, '#3a3d42'); g.rect(bx, 2, 11, 1, '#6a6e74');      // 砲身
    g.rect(bx - 1, 3, 1, 2, '#2a2c30'); g.rect(bx + 10, 1, 2, 6, '#2a2c30');
    g.rect(3, 12, 1, 4, '#5b4632'); g.rect(4, 12, 2, 2, FLAG[lv]);
    if (lv >= 2) g.rect(bx + 2, 4, 1, 2, '#e6b84a');
    return both(g.outline(OUT));
  }

  function woodBase(g, x, y, w, h) {
    g.rect(x, y, w, h, '#8a5a2b');
    for (var i = x + 2; i < x + w; i += 3) g.rect(i, y, 1, h, '#6b4422');
    g.rect(x, y, w, 1, '#b07a42'); g.rect(x, y + h - 1, w, 1, '#5a3a1e');
  }
  function bowmanTower(lv, fire) {   // 見習い弓兵：木のやぐら
    var g = new Grid(18, 28);
    g.rect(4, 14, 2, 13, '#6b4422'); g.rect(12, 14, 2, 13, '#6b4422'); g.rect(4, 20, 10, 1, '#6b4422');
    woodBase(g, 2, 11, 14, 4);
    g.rect(7, 4, 4, 6, '#7a5a2a'); g.ell(9, 3, 2, 2, '#f1c79b'); g.rect(7, 1, 4, 1, '#5a3a1e');
    g.rect(11, 3, 1, 5, '#c08a4a'); if (fire) g.rect(12, 5, 3, 1, '#e6e6e6'); else g.px(12, 5, '#e6e6e6');
    g.rect(15, 14 - lv, 1, 5 + lv, '#5b4632'); g.rect(16, 14 - lv, 2, 2, FLAG[lv]);
    return g.outline(OUT).bake();
  }
  function slingTower(lv, fire) {   // 投石小屋：わらぶき屋根の小屋と石の山
    var g = new Grid(20, 20);
    woodBase(g, 3, 9, 14, 10);
    g.rect(8, 13, 4, 6, '#3b2a1a');
    for (var r = 0; r < 6; r++) g.rect(10 - r * 1.5 - 2, 3 + r, r * 3 + 4, 1, r % 2 ? '#d9b24a' : '#c49a35');
    g.rect(1, 9, 18, 1, '#a07a28');
    g.ell(17, 17, 2.5, 2, '#8b8f94'); g.px(16, 16, '#b4b8bc');
    var ax = fire ? 3 : 5; g.rect(ax, 5, 1, 4, '#6b4422'); g.ell(ax, 4, 1.5, 1.5, '#9a9a9a');   // 投石ひも
    g.rect(1, 12 - lv, 1, 4 + lv, '#5b4632'); g.rect(2, 12 - lv, 2, 2, FLAG[lv]);
    return g.outline(OUT).bake();
  }
  function watchTower(lv, fire) {   // 見張り小屋：細い柱と小さな台
    var g = new Grid(14, 22);
    g.rect(6, 9, 2, 12, '#6b4422'); g.rect(4, 20, 6, 1, '#5a3a1e');
    woodBase(g, 2, 8, 10, 2);
    g.rect(5, 3, 4, 5, '#4a6a8a'); g.ell(7, 2, 1.8, 1.8, '#f1c79b');
    g.rect(9, 3, 1, 4, '#c08a4a'); if (fire) g.rect(10, 4, 3, 1, '#e6e6e6');
    g.rect(11, 9 - lv, 1, 4 + lv, '#5b4632'); g.rect(12, 9 - lv, 2, 2, FLAG[lv]);
    return g.outline(OUT).bake();
  }
  function poisonTower(lv, fire) {  // 毒の塔：石台の上の大釜
    var g = new Grid(20, 24);
    stoneBase(g, 3, 14, 14, 9);
    g.ell(10, 11, 7, 4.5, '#3a3d42'); g.rect(3, 8, 14, 2, '#55595e');
    g.ell(10, 8.5, 6, 1.6, fire ? '#d4ff7a' : '#8fd64a');
    g.ell(7, 5, 1.6, 1.6, '#a6e85a'); g.ell(12, 3, 1.2, 1.2, '#a6e85a'); g.px(10, 1, '#c8f59a');
    g.rect(1, 15, 2, 6, '#6b4422'); g.rect(17, 15, 2, 6, '#6b4422');
    g.rect(17, 13 - lv, 1, 4 + lv, '#5b4632'); g.rect(18, 13 - lv, 2, 2, FLAG[lv]);
    return g.outline(OUT).bake();
  }
  function frostTower(lv, fire) {   // 氷の塔：青い石の塔と氷の結晶
    var g = new Grid(18, 34);
    g.rect(4, 16, 10, 17, '#7ea6c4');
    for (var j = 16; j < 33; j += 3) for (var i = ((j - 16) / 3) % 2 ? 4 : 6; i < 14; i += 4) g.px(i, j, '#5f86a6');
    g.rect(4, 16, 1, 17, '#a9cbe3'); g.rect(4, 32, 10, 1, '#4f7090');
    g.rect(2, 14, 14, 2, '#a9cbe3');
    var c = fire ? '#ffffff' : '#bff0ff';
    g.rect(8, 2, 2, 11, c); g.rect(5, 7, 8, 2, c); g.rect(6, 4, 1, 1, c); g.rect(11, 4, 1, 1, c); g.rect(6, 11, 1, 1, c); g.rect(11, 11, 1, 1, c);
    g.px(8, 7, '#5fc8ff'); g.px(9, 8, '#5fc8ff');
    g.rect(14, 19 - lv, 1, 5 + lv, '#5b4632'); g.rect(15, 19 - lv, 2, 2, FLAG[lv]);
    return g.outline(OUT).bake();
  }
  function ballistaTower(lv, fire) { // 大型弩砲：石台の上の大きな弓
    var g = new Grid(26, 22);
    stoneBase(g, 3, 11, 18, 10);
    g.rect(2, 9, 20, 2, '#9fa3a8');
    g.rect(6, 6, 14, 2, '#6b4422'); g.rect(6, 6, 14, 1, '#9a6e40');          // 台
    g.rect(16, 0, 2, 13, '#7a5230');                                           // 弓
    g.px(15, 0, '#7a5230'); g.px(15, 12, '#7a5230');
    var bx = fire ? 9 : 6;
    g.rect(bx, 5, 13, 1, '#d8d8d8'); g.px(bx + 13, 5, '#ffffff'); g.px(bx + 12, 4, '#ffffff'); g.px(bx + 12, 6, '#ffffff');  // 太い矢
    g.rect(fire ? 15 : 8, 1, 1, 10, '#e0d8c0');                               // 弦
    g.rect(2, 13, 1, 5, '#5b4632'); g.rect(3, 13, 2, 2, FLAG[lv]);
    if (lv >= 2) g.rect(10, 7, 4, 1, '#e6b84a');
    return both(g.outline(OUT));
  }

  function fireTower(lv, fire) {    // 炎の塔：赤レンガの塔と火の玉
    var g = new Grid(18, 32);
    g.rect(4, 15, 10, 16, '#8a3b2a');
    for (var j = 15; j < 31; j += 3) for (var i = ((j - 15) / 3) % 2 ? 4 : 6; i < 14; i += 4) g.px(i, j, '#6b2a1e');
    g.rect(4, 15, 1, 16, '#b0573f'); g.rect(4, 30, 10, 1, '#4a1a12');
    g.rect(2, 13, 14, 2, '#5a2418'); g.rect(3, 11, 2, 2, '#5a2418'); g.rect(13, 11, 2, 2, '#5a2418');
    g.ell(9, 7, fire ? 4.5 : 3.8, fire ? 5 : 4.5, '#ff6a2a'); g.ell(9, 8, 2.5, 3, '#ffd84a'); g.px(9, 9, '#ffffff');
    g.rect(14, 18 - lv, 1, 5 + lv, '#5b4632'); g.rect(15, 18 - lv, 2, 2, FLAG[lv]);
    return g.outline(OUT).bake();
  }
  function thunderTower(lv, fire) { // 雷の塔：細い石の塔と金属の玉
    var g = new Grid(18, 34);
    stoneBase(g, 5, 14, 8, 19);
    g.rect(4, 12, 10, 2, '#9fa3a8'); g.rect(8, 5, 2, 7, '#6b6e74');
    g.ell(9, 4, 3.5, 3.5, fire ? '#ffffff' : '#ffe14d'); g.ell(8, 3, 1.4, 1.4, '#fff8c0');
    if (fire) { g.px(3, 2, '#ffe14d'); g.px(14, 5, '#ffe14d'); g.px(2, 6, '#ffe14d'); g.px(15, 1, '#ffe14d'); }
    g.rect(13, 17 - lv, 1, 5 + lv, '#5b4632'); g.rect(14, 17 - lv, 2, 2, FLAG[lv]);
    return g.outline(OUT).bake();
  }
  function mineTower(lv) {          // 金鉱：木の入口と金のかたまり
    var g = new Grid(20, 18);
    g.ell(10, 12, 9, 6, '#6b5a48'); g.ell(10, 11, 8, 5, '#857260');
    g.rect(6, 7, 8, 10, '#3b2a1a'); g.rect(5, 6, 10, 2, '#8a5a2b'); g.rect(5, 6, 2, 11, '#8a5a2b'); g.rect(13, 6, 2, 11, '#8a5a2b');
    g.ell(16, 15, 2.5, 2, '#ffd84a'); g.px(15, 14, '#fff3b0'); g.ell(3.5, 15, 1.8, 1.4, '#e6b84a');
    g.rect(17, 5 - lv, 1, 4 + lv, '#5b4632'); g.rect(18, 5 - lv, 2, 2, FLAG[lv]);
    return g.outline(OUT).bake();
  }
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
  function pine(v) {   // 雪の針葉樹
    var g = new Grid(16, 22);
    g.rect(7, 16, 2, 5, '#5a3a22');
    for (var r = 0; r < 14; r++) { var w = Math.min(13, 3 + Math.floor(r * 0.8)); g.rect(8 - Math.floor(w / 2), 2 + r, w, 1, r % 4 === 0 ? '#e8f0f8' : (v ? '#2a5a4a' : '#24524a')); }
    g.px(8, 1, '#e8f0f8');
    return g.outline('#14262a').bake();
  }
  function spire(v) {  // 火山の黒い岩の柱
    var g = new Grid(16, 22);
    for (var r = 0; r < 18; r++) { var w = 2 + Math.floor(r / 3); g.rect(8 - Math.floor(w / 2) + (v && r < 6 ? 1 : 0), 3 + r, w, 1, r % 5 === 2 ? '#5a3a34' : '#3a2a28'); }
    g.px(7, 12, '#ff6a2a'); g.px(9, 17, '#ff6a2a');
    return g.outline('#120a08').bake();
  }

  // ---- 地形の飾り ----
  function tree(v) {
    var g = new Grid(16, 22), d = v ? '#2d6b34' : '#2a5e40', m = v ? '#3f8a45' : '#3b7a55', l = v ? '#62b061' : '#5aa27a';
    g.rect(7, 15, 3, 6, '#6b4a2b');
    g.ell(8, 10, 7, 6, d); g.ell(8, 8, 6, 5, m); g.ell(6.5, 5.5, 3.5, 3, l);
    g.ell(8, 13, 6, 2, d);
    return g.outline('#122218').bake();
  }
  function rock() {
    var g = new Grid(14, 10);
    g.ell(7, 6, 6, 3.5, '#7b8086'); g.ell(6, 5, 4, 2.4, '#9ca1a7'); g.px(5, 4, '#c3c7cc');
    return g.outline('#2a2d30').bake();
  }
  function gate() { // 入口（洞穴）
    var g = new Grid(20, 14);
    g.ell(10, 9, 10, 6, '#5a5048'); g.ell(10, 8, 9, 5.5, '#7a6e62');
    g.ell(10, 10, 5.5, 4.5, '#0e0a08'); g.rect(4, 12, 12, 2, '#0e0a08');
    g.px(4, 5, '#9a8e80'); g.px(15, 6, '#9a8e80');
    return g.bake();
  }
  // ---- 道に置く物と兵舎 ----
  function spikesTower(lv) {        // トゲの罠：地面の板から金属のトゲ
    var g = new Grid(14, 8);
    g.rect(1, 5, 12, 3, '#5a4632'); g.rect(1, 5, 12, 1, '#7a6046');
    var tip = lv >= 2 ? '#ffe9a0' : '#e8ecf0';
    for (var i = 2; i < 13; i += 3) { g.rect(i, 2, 1, 3, '#9aa2ac'); g.px(i, 1, tip); }
    if (lv >= 1) for (var k = 3; k < 12; k += 3) { g.rect(k, 3, 1, 2, '#9aa2ac'); g.px(k, 2, tip); }
    return g.outline(OUT).bake();
  }
  function tarTower(lv) {           // 粘着の沼：黒いどろどろの水たまり
    var g = new Grid(16, 7);
    g.ell(8, 3.5, 7.5, 3, '#1e1a22'); g.ell(8, 3.2, 6, 2.2, '#2e2a36');
    g.px(5, 2, '#6a6478'); g.px(11, 3, '#6a6478'); g.px(8, 4, '#4a4458');
    if (lv >= 1) g.px(12, 1, '#6a6478');
    if (lv >= 2) { g.px(3, 3, '#b07ad0'); g.px(9, 2, '#b07ad0'); }
    return g.bake();
  }
  function barrelTower() {          // 爆弾樽：導火線つきの樽
    var g = new Grid(10, 13);
    g.rect(1, 3, 8, 10, '#8a5a2b'); g.rect(2, 3, 1, 10, '#b07a40');
    g.rect(1, 5, 8, 1, '#4a4f5c'); g.rect(1, 10, 8, 1, '#4a4f5c');
    g.rect(3, 7, 4, 2, '#d94a3a');
    g.rect(5, 1, 1, 2, '#e0d8c0'); g.px(6, 0, '#ffd84a');
    return g.outline(OUT).bake();
  }
  function barricadeTower(lv) {     // バリケード：とがった杭を組んだ柵
    var g = new Grid(16, 14);
    var wood = lv >= 2 ? '#7a6a5a' : '#8a5a2b', hi = lv >= 2 ? '#a8a8b0' : '#b07a40';
    for (var i = 1; i < 15; i += 3) { g.rect(i, 3, 2, 11, wood); g.px(i, 3, hi); g.px(i + 1, 2, hi); }
    g.rect(0, 6, 16, 2, '#5a3a1e'); g.rect(0, 10, 16, 2, '#5a3a1e');
    if (lv >= 1) { g.rect(0, 8, 16, 1, '#4a4f5c'); }
    return g.outline(OUT).bake();
  }
  function barracksTower(lv) {      // 兵舎：木の小屋と旗
    var g = new Grid(22, 22);
    stoneBase(g, 3, 13, 16, 8);
    g.rect(4, 8, 14, 6, '#8a5a2b'); g.rect(4, 8, 14, 1, '#b07a40');
    for (var r = 0; r < 5; r++) g.rect(3 + r, 7 - r, 16 - r * 2, 1, r % 2 ? '#a8402a' : '#c8503a');
    g.rect(9, 10, 4, 4, '#3b2a1a');
    g.rect(16, 0, 1, 8, '#5b4632'); g.rect(17, 0, 4, 3, FLAG[lv]);
    g.rect(5, 11, 2, 2, '#ffe9a0');
    return g.outline(OUT).bake();
  }
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
  function sniperTower(lv, fire) {   // 狙撃塔：細く高い石の塔と長い弩
    var g = new Grid(18, 36);
    stoneBase(g, 6, 12, 6, 23);
    g.rect(4, 10, 10, 2, '#9fa3a8'); g.rect(5, 8, 8, 2, '#6b4422'); g.rect(5, 8, 8, 1, '#9a6e40');
    g.rect(2, 6, 14, 1, fire ? '#ffffff' : '#d8d8d8'); g.px(16, 6, '#ffffff'); g.px(15, 5, '#ffffff'); g.px(15, 7, '#ffffff');
    g.rect(11, 3, 1, 7, '#7a5230'); g.px(10, 3, '#7a5230'); g.px(10, 9, '#7a5230');
    g.rect(7, 4, 3, 2, '#4a7ad0'); g.px(8, 3, '#bfe0ff');                        // 照準
    g.rect(13, 15 - lv, 1, 5 + lv, '#5b4632'); g.rect(14, 15 - lv, 2, 2, FLAG[lv]);
    return both(g.outline(OUT));
  }
  function stormTower(lv, fire) {    // 嵐の塔：黒い塔の上に浮かぶ雷雲
    var g = new Grid(20, 36);
    stoneBase(g, 5, 16, 10, 19);
    g.rect(4, 14, 12, 2, '#5a5e64'); g.rect(9, 9, 2, 5, '#6b6e74');
    g.ell(10, 6, 8, 4, fire ? '#8a8aa8' : '#5a5a78'); g.ell(7, 5, 3, 2, '#7a7a98'); g.ell(13, 5, 3, 2, '#7a7a98');
    g.rect(9, 9, 2, 2, '#ffe14d'); g.px(8, 11, '#ffe14d');
    if (fire) { g.rect(3, 9, 1, 4, '#ffffff'); g.rect(16, 9, 1, 3, '#ffe14d'); g.rect(12, 11, 1, 3, '#ffffff'); }
    g.rect(15, 19 - lv, 1, 5 + lv, '#5b4632'); g.rect(16, 19 - lv, 2, 2, FLAG[lv]);
    return g.outline(OUT).bake();
  }
  function dartTower(lv, fire) {     // 吹き矢小屋：竹の小屋と吹き矢の筒
    var g = new Grid(16, 22);
    g.rect(3, 10, 10, 11, '#8a9a4a'); for (var i = 3; i < 13; i += 2) g.rect(i, 10, 1, 11, '#6a7a3a');
    g.rect(1, 7, 14, 3, '#c8a860'); g.rect(2, 5, 12, 2, '#a88840'); g.rect(4, 4, 8, 1, '#a88840');
    g.rect(fire ? 9 : 8, 12, 6, 1, '#e8d9b0'); g.px(fire ? 15 : 14, 12, '#ffffff');
    g.rect(12, 14 - lv, 1, 5 + lv, '#5b4632'); g.rect(13, 14 - lv, 2, 2, FLAG[lv]);
    return g.outline(OUT).bake();
  }
  function mortarTower(lv, fire) {   // 臼砲：低い石の台と上を向いた太い砲
    var g = new Grid(24, 20);
    stoneBase(g, 3, 11, 18, 8);
    g.rect(2, 9, 20, 2, '#9fa3a8');
    g.ell(12, 6, 5, 4, '#3a3e44'); g.ell(12, 4, 4, 2, '#1e2024'); g.rect(9, 7, 6, 2, '#5a5e64');
    if (fire) { g.ell(12, 2, 3, 2, '#ffb347'); g.px(12, 0, '#ffe08a'); }
    g.rect(20, 12 - lv, 1, 5 + lv, '#5b4632'); g.rect(21, 12 - lv, 2, 2, FLAG[lv]);
    return g.outline(OUT).bake();
  }
  function blizzardTower(lv, fire) { // 吹雪の塔：氷の柱と回る雪
    var g = new Grid(20, 34);
    g.rect(6, 12, 8, 21, '#a8d8f0'); g.rect(6, 12, 2, 21, '#e0f4ff'); g.rect(12, 12, 2, 21, '#7ab8e0');
    g.rect(4, 30, 12, 3, '#7ab8e0');
    g.rect(8, 3, 4, 9, '#e0f4ff'); g.rect(9, 1, 2, 2, '#ffffff'); g.rect(6, 6, 8, 2, '#bfe8ff');
    var c = fire ? '#ffffff' : '#bfe8ff';
    g.px(2, 8, c); g.px(17, 5, c); g.px(3, 16, c); g.px(16, 14, c); g.px(1, 22, c); g.px(18, 20, c);
    g.rect(14, 18 - lv, 1, 5 + lv, '#5b4632'); g.rect(15, 18 - lv, 2, 2, FLAG[lv]);
    return g.outline(OUT).bake();
  }
  function golemTower(lv) {          // 石像の工房：石の門と台座
    var g = new Grid(22, 22);
    stoneBase(g, 2, 8, 18, 13);
    g.rect(7, 12, 8, 9, '#2a2620'); g.ell(11, 12, 4, 3, '#2a2620');
    g.rect(1, 6, 20, 2, '#9fa3a8'); g.rect(4, 3, 3, 3, '#8b8f94'); g.rect(15, 3, 3, 3, '#8b8f94');
    g.rect(10, 15, 2, 2, '#ffd84a');
    g.rect(19, 9 - lv, 1, 5 + lv, '#5b4632'); g.rect(20, 9 - lv, 2, 2, FLAG[lv]);
    return g.outline(OUT).bake();
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
  function castle() {
    var g = new Grid(28, 26);
    stoneBase(g, 3, 10, 22, 15);
    for (var i = 3; i < 25; i += 4) g.rect(i, 8, 2, 2, '#8b8f94');
    stoneBase(g, 1, 4, 6, 21); stoneBase(g, 21, 4, 6, 21);
    g.rect(1, 2, 2, 2, '#8b8f94'); g.rect(5, 2, 2, 2, '#8b8f94'); g.rect(21, 2, 2, 2, '#8b8f94'); g.rect(25, 2, 2, 2, '#8b8f94');
    g.rect(11, 16, 6, 9, '#3b2a1a'); g.ell(14, 16, 3, 2.5, '#3b2a1a');
    g.rect(13, 0, 1, 9, '#5b4632'); g.rect(14, 0, 5, 3, '#3a7bd9');
    return g.outline(OUT).bake();
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
      pine: [pine(0), pine(1)], spire: [spire(0), spire(1)],
      ogre: [ogre(0), ogre(1)], soldier: [soldier(0), soldier(1)], golemUnit: [golemUnit(0), golemUnit(1)],
      shaman: [shaman(0), shaman(1)], harpy: [harpy(0), harpy(1)], wyvern: [wyvern(0), wyvern(1)],
      goblinlord: [ogre(0, { skin: '#7aa83a', dark: '#4e7a22', belly: '#a8c870' }), ogre(1, { skin: '#7aa83a', dark: '#4e7a22', belly: '#a8c870' })],
      lich: [ogre(0, { skin: '#8a8aa8', dark: '#4e4e6a', belly: '#c8c8e0' }), ogre(1, { skin: '#8a8aa8', dark: '#4e4e6a', belly: '#c8c8e0' })],
      demonlord: [ogre(0, { skin: '#7a1e1e', dark: '#3a0a0a', belly: '#b04030' }), ogre(1, { skin: '#7a1e1e', dark: '#3a0a0a', belly: '#b04030' })],
      icon: {}, node: {}, relic: {},
      tree: [tree(0), tree(1)], rock: rock(), gate: gate(), castle: castle(), heart: heart()
    };
    var makers = { archer: archerTower, mage: mageTower, cannon: cannonTower, bowman: bowmanTower, sling: slingTower,
                   watch: watchTower, poison: poisonTower, frost: frostTower, ballista: ballistaTower,
                   fire: fireTower, thunder: thunderTower, mine: mineTower,
                   sniper: sniperTower, storm: stormTower, dart: dartTower, mortar: mortarTower, blizzard: blizzardTower, golem: golemTower, spikes: spikesTower, tar: tarTower, barrel: barrelTower, barricade: barricadeTower, barracks: barracksTower };
    Object.keys(makers).forEach(function (k) {
      S[k] = [];
      for (var lv = 0; lv < 3; lv++) S[k].push([makers[k](lv, false), makers[k](lv, true)]);
    });
    ['eye', 'bag', 'stone', 'coin', 'hammer', 'horn', 'saw', 'gear', 'scroll', 'meteor', 'sword', 'hourglass', 'star', 'bandage', 'target', 'poster', 'energy'].forEach(function (k) { S.icon[k] = icon(k); });
    ['battle', 'elite', 'event', 'shop', 'rest', 'boss'].forEach(function (k) { S.node[k] = nodeIcon(k); });
    G.SPR = S;
    return S;
  };
  // 右向きの絵を取り出す（大砲・弩砲は左右の向きがある）
  G.towerImg = function (type, lv, fire) {
    var spr = G.SPR[type][lv || 0][fire ? 1 : 0];
    return spr.r ? spr.r : spr;
  };
})();

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
  function ogre(f) {   // ボス：オーガ王（大きい・王冠）
    var g = new Grid(34, 36), skin = '#b0703f', dark = '#7d4a26';
    if (f === 0) { g.rect(10, 28, 5, 7, '#3b2a1a'); g.rect(19, 28, 5, 6, '#3b2a1a'); g.rect(19, 34, 6, 1, '#3b2a1a'); }
    else { g.rect(10, 28, 5, 6, '#3b2a1a'); g.rect(9, 34, 6, 1, '#3b2a1a'); g.rect(19, 28, 5, 7, '#3b2a1a'); }
    g.ell(17, 21, 11, 9, skin); g.ell(17, 23, 9, 6, '#c98a55');       // 太った体
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
  function bat(f) {
    var g = new Grid(18, 12), c = '#5b4a78', d = '#3a2e52';
    g.ell(9, 6, 3, 3, c); g.px(8, 5, '#ff4d3a'); g.px(10, 5, '#ff4d3a'); g.px(7, 2, c); g.px(11, 2, c);
    if (f === 0) { g.rect(1, 3, 6, 2, d); g.rect(11, 3, 6, 2, d); g.px(0, 2, d); g.px(17, 2, d); }
    else { g.rect(1, 6, 6, 2, d); g.rect(11, 6, 6, 2, d); g.px(0, 8, d); g.px(17, 8, d); }
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
  function kingslime(f) {
    var g = new Grid(26, 19), sq = f === 1, B = 17, rx = sq ? 12 : 10.5, ry = sq ? 11 : 14;
    g.ell(13, B + 1, rx, ry, '#7a3fa0'); g.ell(13, B + 1, rx - 1.5, ry - 2, '#9a5fc8'); g.rect(0, B + 1, 26, 2, null);
    g.ell(9.5, B + 1 - ry + 4, 2.5, 1.5, '#d8b8f0');
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
      case 'saw':    g.rect(2, 7, 12, 4, '#b4b8bc'); for (var x = 2; x < 14; x += 2) g.px(x, 11, '#8b8f94'); g.rect(11, 4, 4, 4, '#8a5a2b'); g.rect(3, 2, 6, 3, '#8a5a2b'); g.rect(4, 3, 4, 1, '#c08a4a'); break;
    }
    return g.outline(OUT).bake();
  }

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
      bat: [bat(0), bat(1)], skeleton: [skeleton(0), skeleton(1)], kingslime: [kingslime(0), kingslime(1)],
      yeti: [yeti(0), yeti(1)], salamander: [salamander(0), salamander(1)],
      pine: [pine(0), pine(1)], spire: [spire(0), spire(1)],
      ogre: [ogre(0), ogre(1)],
      icon: {}, node: {},
      tree: [tree(0), tree(1)], rock: rock(), gate: gate(), castle: castle(), heart: heart()
    };
    var makers = { archer: archerTower, mage: mageTower, cannon: cannonTower, bowman: bowmanTower, sling: slingTower,
                   watch: watchTower, poison: poisonTower, frost: frostTower, ballista: ballistaTower,
                   fire: fireTower, thunder: thunderTower, mine: mineTower };
    Object.keys(makers).forEach(function (k) {
      S[k] = [];
      for (var lv = 0; lv < 3; lv++) S[k].push([makers[k](lv, false), makers[k](lv, true)]);
    });
    ['eye', 'bag', 'stone', 'coin', 'hammer', 'horn', 'saw'].forEach(function (k) { S.icon[k] = icon(k); });
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

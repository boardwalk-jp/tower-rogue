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
  function orc(f) {
    var g = new Grid(20, 22), skin = '#6e9a4e', dark = '#4b6e33';
    if (f === 0) { g.rect(6, 17, 3, 4, '#3b2a1a'); g.rect(11, 17, 3, 3, '#3b2a1a'); g.px(13, 20, '#3b2a1a'); }
    else { g.rect(6, 17, 3, 3, '#3b2a1a'); g.px(6, 20, '#3b2a1a'); g.rect(11, 17, 3, 4, '#3b2a1a'); }
    g.rect(4, 9, 12, 8, '#7d7d86');                    // よろい
    g.rect(4, 9, 12, 2, '#a0a0aa'); g.rect(4, 15, 12, 2, '#55555e');
    g.rect(9, 11, 2, 4, '#55555e');
    g.rect(2, 10, 2, 5, skin); g.rect(16, 10, 2, 4, skin);   // 腕
    // こん棒
    g.rect(17, 4, 2, 8, '#7a5230'); g.rect(16, 2, 4, 4, '#8e6a42'); g.px(16, 2, null); g.px(19, 2, null);
    g.ell(10, 5.5, 4.5, 4, skin); g.rect(6, 8, 8, 1, dark);  // 頭
    g.px(8, 4, '#ff4d3a'); g.px(12, 4, '#ff4d3a');           // 目
    g.px(8, 8, '#fff6e0'); g.px(12, 8, '#fff6e0'); g.px(8, 7, '#fff6e0'); g.px(12, 7, '#fff6e0'); // きば
    g.rect(7, 1, 6, 2, '#55555e'); g.px(10, 0, '#a0a0aa');   // かぶと
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
      archer: [], mage: [], cannon: [],
      tree: [tree(0), tree(1)], rock: rock(), gate: gate(), castle: castle(), heart: heart()
    };
    for (var lv = 0; lv < 3; lv++) {
      S.archer.push([archerTower(lv, false), archerTower(lv, true)]);
      S.mage.push([mageTower(lv, false), mageTower(lv, true)]);
      S.cannon.push([cannonTower(lv, false), cannonTower(lv, true)]);
    }
    G.SPR = S;
    return S;
  };
})();

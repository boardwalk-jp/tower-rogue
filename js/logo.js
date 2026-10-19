// タイトルのロゴ「Slay the Syoppaiya」をドット絵で描く（画像ファイルは使わない）
// 1文字ずつ「ペンの通り道（曲線）」を書いて、小さな画面に太さを変えながら点を打ち、
// それを「ある・なし」の2色に分けてドットにする。最後にふち・影・明るい面をつけて大きく映す
'use strict';
(function () {
  var G = window.G = window.G || {};

  // ---- 文字の形 ----
  // 座標は大きい文字の1マス＝1ドット。y=22 が文字の下の線、x の高さ（小文字の上）は y=11、上に伸びる文字は y=2、下に伸びる文字は y=29 まで
  // 線は [x, y, 太さ] の点の並び。点と点の間は曲線（なめらかにつなぐ）
  var GL = {
    S: { w: 16, s: [
      [[13.5, 6.5, 1.3], [14.5, 4, 1.5], [12, 2.2, 1.8], [7.5, 2.2, 2.0], [3.6, 4.6, 2.3], [3.6, 8.6, 2.5], [7.5, 11.2, 2.6], [11.6, 13.6, 2.6], [13.2, 17.4, 2.4], [11.2, 21, 2.1], [6.6, 21.8, 1.9], [3, 20, 1.6], [1.6, 17.4, 1.3], [3.4, 15.8, 1.2], [4.6, 17.4, 1.0]]
    ] },
    l: { w: 9, s: [
      [[1.2, 4.6, 1.0], [2.8, 2.4, 1.3], [5, 1.8, 1.6], [5.4, 5, 2.1], [5.3, 10, 2.2], [5.2, 15, 2.2], [5.4, 19.4, 2.0], [6.8, 21.8, 1.7], [8.6, 21.2, 1.3], [9.4, 19.6, 1.0]]
    ] },
    a: { w: 13, s: [
      [[9.6, 13.6, 1.5], [7, 11.4, 1.8], [3.6, 12.4, 2.0], [1.8, 16.4, 2.2], [3, 20.6, 2.1], [6.2, 21.4, 1.9], [9, 18.6, 1.6]],
      [[9.2, 11.2, 1.7], [9.4, 15, 2.1], [9.4, 19.2, 2.0], [10.8, 21.8, 1.6], [12.6, 21, 1.2], [13.2, 19.4, 1.0]]
    ] },
    y: { w: 13, s: [
      [[0.8, 13.2, 1.1], [2.4, 11.4, 1.6], [3.8, 13.6, 2.0], [3.8, 17.6, 2.0], [5.6, 20.8, 1.8], [8.6, 20.4, 1.6], [10, 18, 1.5]],
      [[10.2, 11.2, 1.7], [10.2, 16, 2.2], [10, 22, 2.3], [9, 26.4, 2.1], [6, 28.6, 1.8], [2.8, 28, 1.5], [1.2, 25.6, 1.3], [2.8, 24.2, 1.1], [4, 25.6, 0.9]]
    ] },
    o: { w: 13, s: [
      [[6.8, 11.2, 1.6], [3.2, 12.6, 1.9], [1.8, 16.6, 2.2], [3.4, 20.8, 2.1], [7, 21.8, 1.9], [10.2, 19.6, 2.0], [11, 15.6, 2.1], [9.6, 12, 1.8], [6.6, 11.2, 1.5]]
    ] },
    p: { w: 13, s: [
      [[0.6, 13, 1.0], [2, 11.2, 1.4], [3.6, 12.6, 1.9], [3.6, 17, 2.2], [3.6, 22, 2.2], [3.6, 26, 2.1], [3.6, 28.6, 1.8]],
      [[1, 28.8, 1.0], [3.6, 28.8, 1.2], [6.2, 28.8, 1.0]],
      [[3.8, 14.4, 1.5], [6.4, 11.4, 1.8], [10, 12.8, 2.0], [11.2, 16.8, 2.1], [9.6, 20.8, 1.9], [6.4, 21.8, 1.6], [3.8, 20.4, 1.3]]
    ] },
    i: { w: 9, dot: [3.8, 8.6], s: [
      [[0.8, 13.4, 1.0], [2.2, 11.4, 1.4], [3.8, 12.8, 1.9], [3.8, 17, 2.1], [4, 20.2, 1.9], [5.4, 21.8, 1.6], [7.2, 21, 1.2], [7.8, 19.4, 1.0]]
    ] },
    t: { w: 9, s: [
      [[3.6, 4.4, 1.3], [4.4, 8, 1.9], [4.4, 13, 2.1], [4.4, 18, 2.0], [5.6, 21.4, 1.7], [7.8, 21.2, 1.3], [8.8, 19.4, 1.0]],
      [[0.6, 11.6, 1.2], [4.4, 10.8, 1.5], [8.4, 10.6, 1.2]]
    ] },
    h: { w: 13, s: [
      [[0.8, 4.6, 1.0], [2.4, 2.4, 1.3], [4, 3.6, 1.8], [4, 8, 2.1], [4, 14, 2.2], [4, 21.4, 2.0]],
      [[4.2, 15.6, 1.4], [6.6, 12, 1.8], [9.6, 12.2, 2.0], [10.4, 15.6, 2.1], [10.4, 19.6, 1.9], [11.6, 21.8, 1.5], [13, 20.8, 1.1]]
    ] },
    e: { w: 12, s: [
      [[2.2, 16.4, 1.4], [6.4, 15.6, 1.5], [9.6, 14.2, 1.6], [8.6, 11.6, 1.7], [5, 11.4, 1.9], [2.2, 13.8, 2.1], [1.8, 18, 2.2], [4.2, 21.4, 2.0], [7.8, 21.6, 1.7], [10.6, 19.6, 1.3]]
    ] }
  };

  // Catmull-Rom（点を通るなめらかな線）で点を補う
  function sample(pts) {
    var out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      var n = Math.max(4, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 3));
      for (var k = 0; k < n; k++) {
        var t = k / n, t2 = t * t, t3 = t2 * t;
        var f = function (a, b, c, d) { return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); };
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), p1[2] + (p2[2] - p1[2]) * t]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  // 1文字を「ある・なし」のドットにする（scale：小さい文字は0.55倍など）
  function glyphMask(ch, scale, rot) {
    var g = GL[ch], W = Math.ceil((g.w + 4) * scale) + 2, H = Math.ceil(32 * scale) + 2, m = new Uint8Array(W * H);
    // 少し傾ける（文字の中心まわりに回す）：手書きのような不ぞろいさ
    var ca = Math.cos(rot || 0), sa = Math.sin(rot || 0), cx0 = g.w / 2, cy0 = 15;
    function R(p) { var x = p[0] - cx0, y = p[1] - cy0; return [cx0 + x * ca - y * sa, cy0 + x * sa + y * ca, p[2]]; }
    var SS = 4, cv = document.createElement('canvas'); cv.width = W * SS; cv.height = H * SS;
    var c = cv.getContext('2d'); c.fillStyle = '#000';
    g.s.forEach(function (stroke) {
      sample(stroke.map(R)).forEach(function (p) {
        c.beginPath(); c.arc((p[0] * scale + 1) * SS, (p[1] * scale + 1) * SS, Math.max(0.55, p[2] * scale) * SS, 0, Math.PI * 2); c.fill();
      });
    });
    var d = c.getImageData(0, 0, cv.width, cv.height).data;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var cnt = 0;
      for (var yy = 0; yy < SS; yy++) for (var xx = 0; xx < SS; xx++) if (d[((y * SS + yy) * cv.width + x * SS + xx) * 4 + 3] > 127) cnt++;
      m[y * W + x] = cnt >= SS * SS * 0.45 ? 1 : 0;
    }
    return { m: m, w: W, h: H, adv: Math.round(g.w * scale), dot: g.dot && [Math.round(R(g.dot.concat(0))[0] * scale + 1), Math.round(R(g.dot.concat(0))[1] * scale + 1)] };
  }

  // ---- 炎（i の点）：3コマ ----
  // 下が太く上がとがったしずく形。とがった先を左右にゆらして3コマ作る
  function flameFrame(shift) {
    var rows = [], H = 13;
    for (var r = 0; r < H; r++) {
      var k = r / (H - 1), w = r < 2 ? 0.5 : k < 0.75 ? 0.6 + k * 4.4 : 3.9 - (k - 0.75) * 7;
      var cx = 4.5 + shift * Math.pow(1 - k, 2), line = '';
      for (var x = 0; x < 9; x++) {
        var dx = Math.abs(x + 0.5 - cx), ch = '.';
        if (dx <= w) ch = dx > w - 1 ? (r >= H - 3 ? 'r' : 'o') : (r > 5 && dx <= w - 2.2 ? 'W' : 'y');
        line += ch;
      }
      rows.push(line);
    }
    return rows;
  }
  var FLAME = [flameFrame(0), flameFrame(1.6), flameFrame(-1.6), flameFrame(0.8)];
  var FC = { o: '#3a8cff', y: '#86d4ff', W: '#eafcff', r: '#2350c8' };   // 青い炎

  // ---- ロゴ全体の並び ----
  // 1段目：Slay ＋ 右下に小さい the。2段目：Syoppaiya（少し右へ）
  // rot：文字ごとの傾き（度）、dy：上下のずれ、big：大きくする文字（頭文字）
  var LAYOUT = [
    { text: 'Slay', x: 2, y: 4, scale: 1, gap: 0, layer: 1, rot: [-6, 4, -3, 5], dy: [-2, 0, 1, 0], big: { 0: 1.14 } },
    { text: 'the', x: 68, y: 14, scale: 0.6, gap: 0, layer: 1, rot: [-5, 3, 6], dy: [0, -1, 0] },
    { text: 'Syoppaiya', x: 24, y: 36, scale: 1, gap: 0, layer: 0, rot: [-7, 5, -3, 3, -4, 4, -2, 6, -3], dy: [-2, 1, 0, -1, 0, 1, -1, 0, 1], big: { 0: 1.14 } }
  ];
  var built = null;
  function build() {
    var items = [], maxX = 0, maxY = 0;
    LAYOUT.forEach(function (L) {
      var x = L.x;
      for (var i = 0; i < L.text.length; i++) {
        var sc = L.scale * ((L.big && L.big[i]) || 1);
        var gm = glyphMask(L.text[i], sc, (L.rot ? L.rot[i] : 0) * Math.PI / 180);
        items.push({ g: gm, x: x, y: L.y + (L.dy ? L.dy[i] : 0) - Math.round((sc - L.scale) * 22), ph: items.length * 0.55, big: L.scale >= 1, layer: L.layer || 0 });
        maxX = Math.max(maxX, x + gm.w); maxY = Math.max(maxY, L.y + gm.h);
        x += gm.adv + L.gap + (L.scale >= 1 ? 1 : 1);
      }
    });
    built = { items: items, W: maxX + 5, H: maxY + 7 };
    return built;
  }

  // 色：上が明るい黄色、下ほど濃いオレンジ（文字ごとの高さで）
  function fillCol(yRel, top) {
    if (top) return [255, 246, 176];
    return yRel < 0.3 ? [255, 228, 92] : yRel < 0.6 ? [252, 204, 54] : yRel < 0.8 ? [240, 168, 34] : [214, 124, 24];
  }

  // 描く（t：秒。文字の上下ゆれと炎の動き）
  // 文字の上下ゆれ（1文字ずつずらして波のように）。大きい文字は±2ドット、小さい the は±1ドット
  function bobY(it, t) { return Math.round(Math.sin(t * 2.6 + it.ph) * (it.big ? 1.6 : 1.1)); }
  function draw(cv, t) {
    var B = built || build(), W = B.W, H = B.H;
    var img = new ImageData(W, H), d = img.data;
    function px(x, y, c, a) { var i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a == null ? 255 : a; }
    // 奥の段（Syoppaiya）から順に、段ごとに ふち・影・中 を描く（重なっても文字の境目が見える）
    [0, 1].forEach(function (layer) {
      var mask = new Uint8Array(W * H), rel = new Float32Array(W * H);
      B.items.forEach(function (it) {
        if (it.layer !== layer) return;
        var oy = bobY(it, t), g = it.g;
        for (var y = 0; y < g.h; y++) for (var x = 0; x < g.w; x++) if (g.m[y * g.w + x]) {
          var X = it.x + x + 2, Y = it.y + y + 4 + oy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
          mask[Y * W + X] = 1; rel[Y * W + X] = (y - 2 * (g.h / 32)) / (g.h * 0.75);
        }
      });
      function on(x, y) { return x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x]; }
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        if (on(x, y)) continue;
        var near = on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1) || on(x - 1, y - 1) || on(x + 1, y - 1) || on(x - 1, y + 1) || on(x + 1, y + 1);
        if (near) px(x, y, [46, 18, 6]);
        else if (on(x - 1, y - 2) || on(x, y - 2) || on(x - 2, y - 2) || on(x - 1, y - 3)) px(x, y, [26, 8, 4], 230);
      }
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (on(x, y)) px(x, y, fillCol(rel[y * W + x], !on(x, y - 1)));
    });
    var c = cv.getContext('2d');
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    c.putImageData(img, 0, 0);
    // i の点＝炎（ゆらゆら）
    var fr = FLAME[[0, 1, 3, 0, 2][Math.floor(t * 9) % 5]];
    B.items.forEach(function (it) {
      if (!it.g.dot) return;
      var fx = it.x + it.g.dot[0] + 2 - 4, fy = it.y + it.g.dot[1] + 4 - 12 + bobY(it, t);
      // 炎のふち（こい紺）
      c.fillStyle = '#0c1430';
      for (var yy = 0; yy < fr.length; yy++) for (var xx = 0; xx < fr[yy].length; xx++) {
        if (fr[yy][xx] === '.') continue;
        c.fillRect(fx + xx - 1, fy + yy, 1, 1); c.fillRect(fx + xx + 1, fy + yy, 1, 1); c.fillRect(fx + xx, fy + yy - 1, 1, 1); c.fillRect(fx + xx, fy + yy + 1, 1, 1);
      }
      for (yy = 0; yy < fr.length; yy++) for (xx = 0; xx < fr[yy].length; xx++) {
        var k = fr[yy][xx]; if (k === '.') continue;
        c.fillStyle = FC[k]; c.fillRect(fx + xx, fy + yy, 1, 1);
      }
    });
  }

  G.drawLogo = draw;
  // タイトル画面にいる間だけ、0.1秒ごとに描き直す（炎のゆれ・文字のゆれ）
  function run() {
    var cv = document.getElementById('logo-cv'); if (!cv) return;
    var t0 = performance.now();
    draw(cv, 0.3);
    var id = setInterval(function () {
      var st = document.getElementById('start');
      if (st && st.hidden) { clearInterval(id); return; }
      draw(cv, (performance.now() - t0) / 1000);
    }, 100);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  G.logoSize = function () { var B = built || build(); return { w: B.W, h: B.H }; };
})();

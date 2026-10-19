// イベントの絵：イベントごとの場面をドット絵で描く（画像ファイルは使わない）
// G.eventArt(id, act) → <canvas>（120×56ドット）。画面にある間だけ少し動く（火・水・きらめき・雪など）
'use strict';
(function () {
  var G = window.G = window.G || {};
  var W = 120, H = 56;

  function R(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w || 1, h || 1); }
  function ell(g, c, cx, cy, rx, ry) {
    for (var y = -ry; y <= ry; y++) for (var x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) R(g, c, cx + x, cy + y);
  }
  function hash(n) { var x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }

  // ---- 背景（層ごと・屋内） ----
  function bg(g, kind, t) {
    var y, i;
    if (kind === 'grass') {
      for (y = 0; y < 34; y++) R(g, y < 12 ? '#5a8fd0' : y < 24 ? '#78a8dc' : '#a8c8e8', 0, y, W, 1);
      R(g, '#ffffff', 18, 6, 10, 2); R(g, '#ffffff', 15, 8, 16, 2); R(g, '#ffffff', 84, 10, 12, 2); R(g, '#ffffff', 81, 12, 18, 2);
      for (i = 0; i < W; i++) { var hh = 6 + Math.round(Math.sin(i / 9) * 3 + Math.sin(i / 4) * 1.5); R(g, '#5f9a4a', i, 34 - hh, 1, hh); }
      R(g, '#4f8a3d', 0, 34, W, H - 34);
      for (i = 0; i < 70; i++) R(g, hash(i) < 0.5 ? '#3c7232' : '#6fae52', hash(i + 3) * W, 35 + hash(i + 7) * 20);
    } else if (kind === 'snow') {
      for (y = 0; y < 32; y++) R(g, y < 14 ? '#7c8ea8' : '#a0b0c6', 0, y, W, 1);
      [[20, 10, 16], [58, 6, 22], [100, 12, 15]].forEach(function (m) {
        for (var k = 0; k < 32 - m[1]; k++) { var hw = Math.round(k * m[2] / 26); R(g, k < 7 ? '#ffffff' : '#6e7a90', m[0] - hw, m[1] + k, hw * 2 + 1, 1); R(g, k < 7 ? '#d2deec' : '#58647a', m[0] + 1, m[1] + k, hw, 1); }
      });
      R(g, '#e3ebf4', 0, 32, W, H - 32);
      for (i = 0; i < 40; i++) R(g, '#c8d5e4', hash(i) * W, 33 + hash(i + 5) * 22, 2, 1);
    } else if (kind === 'volcano') {
      for (y = 0; y < 34; y++) R(g, y < 10 ? '#2a1414' : y < 22 ? '#4a1e16' : '#6a2a1a', 0, y, W, 1);
      for (i = 0; i < 26; i++) { var w = 4 + i * 1.8; R(g, '#2a1e1a', 92 - w / 2, 8 + i, w, 1); }
      R(g, '#ffb347', 90, 8, 5, 1); R(g, '#ff6a2a', 89, 9, 7, 1);
      for (i = 0; i < 4; i++) ell(g, 'rgba(60,40,40,.55)', 92 + Math.sin(t + i) * 3 - i * 2, 4 - i * 1.2 + (t * 2 % 3), 4 + i, 2);
      R(g, '#2a201c', 0, 34, W, H - 34);
      for (i = 0; i < 40; i++) R(g, hash(i) < 0.15 ? '#c8341a' : '#3a2c26', hash(i + 2) * W, 35 + hash(i + 9) * 20);
    } else if (kind === 'inside') {
      R(g, '#3a2618', 0, 0, W, H);
      for (y = 0; y < 40; y += 6) { R(g, '#4a3220', 0, y, W, 5); R(g, '#2a1a10', 0, y + 5, W, 1); }
      R(g, '#5a3e26', 0, 40, W, H - 40);
      for (i = 0; i < W; i += 12) R(g, '#4a3220', i, 40, 1, H - 40);
    }
  }
  // 雪・火の粉など、場面の上に重ねる動き
  function overlay(g, kind, t) {
    var i;
    if (kind === 'snow') for (i = 0; i < 30; i++) R(g, '#ffffff', (hash(i) * W + t * 3 + Math.sin(t + i) * 2) % W, (hash(i + 1) * H + t * (6 + hash(i + 2) * 6)) % H);
    if (kind === 'volcano') for (i = 0; i < 14; i++) { var y = H - ((hash(i) * H + t * (8 + hash(i + 3) * 8)) % H); R(g, hash(i + 5) < 0.5 ? '#ff8a2a' : '#ffd84a', (hash(i + 1) * W + Math.sin(t * 2 + i) * 2), y); }
  }

  // ---- 人や物 ----
  function person(g, x, y, o) {   // (x,y)＝足もと。o：{ body, hair, skin, pose:'stand'|'lie'|'sit' }
    var sk = o.skin || '#f1c6a0', bd = o.body || '#3b6fab', hr = o.hair || '#3a2416', lg = o.legs || '#4a392b';
    if (o.pose === 'lie') {       // 横たわる
      R(g, lg, x - 8, y - 2, 6, 2); R(g, bd, x - 2, y - 3, 7, 3); R(g, sk, x + 5, y - 4, 3, 3); R(g, hr, x + 7, y - 4, 1, 3);
      return;
    }
    var s = o.small ? 0.7 : 1, h = Math.round(14 * s);
    R(g, lg, x - 2, y - Math.round(4 * s), 2, Math.round(4 * s)); R(g, lg, x + 1, y - Math.round(4 * s), 2, Math.round(4 * s));
    R(g, bd, x - 3, y - Math.round(9 * s), 7, Math.round(5 * s) + 1);
    R(g, sk, x - 2, y - h, 5, Math.round(5 * s));
    R(g, hr, x - 2, y - h, 5, 2); R(g, '#1b1b22', x - 1, y - h + 3, 1, 1); R(g, '#1b1b22', x + 1, y - h + 3, 1, 1);
    if (o.apron) R(g, o.apron, x - 2, y - Math.round(8 * s), 5, Math.round(5 * s));
  }
  function coin(g, x, y, t, k) { var f = Math.floor(t * 4 + k) % 4; R(g, '#c89a2a', x, y, 3, 2); R(g, f === 0 ? '#fff6c0' : '#ffd84a', x, y, f === 0 ? 3 : 2, 1); }
  function sparkle(g, x, y, t, k, col) { var p = (t * 1.5 + k) % 2; if (p < 0.5) { R(g, col || '#ffffff', x, y); R(g, col || '#ffffff', x - 1, y); R(g, col || '#ffffff', x + 1, y); R(g, col || '#ffffff', x, y - 1); R(g, col || '#ffffff', x, y + 1); } else if (p < 0.9) R(g, col || '#ffffff', x, y); }
  function fire(g, x, y, t, s) {  // (x,y)＝火の根もと
    s = s || 1;
    for (var i = 0; i < 6; i++) {
      var fx = x + Math.round(Math.sin(t * 9 + i * 2) * 1.5 * s) + (i % 3 - 1) * 2 * s, h = Math.round((5 + hash(i + Math.floor(t * 8)) * 4) * s);
      R(g, '#ff6a2a', fx, y - h, 2 * s, h); R(g, '#ffd84a', fx, y - Math.round(h * 0.6), Math.max(1, s), Math.round(h * 0.6));
    }
    R(g, '#fff6c0', x - 1, y - 3, 2 * s, 2);
  }
  function anvil(g, x, y) { R(g, '#3a3e46', x - 6, y - 6, 12, 3); R(g, '#3a3e46', x - 8, y - 6, 3, 2); R(g, '#2a2e34', x - 3, y - 3, 6, 3); R(g, '#4a4e58', x - 5, y - 6, 10, 1); }

  // ---- イベントごとの場面 ----
  var SCENES = {
    smith: function (g, t, act) {
      var k = act === 3 ? 'volcano' : act === 2 ? 'snow' : 'grass'; bg(g, k, t);
      R(g, '#6a4a2a', 22, 22, 30, 3); R(g, '#7a3a2a', 20, 18, 34, 4); R(g, '#5a3a1e', 24, 25, 2, 18); R(g, '#5a3a1e', 48, 25, 2, 18);   // 屋台
      anvil(g, 64, 46);
      var up = Math.sin(t * 6) > 0;
      person(g, 78, 47, { body: '#7a4a2a', apron: '#4a3020', hair: '#2a1a10' });
      R(g, '#8a8e96', up ? 70 : 68, up ? 30 : 37, 4, 3); R(g, '#5a3a1e', up ? 73 : 71, up ? 32 : 38, 5, 1);   // 金づち
      if (!up) for (var i = 0; i < 5; i++) R(g, hash(i + Math.floor(t * 6)) < 0.5 ? '#ffd84a' : '#ff8a2a', 62 + hash(i) * 8 - 2, 36 - hash(i + 4) * 6);
      overlay(g, k, t);
    },
    spring: function (g, t) {
      bg(g, 'grass', t);
      ell(g, '#3a6a3a', 60, 44, 30, 8); ell(g, '#2a5a86', 60, 44, 27, 6); ell(g, '#3a78a8', 60, 43, 22, 4);
      for (var i = 0; i < 6; i++) coin(g, 46 + i * 5, 43 + (i % 2), t, i);
      for (i = 0; i < 4; i++) sparkle(g, 44 + i * 9, 40 + (i % 2) * 4, t, i * 0.7);
      var r = (t * 6) % 12; ell(g, 'rgba(255,255,255,.35)', 60, 44, Math.round(4 + r), Math.max(1, Math.round(r / 4)));
      R(g, '#6e6e6a', 30, 40, 4, 3); R(g, '#9ca1a7', 30, 40, 3, 1); R(g, '#6e6e6a', 88, 42, 5, 3);
    },
    fallen: function (g, t) {
      bg(g, 'grass', t);
      person(g, 58, 47, { pose: 'lie', body: '#6a5a3a' });
      R(g, '#7a5230', 70, 41, 8, 6); R(g, '#5a3a1e', 70, 41, 8, 1); R(g, '#ffd84a', 73, 43, 2, 2);   // 荷物
      R(g, '#d6dde6', 40, 45, 10, 1); R(g, '#d9a441', 49, 44, 2, 3);   // 剣
      sparkle(g, 74, 40, t, 0, '#ffe14d');
    },
    gambler: function (g, t, act) {
      var k = act === 3 ? 'volcano' : act === 2 ? 'snow' : 'grass'; bg(g, k, t);
      R(g, '#7a5a3a', 26, 32, 28, 10); R(g, '#a06a3a', 24, 30, 32, 3); ell(g, '#3a2a1a', 30, 44, 3, 3); ell(g, '#3a2a1a', 50, 44, 3, 3);   // 荷車
      R(g, '#c8341a', 26, 22, 28, 8); R(g, '#ffffff', 26, 22, 4, 8); R(g, '#ffffff', 34, 22, 4, 8); R(g, '#ffffff', 42, 22, 4, 8); R(g, '#ffffff', 50, 22, 4, 8);
      person(g, 72, 47, { body: '#6a3a8a', hair: '#1a1a1a' }); R(g, '#1a1a1a', 68, 31, 9, 2); R(g, '#1a1a1a', 70, 27, 5, 4);   // 帽子
      var p = (t * 1.6) % 1, cy = 30 - Math.round(Math.sin(p * Math.PI) * 14), f = Math.floor(t * 10) % 2;
      R(g, '#c89a2a', 78, cy, f ? 3 : 1, 3); R(g, '#ffd84a', 78, cy, f ? 2 : 1, 1);
      overlay(g, k, t);
    },
    altar: function (g, t) {
      bg(g, 'volcano', t);
      R(g, '#5a1a14', 44, 34, 32, 12); R(g, '#7a2a1e', 42, 32, 36, 3); R(g, '#3a1410', 48, 46, 24, 2);
      var gl = 0.5 + 0.5 * Math.sin(t * 3);
      ell(g, 'rgba(255,60,40,' + (0.2 + gl * 0.25).toFixed(2) + ')', 60, 27, 7, 6); R(g, '#ff3a3a', 58, 25, 4, 4); R(g, '#ffb0a0', 58, 25, 1, 1);
      [38, 82].forEach(function (x, i) { R(g, '#e8e0d0', x, 38, 2, 8); fire(g, x + 1, 38, t + i, 0.5); });
      overlay(g, 'volcano', t);
    },
    child: function (g, t) {
      bg(g, 'grass', t);
      R(g, '#a06a3a', 92, 22, 14, 10); R(g, '#7a2a1e', 90, 18, 18, 4); R(g, '#3a2618', 97, 26, 4, 6);   // 遠くの家
      person(g, 54, 47, { small: true, body: '#d2586f', hair: '#7a4a2a' });
      var d = Math.floor(t * 3) % 3; R(g, '#7fc8ff', 53, 39 + d, 1, 1); R(g, '#7fc8ff', 57, 40 + ((d + 1) % 3), 1, 1);   // 涙
      R(g, '#a3804f', 0, 46, 120, 2);
    },
    box: function (g, t, act) {
      var k = act === 3 ? 'volcano' : act === 2 ? 'snow' : 'grass'; bg(g, k, t);
      var gl = 0.5 + 0.5 * Math.sin(t * 2.4);
      ell(g, 'rgba(150,70,255,' + (0.3 + gl * 0.25).toFixed(2) + ')', 60, 38, 18, 10);
      R(g, '#6a4220', 48, 34, 24, 12); R(g, '#8a5a2a', 48, 30, 24, 5); R(g, '#c89a2a', 48, 34, 24, 1); R(g, '#c89a2a', 58, 33, 4, 5); R(g, '#3a2414', 59, 35, 2, 2);
      for (var i = 0; i < 3; i++) R(g, '#c79bff', 52 + i * 8 + Math.sin(t * 3 + i) * 2, 26 - ((t * 6 + i * 4) % 10));
      R(g, '#ffe14d', 66, 36, 1, 1);
      overlay(g, k, t);
    },
    forge: function (g, t) {
      bg(g, 'volcano', t);
      R(g, '#3a2c26', 20, 20, 30, 26); R(g, '#2a1e1a', 24, 30, 22, 14); ell(g, '#ff6a2a', 35, 40, 9, 3); ell(g, '#ffb347', 35, 40, 5, 2);   // 炉
      fire(g, 35, 38, t, 1);
      anvil(g, 70, 46);
      person(g, 86, 47, { body: '#5a2a1a', apron: '#3a2010', hair: '#1a1a1a' });
      R(g, '#ff8a2a', 66, 39, 8, 1);   // 赤く焼けた鉄
      overlay(g, 'volcano', t);
    },
    hut: function (g, t) {
      bg(g, 'inside', t);
      R(g, '#6e6a66', 40, 14, 40, 30); R(g, '#4a4644', 46, 22, 28, 22); R(g, '#1a1210', 48, 26, 24, 18); R(g, '#8a8680', 38, 12, 44, 3);   // 暖炉
      R(g, '#5a3a1e', 52, 41, 16, 2); fire(g, 60, 41, t, 1.2);
      ell(g, 'rgba(255,140,40,0.12)', 60, 40, 30 + Math.round(Math.sin(t * 7) * 2), 14);
      for (var i = 0; i < 5; i++) { R(g, '#7a5230', 88 + (i % 3) * 6, 46 - Math.floor(i / 3) * 4, 6, 3); R(g, '#c89a6a', 88 + (i % 3) * 6, 46 - Math.floor(i / 3) * 4, 1, 3); }   // 薪
      R(g, '#a8c8e8', 10, 14, 14, 12); R(g, '#3a2618', 16, 14, 1, 12); R(g, '#3a2618', 10, 20, 14, 1);   // 窓
      R(g, '#ffffff', 12 + (t * 5 % 10), 16 + (t * 7 % 8));
    },
    shrine: function (g, t) {
      bg(g, 'snow', t);
      R(g, '#bfe4f8', 44, 20, 32, 26); R(g, '#e8f6ff', 44, 20, 32, 2); R(g, '#9fd0ee', 46, 24, 2, 20); R(g, '#d8f0ff', 70, 22, 3, 18);   // 氷
      R(g, '#7a5a3a', 54, 30, 12, 12); R(g, '#a06a3a', 52, 28, 16, 3);   // 中の祠
      var gl = 0.5 + 0.5 * Math.sin(t * 3);
      ell(g, 'rgba(120,220,255,' + (0.3 + gl * 0.3).toFixed(2) + ')', 60, 36, 4, 3); R(g, '#ffffff', 59, 35, 2, 2);
      sparkle(g, 48, 22, t, 0); sparkle(g, 72, 30, t, 1.1);
      overlay(g, 'snow', t);
    },
    stranded: function (g, t) {
      bg(g, 'snow', t);
      ell(g, '#ffffff', 60, 46, 16, 5);
      R(g, '#8a3a2a', 56, 36, 8, 7); R(g, '#f1c6a0', 57, 31, 6, 5); R(g, '#c84a3a', 56, 30, 8, 2); R(g, '#1b1b22', 58, 33, 1, 1); R(g, '#1b1b22', 61, 33, 1, 1);   // 雪にうもれた旅人
      R(g, '#ffffff', 52, 40, 16, 6);
      var b = Math.floor(t * 2) % 2; if (b) { R(g, '#e8f4ff', 66, 29, 3, 2); R(g, '#e8f4ff', 69, 27, 2, 2); }   // 白い息
      R(g, '#7a5230', 74, 40, 2, 8); R(g, '#7a5230', 72, 40, 6, 1);   // 杖
      overlay(g, 'snow', t);
    },
    firespring: function (g, t) {
      bg(g, 'volcano', t);
      ell(g, '#3a2c26', 60, 44, 30, 8); ell(g, '#c8341a', 60, 44, 26, 6); ell(g, '#ff6a2a', 60, 43, 20, 4);
      for (var i = 0; i < 7; i++) { var p = (t * 1.2 + i * 0.37) % 1; if (p < 0.7) ell(g, '#ffd84a', 44 + i * 5, 43 - Math.round(p * 3), 1, 1); }   // 泡
      for (i = 0; i < 4; i++) ell(g, 'rgba(200,180,170,.35)', 48 + i * 8 + Math.sin(t + i) * 2, 34 - ((t * 5 + i * 5) % 16), 3, 2);   // 湯気
      overlay(g, 'volcano', t);
    },
    lavatreasure: function (g, t) {
      bg(g, 'volcano', t);
      for (var x = 0; x < W; x++) { var y = 40 + Math.round(Math.sin(x / 8 + t * 2) * 1); R(g, '#c8341a', x, y - 3, 1, 7); R(g, (x + Math.floor(t * 6)) % 7 < 3 ? '#ffb347' : '#ff6a2a', x, y - 1, 1, 3); }
      ell(g, '#c89a2a', 86, 30, 12, 5); ell(g, '#ffd84a', 86, 29, 9, 3);   // 金貨の山
      for (var i = 0; i < 4; i++) sparkle(g, 78 + i * 5, 26 + (i % 2) * 3, t, i * 0.5, '#fff6c0');
      overlay(g, 'volcano', t);
    }
  };

  var alive = [];
  G.eventArt = function (id, act) {
    var f = SCENES[id]; if (!f) return null;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.className = 'event-art'; cv.setAttribute('aria-hidden', 'true');
    var g = cv.getContext('2d'), t0 = performance.now();
    function paint() { g.clearRect(0, 0, W, H); f(g, (performance.now() - t0) / 1000, act || 1); }
    paint();
    var id2 = setInterval(function () { if (!cv.isConnected) { clearInterval(id2); return; } paint(); }, 100);
    return cv;
  };
})();

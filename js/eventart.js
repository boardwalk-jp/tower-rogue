// イベントの絵：イベントごとの場面をドット絵で描く（画像ファイルは使わない）
// G.eventArt(id, act) → <canvas>（240×112ドット）。画面にある間だけ少し動く（火・水・きらめき・雪など）
'use strict';
(function () {
  var G = window.G = window.G || {};

  function R(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w || 1, h || 1); }
  function ell(g, c, cx, cy, rx, ry) {
    for (var y = -ry; y <= ry; y++) for (var x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) R(g, c, cx + x, cy + y);
  }
  function hash(n) { var x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }

  // ---- 背景（層ごと・屋内） ----
  // 雪・火の粉など、場面の上に重ねる動き

  // ---- 人や物 ----
  function sparkle(g, x, y, t, k, col) { var p = (t * 1.5 + k) % 2; if (p < 0.5) { R(g, col || '#ffffff', x, y); R(g, col || '#ffffff', x - 1, y); R(g, col || '#ffffff', x + 1, y); R(g, col || '#ffffff', x, y - 1); R(g, col || '#ffffff', x, y + 1); } else if (p < 0.9) R(g, col || '#ffffff', x, y); }




  // ======================================================================
  // 新しいデザイン（2026-10-22）：戦闘画面と同じ「ドット疑似3D」の描き方で、2倍の細かさ（240×112ドット）
  //   ・光は左上から。黒いふち取りはしない（明るさの差で形を出す）
  //   ・地面の色は戦闘画面と同じ。木・岩・岩の柱は戦闘画面の絵（G.DotArt）をそのまま使う
  //   ・動かない部分（stat）は最初に1回だけ描いて取っておき、動く部分（anim）だけを毎回描く（スマホでも軽い）
    // ======================================================================
  var W2 = 240, H2 = 112, HZ = 46;   // HZ：地平線（ここから下が地面）
  var DA = G.DotArt, ART = null;
  function art() { return ART || (ART = DA.build()); }
  function put(g, sp, x, y) { g.drawImage(sp.cv, Math.round(x - sp.ax), Math.round(y - sp.ay)); }   // 戦闘画面の絵を、足もとを (x,y) にして置く
  function shadow(g, cx, cy, rx, a) { DA.ell(g, cx + 2, cy, rx, Math.max(1, Math.round(rx * 0.35)), 'rgba(0,0,0,' + (a || 0.28) + ')'); }
  function kindOf(act) { return act === 3 ? 'volcano' : act === 2 ? 'snow' : 'grass'; }

  // ---- 空と遠くの景色 ----
  function sky2(g, kind) {
    var y, x, i, S = kind === 'snow' ? ['#7d90ae', '#96a8c2', '#b4c4d8'] : kind === 'volcano' ? ['#2a1216', '#4a1c1a', '#7a3020'] : ['#5f98d6', '#7eb0e0', '#a6cbea'];
    for (y = 0; y < HZ; y++) {   // 3色の帯を、さかい目だけ1ドットおきに混ぜる
      var k = y / HZ * 2.999, a = Math.floor(k), f = k - a;
      R(g, S[a], 0, y, W2, 1);
      if (f > 0.75) for (x = (y & 1); x < W2; x += 2) R(g, S[Math.min(2, a + 1)], x, y);
    }
    if (kind === 'grass') {
      [[40, 12, 1], [168, 18, 0.8], [110, 8, 0.6]].forEach(function (cl) {   // 雲：白いかたまりと、下の水色の影
        var cx = cl[0], cy = cl[1], s = cl[2];
        DA.ell(g, cx, cy + 2, Math.round(16 * s), Math.round(3 * s) + 1, '#d6e6f4');
        DA.ell(g, cx - Math.round(6 * s), cy, Math.round(8 * s), Math.round(4 * s), '#ffffff'); DA.ell(g, cx + Math.round(5 * s), cy - 1, Math.round(9 * s), Math.round(5 * s), '#ffffff');
      });
      for (i = 0; i < W2; i++) {   // 遠くの丘（2列）。上のふちを明るく
        var h1 = 14 + Math.round(Math.sin(i / 23) * 5 + Math.sin(i / 9 + 1) * 2), h2 = 7 + Math.round(Math.sin(i / 15 + 2) * 3);
        R(g, '#7aa868', i, HZ - h1, 1, h1); R(g, '#94bf7e', i, HZ - h1, 1, 1);
        R(g, '#5e9a4c', i, HZ - h2, 1, h2); R(g, '#78b260', i, HZ - h2, 1, 1);
      }
    } else if (kind === 'snow') {
      [[30, 26, 22], [104, 34, 30], [190, 24, 24], [236, 18, 14]].forEach(function (m) {   // 雪山：左は明るく、右は影。上は雪
        var cx = m[0], h = m[1], hw = m[2];
        for (var j = 0; j < h; j++) {
          var half = Math.round(hw * (j + 1) / h), yy = HZ - h + j, snow = j < h * 0.45 + Math.sin(cx + j) * 2;
          R(g, snow ? '#f2f6fb' : '#8592a6', cx - half, yy, half + 1, 1); R(g, snow ? '#c4d0e0' : '#5f6b80', cx + 1, yy, half, 1);
        }
      });
    } else {
      var vx = 150, vh = 36, vw = 60;   // 火山：左は少し明るく、右は影。火口は赤く光る
      for (var j2 = 0; j2 < vh; j2++) { var half2 = 6 + Math.round((vw - 6) * j2 / vh), yy2 = HZ - vh + j2; R(g, '#4e3a38', vx - half2, yy2, half2 + 1, 1); R(g, '#33262a', vx + 1, yy2, half2, 1); }
      R(g, '#ff6a2a', vx - 5, HZ - vh, 11, 1); R(g, '#ffb040', vx - 3, HZ - vh, 6, 1);
      for (j2 = 0; j2 < 14; j2++) R(g, j2 % 3 ? '#c8341a' : '#ff8a2a', vx - 2 + Math.round(Math.sin(j2 / 2) * 2), HZ - vh + 1 + j2, 1, 1);
      for (i = 0; i < 40; i++) R(g, '#ff8a2a', hash(i) * W2, hash(i + 9) * HZ * 0.8);   // 遠くの火の粉（止まっている）
    }
  }
  // ---- 地面（戦闘画面と同じ色）。遠い所ほど空の色に少し近づける ----
  var GROUND = {
    grass: ['#5a9846', '#468338', '#417a37', '#528f40'], snow: ['#eef3f9', '#e0e7f0', '#f6f9fc', '#d6dfea'], volcano: ['#3a2e2e', '#2e2426', '#463a3a', '#33282a']
  };
  function ground2(g, kind) {
    var C = GROUND[kind], x, y;
    for (y = HZ; y < H2; y++) for (x = 0; x < W2; x++) { var h = hash(x * 0.37 + y * 13.1) ; R(g, C[h < 0.55 ? 0 : h < 0.75 ? 1 : h < 0.9 ? 2 : 3], x, y); }
    for (y = HZ; y < HZ + 8; y++) { g.fillStyle = kind === 'volcano' ? 'rgba(90,30,20,' + (0.4 - (y - HZ) * 0.05) + ')' : 'rgba(200,220,240,' + (0.35 - (y - HZ) * 0.045) + ')'; g.fillRect(0, y, W2, 1); }
    for (var i = 0; i < 90; i++) {   // 草のふさ・雪のでこぼこ・岩の割れ目
      x = Math.round(hash(i + 0.5) * W2); y = Math.round(HZ + 4 + hash(i + 7.3) * (H2 - HZ - 5));
      if (kind === 'grass') { R(g, '#2c5a28', x, y, 1, 2); R(g, '#2c5a28', x - 1, y + 1, 1, 1); R(g, '#2c5a28', x + 1, y + 1, 1, 1); if (i % 9 === 0) R(g, i % 2 ? '#f4e36a' : '#f0f0f0', x + 3, y, 1, 1); }
      else if (kind === 'snow') { R(g, '#ffffff', x, y, 3, 1); R(g, '#c8d4e2', x, y + 1, 3, 1); }
      else if (i % 3 === 0) { R(g, '#1a1210', x, y, 3, 1); R(g, '#ff6a2a', x + 1, y, 1, 1); } else R(g, '#54484a', x, y, 2, 1);
    }
  }
  // ---- 人（2倍の細かさ。高さ約22ドット）：(x,y)＝足もと。o：{ body, hair, skin, legs, apron, hat, pose:'hammer' など } ----
  function person2(g, x, y, o) {
    var sk = o.skin || '#f1c6a0', skS = '#c89870', bd = o.body || '#3b6fab', hr = o.hair || '#3a2416', lg = o.legs || '#4a392b';
    shadow(g, x, y, 6);
    R(g, lg, x - 3, y - 6, 3, 6); R(g, lg, x + 1, y - 6, 3, 6); R(g, '#2a2018', x - 3, y - 1, 3, 1); R(g, '#2a2018', x + 1, y - 1, 3, 1);   // 足とくつ
    R(g, bd, x - 4, y - 14, 9, 8); R(g, shade2(bd, -0.3), x + 3, y - 14, 2, 8); R(g, shade2(bd, 0.25), x - 4, y - 14, 1, 8);              // 体（右は影・左は明るい）
    if (o.apron) { R(g, o.apron, x - 3, y - 12, 7, 7); R(g, shade2(o.apron, -0.3), x + 3, y - 12, 1, 7); }
    R(g, sk, x - 3, y - 21, 7, 7); R(g, skS, x + 3, y - 21, 1, 7);                                                                       // 顔
    R(g, hr, x - 3, y - 22, 7, 3); R(g, hr, x - 4, y - 21, 1, 3);                                                                        // 髪
    R(g, '#1b1b22', x, y - 17, 1, 2); R(g, '#1b1b22', x + 2, y - 17, 1, 2);                                                              // 目（右を見る）
    if (o.hat) { R(g, o.hat, x - 5, y - 23, 11, 2); R(g, o.hat, x - 3, y - 27, 7, 4); }
  }
  function shade2(hex, k) { return G.EnemyArt ? G.EnemyArt.shade(hex, k) : hex; }
  function fire2(g, x, y, t, s) {   // (x,y)＝火の根もと。s＝大きさ
    s = s || 1;
    for (var i = 0; i < 7; i++) {
      var fx = x + Math.round((i - 3) * 1.6 * s + Math.sin(t * 9 + i * 2) * s), h = Math.round((7 + hash(i + Math.floor(t * 10)) * 6) * s * (1 - Math.abs(i - 3) / 5));
      R(g, '#c8341a', fx, y - h, Math.max(1, Math.round(2 * s)), h); R(g, '#ff8a2a', fx, y - Math.round(h * 0.75), Math.max(1, Math.round(2 * s)), Math.round(h * 0.75));
      R(g, '#ffd84a', fx, y - Math.round(h * 0.4), Math.max(1, Math.round(s)), Math.round(h * 0.4));
    }
    R(g, '#fff6c0', x - 1, y - Math.round(3 * s), Math.round(3 * s), 2);
  }
  function snowfall(g, t) { for (var i = 0; i < 60; i++) { var sx2 = (hash(i) * W2 + t * 6 + Math.sin(t + i) * 3) % W2, sy2 = (hash(i + 1) * H2 + t * (10 + hash(i + 2) * 12)) % H2; R(g, '#ffffff', sx2, sy2, i % 5 ? 1 : 2, i % 5 ? 1 : 2); } }
  function embers(g, t) { for (var i = 0; i < 26; i++) { var y = H2 - ((hash(i) * H2 + t * (14 + hash(i + 3) * 14)) % H2); R(g, hash(i + 5) < 0.5 ? '#ff8a2a' : '#ffd84a', hash(i + 1) * W2 + Math.sin(t * 2 + i) * 3, y, 1, 1); } }
  var TP = function () { return G.TowerArt.P; };

  var SCENES2 = {
    // 鍛冶屋：石の炉（火が動く）・木の屋根・切り株の上の金床・金づちをふる鍛冶屋（火花）
    smith: {
      stat: function (g, act) {
        var k = kindOf(act), P = TP(), A = art(); sky2(g, k); ground2(g, k);
        if (k === 'grass') { put(g, A.tree[0], 22, 60); put(g, A.tree[1], 218, 62); } else if (k === 'snow') { put(g, A.pine[0], 22, 62); put(g, A.pine[1], 220, 64); } else { put(g, A.spire[0], 20, 64); put(g, A.spire[1], 222, 66); }
        // 木の屋根（4本の柱と板の屋根）
        [[44, 92], [110, 92], [50, 74], [104, 74]].forEach(function (q, i) { R(g, i < 2 ? P.wood.f : P.wood.d, q[0], q[1] - 30, 3, 30); if (i < 2) R(g, P.wood.hi, q[0], q[1] - 30, 1, 30); });
        DA.box(g, 77, 62, 74, 14, 4, P.wood2); for (var x = 42; x < 114; x += 6) R(g, P.wood2.d, x, 44, 1, 14);
        // 石の炉（奥）とえんとつ
        DA.box(g, 66, 84, 28, 10, 20, P.stone); R(g, '#1a1210', 58, 70, 16, 10); DA.ell(g, 66, 70, 8, 3, '#1a1210');
        DA.box(g, 74, 62, 8, 6, 10, P.stone);
        // 切り株と金床
        shadow(g, 136, 96, 12); DA.cyl(g, 136, 94, 8, 6, P.wood);
        DA.box(g, 136, 86, 16, 5, 3, P.iron); DA.box(g, 136, 82, 22, 6, 3, P.iron); R(g, P.iron.hi, 125, 76, 4, 1);
        // たる（右）と、たてかけた剣
        shadow(g, 190, 100, 9); DA.cyl(g, 190, 98, 7, 12, P.wood); R(g, P.iron.f, 183, 90, 15, 1); R(g, P.iron.f, 183, 95, 15, 1);
        [[200, 98], [205, 98]].forEach(function (q) { R(g, '#cfd6dc', q[0], q[1] - 18, 1, 15); R(g, '#ffffff', q[0], q[1] - 18, 1, 3); R(g, '#c89a2a', q[0] - 1, q[1] - 4, 3, 1); R(g, '#5a3a1e', q[0], q[1] - 3, 1, 3); });
      },
      anim: function (g, t, act) {
        fire2(g, 66, 80, t, 1.1);
        var up = Math.sin(t * 6) > 0, P = TP();
        person2(g, 156, 98, { body: '#7a4a2a', apron: '#4a3020', hair: '#2a1a10' });
        // 金づち：上げた時と、たたいた時
        if (up) { R(g, '#5a3a1e', 150, 68, 2, 10); R(g, P.iron.f, 147, 65, 8, 4); R(g, P.iron.hi, 147, 65, 8, 1); }
        else { R(g, '#5a3a1e', 144, 80, 10, 2); R(g, P.iron.f, 140, 76, 4, 7); R(g, P.iron.hi, 140, 76, 1, 7); for (var i = 0; i < 8; i++) R(g, hash(i + Math.floor(t * 6)) < 0.5 ? '#ffd84a' : '#ff8a2a', 136 + (hash(i) - 0.5) * 18, 76 - hash(i + 4) * 12, 1, 1); }
        R(g, '#ff8a2a', 130, 78, 10, 2); R(g, '#ffd84a', 131, 78, 6, 1);   // 赤く焼けた鉄
        if (kindOf(act) === 'snow') snowfall(g, t); else if (kindOf(act) === 'volcano') embers(g, t);
      }
    },
    // 氷の祠：雪山・針葉樹・大きな氷のかたまりの中に小さな祠。中の玉が光る
    shrine: {
      stat: function (g) {
        var A = art(), P = TP(); sky2(g, 'snow'); ground2(g, 'snow');
        put(g, A.pine[0], 30, 74); put(g, A.pine[1], 54, 64); put(g, A.pine[0], 196, 66); put(g, A.pine[1], 222, 78);
        put(g, A.rock.snow, 176, 100);
        // 中の祠（先に描いて、上から氷を半分すける色で重ねる）
        DA.box(g, 120, 96, 26, 10, 16, P.wood); R(g, '#2a1a0e', 115, 84, 10, 9);
        G.TowerArt.roof(g, 120, 76, 16, 9, { l: '#a8382c', s: '#7a2a20', hi: '#c85040', d: '#4a1810' });
        // 氷のかたまり：上の面・手前の面・右の影を、すける色で
        g.globalAlpha = 0.55; DA.box(g, 120, 102, 56, 14, 44, { t: '#e8f8ff', f: '#9fd4f0', s: '#6fb0d8', hi: '#ffffff', d: '#4a88b8' }); g.globalAlpha = 1;
        R(g, '#ffffff', 94, 60, 1, 30); R(g, '#ffffff', 96, 58, 12, 1); R(g, '#d8f2ff', 140, 64, 2, 24); R(g, '#ffffff', 102, 70, 1, 8);
        shadow(g, 120, 103, 30, 0.18);
      },
      anim: function (g, t) {
        var gl = 0.5 + 0.5 * Math.sin(t * 3);
        DA.ell(g, 120, 88, 6, 4, 'rgba(120,220,255,' + (0.25 + gl * 0.35).toFixed(2) + ')'); R(g, '#ffffff', 119, 87, 2, 2); R(g, '#bff0ff', 118, 88, 1, 1);
        sparkle(g, 100, 62, t, 0); sparkle(g, 142, 72, t, 1.1); sparkle(g, 128, 56, t, 0.5);
        snowfall(g, t);
      }
    },
    // 火の泉：黒い岩のふちの溶岩の池。泡がはじけ、湯気が上がる。両わきに岩の柱
    firespring: {
      stat: function (g) {
        var A = art(); sky2(g, 'volcano'); ground2(g, 'volcano');
        put(g, A.spire[0], 34, 82); put(g, A.spire[1], 210, 84); put(g, A.rock.volcano, 64, 104); put(g, A.rock.volcano, 182, 106);
        DA.ell(g, 120, 88, 54, 16, '#1e1614'); DA.ell(g, 120, 87, 51, 14, '#3a2c2a');   // 岩のふち（手前が暗い）
        DA.ell(g, 120, 87, 47, 12, '#a82814'); DA.ell(g, 119, 86, 42, 10, '#d84418'); DA.ell(g, 118, 85, 34, 8, '#ff7a24'); DA.ell(g, 116, 84, 22, 5, '#ffb030');
        R(g, '#ffe98a', 104, 82, 10, 1);
      },
      anim: function (g, t) {
        for (var i = 0; i < 10; i++) { var p = (t * 1.1 + i * 0.29) % 1, bx = 84 + hash(i) * 70, by = 80 + hash(i + 2) * 12; if (p < 0.6) { DA.ell(g, bx, by - Math.round(p * 3), 1 + (p > 0.4 ? 1 : 0), 1, '#ffe98a'); } else if (p < 0.7) { R(g, '#fff6c0', bx - 2, by - 3, 1, 1); R(g, '#fff6c0', bx + 2, by - 3, 1, 1); } }
        for (i = 0; i < 6; i++) { var q = (t * 0.35 + i / 6) % 1; DA.ell(g, 96 + i * 10 + Math.sin(t + i) * 4, 76 - q * 40, 3 + Math.round(q * 4), 2 + Math.round(q * 2), 'rgba(210,190,180,' + (0.35 * (1 - q)).toFixed(2) + ')'); }
        DA.ell(g, 120, 86, 50 + Math.round(Math.sin(t * 4) * 2), 18, 'rgba(255,120,40,.06)');
        embers(g, t);
      }
    }
  };

  // ---- 残りの場面（新しい描き方）。ここから下は SCENES2 に1つずつ足す ----
  // 木・雪の木・岩の柱を、地域に合わせて左右に置く
  function flank(g, k, xl, yl, xr, yr) {
    var A = art();
    if (k === 'grass') { put(g, A.tree[0], xl, yl); put(g, A.tree[1], xr, yr); }
    else if (k === 'snow') { put(g, A.pine[0], xl, yl); put(g, A.pine[1], xr, yr); }
    else { put(g, A.spire[0], xl, yl); put(g, A.spire[1], xr, yr); }
  }
  function ring(g, cx, cy, rx, ry, col) { for (var a = 0; a < 28; a++) { var q = a / 28 * 6.2832; R(g, col, cx + Math.cos(q) * rx, cy + Math.sin(q) * ry); } }
  function gem(g, x, y, base, lite, dark) {   // ひし形の宝石（左は明るく、右は影）
    var rows = [[1, 2], [2, 4], [3, 6], [4, 8], [4, 8], [3, 6], [2, 4], [1, 2]], i;
    for (i = 0; i < rows.length; i++) {
      var hw = rows[i][1] / 2, rx = x - hw;
      R(g, base, rx, y + i, rows[i][1], 1); R(g, dark, x, y + i, hw, 1); R(g, lite, rx, y + i, Math.max(1, hw >> 1), 1);
    }
    R(g, '#ffffff', x - 2, y + 3, 1, 1);
  }
  function kid(g, x, y, rub) {   // 小さな子ども（高さ約19ドット）。rub＝目をこする手
    var body = '#d2586f';
    shadow(g, x, y, 5);
    R(g, '#3a4a6a', x - 2, y - 4, 2, 4); R(g, '#3a4a6a', x + 1, y - 4, 2, 4); R(g, '#2a2018', x - 2, y - 1, 2, 1); R(g, '#2a2018', x + 1, y - 1, 2, 1);
    R(g, body, x - 3, y - 11, 7, 7); R(g, shade2(body, -0.3), x + 3, y - 11, 1, 7); R(g, shade2(body, 0.25), x - 3, y - 11, 1, 7); R(g, shade2(body, -0.3), x - 3, y - 5, 7, 1);
    R(g, '#f1c6a0', x - 3, y - 18, 7, 7); R(g, '#c89870', x + 3, y - 18, 1, 7);
    R(g, '#7a4a2a', x - 3, y - 19, 7, 3); R(g, '#7a4a2a', x - 4, y - 18, 1, 5); R(g, '#9a6a42', x - 3, y - 19, 3, 1);
    if (rub) { R(g, '#f1c6a0', x - 3, y - 16, 3, 3); R(g, '#f1c6a0', x + 1, y - 16, 3, 3); R(g, body, x - 5, y - 12, 2, 6); R(g, body, x + 4, y - 12, 2, 6); R(g, body, x - 4, y - 14, 2, 2); R(g, body, x + 3, y - 14, 2, 2); }
    else { R(g, '#1b1b22', x - 2, y - 15, 2, 1); R(g, '#1b1b22', x + 1, y - 15, 2, 1); R(g, body, x - 5, y - 11, 2, 6); R(g, body, x + 4, y - 11, 2, 6); R(g, '#f1c6a0', x - 5, y - 5, 2, 1); R(g, '#f1c6a0', x + 4, y - 5, 2, 1); }
    R(g, '#7a2a2a', x - 1, y - 12, 3, 2);   // 泣いて開けた口
  }

  // 倒れた旅人：草の道に倒れた人、荷物、少しはなれた剣
  SCENES2.fallen = {
    stat: function (g) {
      var P = TP(), A = art(); sky2(g, 'grass'); ground2(g, 'grass');
      flank(g, 'grass', 20, 62, 222, 64); put(g, A.rock.grass, 196, 78);
      // 剣（ちらばって地面に落ちている）：さや先から、刃・つば・にぎり・かしら
      shadow(g, 62, 100, 22, 0.2);
      R(g, '#9aa2aa', 44, 98, 28, 2); R(g, '#cfd6dc', 44, 97, 28, 1); R(g, '#ffffff', 46, 97, 8, 1); R(g, '#7a828a', 66, 99, 6, 1); R(g, '#cfd6dc', 41, 98, 3, 1);
      R(g, P.gold.f, 72, 94, 3, 8); R(g, P.gold.hi, 72, 94, 1, 8); R(g, P.gold.s, 74, 94, 1, 8);
      R(g, '#5a3a1e', 75, 97, 8, 3); R(g, '#7a5230', 75, 97, 8, 1); R(g, P.gold.f, 83, 96, 3, 5); R(g, P.gold.hi, 83, 96, 1, 5);
      // 倒れた旅人：足・体・顔（右を向いて横たわる）
      shadow(g, 112, 98, 26, 0.3);
      R(g, '#4a392b', 84, 93, 10, 5); R(g, '#5e4a38', 84, 93, 10, 1); R(g, '#2a2018', 80, 92, 4, 6); R(g, '#3a2c20', 80, 92, 4, 1);
      R(g, '#6a5a3a', 94, 89, 20, 9); R(g, '#8a7a56', 94, 89, 20, 1); R(g, '#8a7a56', 94, 89, 1, 9); R(g, '#4a3e26', 109, 89, 5, 9); R(g, '#3a2e1a', 94, 97, 20, 1);
      R(g, '#4a3e26', 102, 90, 1, 7); R(g, '#8a2a20', 96, 90, 12, 2); R(g, '#6a1a14', 96, 91, 12, 1);   // 赤いマント（背中）
      R(g, '#f1c6a0', 114, 91, 9, 8); R(g, '#c89870', 121, 91, 2, 8); R(g, '#f8d8b8', 114, 91, 1, 8);
      R(g, '#3a2416', 114, 90, 9, 3); R(g, '#3a2416', 120, 90, 4, 6); R(g, '#1b1b22', 117, 94, 3, 1);   // 髪と閉じた目
      R(g, '#f1c6a0', 104, 98, 14, 2); R(g, '#c89870', 104, 99, 14, 1); R(g, '#f1c6a0', 118, 97, 4, 3);   // のばした腕と手
      // 荷物（ひもがほどけ、金貨が1枚こぼれている）
      shadow(g, 160, 102, 14, 0.3);
      DA.box(g, 160, 100, 20, 7, 11, P.wood); R(g, P.wood2.t, 151, 82, 18, 1); R(g, P.iron.f, 160, 82, 2, 18); R(g, P.iron.hi, 160, 82, 1, 18);
      R(g, P.gold.f, 157, 92, 7, 4); R(g, P.gold.hi, 157, 92, 7, 1); R(g, '#2a1a0e', 160, 94, 1, 1);
      R(g, P.gold.f, 176, 100, 4, 3); R(g, P.gold.hi, 176, 100, 4, 1); R(g, P.gold.d, 176, 102, 4, 1);
    },
    anim: function (g, t) { sparkle(g, 178, 96, t, 0, '#ffe14d'); sparkle(g, 162, 80, t, 0.9, '#ffe14d'); sparkle(g, 48, 94, t, 0.4); }
  };

  // 賭け師：赤白のしま屋根の荷車、黒い帽子の賭け師、はじかれる金貨
  SCENES2.gambler = {
    stat: function (g, act) {
      var k = kindOf(act), P = TP(), x, i; sky2(g, k); ground2(g, k);
      flank(g, k, 20, 66, 224, 70);
      // 荷車：2本の柱・しま屋根（左は明るく右は影）・木の台・車輪
      shadow(g, 66, 102, 36, 0.3);
      R(g, P.wood.f, 40, 56, 3, 34); R(g, P.wood.hi, 40, 56, 1, 34); R(g, P.wood.s, 90, 56, 3, 34);
      DA.box(g, 66, 98, 56, 10, 14, P.wood2); for (x = 40; x < 94; x += 8) R(g, P.wood2.d, x, 86, 1, 12);
      for (i = 0; i < 3; i++) { R(g, '#f4f0e0', 48 + i * 14, 80, 4, 4); R(g, '#c8341a', 49 + i * 14, 81, 1, 1); R(g, '#c8341a', 51 + i * 14, 82, 1, 1); }   // 台の上のさいころ
      for (x = 36; x < 96; x++) {   // 屋根：6ドットごとに赤・白。上の面は明るく、下のふちはギザギザ
        var red = Math.floor((x - 36) / 6) % 2 === 0, sh = x > 80;
        R(g, red ? (sh ? '#8a2412' : '#c8341a') : (sh ? '#b8b4a8' : '#f4f0e6'), x, 54, 1, 9);
        R(g, red ? '#e0553a' : '#ffffff', x, 48, 1, 6);
        if ((x - 36) % 6 < 3) R(g, red ? (sh ? '#6a1a0c' : '#9a2414') : '#cfc9b8', x, 63, 1, 2);
      }
      R(g, '#ffffff', 36, 48, 60, 1); R(g, '#6a1a0c', 36, 62, 60, 1);
      [[46, 100], [88, 100]].forEach(function (w) {   // 車輪
        DA.ell(g, w[0], w[1], 7, 7, P.wood.d); DA.ell(g, w[0] - 1, w[1] - 1, 6, 6, P.wood.f); DA.ell(g, w[0] - 1, w[1] - 1, 3, 3, P.wood.d);
        R(g, P.wood.hi, w[0] - 6, w[1] - 2, 1, 3); R(g, P.wood.d, w[0] - 6, w[1] - 1, 12, 1); R(g, P.wood.d, w[0] - 1, w[1] - 6, 1, 12); R(g, P.gold.f, w[0] - 2, w[1] - 2, 2, 2);
      });
    },
    anim: function (g, t, act) {
      var k = kindOf(act), p = (t * 1.6) % 1, cy = 76 - Math.round(Math.sin(p * Math.PI) * 30), f = Math.floor(t * 12) % 2, P = TP();
      person2(g, 134, 98, { body: '#6a3a8a', hair: '#1a1a1a', hat: '#1a1a1a' });
      R(g, '#2a2a30', 129, 74, 11, 1); R(g, '#3a3a44', 131, 70, 3, 4);   // 帽子のつや
      R(g, '#6a3a8a', 140, 86, 5, 2); R(g, '#f1c6a0', 144, 85, 2, 2);   // 金貨をはじく手
      R(g, P.gold.f, 146, cy, f ? 4 : 2, 4); R(g, P.gold.hi, 146, cy, f ? 2 : 1, 1); if (f) R(g, P.gold.d, 148, cy + 3, 2, 1);
      DA.ell(g, 147, 99, 2, 1, 'rgba(0,0,0,.25)');
      if (k === 'snow') snowfall(g, t); else if (k === 'volcano') embers(g, t);
    }
  };

  // 赤い祭壇：溶岩の地、石の段の上で宝石がうかんで光る。左右にろうそく
  SCENES2.altar = {
    stat: function (g) {
      var P = TP(), A = art(); sky2(g, 'volcano'); ground2(g, 'volcano');
      put(g, A.spire[0], 22, 80); put(g, A.spire[1], 220, 84); put(g, A.rock.volcano, 52, 104); put(g, A.rock.volcano, 196, 106);
      shadow(g, 120, 104, 40, 0.35);
      DA.box(g, 120, 102, 68, 12, 6, P.redst);   // 下の段
      DA.box(g, 120, 96, 44, 10, 14, P.redst);   // 上の段
      DA.box(g, 120, 82, 50, 10, 3, P.redst);    // いちばん上の台
      for (var i = 0; i < 4; i++) { R(g, P.redst.m, 100 + i * 12, 84, 1, 12); }
      R(g, P.redst.m, 99, 90, 44, 1); R(g, '#c8341a', 116, 86, 8, 1); R(g, '#ff6a2a', 119, 90, 2, 4); R(g, '#c8341a', 117, 92, 6, 1);   // 赤いほりこみ
      [92, 148].forEach(function (x) { R(g, '#e8e0d0', x, 85, 3, 9); R(g, '#ffffff', x, 85, 1, 9); R(g, '#b8b0a0', x + 2, 85, 1, 9); R(g, '#2a2018', x + 1, 84, 1, 1); });
    },
    anim: function (g, t) {
      var gl = 0.5 + 0.5 * Math.sin(t * 3), by = Math.round(Math.sin(t * 2) * 1.5);
      DA.ell(g, 120, 66 + by, 18, 14, 'rgba(255,60,40,' + (0.12 + gl * 0.12).toFixed(2) + ')'); DA.ell(g, 120, 66 + by, 11, 9, 'rgba(255,90,60,' + (0.15 + gl * 0.15).toFixed(2) + ')');
      gem(g, 120, 62 + by, '#d82a2a', '#ff8a8a', '#8a1414');
      DA.ell(g, 120, 75, 12, 2, 'rgba(255,60,40,' + (0.15 + gl * 0.2).toFixed(2) + ')');   // 台に落ちる赤い光
      fire2(g, 93, 84, t, 0.55); fire2(g, 149, 84, t + 1, 0.55);
      sparkle(g, 108, 56 + by, t, 0, '#ffb0a0'); sparkle(g, 133, 64 + by, t, 1, '#ffb0a0');
      embers(g, t);
    }
  };

  // 泣く子ども：遠くの家へつづく小道に立って泣いている
  SCENES2.child = {
    stat: function (g) {
      var P = TP(), A = art(), y, x, hw; sky2(g, 'grass'); ground2(g, 'grass');
      for (y = HZ; y < H2; y++) {   // 小道：奥は細く、手前は太く。左のふちは明るく、右は少し影
        hw = 5 + (y - HZ) * 0.55; var cx = 190 - (y - HZ) * 1.15;
        R(g, '#b8955e', cx - hw, y, hw * 2, 1); R(g, '#c9a870', cx - hw, y, 2, 1); R(g, '#8f6e40', cx + hw - 3, y, 3, 1);
        if (hash(y * 3.1) < 0.5) R(g, '#9a7a48', cx - hw + 3 + hash(y) * hw, y, 2, 1);
      }
      flank(g, 'grass', 20, 62, 226, 60); put(g, A.tree[1], 46, 52); put(g, A.rock.grass, 218, 96);
      // 遠くの家：白かべ・赤い屋根・ドア・まど・えんとつ
      DA.box(g, 190, 56, 30, 2, 18, P.wood2); R(g, '#e8dcc0', 176, 38, 29, 18); R(g, '#c8bca0', 201, 38, 4, 18); R(g, '#f4ecd8', 176, 38, 1, 18); R(g, '#8a7a5a', 176, 55, 29, 1);
      DA.box(g, 200, 36, 5, 3, 8, P.stone);
      G.TowerArt.roof(g, 190, 39, 19, 12, { l: '#b8382c', s: '#7a2a20', hi: '#d85a48', d: '#4a1810' });
      R(g, P.wood.d, 188, 46, 5, 10); R(g, P.wood.f, 188, 46, 2, 10); R(g, '#c89a2a', 192, 51, 1, 1);
      R(g, '#2a3a50', 180, 44, 5, 5); R(g, '#ffd27a', 181, 45, 3, 3); R(g, P.wood.d, 182, 44, 1, 5);
      R(g, '#4f8a3d', 170, 54, 5, 3); R(g, '#3c7232', 206, 54, 4, 3);
    },
    anim: function (g, t) {
      var d = Math.floor(t * 3) % 3, rub = Math.floor(t * 1.2) % 4 === 0;
      for (var i = 0; i < 3; i++) { var q = (t * 0.4 + i * 0.33) % 1; DA.ell(g, 196 + i * 3, 33 - q * 20, 3 + Math.round(q * 3), 2 + Math.round(q * 2), 'rgba(220,220,225,' + (0.4 * (1 - q)).toFixed(2) + ')'); }   // えんとつの煙
      kid(g, 108, 98, rub);
      if (!rub) { R(g, '#7fc8ff', 105, 84 + d * 2, 1, 2); R(g, '#bfe4ff', 105, 84 + d * 2, 1, 1); R(g, '#7fc8ff', 110, 85 + ((d + 1) % 3) * 2, 1, 2); R(g, '#bfe4ff', 110, 85 + ((d + 1) % 3) * 2, 1, 1); }
      else { R(g, '#7fc8ff', 103, 90 + d, 1, 1); R(g, '#7fc8ff', 112, 91 + d, 1, 1); }
    }
  };

  // 紫に光る宝箱：木の箱に金の帯。すきまから紫の光がもれ、光の粒がのぼる
  SCENES2.box = {
    stat: function (g, act) {
      var k = kindOf(act), P = TP(), A = art(); sky2(g, k); ground2(g, k);
      flank(g, k, 20, 64, 224, 68); put(g, A.rock[k], 60, 100); put(g, A.rock[k], 186, 98);
      shadow(g, 120, 100, 28, 0.32);
      DA.box(g, 120, 98, 38, 12, 12, P.wood);                  // 箱（手前の面と、ふたの上の面）
      for (var x = 102; x < 138; x += 7) R(g, P.wood.d, x, 87, 1, 10);
      R(g, P.wood2.t, 102, 74, 38, 12); R(g, P.wood2.hi, 102, 74, 38, 1); R(g, P.wood2.s, 134, 74, 5, 12); R(g, P.wood2.hi, 102, 74, 1, 12);
      [106, 130].forEach(function (bx) { R(g, P.gold.f, bx, 74, 4, 24); R(g, P.gold.hi, bx, 74, 1, 24); R(g, P.gold.s, bx + 3, 74, 1, 24); });   // 金の帯
      R(g, P.gold.d, 102, 86, 38, 1); R(g, P.gold.f, 116, 83, 8, 8); R(g, P.gold.hi, 116, 83, 8, 1); R(g, P.gold.s, 123, 83, 1, 8); R(g, '#2a1a0e', 119, 86, 2, 3);   // 錠前
    },
    anim: function (g, t, act) {
      var k = kindOf(act), gl = 0.5 + 0.5 * Math.sin(t * 2.4), i;
      DA.ell(g, 120, 86, 34, 20, 'rgba(150,70,255,' + (0.1 + gl * 0.12).toFixed(2) + ')'); DA.ell(g, 120, 90, 24, 12, 'rgba(180,100,255,' + (0.12 + gl * 0.12).toFixed(2) + ')');
      R(g, '#d8b0ff', 103, 86, 13, 1); R(g, '#d8b0ff', 125, 86, 14, 1);   // ふたのすきまからもれる光
      R(g, 'rgba(216,176,255,' + (0.5 + gl * 0.4).toFixed(2) + ')', 103, 87, 36, 1);
      for (i = 0; i < 6; i++) { var q = (t * 0.5 + i / 6) % 1; R(g, i % 2 ? '#c79bff' : '#efd8ff', 104 + i * 6 + Math.sin(t * 3 + i) * 3, 82 - q * 36, 1, 2); }
      sparkle(g, 140, 76, t, 0, '#ffe14d');
      if (k === 'snow') snowfall(g, t); else if (k === 'volcano') embers(g, t);
    }
  };

  // 火山の炉：黒レンガの大きな炉・金床・鍛冶屋（金づち・火花）
  SCENES2.forge = {
    stat: function (g) {
      var P = TP(), A = art(), r, x; sky2(g, 'volcano'); ground2(g, 'volcano');
      put(g, A.spire[0], 214, 66); put(g, A.rock.volcano, 196, 104); put(g, A.rock.volcano, 20, 106);
      // 炉：焦げたレンガ。えんとつ→本体→口（中は暗く、ふちは明るい）
      shadow(g, 62, 100, 34, 0.35);
      DA.box(g, 62, 54, 16, 6, 24, P.char); DA.box(g, 62, 98, 58, 14, 38, P.char);
      for (r = 62; r < 96; r += 4) { R(g, P.char.m, 34, r, 56, 1); for (x = 34 + ((r >> 2) & 1) * 4; x < 90; x += 8) R(g, P.char.m, x, r - 3, 1, 3); }
      R(g, '#0e0806', 46, 78, 32, 20); DA.ell(g, 62, 78, 16, 6, '#0e0806'); R(g, P.char.hi, 44, 78, 2, 20); R(g, P.char.d, 78, 78, 2, 20); R(g, '#2a1a14', 46, 78, 2, 20);
      R(g, '#6a2a14', 48, 96, 28, 2);   // 口の下の石
      // 石の台と金床（手前の面は明るく、右は影）
      shadow(g, 126, 100, 14); DA.cyl(g, 126, 94, 8, 6, P.wood);
      DA.box(g, 126, 86, 16, 5, 3, P.iron); DA.box(g, 126, 82, 22, 6, 3, P.iron); R(g, P.iron.hi, 115, 76, 4, 1);
      // たる（水）と、たてかけたやっとこ・金づち
      shadow(g, 196, 100, 9); DA.cyl(g, 196, 98, 7, 12, P.wood); R(g, P.iron.f, 189, 90, 15, 1); R(g, P.iron.f, 189, 95, 15, 1);
      R(g, '#5a3a1e', 172, 84, 2, 16); R(g, P.iron.f, 169, 82, 8, 4); R(g, P.iron.hi, 169, 82, 8, 1);
      // 炭の山
      DA.ell(g, 100, 100, 7, 3, '#1a1210'); DA.ell(g, 99, 98, 5, 2, '#2e2220'); R(g, '#ff6a2a', 98, 98, 1, 1); R(g, '#54484a', 96, 97, 2, 1);
    },
    anim: function (g, t) {
      var P = TP(), up = Math.sin(t * 6) > 0, i;
      DA.ell(g, 62, 96, 26, 8, 'rgba(255,120,40,' + (0.12 + 0.04 * Math.sin(t * 7)).toFixed(2) + ')');   // 炉の光が地面を照らす
      DA.ell(g, 62, 94, 12, 2, '#ff6a2a'); DA.ell(g, 62, 94, 7, 1, '#ffd84a');   // 炭の赤い山
      fire2(g, 62, 94, t, 1.5);
      person2(g, 146, 98, { body: '#5a2a1a', apron: '#3a2010', hair: '#1a1a1a' });
      if (up) { R(g, '#5a3a1e', 140, 68, 2, 10); R(g, P.iron.f, 137, 65, 8, 4); R(g, P.iron.hi, 137, 65, 8, 1); }
      else { R(g, '#5a3a1e', 134, 80, 10, 2); R(g, P.iron.f, 130, 76, 4, 7); R(g, P.iron.hi, 130, 76, 1, 7); for (i = 0; i < 8; i++) R(g, hash(i + Math.floor(t * 6)) < 0.5 ? '#ffd84a' : '#ff8a2a', 126 + (hash(i) - 0.5) * 18, 76 - hash(i + 4) * 12, 1, 1); }
      R(g, '#ff8a2a', 120, 78, 10, 2); R(g, '#ffd84a', 121, 78, 6, 1);   // 赤く焼けた鉄
      embers(g, t);
    }
  };

  // 山小屋：木の壁・床・窓・石の暖炉・薪。屋内なので空と地面は使わない
  SCENES2.hut = {
    stat: function (g, act) {
      var P = TP(), y, x, i, k = kindOf(act);
      // 丸太の壁（1段8ドット：上は明るく、下は暗い線）
      for (y = 0; y < 68; y += 8) {
        var h = hash(y * 1.7);
        R(g, h < 0.5 ? '#6e4e2c' : '#6a4a2a', 0, y, W2, 8); R(g, '#8a6438', 0, y, W2, 1); R(g, '#7a5632', 0, y + 1, W2, 1); R(g, '#523a20', 0, y + 6, W2, 1); R(g, '#3a2616', 0, y + 7, W2, 1);
        for (x = 4 + Math.floor(h * 20); x < W2; x += 26 + Math.floor(h * 14)) R(g, '#4a3220', x, y + 3, 3, 2);   // 木のふし
      }
      R(g, '#3a2616', 0, 0, W2, 5); R(g, '#523a20', 0, 0, W2, 1);   // 天井のはり
      // 床：板を横にならべる（手前ほど少し暗く、板の継ぎ目を入れる）
      for (y = 72; y < H2; y += 6) { R(g, hash(y) < 0.5 ? '#a67a48' : '#9a7040', 0, y, W2, 5); R(g, '#c4915a', 0, y, W2, 1); R(g, '#6a4a28', 0, y + 5, W2, 1); for (x = Math.floor(hash(y + 2) * 30); x < W2; x += 40 + Math.floor(hash(y) * 20)) R(g, '#6a4a28', x, y, 1, 5); }
      g.fillStyle = 'rgba(40,20,8,.28)'; g.fillRect(0, 72, W2, H2 - 72);
      R(g, P.wood.d, 0, 68, W2, 4); R(g, P.wood.f, 0, 68, W2, 1);   // 巾木
      // まどの光が床に落ちる
      g.fillStyle = 'rgba(255,255,255,.09)'; for (i = 0; i < 24; i++) g.fillRect(34 + i * 1.2 + (i >> 1) , 76 + i, 28, 1);
      // 窓：木のわく・ガラス（外の色）・十字のさん・下の台
      R(g, P.wood.d, 20, 16, 38, 40); R(g, P.wood.hi, 20, 16, 1, 40);
      for (y = 0; y < 34; y++) R(g, k === 'volcano' ? (y < 20 ? '#4a1c1a' : '#7a3020') : k === 'snow' ? (y < 20 ? '#9fb0c8' : '#c4d0e0') : (y < 20 ? '#7eb0e0' : '#a6cbea'), 23, 19 + y, 32, 1);
      if (k === 'grass') { R(g, '#5a9846', 23, 46, 32, 7); R(g, '#7aa868', 23, 44, 32, 2); } else if (k === 'snow') { R(g, '#eef3f9', 23, 46, 32, 7); R(g, '#8592a6', 23, 42, 32, 4); } else { R(g, '#3a2e2e', 23, 46, 32, 7); R(g, '#ff6a2a', 30, 47, 6, 1); }
      R(g, P.wood.f, 38, 19, 3, 34); R(g, P.wood.hi, 38, 19, 1, 34); R(g, P.wood.f, 23, 35, 32, 3); R(g, P.wood.hi, 23, 35, 32, 1);
      R(g, P.wood2.t, 17, 56, 44, 3); R(g, P.wood2.hi, 17, 56, 44, 1); R(g, P.wood2.s, 17, 59, 44, 1); R(g, P.wood.d, 17, 59, 44, 1);
      // 暖炉：石を積んだ面・マントルピース・炉の口・石の床
      shadow(g, 120, 82, 44, 0.3);
      DA.box(g, 120, 72, 66, 6, 52, P.stone);
      for (y = 24; y < 70; y += 4) { R(g, P.stone.m, 88, y, 64, 1); for (x = 88 + ((y >> 2) & 1) * 5; x < 152; x += 10) R(g, P.stone.m, x, y - 3, 1, 3); }
      DA.box(g, 120, 26, 78, 6, 4, P.wood2);
      DA.box(g, 120, 82, 78, 10, 3, P.stone);
      R(g, '#150e0c', 100, 42, 40, 28); DA.ell(g, 120, 42, 20, 8, '#150e0c'); R(g, '#2a1c16', 100, 42, 3, 28); R(g, '#3a2a22', 137, 44, 3, 26); R(g, P.stone.hi, 98, 44, 2, 28); R(g, P.stone.d, 140, 44, 2, 28);
      R(g, '#5a3a1e', 104, 66, 32, 4); R(g, '#7a5230', 104, 66, 32, 1); R(g, '#3a2414', 104, 69, 32, 1); R(g, '#7a5230', 108, 62, 24, 4); R(g, '#9a6a3a', 108, 62, 24, 1);   // 燃える薪
      R(g, '#c8a060', 112, 28, 2, 2); R(g, '#e8e0d0', 128, 14, 3, 8); R(g, '#ffffff', 128, 14, 1, 8); R(g, '#2a2018', 129, 13, 1, 1);   // マントルのろうそく
      // ラグ、切り株とおの、薪の山（木口は輪っか）
      DA.ell(g, 120, 100, 42, 8, '#5a1a1a'); DA.ell(g, 119, 99, 40, 7, '#8a2a2a'); DA.ell(g, 119, 99, 30, 4, '#a63a34'); R(g, '#d8b060', 82, 99, 74, 1);
      shadow(g, 72, 104, 10); DA.cyl(g, 72, 102, 8, 8, P.wood); R(g, '#5a3a1e', 68, 80, 2, 18); R(g, P.iron.f, 65, 80, 8, 5); R(g, P.iron.hi, 65, 80, 8, 1);
      shadow(g, 196, 106, 26, 0.3);
      [[0, 4, 180, 100], [1, 4, 191, 100], [2, 4, 202, 100], [3, 4, 213, 100], [4, 3, 185, 91], [5, 3, 196, 91], [6, 3, 207, 91], [7, 2, 191, 82], [8, 2, 202, 82]].forEach(function (l) {
        DA.ell(g, l[2], l[3], 5, 5, '#5a3a1e'); DA.ell(g, l[2] - 1, l[3] - 1, 5, 5, '#8a6034'); DA.ell(g, l[2] - 1, l[3] - 1, 3, 3, '#d8b078'); DA.ell(g, l[2] - 1, l[3] - 1, 1, 1, '#b08850');
      });
      g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(218, 0, 22, H2); g.fillStyle = 'rgba(255,230,190,.07)'; g.fillRect(0, 0, 3, H2);   // 右の影・左のふちの光
    },
    anim: function (g, t, act) {
      var k = kindOf(act), fl = Math.sin(t * 7) * 2;
      DA.ell(g, 120, 74, 44 + Math.round(fl), 20, 'rgba(255,140,40,.07)'); DA.ell(g, 120, 82, 30, 8, 'rgba(255,160,60,.1)');
      fire2(g, 120, 66, t, 2); fire2(g, 114, 66, t + 0.5, 1.2);
      sparkle(g, 114, 56, t, 0, '#ffd84a');
      if (k === 'snow') for (var i = 0; i < 8; i++) R(g, '#ffffff', 24 + (hash(i) * 30 + t * 4) % 30, 20 + (hash(i + 1) * 26 + t * (8 + i)) % 26, 1, 1);
      R(g, '#ffd84a', 126, 11, 1, 1); R(g, '#ff8a2a', 128, 12 + (Math.floor(t * 6) % 2), 3, 1);   // ろうそくの火
    }
  };

  // 雪にうもれた旅人：雪のかたまりから上半身だけ出て、白い息をはく。そばに杖
  SCENES2.stranded = {
    stat: function () {
      var P = TP(), A = art(), g = arguments[0]; sky2(g, 'snow'); ground2(g, 'snow');
      put(g, A.pine[0], 24, 70); put(g, A.pine[1], 52, 60); put(g, A.pine[1], 214, 64); put(g, A.pine[0], 190, 76); put(g, A.rock.snow, 180, 100);
      shadow(g, 122, 104, 44, 0.2);
      // 雪のかたまり：奥は旅人の背中でかくれる。まず下の影・手前に明るい雪
      DA.ell(g, 122, 100, 40, 14, '#a8b6ca'); DA.ell(g, 120, 98, 38, 13, '#c4d0e0'); DA.ell(g, 118, 96, 34, 11, '#e8eef6');
      // 旅人（雪の中から上半身）：赤い上着・赤いぼうし・顔・白いマフラー
      R(g, '#8a3a2a', 108, 76, 18, 22); R(g, '#a84a38', 108, 76, 2, 22); R(g, '#5a2418', 123, 76, 3, 22); R(g, '#5a2418', 108, 92, 18, 3);
      R(g, '#7a4a2a', 126, 80, 6, 12); R(g, '#9a6a3a', 126, 80, 1, 12);   // 荷物
      R(g, '#f4f0e6', 108, 72, 18, 5); R(g, '#c4d0e0', 123, 72, 3, 5);
      R(g, '#f1c6a0', 110, 60, 14, 13); R(g, '#c89870', 121, 60, 3, 13); R(g, '#f8d8b8', 110, 60, 1, 13);
      R(g, '#c84a3a', 109, 54, 16, 7); R(g, '#e86a58', 109, 54, 16, 1); R(g, '#8a2a20', 121, 54, 4, 7); R(g, '#f4f0e6', 108, 60, 18, 2); R(g, '#f4f0e6', 117, 51, 3, 3);
      R(g, '#1b1b22', 113, 66, 2, 1); R(g, '#1b1b22', 119, 66, 2, 1); R(g, '#b05848', 116, 69, 3, 1); R(g, '#f09080', 110, 68, 2, 1); R(g, '#f09080', 122, 68, 2, 1);   // 目・口・ほっぺ
      DA.ell(g, 119, 97, 26, 7, '#e8eef6'); DA.ell(g, 117, 96, 22, 5, '#ffffff'); R(g, '#c4d0e0', 100, 100, 40, 1);   // 手前の雪
      // 杖：雪につき刺してある（頭は丸いこぶ）
      R(g, '#7a5230', 158, 62, 3, 40); R(g, '#9a6a3a', 158, 62, 1, 40); R(g, '#4a3018', 160, 62, 1, 40); DA.ell(g, 159, 62, 3, 2, '#9a6a3a'); R(g, '#ffffff', 155, 100, 9, 2);
    },
    anim: function (g, t) {
      var b = (t * 0.6) % 1;
      for (var i = 0; i < 3; i++) { var q = (b + i * 0.15); if (q < 1 && Math.floor(t * 1.2) % 2 === 0) DA.ell(g, 126 + q * 10 + i * 3, 69 - q * 6, 2 + i, 1 + (i >> 1), 'rgba(236,244,255,' + (0.8 - q * 0.6).toFixed(2) + ')'); }
      DA.ell(g, 128 + (b * 8), 68 - b * 4, 3, 2, 'rgba(236,244,255,' + (0.6 - b * 0.5).toFixed(2) + ')');
      snowfall(g, t);
    }
  };

  // 金貨が沈む泉：石のふちの草原の泉。金貨が落ちて沈み、波紋が広がる。水底に金貨
  SCENES2.spring = {
    stat: function (g) {
      var P = TP(), A = art(), i; sky2(g, 'grass'); ground2(g, 'grass');
      flank(g, 'grass', 22, 64, 220, 66); put(g, A.rock.grass, 36, 100); put(g, A.rock.grass, 210, 98);
      DA.ell(g, 120, 90, 56, 16, '#44443f'); DA.ell(g, 120, 87, 56, 16, '#9a9a92'); DA.ell(g, 120, 87, 52, 14, '#6e6e68');   // 石のふち（手前の面が暗い）
      for (i = 0; i < 12; i++) { var a = i / 12 * 6.2832; R(g, i % 3 ? '#b4b4ac' : '#7e7e78', 120 + Math.cos(a) * 54 - 2, 87 + Math.sin(a) * 15, 4, 2); }
      DA.ell(g, 120, 88, 49, 12, '#2a5e92'); DA.ell(g, 119, 87, 44, 10, '#3a7eb8'); DA.ell(g, 118, 86, 34, 7, '#5aa0d4'); DA.ell(g, 116, 85, 20, 4, '#7ec0ea');
      R(g, '#bfe4ff', 100, 82, 14, 1); R(g, '#bfe4ff', 138, 90, 8, 1);   // 水面の光
      g.globalAlpha = 0.8;   // 水の底に沈んだ金貨
      [[92, 90], [104, 94], [132, 92], [146, 88], [118, 93], [78, 87]].forEach(function (c) { R(g, '#c89a2a', c[0], c[1], 4, 2); R(g, '#f6dc7a', c[0], c[1], 3, 1); });
      g.globalAlpha = 1;
      for (i = 0; i < 5; i++) { R(g, '#2a6a30', 188 + i * 3, 70, 1, 12 + (i % 2) * 4); R(g, '#4a9a48', 188 + i * 3, 70, 1, 3); R(g, '#7a5230', 188 + i * 3, 70, 1, 1); }   // 水辺のアシ
      R(g, '#f4f0f0', 62, 98, 2, 2); R(g, '#f4e36a', 66, 100, 2, 2); R(g, '#f0f0f0', 168, 104, 2, 2);
    },
    anim: function (g, t) {
      var i, p = (t * 0.5) % 1, P = TP();
      for (i = 0; i < 2; i++) { var r = (t * 0.35 + i * 0.5) % 1; ring(g, 120, 88, 4 + r * 40, 1.5 + r * 10, 'rgba(255,255,255,' + (0.55 * (1 - r)).toFixed(2) + ')'); }
      if (p < 0.4) { var cy = 54 + p / 0.4 * 32, f = Math.floor(t * 12) % 2; R(g, P.gold.f, 118, cy, f ? 4 : 2, 4); R(g, P.gold.hi, 118, cy, f ? 2 : 1, 1); }   // 落ちる金貨
      else { var s = (p - 0.4) / 0.6; g.globalAlpha = 1 - s; R(g, '#c89a2a', 118, 86 + s * 8, 4, 2); R(g, '#f6dc7a', 118, 86 + s * 8, 3, 1); g.globalAlpha = 1; ring(g, 120, 88, 2 + s * 16, 1 + s * 4, 'rgba(255,255,255,' + (0.6 * (1 - s)).toFixed(2) + ')'); }
      for (i = 0; i < 6; i++) sparkle(g, 76 + i * 17 + (i % 2) * 4, 82 + (i % 3) * 5, t, i * 0.45);
      [[92, 90], [132, 92], [146, 88]].forEach(function (c, j) { if (Math.floor(t * 3 + j) % 3 === 0) R(g, '#ffffff', c[0] + 1, c[1], 2, 1); });
    }
  };

  // 溶岩の宝：流れる溶岩の川の向こう岸に、金貨の山
  SCENES2.lavatreasure = {
    stat: function (g) {
      var P = TP(), A = art(), y, x; sky2(g, 'volcano'); ground2(g, 'volcano');
      put(g, A.spire[0], 30, 66); put(g, A.spire[1], 60, 64); put(g, A.rock.volcano, 224, 66); put(g, A.rock.volcano, 24, 106); put(g, A.rock.volcano, 214, 108);
      // 向こう岸のふち → 川 → 手前の岸のふち
      R(g, '#1a1210', 0, 62, W2, 4); R(g, '#54484a', 0, 62, W2, 1);
      for (y = 66; y < 90; y++) { var q = (y - 66) / 24; for (x = 0; x < W2; x += 2) R(g, q < 0.25 ? '#a82814' : q < 0.5 ? '#d84418' : q < 0.8 ? '#e85a1c' : '#b82e14', x, y, 2, 1); }
      R(g, '#1a1210', 0, 90, W2, 3); R(g, '#3a2c2a', 0, 90, W2, 1); R(g, '#0e0808', 0, 93, W2, 1);
      // 金貨の山（向こう岸）：左は明るく、右は影。ところどころの金貨の輪
      shadow(g, 176, 66, 30, 0.35);
      DA.ell(g, 176, 62, 28, 7, P.gold.d); DA.ell(g, 175, 60, 25, 7, P.gold.s); DA.ell(g, 174, 57, 20, 6, P.gold.f); DA.ell(g, 172, 53, 13, 5, P.gold.t); DA.ell(g, 170, 50, 6, 3, P.gold.hi);
      for (x = 0; x < 16; x++) { R(g, x % 2 ? P.gold.hi : P.gold.d, 156 + hash(x) * 40, 50 + hash(x + 3) * 14, 3, 1); }
      R(g, P.gold.f, 206, 64, 4, 2); R(g, P.gold.hi, 206, 64, 4, 1); R(g, P.gold.f, 140, 63, 4, 2); R(g, P.gold.hi, 140, 63, 4, 1);
      R(g, '#d82a2a', 184, 48, 3, 3); R(g, '#ff8a8a', 184, 48, 1, 1); R(g, '#3ac8e8', 164, 52, 3, 3); R(g, '#bff4ff', 164, 52, 1, 1);   // 宝石
    },
    anim: function (g, t) {
      var i, off = Math.floor(t * 12);
      for (i = 0; i < 28; i++) { var sx = ((hash(i) * 260 - off * (3 + hash(i + 1) * 2)) % 260 + 260) % 260 - 10, sy = 68 + Math.floor(hash(i + 7) * 20); R(g, i % 3 ? '#ffb347' : '#ffe98a', sx, sy, 6 + (i % 4) * 2, 1); R(g, '#a82814', sx + 2, sy + 1, 4, 1); }   // 流れる溶岩のすじ
      for (i = 0; i < 8; i++) { var p = (t * 0.9 + i * 0.31) % 1; if (p < 0.5) R(g, '#ffd84a', 20 + i * 28 + hash(i) * 10, 80 - Math.round(Math.sin(p * 6.28) * 6 * (0.5 + hash(i + 2))), 1, 1); }
      DA.ell(g, 176, 62, 40, 14, 'rgba(255,200,80,' + (0.05 + 0.03 * Math.sin(t * 3)).toFixed(2) + ')');
      for (i = 0; i < 5; i++) sparkle(g, 160 + i * 9, 48 + (i % 3) * 5, t, i * 0.5, '#fff6c0');
      embers(g, t);
    }
  };
  // ---- 終わりの画面（2026-10-22）：クリア＝朝日の砦と花火、敗北＝燃える砦と煙 ----
  SCENES2.victory = {
    stat: function (g) {
      var A = art(); sky2(g, 'grass'); ground2(g, 'grass');
      for (var y = 0; y < HZ; y++) { g.fillStyle = 'rgba(255,200,120,' + (y / HZ * 0.35).toFixed(2) + ')'; g.fillRect(0, y, W2, 1); }   // 朝日の色
      put(g, A.tree[0], 18, 66); put(g, A.tree[1], 222, 70);
      var F = A.castle.grass; shadow(g, 120, 100, 50, 0.3); put(g, F, 120, 100);
      [[40, 106, 'archer'], [200, 106, 'frost']].forEach(function (q) { var im = G.towerImg(q[2], 2); shadow(g, q[0], q[1] - 1, 10); g.drawImage(im, Math.round(q[0] - im.width / 2), q[1] - im.height); });
    },
    anim: function (g, t) {
      for (var k = 0; k < 3; k++) {   // 花火：打ち上げて、丸く広がって消える
        var p = (t * 0.45 + k * 0.33) % 1, fx = 50 + k * 70 + Math.round(hash(k + Math.floor(t * 0.45 + k * 0.33)) * 20), fy = 26 + (k % 2) * 8;
        var col = ['#ffd84a', '#ff6a8a', '#7ad0ff'][k];
        if (p < 0.3) R(g, '#fff6c0', fx, Math.round(HZ + 30 - (HZ + 30 - fy) * p / 0.3), 1, 2);
        else { var r = (p - 0.3) / 0.7, n = 14; g.globalAlpha = 1 - r; for (var i = 0; i < n; i++) { var an = i / n * 6.283; R(g, col, fx + Math.cos(an) * r * 18, fy + Math.sin(an) * r * 14, 1, 1); R(g, '#ffffff', fx + Math.cos(an) * r * 12, fy + Math.sin(an) * r * 9, 1, 1); } g.globalAlpha = 1; }
      }
      for (var j = 0; j < 4; j++) sparkle(g, 100 + j * 14, 30 + (j % 2) * 6, t, j * 0.6, '#fff6c0');
    }
  };
  SCENES2.defeat = {
    stat: function (g) {
      var A = art(); sky2(g, 'volcano'); ground2(g, 'volcano');
      put(g, A.spire[0], 22, 80); put(g, A.spire[1], 218, 82);
      var F = A.castle.volcano, o = DA.mk(F.cv.width, F.cv.height); o.c.drawImage(F.cv, 0, 0);   // 黒こげの砦：暗くする
      o.c.globalCompositeOperation = 'source-atop'; o.c.fillStyle = 'rgba(20,6,8,.55)'; o.c.fillRect(0, 0, F.cv.width, F.cv.height);
      shadow(g, 120, 100, 50, 0.35); g.drawImage(o.cv, 120 - F.ax, 100 - F.ay);
      for (var i = 0; i < 14; i++) { var x = 74 + hash(i) * 92, y = 94 + hash(i + 3) * 10; DA.ell(g, x, y, 3 + (i % 3), 1 + (i % 2), '#1a1210'); R(g, '#3a2c2a', x - 1, y - 1, 2, 1); }   // くずれた石
    },
    anim: function (g, t) {
      [[92, 60], [146, 52], [120, 40]].forEach(function (q, i) { fire2(g, q[0], q[1], t + i, 0.9); });
      for (var i = 0; i < 8; i++) { var p = (t * 0.25 + i / 8) % 1; DA.ell(g, 100 + i * 6 + Math.sin(t + i) * 5, 40 - p * 40, 3 + Math.round(p * 6), 2 + Math.round(p * 3), 'rgba(40,30,30,' + (0.5 * (1 - p)).toFixed(2) + ')'); }
      embers(g, t);
    }
  };


  var alive = [];
  G.eventArt = function (id, act) {
    var f2 = SCENES2[id]; if (!f2) return null;
    var cv = document.createElement('canvas'); cv.width = W2; cv.height = H2; cv.className = 'event-art'; cv.setAttribute('aria-hidden', 'true');
    var g = cv.getContext('2d'), t0 = performance.now(), st = null; g.imageSmoothingEnabled = false;
    st = DA.mk(W2, H2); f2.stat(st.c, act || 1);
    function paint() {
      var t = (performance.now() - t0) / 1000;
      g.clearRect(0, 0, W2, H2);
      g.drawImage(st.cv, 0, 0); f2.anim(g, t, act || 1);
    }
    paint();
    var id2 = setInterval(function () { if (!cv.isConnected) { clearInterval(id2); return; } paint(); }, 100);
    return cv;
  };
  G.eventArt.redesigned = function () { return Object.keys(SCENES2); };
})();

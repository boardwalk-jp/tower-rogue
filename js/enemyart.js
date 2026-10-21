// 敵・兵士・石の巨人のドット絵（1マス24×18ドットの疑似3D）。段階③で新しく描いたもの
// きまり（docs/HANDOFF_REDESIGN.md の3章）：
//   ・右向きを描き、左右反転で左向きを作る。歩く2コマ（f＝0/1）
//   ・canvas の下のふち＝足もと（地面に立つ点）、横の真ん中＝体の中心。空を飛ぶ敵は絵の下に余白を作らない（浮かせるのは render.js）
//   ・光は左上から。黒いふち取りはしない（下の線だけ暗く）
//   ・大きさ：ふつう 幅10〜16・高さ12〜22／大きい敵 幅16〜20・高さ20〜28／ボス 幅24〜36・高さ28〜40
// 作り方：MAKERS[種類] = { fly: 空を飛ぶか, sr: 影の半径（省くと幅から決める）, draw: function (c, f, X, Y) }
//   draw の中では、足もとの中心が (X, Y) になるように描く（Y の行は地面。体はその1つ上の行まで）
'use strict';
var G = window.G = window.G || {};

(function () {
  var DA = G.DotArt, R = DA.R, ell = DA.ell, disc = DA.disc;
  var CW = 60, CH = 64, X = 30, Y = 60;   // 下書き用の大きな canvas と、足もとの位置

  // 下書きから、上下左右の空白を切り落とす（横は体の中心が真ん中に来るよう左右同じだけ残す）
  function finish(s, fly, sr) {
    var d = s.c.getImageData(0, 0, CW, CH).data, x, y, x0 = CW, x1 = -1, y0 = CH, y1 = -1;
    for (y = 0; y < CH; y++) for (x = 0; x < CW; x++) if (d[(y * CW + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { x0 = X; x1 = X; y0 = Y - 1; y1 = Y - 1; }
    var half = Math.max(X - x0, x1 - X + 1), bot = fly ? y1 + 1 : Y;
    var o = DA.mk(half * 2, bot - y0); o.c.drawImage(s.cv, -(X - half), -y0);
    o.cv.nu = true; o.cv.fly = !!fly; o.cv.sr = sr || Math.max(4, Math.round((x1 - x0 + 1) * 0.4));
    return o.cv;
  }
  function flip(cv) {
    var o = DA.mk(cv.width, cv.height); o.c.translate(cv.width, 0); o.c.scale(-1, 1); o.c.drawImage(cv, 0, 0);
    o.cv.nu = true; o.cv.fly = cv.fly; o.cv.sr = cv.sr; return o.cv;
  }
  // 色を明るく／暗くする（色ちがいの敵を作る時に使える）
  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function f(v) { return Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))); }
    return '#' + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1);
  }

  // ================= スライム（テストページの形そのまま） =================
  function slime(c, f, X, Y) {
    var rx = f ? 7 : 6, ry = f ? 4 : 6, cy = Y - ry;
    ell(c, X, cy, rx + 1, ry + 1, '#1f5a1c'); ell(c, X, cy, rx, ry, '#58c048');
    R(c, X - rx + 2, Y - 2 * ry + 2, 2, 2, '#c8f5a0'); R(c, X - rx + 5, Y - 2 * ry + 3, 1, 1, '#c8f5a0');
    R(c, X - 1, cy - 1, 2, 3, '#183010'); R(c, X + 3, cy - 1, 2, 3, '#183010');
    R(c, X - rx, Y - 1, 2 * rx + 1, 1, '#2f7d2a');
  }

  // ================= オーク（テストページの形そのまま。大きい敵） =================
  function orc(c, f, X, Y, P) {
    P = P || {};
    var sk = P.skin || '#5c8a3c', sk2 = P.skin2 || '#6a9a44', bt = P.belt || '#6b4a2a', ar = P.armor || '#8a8f98', eye = P.eye || '#ff5a3a', wp = P.weapon || '#cfd6dc';
    var o = X - 14, t = Y - 24, b = f ? 1 : 0;   // テストページの座標（左上 0,0・足もと 14,24）をそのまま使う
    R(c, o + 10, t + 21, 3, 3, '#4a3a22'); R(c, o + (f ? 16 : 15), t + 21, 3, 3, '#4a3a22');
    R(c, o + 8, t + 11 + b, 12, 10, sk); R(c, o + 8, t + 13 + b, 12, 4, bt); R(c, o + 10, t + 14 + b, 1, 1, wp); R(c, o + 14, t + 14 + b, 1, 1, wp); R(c, o + 17, t + 14 + b, 1, 1, wp);
    R(c, o + 6, t + 11 + b, 3, 3, ar); R(c, o + 19, t + 11 + b, 3, 3, ar);
    ell(c, o + 14, t + 8 + b, 5, 4, sk2); R(c, o + 9, t + 4 + b, 10, 3, ar); R(c, o + 8, t + 2 + b, 2, 3, '#e8e0c0'); R(c, o + 18, t + 2 + b, 2, 3, '#e8e0c0');
    R(c, o + 11, t + 7 + b, 2, 1, eye); R(c, o + 16, t + 7 + b, 2, 1, eye); R(c, o + 12, t + 10 + b, 1, 2, '#f4ecd0'); R(c, o + 16, t + 10 + b, 1, 2, '#f4ecd0');
    R(c, o + 22, t + 8 + b, 1, 14, '#8a5a2a'); R(c, o + 23, t + 7 + b, 4, 6, wp); R(c, o + 23, t + 7 + b, 1, 6, '#fff');
    // 右の影（体と頭の右はしを少し暗く）
    R(c, o + 18, t + 11 + b, 2, 10, 'rgba(0,0,0,.18)');
  }

  // ================= コウモリ（テストページの形そのまま。空を飛ぶ） =================
  function bat(c, f, X, Y, P) {
    P = P || {};
    var body = P.body || '#5a3a7a', wing = P.wing || '#7a56a0', tip = P.tip || '#4a3066', eye = P.eye || '#ff6a6a', i;
    var o = X - 12, t = Y - 14;
    ell(c, o + 12, t + 9, 2, 3, body);
    for (i = 1; i <= 8; i++) {
      var wy = f ? 8 + Math.round(i * 0.5) : 8 - Math.round(i * 0.75);
      R(c, o + 12 - i, t + wy, 1, 3, i > 5 ? tip : wing); R(c, o + 12 + i, t + wy, 1, 3, i > 5 ? tip : wing);
    }
    R(c, o + 11, t + 5, 1, 2, body); R(c, o + 13, t + 5, 1, 2, body); R(c, o + 11, t + 8, 1, 1, eye); R(c, o + 13, t + 8, 1, 1, eye);
  }

  // ================= ゴブリン（テストページの形そのまま） =================
  function goblin(c, f, X, Y) {
    var o = X - 12, t = Y - 20, l1 = f ? 11 : 10, l2 = f ? 13 : 14;   // テストページの座標（足もとの行＝20）をそのまま使う
    R(c, o + l1, t + 17, 2, 3, '#5a3a1e'); R(c, o + l2, t + 17, 2, 3, '#5a3a1e');
    R(c, o + 9, t + 11, 8, 6, '#8a5a2a'); R(c, o + 9, t + 15, 8, 1, '#4a2f14'); R(c, o + 15, t + 11, 2, 6, '#6e4520');
    ell(c, o + 13, t + 8, 4, 3, '#7cc45a'); R(c, o + 8, t + 7, 2, 2, '#6fb050'); R(c, o + 17, t + 7, 2, 2, '#6fb050');
    R(c, o + 14, t + 7, 2, 1, '#fff27a'); R(c, o + 16, t + 9, 1, 1, '#2a5a1a');
    R(c, o + 18, t + 12, 1, 5, '#cfd6dc');
  }

  // ================= ウルフ（テストページの形そのまま） =================
  function wolf(c, f, X, Y) {
    var o = X - 12, t = Y - 20, a = f ? [6, 10, 15, 19] : [8, 12, 13, 17], i;
    ell(c, o + 11, t + 13, 8, 3, '#8b909a'); R(c, o + 5, t + 15, 12, 1, '#6a6f78');
    ell(c, o + 19, t + 11, 3, 3, '#9aa0aa'); R(c, o + 21, t + 12, 4, 2, '#7a808a'); R(c, o + 24, t + 12, 1, 1, '#222');
    R(c, o + 18, t + 7, 2, 3, '#6a6f78'); R(c, o + 20, t + 10, 1, 1, '#ff4a3a');
    R(c, o + 2, t + 10, 4, 2, '#8b909a'); R(c, o + 1, t + 9, 2, 2, '#8b909a');
    for (i = 0; i < 4; i++) R(c, o + a[i], t + 16, 2, f && i % 2 ? 3 : 4, '#6a6f78');
  }

  // ================= ガイコツ（白い骨と剣） =================
  function skeleton(c, f, X, Y) {
    var bn = '#e8e2d0', sh = '#b5ad98', dk = '#7a735f', hole = '#2a2420', bl = '#cfd6dc', hilt = '#8a5a2a';
    var b = f ? 1 : 0, y = Y - b, i;
    // 足（2コマで前後に開く。地面の行はいちばん暗い骨の色）
    var a = f ? X - 2 : X - 3, d = f ? X + 2 : X + 1;
    R(c, a, Y - 6, 1, 5, bn); R(c, a, Y - 1, 2, 1, sh);
    R(c, d, Y - 6, 1, 5, sh); R(c, d, Y - 1, 2, 1, dk);
    // ほね盤と背骨
    R(c, X - 3, y - 8, 6, 2, bn); R(c, X - 3, y - 8, 1, 2, '#fffaf0'); R(c, X + 2, y - 8, 1, 2, sh);
    R(c, X - 1, y - 14, 2, 6, sh);
    // あばら骨（3本）
    for (i = 0; i < 3; i++) { R(c, X - 3, y - 14 + i * 2, 6, 1, bn); R(c, X - 3, y - 14 + i * 2, 1, 1, '#fffaf0'); R(c, X + 2, y - 14 + i * 2, 1, 1, sh); }
    // うしろの腕と、剣をもつ手前の腕
    R(c, X - 5, y - 14, 1, 5, sh); R(c, X - 5, y - 9, 1, 1, dk);
    R(c, X + 3, y - 14, 1, 5, bn);
    R(c, X + 3, y - 9, 3, 1, bn);
    // 剣（刃は左がわを明るく、つばは茶色）
    R(c, X + 5, y - 20, 1, 10, bl); R(c, X + 5, y - 20, 1, 2, '#ffffff'); R(c, X + 4, y - 10, 3, 1, hilt); R(c, X + 5, y - 8, 1, 1, hilt);
    // 頭がい骨（右向き。目のあなは前によせる）
    R(c, X - 3, y - 20, 6, 5, bn); R(c, X - 2, y - 21, 4, 1, bn); R(c, X - 3, y - 20, 1, 5, '#fffaf0'); R(c, X + 2, y - 20, 1, 5, sh);
    R(c, X - 1, y - 19, 2, 2, hole); R(c, X + 2, y - 19, 1, 2, hole);
    R(c, X - 2, y - 15, 4, 1, sh); R(c, X, y - 15, 1, 1, dk); R(c, X + 2, y - 15, 1, 1, dk);
  }

  // ================= ゴブリン呪術師（紫のずきんと光る杖） =================
  function shaman(c, f, X, Y) {
    var rb = '#5a3a8a', hi = '#7a5aaa', dk = '#3a2460', sk = '#8bc34a', sk2 = '#6ba03a', br = '#4b3621';
    var b = f ? 1 : 0, y = Y - b, j, w;
    // 足（ローブのすそから出る）
    R(c, X - 3 + b, Y - 1, 2, 1, br); R(c, X + 1 - b, Y - 1, 2, 1, br);
    // ローブ（上は細く、下に広がる。左はハイライト、右は影、いちばん下は暗い）
    for (j = 0; j < 10; j++) {
      w = 6 + (j > 4 ? 2 : 0) + (j > 7 ? 2 : 0);
      var x0 = X - (w >> 1);
      R(c, x0, y - 11 + j + (j > 6 ? b : 0) * 0, w, 1, rb); R(c, x0, y - 11 + j, 1, 1, hi); R(c, x0 + w - 2, y - 11 + j, 2, 1, dk);
    }
    R(c, X - 5, Y - 2, 10, 1, dk);
    // ずきんと顔（右向き）
    R(c, X - 3, y - 17, 6, 2, rb); R(c, X - 1, y - 18, 3, 1, rb); R(c, X - 5, y - 16, 2, 1, rb); R(c, X - 3, y - 17, 6, 1, hi);
    R(c, X - 3, y - 15, 2, 4, rb); R(c, X - 3, y - 15, 1, 4, hi); R(c, X + 2, y - 15, 1, 1, rb);
    R(c, X - 1, y - 15, 4, 3, sk); R(c, X + 3, y - 14, 1, 1, sk); R(c, X + 2, y - 13, 1, 1, sk2); R(c, X, y - 14, 1, 1, '#ffe14d');
    R(c, X - 1, y - 12, 4, 1, sk2);
    // 杖（先に光る玉。2コマ目は玉が明るく、火花がでる）
    R(c, X + 5, Y - 17, 1, 16, '#7a5230'); R(c, X + 5, Y - 17, 1, 1, '#a07848');
    R(c, X + 3, y - 10, 3, 2, rb); R(c, X + 5, y - 9, 1, 1, sk);
    R(c, X + 4, Y - 20, 3, 3, f ? '#bfffb0' : '#7fe06a'); R(c, X + 5, Y - 21, 1, 1, f ? '#ffffff' : '#bfffb0'); R(c, X + 4, Y - 20, 1, 1, '#ffffff');
    if (f) { R(c, X + 3, Y - 22, 1, 1, '#bfffb0'); R(c, X + 7, Y - 19, 1, 1, '#bfffb0'); }
  }

  // ================= 火トカゲ（赤い体としっぽの炎） =================
  function salamander(c, f, X, Y) {
    var rd = '#d94a2a', hi = '#f26a44', dk = '#8a2a1a', bl = '#ffb347', fl = '#ff8a2a', fy = '#ffd84a';
    var b = f ? 1 : 0, y = Y - b;
    // 足（2コマで前後に動く）
    R(c, X - 5 + b, Y - 3, 2, 3, dk); R(c, X - 1 - b, Y - 3, 2, 3, dk); R(c, X + 1 + b, Y - 3, 2, 3, dk);
    // しっぽ（細くなって左へのびる）と先の炎
    R(c, X - 8, y - 6, 3, 2, rd); R(c, X - 8, y - 6, 3, 1, hi); R(c, X - 8, y - 5, 1, 1, dk);
    R(c, X - 8, y - 9 - b, 1, 3, fl); R(c, X - 7, y - 8, 1, 2, fy); R(c, X - 9 + 1, y - 8 + b, 0, 0, fl);
    // 胴（平たい楕円。左上がハイライト、おなかは黄色っぽく、下は暗い線）
    ell(c, X - 1, y - 6, 5, 3, rd); ell(c, X - 2, y - 7, 3, 1, hi); R(c, X - 4, y - 4, 8, 1, bl); R(c, X - 5, y - 3, 10, 1, dk);
    R(c, X - 3, y - 10, 1, 1, dk); R(c, X, y - 10, 1, 1, dk); R(c, X + 2, y - 10, 1, 1, dk);   // せなかのとげ
    // 頭（右向き。のびた口と、黄色い目）
    ell(c, X + 5, y - 7, 2, 2, rd); R(c, X + 4, y - 9, 2, 1, hi); R(c, X + 5, y - 6, 3, 1, dk); R(c, X + 5, y - 8, 1, 1, '#ffe14d'); R(c, X + 7, y - 8, 1, 1, rd);
  }

  // ================= イエティ（白い毛の大きな体。大きい敵） =================
  function yeti(c, f, X, Y) {
    var fur = '#e8eef5', hi = '#ffffff', sh = '#93a5bd', ch = '#cdd9e8', dk = '#5f7089', eye = '#4ea8ff';
    var b = f ? 1 : 0, y = Y - b;
    // 足（片方ずつ上がる。足の裏の行は暗い青）
    R(c, X - 5, Y - 5, 4, f ? 4 : 5, fur); R(c, X - 5, Y - (f ? 2 : 1), 4, 1, dk); R(c, X - 5, Y - 5, 1, f ? 3 : 4, hi);
    R(c, X + 1, Y - 5, 4, f ? 5 : 4, sh); R(c, X + 1, Y - (f ? 1 : 2), 4, 1, dk);
    // うしろの腕
    R(c, X - 8, y - 17, 3, 8, sh); R(c, X - 8, y - 9, 3, 2, dk);
    // 胴（左上が明るく、右下が影）
    ell(c, X, y - 12, 6, 7, sh); ell(c, X - 1, y - 13, 5, 6, fur); ell(c, X - 3, y - 15, 2, 3, hi); ell(c, X + 1, y - 10, 3, 3, ch);
    R(c, X - 4, y - 6, 8, 1, sh);
    // 手前の腕
    R(c, X + 5, y - 17, 3, 8, fur); R(c, X + 5, y - 17, 1, 7, hi); R(c, X + 7, y - 17, 1, 8, sh); R(c, X + 5, y - 9, 3, 2, dk);
    // 頭（右向き。顔は暗い青）
    ell(c, X + 1, y - 19, 4, 4, fur); ell(c, X, y - 20, 3, 2, hi); R(c, X + 4, y - 18, 1, 3, sh);
    R(c, X + 1, y - 21, 5, 4, dk); R(c, X + 2, y - 20, 1, 1, eye); R(c, X + 4, y - 20, 1, 1, eye);
    R(c, X + 2, y - 18, 3, 1, '#1a2230'); R(c, X + 2, y - 17, 1, 1, '#ffffff'); R(c, X + 4, y - 17, 1, 1, '#ffffff');
    // 頭のてっぺんのけ
    R(c, X - 3, y - 23, 1, 1, fur); R(c, X, y - 24, 2, 1, hi); R(c, X + 3, y - 23, 1, 1, sh);
  }

  // ================= よろいのオーク（重装の騎士。大きい敵）=================
  // orc と同じ体の形（座標も同じ）で、胸当て・かぶと・肩当てをつけた。色は P で変えられる（knight＝鉄＋金、iceknight＝青白いよろい）
  function heavy(c, f, X, Y, P) {
    var A = P.armor, gold = P.trim;
    var o = X - 14, t = Y - 24, b = f ? 1 : 0;
    // 足（2コマで前後に動く）
    R(c, o + 10, t + 21, 3, 3, P.boot); R(c, o + (f ? 16 : 15), t + 21, 3, 3, P.boot);
    // 胸当て：左はハイライト、右は影、いちばん下は暗い線。ふちは飾りの色
    R(c, o + 8, t + 11 + b, 12, 10, A.f); R(c, o + 8, t + 11 + b, 1, 10, A.hi); R(c, o + 17, t + 11 + b, 3, 10, A.s);
    R(c, o + 8, t + 11 + b, 12, 1, gold); R(c, o + 13, t + 12 + b, 1, 5, gold);
    R(c, o + 8, t + 17 + b, 12, 2, P.belt); R(c, o + 13, t + 17 + b, 2, 2, gold);
    R(c, o + 8, t + 20 + b, 12, 1, A.d);
    // 肩当て（左は明るく、右は影。上のふちが飾り）
    R(c, o + 7, t + 10 + b, 4, 4, A.f); R(c, o + 7, t + 10 + b, 1, 4, A.hi); R(c, o + 7, t + 10 + b, 4, 1, gold); R(c, o + 7, t + 13 + b, 4, 1, A.d);
    R(c, o + 18, t + 10 + b, 4, 4, A.s); R(c, o + 18, t + 10 + b, 4, 1, gold); R(c, o + 18, t + 13 + b, 4, 1, A.d);
    // 顔（下半分だけ見える。きば）
    ell(c, o + 14, t + 8 + b, 5, 4, P.skin2); R(c, o + 10, t + 9 + b, 9, 3, P.skin2); R(c, o + 17, t + 9 + b, 2, 3, P.skin);
    R(c, o + 12, t + 10 + b, 1, 2, '#f4ecd0'); R(c, o + 16, t + 10 + b, 1, 2, '#f4ecd0');
    // かぶと：上は明るく、金のふち、目のすき間は暗くして目だけ光らせる
    R(c, o + 10, t + 3 + b, 9, 1, A.hi); R(c, o + 9, t + 4 + b, 11, 2, A.f); R(c, o + 18, t + 4 + b, 2, 2, A.s);
    R(c, o + 9, t + 6 + b, 11, 1, gold); R(c, o + 9, t + 7 + b, 11, 2, A.d);
    R(c, o + 11, t + 7 + b, 2, 1, P.eye); R(c, o + 16, t + 7 + b, 2, 1, P.eye);
    R(c, o + 8, t + 2 + b, 2, 3, '#e8e0c0'); R(c, o + 18, t + 2 + b, 2, 3, '#e8e0c0');   // かぶとの角
    // 武器（右手の大剣。刃の左は白く光る）
    R(c, o + 22, t + 8 + b, 1, 14, '#8a5a2a'); R(c, o + 23, t + 7 + b, 4, 6, P.weapon); R(c, o + 23, t + 7 + b, 1, 6, '#ffffff');
  }
  function knight(c, f, X, Y) {
    heavy(c, f, X, Y, { skin: '#5d7f52', skin2: '#6b8f5c', belt: '#6b4a2a', boot: '#2a2a30', eye: '#ff5a3a', weapon: '#cfd6dc', trim: '#e8c040',
      armor: { f: '#4a4f5c', hi: '#7d8496', s: '#2e323c', d: '#1c1e26' } });
  }
  function iceknight(c, f, X, Y) {   // 雪の上でも見えるよう、よろいは真っ白にせず中くらいの青にして、ふちを濃くする
    heavy(c, f, X, Y, { skin: '#8ab0c8', skin2: '#9cc0d6', belt: '#3e5878', boot: '#34486a', eye: '#7fe0ff', weapon: '#a8d8f0', trim: '#eaf6ff',
      armor: { f: '#6f9cc6', hi: '#d0e8ff', s: '#46668e', d: '#26405e' } });
  }

  // ================= 氷コウモリ（bat の色ちがい。雪の上でも見えるよう体は濃い青） =================
  function icebat(c, f, X, Y) {
    bat(c, f, X, Y, { body: '#2f68a0', wing: '#6eb4e6', tip: '#3f7cb8', eye: '#ffffff' });
  }

  // ================= 大スライム（slime を大きくした。王冠なし。大きい敵） =================
  function kingslime(c, f, X, Y, P) {
    P = P || {};
    var dk = P.dark || '#5a2e80', md = P.mid || '#8a52bc', lt = P.light || '#c9a0ee';
    var rx = f ? 9 : 8, ry = f ? 11 : 12, cy = Y - ry;   // 2コマ目はつぶれて横に広がる
    ell(c, X, cy, rx, ry, dk);                           // 影の色（右と下にだけ少し残る）
    ell(c, X - 1, cy - 1, rx - 1, ry - 1, md);           // 本体（左上にずらして、右下を暗く見せる）
    ell(c, X - 3, cy - ry + 5, 3, 2, lt); R(c, X - 5, cy - ry + 8, 1, 2, lt); R(c, X - 2, cy - ry + 4, 2, 1, '#ffffff');   // 左上のつや
    var ey = cy - 1;                                     // 顔（右よりに目を2つ、すこし怒った口）
    R(c, X - 1, ey, 2, 3, '#1c0e2c'); R(c, X + 3, ey, 2, 3, '#1c0e2c'); R(c, X - 1, ey, 1, 1, '#ffffff'); R(c, X + 3, ey, 1, 1, '#ffffff');
    R(c, X - 1, ey - 2, 3, 1, dk); R(c, X + 3, ey - 2, 3, 1, dk);
    R(c, X, ey + 5, 5, 1, '#1c0e2c'); R(c, X + 1, ey + 6, 3, 1, dk);
  }

  // ================= ハーピー（茶色の翼と人の顔。空を飛ぶ） =================
  function harpy(c, f, X, Y) {
    var w = '#9a6a3a', wh = '#b8864a', wd = '#6a4422', sk = '#f0c49a', sk2 = '#c89a6a', hr = '#5a3a1e', gd = '#e0b040', i;
    // 翼（体の後ろ。1コマ目は上げ、2コマ目は下げる。先のほうは暗く）
    for (i = 0; i < 9; i++) {
      var top = f ? Y - 13 + Math.round(i * 0.9) : Y - 14 - i, h = i < 6 ? 4 : 3;
      R(c, X - 2 - i, top, 1, h, i > 5 ? wd : w); R(c, X - 2 - i, top, 1, 1, i > 5 ? wd : wh);
    }
    // 足（鳥の足。いちばん下の行はかぎづめ）
    R(c, X - 2, Y - 4, 1, 3, gd); R(c, X + 1, Y - 4, 1, 3, gd); R(c, X - 3, Y - 1, 3, 1, '#a07820'); R(c, X, Y - 1, 4, 1, '#a07820');
    // 羽毛のスカート（左はハイライト、右は影、下は暗い線）
    R(c, X - 3, Y - 10, 6, 6, w); R(c, X - 3, Y - 10, 1, 6, wh); R(c, X + 2, Y - 10, 1, 6, wd); R(c, X - 3, Y - 5, 6, 1, wd);
    // 上半身（人の体。右は少し影）
    R(c, X - 2, Y - 14, 5, 4, sk); R(c, X + 2, Y - 14, 1, 4, sk2);
    // 顔と髪（右向き）
    ell(c, X + 1, Y - 18, 3, 3, sk); R(c, X + 4, Y - 18, 1, 1, sk); R(c, X + 3, Y - 19, 1, 1, '#2a1a10'); R(c, X + 3, Y - 16, 1, 1, sk2);
    R(c, X - 2, Y - 22, 6, 2, hr); R(c, X - 4, Y - 20, 3, 4, hr); R(c, X - 3, Y - 16, 2, 2, hr);
  }

  // ================= ワイバーン（緑の翼のある竜。空を飛ぶ・大きい） =================
  function wyvern(c, f, X, Y) {
    var g = '#4a8a3a', hi = '#6aaa52', d = '#2e5a24', wm = '#3a7a30', bl = '#a8d080', bn = '#e0e0d0', yl = '#ffd84a', i, x, t;
    // しっぽ（左にのびて細くなる。2コマ目は少し上がる）
    for (i = 0; i < 6; i++) R(c, X - 6 - i, Y - 12 + (f ? -Math.round(i * 0.25) : Math.round(i * 0.25)), 1, i < 3 ? 3 : i < 5 ? 2 : 1, i < 3 ? g : d);
    // 翼（体の後ろ）。1コマ目は大きく上げ、2コマ目は下にたたむ。前のふちが明るく、骨の線は暗い
    for (x = X - 9; x <= X + 2; x++) {
      t = (x - (X - 9)) / 11;
      var top, bot;
      if (!f) { top = Math.round(Y - 27 + 12 * t); bot = x <= X - 3 ? Math.round(Y - 26 + 13 * (x - (X - 9)) / 6) : Y - 13; if ((x - (X - 9)) % 3 === 1 && x < X - 3) bot -= 1; }
      else { top = Math.round(Y - 5 - 9 * t); bot = top + Math.min(4, 1 + (x - (X - 9))); }
      R(c, x, top, 1, bot - top + 1, wm); R(c, x, top, 1, 1, hi);
      if ((x - (X - 9)) % 4 === 0) R(c, x, top + 1, 1, bot - top, d);
    }
    // 足（かぎづめは白）
    R(c, X - 3, Y - 6, 2, 5, g); R(c, X - 4, Y - 1, 3, 1, bn); R(c, X + 1, Y - 6, 2, 5, wm); R(c, X, Y - 1, 4, 1, bn);
    // 胴：上は明るく、おなかは薄い黄緑、右は影、いちばん下は暗い線
    ell(c, X, Y - 11, 6, 4, g); R(c, X - 4, Y - 14, 5, 1, hi); ell(c, X + 1, Y - 9, 4, 1, bl); R(c, X + 5, Y - 13, 1, 5, d); R(c, X - 4, Y - 7, 9, 1, d);
    // 首と頭（右向き。黄色い目、きば、後ろにそった角）
    R(c, X + 4, Y - 17, 3, 6, g); R(c, X + 4, Y - 17, 1, 6, hi);
    ell(c, X + 7, Y - 18, 3, 2, g); R(c, X + 10, Y - 18, 2, 2, hi); R(c, X + 7, Y - 19, 1, 1, yl); R(c, X + 11, Y - 16, 1, 1, bn);
    R(c, X + 5, Y - 22, 1, 2, bn); R(c, X + 4, Y - 23, 1, 1, bn);
  }

  // ================= 溶岩スライム（大スライムの形。赤黒い体・オレンジの割れ目・黄色い光。大きい敵） =================
  function magma(c, f, X, Y) {
    var rx = f ? 9 : 8, ry = f ? 11 : 12, cy = Y - ry, ey = cy - 1;
    kingslime(c, f, X, Y, { dark: '#3a0e0c', mid: '#8e2a1c', light: '#ff9a4a' });   // 形と顔は大スライムのまま、色だけ赤黒く
    // 割れ目（オレンジ。真ん中はするどく黄色く光る）
    R(c, X - 5, cy + 3, 1, 3, '#ff8a2a'); R(c, X - 4, cy + 5, 2, 1, '#ff8a2a'); R(c, X - 5, cy + 4, 1, 1, '#ffd84a');
    R(c, X + 5, cy - 6, 1, 3, '#ff8a2a'); R(c, X + 4, cy - 4, 1, 1, '#ffd84a'); R(c, X + 3, cy - 8, 2, 1, '#ff8a2a');
    R(c, X - 6, cy - 4, 1, 2, '#ff8a2a'); R(c, X + 2, cy + 6, 1, 2, '#ff8a2a'); R(c, X + 5, cy + 4, 1, 1, '#ffd84a');
    // 目と口は黄色く光らせる
    R(c, X - 1, ey, 2, 3, '#ffe14d'); R(c, X + 3, ey, 2, 3, '#ffe14d'); R(c, X, ey + 1, 1, 2, '#c03a10'); R(c, X + 4, ey + 1, 1, 2, '#c03a10');
    R(c, X, ey + 5, 5, 1, '#ffb040');
    R(c, X - rx + 2, Y - 1, 2 * rx - 3, 1, '#ff6a2a');   // 足もとの行は熱く光る
  }

  // ================= 炎の悪魔（オークの形。赤い肌・黒いよろい・角・オレンジのふち。大きい敵） =================
  function demon(c, f, X, Y) {
    orc(c, f, X, Y, { skin: '#c03a26', skin2: '#d04a30', belt: '#2a1a1c', armor: '#3a2c32', eye: '#ffe14d', weapon: '#ffb040' });
    var o = X - 14, t = Y - 24, b = f ? 1 : 0;
    // 角（黒い。先はオレンジ）：orc の骨色の角を上から塗りつぶして、少し長くする
    R(c, o + 8, t + 2 + b, 2, 3, '#2a1618'); R(c, o + 7, t + b, 2, 2, '#2a1618'); R(c, o + 7, t - 1 + b, 1, 1, '#ff8a2a');
    R(c, o + 18, t + 2 + b, 2, 3, '#2a1618'); R(c, o + 19, t + b, 2, 2, '#2a1618'); R(c, o + 20, t - 1 + b, 1, 1, '#ff8a2a');
    // よろいのオレンジのふち（かぶとの上と肩）と、ベルトのバックル
    R(c, o + 9, t + 4 + b, 10, 1, '#ff8a2a'); R(c, o + 6, t + 11 + b, 3, 1, '#ff8a2a'); R(c, o + 19, t + 11 + b, 3, 1, '#ff8a2a');
    R(c, o + 13, t + 13 + b, 2, 4, '#ff8a2a');
    R(c, o + 8, t + 20 + b, 12, 1, '#6a1810');   // 体の下の線
  }

  // ================= オーガ王（ボス。大きな体に王冠、こん棒）。色は P で変えられる =================
  // P.cape があると赤いマント、P.helm があると鉄のかぶと（ゴブリン将軍用）。P.ears があると尖った耳
  function ogre(c, f, X, Y, P) {
    var b = f ? 1 : 0, y = Y - b, i;
    var A = P.a, G2 = P.gold;
    // 足（片方ずつ上がる。足の裏の行は暗い色）
    R(c, X - 8, Y - 7, 6, f ? 5 : 6, P.boot); R(c, X - 8, Y - (f ? 3 : 2), 6, 1, A.d); R(c, X - 8, Y - 7, 1, f ? 4 : 5, A.boot2);
    R(c, X + 2, Y - 7, 6, f ? 6 : 5, P.boot); R(c, X + 2, Y - (f ? 2 : 3), 6, 1, A.d); R(c, X + 2, Y - 7, 1, f ? 5 : 4, A.boot2);
    R(c, X - 8, Y - 1, 6, f ? 0 : 1, A.d); R(c, X + 2, Y - 1, 6, f ? 1 : 0, A.d);
    // マント（体のうしろ。右向きなので左にたなびく）
    if (P.cape) {
      var w = f ? 1 : 0;
      R(c, X - 10, y - 23, 4, 18, P.cape.f); R(c, X - 14 + w, y - 12, 5, 9, P.cape.f); R(c, X - 10, y - 23, 1, 14, P.cape.hi);
      R(c, X - 14 + w, y - 4, 7, 1, P.cape.d); R(c, X - 9, y - 20, 1, 15, P.cape.d); R(c, X - 13 + w, y - 9, 1, 5, P.cape.d);
    }
    // うしろの腕（左）
    R(c, X - 14, y - 23, 4, 11, A.sh); R(c, X - 14, y - 23, 1, 10, A.f); R(c, X - 15, y - 13, 5, 4, A.sh); R(c, X - 15, y - 10, 5, 1, A.d);
    // 胴（左上が明るく、右下が影）
    ell(c, X, y - 14, 11, 9, A.sh); ell(c, X - 1, y - 15, 10, 8, A.f); ell(c, X - 3, y - 18, 4, 3, A.hi);
    ell(c, X, y - 12, 7, 5, A.belly);
    // 腰布とベルト（いちばん下は暗い線）
    R(c, X - 10, y - 9, 20, 4, P.cloth); R(c, X - 10, y - 9, 20, 1, P.clothHi); R(c, X - 10, y - 6, 20, 1, P.clothD); R(c, X - 2, y - 9, 4, 4, G2.f); R(c, X - 2, y - 9, 4, 1, G2.hi);
    R(c, X + 8, y - 9, 2, 4, 'rgba(0,0,0,.2)');
    // 手前の腕（右）とこん棒
    R(c, X + 10, y - 23, 4, 10, A.f); R(c, X + 10, y - 23, 1, 9, A.hi); R(c, X + 13, y - 23, 1, 10, A.sh); R(c, X + 9, y - 14, 6, 4, A.f); R(c, X + 14, y - 14, 1, 4, A.sh); R(c, X + 9, y - 11, 6, 1, A.d);
    R(c, X + 12, y - 32, 3, 20, P.wood.f); R(c, X + 12, y - 32, 1, 20, P.wood.hi); R(c, X + 14, y - 32, 1, 20, P.wood.d);
    ell(c, X + 13, y - 34, 3, 4, P.wood.f); R(c, X + 11, y - 36, 2, 4, P.wood.hi); R(c, X + 15, y - 35, 1, 4, P.wood.d);
    R(c, X + 10, y - 36, 1, 1, '#c9c9c9'); R(c, X + 16, y - 34, 1, 1, '#c9c9c9'); R(c, X + 13, y - 38, 1, 1, '#c9c9c9');   // こん棒のびょう
    // 頭（右向き）と顔
    if (P.ears) { R(c, X - 9, y - 28, 4, 2, A.f); R(c, X - 10, y - 29, 2, 1, A.f); R(c, X + 8, y - 28, 3, 2, A.sh); R(c, X + 11, y - 29, 1, 1, A.sh); }
    ell(c, X + 1, y - 26, 6, 5, A.sh); ell(c, X, y - 27, 6, 5, A.f); R(c, X - 4, y - 29, 3, 1, A.hi); R(c, X - 5, y - 28, 1, 2, A.hi);
    R(c, X + 1, y - 28, 6, 1, A.d);                                           // まゆ
    R(c, X + 2, y - 27, 2, 2, P.eye); R(c, X + 5, y - 27, 2, 2, P.eye); R(c, X + 2, y - 27, 1, 1, '#ffffff');
    R(c, X - 1, y - 22, 8, 1, A.d); R(c, X + 2, y - 24, 1, 3, P.tusk); R(c, X + 6, y - 24, 1, 3, P.tusk);   // 口ときば
    // 王冠、または鉄のかぶと
    if (P.helm) {
      var H = P.helm;
      R(c, X - 4, y - 33, 9, 1, H.hi); R(c, X - 5, y - 32, 11, 3, H.f); R(c, X - 5, y - 32, 1, 3, H.hi); R(c, X + 4, y - 32, 2, 3, H.s);
      R(c, X - 5, y - 29, 11, 1, H.d); R(c, X + 3, y - 30, 2, 1, H.d);
      R(c, X, y - 37, 2, 4, P.plume.f); R(c, X - 1, y - 36, 1, 3, P.plume.hi); R(c, X + 2, y - 36, 1, 3, P.plume.d);
    } else {
      R(c, X - 4, y - 32, 10, 3, G2.f); R(c, X - 4, y - 32, 10, 1, G2.hi); R(c, X - 4, y - 30, 10, 1, G2.d);
      for (i = 0; i < 4; i++) R(c, X - 4 + i * 3 + (i === 3 ? 1 : 0), y - (i === 1 || i === 2 ? 36 : 35), 2, i === 1 || i === 2 ? 4 : 3, G2.f);
      R(c, X - 4, y - 35, 1, 3, G2.hi);
      R(c, X - 2, y - 31, 1, 1, '#d94a3a'); R(c, X + 1, y - 31, 1, 1, '#3a7bd9'); R(c, X + 4, y - 31, 1, 1, '#d94a3a');
    }
  }
  var OGRE_GOLD = { f: '#e0b840', hi: '#fff0a0', d: '#a07820' };
  function ogreKing(c, f, X, Y) {
    ogre(c, f, X, Y, { boot: '#3b2a1a', cloth: '#7a2a2a', clothHi: '#a04040', clothD: '#4a1818', gold: OGRE_GOLD, eye: '#ffe14d', tusk: '#f4ecd0',
      wood: { f: '#7a5a34', hi: '#9a7a4e', d: '#4a321a' },
      a: { f: '#b0703f', hi: '#d09860', sh: '#7d4a26', d: '#4a2a14', belly: '#c98a55', boot2: '#4a3622' } });
  }
  function goblinlord(c, f, X, Y) {
    ogre(c, f, X, Y, { boot: '#3b2a1a', cloth: '#5a4a2a', clothHi: '#7a6a3a', clothD: '#34280e', gold: OGRE_GOLD, eye: '#fff27a', tusk: '#f4ecd0', ears: true,
      wood: { f: '#7a5a34', hi: '#9a7a4e', d: '#4a321a' },
      cape: { f: '#b02c34', hi: '#d84a52', d: '#6e141c' },
      helm: { f: '#6a727e', hi: '#b0b8c4', s: '#3e444e', d: '#262a32' }, plume: { f: '#c8323a', hi: '#e85a60', d: '#8a1a22' },
      a: { f: '#6e9e34', hi: '#9cc858', sh: '#456e1c', d: '#2a4410', belly: '#a8c870', boot2: '#4a3622' } });
  }

  // ================= リッチ（死霊の王。ぼろぼろの紫のローブ、骨の顔、光る目、宝玉の杖） =================
  function lich(c, f, X, Y) {
    var b = f ? 1 : 0, y = Y - b, j, x, half;
    var md = '#5e3088', hi = '#8a58b8', sh = '#3e1e60', dk = '#220f3a';
    var bone = '#ece4cc', boneS = '#b4ab92', glow = '#7dffb0', wood = '#6a5238', woodHi = '#9a7c58';
    // 杖（右手にもつ。うしろに描く）。てっぺんに光る宝玉
    R(c, X + 11, y - 33, 2, Y - (y - 33), wood); R(c, X + 11, y - 33, 1, Y - (y - 33), woodHi);
    R(c, X + 9, y - 37, 1, 4, wood); R(c, X + 14, y - 37, 1, 4, wood); R(c, X + 10, y - 33, 4, 1, wood);
    disc(c, X + 12, y - 36, 2, '#a860ff'); R(c, X + 11, y - 37, 2, 2, '#f0e0ff'); R(c, X + 14, y - 35, 1, 2, '#6a30c0');
    // ローブ（上は肩はば、下へ広がる。すそはぼろぼろ）
    var ty = y - 26, rows = Y - ty;
    for (j = 0; j < rows; j++) {
      half = 5 + Math.round(j * 0.42);
      for (x = -half; x <= half; x++) {
        if (j >= rows - 3 && ((x + half + j + f * 2) % 4 === 0)) continue;       // すそのやぶれ
        var col = x <= -half + 1 ? hi : x >= half - 3 ? sh : md;
        if (j === rows - 1) col = dk;                                          // 下の線は暗く
        R(c, X + x, ty + j, 1, 1, col);
      }
      if (j % 6 === 4 && j < rows - 3) R(c, X - 2 + (j % 3), ty + j, 1, 3, sh);   // ひだ
    }
    R(c, X - 6, y - 8, 1, 2, dk); R(c, X + 4, y - 11, 1, 2, dk);                  // やぶれ目
    // 胸があいて、あばら骨が見える
    R(c, X, y - 24, 5, 7, '#1a0c28'); R(c, X + 1, y - 23, 3, 1, bone); R(c, X + 1, y - 21, 3, 1, bone); R(c, X + 1, y - 19, 3, 1, boneS); R(c, X + 2, y - 24, 1, 6, boneS);
    // 肩の骨と、杖をもつ右うで・だらりと下がる左うで
    R(c, X - 8, y - 26, 4, 2, bone); R(c, X - 8, y - 25, 4, 1, boneS); R(c, X + 5, y - 26, 4, 2, bone); R(c, X + 5, y - 25, 4, 1, boneS);
    R(c, X + 7, y - 24, 4, 4, md); R(c, X + 9, y - 21, 3, 5, sh); R(c, X + 7, y - 24, 1, 4, hi);
    R(c, X + 10, y - 17, 4, 3, bone); R(c, X + 13, y - 17, 1, 3, boneS);
    R(c, X - 10, y - 24, 3, 8, md); R(c, X - 10, y - 24, 1, 8, hi); R(c, X - 8, y - 22, 1, 6, sh);
    R(c, X - 10, y - 16, 3, 3, bone); R(c, X - 10, y - 13, 1, 2, bone); R(c, X - 8, y - 13, 1, 2, boneS);
    // フードと頭がい骨
    ell(c, X, y - 30, 6, 6, md); R(c, X - 6, y - 30, 2, 5, hi); R(c, X + 4, y - 32, 2, 6, sh);
    R(c, X - 1, y - 37, 3, 2, md); R(c, X + 1, y - 36, 2, 1, sh);
    R(c, X - 8, y - 28, 3, 6, md); R(c, X - 8, y - 28, 1, 5, hi);                 // フードのたれ
    ell(c, X + 2, y - 29, 4, 4, '#1a0c28');
    ell(c, X + 2, y - 29, 3, 3, bone); R(c, X + 4, y - 30, 1, 3, boneS);
    R(c, X, y - 30, 2, 2, glow); R(c, X + 3, y - 30, 2, 2, glow); R(c, X, y - 31, 1, 1, '#d8fff0'); R(c, X + 3, y - 31, 1, 1, '#d8fff0');   // 光る目
    R(c, X + 2, y - 28, 1, 1, '#1a0c28');
    R(c, X, y - 26, 5, 1, bone); R(c, X + 1, y - 26, 1, 1, '#1a0c28'); R(c, X + 3, y - 26, 1, 1, '#1a0c28');   // 歯
  }

  // ================= 魔王（最終ボス。赤黒い大きな体、大きな角、マント、燃える目、炎の剣） =================
  function demonlord(c, f, X, Y) {
    var b = f ? 1 : 0, y = Y - b, i;
    var S = '#a82a2a', Hi = '#dc5a48', Sh = '#701820', D = '#2e0a10';
    var bone = '#ece0c0', boneHi = '#fff8e0', boneD = '#a08c68', gold = '#e0b840';
    var leg = '#5a1418', hoof = '#4a3c3c', hoofHi = '#7a6a66', ln = '#1c1014';
    // 足（ひづめ。片方ずつ上がる）
    R(c, X - 8, Y - 7, 6, f ? 5 : 6, leg); R(c, X - 8, Y - 7, 1, f ? 5 : 6, Sh); R(c, X - 8, Y - (f ? 3 : 2), 6, 2, hoof); R(c, X - 8, Y - (f ? 3 : 2), 6, 1, hoofHi); R(c, X - 8, Y - (f ? 2 : 1), 6, 1, ln);
    R(c, X + 2, Y - 7, 6, f ? 6 : 5, leg); R(c, X + 2, Y - 7, 1, f ? 6 : 5, Sh); R(c, X + 2, Y - (f ? 2 : 3), 6, 2, hoof); R(c, X + 2, Y - (f ? 2 : 3), 6, 1, hoofHi); R(c, X + 2, Y - (f ? 1 : 2), 6, 1, ln);
    // マント（うしろ。左にたなびく。すそはぎざぎざ）
    var cw = f ? 1 : 0, cf = '#6a1c48', ch = '#a8407a', cd = '#340c26';
    R(c, X - 10, y - 25, 4, 19, cf); R(c, X - 14 + cw, y - 14, 5, 10, cf); R(c, X - 10, y - 25, 1, 15, ch); R(c, X - 14 + cw, y - 14, 1, 9, ch);
    R(c, X - 14 + cw, y - 5, 4, 1, cd); R(c, X - 9, y - 6, 3, 1, cd); R(c, X - 13 + cw, y - 8, 1, 4, cd); R(c, X - 9, y - 20, 1, 14, cd);
    R(c, X - 14 + cw, y - 4, 1, 1, cf); R(c, X - 11 + cw, y - 4, 2, 1, cf);
    // うしろの腕（左）。かぎづめ
    R(c, X - 14, y - 24, 4, 11, Sh); R(c, X - 14, y - 24, 1, 10, S); R(c, X - 15, y - 14, 5, 3, Sh); R(c, X - 15, y - 11, 1, 2, bone); R(c, X - 13, y - 11, 1, 2, bone); R(c, X - 11, y - 11, 1, 2, bone);
    // 胴（左上が明るく、右下が影）。むねに燃える割れ目
    ell(c, X, y - 16, 11, 9, Sh); ell(c, X - 1, y - 17, 10, 8, S); ell(c, X - 4, y - 20, 4, 3, Hi);
    ell(c, X, y - 13, 6, 4, '#c0463a');
    R(c, X + 1, y - 20, 1, 3, '#ff9a30'); R(c, X + 2, y - 17, 1, 2, '#ffd860'); R(c, X, y - 15, 1, 2, '#ff9a30');
    R(c, X - 9, y - 9, 18, 3, '#2a0e16'); R(c, X - 9, y - 9, 18, 1, '#4a1a28'); R(c, X - 2, y - 9, 4, 3, gold); R(c, X - 2, y - 9, 4, 1, '#fff0a0'); R(c, X + 7, y - 9, 2, 3, 'rgba(0,0,0,.25)');
    // 手前の腕（右）と炎の剣
    R(c, X + 11, y - 15, 3, 1, gold);
    R(c, X + 11, y - 36, 3, 21, '#e0501c'); R(c, X + 12, y - 36, 1, 21, '#ffd860'); R(c, X + 13, y - 36, 1, 21, '#a03010');
    R(c, X + 12, y - 38, 1, 2, '#ff9a30'); R(c, X + 10, y - 33, 1, 2, '#ff9a30'); R(c, X + 14, y - 28, 1, 2, '#ff9a30'); R(c, X + 10, y - 24, 1, 2, '#ff7a20');
    R(c, X + 10, y - 24, 4, 9, S); R(c, X + 10, y - 24, 1, 9, Hi); R(c, X + 13, y - 24, 1, 9, Sh); R(c, X + 9, y - 16, 6, 4, S); R(c, X + 9, y - 16, 1, 4, Hi); R(c, X + 14, y - 16, 1, 4, Sh); R(c, X + 9, y - 13, 6, 1, D);
    // 頭（右向き）
    ell(c, X + 1, y - 28, 6, 5, Sh); ell(c, X, y - 29, 6, 5, S); R(c, X - 4, y - 31, 3, 1, Hi); R(c, X - 5, y - 30, 1, 2, Hi);
    R(c, X + 1, y - 30, 6, 1, D);
    R(c, X + 1, y - 29, 1, 2, '#ff5a20'); R(c, X + 2, y - 29, 2, 2, '#ffe85a'); R(c, X + 5, y - 29, 2, 2, '#ffe85a'); R(c, X + 2, y - 29, 1, 1, '#ffffff');   // 燃える目
    R(c, X + 3, y - 31, 1, 1, '#ff7a20'); R(c, X + 6, y - 31, 1, 1, '#ff7a20');
    R(c, X - 1, y - 24, 8, 1, D); R(c, X + 1, y - 26, 1, 2, bone); R(c, X + 5, y - 26, 1, 2, bone);   // 口ときば
    // 大きな角（外へ広がって上へのびる。骨の色で、火山の暗い地面でも見える）
    R(c, X - 5, y - 33, 3, 3, bone); R(c, X - 7, y - 36, 3, 3, bone); R(c, X - 9, y - 39, 2, 3, bone);
    R(c, X - 5, y - 33, 1, 3, boneHi); R(c, X - 7, y - 36, 1, 3, boneHi); R(c, X - 3, y - 32, 1, 2, boneD); R(c, X - 5, y - 35, 1, 2, boneD);
    R(c, X + 4, y - 33, 3, 3, bone); R(c, X + 6, y - 36, 3, 3, bone); R(c, X + 8, y - 39, 2, 3, bone);
    R(c, X + 4, y - 33, 1, 3, boneHi); R(c, X + 6, y - 36, 1, 3, boneHi); R(c, X + 6, y - 32, 1, 2, boneD); R(c, X + 8, y - 35, 1, 2, boneD); R(c, X + 9, y - 37, 1, 2, boneD);
  }

  // ================= 霜の巨人（青白い肌、氷のよろいと王冠、白いひげ、氷のこん棒） =================
  function frostgiant(c, f, X, Y) {
    var b = f ? 1 : 0, y = Y - b, i;
    var sk = '#9cc4e4', skHi = '#d2ecfa', skS = '#6892ba', skD = '#3a5a82';
    var ic = '#6cc4ec', icHi = '#e8fbff', icS = '#3a84b4', icD = '#1e4a76';
    var fur = '#6a7484', furHi = '#98a2b2', furD = '#3a4252', bd = '#dcecf8', bdS = '#8ab0d0';
    // 足（毛皮のブーツ。片方ずつ上がる）
    R(c, X - 8, Y - 7, 6, f ? 5 : 6, fur); R(c, X - 8, Y - 7, 6, 1, furHi); R(c, X - 8, Y - (f ? 3 : 2), 6, 1, furD);
    R(c, X + 2, Y - 7, 6, f ? 6 : 5, fur); R(c, X + 2, Y - 7, 6, 1, furHi); R(c, X + 2, Y - (f ? 2 : 3), 6, 1, furD);
    R(c, X - 8, Y - 1, 6, f ? 0 : 1, furD); R(c, X + 2, Y - 1, 6, f ? 1 : 0, furD);
    // うしろの腕（左）
    R(c, X - 14, y - 23, 4, 11, skS); R(c, X - 14, y - 23, 1, 10, sk); R(c, X - 15, y - 13, 5, 4, skS); R(c, X - 15, y - 10, 5, 1, skD);
    // 胴
    ell(c, X, y - 14, 11, 9, skS); ell(c, X - 1, y - 15, 10, 8, sk); ell(c, X - 4, y - 18, 3, 2, skHi);
    // 氷のむね当て
    R(c, X - 6, y - 21, 12, 9, ic); R(c, X - 6, y - 21, 12, 1, icHi); R(c, X - 6, y - 21, 1, 9, icHi); R(c, X + 3, y - 20, 3, 8, icS); R(c, X - 6, y - 13, 12, 1, icD);
    R(c, X - 3, y - 19, 1, 4, icHi); R(c, X - 2, y - 16, 1, 2, icHi); R(c, X + 1, y - 18, 1, 3, icS);
    // 毛皮のこしまきとベルト
    R(c, X - 10, y - 9, 20, 4, fur); R(c, X - 10, y - 9, 20, 1, furHi); R(c, X - 10, y - 6, 20, 1, furD); R(c, X - 2, y - 9, 4, 4, ic); R(c, X - 2, y - 9, 4, 1, icHi); R(c, X + 8, y - 9, 2, 4, 'rgba(0,0,0,.2)');
    // 肩の氷のとげ
    R(c, X - 11, y - 25, 5, 3, ic); R(c, X - 11, y - 25, 5, 1, icHi); R(c, X - 11, y - 22, 5, 1, icD); R(c, X - 10, y - 28, 1, 3, icHi); R(c, X - 8, y - 29, 1, 4, ic);
    R(c, X + 6, y - 25, 5, 3, ic); R(c, X + 6, y - 25, 5, 1, icHi); R(c, X + 9, y - 25, 2, 3, icS); R(c, X + 6, y - 22, 5, 1, icD); R(c, X + 7, y - 28, 1, 3, icHi); R(c, X + 9, y - 29, 1, 4, icS);
    // 手前の腕（右）と氷のこん棒（持ち手は木、先は大きな氷のかたまり）
    R(c, X + 11, y - 21, 3, 3, ic);
    R(c, X + 12, y - 28, 2, 14, '#6a4a2c'); R(c, X + 12, y - 28, 1, 14, '#9a7a4e');
    R(c, X + 10, y - 38, 6, 11, ic); R(c, X + 10, y - 38, 1, 11, icHi); R(c, X + 14, y - 37, 2, 10, icS); R(c, X + 10, y - 28, 6, 1, icD);
    R(c, X + 12, y - 39, 2, 1, icHi); R(c, X + 16, y - 34, 2, 2, ic); R(c, X + 8, y - 33, 2, 2, ic); R(c, X + 12, y - 36, 1, 4, icHi);
    R(c, X + 10, y - 22, 4, 8, sk); R(c, X + 10, y - 22, 1, 8, skHi); R(c, X + 13, y - 22, 1, 8, skS); R(c, X + 9, y - 14, 6, 4, sk); R(c, X + 14, y - 14, 1, 4, skS); R(c, X + 9, y - 11, 6, 1, skD);
    // 頭（右向き）
    R(c, X - 7, y - 30, 4, 7, bd); R(c, X - 7, y - 30, 1, 6, '#ffffff'); R(c, X - 5, y - 24, 2, 2, bdS);          // 長い白髪
    ell(c, X + 1, y - 27, 6, 5, skS); ell(c, X, y - 28, 6, 5, sk); R(c, X - 4, y - 30, 3, 1, skHi); R(c, X - 5, y - 29, 1, 2, skHi);
    R(c, X + 1, y - 29, 6, 1, skD);
    R(c, X + 2, y - 28, 2, 2, '#1c4ad8'); R(c, X + 5, y - 28, 2, 2, '#1c4ad8'); R(c, X + 2, y - 28, 1, 1, '#ffffff'); R(c, X + 5, y - 28, 1, 1, '#ffffff');
    R(c, X + 7, y - 27, 1, 2, skS);
    // ひげ（白く、先に氷のつらら）
    ell(c, X + 2, y - 22, 5, 3, bd); R(c, X - 3, y - 23, 3, 2, bd); R(c, X + 5, y - 21, 2, 2, bdS);
    R(c, X - 2, y - 20, 1, 3, bdS); R(c, X + 1, y - 19, 1, 4, bdS); R(c, X + 4, y - 19, 1, 3, bdS); R(c, X + 1, y - 20, 1, 1, '#ffffff');
    R(c, X + 2, y - 24, 4, 1, '#c8dcee');
    // 氷の王冠
    R(c, X - 4, y - 33, 10, 2, ic); R(c, X - 4, y - 33, 10, 1, icHi); R(c, X + 4, y - 33, 2, 2, icS);
    R(c, X - 3, y - 36, 1, 3, icHi); R(c, X, y - 38, 1, 5, icHi); R(c, X + 1, y - 37, 1, 4, ic); R(c, X + 3, y - 36, 1, 3, ic);
  }

  // ================= スライムキング（王冠をかぶった大きな緑のスライム） =================
  function slimeking(c, f, X, Y) {
    var dk = '#1f5a1c', md = '#58c048', lt = '#c8f5a0', mid2 = '#3e9a38';
    var rx = f ? 15 : 14, ry = f ? 13 : 14, cy = Y - ry, top = cy - ry;   // 2コマ目はつぶれて横に広がる
    ell(c, X, cy, rx, ry, dk);                                            // 影の色（右と下に少し残る）
    ell(c, X - 1, cy - 1, rx - 1, ry - 1, md);                            // 本体（左上にずらす）
    ell(c, X + 4, cy + 4, 7, 5, mid2);                                    // 右下のこい部分（ゼリーの厚み）
    ell(c, X - 7, top + 8, 4, 3, lt); R(c, X - 10, top + 12, 1, 3, lt); R(c, X - 4, top + 5, 3, 1, '#ffffff');   // 左上のつや
    R(c, X - 6, cy + 5, 2, 2, lt); R(c, X + 7, cy + 7, 1, 1, lt); R(c, X + 9, cy - 1, 1, 1, lt);               // ゼリーの中のあわ
    // 顔（右よりに目を2つ、にやりと笑う口）
    var ey = cy - 3;
    R(c, X - 1, ey, 3, 4, '#143010'); R(c, X + 5, ey, 3, 4, '#143010'); R(c, X - 1, ey, 1, 1, '#ffffff'); R(c, X + 5, ey, 1, 1, '#ffffff');
    R(c, X - 2, ey - 2, 4, 1, dk); R(c, X + 5, ey - 2, 4, 1, dk);
    R(c, X, ey + 6, 9, 1, '#143010'); R(c, X - 1, ey + 5, 1, 1, '#143010'); R(c, X + 9, ey + 5, 1, 1, '#143010'); R(c, X + 2, ey + 7, 1, 1, '#f4ecd0'); R(c, X + 6, ey + 7, 1, 1, '#f4ecd0');
    R(c, X - rx + 2, Y - 1, 2 * rx - 3, 1, dk);                           // 下の線
    // 金の王冠（頭のてっぺん。ななめにのっている）
    var g = '#e0b840', gh = '#fff0a0', gd = '#a07820';
    R(c, X - 6, top + 2, 12, 4, g); R(c, X - 6, top + 2, 12, 1, gh); R(c, X - 6, top + 5, 12, 1, gd); R(c, X + 5, top + 2, 1, 4, gd);
    R(c, X - 6, top - 1, 2, 3, g); R(c, X - 2, top - 3, 2, 5, g); R(c, X + 2, top - 3, 2, 5, g); R(c, X + 5, top - 1, 1, 3, g);
    R(c, X - 6, top - 1, 1, 3, gh); R(c, X - 2, top - 3, 1, 4, gh); R(c, X + 2, top - 3, 1, 4, gh);
    R(c, X - 4, top + 3, 1, 2, '#d94a3a'); R(c, X, top + 3, 1, 2, '#3a7bd9'); R(c, X + 3, top + 3, 1, 2, '#d94a3a');
  }

  // ================= 牙の王（王冠と顔に傷のある大きな灰色のオオカミ。右向き） =================
  function wolfking(c, f, X, Y) {
    var b = f ? 1 : 0, y = Y - b, i;
    var fu = '#7a7f88', hi = '#aeb4be', sh = '#50555e', dk = '#2c3038', be = '#b8bcc4', gold = '#e0b840', gh = '#fff0a0', gd = '#a07820';
    // 足（手前の足は明るく、向こう側の足は暗く。ななめの組で動く）
    var a = f ? 2 : -1, bb = f ? -1 : 2;
    R(c, X - 7 + bb, Y - 9, 3, 8, sh); R(c, X - 8 + bb, Y - 2, 4, 1, dk);              // 向こうの後ろ足
    R(c, X + 6 + a, Y - 9, 3, 8, sh); R(c, X + 6 + a, Y - 2, 5, 1, dk);                // 向こうの前足
    // しっぽ（左にたれる）
    var tw = f ? 1 : 0;
    R(c, X - 15, y - 17 + tw, 3, 3, fu); R(c, X - 16, y - 14 + tw, 3, 7, fu); R(c, X - 16, y - 14 + tw, 1, 7, hi); R(c, X - 14, y - 12 + tw, 1, 5, sh); R(c, X - 16, y - 7 + tw, 3, 1, dk);
    // 体
    ell(c, X - 3, y - 16, 13, 7, sh); ell(c, X - 4, y - 17, 12, 7, fu); ell(c, X - 7, y - 21, 6, 2, hi); ell(c, X - 3, y - 12, 8, 2, be);
    R(c, X + 5, y - 20, 2, 8, 'rgba(0,0,0,.14)');
    // 手前の足
    R(c, X - 10 + a, Y - 9, 3, 8, fu); R(c, X - 10 + a, Y - 9, 1, 8, hi); R(c, X - 11 + a, Y - 2, 4, 1, dk); R(c, X - 10 + a, Y - 3, 4, 2, be);
    R(c, X + 3 + bb, Y - 9, 3, 8, fu); R(c, X + 3 + bb, Y - 9, 1, 8, hi); R(c, X + 3 + bb, Y - 2, 5, 1, dk); R(c, X + 3 + bb, Y - 3, 5, 2, be);
    // 首とたてがみ（とげとげ）
    ell(c, X + 5, y - 21, 6, 6, fu); ell(c, X + 4, y - 22, 5, 5, hi);
    R(c, X, y - 27, 2, 3, hi); R(c, X + 2, y - 28, 2, 3, hi); R(c, X - 3, y - 25, 2, 3, hi); R(c, X - 5, y - 22, 2, 3, hi); R(c, X + 3, y - 17, 3, 2, be);
    // 頭：ふくらんだあごと、長い口、耳
    ell(c, X + 9, y - 24, 5, 4, fu); R(c, X + 12, y - 24, 5, 3, fu); R(c, X + 12, y - 25, 5, 1, hi); R(c, X + 11, y - 21, 5, 2, be);
    R(c, X + 16, y - 24, 2, 2, '#1a1a1e'); R(c, X + 12, y - 21, 4, 1, dk);
    R(c, X + 13, y - 21, 1, 2, '#ffffff'); R(c, X + 15, y - 21, 1, 2, '#ffffff');   // きば
    R(c, X + 6, y - 31, 3, 4, fu); R(c, X + 7, y - 33, 1, 2, fu); R(c, X + 6, y - 31, 1, 4, hi); R(c, X + 8, y - 30, 1, 3, sh);   // 耳
    R(c, X + 11, y - 27, 4, 1, dk); R(c, X + 12, y - 26, 2, 2, '#ffd030'); R(c, X + 12, y - 26, 1, 1, '#ffffff');               // まゆと目
    R(c, X + 10, y - 28, 1, 2, '#e8909a'); R(c, X + 11, y - 26, 1, 2, '#e8909a'); R(c, X + 12, y - 24, 1, 3, '#e8909a'); R(c, X + 13, y - 22, 1, 1, '#e8909a');   // 目をよこぎる傷あと
    // 金の王冠（耳のあいだ）
    R(c, X + 7, y - 29, 7, 2, gold); R(c, X + 7, y - 29, 7, 1, gh); R(c, X + 13, y - 29, 1, 2, gd);
    R(c, X + 8, y - 32, 1, 3, gold); R(c, X + 10, y - 33, 1, 4, gold); R(c, X + 12, y - 32, 1, 3, gold); R(c, X + 10, y - 33, 1, 1, gh);
    R(c, X + 9, y - 29, 1, 1, '#d94a3a'); R(c, X + 11, y - 29, 1, 1, '#3a7bd9');
  }

  // ================= ハーピークイーン（王冠と大きな紫の翼の女王。空を飛ぶ） =================
  function harpyqueen(c, f, X, Y) {
    var b = f ? 0 : 1, y = Y - b, i, h, s;
    var wm = '#8a4cc0', wh = '#bc8cec', wd = '#4a2278', wt = '#2e1450';
    var sk = '#f0c49a', sk2 = '#c89a6a', hr = '#2a1450', hr2 = '#4a2a80', gold = '#e0b840', gh = '#fff0a0', gd = '#a07820';
    var gown = '#6a2aa0', gownHi = '#9a58d0', gownD = '#3a1468', sy = y - 20;
    // 大きな翼（左右に広げる。1コマ目は上げ、2コマ目は下げる。ふちは羽根のぎざぎざ、先は暗く）
    for (s = -1; s <= 1; s += 2) for (i = 1; i <= 17; i++) {
      var top = f ? sy - 3 + Math.round(i * 0.3) : sy - 3 - Math.round(i * 0.7);
      h = Math.max(4, 11 - Math.round(i * 0.4)) + (i > 6 && i % 3 === 0 ? 2 : 0);
      var col = i > 13 ? wt : i > 9 ? wd : (s < 0 ? wm : '#7240a8');
      R(c, X + s * i, top, 1, h, col);
      R(c, X + s * i, top, 1, 1, s < 0 ? wh : wm);                                  // 前のふちは明るく
      R(c, X + s * i, top + h - 1, 1, 1, wd);                                       // 後ろのふちは暗く
    }
    // 足（鳥の足。いちばん下の行はかぎづめ）
    R(c, X - 3, y - 6, 1, 5, gold); R(c, X + 2, y - 6, 1, 5, gold); R(c, X - 5, y - 1, 4, 1, gd); R(c, X + 1, y - 1, 5, 1, gd); R(c, X - 3, y - 2, 1, 1, gd);
    // 羽毛のスカート（下はぎざぎざ）
    for (i = -5; i <= 5; i++) R(c, X + i, y - 13, 1, 7 + (i % 2 ? 0 : 1), i < -2 ? gownHi : i > 2 ? gownD : gown);
    // 上半身（ドレス）と金のかざり
    R(c, X - 4, y - 21, 9, 9, gown); R(c, X - 4, y - 21, 1, 9, gownHi); R(c, X + 3, y - 21, 2, 9, gownD);
    R(c, X - 4, y - 14, 9, 1, gold); R(c, X - 1, y - 18, 3, 2, gold); R(c, X - 1, y - 18, 3, 1, gh);
    R(c, X - 1, y - 23, 3, 2, sk); R(c, X + 1, y - 23, 1, 2, sk2);
    // 頭：長い髪が左にながれる
    ell(c, X - 1, y - 26, 5, 5, hr); R(c, X - 9, y - 25, 5, 3, hr); R(c, X - 8, y - 22, 4, 4, hr); R(c, X - 7, y - 19, 2, 3, hr2); R(c, X - 9, y - 25, 5, 1, hr2);
    ell(c, X + 1, y - 26, 3, 4, sk); R(c, X + 4, y - 26, 1, 1, sk); R(c, X + 3, y - 27, 1, 1, '#ff4a4a'); R(c, X + 2, y - 28, 2, 1, hr); R(c, X + 3, y - 24, 1, 1, '#b04a4a'); R(c, X + 3, y - 23, 1, 1, sk2);
    // 金の王冠と宝石
    R(c, X - 3, y - 31, 8, 2, gold); R(c, X - 3, y - 31, 8, 1, gh); R(c, X + 4, y - 31, 1, 2, gd);
    R(c, X - 3, y - 34, 1, 3, gold); R(c, X - 1, y - 35, 1, 4, gold); R(c, X + 1, y - 35, 1, 4, gold); R(c, X + 3, y - 34, 1, 3, gold); R(c, X - 1, y - 35, 1, 1, gh);
    R(c, X - 1, y - 31, 1, 1, '#d94a3a'); R(c, X + 1, y - 31, 1, 1, '#3a7bd9');
  }

  // ================= ボス用の小さな道具（線と、多角形のぬりつぶし） =================
  function line(c, x0, y0, x1, y1, col) {
    var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1, i;
    for (i = 0; i <= n; i++) R(c, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 1, 1, col);
  }
  function poly(c, pts, col) {
    var minY = 1e9, maxY = -1e9, i, j, y, xs, a, b2;
    for (i = 0; i < pts.length; i++) { minY = Math.min(minY, pts[i][1]); maxY = Math.max(maxY, pts[i][1]); }
    for (y = Math.floor(minY); y <= maxY; y++) {
      xs = [];
      for (i = 0; i < pts.length; i++) {
        a = pts[i]; b2 = pts[(i + 1) % pts.length];
        if ((a[1] <= y + 0.5 && b2[1] > y + 0.5) || (b2[1] <= y + 0.5 && a[1] > y + 0.5)) xs.push(a[0] + (y + 0.5 - a[1]) * (b2[0] - a[0]) / (b2[1] - a[1]));
      }
      xs.sort(function (p, q) { return p - q; });
      for (j = 0; j + 1 < xs.length; j += 2) R(c, Math.round(xs[j]), y, Math.round(xs[j + 1]) - Math.round(xs[j]) + 1, 1, col);
    }
  }

  // ================= 氷の騎士団長（青白いよろい、青い羽飾り、大きな盾と氷の剣） =================
  function icecommander(c, f, X, Y) {
    var b = f ? 1 : 0, y = Y - b, j, half, sx = X - 11, top = y - 24;
    var A = '#8fb4d6', Hi = '#dff2ff', Sh = '#5a7ea4', D = '#2e4868';
    var gold = '#e0b840', goldHi = '#fff0a0', cloth = '#2f58a0', clothHi = '#5a8ad0', clothD = '#1c3668';
    var pl = '#4aa8e0', plHi = '#bfeaff', plD = '#2f7ab0';
    // 足（片方ずつ上がる。足の裏の行は暗い色）
    R(c, X - 6, Y - 8, 5, f ? 5 : 6, Sh); R(c, X - 6, Y - 8, 1, f ? 5 : 6, A); R(c, X - 6, Y - (f ? 3 : 2), 5, 1, D); R(c, X - 6, Y - 1, 6, f ? 0 : 1, D);
    R(c, X + 1, Y - 8, 5, f ? 6 : 5, A); R(c, X + 1, Y - 8, 1, f ? 6 : 5, Hi); R(c, X + 5, Y - 8, 1, f ? 6 : 5, Sh); R(c, X + 1, Y - (f ? 2 : 3), 5, 1, D); R(c, X + 1, Y - 1, 6, f ? 1 : 0, D);
    // 青いたれ布（こしから下）とベルト
    R(c, X - 7, y - 12, 14, 5, cloth); R(c, X - 7, y - 12, 1, 5, clothHi); R(c, X + 5, y - 12, 2, 5, clothD); R(c, X - 7, y - 8, 14, 1, clothD);
    R(c, X - 7, y - 13, 14, 1, gold); R(c, X - 1, y - 13, 2, 2, goldHi);
    // 胴（左上が明るく、右が影）。胸に氷の宝石
    R(c, X - 7, y - 25, 14, 12, A); R(c, X - 7, y - 25, 14, 1, Hi); R(c, X - 7, y - 25, 1, 12, Hi); R(c, X + 4, y - 24, 3, 11, Sh); R(c, X - 7, y - 14, 14, 1, D);
    R(c, X - 7, y - 19, 14, 1, Sh); R(c, X - 1, y - 24, 1, 5, Hi);
    R(c, X, y - 23, 2, 3, '#5fd0ff'); R(c, X, y - 23, 1, 1, '#ffffff');
    // 肩あて（氷のとげつき）
    R(c, X - 11, y - 27, 5, 5, A); R(c, X - 11, y - 27, 5, 1, Hi); R(c, X - 11, y - 23, 5, 1, D); R(c, X - 9, y - 30, 1, 3, Hi); R(c, X - 10, y - 29, 1, 2, A);
    R(c, X + 6, y - 27, 5, 5, A); R(c, X + 6, y - 27, 5, 1, Hi); R(c, X + 9, y - 27, 2, 5, Sh); R(c, X + 6, y - 23, 5, 1, D); R(c, X + 8, y - 30, 1, 3, A);
    // 大きな盾（左。ふちは濃い青、まん中に金の十字）
    for (j = 0; j < 17; j++) {
      half = j < 10 ? 5 : Math.max(0, 5 - Math.round((j - 9) * 0.7));
      R(c, sx - half, top + j, half * 2 + 1, 1, D);
      if (half > 1) {
        R(c, sx - half + 1, top + j, half * 2 - 1, 1, '#78b8e8');
        R(c, sx - half + 1, top + j, 1, 1, Hi); R(c, sx + half - 2, top + j, 1, 1, '#4a88b8');
      }
    }
    R(c, sx - 4, top + 1, 9, 1, Hi);
    R(c, sx, top + 3, 1, 9, gold); R(c, sx - 3, top + 6, 7, 1, gold); R(c, sx - 3, top + 6, 3, 1, goldHi);
    // 剣をもつ右うで（金のつば・氷の刃）
    R(c, X + 8, y - 22, 4, 7, A); R(c, X + 8, y - 22, 1, 7, Hi); R(c, X + 11, y - 22, 1, 7, Sh);
    R(c, X + 11, y - 12, 3, 3, '#5a3a22'); R(c, X + 11, y - 9, 3, 1, gold);
    R(c, X + 11, y - 36, 3, 19, '#a8c8e8'); R(c, X + 11, y - 36, 1, 19, '#ffffff'); R(c, X + 13, y - 36, 1, 19, '#6a8cb8'); R(c, X + 12, y - 38, 1, 2, '#ffffff');
    R(c, X + 9, y - 17, 7, 2, gold); R(c, X + 9, y - 17, 7, 1, goldHi);
    R(c, X + 9, y - 15, 5, 3, A); R(c, X + 9, y - 15, 5, 1, Hi); R(c, X + 9, y - 13, 5, 1, D);
    if (f) { R(c, X + 14, y - 30, 1, 1, '#ffffff'); R(c, X + 10, y - 26, 1, 1, '#ffffff'); } else { R(c, X + 14, y - 24, 1, 1, '#ffffff'); R(c, X + 10, y - 31, 1, 1, '#ffffff'); }
    // かぶと（右向き。目の細いすき間は水色に光る）
    R(c, X - 4, y - 33, 9, 8, A); R(c, X - 3, y - 34, 7, 1, Hi); R(c, X - 4, y - 33, 1, 8, Hi); R(c, X + 3, y - 33, 2, 8, Sh); R(c, X - 4, y - 26, 9, 1, D);
    R(c, X - 1, y - 30, 6, 2, '#16202c'); R(c, X + 1, y - 30, 3, 1, '#5fd0ff'); R(c, X, y - 28, 5, 1, Sh); R(c, X + 2, y - 28, 1, 1, D);
    // 青い羽飾り（うしろへなびく）
    var w = f ? 1 : 0;
    R(c, X - 1, y - 37, 3, 3, pl); R(c, X - 1, y - 37, 3, 1, plHi); R(c, X - 4, y - 36 + w, 3, 3, pl); R(c, X - 4, y - 36 + w, 3, 1, plHi);
    R(c, X - 7, y - 34 + w, 3, 3, pl); R(c, X - 7, y - 34 + w, 3, 1, plHi); R(c, X - 8, y - 32 + w, 2, 3, plD);
  }

  // ================= 吹雪の魔女（とんがり帽子・長い白髪・氷のつえ。まわりに吹雪の輪） =================
  function blizzardwitch(c, f, X, Y) {
    var b = f ? 1 : 0, y = Y - b, j, i, a, half, x, cx, w, hw, ty = y - 19, rows = Y - ty;
    var rb = '#4a78c0', rh = '#86b4f0', rs = '#2c4a8a', rd = '#1a2e5a', band = '#cfe8ff';
    var hat = '#34469a', hatH = '#5a70c8', hatD = '#1e2a62';
    var hair = '#f4f8ff', hairS = '#a8bedc', skin = '#f6dcc8', skin2 = '#cfa48e', wood = '#7a5a3a', woodH = '#a88458';
    var ice = f ? '#bfeeff' : '#6fd0ff', iceH = '#ffffff', iceS = '#2f94d0';
    // 吹雪の輪（うしろ半分と手前半分。2コマ目で少し回る）
    function ring(back) {
      for (i = 0; i < 14; i++) {
        a = i * Math.PI / 7 + (f ? 0.45 : 0);
        if ((Math.sin(a) < 0) !== back) continue;
        R(c, X + Math.round(Math.cos(a) * 12), Y - 8 + Math.round(Math.sin(a) * 4) - (i % 3 === 0 ? 3 : 0), i % 2 ? 1 : 2, 1, i % 3 === 0 ? '#ffffff' : '#9fdcff');
      }
    }
    ring(true);
    // つえ（地面に立てる。てっぺんに氷の結晶）
    R(c, X + 8, y - 33, 2, Y - (y - 33), wood); R(c, X + 8, y - 33, 1, Y - (y - 33), woodH);
    R(c, X + 9, y - 39, 1, 1, iceH); R(c, X + 8, y - 38, 3, 1, ice); R(c, X + 7, y - 37, 5, 3, ice); R(c, X + 8, y - 34, 3, 1, iceS); R(c, X + 9, y - 33, 1, 1, iceS);
    R(c, X + 8, y - 37, 1, 2, iceH); R(c, X + 11, y - 36, 1, 2, iceS);
    // ローブ（上は細く、下へ広がる。すそはぎざぎざ。左は明るく右は影）
    for (j = 0; j < rows; j++) {
      half = 3 + Math.round(j * 0.32);
      for (x = -half; x <= half; x++) {
        if (j === rows - 1 && ((x + half + f) % 3 === 0)) continue;
        R(c, X + x, ty + j, 1, 1, j === rows - 1 ? rd : j === rows - 3 ? band : x <= -half + 1 ? rh : x >= half - 2 ? rs : rb);
      }
    }
    R(c, X - 3, ty + 5, 7, 1, band); R(c, X, ty + 6, 1, rows - 10, band);
    // うで（うしろ）と、つえをにぎる手前の手
    R(c, X - 6, ty, 2, 8, rb); R(c, X - 6, ty, 1, 8, rh);
    R(c, X + 3, ty, 4, 3, rb); R(c, X + 3, ty, 4, 1, rh); R(c, X + 6, ty + 1, 2, 4, rs); R(c, X + 7, ty + 3, 2, 2, skin);
    // 長い白髪（左へ流れる。下に影の色）と顔
    w = f ? 1 : 0;
    R(c, X - 4, y - 28, 9, 3, hair); R(c, X - 5, y - 25, 4, 13, hair); R(c, X - 5, y - 25, 1, 12, '#ffffff'); R(c, X - 2, y - 24, 1, 10, hairS);
    R(c, X - 6 + w, y - 14, 3, 2, hairS); R(c, X - 5, y - 12, 4, 1, hairS);
    R(c, X - 1, y - 25, 5, 6, skin); R(c, X + 4, y - 22, 1, 1, skin); R(c, X, y - 19, 3, 1, skin2); R(c, X + 3, y - 20, 1, 1, '#d94a6a');
    R(c, X + 2, y - 23, 1, 1, '#2a4a8a'); R(c, X + 3, y - 23, 1, 1, '#9ad0ff');
    // とんがり帽子（先は後ろへ曲がる）。つばと、銀の帯
    R(c, X - 7, y - 28, 15, 2, hat); R(c, X - 7, y - 28, 15, 1, hatH); R(c, X - 7, y - 27, 15, 1, hatD);
    for (j = 0; j < 10; j++) {
      hw = Math.max(1, 9 - j); cx = X - Math.round(j * 0.3) - (j > 7 ? 1 : 0);
      R(c, cx - (hw >> 1), y - 29 - j, hw, 1, hat); R(c, cx - (hw >> 1), y - 29 - j, 1, 1, hatH); if (hw > 2) R(c, cx - (hw >> 1) + hw - 1, y - 29 - j, 1, 1, hatD);
    }
    R(c, X - 3, y - 30, 7, 1, band); R(c, X - 1, y - 33, 1, 1, '#ffffff'); R(c, X + 1, y - 36, 1, 1, '#ffffff');
    ring(false);
  }

  // ================= 炎の将軍（赤黒いよろい、骨の角のかぶと、燃える剣。ラスボス級） =================
  function flamegeneral(c, f, X, Y) {
    var b = f ? 1 : 0, y = Y - b, w = f ? 1 : 0;
    var A = '#a02a24', Hi = '#e0663e', Sh = '#641816', D = '#2e0a10', og = '#ff9a30', gold = '#e0b840', goldHi = '#fff0a0';
    var bone = '#ece0c0', boneHi = '#fff8e8', boneD = '#a08c68', cf = '#701420', ch = '#a83040', cd = '#3a0a12';
    // 足（片方ずつ上がる）
    R(c, X - 8, Y - 8, 6, f ? 5 : 6, Sh); R(c, X - 8, Y - 8, 1, f ? 5 : 6, A); R(c, X - 8, Y - (f ? 3 : 2), 6, 1, D); R(c, X - 8, Y - 1, 7, f ? 0 : 1, D);
    R(c, X + 2, Y - 8, 6, f ? 6 : 5, A); R(c, X + 2, Y - 8, 1, f ? 6 : 5, Hi); R(c, X + 7, Y - 8, 1, f ? 6 : 5, Sh); R(c, X + 2, Y - (f ? 2 : 3), 6, 1, D); R(c, X + 2, Y - 1, 7, f ? 1 : 0, D);
    // マント（左へたなびく。すそはぎざぎざ）
    R(c, X - 11, y - 26, 4, 20, cf); R(c, X - 15 + w, y - 15, 5, 11, cf); R(c, X - 11, y - 26, 1, 16, ch); R(c, X - 15 + w, y - 15, 1, 10, ch);
    R(c, X - 15 + w, y - 5, 5, 1, cd); R(c, X - 10, y - 6, 3, 1, cd); R(c, X - 10, y - 22, 1, 16, cd); R(c, X - 14 + w, y - 4, 2, 1, cf);
    // うしろの腕（左）
    R(c, X - 14, y - 25, 4, 11, Sh); R(c, X - 14, y - 25, 1, 10, A); R(c, X - 15, y - 15, 5, 4, Sh); R(c, X - 15, y - 12, 5, 1, D);
    // 胴（左上が明るく、右が影）。むねの燃える核
    R(c, X - 9, y - 27, 18, 16, A); R(c, X - 8, y - 27, 16, 1, Hi); R(c, X - 9, y - 27, 1, 16, Hi); R(c, X + 6, y - 26, 3, 15, Sh); R(c, X - 9, y - 20, 18, 1, Sh);
    R(c, X - 3, y - 24, 6, 6, D); R(c, X - 2, y - 23, 4, 4, '#ff6a2a'); R(c, X - 1, y - 22, 2, 2, f ? '#fff0a0' : '#ffd84a');
    R(c, X - 7, y - 17, 1, 3, og); R(c, X + 4, y - 16, 1, 2, og); R(c, X - 6, y - 15, 1, 1, '#ffd84a');
    // ベルト・金のバックル・すそ当て
    R(c, X - 9, y - 12, 18, 2, D); R(c, X - 2, y - 12, 4, 2, gold); R(c, X - 2, y - 12, 4, 1, goldHi);
    R(c, X - 9, y - 10, 18, 3, Sh); R(c, X - 9, y - 10, 1, 3, A); R(c, X - 9, y - 8, 18, 1, D);
    // 肩あて（骨のとげ）
    R(c, X - 13, y - 30, 6, 6, A); R(c, X - 13, y - 30, 6, 1, Hi); R(c, X - 13, y - 30, 1, 6, Hi); R(c, X - 13, y - 25, 6, 1, og); R(c, X - 12, y - 33, 1, 3, bone); R(c, X - 10, y - 32, 1, 2, boneD);
    R(c, X + 7, y - 30, 6, 6, A); R(c, X + 7, y - 30, 6, 1, Hi); R(c, X + 11, y - 30, 2, 6, Sh); R(c, X + 7, y - 25, 6, 1, og); R(c, X + 8, y - 33, 1, 3, bone); R(c, X + 10, y - 32, 1, 2, boneD);
    // 燃える剣（まん中が黄色、右が暗い赤）と、炎の舌
    R(c, X + 11, y - 36, 3, 18, '#e0501c'); R(c, X + 12, y - 36, 1, 18, '#ffd860'); R(c, X + 13, y - 36, 1, 18, '#a03010');
    if (f) { R(c, X + 11, y - 38, 1, 3, og); R(c, X + 13, y - 39, 1, 3, '#ffd860'); R(c, X + 9, y - 31, 1, 2, og); R(c, X + 14, y - 26, 1, 2, og); R(c, X + 12, y - 40 + 1, 1, 1, '#ffffff'); }
    else { R(c, X + 12, y - 39, 1, 3, og); R(c, X + 10, y - 34, 1, 2, og); R(c, X + 14, y - 31, 1, 2, og); R(c, X + 9, y - 25, 1, 1, '#ffd860'); R(c, X + 11, y - 38, 1, 1, '#ffd860'); }
    // 手前の腕（右）・金のつば・こぶし
    R(c, X + 9, y - 24, 4, 7, A); R(c, X + 9, y - 24, 1, 7, Hi); R(c, X + 12, y - 24, 1, 7, Sh);
    R(c, X + 9, y - 18, 7, 2, gold); R(c, X + 9, y - 18, 7, 1, goldHi);
    R(c, X + 9, y - 16, 6, 4, A); R(c, X + 9, y - 16, 6, 1, Hi); R(c, X + 14, y - 16, 1, 4, Sh); R(c, X + 9, y - 13, 6, 1, D);
    // かぶと（右向き）と光る目
    R(c, X - 5, y - 34, 10, 7, A); R(c, X - 4, y - 35, 8, 1, Hi); R(c, X - 5, y - 34, 1, 7, Hi); R(c, X + 4, y - 34, 2, 7, Sh);
    R(c, X - 1, y - 32, 6, 2, D); R(c, X, y - 32, 2, 1, '#ffe14d'); R(c, X + 3, y - 32, 2, 1, '#ffe14d');
    R(c, X - 4, y - 29, 9, 2, Sh); R(c, X - 1, y - 29, 1, 1, D); R(c, X + 1, y - 29, 1, 1, D); R(c, X + 3, y - 29, 1, 1, D); R(c, X - 4, y - 28, 9, 1, D);
    // 骨の角（外へ広がって上へ）
    R(c, X - 7, y - 35, 2, 3, bone); R(c, X - 9, y - 37, 2, 3, bone); R(c, X - 10, y - 38, 1, 2, boneD); R(c, X - 7, y - 35, 1, 3, boneHi); R(c, X - 9, y - 37, 1, 3, boneHi);
    R(c, X + 5, y - 35, 2, 3, bone); R(c, X + 7, y - 37, 2, 3, bone); R(c, X + 9, y - 38, 1, 2, boneD); R(c, X + 5, y - 35, 1, 3, boneHi); R(c, X + 7, y - 37, 1, 3, boneHi);
  }

  // ================= 火竜（ラスボス。大きな赤い体、こうもりの翼、角。地面を歩く。2コマ目は火をはく） =================
  function dragon(c, f, X, Y) {
    var b = f ? 1 : 0, y = Y - b, i, j, k, p;
    var r = '#c03424', hi = '#f2704c', sh = '#7a1c16', dk = '#3a0c0a', bel = '#f0b050', belS = '#c0802c';
    var bone = '#f0e4c8', boneD = '#a8946c', mem = '#a02a22', memF = '#5e1612', bn = '#e08a5c';
    var wing = f ? [[1, -22], [-3, -32], [-15, -31], [-10, -28], [-16, -25], [-10, -23], [-13, -19], [-7, -20], [-5, -18]]
                 : [[1, -22], [-3, -39], [-13, -37], [-9, -33], [-15, -30], [-10, -27], [-12, -23], [-7, -22], [-5, -20]];
    function pts(dx, dy) { return wing.map(function (q) { return [X + q[0] + dx, y + q[1] + dy]; }); }
    function leg(lx, lift, c1, c2, c3, thigh) {   // 足。planted（lift=0）の足は、いちばん下の行が地面の1つ上
      var fy = Y - 1 - lift, h = fy - (y - 6);
      R(c, lx - 1, y - 6, 4, h, c1); R(c, lx - 1, y - 6, 1, h, c2); R(c, lx + 2, y - 6, 1, h, c3);
      R(c, lx - 2, fy - 1, 6, 1, c1); R(c, lx - 2, fy, 6, 1, dk); R(c, lx - 2, fy, 1, 1, bone); R(c, lx, fy, 1, 1, bone); R(c, lx + 2, fy, 1, 1, bone);
      if (thigh) { ell(c, lx + 1, y - 8, 4, 4, c1); R(c, lx - 3, y - 10, 2, 2, c2); }
    }
    // 向こう側の翼（暗く、少し右うしろ）
    poly(c, pts(3, -1), memF);
    // しっぽ（左へのびて、先は上へ反る。ふりふり動く）
    for (i = 0; i < 8; i++) {
      var th = Math.max(1, 5 - Math.round(i * 0.6)), yy = y - 11 - (i > 3 ? i - 3 : 0) - (i > 3 && f ? 1 : 0);
      R(c, X - 11 - i, yy, 1, th, r); R(c, X - 11 - i, yy, 1, 1, hi); R(c, X - 11 - i, yy + th - 1, 1, 1, sh);
    }
    R(c, X - 18, y - 17 - (f ? 1 : 0), 2, 3, bone); R(c, X - 18, y - 14 - (f ? 1 : 0), 1, 1, boneD);
    // 向こう側の足
    leg(X - 3, f ? 0 : 1, sh, r, dk, false); leg(X + 7, f ? 1 : 0, sh, r, dk, false);
    // 胴（左上が明るく、下は黄色いおなか）
    ell(c, X - 1, y - 13, 11, 7, sh); ell(c, X - 2, y - 14, 10, 6, r); ell(c, X - 5, y - 18, 5, 2, hi);
    ell(c, X + 1, y - 9, 8, 3, bel);
    for (k = 0; k < 4; k++) R(c, X - 5 + k * 3, y - 9, 1, 3, belS);
    R(c, X - 8, y - 6, 17, 1, dk);
    // 手前の足（ふとももがふくらむ）
    leg(X - 8, f ? 1 : 0, r, hi, sh, true); leg(X + 3, f ? 0 : 1, r, hi, sh, true);
    // 首（前のふちは黄色）
    for (j = 0; j < 14; j++) {
      var x0 = X + 8 - Math.round(j * 0.25);
      R(c, x0, y - 27 + j, 6, 1, r); R(c, x0, y - 27 + j, 1, 1, hi); R(c, x0 + 4, y - 27 + j, 2, 1, sh); if (j > 3) R(c, x0 + 5, y - 27 + j, 1, 1, bel);
    }
    // 頭（右向き）：目・まゆ・口。2コマ目は口を開けて火をはく
    R(c, X + 8, y - 32, 8, 6, r); R(c, X + 13, y - 30, 5, 4, r); R(c, X + 9, y - 32, 6, 1, hi); R(c, X + 8, y - 31, 1, 4, hi); R(c, X + 15, y - 31, 1, 4, sh);
    R(c, X + 12, y - 32, 4, 1, dk); R(c, X + 12, y - 31, 2, 1, '#ffe14d'); R(c, X + 12, y - 31, 1, 1, '#ffffff'); R(c, X + 16, y - 30, 1, 1, dk);
    if (f) {
      R(c, X + 12, y - 27, 6, 1, dk); R(c, X + 12, y - 26, 5, 1, sh); R(c, X + 13, y - 27, 1, 1, bone); R(c, X + 15, y - 27, 1, 1, bone);
      R(c, X + 16, y - 29, 2, 2, '#ff8a2a'); R(c, X + 16, y - 29, 1, 1, '#ffe060'); R(c, X + 17, y - 26, 1, 1, '#ff6a2a');
    } else {
      R(c, X + 12, y - 27, 5, 1, sh); R(c, X + 14, y - 27, 1, 1, bone);
    }
    // 角（うしろへそる）
    R(c, X + 8, y - 34, 2, 3, bone); R(c, X + 6, y - 36, 2, 3, bone); R(c, X + 5, y - 37, 1, 2, boneD); R(c, X + 8, y - 34, 1, 3, '#ffffff');
    // せなかのとげ
    for (k = 0; k < 5; k++) { R(c, X - 9 + k * 3, y - 21 - (k % 2), 1, 2, bone); R(c, X - 9 + k * 3, y - 21 - (k % 2), 1, 1, '#ffffff'); }
    // 手前の翼：ふくろ状のまくと、ほねのすじ（つけ根→ひじ→先）
    p = pts(0, 0);
    poly(c, p, mem);
    for (i = 2; i < p.length; i += 2) line(c, p[1][0], p[1][1], p[i][0], p[i][1], bn);
    line(c, p[0][0], p[0][1], p[1][0], p[1][1], bn);
    R(c, p[1][0], p[1][1], 1, 1, '#ffd0a0');
    for (i = 3; i < p.length - 1; i += 2) R(c, p[i][0], p[i][1], 1, 1, memF);
  }

  // ================= 味方の兵士（青い服にかぶとと剣。右向き。コマ1は剣をふり下ろす） =================
  function soldier(c, f, X, Y) {
    var st = '#9aa2ac', i;
    // 足（2コマで前後に開く。足の裏の行は暗い茶色）
    var a = f ? X - 3 : X - 2, d = f ? X + 2 : X + 1;
    R(c, a, Y - 5, 2, 4, '#2a3a78'); R(c, a, Y - 1, 2, 1, '#3a2a1a');
    R(c, d, Y - 5, 2, 4, '#1e2c5e'); R(c, d, Y - 1, 2, 1, '#2a1c10');
    // うしろの腕と盾（左）
    R(c, X - 5, Y - 10, 2, 4, '#c0c8d8'); R(c, X - 5, Y - 10, 1, 4, '#e8ecf4'); R(c, X - 4, Y - 6, 1, 1, '#7a8498');
    // 胴（青い服。左はハイライト、右は影、ベルト）
    R(c, X - 3, Y - 11, 6, 6, '#3a6ad0'); R(c, X - 3, Y - 11, 1, 6, '#5a8af0'); R(c, X + 2, Y - 11, 1, 6, '#2a4a9a');
    R(c, X - 3, Y - 7, 6, 1, '#8a5a2a'); R(c, X - 3, Y - 6, 6, 1, '#26418a');
    // 顔（右向き。目は前よせ）
    R(c, X - 2, Y - 14, 4, 3, '#f0c49a'); R(c, X + 1, Y - 14, 1, 3, '#d0a478'); R(c, X, Y - 13, 1, 1, '#2a1a10');
    // かぶと（上は明るく、下の縁は暗い。てっぺんに赤い房）
    R(c, X - 3, Y - 17, 6, 3, st); R(c, X - 3, Y - 17, 1, 3, '#c0c8d0'); R(c, X + 2, Y - 17, 1, 3, '#6a727c'); R(c, X - 3, Y - 15, 6, 1, '#6a727c');
    R(c, X - 2, Y - 18, 3, 1, '#c0c8d0'); R(c, X, Y - 18, 1, 1, '#d03a30');
    // 剣（コマ0＝上にかまえる／コマ1＝前へふり下ろす）
    R(c, X + 3, Y - 9, 2, 1, '#f0c49a');
    if (!f) { R(c, X + 4, Y - 16, 1, 7, '#e8ecf0'); R(c, X + 4, Y - 16, 1, 2, '#ffffff'); R(c, X + 3, Y - 10, 3, 1, '#8a6a2a'); }
    else { for (i = 0; i < 3; i++) R(c, X + 4 + i, Y - 10 + i, 1, 1, i < 1 ? '#ffffff' : '#e8ecf0'); R(c, X + 4, Y - 11, 1, 3, '#8a6a2a'); }
  }

  // ================= 味方の石の巨人（灰色の石のかたまり・光る目） =================
  function golemUnit(c, f, X, Y) {
    var S = '#9fa3a8', hi = '#c3c7cc', sh = '#6d7177', dk = '#43464b', seam = '#7d8186', eye = '#5fd8ff', gl = '#d8faff';
    var b = f ? 1 : 0, y = Y - b;
    // 足（片方ずつ上がる）。足の裏の行は暗い灰色
    R(c, X - 6, Y - 7, 5, f ? 5 : 6, sh); R(c, X - 6, Y - 7, 1, f ? 4 : 5, S); R(c, X - 6, Y - (f ? 3 : 2), 5, 1, dk);
    R(c, X + 1, Y - 7, 5, f ? 6 : 5, S); R(c, X + 1, Y - 7, 1, f ? 5 : 4, hi); R(c, X + 5, Y - 7, 1, f ? 5 : 4, sh); R(c, X + 1, Y - (f ? 2 : 3), 5, 1, dk);
    R(c, X - 6, Y - 1, 5, f ? 0 : 1, dk); R(c, X + 1, Y - 1, 5, f ? 1 : 0, dk);
    // うしろの腕（左。体と一緒にゆれる）とこぶし
    R(c, X - 9, y - 14 + b, 3, 8, sh); R(c, X - 9, y - 14 + b, 1, 7, S); R(c, X - 10, y - 7 + b, 4, 4, sh); R(c, X - 10, y - 7 + b, 4, 1, S); R(c, X - 10, y - 4 + b, 4, 1, dk);
    // 胴（石のブロック：上の面が明るい、左はハイライト、右は影、下は暗い）
    R(c, X - 5, y - 17, 10, 11, S); R(c, X - 5, y - 17, 10, 1, hi); R(c, X - 5, y - 17, 1, 11, hi); R(c, X + 3, y - 16, 2, 10, sh); R(c, X - 5, y - 7, 10, 1, dk);
    R(c, X - 4, y - 12, 8, 1, seam); R(c, X - 1, y - 16, 1, 4, seam); R(c, X + 1, y - 11, 1, 4, seam);   // 石のつぎ目
    R(c, X - 1, y - 10, 2, 2, eye); R(c, X - 1, y - 10, 1, 1, gl);                                        // 胸の光るしるし
    // 肩の岩
    R(c, X - 8, y - 18, 4, 4, S); R(c, X - 8, y - 18, 4, 1, hi); R(c, X - 8, y - 15, 4, 1, sh);
    R(c, X + 4, y - 18, 4, 4, sh); R(c, X + 4, y - 18, 4, 1, S); R(c, X + 4, y - 15, 4, 1, dk);
    // 手前の腕（右）とこぶし
    R(c, X + 6, y - 14 - b + 1, 3, 8, S); R(c, X + 6, y - 14 + 1 - b, 1, 7, hi); R(c, X + 8, y - 14 + 1 - b, 1, 8, sh); R(c, X + 5, y - 7 + 1 - b, 5, 4, S); R(c, X + 5, y - 7 + 1 - b, 5, 1, hi); R(c, X + 9, y - 7 + 1 - b, 1, 4, sh); R(c, X + 5, y - 4 + 1 - b, 5, 1, dk);
    // 頭（四角い岩。目は青白く光る）
    R(c, X - 3, y - 23, 7, 6, S); R(c, X - 3, y - 24, 7, 1, hi); R(c, X - 3, y - 23, 1, 6, hi); R(c, X + 3, y - 23, 1, 6, sh); R(c, X - 3, y - 18, 7, 1, sh);
    R(c, X - 1, y - 21, 2, 2, eye); R(c, X + 2, y - 21, 2, 2, eye); R(c, X - 1, y - 21, 1, 1, gl); R(c, X + 2, y - 21, 1, 1, gl);
    R(c, X - 1, y - 24, 1, 1, seam);
  }

  // ================= 影の魔術師（warper）：途中で別の道へワープする敵（2026-10-22 追加） =================
  // 深い紫のフードとマント、光る目、手の上でうずを巻く紫の玉。コマ1は体が1ドット上がり、玉が明るくなる
  function warper(c, f, X, Y) {
    var b = f ? 1 : 0, cl = '#4a3670', cl2 = '#33245a', hi = '#7a62b4', dk = '#1e1430';   // 火山の暗い地面でも見えるよう、少し明るめの紫
    R(c, X - 3, Y - 2, 2, 2, dk); R(c, X + 1, Y - 2, 2, 2, dk);                            // 足先
    for (var j = 0; j < 12; j++) {                                                          // マント（下が広い台形）。左は明るく、右は影
      var w = 3 + Math.round(j * 0.35), y = Y - 3 - j - b;
      R(c, X - w, y, w, 1, j % 3 === 0 ? hi : cl); R(c, X, y, w + 1, 1, cl2);
    }
    R(c, X - 7, Y - 3 - b, 15, 1, dk);                                                      // すその暗い線
    R(c, X - 4, Y - 21 - b, 8, 7, cl); R(c, X - 4, Y - 21 - b, 2, 7, hi); R(c, X + 2, Y - 20 - b, 2, 6, cl2);   // フード
    R(c, X - 3, Y - 22 - b, 6, 1, hi); R(c, X - 1, Y - 23 - b, 3, 1, cl);
    R(c, X - 2, Y - 18 - b, 5, 4, '#0e0818');                                               // フードの中の暗い顔
    R(c, X - 1, Y - 17 - b, 1, 1, '#d8a8ff'); R(c, X + 2, Y - 17 - b, 1, 1, '#d8a8ff');      // 光る目
    R(c, X + 3, Y - 12 - b, 3, 2, cl); R(c, X + 5, Y - 13 - b, 1, 1, '#c8a0e0');            // 前に出した手
    var oc = f ? '#e8d0ff' : '#b07aff';                                                      // うずを巻く玉
    DA.disc(c, X + 7, Y - 16 - b, 2, f ? '#9a5aff' : '#6a3ad0'); R(c, X + 6, Y - 17 - b, 2, 1, oc); R(c, X + 8, Y - 15 - b, 1, 1, oc);
    R(c, X + 4, Y - 19 - b, 1, 1, f ? '#ffffff' : '#c79bff'); R(c, X + 10, Y - 14 - b, 1, 1, '#c79bff');
  }

  // ---------- 種類ごとの作り方（ここに描き足していく） ----------
  var MAKERS = {
    warper: { sr: 6, draw: warper },
    slime: { sr: 6, draw: slime },
    orc: { sr: 8, draw: orc },
    bat: { fly: true, sr: 5, draw: bat },
    goblin: { sr: 5, draw: goblin },
    wolf: { sr: 8, draw: wolf },
    skeleton: { sr: 6, draw: skeleton },
    shaman: { sr: 6, draw: shaman },
    salamander: { sr: 7, draw: salamander },
    yeti: { sr: 9, draw: yeti },
    knight: { sr: 9, draw: knight },
    iceknight: { sr: 9, draw: iceknight },
    icebat: { fly: true, sr: 5, draw: icebat },
    kingslime: { sr: 10, draw: kingslime },
    harpy: { fly: true, sr: 7, draw: harpy },
    wyvern: { fly: true, sr: 10, draw: wyvern },
    magma: { sr: 10, draw: magma },
    demon: { sr: 9, draw: demon },
    ogre: { sr: 13, draw: ogreKing },
    goblinlord: { sr: 13, draw: goblinlord },
    lich: { sr: 11, draw: lich },
    demonlord: { sr: 14, draw: demonlord },
    frostgiant: { sr: 14, draw: frostgiant },
    slimeking: { sr: 14, draw: slimeking },
    wolfking: { sr: 14, draw: wolfking },
    harpyqueen: { fly: true, sr: 12, draw: harpyqueen },
    icecommander: { sr: 12, draw: icecommander },
    blizzardwitch: { sr: 11, draw: blizzardwitch },
    flamegeneral: { sr: 13, draw: flamegeneral },
    dragon: { sr: 16, draw: dragon },
    soldier: { sr: 6, draw: soldier },
    golemUnit: { sr: 9, draw: golemUnit }
  };

  G.EnemyArt = {
    MAKERS: MAKERS, finish: finish, flip: flip, shade: shade, CW: CW, CH: CH, X: X, Y: Y,
    // 1体分を作る：[{ r, l }（コマ0）, { r, l }（コマ1）]
    make: function (k) {
      var M = MAKERS[k], out = [];
      for (var f = 0; f < 2; f++) {
        var s = DA.mk(CW, CH); M.draw(s.c, f, X, Y);
        var r = finish(s, M.fly, M.sr); out.push({ r: r, l: flip(r) });
      }
      return out;
    },
    // G.SPR に新しい絵を入れる（古い絵を上書き）
    apply: function (S) { Object.keys(MAKERS).forEach(function (k) { S[k] = G.EnemyArt.make(k); }); }
  };
})();

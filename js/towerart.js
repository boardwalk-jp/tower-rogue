// タワーのドット絵（1マス24×18ドットの疑似3D）。段階②で新しく描いたもの
// きまり（docs/HANDOFF_REDESIGN.md の3章）：
//   ・canvas の下のふち＝足もと（土台の手前の下の線）、横の真ん中＝タワーの中心
//   ・足もとの幅は22ドット以内。光は左上から。黒いふち取りはしない（下の線だけ暗く）
//   ・段階0＝素朴な石・木だけ／段階1＝屋根や鉄の補強が増えて少し高い／段階2＝金の飾りと旗でいちばん高い
//   ・旗の色：段階0＝赤、段階1＝青、段階2＝金
//   ・攻撃中の絵（fire）は、ふだんの絵の1〜3か所だけを変える（形や位置は変えない）
// 作った絵は G.TowerArt.apply(S) で G.SPR に入れる。S[種類][段階][0＝ふだん/1＝攻撃中]、向きがある物は { l, r }
'use strict';
var G = window.G = window.G || {};

(function () {
  var DA = G.DotArt, R = DA.R, ell = DA.ell, box = DA.box, cyl = DA.cyl;
  var TD = 18, HU = 16;
  function ds(v) { return Math.max(1, Math.round(v * TD / 18)); }   // 奥行きの長さ（今は1倍）
  function hs(v) { return Math.max(1, Math.round(v * HU / 16)); }   // 高さの長さ（今は1倍）

  // ---------- 色（上の面 t・手前の面 f・右の影 s・左のハイライト hi・下の線 d・石のすき間 m） ----------
  var P = {
    stone:  { t: '#b3aea2', f: '#87827a', s: '#66625b', hi: '#cdc8bc', d: '#42403b', m: '#726d65' },
    rock:   { t: '#807d78', f: '#5f5c58', s: '#43413e', hi: '#9d9a94', d: '#262523', m: '#4f4c48' },
    bluest: { t: '#93a0ad', f: '#6b7783', s: '#4d5864', hi: '#b8c5d2', d: '#2b323b', m: '#5a6571' },
    redst:  { t: '#7a5249', f: '#573a34', s: '#3e2925', hi: '#946a5e', d: '#21140f', m: '#48302b' },
    iron:   { t: '#4d4f5c', f: '#3a3c48', s: '#2a2c36', hi: '#6c7080', d: '#16171e', m: '#30323c' },
    metal:  { t: '#a6b6c3', f: '#7586a0', s: '#52607a', hi: '#cddbe8', d: '#2a3340', m: '#64738c' },
    copper: { t: '#e6a757', f: '#bb7636', s: '#8a5526', hi: '#f6c783', d: '#5a3517', m: '#a0662e' },
    wood:   { t: '#c4915a', f: '#946a3c', s: '#704c2a', hi: '#d8a870', d: '#4a331b', m: '#7c5630' },
    wood2:  { t: '#d0a068', f: '#a67a48', s: '#7c5a32', hi: '#e2b884', d: '#523a20', m: '#8a6438' },
    gold:   { t: '#f6dc7a', f: '#e8c040', s: '#b8902a', hi: '#fff0b0', d: '#7a5a14', m: '#d0a838' }
  };
  var FLAG = ['#d94a3a', '#3a7bd9', '#e8c040'];
  var GOLD = '#e8c040', GOLD_HI = '#fff0b0', GOLD_D = '#a87e20';

  // ---------- 下書き用の大きな canvas を用意し、最後に上の空白を切り落とす ----------
  var CW = 24, CH = 72, BY = CH;          // 足もとの線は canvas のいちばん下の行（BY-1）
  function sheet() { return DA.mk(CW, CH); }
  // 上の透明な行を切り落として、下のふち＝足もとのまま返す
  function trim(s) {
    var d = s.c.getImageData(0, 0, CW, CH).data, top = CH - 1, x, y;
    for (y = 0; y < CH; y++) { for (x = 0; x < CW; x++) if (d[(y * CW + x) * 4 + 3]) break; if (x < CW) { top = y; break; } }
    var o = DA.mk(CW, CH - top); o.c.drawImage(s.cv, 0, -top); o.cv.nu = true;   // nu：新しい24×18の絵のしるし（render.js が足もとの位置を変える）
    return o.cv;
  }
  function flip(cv) {   // 左右反転（左向きを作る）
    var o = DA.mk(cv.width, cv.height); o.c.translate(cv.width, 0); o.c.scale(-1, 1); o.c.drawImage(cv, 0, 0); o.cv.nu = true; return o.cv;
  }

  // ---------- 共通の部品 ----------
  // 台を1つ積む：cy＝下の台の上の面のまん中の高さ。描いた台の上の面のまん中の高さを返す
  function slab(c, cx, cy, w, dp, hh, Pl) { box(c, cx, cy + (dp >> 1), w, dp, hh, Pl); return cy - hh; }
  // 最初の土台（足もとの線が canvas の下にそろう）
  function base(c, cx, w, dp, hh, Pl) { box(c, cx, BY, w, dp, hh, Pl); return BY - hh - (dp >> 1) - 1; }

  // 石積みの模様（手前の面に、段ごとにずらした目地を入れる）
  function masonry(c, cx, by, w, hh, Pl, step) {
    var x0 = cx - (w >> 1), sh = step || 3, r, k = 0;
    for (r = by - 1 - sh; r > by - hh; r -= sh, k++) {
      R(c, x0 + 1, r, w - 2, 1, Pl.m);
      for (var x = x0 + 2 + (k & 1) * 3; x < x0 + w - 2; x += 6) R(c, x, r - sh + 1, 1, sh - 1, Pl.m);
    }
  }
  // 板の模様（木の手前の面に横の線）
  function planks(c, cx, by, w, hh, Pl, step) {
    var x0 = cx - (w >> 1);
    for (var r = by - 1 - (step || 4); r > by - hh; r -= (step || 4)) R(c, x0 + 1, r, w - 2, 1, Pl.d);
  }
  // 横に巻いた帯（鉄の補強・金の飾り）
  function band(c, cx, y, w, col, hiCol) { var x0 = cx - (w >> 1); R(c, x0, y, w, 1, col); if (hiCol) R(c, x0, y, 1, 1, hiCol); }
  // 金のびょう（点を並べる）
  function rivets(c, cx, y, w, gap) { for (var x = cx - (w >> 1) + 2; x < cx + (w >> 1) - 1; x += gap || 4) R(c, x, y, 1, 1, GOLD); }
  // 屋根（四角すい・円すい）：上がとがり、左半分は明るく右半分は影、いちばん下はのき（暗い線）
  function roof(c, cx, by, hw, h, Pr) {
    for (var j = 0; j < h; j++) {
      var half = Math.max(0, Math.round(hw * (j + 1) / h)), y = by - h + j;
      R(c, cx - half, y, half + 1, 1, Pr.l); R(c, cx + 1, y, half, 1, Pr.s);
      if (j > 0 && j % 2 === 0 && j < h - 1) R(c, cx - half, y, 1, 1, Pr.hi);
      if (j === h - 1) { R(c, cx - half, y, half * 2 + 1, 1, Pr.d); R(c, cx - half, y - 1, 1, 1, Pr.hi); }
    }
    return by - h;   // とがった先の高さ
  }
  // 旗：x＝さおの位置、y＝さおの根もと、h＝さおの長さ。lv で色が変わる（段階2は金の玉つき）
  function flag(c, x, y, h, lv, left) {
    var col = FLAG[lv], dk = lv === 2 ? '#b8902a' : lv === 1 ? '#2a5aa8' : '#a8302a', s = left ? -1 : 1;
    R(c, x, y - h, 1, h, '#5b4632');
    var fx = left ? x - 5 : x + 1;
    R(c, fx, y - h + 1, 5, 3, col); R(c, fx, y - h + 3, 5, 1, dk);
    R(c, left ? fx : fx + 4, y - h + 4, 1, 1, dk);                 // 布のはしが少し垂れる
    R(c, fx + (left ? 4 : 0), y - h + 1, 1, 1, lv === 2 ? GOLD_HI : 'rgba(255,255,255,.35)');
    if (lv === 2) R(c, x, y - h - 1, 1, 1, GOLD_HI);
    return s;
  }
  // 垂れ幕（手前の面に下げる布）
  function banner(c, cx, y, w, h, col, trim) {
    var x0 = cx - (w >> 1);
    R(c, x0, y, w, h, col); R(c, x0, y, w, 1, trim); R(c, x0 + w - 1, y + 1, 1, h - 1, 'rgba(0,0,0,.25)');
    R(c, cx, y + 2, 1, 2, trim);
    c.clearRect(cx, y + h - 1, 1, 1);
  }

  // ================= 弓兵の塔（archer）：石の土台・木のやぐら・弓兵。段階1から屋根 =================
  function archerMan(c, cx, cy, fire) {   // 台の上に立つ弓兵（cy＝足もと）
    R(c, cx - 2, cy - 5, 5, 5, '#3f7a3a'); R(c, cx + 1, cy - 5, 2, 5, '#2d5a2a'); R(c, cx - 2, cy - 1, 5, 1, '#24461f');
    R(c, cx - 1, cy - 8, 3, 3, '#f0c8a0'); R(c, cx + 1, cy - 8, 1, 3, '#c89870');
    R(c, cx - 2, cy - 10, 5, 2, '#3f7a3a'); R(c, cx - 2, cy - 10, 1, 1, '#5a9a4a');   // 緑のずきん
    // 弓（右手）：ふだんは弦がまっすぐ、攻撃中は弦を引いて矢をつがえる
    R(c, cx + 4, cy - 10, 1, 1, '#8a5a2a'); R(c, cx + 5, cy - 9, 1, 6, '#8a5a2a'); R(c, cx + 4, cy - 3, 1, 1, '#8a5a2a');
    if (fire) { R(c, cx + 3, cy - 9, 1, 2, '#e8e0c0'); R(c, cx + 2, cy - 7, 1, 1, '#e8e0c0'); R(c, cx + 3, cy - 5, 1, 2, '#e8e0c0'); R(c, cx + 2, cy - 7, 6, 1, '#d8d0b0'); R(c, cx + 8, cy - 7, 1, 1, '#ffffff'); }
    else R(c, cx + 4, cy - 9, 1, 6, '#e8e0c0');
  }
  function archer(lv, fire) {
    var s = sheet(), c = s.c, cx = 12, P1 = { l: '#4f8a44', s: '#2f5a2a', hi: '#7cb060', d: '#1f3a1c' };
    var bh = [5, 6, 7][lv], wh = [10, 10, 10][lv], bw = lv === 2 ? 21 : 20;
    // 石の土台
    var cy = base(c, cx, bw, ds(9), hs(bh), P.stone);
    masonry(c, cx, BY, bw, hs(bh), P.stone);
    if (lv === 2) band(c, cx, BY - hs(bh), bw, GOLD, GOLD_HI);
    // 木のやぐら
    var wby = cy + 3, y = slab(c, cx, cy, 12, ds(7), hs(wh), P.wood);
    planks(c, cx, wby, 12, hs(wh), P.wood);
    R(c, cx - 1, wby - hs(wh) + 3, 2, 3, '#2a1a0e');                            // 矢を射る窓
    if (lv >= 1) { band(c, cx, wby - 2, 12, P.iron.f, P.iron.hi); band(c, cx, wby - hs(wh) + 1, 12, P.iron.f, P.iron.hi); }
    if (lv === 2) { rivets(c, cx, wby - 2, 12, 3); banner(c, cx, wby - hs(wh) + 6, 5, 6, '#3f7a3a', GOLD); }
    // 見張りの床
    var ph = lv === 2 ? 3 : 2;
    y = slab(c, cx, y, 18, ds(9), hs(ph), P.wood2);
    var fy = y + 4;                                                            // 床の手前のふち
    if (lv === 0) {                                                            // 段階0：手すりの柱だけ
      for (var i = -8; i <= 7; i += 5) R(c, cx + i, fy - 3, 1, 3, P.wood.f);
      R(c, cx - 8, fy - 3, 16, 1, P.wood.t);
      archerMan(c, cx, y + 1, fire);
      flag(c, cx + 8, y - 2, 12, 0);
    } else {                                                                   // 段階1・2：4本の柱と屋根
      var postH = 9, ry = y - postH;
      R(c, cx - 8, ry, 2, postH + 4, P.wood.f); R(c, cx + 6, ry, 2, postH + 4, P.wood.s);   // 手前の柱
      R(c, cx - 7, ry, 1, postH - 2, P.wood.d); R(c, cx + 5, ry, 1, postH - 2, P.wood.d);   // 奥の柱（暗い）
      archerMan(c, cx, y + 1, fire);
      R(c, cx - 8, fy - 3, 16, 1, P.wood.t);                                   // 手すり
      var tip = roof(c, cx, ry + 1, 10, lv === 2 ? 7 : 6, P1);
      if (lv === 2) { R(c, cx, tip - 2, 1, 2, GOLD); R(c, cx - 1, tip - 3, 3, 1, GOLD_HI); band(c, cx, ry, 21, GOLD); flag(c, cx + 1, tip - 2, 5, 2); }
      else flag(c, cx, tip, 5, 1);
    }
    return trim(s);
  }

  // ================= 大砲の塔（cannon）：石の砲台・木の台車・黒い鉄の砲身（右向きを描き、左は反転） =================
  function barrel(c, x0, y, len, th, fire, lv) {   // 横向きの砲身：x0＝おしりの位置、y＝おしり側の上のふち。先に行くほど2ドット上がる（少し上を向く）
    var rows = [P.iron.hi, P.iron.t, P.iron.f, P.iron.f, P.iron.s, P.iron.s, P.iron.d], i, j, lift;
    for (i = 0; i < len; i++) {
      lift = Math.round(i * 2 / len);
      var t2 = i < 3 ? 1 : 0;                                                  // おしり側は少し太い
      for (j = -t2; j < th + t2; j++) {
        var k = Math.max(0, Math.min(th - 1, j));
        R(c, x0 + i, y + j - lift, 1, 1, rows[Math.round(k * (rows.length - 1) / (th - 1))]);
      }
      if (lv >= 1 && (i === 3 || i === len - 4)) R(c, x0 + i, y - lift - t2, 1, th + t2 * 2, lv === 2 ? GOLD : P.iron.hi);   // 補強の帯
    }
    R(c, x0 - 2, y + (th >> 1) - 1, 2, 2, P.iron.f); R(c, x0 - 2, y + (th >> 1) - 1, 1, 1, P.iron.hi);   // おしりの玉
    // 砲口（右はし）：太いふちと暗い穴。攻撃中は穴が光り、炎が少し出る
    var mx = x0 + len, my = y - 2;
    R(c, mx, my - 1, 2, th + 2, lv === 2 ? GOLD : P.iron.t); R(c, mx + 1, my - 1, 1, th + 2, lv === 2 ? GOLD_D : P.iron.s);
    R(c, mx, my - 1, 1, 1, lv === 2 ? GOLD_HI : P.iron.hi);
    R(c, mx + 1, my + 1, 1, th - 2, fire ? '#ffd84a' : '#0c0a0e');
    if (fire) { R(c, mx + 2, my, 1, th, '#ff8a2a'); R(c, mx + 2, my + (th >> 1) - 1, 2, 2, '#fff6c0'); }
  }
  function cannonR(lv, fire) {
    var s = sheet(), c = s.c, cx = 12, bh = [6, 8, 9][lv], bw = lv === 2 ? 21 : 20, Pb = lv === 0 ? P.stone : P.rock;
    var cy = base(c, cx, bw, ds(10), hs(bh), Pb);
    masonry(c, cx, BY, bw, hs(bh), Pb);
    if (lv >= 1) { R(c, cx - (bw >> 1), BY - hs(bh), 2, hs(bh) - 1, P.iron.f); R(c, cx + (bw >> 1) - 2, BY - hs(bh), 2, hs(bh) - 1, P.iron.s); }  // 角の鉄の補強
    if (lv === 2) { band(c, cx, BY - hs(bh), bw, GOLD, GOLD_HI); banner(c, cx - 4, BY - hs(bh) + 1, 5, 6, '#2a2c36', GOLD); }
    var top = cy - 4, x0 = cx - (bw >> 1);
    // 奥のふちの石の凸凹（胸壁）
    for (var i = 1; i < bw - 2; i += 5) { R(c, x0 + i, top - 2, 3, 3, Pb.f); R(c, x0 + i, top - 2, 3, 1, Pb.t); R(c, x0 + i + 2, top - 1, 1, 2, Pb.s); }
    // 旗（奥の左すみ）
    flag(c, x0 + 2, top - 1, lv === 0 ? 10 : 12, lv, true);
    // 木の台車（横から見た台形の板）と、大きな砲身。砲口は土台の右はしまで出す
    var th = [5, 6, 6][lv], len = [12, 13, 14][lv], by = cy + 2, bx = cx - 6, byT = by - 4 - th;
    for (var j = 0; j < 4; j++) R(c, cx - 6 + j, by - 1 - j, 10 - j, 1, j === 3 ? P.wood.t : P.wood.f);
    R(c, cx - 6, by - 1, 10, 1, P.wood.d);
    barrel(c, bx, byT, len, th, fire, lv);
    // 車輪（手前に1つ。鉄の輪・木の輪・中心）
    var wx = cx - 1, wy = by - 2;
    ell(c, wx, wy, 3, 3, P.iron.d); ell(c, wx, wy, 2, 2, P.wood.f); R(c, wx - 2, wy, 5, 1, P.wood.d); R(c, wx, wy - 2, 1, 5, P.wood.d);
    R(c, wx, wy, 1, 1, lv === 2 ? GOLD : P.wood.hi); R(c, wx - 2, wy - 2, 1, 1, P.iron.hi);
    // 前の胸壁（手前のふちに低い石。砲を隠さないよう1段だけ）
    for (i = 1; i < bw - 2; i += 5) { R(c, x0 + i, cy + 4, 3, 1, Pb.hi); }
    return trim(s);
  }

  // ================= 氷の塔（frost）：青い石の台と、氷の水晶 =================
  function crystal(c, cx, by, w, h, lit) {   // 水晶：左半分は明るく、右半分は青い影。lit＝攻撃中で明るい
    var hw = w >> 1, L = lit ? '#ffffff' : '#d4f2ff', S = lit ? '#bfe8ff' : '#6fbce8', E = lit ? '#7ac8f0' : '#3f86b8';
    for (var j = 0; j < h; j++) {
      var yy = by - h + 1 + j, half = Math.min(hw, Math.round(hw * (j + 1) / Math.max(1, h * 0.45)));
      R(c, cx - half, yy, half, 1, L); R(c, cx, yy, half + 1, 1, S);
    }
    R(c, cx - 1, by - h + 3, 1, Math.max(2, h - 7), '#ffffff');
    R(c, cx + hw, by - Math.round(h * 0.55), 1, Math.round(h * 0.55), E);
    R(c, cx - hw, by, w + 1, 1, E);
  }
  function frost(lv, fire) {
    var s = sheet(), c = s.c, cx = 12, bh = [7, 8, 9][lv], bw = 20;
    var cy = base(c, cx, bw, ds(9), hs(bh), P.bluest);
    masonry(c, cx, BY, bw, hs(bh), P.bluest);
    R(c, cx - (bw >> 1), BY - hs(bh), bw, 1, '#e8f6ff');                       // 土台のふちに霜
    for (var i = 0; i < bw; i += 3) R(c, cx - (bw >> 1) + i, BY - hs(bh) + 1, 1, 1 + (i % 2), '#cfeaff');   // つらら
    if (lv === 2) { band(c, cx, BY - 2, bw, GOLD, GOLD_HI); rivets(c, cx, BY - hs(bh) + 3, bw, 5); }
    var y = cy;
    if (lv >= 1) {                                                              // 段階1から：水晶をのせる台座
      y = slab(c, cx, cy, 14, ds(7), hs(lv === 2 ? 3 : 2), P.metal);
      if (lv === 2) band(c, cx, y + 4, 14, GOLD);
    }
    var big = [21, 24, 27][lv], side = [11, 13, 15][lv];
    if (lv >= 1) crystal(c, cx + 1, y - 1, 4, side - 3, fire);                  // 奥の小さな水晶
    crystal(c, cx - 6, y + 2, 5, side, fire); crystal(c, cx + 6, y + 2, 5, side + 1, fire);
    crystal(c, cx, y + 3, lv === 0 ? 8 : 10, big, fire);
    if (lv === 2) {                                                             // 段階2：浮かぶ氷のかけらと金のかんむり
      var ty = y + 3 - big;
      R(c, cx - 1, ty - 4, 2, 3, fire ? '#ffffff' : '#bff0ff'); R(c, cx, ty - 4, 1, 3, '#6fbce8');
      R(c, cx - 4, y + 3 - big + 6, 1, 1, GOLD); R(c, cx + 4, y + 3 - big + 6, 1, 1, GOLD);
      flag(c, cx + 8, cy - 2, 10, 2);
    } else flag(c, cx + 8, cy - 2, lv ? 9 : 8, lv);
    if (fire) { R(c, cx - 9, y - 6, 1, 1, '#ffffff'); R(c, cx + 9, y - 10, 1, 1, '#ffffff'); R(c, cx - 3, y + 3 - big - 2, 1, 1, '#ffffff'); }   // 冷気のきらめき
    return trim(s);
  }

  // ---------- 種類ごとの作り方（ここに描き足していく） ----------
  var MAKERS = {
    archer: archer,
    cannon: function (lv, fire) { var r = cannonR(lv, fire); return { r: r, l: flip(r) }; },
    frost: frost
  };

  G.TowerArt = {
    P: P, FLAG: FLAG, GOLD: GOLD, GOLD_HI: GOLD_HI, GOLD_D: GOLD_D,
    sheet: sheet, trim: trim, flip: flip, BY: BY, ds: ds, hs: hs,
    slab: slab, base: base, masonry: masonry, planks: planks, band: band, rivets: rivets, roof: roof, flag: flag, banner: banner, crystal: crystal, barrel: barrel,
    MAKERS: MAKERS,
    // G.SPR に新しい絵を入れる（古い絵を上書き）
    apply: function (S) {
      Object.keys(MAKERS).forEach(function (k) {
        S[k] = [];
        for (var lv = 0; lv < 3; lv++) S[k].push([MAKERS[k](lv, false), MAKERS[k](lv, true)]);
      });
    }
  };
})();

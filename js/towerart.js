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
    gold:   { t: '#f6dc7a', f: '#e8c040', s: '#b8902a', hi: '#fff0b0', d: '#7a5a14', m: '#d0a838' },
    char:   { t: '#664139', f: '#45302b', s: '#2f201d', hi: '#85574c', d: '#170d0b', m: '#38241f' },   // 焦げたレンガ（炎の塔）
    ironw:  { t: '#2a2326', f: '#4d4348', s: '#322b2f', hi: '#74686f', d: '#17121a', m: '#3a3135' },   // 暖かみのある鉄（炎の塔の皿・毒の大釜）
    violet: { t: '#8f80ae', f: '#6c5d8e', s: '#4c4070', hi: '#aa9bc9', d: '#2a2145', m: '#5a4c7c' },   // 紫の石（魔導士の塔）
    black:  { t: '#4f5160', f: '#32343f', s: '#22242d', hi: '#666a7c', d: '#101118', m: '#3e404c' }    // 黒い石（嵐の塔）
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


  // ================= ここから：見習い弓兵・投石小屋・見張り小屋・吹き矢小屋・狙撃塔 =================
  // 手前の面だけの壁（屋根の下に使う。上の面は描かない）：左はハイライト・右は影・下は暗い線
  function wall(c, cx, by, w, hh, Pl) {
    var x0 = cx - (w >> 1), sw = Math.max(2, w >> 2);
    R(c, x0, by - hh, w, hh, Pl.f); R(c, x0 + w - sw, by - hh, sw, hh, Pl.s);
    R(c, x0, by - hh, 1, hh, Pl.hi); R(c, x0, by - 1, w, 1, Pl.d);
  }
  // 人（台の上に立つ）：cy＝足もと。tun＝服の色（手前・影）、hat＝ぼうしの色
  function person(c, cx, cy, tun, tunS, hat, hatHi) {
    R(c, cx - 2, cy - 5, 5, 5, tun); R(c, cx + 1, cy - 5, 2, 5, tunS); R(c, cx - 2, cy - 1, 5, 1, '#2a2218');
    R(c, cx - 1, cy - 8, 3, 3, '#f0c8a0'); R(c, cx + 1, cy - 8, 1, 3, '#c89870');
    R(c, cx - 2, cy - 10, 5, 2, hat); R(c, cx - 2, cy - 10, 1, 1, hatHi);
  }

  // ================= 見習い弓兵（bowman）：木のやぐら。茶色の服の見習いが小さな弓を持つ =================
  function bowman(lv, fire) {
    var s = sheet(), c = s.c, cx = 12, bh = [5, 6, 6][lv], lg = [8, 9, 10][lv], i;
    var Pr = { l: '#8d5a34', s: '#5e3a20', hi: '#b07a48', d: '#3a2210' };
    // 木の足もと（板の台）
    var cy = base(c, cx, 16, ds(8), hs(bh), P.wood);
    planks(c, cx, BY, 16, hs(bh), P.wood, 3);
    if (lv >= 1) { band(c, cx, BY - 2, 16, P.iron.f, P.iron.hi); }
    if (lv === 2) { band(c, cx, BY - hs(bh), 16, GOLD, GOLD_HI); rivets(c, cx, BY - 3, 16, 4); }
    // 足（2本の柱とななめの補強）。奥の柱は暗く
    R(c, cx - 5, cy - 3 - lg, 2, lg, P.wood.d); R(c, cx + 4, cy - 3 - lg, 2, lg, P.wood.d);
    R(c, cx - 6, cy + 3 - lg, 2, lg, P.wood.f); R(c, cx - 6, cy + 3 - lg, 1, lg, P.wood.hi); R(c, cx + 5, cy + 3 - lg, 2, lg, P.wood.s);
    for (i = 0; i < lg - 1; i++) R(c, cx - 4 + Math.round(i * 8 / lg), cy + 2 - i, 1, 1, P.wood.s);
    // 見張りの床
    var y = slab(c, cx, cy - lg, 16, ds(8), hs(2), P.wood2), fy = y + 4;
    if (lv === 2) band(c, cx, fy + 1, 16, GOLD);
    var ry = y;
    if (lv >= 1) {                                                              // 段階1・2：細い柱と屋根
      var pH = 9; ry = y - pH;
      R(c, cx - 7, ry, 1, pH + 4, P.wood.f); R(c, cx + 6, ry, 1, pH + 4, P.wood.s);
    }
    person(c, cx, y + 1, '#8a6a3a', '#5e4624', '#5a3a1e', '#7a5230');          // 茶色の服と革のぼうし
    R(c, cx - 1, y - 5, 3, 1, '#d94a3a');                                       // 見習いのしるし（赤い帯）
    // 小さな弓（右手）：ふだんは弦がまっすぐ、攻撃中は弦を引く
    R(c, cx + 4, y - 9, 1, 1, '#8a5a2a'); R(c, cx + 5, y - 8, 1, 5, '#8a5a2a'); R(c, cx + 4, y - 3, 1, 1, '#8a5a2a');
    if (fire) { R(c, cx + 3, y - 8, 1, 2, '#e8e0c0'); R(c, cx + 2, y - 6, 1, 1, '#e8e0c0'); R(c, cx + 3, y - 5, 1, 2, '#e8e0c0'); R(c, cx + 2, y - 6, 6, 1, '#d8d0b0'); R(c, cx + 8, y - 6, 1, 1, '#ffffff'); }
    else R(c, cx + 4, y - 8, 1, 5, '#e8e0c0');
    if (lv === 0) {
      for (i = -8; i <= 7; i += 5) R(c, cx + i, fy - 3, 1, 3, P.wood.f);
      R(c, cx - 8, fy - 3, 16, 1, P.wood.t);
      flag(c, cx - 7, y - 1, 11, 0, false);
    } else {
      R(c, cx - 7, fy - 3, 14, 1, P.wood.t);
      var tip = roof(c, cx, ry + 1, 9, lv === 2 ? 7 : 5, Pr);
      if (lv === 2) { band(c, cx, ry, 15, GOLD); R(c, cx, tip - 2, 1, 2, GOLD); R(c, cx - 1, tip - 3, 3, 1, GOLD_HI); flag(c, cx + 1, tip - 2, 5, 2); }
      else flag(c, cx, tip, 5, 1);
    }
    return trim(s);
  }

  // ================= 投石小屋（sling）：わらぶき屋根の小屋と石の山。ひもに石をつるす =================
  function sling(lv, fire) {
    var s = sheet(), c = s.c, hx = 10, wh = [14, 15, 16][lv], rh = [9, 10, 11][lv], i;
    var Pr = { l: '#d9b24a', s: '#a07a28', hi: '#f0d070', d: '#6a4a14' };
    // 木の小屋（横板）。段階1は鉄の帯、段階2は金の帯
    wall(c, hx, BY, 14, wh, P.wood); planks(c, hx, BY, 14, wh, P.wood, 3);
    R(c, hx - 2, BY - 7, 4, 6, '#3b2a1a'); R(c, hx - 2, BY - 7, 1, 6, '#24180e');       // 戸口
    if (lv >= 1) { band(c, hx, BY - 3, 14, P.iron.f, P.iron.hi); band(c, hx, BY - wh + 1, 14, P.iron.f, P.iron.hi); R(c, hx - 7, BY - wh, 1, wh - 1, P.iron.f); }
    if (lv === 2) { band(c, hx, BY - wh + 1, 14, GOLD, GOLD_HI); rivets(c, hx, BY - 3, 14, 3); }
    // わらぶき屋根（のきが出る）
    var eave = BY - wh + 1, tip = roof(c, hx, eave, 9, rh, Pr);
    for (i = 2; i < rh - 1; i += 2) R(c, hx - Math.round(9 * (i + 1) / rh) + 2, eave - rh + i, Math.round(9 * (i + 1) / rh) * 2 - 3, 1, Pr.hi);   // わらの筋
    // 右はしの石の山（段階が上がると増える）
    ell(c, 19, BY - 3, 3, 2, P.rock.f); ell(c, 18, BY - 4, 2, 2, P.rock.t); R(c, 17, BY - 5, 1, 1, P.rock.hi); R(c, 21, BY - 2, 2, 1, P.rock.s);
    if (lv >= 1) { ell(c, 15, BY - 2, 2, 1, P.rock.f); R(c, 14, BY - 3, 1, 1, P.rock.hi); }
    if (lv === 2) { ell(c, 19, BY - 7, 2, 1, P.rock.t); R(c, 18, BY - 8, 1, 1, P.rock.hi); }
    // 投石ひも（軒の左すみ）：ふだんは下にたれ、攻撃中は外へふれる
    var rx = hx - 6;
    R(c, rx, eave, 1, 1, '#6b4422');
    if (fire) { R(c, rx - 1, eave + 1, 1, 1, '#d8c8a0'); R(c, rx - 2, eave + 2, 1, 1, '#d8c8a0'); ell(c, rx - 2, eave + 4, 1, 1, '#b4b8bc'); }
    else { R(c, rx, eave + 1, 1, 3, '#d8c8a0'); ell(c, rx, eave + 5, 1, 1, '#b4b8bc'); }
    // 旗（屋根のてっぺん）
    if (lv === 2) { R(c, hx, tip - 2, 1, 2, GOLD); R(c, hx - 1, tip - 3, 3, 1, GOLD_HI); flag(c, hx + 1, tip - 2, 6, 2); }
    else flag(c, hx, tip, lv ? 7 : 6, lv);
    return trim(s);
  }

  // ================= 見張り小屋（watch）：細い柱と小さな台。青い服の見張りが角笛を吹く =================
  function watch(lv, fire) {
    var s = sheet(), c = s.c, cx = 12, pH = [14, 16, 18][lv], i;
    var Pr = { l: '#5a7aa0', s: '#3a5478', hi: '#86a6cc', d: '#22344e' };
    // 石の小さな足もと
    var cy = base(c, cx, 12, ds(7), hs(3), lv === 0 ? P.stone : P.rock);
    masonry(c, cx, BY, 12, hs(3), lv === 0 ? P.stone : P.rock, 2);
    if (lv === 2) band(c, cx, BY - 3, 12, GOLD, GOLD_HI);
    // 細い柱（左は明るく、右は影）
    var top = BY - 3 - pH;
    R(c, cx - 2, top, 4, pH, P.wood.f); R(c, cx + 1, top, 2, pH, P.wood.s); R(c, cx - 2, top, 1, pH, P.wood.hi);
    if (lv >= 1) {                                                              // ななめの支え
      for (i = 0; i < 6; i++) { R(c, cx - 3 - (i >> 1), BY - 4 - i, 1, 1, P.wood.s); R(c, cx + 3 + (i >> 1), BY - 4 - i, 1, 1, P.wood.d); }
      band(c, cx, BY - 6, 4, P.iron.f, P.iron.hi); band(c, cx, top + 2, 4, P.iron.f, P.iron.hi);
    }
    if (lv === 2) { band(c, cx, BY - 8, 4, GOLD, GOLD_HI); band(c, cx, top + 4, 4, GOLD); }
    // 小さな台
    var y = slab(c, cx, top - 1, 14, ds(7), hs(2), P.wood2), fy = y + 3;
    var ph = 8;
    if (lv >= 1) { R(c, cx - 6, y - ph, 1, ph + 3, P.wood.f); R(c, cx + 6, y - ph, 1, ph + 3, P.wood.s); }
    // 見張り番（青い服）。右手で角笛：ふだんは下げ、攻撃中は高く上げて音が出る
    person(c, cx, y + 1, '#4a6a8a', '#34506a', '#2e4560', '#4a6a8a');
    R(c, cx - 1, y - 5, 3, 1, '#e8e0c0');                                       // 胸の白い帯
    if (fire) {
      R(c, cx + 3, y - 8, 1, 3, '#c8a040'); R(c, cx + 4, y - 9, 2, 1, '#e8c860'); R(c, cx + 5, y - 11, 2, 2, '#f6dc7a');
      R(c, cx + 8, y - 12, 1, 1, '#ffffff'); R(c, cx + 8, y - 9, 1, 1, '#ffffff');
    } else {
      R(c, cx + 3, y - 5, 1, 3, '#c8a040'); R(c, cx + 4, y - 3, 2, 1, '#e8c860'); R(c, cx + 5, y - 3, 1, 2, '#f6dc7a');
    }
    R(c, cx - 7, fy - 3, 14, 1, P.wood.t);                                      // 手すり
    if (lv === 0) {
      for (i = -6; i <= 6; i += 6) R(c, cx + i, fy - 3, 1, 3, P.wood.f);
      flag(c, cx - 6, y - 1, 10, 0, false);
    } else {
      var tip = roof(c, cx, y - ph + 1, 8, lv === 2 ? 6 : 5, Pr);
      if (lv === 2) { R(c, cx, tip - 2, 1, 2, GOLD); R(c, cx - 1, tip - 3, 3, 1, GOLD_HI); band(c, cx, y - ph, 14, GOLD); flag(c, cx + 1, tip - 2, 5, 2); }
      else flag(c, cx, tip, 5, 1);
    }
    return trim(s);
  }

  // ================= 吹き矢小屋（dart）：竹の小屋と、窓から出る吹き矢の筒 =================
  function dart(lv, fire) {
    var s = sheet(), c = s.c, cx = 11, wh = [14, 15, 16][lv], rh = [9, 10, 11][lv], i;
    var Pb = { f: '#8a9a4a', s: '#5f6e2e', hi: '#b0c070', d: '#3e4a1c' };
    var Pr = { l: '#c8a860', s: '#9a7e3c', hi: '#e0c888', d: '#6a5426' };
    // 木の低い台（足もと）
    base(c, cx, 16, ds(7), hs(3), P.wood); planks(c, cx, BY, 16, hs(3), P.wood, 2);
    if (lv === 2) band(c, cx, BY - 3, 16, GOLD, GOLD_HI);
    // 竹の壁（たて筋）
    var wb = BY - 3;
    wall(c, cx, wb, 14, wh, Pb);
    for (i = 2; i < 12; i += 3) R(c, cx - 7 + i, wb - wh + 1, 1, wh - 2, Pb.s);
    for (i = 4; i < wh; i += 5) R(c, cx - 6, wb - i, 12, 1, Pb.hi);                // 竹の節
    if (lv >= 1) { band(c, cx, wb - 2, 14, P.iron.f, P.iron.hi); band(c, cx, wb - wh + 1, 14, P.iron.f, P.iron.hi); }
    if (lv === 2) { band(c, cx, wb - wh + 1, 14, GOLD, GOLD_HI); rivets(c, cx, wb - 2, 14, 3); }
    // 窓と吹き矢の筒（右へ突き出す）。攻撃中は矢が飛び出し、白い息が出る
    var wy = wb - 9;
    R(c, cx - 3, wy - 1, 5, 4, '#1e2a10');
    R(c, cx - 1, wy, 10, 2, '#e8d9b0'); R(c, cx - 1, wy, 10, 1, '#fff6d8'); R(c, cx + 8, wy, 1, 2, '#8a7a50');
    if (fire) { R(c, cx + 9, wy, 1, 1, '#ffffff'); R(c, cx + 10, wy, 2, 1, '#d94a3a'); R(c, cx + 12, wy, 1, 1, '#ffffff'); }
    // 屋根（竹ひご）。段階1からは小さな2段目
    var eave = wb - wh + 1, tip = roof(c, cx, eave, 10, rh, Pr);
    if (lv >= 1) { tip = roof(c, cx, tip + 1, 5, 5, Pr); R(c, cx - 2, tip + 4, 5, 1, lv === 2 ? GOLD : P.iron.f); }
    if (lv === 2) { R(c, cx, tip - 2, 1, 2, GOLD); R(c, cx - 1, tip - 3, 3, 1, GOLD_HI); flag(c, cx + 1, tip - 2, 5, 2); }
    else flag(c, cx, tip, lv ? 5 : 6, lv);
    return trim(s);
  }

  // ================= 狙撃塔（sniper）：細く高い石の塔と長い弩（右向きを描き、左は反転） =================
  function sniperR(lv, fire) {
    var s = sheet(), c = s.c, cx = 12, H = [18, 24, 26][lv], Pb = lv === 0 ? P.stone : P.bluest, i;
    // 広い足もと → 細い塔
    var cy = base(c, cx, 16, ds(8), hs(3), Pb);
    masonry(c, cx, BY, 16, hs(3), Pb, 2);
    if (lv === 2) band(c, cx, BY - 3, 16, GOLD, GOLD_HI);
    var wb = cy + 3, y = slab(c, cx, cy, 12, ds(7), hs(H), Pb);
    masonry(c, cx, wb, 12, hs(H), Pb);
    R(c, cx - 1, wb - hs(H) + 4, 2, 4, '#1e2228'); R(c, cx - 1, wb - hs(H) + 4, 1, 1, '#4a5260');   // 細い窓
    if (lv >= 1) { band(c, cx, wb - 3, 12, P.iron.f, P.iron.hi); band(c, cx, wb - hs(H) + 1, 12, P.iron.f, P.iron.hi); band(c, cx, wb - (hs(H) >> 1), 12, P.iron.f, P.iron.hi); }
    if (lv === 2) { band(c, cx, wb - 3, 12, GOLD, GOLD_HI); band(c, cx, wb - hs(H) + 1, 12, GOLD, GOLD_HI); rivets(c, cx, wb - (hs(H) >> 1), 12, 3); }
    // 見張り台
    y = slab(c, cx, y, 17, ds(8), hs(2), P.wood2);
    var ly = y;
    for (i = -7; i <= 7; i += 7) R(c, cx + i, y + 2, 2, 2, P.wood.d);
    // 長い弩：台座（木の柄）・右はしの弓（上下に反る）・弦・矢
    var x0 = cx - 7;
    R(c, x0, ly - 2, 15, 2, P.wood.f); R(c, x0, ly - 2, 15, 1, P.wood.t); R(c, x0 - 1, ly - 3, 2, 3, P.wood.s);
    R(c, cx + 5, ly - 3, 1, 3, P.iron.t);                                      // 弓の付け根
    var Lc = lv === 2 ? GOLD : P.iron.f;
    R(c, cx + 6, ly - 8, 1, 5, Lc); R(c, cx + 5, ly - 10, 1, 3, Lc); R(c, cx + 4, ly - 11, 1, 1, Lc);   // 上の弓
    R(c, cx + 6, ly, 1, 3, Lc); R(c, cx + 5, ly + 2, 1, 1, Lc);                                           // 下の弓（見えるぶんだけ）
    if (lv === 2) { R(c, cx + 6, ly - 8, 1, 1, GOLD_HI); R(c, cx + 4, ly - 11, 1, 1, GOLD_HI); }
    R(c, cx - 3, ly - 6, 3, 2, '#4a7ad0'); R(c, cx - 3, ly - 7, 1, 1, '#bfe0ff');   // 照準
    if (fire) {                                                                 // 弦がはね戻り、矢が飛んで先が光る
      R(c, cx + 4, ly - 10, 1, 9, '#e8e0c0'); R(c, cx + 9, ly - 2, 1, 1, '#ffffff'); R(c, cx + 10, ly - 3, 2, 3, '#ffffff'); R(c, cx + 8, ly - 4, 1, 1, '#fff6c0');
    } else {                                                                    // 弦を引き、矢をつがえる
      R(c, cx + 1, ly - 3, 1, 1, '#e8e0c0'); R(c, cx + 2, ly - 6, 1, 3, '#e8e0c0'); R(c, cx + 3, ly - 9, 1, 3, '#e8e0c0'); R(c, cx + 2, ly - 1, 1, 3, '#e8e0c0');
      R(c, cx + 1, ly - 3, 8, 1, '#d8d8d8'); R(c, cx + 9, ly - 3, 1, 1, '#ffffff');
    }
    // 旗（台の左はし。左向きに作った後に反転で右へ）
    if (lv === 2) { R(c, cx - 7, ly - 15, 1, 1, GOLD_HI); flag(c, cx - 7, ly - 2, 13, 2, true); }
    else flag(c, cx - 7, ly - 2, lv ? 11 : 9, lv, true);
    return trim(s);
  }

  // ================= ここから：炎・雷・毒・魔導士・嵐 =================
  // 炎：下から上へ、赤→オレンジ→黄→白の順に重ねて、先をとがらせる。wd＝根もとの半分の幅、h＝高さ
  function flame(c, cx, by, h, wd) {
    for (var j = 0; j < h; j++) {
      var k = j / h, half = Math.round(wd * Math.pow(1 - k, 0.7)), x = cx + (j > h * 0.6 ? 1 : 0), y = by - j;
      if (j === h - 1) half = 0;
      R(c, x - half, y, half * 2 + 1, 1, '#e0481a');
      if (half >= 2) R(c, x - half + 1, y, half * 2 - 1, 1, '#ff8a2a');
      if (half >= 3 && k < 0.7) R(c, x - half + 2, y, half * 2 - 3, 1, '#ffd84a');
      if (half >= 2 && k < 0.45) R(c, x - 1, y, 2, 1, '#fff6c0');
    }
  }

  // ================= 炎の塔（fire）：赤レンガの土台・焦げた炉・鉄の皿に炎 =================
  function fire_(lv, fire) {
    var s = sheet(), c = s.c, cx = 12, bh = [7, 8, 9][lv], bw = lv === 2 ? 21 : 20, fh = [12, 13, 14][lv];
    var cy = base(c, cx, bw, ds(9), hs(bh), P.redst);
    masonry(c, cx, BY, bw, hs(bh), P.redst);
    if (lv === 2) band(c, cx, BY - hs(bh), bw, GOLD, GOLD_HI);
    // 焦げた炉（まん中に2本の火のすき間）
    var wby = cy + 3, y = slab(c, cx, cy, 12, ds(7), hs(fh), P.char);
    R(c, cx - 4, wby - fh + 3, 2, fh - 6, '#ff6a1a'); R(c, cx - 4, wby - fh + 4, 1, Math.max(1, fh - 8), '#ffd84a');
    R(c, cx + 2, wby - fh + 3, 2, fh - 6, '#ff6a1a'); R(c, cx + 2, wby - fh + 4, 1, Math.max(1, fh - 8), '#ffd84a');
    if (lv >= 1) { band(c, cx, wby - 2, 12, P.iron.f, P.iron.hi); band(c, cx, wby - fh + 1, 12, lv === 2 ? GOLD : P.iron.f, lv === 2 ? GOLD_HI : P.iron.hi); }
    // 鉄の皿と炭
    var ry = cyl(c, cx, y, 8, hs(3), P.ironw);
    y -= hs(3);
    if (lv === 2) ell(c, cx, y, 8, ry, GOLD);
    ell(c, cx, y, 6, Math.max(2, ry - 1), '#3a1008'); ell(c, cx, y, 4, Math.max(1, ry - 2), '#c8421a'); ell(c, cx, y, 2, 1, '#ff8a2a');
    if (lv >= 1) { R(c, cx - 8, y - 3, 1, 3, P.iron.hi); R(c, cx + 8, y - 3, 1, 3, P.iron.s); }   // 皿のふちの鉄の角
    // 炎：攻撃中は大きく明るくなり、火の粉が飛ぶ
    var fhh = [10, 13, 16][lv] + (fire ? 3 : 0), wd = [4, 4, 5][lv] + (fire ? 1 : 0);
    flame(c, cx, y, fhh, wd);
    if (fire) { R(c, cx - 6, y - fhh + 3, 1, 1, '#ffd84a'); R(c, cx + 6, y - fhh + 5, 1, 1, '#ffb040'); R(c, cx + 2, y - fhh - 2, 1, 1, '#fff6c0'); }
    // 旗（皿の右がわの柱）
    if (lv === 2) { flag(c, cx + 7, cy - 2, fh + bh - 2, 2); }
    else flag(c, cx + 7, cy - 2, [fh + bh - 4, fh + bh - 2][lv], lv);
    return trim(s);
  }

  // ================= 雷の塔（thunder）：青い石台・金属と銅の円柱を積み、上に雷の玉 =================
  function thunder(lv, fire) {
    var s = sheet(), c = s.c, cx = 12, bh = [5, 6, 6][lv];
    var cy = base(c, cx, 20, ds(9), hs(bh), P.bluest);
    masonry(c, cx, BY, 20, hs(bh), P.bluest);
    if (lv >= 1) { R(c, cx - 10, BY - hs(bh), 2, hs(bh) - 1, P.iron.f); R(c, cx + 8, BY - hs(bh), 2, hs(bh) - 1, P.iron.s); }   // 角の鉄の補強
    if (lv === 2) band(c, cx, BY - hs(bh), 20, GOLD, GOLD_HI);
    var y = cy, k = lv === 2 ? GOLD : 0;
    function ring(rx, hh, Pl) { cyl(c, cx, y, rx, hs(hh), Pl); y -= hs(hh); }
    var Pc = lv === 2 ? P.gold : P.copper;
    ring(6, [7, 8, 8][lv], P.metal);
    ring(7, 2, lv >= 1 ? (lv === 2 ? P.gold : P.iron) : P.copper);
    ring(5, [6, 7, 7][lv], P.metal);
    ring(6, 2, Pc);
    if (lv === 2) { ring(4, 3, P.metal); ring(5, 2, P.gold); }
    ring(3, 4, P.metal);
    ring(4, 2, Pc);
    // 雷の玉：ふだんは青く、攻撃中は白く強く光って火花が出る
    var oy = y - 3;
    if (fire) { DA.disc(c, cx, oy, 5, '#5aa8e8'); }
    DA.disc(c, cx, oy, 3, fire ? '#ffffff' : '#4a8ae0');
    if (!fire) { R(c, cx + 1, oy, 2, 3, '#2a5ab0'); R(c, cx - 2, oy - 2, 2, 2, '#bfe0ff'); R(c, cx - 1, oy - 1, 1, 1, '#ffffff'); }
    else { R(c, cx - 2, oy - 2, 2, 2, '#e8f6ff'); R(c, cx - 7, oy - 4, 1, 3, '#ffffff'); R(c, cx + 6, oy - 5, 1, 3, '#ffe14d'); R(c, cx + 5, oy + 2, 1, 2, '#ffffff'); }
    if (lv >= 1) { R(c, cx - 4, oy + 2, 1, 2, lv === 2 ? GOLD : P.copper.f); R(c, cx + 4, oy + 2, 1, 2, lv === 2 ? GOLD : P.copper.f); }   // 玉をささえる金具
    // 旗
    flag(c, cx + 9, cy - 2, lv === 0 ? 15 : lv === 1 ? 18 : 21, lv, true);
    return trim(s);
  }

  // ================= 毒の塔（poison）：石の台の上の黒い大釜。緑の毒がぐつぐつ =================
  function bubble(c, x, y, r, col, hi) { DA.disc(c, x, y, r, col); R(c, x - 1, y - 1, 1, 1, hi); }
  function poison(lv, fire) {
    var s = sheet(), c = s.c, cx = 12, bh = [7, 8, 8][lv], bw = lv === 2 ? 21 : 20, Pb = lv === 0 ? P.stone : P.rock;
    var cy = base(c, cx, bw, ds(9), hs(bh), Pb);
    masonry(c, cx, BY, bw, hs(bh), Pb);
    if (lv >= 1) { R(c, cx - (bw >> 1), BY - hs(bh), 2, hs(bh) - 1, P.iron.f); R(c, cx + (bw >> 1) - 2, BY - hs(bh), 2, hs(bh) - 1, P.iron.s); }
    if (lv === 2) band(c, cx, BY - hs(bh), bw, GOLD, GOLD_HI);
    // 台の上の小さな石の台座（大釜をのせる）
    var pw = 14, ph2 = [3, 4, 5][lv], pby = cy + 4;
    var cy0 = cy;
    cy = slab(c, cx, cy, pw, ds(8), hs(ph2), Pb);
    masonry(c, cx, pby, pw, hs(ph2), Pb, 2);
    if (lv === 2) band(c, cx, pby - hs(ph2), pw, GOLD, GOLD_HI);
    // たきぎ（手前に木の丸太）
    R(c, cx - 5, BY - 2, 4, 2, P.wood.f); R(c, cx - 5, BY - 2, 4, 1, P.wood.t); R(c, cx + 1, BY - 3, 4, 2, P.wood.s);
    // 大釜：太い胴・ふち・毒の水面
    var ch = [9, 10, 11][lv], y = cy;
    R(c, cx - 8, y - 1, 2, 2, P.ironw.d); R(c, cx + 6, y - 1, 2, 2, P.ironw.d);                       // 足
    var ry = cyl(c, cx, y, 8, hs(ch), P.ironw);
    y -= hs(ch);
    if (lv >= 1) { band(c, cx, y + 3, 17, lv === 2 ? GOLD : P.iron.hi, lv === 2 ? GOLD_HI : null); }  // 胴の帯
    ell(c, cx, y, 8, ry, lv === 2 ? GOLD : P.ironw.hi);                                                // ふち
    ell(c, cx, y, 7, ry - 1, '#2c4a18');
    ell(c, cx, y, 6, Math.max(1, ry - 2), fire ? '#d4ff7a' : '#8fd64a');
    R(c, cx - 4, y - 1, 3, 1, fire ? '#f0ffc0' : '#b8ec78');
    // あわ：攻撃中は大きく数も増える
    bubble(c, cx - 3, y - 3, 2, '#a6e85a', '#e8ffc0'); bubble(c, cx + 3, y - 6, 1, '#a6e85a', '#e8ffc0');
    if (fire) { bubble(c, cx + 1, y - 9, 2, '#c8f59a', '#ffffff'); bubble(c, cx - 5, y - 8, 1, '#c8f59a', '#ffffff'); R(c, cx + 5, y - 3, 1, 1, '#d4ff7a'); }
    else R(c, cx, y - 9, 1, 1, '#c8f59a');
    // 横に木のひしゃく、旗
    if (lv >= 1) { R(c, cx + 8, y - 1, 1, 6, P.wood.f); R(c, cx + 9, y - 1, 2, 1, P.wood.t); }
    flag(c, cx - 9, cy0 - 2, [14, 18, 22][lv], lv, false);
    return trim(s);
  }

  // ================= 魔導士の塔（mage）：紫の石の塔・とんがり屋根・浮かぶ水晶 =================
  function gem(c, cx, cy, lit, lv) {   // ひし形の水晶：左は明るく右は影
    var L = lit ? '#ffffff' : lv === 2 ? '#fff0b0' : '#d4f6ff', M = lit ? '#e8f8ff' : lv === 2 ? '#ffd76a' : '#9be7ff', S = lit ? '#9fdcff' : lv === 2 ? '#c8962a' : '#4aa8d8';
    var w = [0, 1, 2, 3, 3, 2, 1, 0], j;
    for (j = 0; j < 8; j++) {
      var yy = cy - 4 + j, h = w[j];
      R(c, cx - h, yy, h, 1, L); R(c, cx, yy, 1, 1, M); R(c, cx + 1, yy, h, 1, S);
    }
    R(c, cx - 1, cy - 1, 1, 2, '#ffffff');
  }
  function mage(lv, fire) {
    var s = sheet(), c = s.c, cx = 12, bh = [6, 7, 7][lv], th = [12, 14, 15][lv];
    var Pr = { l: '#7a52c8', s: '#52348e', hi: '#a67ee8', d: '#2e1a5c' };
    var cy = base(c, cx, 20, ds(9), hs(bh), P.stone);
    masonry(c, cx, BY, 20, hs(bh), P.stone);
    if (lv === 2) band(c, cx, BY - hs(bh), 20, GOLD, GOLD_HI);
    var wby = cy + 3, y = slab(c, cx, cy, 12, ds(7), hs(th), P.violet);
    masonry(c, cx, wby, 12, hs(th), P.violet);
    R(c, cx - 2, wby - th + 4, 3, 5, '#2a1f45'); R(c, cx - 1, wby - th + 5, 1, 3, '#c79bff'); R(c, cx - 1, wby - th + 5, 1, 1, '#f0dcff');   // 光る窓
    if (lv >= 1) { band(c, cx, wby - 2, 12, P.iron.f, P.iron.hi); band(c, cx, wby - th + 1, 12, lv === 2 ? GOLD : P.iron.f, lv === 2 ? GOLD_HI : P.iron.hi); }
    if (lv === 2) rivets(c, cx, wby - 2, 12, 3);
    // 旗（右の柱）
    flag(c, cx + 8, cy - 2, lv === 0 ? 14 : lv === 1 ? 17 : 19, lv, true);
    // 屋根
    var tip = roof(c, cx, y + 1, [8, 9, 9][lv], [10, 12, 13][lv], Pr);
    if (lv >= 1) R(c, cx - 9, y + 1, 19, 1, lv === 2 ? GOLD : '#4a2f80');                            // のきの帯
    if (lv === 2) { R(c, cx - 5, tip + 6, 1, 1, GOLD_HI); R(c, cx + 3, tip + 8, 1, 1, GOLD); }
    // 水晶：屋根の先の上に浮かぶ。攻撃中は白く光り、きらめきが出る
    gem(c, cx, tip - 5, fire, lv);
    if (fire) { R(c, cx - 5, tip - 6, 1, 1, '#ffffff'); R(c, cx + 5, tip - 4, 1, 1, '#c8f0ff'); R(c, cx, tip - 10, 1, 1, '#ffffff'); }
    return trim(s);
  }

  // ================= 嵐の塔（storm）：黒い塔と、上に浮かぶ雷雲 =================
  function cloud(c, cx, cy, rw, lit) {
    var D = lit ? '#6a6a96' : '#454564', M = lit ? '#8c8cb8' : '#5e5e84', H = lit ? '#d0d0f0' : '#9494b8';
    ell(c, cx, cy, rw, 3, D); ell(c, cx - rw + 3, cy - 1, 4, 3, M); ell(c, cx + rw - 3, cy - 1, 4, 3, M);
    ell(c, cx - 2, cy - 3, rw - 4, 3, M); ell(c, cx + 2, cy - 4, 4, 3, M);
    ell(c, cx - 3, cy - 4, 3, 2, H); R(c, cx - rw + 2, cy - 2, 2, 1, H);
    R(c, cx - rw + 2, cy + 3, rw * 2 - 3, 1, D);
  }
  function storm(lv, fire) {
    var s = sheet(), c = s.c, cx = 12, bh = [6, 7, 8][lv], th = [10, 12, 13][lv];
    var cy = base(c, cx, 20, ds(9), hs(bh), P.rock);
    masonry(c, cx, BY, 20, hs(bh), P.rock);
    if (lv === 2) band(c, cx, BY - hs(bh), 20, GOLD, GOLD_HI);
    var wby = cy + 3, y = slab(c, cx, cy, 12, ds(7), hs(th), P.black);
    masonry(c, cx, wby, 12, hs(th), P.black);
    R(c, cx - 1, wby - th + 4, 2, 5, '#0a0a10'); R(c, cx - 1, wby - th + 6, 1, 2, '#ffe14d');       // 細い窓（きいろく光る）
    if (lv >= 1) { band(c, cx, wby - 3, 12, P.iron.f, P.iron.hi); band(c, cx, wby - th + 1, 12, lv === 2 ? GOLD : P.iron.f, lv === 2 ? GOLD_HI : P.iron.hi); }
    if (lv === 2) rivets(c, cx, wby - 3, 12, 3);
    // 上の台と避雷針
    y = slab(c, cx, y, 16, ds(8), hs(2), P.iron);
    if (lv >= 1) band(c, cx, y + 4, 16, lv === 2 ? GOLD : P.iron.hi);
    var rod = [4, 5, 5][lv];
    R(c, cx, y - rod, 1, rod, P.metal.t); R(c, cx - 1, y - 1, 3, 1, P.metal.f);
    R(c, cx, y - rod - 1, 1, 1, '#ffe14d');
    // 雷雲：避雷針の上に浮かぶ。攻撃中は明るく光り、稲妻が走る
    var cyc = y - rod - 6 - lv;
    cloud(c, cx, cyc, 8, fire);
    R(c, cx, cyc + 4, 2, 1, '#ffe14d'); R(c, cx - 1, cyc + 5, 2, 1, '#ffe14d'); R(c, cx, y - rod - 2, 1, 1, '#ffe14d');
    if (fire) { R(c, cx, cyc + 4, 1, 1, '#ffffff'); R(c, cx - 1, cyc + 5, 1, 1, '#ffffff'); R(c, cx, cyc + 6, 1, y - rod - 2 - cyc - 6, '#fff6a0'); R(c, cx - 10, cyc + 1, 1, 3, '#ffffff'); R(c, cx + 9, cyc + 2, 1, 3, '#ffe14d'); }
    if (lv === 2) { R(c, cx - 4, cyc - 6, 1, 1, GOLD_HI); R(c, cx + 5, cyc - 5, 1, 1, GOLD); }
    flag(c, cx + 9, cy - 2, [13, 16, 18][lv], lv, true);
    return trim(s);
  }

  // ---------- 種類ごとの作り方（ここに描き足していく） ----------
  var MAKERS = {
    archer: archer,
    cannon: function (lv, fire) { var r = cannonR(lv, fire); return { r: r, l: flip(r) }; },
    frost: frost,
    bowman: bowman,
    sling: sling,
    watch: watch,
    dart: dart,
    sniper: function (lv, fire) { var r = sniperR(lv, fire); return { r: r, l: flip(r) }; },
    fire: fire_,
    thunder: thunder,
    poison: poison,
    mage: mage,
    storm: storm
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

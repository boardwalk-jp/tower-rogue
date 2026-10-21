// 描画：小さなドット画面（312×300）に描いてから拡大表示する。1マス＝24×18ドット（疑似3D、見る角度48°）
'use strict';
var G = window.G = window.G || {};

(function () {
  var TW = 24, TH = 18, OY = 22, SLAB = 8;   // OY：地面の上の余白（背の高い絵がはみ出す所）、SLAB：地面の下の厚み
  var W = G.MAP.cols * TW, H = G.MAP.rowsN * TH + OY + SLAB;
  var DA = G.DotArt, ART = DA.build();   // DA：ドット絵の道具、ART：作り置きした背景の絵
  var buf = document.createElement('canvas'); buf.width = W; buf.height = H;
  var b = buf.getContext('2d');
  var bgCache = {}, M = G.MAPS.field;   // M：今描いているマップ
  var parts = [], rings = [], floats = [], nums = [], beams = [], glows = [];
  // 手ごたえの演出：画面のゆれ（shake：強さ）と白い光（flash：0〜1）
  var fx = { shake: 0, flash: 0, castleHit: 0 };
  function addShake(v) { fx.shake = Math.max(fx.shake, v); }

  function sx(x) { return x * TW; }
  function sy(y) { return y * TH + OY; }
  function hash(x, y) {
    var h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function blitB(img, x, y) { // 下の真ん中を (x, y) に合わせて描く
    b.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height));
  }

  // ---- 3×5ドットの数字（お金・ダメージ表示用） ----
  var DIG = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
    '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010',
    '8': '111101111101111', '9': '111101111001111', '+': '000010111010000', '-': '000000111000000'
  };
  function text(str, x, y, col) {
    str = String(str);
    var w = str.length * 4 - 1; x = Math.round(x - w / 2); y = Math.round(y);
    for (var n = 0; n < str.length; n++) {
      var d = DIG[str[n]]; if (!d) continue;
      for (var i = 0; i < 15; i++) if (d[i] === '1') {
        var px = x + n * 4 + (i % 3), py = y + Math.floor(i / 3);
        b.fillStyle = '#120d08'; b.fillRect(px + 1, py + 1, 1, 1);
        b.fillStyle = col; b.fillRect(px, py, 1, 1);
      }
    }
  }

  // ---- 地域ごとの色 ----
  // 草原は試作「ドット疑似3D」と同じ色。雪山・火山は、草原の色を替えただけにせず、地面の質感から別に作った
  //   雪山：やわらかい雪の起伏（光が左上から当たる）／踏み固めた雪の道／凍った湖
  //   火山：黒い岩の地面と赤くひかる割れ目／灰色の焼けた道／ふちが光る溶岩
  var THEMES = {
    grass: {
      g: ['#5a9846', '#356430', '#468338', '#417a37'], gB: ['#528f40', '#2f5d2a', '#3f7a34', '#3a6f31'],
      road: { hi: '#b08a5c', dark: '#94724a', base: '#a07e52', rimUp: ['#6f5436', '#5e4a2e'], rimDn: ['#cfa874', '#c09a66'], inner: '#8a6a42' },
      verge: ['#7a8a44', '#6a7c3a', '#4f8a3e'], pebHi: '#d8c39a', pebLo: '#6b5235', blade: '#3f7a34', tuft: '#2c5a28', fl: ['#f4e36a', '#f0f0f0'],
      slab: ['#9a7a50', '#5a4028', '#7a5a3a', '#624630', '#3e2c1c'], stn: ['#9a958a', '#74706a', '#85807a', '#8c877f'], stnLine: '#6a665e',
      lake: { c: ['#7cc4ee', '#4a98d0', '#3a7cb8'], t: [0.1, 0.4], rim: ['#d8ecf8', '#a8cce4'] }
    },
    snow: {
      g: [], gB: [],
      road: { hi: '#bcbbc3', dark: '#868590', base: '#a2a1a9', rimUp: ['#6a6874', '#585664'], rimDn: ['#ffffff', '#eef3f9'], inner: '#94939d' },
      verge: ['#d6dadd', '#c6cccf', '#e2e7ec'], pebHi: '#f0f4f8', pebLo: '#6c7484', blade: '#ffffff', tuft: '#8e937c', fl: ['#ffffff', '#c4e6fa'],
      slab: ['#f4f8fc', '#c4d2e2', '#8fa0b4', '#6c7c92', '#4a586c'], stn: ['#a6abb6', '#8b919e', '#979dab', '#9aa0ad'], stnLine: '#757c8a',
      lake: { c: ['#e6f6ff', '#bde2f4', '#9ccbe6'], t: [0.1, 0.4], rim: ['#ffffff', '#e2ecf6'] }
    },
    volcano: {
      g: [], gB: [],
      road: { hi: '#7a6d69', dark: '#4a4140', base: '#5f5654', rimUp: ['#120a08', '#1e130f'], rimDn: ['#94806f', '#826f61'], inner: '#544b49' },
      verge: ['#4a3d3c', '#3d3234', '#54484a'], pebHi: '#a08a72', pebLo: '#1e1410', blade: '#54484a', tuft: '#171011', fl: ['#ff8a2a', '#ffd84a'],
      slab: ['#6a5650', '#3a2a26', '#4a3a34', '#2e211e', '#1a1210'], stn: ['#5e5052', '#463a3d', '#524548', '#4c4144'], stnLine: '#2e2426',
      lake: { c: ['#ffe98a', '#ffb030', '#ff7a24', '#d84418'], t: [0.1, 0.4], rim: ['#2a1410', '#3a1c14'] }
    }
  };
  var SNOW_G = ['#ffffff', '#f6f9fd', '#ecf2f9', '#dbe5f1', '#c6d4e6'];          // 雪の地面：いちばん明るい→影
  var VOL_G = ['#4a3e40', '#3a3032', '#2e2527', '#241c1e', '#191214'];           // 火山の地面：明るい→暗い

  // ---- 地面（草・道・湖・砦の敷地）と、木・岩の一覧を作り置き ----
  // 道と湖は「なめらかな地図」で形を決める：マスの角を丸め、ふちを少しゆらして、地面となじませる
  // いちばん上の余白（OY）にも地面と道を続けて描く（入口は洞穴ではなく、画面の上から地続き）
  function buildBg() {
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var g = cv.getContext('2d'), theme = M.theme || 'grass', th = THEMES[theme], rd = th.road, tx, ty, px, py, i, j, k;
    g.fillStyle = '#0d120e'; g.fillRect(0, 0, W, H);
    var MW = M.cols * TW, MH = M.rowsN * TH, HH = OY + MH;
    function charAt(x, y) { return (y < 0 || y >= M.rowsN || x < 0 || x >= M.cols) ? null : M.rows[y][x]; }
    function isGate(c) { return c === 'A' || c === 'B' || c === 'C'; }
    function isRoadCh(c) { return c === '#' || c === 'G' || isGate(c); }
    function vn(x, y) {
      var x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      var a = hash(x0, y0 + 31), b2 = hash(x0 + 1, y0 + 31), c2 = hash(x0, y0 + 32), d = hash(x0 + 1, y0 + 32);
      return (a + (b2 - a) * fx) * (1 - fy) + (c2 + (d - c2) * fx) * fy;
    }
    // 0以上＝その地形（道・湖）。まわり半径0.78マスの平均で角を丸め、ノイズでふちをゆらす
    function smooth(isMine) {
      var mask = [], F = new Float32Array(MW * MH), RAD = 0.78, offs = [-1, -0.67, -0.33, 0, 0.33, 0.67, 1], oa, ob, smp = [];
      for (oa = 0; oa < 7; oa++) for (ob = 0; ob < 7; ob++) if (offs[oa] * offs[oa] + offs[ob] * offs[ob] <= 1.02) smp.push(offs[oa] * RAD, offs[ob] * RAD);   // 見る点（円の中の37か所）を先に出しておく
      var nS = smp.length / 2, rowsN = M.rowsN, cols = M.cols;
      for (j = -1; j <= rowsN; j++) { var mr = []; for (i = -1; i <= cols; i++) mr.push(isMine(M.rows[j < 0 ? 0 : j >= rowsN ? rowsN - 1 : j][i < 0 ? 0 : i >= cols ? cols - 1 : i]) ? 1 : 0); mask.push(mr); }   // ふちは外側を同じ値でのばす（上の余白では入口の道が上まで続く）
      for (py = 0; py < MH; py++) for (px = 0; px < MW; px++) {
        var u = (px + 0.5) / TW, v = (py + 0.5) / TH, sum = 0, q;
        for (q = 0; q < nS; q++) sum += mask[((v + smp[q * 2 + 1]) | 0) + (v + smp[q * 2 + 1] < 0 ? -1 : 0) + 1][((u + smp[q * 2]) | 0) + (u + smp[q * 2] < 0 ? -1 : 0) + 1];
        var n = vn(px / 8, py / 7) * 0.6 + vn(px / 3 + 40, py / 2.6) * 0.4;
        F[py * MW + px] = sum / nS - 0.5 - (n - 0.5) * 0.34;
      }
      return function (x, y) { x = x < 0 ? 0 : x >= MW ? MW - 1 : x; y = y < 0 ? 0 : y >= MH ? MH - 1 : y; return F[y * MW + x]; };
    }
    var hasLake = M.rows.join('').indexOf('L') >= 0;
    var fr = smooth(isRoadCh), fl = hasLake ? smooth(function (c) { return c === 'L'; }) : function () { return -1; };
    function plazaAt(x, y) { var c = charAt(Math.floor(x / TW), Math.floor(y / TH)); return c === 'X' || c === 'G'; }

    // 雪・火山の地面の起伏（なめらかなノイズ）。となりの点との差で「光の当たり方」を出す（左上から光）
    var ST = MW + 2, HF = null;
    if (theme !== 'grass') {
      HF = new Float32Array(ST * (HH + 2));
      var sn = theme === 'snow';
      for (py = 0; py < HH + 2; py++) for (px = 0; px < ST; px++)
        HF[py * ST + px] = sn ? vn(px / 24, py / 17) * 0.7 + vn(px / 10 + 50, py / 7.5) * 0.3 : vn(px / 18, py / 13) * 0.65 + vn(px / 7 + 50, py / 5.5) * 0.35;
    }
    function edgeUp(mx, my) { return fr(mx, my - 1) < 0 || fr(mx - 1, my) < 0; }
    function edgeDn(mx, my) { return fr(mx, my + 1) < 0 || fr(mx + 1, my) < 0; }
    function roadRim(mx, my, h) { return edgeUp(mx, my) ? (h < 0.5 ? rd.rimUp[0] : rd.rimUp[1]) : edgeDn(mx, my) ? (h < 0.5 ? rd.rimDn[0] : rd.rimDn[1]) : rd.base; }

    // ---- 1ドットの色（草原） ----
    function pGrass(mx, my, h, gr, pal) {
      var col;
      if (gr >= 0) {
        col = h < 0.11 ? rd.hi : (h >= 0.15 && h < 0.19) ? rd.dark : rd.base;
        if (gr < 0.07) col = roadRim(mx, my, h); else if (gr < 0.12 && h < 0.4) col = rd.inner;
      } else if (hasLake && fl(mx, my) >= 0) {
        var lk = th.lake, lg = fl(mx, my);
        col = lg < 0.07 ? (h < 0.5 ? lk.rim[0] : lk.rim[1]) : h < lk.t[0] ? lk.c[0] : h < lk.t[1] ? lk.c[1] : lk.c[2];
      } else {
        col = h < 0.1 ? pal[0] : h < 0.2 ? pal[1] : h < 0.26 ? pal[2] : pal[3];
        if (gr > -0.09) col = h < 0.45 ? th.verge[0] : h < 0.7 ? th.verge[1] : col;            // 道ぎわは土まじりの地面
        else if (gr > -0.17 && h < 0.3) col = th.verge[2];
      }
      return col;
    }
    // ---- 1ドットの色（雪山） ----
    function pSnow(mx, my, h, gr) {
      var m = vn(mx / 9 + 11, my / 7 + 3), lg = hasLake ? fl(mx, my) : -1, col, lk = th.lake;
      if (gr >= 0) {                                   // 踏み固めた雪の道：大きなまだら＋ところどころ小さな点
        if (gr < 0.07) return roadRim(mx, my, h);
        col = m > 0.6 ? rd.hi : m < 0.38 ? rd.dark : rd.base;
        if (h < 0.025) col = rd.hi; else if (h > 0.985) col = rd.dark; else if (gr < 0.12 && h < 0.4) col = rd.inner;
        return col;
      }
      if (lg >= 0) {                                   // 凍った湖：なめらかな氷、ななめの光のすじ、細いひび
        if (lg < 0.07) return h < 0.5 ? lk.rim[0] : lk.rim[1];
        var streak = ((mx + my * 2 + Math.floor(vn(mx / 14, my / 9) * 14)) % 19 + 19) % 19;
        col = m > 0.55 ? lk.c[1] : lk.c[2];
        if (streak < 1.2) col = lk.c[0];
        var ck = Math.abs(vn(mx / 8 + 80, my / 6 + 12) - 0.5);
        if (ck < 0.013 && lg > 0.12) col = '#76add0';
        return col;
      }
      var idx = (my + OY) * ST + mx, hf = HF[idx], lit = hf - HF[idx + ST + 1];
      col = hf > 0.56 ? SNOW_G[1] : SNOW_G[2];
      if (lit > 0.026) col = hf > 0.56 ? SNOW_G[0] : SNOW_G[1];
      else if (lit < -0.026) col = lit < -0.055 ? SNOW_G[4] : SNOW_G[3];
      if (h < 0.004) col = '#ffffff';
      if (gr > -0.09) col = h < 0.4 ? th.verge[0] : h < 0.7 ? th.verge[1] : col;      // 道ぎわは雪がうすく、土やよごれが見える
      else if (gr > -0.17 && h < 0.3) col = th.verge[2];
      if (hasLake && lg > -0.1) col = h < 0.6 ? '#ffffff' : '#eef4fa';                // 湖のふちは雪が盛り上がる
      return col;
    }
    // ---- 1ドットの色（火山） ----
    function pVolc(mx, my, h, gr) {
      var m = vn(mx / 9 + 11, my / 7 + 3), lg = hasLake ? fl(mx, my) : -1, col, lk = th.lake;
      if (gr >= 0) {                                   // 焼けた灰色の道：まだら＋ときどき火の粉
        if (gr < 0.07) return roadRim(mx, my, h);
        col = m > 0.6 ? rd.hi : m < 0.38 ? rd.dark : rd.base;
        if (h < 0.025) col = rd.hi; else if (h > 0.985) col = rd.dark; else if (gr < 0.12 && h < 0.4) col = rd.inner;
        if (h > 0.9985) col = '#ff8a2a';
        return col;
      }
      if (lg >= 0) {                                   // 溶岩：明るい流れ、ところどころ黒く固まった面
        if (lg < 0.07) return h < 0.5 ? lk.rim[0] : lk.rim[1];
        var q = vn(mx / 7, my / 5) * 0.6 + vn(mx / 3 + 20, my / 2.4) * 0.4;
        col = q > 0.68 ? lk.c[0] : q > 0.52 ? lk.c[1] : q > 0.36 ? lk.c[2] : lk.c[3];
        var cr = vn(mx / 9 + 70, my / 6 + 5);
        if (cr > 0.74 && lg > 0.12) col = cr > 0.8 ? '#2e1a14' : '#4a2a1c';
        return col;
      }
      var idx = (my + OY) * ST + mx, hf = HF[idx], lit = hf - HF[idx + ST + 1], bi = hf > 0.6 ? 1 : hf > 0.42 ? 2 : 3;
      if (lit > 0.03) bi--; else if (lit < -0.03) bi++;
      col = VOL_G[bi < 0 ? 0 : bi > 4 ? 4 : bi];
      var cn = Math.abs(vn(mx / 10 + 3, my / 8 + 7) - 0.5), zone = vn(mx / 28 + 5, my / 22 + 2);
      if (zone > 0.68 && gr < -0.1 && (!hasLake || lg < -0.14)) { if (cn < 0.005) col = '#ffb040'; else if (cn < 0.011) col = '#ff6a2a'; else if (cn < 0.017) col = '#4e2018'; }
      else if (h < 0.0012) col = '#ff8a2a';
      if (gr > -0.09) col = h < 0.45 ? th.verge[0] : h < 0.7 ? th.verge[1] : col;
      else if (gr > -0.17 && h < 0.3) col = th.verge[2];
      if (hasLake && lg > -0.07) col = h < 0.5 ? '#9a421e' : '#7a3018';                // 溶岩のまわりは赤く照らされる
      else if (hasLake && lg > -0.15) col = h < 0.5 ? '#5e2a1c' : col;
      return col;
    }
    var paint = theme === 'snow' ? pSnow : theme === 'volcano' ? pVolc : pGrass;

    // 地面・道・湖・砦の敷地（上の余白から）
    for (py = -OY; py < MH; py++) {
      ty = Math.floor(py / TH);
      for (px = 0; px < MW; px++) {
        tx = Math.floor(px / TW);
        var ch = ty < 0 ? '.' : M.rows[ty][tx], plaza = ch === 'X' || ch === 'G', hh = hash(px, py + 99), col;
        if (plaza) {
          col = hh < 0.1 ? th.stn[0] : hh < 0.2 ? th.stn[1] : hh < 0.26 ? th.stn[2] : th.stn[3];
          if (theme === 'snow' && hh > 0.965) col = '#f4f8fc';
          if (theme === 'volcano' && hh > 0.992) col = '#ff6a2a';
        } else col = paint(px, py, hh, fr(px, py), (tx + ty) & 1 ? th.g : th.gB);
        g.fillStyle = col; g.fillRect(px, OY + py, 1, 1);
      }
    }
    // 砦の敷地の石のつなぎ目、草のはっぱ・小さな花など
    for (ty = -2; ty < M.rowsN; ty++) for (tx = 0; tx < M.cols; tx++) {
      var c0 = ty < 0 ? '.' : M.rows[ty][tx], pl = c0 === 'X' || c0 === 'G', x0 = tx * TW, y0 = sy(ty);
      if (pl) { g.fillStyle = th.stnLine; g.fillRect(x0, y0 + (TH >> 1), TW, 1); g.fillRect(x0 + (TW >> 1), y0, 1, TH >> 1); }
      else if (!isRoadCh(c0) && c0 !== 'L') {
        var gx, gy, fx, fy;
        if (hash(tx, ty) < 0.55) {   // 草のはっぱ（雪山＝かれ草、火山＝かれ枝）
          gx = x0 + 3 + Math.floor(hash(ty, tx) * 16); gy = y0 + 3 + Math.floor(hash(tx + 7, ty) * (TH - 6));
          if (fr(gx, gy - OY) < -0.2 && fl(gx, gy - OY) < -0.2) { g.fillStyle = th.tuft; g.fillRect(gx, gy, 1, 2); g.fillRect(gx + 1, gy + 1, 1, 1); g.fillRect(gx - 1, gy + 1, 1, 1); }
        }
        if (hash(tx, ty + 3) < 0.28) {   // 小さな花（雪山＝きらきら、火山＝火の粉）
          fx = x0 + 3 + Math.floor(hash(ty + 5, tx) * 17); fy = y0 + 2 + Math.floor(hash(tx + 9, ty) * (TH - 4));
          if (fr(fx, fy - OY) < -0.2 && fl(fx, fy - OY) < -0.2) { g.fillStyle = hash(tx, ty + 8) < 0.5 ? th.fl[0] : th.fl[1]; g.fillRect(fx, fy, 1, 1); }
        }
      }
    }
    // 道の上の小石と、ふちのはみ出し
    for (py = -OY + 2; py < MH - 2; py++) for (px = 2; px < MW - 2; px++) {
      var gg = fr(px, py), hh2 = hash(px * 3 + 1, py * 5 + 7);
      if (hh2 >= 0.05 || plazaAt(px, py) || (hasLake && fl(px, py) >= -0.1)) continue;
      if (gg > 0.18 && hh2 < 0.012) { g.fillStyle = th.pebHi; g.fillRect(px, OY + py, 2, 1); g.fillStyle = th.pebLo; g.fillRect(px, OY + py + 1, 2, 1); }
      else if (gg < 0 && gg > -0.1) { g.fillStyle = th.blade; g.fillRect(px, OY + py - 1, 1, 2); }
    }
    // 地面の下の厚み
    var yb = OY + M.rowsN * TH;
    for (j = 0; j < SLAB; j++) for (px = 0; px < W; px++) {
      var hs2 = hash(px >> 1, j + 400);
      g.fillStyle = j === 0 ? th.slab[0] : hs2 < 0.15 ? th.slab[1] : j < 3 ? th.slab[2] : j < 6 ? th.slab[3] : th.slab[4];
      g.fillRect(px, yb + j, 1, 1);
    }
    // 橋：道が十字に交わるマス。先に通る道が橋の上、あとから通る道が橋の下をくぐる
    (M.bridges || []).forEach(function (br) { drawBridge(g, br); });
    // 木・岩：敵やタワーと重なりを正しくするため、絵の一覧にして描く時に並べ替える
    var statics = [], tree = theme === 'snow' ? ART.pine : theme === 'volcano' ? ART.spire : ART.tree;
    for (ty = 0; ty < M.rowsN; ty++) for (tx = 0; tx < M.cols; tx++) {
      var c = M.rows[ty][tx];
      if (c === 'T') statics.push({ spr: tree[hash(tx, ty) < 0.5 ? 0 : 1], x: tx + 0.5, y: ty + 0.62, sh: 9 });
      else if (c === 'R') statics.push({ spr: ART.rock[theme], x: tx + 0.5, y: ty + 0.6, sh: 8 });
    }
    return { cv: cv, statics: statics };
  }

  // 橋を1つ描く（地面の作り置きに描く）。1マス24×18ドット用
  function drawBridge(g, br) {
    var x0 = br.x * TW, y0 = sy(br.y), stone = M.theme === 'volcano';
    var deck = stone ? '#7a7068' : '#a4743f', seam = stone ? '#58504a' : '#74502a', rail = stone ? '#4a4440' : '#5a3a1e',
        hi = stone ? '#a89c90' : '#d09a5a', face = stone ? '#2e2a28' : '#3e2814', shade = 'rgba(0,0,0,0.38)', i;
    if (br.axis === 'h') {
      // くぐる道（縦）の、橋の下側に影
      g.fillStyle = shade; g.fillRect(x0, y0 + TH, TW, 4);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x0, y0 + TH + 4, TW, 3);
      // 床板（横に進むので、板のつなぎ目は縦線）
      g.fillStyle = deck; g.fillRect(x0 - 1, y0 + 2, TW + 2, TH - 4);
      g.fillStyle = seam; for (i = 2; i < TW; i += 4) g.fillRect(x0 + i, y0 + 3, 1, TH - 6);
      // 手すり（上と下）と柱
      g.fillStyle = hi; g.fillRect(x0 - 1, y0 - 1, TW + 2, 1);
      g.fillStyle = rail; g.fillRect(x0 - 1, y0, TW + 2, 1); g.fillRect(x0 - 1, y0 + TH - 3, TW + 2, 1);
      for (i = 0; i <= TW; i += 7) { g.fillStyle = rail; g.fillRect(x0 - 1 + i, y0 - 3, 2, 4); g.fillRect(x0 - 1 + i, y0 + TH - 4, 2, 3); g.fillStyle = hi; g.fillRect(x0 - 1 + i, y0 - 3, 1, 1); }
      // 橋の前の面（厚み）
      g.fillStyle = face; g.fillRect(x0 - 1, y0 + TH - 2, TW + 2, 3);
      // 橋のたもとの石
      g.fillStyle = '#8d8a84'; g.fillRect(x0 - 3, y0 - 1, 2, TH + 2); g.fillRect(x0 + TW + 1, y0 - 1, 2, TH + 2);
    } else {
      // くぐる道（横）の、橋の左右に影
      g.fillStyle = shade; g.fillRect(x0 + TW, y0, 4, TH); g.fillRect(x0 - 3, y0, 3, TH);
      // 床板（縦に進むので、板のつなぎ目は横線）
      g.fillStyle = deck; g.fillRect(x0 + 2, y0 - 1, TW - 4, TH + 2);
      g.fillStyle = seam; for (i = 2; i < TH + 1; i += 4) g.fillRect(x0 + 3, y0 + i, TW - 6, 1);
      g.fillStyle = rail; g.fillRect(x0, y0 - 1, 3, TH + 2); g.fillRect(x0 + TW - 3, y0 - 1, 3, TH + 2);
      g.fillStyle = hi; g.fillRect(x0, y0 - 1, 1, TH + 2); g.fillRect(x0 + TW - 3, y0 - 1, 1, TH + 2);
      for (i = -1; i <= TH; i += 5) { g.fillStyle = face; g.fillRect(x0 - 1, y0 + i, 1, 3); g.fillRect(x0 + TW, y0 + i, 1, 3); }
    }
  }
  // 敵が橋の下をくぐっている途中か（そのマスにいて、橋と違う向きに歩いている）
  function underBridge(s, e) {
    if (e.fly || !M.bridges || !M.bridges.length) return null;
    var tx = Math.floor(e.x), ty = Math.floor(e.y), br = null;
    for (var i = 0; i < M.bridges.length; i++) if (M.bridges[i].x === tx && M.bridges[i].y === ty) br = M.bridges[i];
    if (!br) return null;
    var P = s.paths && s.paths[e.gate]; if (!P) return null;
    for (var j = 0; j < P.segs.length; j++) {
      var sg = P.segs[j];
      if (e.d <= sg.s + sg.l || j === P.segs.length - 1) return (sg.a[0] === sg.b[0] ? 'v' : 'h') !== br.axis ? br : null;
    }
    return null;
  }

  function addEvents(events) {
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e.k === 'hit') {
        burst(e.x, e.y - 0.4, 3, e.kind === 'resisted' ? ['#d0d0d8', '#ffffff'] : ['#ff6b5b', '#ffd0c0'], 22, 60, 0.3);
        // ダメージの数字（少し左右にばらして重なりにくく）
        if (nums.length < 120) nums.push({ x: sx(e.x) + (Math.random() - 0.5) * 8, y: sy(e.y) - 16, vy: -22,
          text: String(Math.max(1, Math.round(e.amount))), col: G.DMG_COLORS[e.kind] || G.DMG_COLORS.normal,
          size: e.kind === 'resisted' ? 0.85 : e.amount >= 60 ? 1.45 : e.amount >= 30 ? 1.2 : e.kind === 'combo' ? 1.15 : 1, life: 0.7, ml: 0.7 });
      } else if (e.k === 'blizzard') {
        rings.push({ x: sx(e.x), y: sy(e.y), r: 3, max: e.r * TW, col: '#bfe8ff', life: 0.5, ml: 0.5 });
        for (var bz = 0; bz < 14 && parts.length < 400; bz++) { var ba = Math.random() * Math.PI * 2, br = Math.random() * e.r; parts.push({ x: sx(e.x + Math.cos(ba) * br), y: sy(e.y + Math.sin(ba) * br), vx: 10, vy: 8, g: 0, life: 0.6, ml: 0.6, col: Math.random() < 0.5 ? '#ffffff' : '#bfe8ff' }); }
      } else if (e.k === 'bossHit') {
        // ボスが城をたたく：城が赤く光り、がれきが飛び、画面がゆれる
        fx.castleHit = 0.35; addShake(4);
        burst(e.x, e.y + 0.4, 18, ['#9ca1a7', '#cfc2ab', '#ff5a5a', '#5a5048'], 50, 90, 0.6);
        rings.push({ x: sx(e.x), y: sy(e.y + 0.4), r: 3, max: 22, col: '#ff5a5a', life: 0.35, ml: 0.35 });
        floats.push({ x: sx(e.x) + 6, y: sy(e.y) - 4, text: '-' + e.life, col: '#ff5a5a', life: 1.2, heart: true });
      } else if (e.k === 'bossArrive') {
        addShake(3); rings.push({ x: sx(e.x), y: sy(e.y), r: 4, max: 34, col: '#ff4d3a', life: 0.6, ml: 0.6 });
      } else if (e.k === 'summon') {
        burst(e.x, e.y - 0.8, 16, ['#c79bff', '#6f4cc0', '#ffffff'], 40, -10, 0.6);
        rings.push({ x: sx(e.x), y: sy(e.y), r: 4, max: 26, col: '#c79bff', life: 0.5, ml: 0.5 });
        addShake(1.5);
      } else if (e.k === 'tfreeze') {
        rings.push({ x: sx(e.x), y: sy(e.y), r: 4, max: 30, col: '#9ae0ff', life: 0.5, ml: 0.5 });
        burst(e.x, e.y - 0.8, 14, ['#d8f4ff', '#7ad0ff', '#ffffff'], 40, -10, 0.6);
        (e.towers || []).forEach(function (t) { burst(t.x, t.y - 0.3, 12, ['#d8f4ff', '#7ad0ff', '#ffffff'], 30, 0, 0.5); rings.push({ x: sx(t.x), y: sy(t.y), r: 2, max: 14, col: '#9ae0ff', life: 0.4, ml: 0.4 }); });
        addShake(1.5);
      } else if (e.k === 'healcast') {
        rings.push({ x: sx(e.x), y: sy(e.y), r: 3, max: e.r * TW, col: '#7fe06a', life: 0.45, ml: 0.45 });
      } else if (e.k === 'healed') {
        burst(e.x, e.y - 0.5, 4, ['#7fe06a', '#d8ffd0'], 14, -20, 0.4);
        if (nums.length < 120) nums.push({ x: sx(e.x), y: sy(e.y) - 18, vy: -16, text: '+' + Math.round(e.amount), col: '#7fe06a', size: 0.85, life: 0.7, ml: 0.7 });
      } else if (e.k === 'plague') {
        burst(e.x, e.y - 0.3, 14, ['#a6e85a', '#4a8a2a', '#d8ffb0'], 34, 0, 0.6);
        rings.push({ x: sx(e.x), y: sy(e.y), r: 2, max: 1.2 * TW, col: '#a6e85a', life: 0.4, ml: 0.4 });
      } else if (e.k === 'kill') {
        if (e.boss) { addShake(5); fx.flash = 0.8; burst(e.x, e.y - 1, 40, ['#ffffff', '#ffe14d', '#ff9a3a'], 70, 40, 1.0); }
        else if (e.big) { addShake(2); burst(e.x, e.y - 0.6, 18, ['#ffffff', '#ffe14d'], 44, 60, 0.6); }
        var cols = e.type === 'slime' ? ['#5cc350', '#b6f29a'] : e.type === 'goblin' ? ['#8bc34a', '#7a5230'] : ['#6e9a4e', '#a0a0aa'];
        burst(e.x, e.y - 0.4, 12, cols, 40, 90, 0.6);
        nums.push({ x: sx(e.x), y: sy(e.y) - 22, vy: -14, text: '+' + e.gold, col: '#ffd84a', size: 0.9, life: 0.9, ml: 0.9, coin: true });
      } else if (e.k === 'boom') {
        if (e.small) burst(e.x, e.y, 6, ['#9ca1a7', '#cfc2ab', '#6b5235'], 26, 60, 0.35);
        else { burst(e.x, e.y, 14, ['#ffb347', '#ffe08a', '#ff6b3a', '#5a5048'], 50, 40, 0.5); addShake(e.r >= 1.4 ? 2.5 : 1); }
        rings.push({ x: sx(e.x), y: sy(e.y), r: 2, max: e.r * TW, col: e.small ? '#cfc2ab' : '#ffcf6a', life: 0.3, ml: 0.3 });
      } else if (e.k === 'spawn') { // 入口（画面の上）から現れた時：ボスだけ衝撃を出す
        if (e.boss) { addShake(4); rings.push({ x: sx(e.x), y: sy(e.y), r: 4, max: 40, col: '#ff4d3a', life: 0.7, ml: 0.7 }); }
      } else if (e.k === 'chain') {
        beams.push({ x0: sx(e.x0), y0: sy(e.y0), x1: sx(e.x1), y1: sy(e.y1), life: 0.18 });
      } else if (e.k === 'flame') {
        burst(e.x, e.y, 10, ['#ff6a2a', '#ffd84a', '#ff3a1a'], 34, -30, 0.45);
      } else if (e.k === 'revive') {
        burst(e.x, e.y - 0.5, 12, ['#e8e2d0', '#bff0ff'], 30, -10, 0.6);
        nums.push({ x: sx(e.x), y: sy(e.y) - 24, vy: -12, text: '復活', col: '#e8e2d0', size: 0.9, life: 1, ml: 1 });
      } else if (e.k === 'income') {
        nums.push({ x: sx(e.x), y: sy(e.y) - 14, vy: -14, text: '+' + e.gold, col: '#ffd84a', size: 1, life: 1.2, ml: 1.2 });
      } else if (e.k === 'relic' && e.x !== undefined) {
        nums.push({ x: sx(e.x), y: sy(e.y) - 22, vy: -12, text: G.RELICS[e.id].name, col: '#ffd84a', size: 0.85, life: 1.2, ml: 1.2 });
      } else if (e.k === 'frost') {
        burst(e.x, e.y, 6, ['#bff0ff', '#ffffff', '#5fc8ff'], 26, 10, 0.35);
      } else if (e.k === 'splat') {
        burst(e.x, e.y, 5, ['#a6e85a', '#4a8a2a'], 20, 40, 0.35);
      } else if (e.k === 'skill') {
        if (e.x !== null) { burst(e.x, e.y - 0.8, 14, [G.UP_COLOR, '#ffffff', '#ffd0c0'], 30, -20, 0.6); rings.push({ x: sx(e.x), y: sy(e.y), r: 3, max: 16, col: G.UP_COLOR, life: 0.45, ml: 0.45 }); }
      } else if (e.k === 'broken') {
        burst(e.x, e.y, 14, ['#8a5a2b', '#c08a4a', '#5a3a1e'], 40, 80, 0.6);
      } else if (e.k === 'soldierDown') {
        burst(e.x, e.y - 0.3, 8, ['#c0c8d8', '#ff6b5b'], 26, 60, 0.5);
      } else if (e.k === 'zap') {
        burst(e.x, e.y, 6, ['#c79bff', '#ffffff', '#9be7ff'], 30, 0, 0.35);
      } else if (e.k === 'leak') {
        floats.push({ x: sx(e.x), y: sy(e.y) - 20, text: '-' + e.life, col: '#ff5a5a', life: 1.2, heart: true });
        addShake(e.life >= 3 ? 3.5 : 1.5);
      } else if (e.k === 'upgrade') {
        // 強化：光の柱に包まれ、きらきらが上っていく
        glows.push({ x: e.x, y: e.y, id: e.id, life: 1.0, ml: 1.0 });
        burst(e.x, e.y - 0.6, 22, ['#fff6c0', '#ffe14d', '#ffffff', G.UP_COLOR], 30, -50, 0.9);
        rings.push({ x: sx(e.x), y: sy(e.y), r: 3, max: 20, col: '#ffe14d', life: 0.55, ml: 0.55 });
      } else if (e.k === 'build') {
        burst(e.x, e.y, 14, e.k === 'build' ? ['#e8e0c8', '#a39581'] : ['#ffe14d', '#ffffff'], 35, 30, 0.5);
        rings.push({ x: sx(e.x), y: sy(e.y), r: 3, max: 14, col: e.k === 'build' ? '#ffffff' : '#ffe14d', life: 0.4, ml: 0.4 });
      }
    }
  }
  function burst(x, y, n, cols, spd, grav, life) {
    for (var i = 0; i < n && parts.length < 400; i++) {
      var a = Math.random() * Math.PI * 2, v = spd * (0.35 + Math.random() * 0.75);
      parts.push({ x: sx(x), y: sy(y), vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.75 - spd * 0.4,
                   g: grav, life: life, ml: life, col: cols[(Math.random() * cols.length) | 0] });
    }
  }
  function stepFx(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (i = rings.length - 1; i >= 0; i--) { rings[i].life -= dt; if (rings[i].life <= 0) rings.splice(i, 1); }
    for (i = floats.length - 1; i >= 0; i--) { floats[i].life -= dt; floats[i].y -= dt * 14; if (floats[i].life <= 0) floats.splice(i, 1); }
    for (i = beams.length - 1; i >= 0; i--) { beams[i].life -= dt; if (beams[i].life <= 0) beams.splice(i, 1); }
    for (i = glows.length - 1; i >= 0; i--) { glows[i].life -= dt; if (glows[i].life <= 0) glows.splice(i, 1); }
    for (i = nums.length - 1; i >= 0; i--) { var n = nums[i]; n.life -= dt; n.y += n.vy * dt; n.vy *= 0.92; if (n.life <= 0) nums.splice(i, 1); }
  }
  function clearFx() { parts = []; rings = []; floats = []; nums = []; beams = []; glows = []; fx.shake = 0; fx.flash = 0; }
  // 画面のゆれの量（ピクセル）を出して少しずつ弱める
  function shakeOffset(dt) {
    if (fx.flash > 0) fx.flash = Math.max(0, fx.flash - dt * 2.2);
    if (fx.castleHit > 0) fx.castleHit = Math.max(0, fx.castleHit - dt);
    if (fx.shake <= 0.05) { fx.shake = 0; return { x: 0, y: 0 }; }
    var v = fx.shake; fx.shake *= Math.pow(0.02, dt);
    return { x: (Math.random() * 2 - 1) * v, y: (Math.random() * 2 - 1) * v };
  }

  function rangeEllipse(x, y, r, col, t) { // 射程（点線のだ円。草の上でも見えるよう下に黒い影をつける）
    var n = Math.max(32, Math.round(r * 26));
    for (var pass = 0; pass < 2; pass++) {
      b.fillStyle = pass ? col : 'rgba(10,14,10,.7)';
      for (var i = 0; i < n; i++) {
        if ((i + Math.floor(t * 8)) % 4 === 0) continue;
        var a = i / n * Math.PI * 2;
        b.fillRect(Math.round(sx(x) + Math.cos(a) * r * TW) + (pass ? 0 : 1), Math.round(sy(y) + Math.sin(a) * r * TH) + (pass ? 0 : 1), 1, 1);
      }
    }
  }
  function fillEllipse(x, y, r, col, a) {
    b.globalAlpha = a; b.fillStyle = col;
    b.beginPath(); b.ellipse(sx(x), sy(y), r * TW, r * TH, 0, 0, Math.PI * 2); b.fill();
    b.globalAlpha = 1;
  }
  function hpBar(x, y, w, r, col) {
    x = Math.round(x - w / 2); y = Math.round(y);
    b.fillStyle = '#0b0d0a'; b.fillRect(x - 1, y - 1, w + 2, 4);
    b.fillStyle = '#4a1a1a'; b.fillRect(x, y, w, 2);
    b.fillStyle = col; b.fillRect(x, y, Math.max(1, Math.round(w * r)), 2);
  }

  // ui: { selType, selTower, preview:{tx,ty}, time }
  function draw(s, ui, dt) {
    var S = G.SPR, t = ui.time;
    M = s.map;
    stepFx(dt);
    if (!bgCache[M.id]) bgCache[M.id] = buildBg();
    var BG = bgCache[M.id];
    b.drawImage(BG.cv, 0, 0);

    // 置ける場所の表示（カード選択中）
    if (ui.selType && !ui.pending && (s.phase === 'prep' || s.phase === 'attack')) {
      // 道に置く物は明るい道の上でも見えるように、白く濃いめに出す
      var onPath = G.TOWERS[ui.selType].place === 'path';
      b.globalAlpha = (onPath ? 0.75 : 0.45) + 0.25 * Math.sin(t * 6);
      for (var ty = 0; ty < M.rowsN; ty++) for (var tx = 0; tx < M.cols; tx++) {
        if (!G.Battle.canPlaceAt(s, tx, ty, ui.selType)) continue;
        b.fillStyle = onPath ? '#ffffff' : '#fff3b0';
        var hx = tx * TW, hy = sy(ty), HL = 3;   // マスの四すみの印（長さ3ドット）
        b.fillRect(hx + 1, hy + 1, HL, 1); b.fillRect(hx + TW - 1 - HL, hy + 1, HL, 1);
        b.fillRect(hx + 1, hy + TH - 2, HL, 1); b.fillRect(hx + TW - 1 - HL, hy + TH - 2, HL, 1);
      }
      b.globalAlpha = 1;
    }

    // 次の攻撃に空を飛ぶ敵がいれば、飛んでくる線（入口→城のまっすぐ）を点線で出す
    if (s.phase === 'prep') {
      var flyG = {};
      G.Battle.nextWave(s).forEach(function (w) { if (G.ENEMIES[w.type].fly) flyG[w.gate] = true; });
      Object.keys(flyG).forEach(function (k) {
        var P = s.map.paths[k], a = P[0], c = P[P.length - 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.round(L * 5);
        b.fillStyle = '#c79bff';
        for (var q = 0; q < n; q++) { if ((q + Math.floor(t * 6)) % 3 === 0) continue; var f2 = q / n; b.fillRect(Math.round(sx(a[0] + (c[0] - a[0]) * f2)), Math.round(sy(a[1] + (c[1] - a[1]) * f2)) - 6, 1, 1); }
      });
    }
    // 次の攻撃で使われる入口に「！」（タップすると次の敵が見える）
    if (s.phase === 'prep') {
      gatesNext(s).forEach(function (k) {
        var p = M.paths[k][0], gx = Math.round(sx(p[0])), gy = 20 + Math.round(Math.sin(t * 5) * 2);   // 入口の道の、画面の上のふちの近くにういて見える
        var open = ui.gateOpen === k;
        b.fillStyle = '#16120f'; b.fillRect(gx - 7, gy - 19, 14, 18);
        b.fillStyle = open ? '#ffe14d' : '#ff4d3a'; b.fillRect(gx - 5, gy - 17, 10, 14);
        b.fillStyle = '#ffffff'; b.fillRect(gx - 2, gy - 16, 4, 8); b.fillRect(gx - 2, gy - 7, 4, 3);
      });
    }

    // 奥（画面の上）から順に並べて重なりを正しく
    var list = [];
    BG.statics.forEach(function (st) { list.push({ y: st.y, k: 'static', o: st }); });   // 木・岩・洞穴
    s.towers.forEach(function (tw) { list.push({ y: tw.y + (G.TOWERS[tw.type].trap ? -0.45 : 0.2), k: 'tower', o: tw }); });
    s.soldiers.forEach(function (u) { if (u.dead <= 0) list.push({ y: u.y + 0.05, k: 'soldier', o: u }); });
    // 橋の下をくぐる敵は橋より先に描いて、橋で隠す
    (M.bridges || []).forEach(function (br) { list.push({ y: br.y + 0.02, k: 'bridge', o: br }); });
    s.enemies.forEach(function (e) { var ub = underBridge(s, e); list.push({ y: ub ? ub.y + 0.01 : e.y, k: 'enemy', o: e }); });
    var castleAt = null;
    M.rows.forEach(function (r, y) { var x = r.indexOf('G'); if (x >= 0) castleAt = { x: x + 0.5, y: y }; });
    list.push({ y: castleAt.y + 0.4, k: 'castle' });
    list.sort(function (a, c) { return a.y - c.y; });

    for (var i = 0; i < list.length; i++) {
      var it = list[i], o = it.o;
      if (it.k === 'bridge') {
        var bx = o.x * TW - 4, byy = sy(o.y) - 4;
        b.drawImage(BG.cv, bx, byy, TW + 8, TH + 12, bx, byy, TW + 8, TH + 12);
        continue;
      }
      if (it.k === 'static') {
        var stx = Math.round(sx(o.x)), sty = Math.round(sy(o.y));
        DA.ell(b, stx + 3, sty, o.sh, Math.max(2, Math.round(o.sh * TH / TW * 0.8)), 'rgba(0,0,0,.28)');
        b.drawImage(o.spr.cv, stx - o.spr.ax, sty - o.spr.ay);
        continue;
      }
      if (it.k === 'castle') {
        var cpx = Math.round(sx(castleAt.x)), cpy = Math.round(sy(castleAt.y + 1)), cs = ART.castle;
        b.drawImage(cs.cv, cpx - cs.ax, cpy - cs.ay);
        if (fx.castleHit > 0) { b.globalCompositeOperation = 'lighter'; b.globalAlpha = fx.castleHit * 2; b.drawImage(cs.cv, cpx - cs.ax, cpy - cs.ay); b.globalAlpha = 1; b.globalCompositeOperation = 'source-over'; }
        continue;
      }
      if (it.k === 'soldier') {
        var ownT = G.Battle.findTower(s, o.tower), unitK = ownT && G.TOWERS[ownT.type].soldiers.unit || 'soldier';
        var simg = S[unitK][o.swing > 0 ? 1 : 0], sximg = o.face < 0 ? simg.l : simg.r;
        b.fillStyle = 'rgba(0,0,0,.35)'; b.fillRect(sx(o.x) - 3, sy(o.y) + 2, 7, 1);
        blitB(sximg, sx(o.x), sy(o.y) + 3);
        if (o.flash > 0) { b.globalCompositeOperation = 'lighter'; b.globalAlpha = 0.4; blitB(sximg, sx(o.x), sy(o.y) + 3); b.globalAlpha = 1; b.globalCompositeOperation = 'source-over'; }
        if (o.hp < o.max) hpBar(sx(o.x), sy(o.y) + 3 - sximg.height - 3, 8, Math.max(0, o.hp / o.max), '#5fc8ff');
        continue;
      }
      if (it.k === 'tower') {
        var fire = o.fire > 0.12 ? 1 : 0, spr = S[o.type][Math.min(2, o.lv)][fire];
        if (spr.r) spr = o.aim < 0 ? spr.l : spr.r;
        var flat = G.TOWERS[o.type].trap;
        if (!flat) { b.fillStyle = 'rgba(0,0,0,.35)'; b.fillRect(sx(o.x) - 7, sy(o.y) + 3, 14, 2); }
        // タワーを置くカードを選んでいる間は、後ろのマスが見えるようにタワーを半透明にする
        if (ui.selType) b.globalAlpha = 0.45;
        blitB(spr, sx(o.x), sy(o.y) + 5);
        b.globalAlpha = 1;
        // 吹雪の魔女に止められている間：タワーを氷が包む（青い色と氷のかけら）
        if (o.frozenT > 0) {
          b.globalCompositeOperation = 'lighter'; b.globalAlpha = 0.45; blitB(spr, sx(o.x), sy(o.y) + 5); b.globalAlpha = 1; b.globalCompositeOperation = 'source-over';
          var fx0 = sx(o.x), fy0 = sy(o.y) + 5;
          b.fillStyle = '#d8f4ff'; b.fillRect(fx0 - 6, fy0 - 3, 2, 3); b.fillRect(fx0 + 4, fy0 - 5, 2, 4); b.fillRect(fx0 - 1, fy0 - spr.height, 2, 4);
          b.fillStyle = '#7ad0ff'; b.fillRect(fx0 - 7, fy0 - 1, 3, 1); b.fillRect(fx0 + 4, fy0 - 2, 3, 1);
        }
        if (o.maxHp && o.hp < o.maxHp) hpBar(sx(o.x), sy(o.y) + 5 - spr.height - 3, 12, Math.max(0, o.hp / o.maxHp), '#c8a060');
        for (var l = 0; l < o.lv; l++) { b.fillStyle = '#ffe14d'; b.fillRect(sx(o.x) - 3 + l * 4, sy(o.y) + 3, 2, 2); }
        // スキルで強くなっている間は、タワーの上に赤い↑（アップの色）
        if (o.bonusDmg > 0 || o.turnDmgMult > 1 || s.buff.speedMult > 1) {
          var ax = sx(o.x) + 6, ay = sy(o.y) + 5 - spr.height - 2 + Math.round(Math.sin(t * 4 + o.id) * 1);
          b.fillStyle = '#16120f'; b.fillRect(ax - 3, ay - 1, 7, 6);
          b.fillStyle = G.UP_COLOR; b.fillRect(ax, ay, 1, 4); b.fillRect(ax - 1, ay + 1, 3, 1); b.fillRect(ax - 2, ay + 2, 1, 1); b.fillRect(ax + 2, ay + 2, 1, 1);
        }
        // タワー対象のスキルを使う前の仮選択：点滅する枠
        if (ui.pendingTower === o.id) {
          var on = Math.floor(t * 4) % 2 === 0;
          b.fillStyle = on ? '#ffffff' : G.UP_COLOR;
          var bx0 = sx(o.x) - 9, by0 = sy(o.y) + 5 - spr.height - 3, bw = 18, bh = spr.height + 5;
          b.fillRect(bx0, by0, 3, 1); b.fillRect(bx0, by0, 1, 3); b.fillRect(bx0 + bw - 3, by0, 3, 1); b.fillRect(bx0 + bw - 1, by0, 1, 3);
          b.fillRect(bx0, by0 + bh - 1, 3, 1); b.fillRect(bx0, by0 + bh - 3, 1, 3); b.fillRect(bx0 + bw - 3, by0 + bh - 1, 3, 1); b.fillRect(bx0 + bw - 1, by0 + bh - 3, 1, 3);
        }
        continue;
      }
      // 敵
      var E = G.ENEMIES[o.type], fr = Math.floor(o.walk) % 2, es = S[o.type][fr];
      var img = o.face < 0 ? es.l : es.r, ex = sx(o.x), ey = sy(o.y) + 3;
      var born = o.d < 0.8 ? Math.max(0, o.d) / 0.8 : 1;   // 入口から歩いて現れる：最初の0.8マスで少しずつ濃くなる
      if (born < 1) b.globalAlpha = born;
      b.fillStyle = 'rgba(0,0,0,.35)'; b.fillRect(ex - 5, ey - 1, 10, 2);
      if (o.fly) ey -= 7 + Math.round(Math.sin(t * 5 + o.id) * 1.5);   // 空を飛ぶ敵は影から浮かせて描く
      // 城の前のボス：攻撃の時に、のけぞってから城へ体当たりする動き
      if (o.atkAnim > 0) { var ap = 1 - o.atkAnim / 0.45; ey += Math.round(ap < 0.35 ? -ap / 0.35 * 4 : Math.sin((ap - 0.35) / 0.65 * Math.PI) * 7); }
      blitB(img, ex, ey);
      if (o.flash > 0) {
        b.globalCompositeOperation = 'lighter'; b.globalAlpha = 0.6; blitB(img, ex, ey);
        b.globalAlpha = 1; b.globalCompositeOperation = 'source-over';
      }
      // 状態異常：遅い＝青い粒、毒＝緑の泡
      if (o.slowT > 0 && Math.random() < 0.3) parts.push({ x: ex + (Math.random() - 0.5) * 10, y: ey - Math.random() * img.height, vx: 0, vy: 6, g: 0, life: 0.35, ml: 0.35, col: '#bff0ff' });
      if (o.burnT > 0 && Math.random() < 0.4) parts.push({ x: ex + (Math.random() - 0.5) * 8, y: ey - img.height * 0.5, vx: 0, vy: -16, g: 0, life: 0.4, ml: 0.4, col: Math.random() < 0.5 ? '#ff6a2a' : '#ffd84a' });
      if (o.poisonT > 0 && Math.random() < 0.3) parts.push({ x: ex + (Math.random() - 0.5) * 8, y: ey - img.height * 0.6, vx: 0, vy: -10, g: 0, life: 0.5, ml: 0.5, col: '#a6e85a' });
      var barW = E.boss ? 28 : (o.type === 'orc' || o.type === 'knight' || o.type === 'yeti' || o.type === 'kingslime' || o.type === 'wyvern' || o.type === 'shaman' || o.type === 'iceknight' || o.type === 'demon') ? 14 : 10;
      if (o.hp < o.max || E.boss) hpBar(ex, ey - img.height - 3, barW, Math.max(0, o.hp / o.max), o.hp / o.max > 0.5 ? '#7fd36a' : '#ffb347');
      b.globalAlpha = 1;
    }

    // 時止め：画面全体をうすい青に
    if (s.freezeT > 0) { b.globalAlpha = Math.min(0.28, s.freezeT * 0.2); b.fillStyle = '#5fa8ff'; b.fillRect(0, 0, W, H); b.globalAlpha = 1; }
    // タワーの小窓を出している時・スキルの相手を選んでいる時：対象のタワー以外を暗くする
    var focus = null;
    if (ui.selTower) focus = [ui.selTower];
    else if (ui.selSkill && ui.selSkill.target === 'tower') focus = ui.pendingTower ? [ui.pendingTower] : s.towers.map(function (q) { return q.id; });
    if (focus) {
      b.fillStyle = 'rgba(6,8,6,0.62)'; b.fillRect(0, 0, W, H);
      s.towers.forEach(function (tw) {
        if (focus.indexOf(tw.id) < 0) return;
        var sp = S[tw.type][Math.min(2, tw.lv)][0]; if (sp.r) sp = tw.aim < 0 ? sp.l : sp.r;
        blitB(sp, sx(tw.x), sy(tw.y) + 5);
        for (var l = 0; l < tw.lv; l++) { b.fillStyle = '#ffe14d'; b.fillRect(sx(tw.x) - 3 + l * 4, sy(tw.y) + 3, 2, 2); }
      });
    }
    // 強化した時の光：タワーを包む光の柱と、白く光るタワー
    glows.forEach(function (g) {
      var p = 1 - g.life / g.ml, a = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
      var gx = Math.round(sx(g.x)), gy = Math.round(sy(g.y)) + 4, w = Math.round(14 - p * 6), h = 34;
      b.globalCompositeOperation = 'lighter';
      for (var k = 0; k < h; k++) {
        b.globalAlpha = a * 0.55 * (1 - k / h);
        b.fillStyle = k % 3 === 0 ? '#fff6c0' : '#ffd84a';
        b.fillRect(gx - (w >> 1), gy - k, w, 1);
      }
      var tw = G.Battle.findTower(s, g.id);
      if (tw) { var sp = S[tw.type][Math.min(2, tw.lv)][0]; if (sp.r) sp = tw.aim < 0 ? sp.l : sp.r; b.globalAlpha = a * 0.8; blitB(sp, sx(tw.x), sy(tw.y) + 5); }
      b.globalAlpha = 1; b.globalCompositeOperation = 'source-over';
      if (Math.random() < 0.5) parts.push({ x: gx + (Math.random() - 0.5) * 14, y: gy - Math.random() * 20, vx: 0, vy: -24, g: 0, life: 0.5, ml: 0.5, col: Math.random() < 0.5 ? '#ffffff' : '#ffe14d' });
    });
    // 選んだタワーの射程：今の射程＝白、強化後の射程＝アップの赤（強化ボタンと同じ色）
    var selTw = ui.selTower ? G.Battle.findTower(s, ui.selTower) : null;
    if (selTw) {
      var cur = G.Battle.towerStats(selTw).range, nx = G.Battle.nextStats(selTw);
      // 強化後に射程が広がるならアップの赤、縮むならダウンの青
      var nc = nx && (nx.range >= cur ? G.UP_COLOR : G.DOWN_COLOR);
      if (nx) fillEllipse(selTw.x, selTw.y, nx.range, nc, 0.16);
      fillEllipse(selTw.x, selTw.y, cur, '#ffffff', 0.16);
      rangeEllipse(selTw.x, selTw.y, cur, '#ffffff', t);
      if (nx) rangeEllipse(selTw.x, selTw.y, nx.range, nc, t);
    }

    // 弾
    s.shots.forEach(function (sh) {
      var x = sx(sh.x), y = sy(sh.y);
      if (sh.kind === 'arrow' || sh.kind === 'bolt') {
        var ca = Math.cos(sh.ang || 0), sa = Math.sin(sh.ang || 0), len = sh.kind === 'bolt' ? 9 : 5;
        for (var k = 0; k < len; k++) {
          b.fillStyle = k === 0 ? '#ffffff' : sh.kind === 'bolt' ? '#8a8f99' : '#c08a4a';
          b.fillRect(Math.round(x - ca * k), Math.round(y - sa * k * 0.75), sh.kind === 'bolt' ? 2 : 1, 1);
        }
      } else if (sh.kind === 'flame') {
        b.fillStyle = '#e04a1a'; b.fillRect(Math.round(x) - 2, Math.round(y) - 2, 5, 5);
        b.fillStyle = '#ffd84a'; b.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
        if (Math.random() < 0.6) parts.push({ x: x, y: y, vx: 0, vy: -8, g: 0, life: 0.25, ml: 0.25, col: '#ff8a2a' });
      } else if (sh.kind === 'spark') {
        b.fillStyle = '#ffffff'; b.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
        b.fillStyle = '#ffe14d'; b.fillRect(Math.round(x) - 2, Math.round(y), 5, 1); b.fillRect(Math.round(x), Math.round(y) - 2, 1, 5);
      } else if (sh.kind === 'ice') {
        b.fillStyle = '#5fc8ff'; b.fillRect(Math.round(x) - 1, Math.round(y) - 2, 3, 5); b.fillRect(Math.round(x) - 2, Math.round(y) - 1, 5, 3);
        b.fillStyle = '#ffffff'; b.fillRect(Math.round(x), Math.round(y), 1, 1);
      } else if (sh.kind === 'drip') {
        b.fillStyle = '#4a8a2a'; b.fillRect(Math.round(x) - 2, Math.round(y) - 1, 4, 4);
        b.fillStyle = '#a6e85a'; b.fillRect(Math.round(x) - 1, Math.round(y), 2, 2);
      } else if (sh.kind === 'stone') {
        var hy2 = y - (sh.h || 0) * TH * 1.6;
        b.fillStyle = 'rgba(0,0,0,.35)'; b.fillRect(Math.round(x) - 1, Math.round(y), 2, 1);
        b.fillStyle = '#16120f'; b.fillRect(Math.round(x) - 1, Math.round(hy2) - 1, 3, 3);
        b.fillStyle = '#9ca1a7'; b.fillRect(Math.round(x), Math.round(hy2), 1, 1);
      } else if (sh.kind === 'orb') {
        b.fillStyle = '#6f4cc0'; b.fillRect(Math.round(x) - 2, Math.round(y) - 2, 5, 5);
        b.fillStyle = '#c79bff'; b.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
        b.fillStyle = '#ffffff'; b.fillRect(Math.round(x), Math.round(y), 1, 1);
        if (Math.random() < 0.5) parts.push({ x: x, y: y, vx: 0, vy: 0, g: 0, life: 0.25, ml: 0.25, col: '#9a6ad8' });
      } else {
        var hy = y - (sh.h || 0) * TH * 1.6;
        b.fillStyle = 'rgba(0,0,0,.35)'; b.fillRect(Math.round(x) - 1, Math.round(y), 3, 1);
        b.fillStyle = '#16120f'; b.fillRect(Math.round(x) - 2, Math.round(hy) - 1, 4, 4);
        b.fillStyle = '#4a4d52'; b.fillRect(Math.round(x) - 1, Math.round(hy), 2, 2);
      }
    });

    // 置く前の見本（ドラッグ中・選択中に指している場所）
    if (ui.selType && ui.preview) {
      var pv = ui.preview, ok = G.Battle.canPlaceAt(s, pv.tx, pv.ty, ui.selType);
      var T = G.TOWERS[ui.selType];
      // 射程の内側をうすく塗る
      fillEllipse(pv.tx + 0.5, pv.ty + 0.5, T.range, ok ? '#ffffff' : '#ff5a5a', 0.2);
      rangeEllipse(pv.tx + 0.5, pv.ty + 0.5, T.range, ok ? '#ffffff' : '#ff5a5a', t);
      var ps = G.towerImg(ui.selType, 0, false);
      b.globalAlpha = ui.pending ? 0.75 : 0.6; blitB(ps, sx(pv.tx + 0.5), sy(pv.ty + 0.5) + 5); b.globalAlpha = 1;
      if (ui.pending && ok) { // 仮置き中：マスのかどを点滅させて「もう一度タップ」を示す
        var on = Math.floor(t * 4) % 2 === 0, x0 = pv.tx * TW, y0 = sy(pv.ty), CL = 4;   // かどの印（長さ4ドット）
        b.fillStyle = on ? '#ffffff' : '#ffe14d';
        [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (c) {
          b.fillRect(x0 + (c[0] ? TW - CL : 0), y0 + (c[1] ? TH - 1 : 0), CL, 1);
          b.fillRect(x0 + (c[0] ? TW - 1 : 0), y0 + (c[1] ? TH - CL : 0), 1, CL);
        });
      }
    }

    // 効果
    rings.forEach(function (r) {
      var p = 1 - r.life / r.ml, rr = r.r + (r.max - r.r) * p, n = Math.max(12, Math.round(rr * 2.5));
      b.globalAlpha = 1 - p; b.fillStyle = r.col;
      for (var k = 0; k < n; k++) { var a = k / n * Math.PI * 2; b.fillRect(Math.round(r.x + Math.cos(a) * rr), Math.round(r.y + Math.sin(a) * rr * 0.75), 1, 1); }
      b.globalAlpha = 1;
    });
    beams.forEach(function (bm) {   // 雷が飛び移る線（ジグザグ）
      var n = 6; b.fillStyle = Math.random() < 0.5 ? '#ffffff' : '#ffe14d';
      for (var k = 0; k <= n * 3; k++) {
        var t2 = k / (n * 3), jx = (k % 3 === 1) ? (Math.random() - 0.5) * 4 : 0;
        b.fillRect(Math.round(bm.x0 + (bm.x1 - bm.x0) * t2 + jx), Math.round(bm.y0 + (bm.y1 - bm.y0) * t2 + jx), 1, 1);
      }
    });
    parts.forEach(function (p) {
      b.globalAlpha = Math.min(1, p.life / p.ml * 1.6); b.fillStyle = p.col;
      b.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    });
    b.globalAlpha = 1;
    floats.forEach(function (f) {
      if (f.heart) { b.drawImage(S.heart, Math.round(f.x) - 9, Math.round(f.y) - 1); text(f.text, f.x + 3, f.y, f.col); }
      else text(f.text, f.x, f.y, f.col);
    });
  }

  function gatesNext(s) {
    var g = {}; G.Battle.nextWave(s).forEach(function (w) { g[w.gate] = true; });
    return Object.keys(g).sort();
  }
  // 「！」をタップしたか（指でも押しやすいよう広めに判定）
  function gateAt(s, px, py, cssW, cssH) {
    if (s.phase !== 'prep') return null;
    var x = px / cssW * W, y = py / cssH * H, hit = null;
    gatesNext(s).forEach(function (k) {
      var p = s.map.paths[k][0];
      if (Math.abs(x - sx(p[0])) <= 20 && y >= 0 && y <= sy(1) + 2) hit = k;
    });
    return hit;
  }
  // 数字は拡大後の画面に普通の文字で描く（小さなドット数字より読みやすい）
  function drawNums(ctx, scale) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    nums.forEach(function (n) {
      var a = Math.min(1, n.life / n.ml * 2.5), fs = Math.round(15 * n.size * scale / 1.4);   // 1.4＝2.1（旧：1ドット約2.2px）×176÷264。画面上の文字の大きさを前と同じに保つ
      ctx.globalAlpha = a;
      ctx.font = fs + 'px "DotGothic16", ui-monospace, monospace';
      ctx.lineWidth = Math.max(2, fs * 0.28); ctx.strokeStyle = '#120d08';
      ctx.strokeText(n.text, n.x * scale, n.y * scale);
      ctx.fillStyle = n.col; ctx.fillText(n.text, n.x * scale, n.y * scale);
    });
    ctx.globalAlpha = 1;
  }
  function gatePos(k) { var p = M.paths[k][0]; return { x: sx(p[0]) / W, y: (sy(1) + 2) / H }; }

  // 画面座標 → マス
  function toTile(px, py, cssW, cssH) {
    var x = px / cssW * W, y = py / cssH * H;
    return { tx: Math.floor(x / TW), ty: Math.floor((y - OY) / TH) };
  }
  function towerAt(s, px, py, cssW, cssH) { // タワーの絵の上を触っても選べるように少し上まで判定
    var x = px / cssW * W, y = py / cssH * H, best = null, bd = 1e9;
    s.towers.forEach(function (tw) {
      var dx = x - sx(tw.x), dy = y - (sy(tw.y) - 6);
      if (Math.abs(dx) <= 9 && dy >= -20 && dy <= 10) { var d = Math.abs(dx) + Math.abs(dy); if (d < bd) { bd = d; best = tw; } }
    });
    return best;
  }

  G.Render = { W: W, H: H, buf: buf, draw: draw, shakeOffset: shakeOffset, fx: fx, addEvents: addEvents, toTile: toTile, towerAt: towerAt, clearFx: clearFx,
               gateAt: gateAt, gatePos: gatePos, drawNums: drawNums };
})();

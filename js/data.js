// データ：マップ・タワー・カード・敵・攻撃の予定・イベント・ルール
// 数値はすべて試作用の仮の値（SPEC.md「数値全般」は未定）
'use strict';
var G = window.G = window.G || {};

// ============================================================
// バトルマップ（1マス = 横24ドット × 縦18ドットの斜め見下ろし（疑似3D）、13×15マス）
// 下の絵（rows）は中央11列ぶんだけ書いてある。読み込む時に、左右に1列ずつ足して13列にする（足した列は木・岩・地面。下の「13列にする」を参照）
// . 地面（タワーを置ける）  # 道  T 木（地域で見た目が変わる）  R 岩  L 湖・溶岩（置けない）  X 砦の敷地（置けない）  A/B/C 入口（いちばん上の行。道は画面の上のふちまで続く）  G 砦（ゴール）
// paths は入口ごとの敵の通り道（マスの中心座標）。いちばん上の行の少し内側（y=0.8）から歩きはじめ、画面の上から現れるように薄く出てくる
// ============================================================
G.MAPS = {
  field: {
    name: '草原の分かれ道',
    rows: [
      '..A.....B..',
      'T.#.....#.T',
      '..#.....#..',
      '.T#.....#T.',
      '..#######..',
      '.....#.....',
      '.....#.....',
      '..####..T..',
      '.T#......R.',
      '..#........',
      '..#.......T',
      '..#######..',
      '.T......#..',
      '....T..X#X.',
      '.......XGX.'
    ],
    paths: {
      A: [[2.5,0.8],[2.5,4.5],[5.5,4.5],[5.5,7.5],[2.5,7.5],[2.5,11.5],[8.5,11.5],[8.5,14.6]],
      B: [[8.5,0.8],[8.5,4.5],[5.5,4.5],[5.5,7.5],[2.5,7.5],[2.5,11.5],[8.5,11.5],[8.5,14.6]]
    },
    gateName: { A: '左の入口', B: '右の入口' }
  },
  snake: {
    name: 'くねくね道',
    rows: [
      '.....A.....',
      'T....#....T',
      '.#####...T.',
      '.#.........',
      '.#..T......',
      '.#.....R...',
      '.#########.',
      '.T.......#.',
      '.........#T',
      '..T......#.',
      '....######.',
      '.T..#....T.',
      '....#......',
      '...X#X..T..',
      '...XGX.....'
    ],
    paths: {
      A: [[5.5,0.8],[5.5,2.5],[1.5,2.5],[1.5,6.5],[9.5,6.5],[9.5,10.5],[4.5,10.5],[4.5,14.6]]
    },
    gateName: { A: '入口' }
  },
  valley: {
    name: '三つ又の谷',
    rows: [
      '.A...C...B.',
      '.#...#...#.',
      '.#.T.#.T.#.',
      '.#...#...#.',
      'T#...#...#T',
      '.#..R#...#.',
      '.#...#.T.#.',
      '.#...#...#.',
      '.#########.',
      '.....#.....',
      '.T...#...T.',
      '.....#.....',
      '..T..#..R..',
      '....X#X....',
      '....XGX....'
    ],
    paths: {
      A: [[1.5,0.8],[1.5,8.5],[5.5,8.5],[5.5,14.6]],
      B: [[9.5,0.8],[9.5,8.5],[5.5,8.5],[5.5,14.6]],
      C: [[5.5,0.8],[5.5,14.6]]
    },
    gateName: { A: '左の入口', B: '右の入口', C: '中央の入口' }
  },
  // ---- 雪山（中盤）：L は凍った湖（置けない）、T は雪の針葉樹 ----
  snowpass: {
    name: '雪山の峠', theme: 'snow',
    rows: ['...A....B..','T..#....#.T','...#..T.#..','.LL#....#..','.LL######..','.......#...','T......#.R.','..######...','..#.....T..','..#..LL....','..#..LL..T.','..######...','.T.....#...','......X#X..','......XGX..'],
    paths: {
      A: [[3.5,0.8],[3.5,4.5],[7.5,4.5],[7.5,7.5],[2.5,7.5],[2.5,11.5],[7.5,11.5],[7.5,14.6]],
      B: [[8.5,0.8],[8.5,4.5],[7.5,4.5],[7.5,7.5],[2.5,7.5],[2.5,11.5],[7.5,11.5],[7.5,14.6]]
    },
    gateName: { A: '左の入口', B: '右の入口' }
  },
  // ---- 火山（終盤）：L は溶岩（置けない）、T は黒い岩の柱 ----
  lavaflow: {
    name: '溶岩の道', theme: 'volcano',
    rows: ['.........A.','T..L.....#.','.#########.','.#..LLL....','.#..LLL..T.','.#######...','.......#...','.T.....#.LL','...#####.LL','...#.......','LL.#...T...','LL.######..','........#..','.T.....X#X.','.......XGX.'],
    paths: { A: [[9.5,0.8],[9.5,2.5],[1.5,2.5],[1.5,5.5],[7.5,5.5],[7.5,8.5],[3.5,8.5],[3.5,11.5],[8.5,11.5],[8.5,14.6]] },
    gateName: { A: '入口' }
  }
};
// ---- 道の曲がり角（マスの座標）だけを書いて、マップを自動で作る ----
// gates：入口ごとの曲がり角 [[x,y],...]（最初は0行目の入口、最後は14行目の砦）。縦か横にまっすぐつなぐ
// 木と岩は、決まった数から計算した場所に置く（毎回同じ形になる）
function buildMap(name, gates, gateName, seed) {
  var W = 11, H = 15, g = [], k, i;
  for (var y = 0; y < H; y++) { g.push([]); for (var x = 0; x < W; x++) g[y].push('.'); }
  var paths = {}, castle = null;
  Object.keys(gates).forEach(function (key) {
    var P = gates[key];
    for (i = 0; i < P.length - 1; i++) {
      var a = P[i], b = P[i + 1], dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]), cx = a[0], cy = a[1];
      g[cy][cx] = '#';
      while (cx !== b[0] || cy !== b[1]) { cx += dx; cy += dy; g[cy][cx] = '#'; }
    }
    castle = P[P.length - 1];
    paths[key] = P.map(function (q, j) { return [q[0] + 0.5, j === 0 ? 0.8 : j === P.length - 1 ? 14.6 : q[1] + 0.5]; });
  });
  Object.keys(gates).forEach(function (key) { g[0][gates[key][0][0]] = key; });
  for (var yy = 13; yy <= 14; yy++) for (var xx = castle[0] - 1; xx <= castle[0] + 1; xx++) g[yy][xx] = 'X';
  g[14][castle[0]] = 'G'; g[13][castle[0]] = '#';
  // 木と岩（道・砦の近く・入口の列は避ける）
  var h = seed;
  function rnd() { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; }
  for (y = 1; y < H; y++) for (x = 0; x < W; x++) {
    if (g[y][x] !== '.') continue;
    var r = rnd();
    if (r < 0.085) g[y][x] = 'T'; else if (r < 0.11) g[y][x] = 'R';
  }
  return { name: name, rows: g.map(function (row) { return row.join(''); }), paths: paths, gateName: gateName };
}
var ONE = { A: '入口' }, TWO = { A: '左の入口', B: '右の入口' };
G.MAPS.zigzag = buildMap('ジグザグ坂', { A: [[1, 0], [1, 3], [9, 3], [9, 6], [1, 6], [1, 9], [9, 9], [9, 12], [5, 12], [5, 14]] }, ONE, 11);
G.MAPS.cross  = buildMap('交わる道', { A: [[1, 0], [1, 5], [9, 5], [9, 10], [5, 10], [5, 14]], B: [[9, 0], [9, 2], [3, 2], [3, 8], [7, 8], [7, 10], [5, 10], [5, 14]] }, TWO, 23);
G.MAPS.ushape = buildMap('U字の谷', { A: [[2, 0], [2, 3], [3, 3], [3, 10], [5, 10], [5, 14]], B: [[8, 0], [8, 3], [7, 3], [7, 10], [5, 10], [5, 14]] }, TWO, 37);
G.MAPS.stairs = buildMap('階段の道', { A: [[1, 0], [1, 2], [3, 2], [3, 4], [5, 4], [5, 6], [7, 6], [7, 8], [9, 8], [9, 11], [5, 11], [5, 14]] }, ONE, 41);
G.MAPS.twin   = buildMap('二本の並木道', { A: [[2, 0], [2, 6], [4, 6], [4, 10], [5, 10], [5, 14]], B: [[8, 0], [8, 6], [6, 6], [6, 10], [5, 10], [5, 14]] }, TWO, 53);
G.MAPS.hook   = buildMap('釣り針の道', { A: [[8, 0], [8, 9], [2, 9], [2, 4], [5, 4], [5, 14]] }, ONE, 67);
G.MAPS.wave   = buildMap('波打つ道', { A: [[3, 0], [3, 3], [8, 3], [8, 7], [2, 7], [2, 11], [6, 11], [6, 14]], B: [[8, 0], [8, 7], [2, 7], [2, 11], [6, 11], [6, 14]] }, TWO, 79);
// エリート・ボス用（入口3つ）：中央の道が曲がりくねる
G.MAPS.crown  = buildMap('王冠の谷', { A: [[1, 0], [1, 4], [3, 4], [3, 9], [5, 9], [5, 14]], B: [[9, 0], [9, 4], [7, 4], [7, 9], [5, 9], [5, 14]], C: [[5, 0], [5, 14]] },
                          { A: '左の入口', B: '右の入口', C: '中央の入口' }, 97);
// ---- 2026-10-22 追加：長い道・砦に着く道が2本・橋でくぐる渦巻き（マップのパターンを増やす）----
G.MAPS.longsnake = buildMap('大蛇の道', { A: [[9, 0], [9, 1], [1, 1], [1, 4], [9, 4], [9, 7], [1, 7], [1, 10], [9, 10], [9, 12], [5, 12], [5, 14]] }, ONE, 101);
G.MAPS.spiral    = buildMap('渦巻きの丘', { A: [[1, 0], [1, 11], [9, 11], [9, 2], [3, 2], [3, 8], [7, 8], [7, 5], [5, 5], [5, 14]] }, ONE, 113);
G.MAPS.forkgate  = buildMap('砦への二本道', { A: [[1, 0], [1, 4], [4, 4], [4, 8], [1, 8], [1, 12], [5, 12], [5, 14]], B: [[9, 0], [9, 4], [6, 4], [6, 8], [9, 8], [9, 12], [5, 12], [5, 14]] }, TWO, 127);
// エリート・ボス用（入口3つ）：左右の道はまっすぐ下りて砦の手前で左右から合流、中央の道は長く曲がって、自分の道を橋でくぐる
// （2026-10-22 修正：中央の道が左右の道とくっついて見えたので、ちがう道のあいだに必ず草のマスを1つ以上あける）
G.MAPS.trident   = buildMap('三つ又の砦', { A: [[1, 0], [1, 12], [5, 12], [5, 14]], B: [[9, 0], [9, 12], [5, 12], [5, 14]], C: [[5, 0], [5, 2], [3, 2], [3, 9], [7, 9], [7, 5], [5, 5], [5, 14]] },
                          { A: '左の入口', B: '右の入口', C: '中央の入口' }, 131);
// ---- 13列にする：左右に1列ずつ足す（画面の横幅いっぱいに使うため）----
// 足した列は、決まった数から計算して木・岩・地面にする（毎回同じ形）。敵の道・砦の位置は1列ぶん右にずらすだけで、通る順番や長さは変わらない
function widen(k, m) {
  var h = 0; for (var q = 0; q < k.length; q++) h = (h * 31 + k.charCodeAt(q)) & 0x7fffffff;
  function rnd() { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; }
  function side(y) {
    if (y === 0) return '.';
    var r = rnd();
    return r < 0.30 ? 'T' : r < 0.38 ? 'R' : '.';
  }
  m.rows = m.rows.map(function (row, y) { return side(y) + row + side(y); });
  Object.keys(m.paths).forEach(function (gk) { m.paths[gk] = m.paths[gk].map(function (p) { return [p[0] + 1, p[1]]; }); });
}
Object.keys(G.MAPS).forEach(function (k) { widen(k, G.MAPS[k]); });
// ---- 砦のまわりは何も重ならないようにする（2026-10-22）----
// 砦の絵（横112×縦106ドット）が重なるマス（砦の列の左右2マス・下から5行）では、木・岩を地面に変える
// タワー・罠は置いてよい（重なっても、砦をいちばん手前に描く。render.js）。fortZone は範囲の記録だけ
function clearFort(m) {
  var gy = -1, gx = -1;
  m.rows.forEach(function (r, y) { var x = r.indexOf('G'); if (x >= 0) { gx = x; gy = y; } });
  if (gx < 0) return;
  m.fortZone = { x0: gx - 2, x1: gx + 2, y0: gy - 4, y1: gy };
  m.rows = m.rows.map(function (r, y) {
    if (y < gy - 4 || y > gy) return r;
    return r.split('').map(function (c, x) { return x >= gx - 2 && x <= gx + 2 && (c === 'T' || c === 'R') ? '.' : c; }).join('');
  });
}
Object.keys(G.MAPS).forEach(function (k) {
  var m = G.MAPS[k];
  clearFort(m);
  m.id = k; m.cols = m.rows[0].length; m.rowsN = m.rows.length;
  m.rows.forEach(function (r, i) { if (r.length !== m.cols) throw new Error('map ' + k + ' row ' + i + ' width'); });
  m.bridges = findBridges(m);
});
// ---- 道が十字に交わるマスを探して「橋」にする（見た目だけ。通る順番は変わらない）----
// 先に通る向き（d が小さい方）を橋の上、あとから通る向きを橋の下にする
// 戻り値：[{ x, y, axis:'h'|'v' }]  axis＝橋の上の道の向き（h＝横、v＝縦）
function findBridges(m) {
  var seen = {};
  Object.keys(m.paths).forEach(function (gk) {
    var P = m.paths[gk], d = 0;
    for (var i = 0; i < P.length - 1; i++) {
      var a = P[i], b = P[i + 1], ax = a[0] === b[0] ? 'v' : 'h';
      var x0 = Math.floor(a[0]), y0 = Math.floor(a[1]), x1 = Math.floor(b[0]), y1 = Math.floor(b[1]);
      var sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0), x = x0 + sx, y = y0 + sy, step = 1;
      // 曲がり角のマスは除いて、まっすぐ通り抜けるマスだけを記録
      while (x !== x1 || y !== y1) {
        var key = x + ',' + y;
        (seen[key] = seen[key] || []).push({ ax: ax, d: d + step });
        x += sx; y += sy; step++;
      }
      d += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
  });
  var out = [];
  Object.keys(seen).forEach(function (key) {
    var v = seen[key], h = v.filter(function (q) { return q.ax === 'h'; }), w = v.filter(function (q) { return q.ax === 'v'; });
    if (!h.length || !w.length) return;
    var first = v.slice().sort(function (p, q) { return p.d - q.d; })[0];
    var xy = key.split(',');
    out.push({ x: +xy[0], y: +xy[1], axis: first.ax });
  });
  return out;
}
G.MAP = G.MAPS.field;   // 互換用（最初のマップ）

// ============================================================
// タワー
// range はマス数、rate は攻撃の間隔（秒）、dmgType は physical（物理）/ magic（魔法）
// poison：当たった敵を毒にする（1秒あたりのダメージ・秒数）。slow：当たった敵を遅くする（遅くなる割合・秒数）
// up：お金で強化した時の値（Lv2, Lv3）。muzzle：弾が出る高さ（マス）
// ============================================================
G.TOWERS = {
  // ---- 初期デッキ ----
  bowman: {
    name: '見習い弓兵', muzzle: 1.4, cost: 1, range: 2.4, dmg: 6, rate: 0.85, dmgType: 'physical', shot: 'arrow', speed: 9,
    text: '安くて扱いやすい弓兵。1体ずつ攻撃。',
    up: [{ cost: 20, dmg: 9, range: 2.6, rate: 0.8 }, { cost: 40, dmg: 13, range: 2.8, rate: 0.75 }]
  },
  sling: {
    name: '投石小屋', muzzle: 0.8, cost: 1, range: 2.1, dmg: 8, rate: 1.7, dmgType: 'physical', shot: 'stone', speed: 5, splash: 0.7,
    text: '石を投げて、当たった周りにも少しダメージ。射程は短い。',
    up: [{ cost: 20, dmg: 11, range: 2.1, rate: 1.6, splash: 0.8 }, { cost: 40, dmg: 16, range: 2.2, rate: 1.5, splash: 0.9 }]
  },
  // ---- 道中で手に入る ----
  watch: {
    name: '見張り小屋', muzzle: 1.1, cost: 0, range: 2.0, dmg: 6, rate: 0.8, drawOnBuild: 1, dmgType: 'physical', shot: 'arrow', speed: 9,
    text: 'エネルギー0で建てられる小さな見張り。置いた時にカードを1枚引く。',   // 2026-10-22 ダメージ3→6・置くと1枚引く（オーナー指定。強化のダメージも同じ上げ幅で 5→8・8→11）
    up: [{ cost: 15, dmg: 8, range: 2.2, rate: 0.75 }, { cost: 30, dmg: 11, range: 2.4, rate: 0.7 }]
  },
  archer: {
    name: '弓兵の塔', cost: 1, range: 2.6, dmg: 6, rate: 0.8, dmgType: 'physical', shot: 'arrow', speed: 9,
    text: '矢を速く撃つ。1体ずつ攻撃。',
    up: [{ cost: 25, dmg: 10, range: 2.9, rate: 0.7 }, { cost: 50, dmg: 16, range: 3.2, rate: 0.6 }]
  },
  poison: {
    name: '毒の塔', muzzle: 1.0, cost: 1, range: 2.3, dmg: 2, rate: 1.2, dmgType: 'magic', shot: 'drip', speed: 6,
    poison: { dps: 6, dur: 3 },
    text: '当たった敵を毒にする（3秒間、毎秒ダメージ）。毒はよろいを無視する。',
    up: [{ cost: 25, dmg: 3, poison: { dps: 9, dur: 3 } }, { cost: 50, dmg: 4, range: 2.6, poison: { dps: 14, dur: 3 } }]
  },
  mage: {
    name: '魔導士の塔', cost: 1, range: 2.2,   // 2026-10-24 コスト2→1（オーナー指定）
    dmg: 15, rate: 1.6, dmgType: 'magic', shot: 'orb', speed: 5,
    text: '魔法の玉。よろいを無視する。',
    up: [{ cost: 30, dmg: 26, range: 2.5, rate: 1.5 }, { cost: 60, dmg: 42, range: 2.8, rate: 1.4 }]
  },
  cannon: {
    name: '大砲', noAir: true, muzzle: 0.6, cost: 2, range: 2.4, dmg: 13, rate: 1.85, dmgType: 'physical', shot: 'ball', speed: 4, splash: 0.95,
    text: '砲弾が爆発し、まわりの敵もまとめて攻撃。',
    up: [{ cost: 30, dmg: 21, range: 2.6, rate: 1.75, splash: 1.1 }, { cost: 60, dmg: 32, range: 2.8, rate: 1.65, splash: 1.25 }]
  },
  frost: {
    name: '氷の塔', muzzle: 1.7, cost: 1,   // 2026-10-22 コスト2→1（オーナー指定）
    range: 2.2, dmg: 4, rate: 1.2, dmgType: 'magic', shot: 'ice', speed: 6,
    slow: { pct: 0.4, dur: 1.5 },
    text: '当たった敵を遅くする（1.5秒間）。ダメージは小さい。',
    up: [{ cost: 30, dmg: 6, range: 2.4, rate: 1.1, slow: { pct: 0.5, dur: 1.5 } }, { cost: 60, dmg: 9, range: 2.6, rate: 1.0, slow: { pct: 0.6, dur: 2 } }]
  },
  fire: {
    name: '炎の塔', muzzle: 1.6, cost: 1,   // 2026-10-24 コスト2→1（オーナー指定）
    range: 2.3, dmg: 7, rate: 1.3, dmgType: 'magic', shot: 'flame', speed: 6, splash: 0.65,
    burn: { dps: 10, dur: 2 },
    text: '火の玉で周りの敵もまとめて燃やす（2秒間、毎秒ダメージ）。火に強い敵には効かない。',
    up: [{ cost: 30, dmg: 10, splash: 0.75, burn: { dps: 14, dur: 2 } }, { cost: 60, dmg: 15, range: 2.6, splash: 0.85, burn: { dps: 20, dur: 2.5 } }]
  },
  thunder: {
    name: '雷の塔', muzzle: 1.8, cost: 2, range: 2.4, dmg: 10, rate: 1.5, dmgType: 'magic', shot: 'spark', speed: 16, chain: 2,
    text: '当たった敵から近くの敵へ電気が飛ぶ（2体まで、70%のダメージ）。',
    up: [{ cost: 30, dmg: 15, chain: 3 }, { cost: 60, dmg: 22, range: 2.7, chain: 4 }]
  },
  mine: {
    name: '金鉱', muzzle: 0.5, cost: 1, range: 0, dmg: 0, rate: 1, dmgType: 'none', noAttack: true, income: 10,
    text: '攻撃しない。攻撃を1回しのぐたびにお金+10。',
    up: [{ cost: 25, income: 17 }, { cost: 50, income: 26 }]
  },
  // ---- 道にだけ置ける物（place: 'path'）。攻撃はせず、上を通った敵に効く ----
  spikes: {
    // 2026-10-22 ダメージ 20/32/48 → 16/25/45（オーナー指定）
    name: 'トゲの罠', place: 'path', muzzle: 0, cost: 1, range: 0, dmg: 0, rate: 1, dmgType: 'none', noAttack: true,
    trap: { type: 'spike', dmg: 16 },
    text: '道に置く。上を通った敵1体ずつに16ダメージ（物理）。何度でも使える。',
    up: [{ cost: 20, trap: { type: 'spike', dmg: 25 } }, { cost: 40, trap: { type: 'spike', dmg: 45 } }]
  },
  tar: {
    name: '粘着の沼', place: 'path', muzzle: 0, cost: 1, range: 0, dmg: 0, rate: 1, dmgType: 'none', noAttack: true,
    trap: { type: 'tar', slow: 0.5 },
    text: '道に置く。踏んだ敵を50%遅くする。離れても1.5秒続く（遅くならない敵には効かない）。',
    up: [{ cost: 20, trap: { type: 'tar', slow: 0.6 } }, { cost: 40, trap: { type: 'tar', slow: 0.7 } }]
  },
  barrel: {
    name: '爆弾樽', place: 'path', muzzle: 0, cost: 1, range: 0, dmg: 0, rate: 1, dmgType: 'none', noAttack: true,
    trap: { type: 'bomb', dmg: 120, splash: 1.5 },
    text: '道に置く。最初に敵が乗ると爆発し、周り1.5マスに120ダメージ。1回で無くなる。',
    up: []
  },
  barricade: {
    name: 'バリケード', place: 'path', muzzle: 0, cost: 1, range: 0, dmg: 0, rate: 1, dmgType: 'none', noAttack: true,
    blocker: { hp: 250 },
    text: '道に置く。こわされるまで敵を止める（体力250）。ボスは止められない。',
    up: [{ cost: 25, blocker: { hp: 420 } }, { cost: 50, blocker: { hp: 650 } }]
  },
  // ---- 兵舎：道に兵士を出して敵を足止めする ----
  barracks: {
    name: '兵舎', muzzle: 0, cost: 2, range: 2.0, dmg: 0, rate: 1, dmgType: 'none', noAttack: true,
    soldiers: { n: 2, hp: 80, dmg: 8, rate: 1.0, respawn: 8 },
    text: '近くの道に兵士2人を出す。射程に入った敵を兵士が追いかけ、1体ずつ止めて戦う。倒れても8秒で戻る。ボスは止められない。',
    up: [{ cost: 30, soldiers: { n: 2, hp: 120, dmg: 12, rate: 1.0, respawn: 7 } }, { cost: 60, soldiers: { n: 3, hp: 160, dmg: 16, rate: 0.9, respawn: 6 } }]
  },
  // 新兵の詰所：初期デッキ用の弱い兵舎（2026-10-22）。兵士の数は 2→2→3
  recruit: {
    name: '新兵の詰所', muzzle: 0, cost: 2, range: 2.0, dmg: 0, rate: 1, dmgType: 'none', noAttack: true,
    soldiers: { n: 2, hp: 55, dmg: 5, rate: 1.1, respawn: 10, unit: 'recruitUnit' },
    text: '近くの道に新兵2人を出す。射程に入った敵を新兵が追いかけ、1体ずつ止めて戦う（兵舎の兵士より弱い）。倒れても10秒で戻る。ボスは止められない。',
    up: [{ cost: 25, soldiers: { n: 2, hp: 80, dmg: 8, rate: 1.0, respawn: 9 } }, { cost: 50, soldiers: { n: 3, hp: 100, dmg: 10, rate: 1.0, respawn: 8 } }]
  },
  // ---- 追加のタワー（2026-10-19 夜） ----
  dart: {
    name: '吹き矢小屋', muzzle: 0.7, cost: 1, range: 2.2, dmg: 3, rate: 0.55, dmgType: 'physical', shot: 'arrow', speed: 12,
    poison: { dps: 3, dur: 2 },
    text: '細い吹き矢をとても速く撃つ。当たると少し毒（2秒）。',
    up: [{ cost: 20, dmg: 4, poison: { dps: 5, dur: 2 } }, { cost: 40, dmg: 6, range: 2.4, poison: { dps: 7, dur: 2.5 } }]
  },
  mortar: {
    name: '臼砲', noAir: true, muzzle: 0.7, cost: 2, range: 3.6, dmg: 34, rate: 2.4, dmgType: 'physical', shot: 'ball', speed: 3.5, splash: 1.3,
    text: '遠くへ大きな砲弾を撃ち、広い範囲を吹き飛ばす。空の敵には当たらない。',
    up: [{ cost: 40, dmg: 50, splash: 1.4 }, { cost: 80, dmg: 70, range: 3.9, splash: 1.5 }]
  },
  // size: 2 ＝ 横に2マス使う（2026-10-22 追加）
  trebuchet: {
    name: '大投石機', size: 2, noAir: true, muzzle: 1.4, cost: 3, range: 4.6, dmg: 70, rate: 3.4, dmgType: 'physical', shot: 'ball', speed: 3.0, splash: 1.6,
    text: '横に2マスを使う大きな投石機。とても遠くまで大岩を投げ、広い範囲に大ダメージ。空の敵には当たらない。',
    up: [{ cost: 50, dmg: 100, splash: 1.7 }, { cost: 100, dmg: 140, range: 5.0, splash: 1.8 }]
  },
  blizzard: {
    name: '吹雪の塔', muzzle: 1.6, cost: 2, range: 2.2, dmg: 9, rate: 1.0, dmgType: 'magic', aura: true, slow: { pct: 0.45, dur: 1.2 },
    text: '弾を撃たず、射程の中の敵すべてに1秒ごとに冷たい風（ダメージ＋遅くする）。',
    up: [{ cost: 40, dmg: 13, slow: { pct: 0.5, dur: 1.2 } }, { cost: 80, dmg: 18, range: 2.5, slow: { pct: 0.55, dur: 1.5 } }]
  },
  golem: {
    name: '石像の工房', muzzle: 0, cost: 2, range: 2.0, dmg: 0, rate: 1, dmgType: 'none', noAttack: true,
    soldiers: { n: 1, hp: 420, dmg: 32, rate: 1.0, respawn: 8, stopsBoss: true, unit: 'golemUnit' },
    text: '近くの道に石の巨人を1体出す。射程に入った敵を追いかけて止める。ボスが来たらボスを先に止める（体力420）。倒れても8秒で戻る。',
    up: [{ cost: 40, soldiers: { n: 1, hp: 620, dmg: 44, rate: 1.0, respawn: 7, stopsBoss: true, unit: 'golemUnit' } }, { cost: 80, soldiers: { n: 1, hp: 860, dmg: 60, rate: 0.9, respawn: 6, stopsBoss: true, unit: 'golemUnit' } }]
  },
  // ---- レア（ボスの報酬に出る） ----
  sniper: {
    name: '狙撃塔', muzzle: 1.9, cost: 2, range: 3.8, dmg: 26, rate: 2.4, dmgType: 'physical', shot: 'bolt', speed: 18, vsBoss: 1.5, defTarget: 'strong',
    text: 'とても遠くまで届く。最初は体力が一番多い敵をねらう。ボスには1.5倍のダメージ。',
    up: [{ cost: 40, dmg: 40, range: 4.0 }, { cost: 80, dmg: 58, range: 4.2, rate: 2.2 }]
  },
  storm: {
    name: '嵐の塔', muzzle: 1.9, cost: 2, range: 2.6, dmg: 16, rate: 1.2, dmgType: 'magic', shot: 'spark', speed: 16, chain: 4, chainFull: true,
    text: '雷が近くの敵へ4体まで飛び移る。飛び移っても威力が落ちない。',
    up: [{ cost: 40, dmg: 22, chain: 5 }, { cost: 80, dmg: 30, range: 2.8, chain: 6 }]
  },
  ballista: {
    name: '大型弩砲', muzzle: 0.9, cost: 3, range: 3.6, dmg: 40, rate: 2.4, dmgType: 'physical', shot: 'bolt', speed: 14,
    text: '遠くまで届く重い矢。1発が大きい。',
    up: [{ cost: 40, dmg: 62, range: 3.9, rate: 2.3 }, { cost: 80, dmg: 90, range: 4.2, rate: 2.2 }]
  }
};

// ============================================================
// カード
// kind：tower（タワーを建てる）/ skill（スキル）
// target（スキル）：tower（建てたタワーを1つ選ぶ）/ none（選ばずにすぐ効く）
// rarity：starter（初期デッキ）/ common / uncommon / rare（報酬・商人で出る確率と値段が変わる）
// exhaust：使うとこの戦闘中はデッキから消える
// ============================================================
G.CARDS = {
  bowman:   { kind: 'tower', tower: 'bowman', rarity: 'starter' },
  sling:    { kind: 'tower', tower: 'sling', rarity: 'starter' },
  recruit:  { kind: 'tower', tower: 'recruit', rarity: 'starter' },   // 初期デッキ用（報酬・商人には出ない）
  aim:      { kind: 'skill', buff: true, name: '狙い撃ち', cost: 0, target: 'tower', rarity: 'starter', icon: 'eye', mult: 1.5,
              text: 'タワー1つの攻撃力をこのターンだけ1.5倍。' },

  watch:    { kind: 'tower', tower: 'watch', rarity: 'common' },
  archer:   { kind: 'tower', tower: 'archer', rarity: 'uncommon' },
  poison:   { kind: 'tower', tower: 'poison', rarity: 'common' },
  mage:     { kind: 'tower', tower: 'mage', rarity: 'uncommon' },
  cannon:   { kind: 'tower', tower: 'cannon', rarity: 'uncommon' },
  frost:    { kind: 'tower', tower: 'frost', rarity: 'uncommon' },
  ballista: { kind: 'tower', tower: 'ballista', rarity: 'rare' },
  sniper:   { kind: 'tower', tower: 'sniper', rarity: 'rare' },
  storm:    { kind: 'tower', tower: 'storm', rarity: 'rare' },
  mortar:   { kind: 'tower', tower: 'mortar', rarity: 'rare' },
  trebuchet: { kind: 'tower', tower: 'trebuchet', rarity: 'rare' },
  blizzard: { kind: 'tower', tower: 'blizzard', rarity: 'rare' },
  golem:    { kind: 'tower', tower: 'golem', rarity: 'rare' },
  dart:     { kind: 'tower', tower: 'dart', rarity: 'common' },
  fire:     { kind: 'tower', tower: 'fire', rarity: 'uncommon' },
  thunder:  { kind: 'tower', tower: 'thunder', rarity: 'uncommon' },
  mine:     { kind: 'tower', tower: 'mine', rarity: 'common' },
  spikes:   { kind: 'tower', tower: 'spikes', rarity: 'common' },
  tar:      { kind: 'tower', tower: 'tar', rarity: 'uncommon' },
  barrel:   { kind: 'tower', tower: 'barrel', rarity: 'common', exhaust: true },
  barricade: { kind: 'tower', tower: 'barricade', rarity: 'uncommon' },
  barracks: { kind: 'tower', tower: 'barracks', rarity: 'rare' },

  supply:   { kind: 'skill', name: '補給', cost: 1, target: 'none', rarity: 'uncommon', icon: 'bag', n: 2,   // 2026-10-22 コスト0→1（オーナー指定）
              text: 'カードを2枚引く。' },
  // 魔術強化（2026-10-24 オーナー指定。同日に変更：初期・コスト1・鍛えるとコスト0・対象は属性タワー全部）：宮廷魔導師の初期カード（狙い撃ちと差し替え）
  //   属性のあるタワー（毒・雷・氷・炎）すべての「属性の効果」をこのターンだけ2倍。選ばずにすぐ効く（target: 'none'）
  //   毒の威力（毎秒のダメージ）・雷の連鎖する体数・氷の遅くする強さ・炎のやけどのダメージ（毎秒）が mult 倍。攻撃力・続く時間・射程は変わらない
  //   buff を付けない：隊長の勲章（攻撃力・攻撃速度を上げるスキルのコスト-1）の対象にしない
  arcane:   { kind: 'skill', name: '魔術強化', cost: 1, target: 'none', rarity: 'starter', icon: 'arcane', mult: 2,
              text: '属性タワーすべての属性効果が、このターンだけ2倍になる。', detail: '毒威力2倍、電気連鎖体数2倍、氷減速効果2倍、炎延焼ダメージ2倍' },
  whet:     { kind: 'skill', buff: true, name: '研ぎ石', cost: 0, target: 'tower', rarity: 'common', icon: 'stone', amount: 3,
              text: 'タワー1つの攻撃力を+3（この戦闘中ずっと）。' },
  tax:      { kind: 'skill', name: '臨時徴税', cost: 0, target: 'none', rarity: 'common', icon: 'coin', exhaust: true, gold: 50,   // 2026-10-22 +20→+50（オーナー指定）
              text: 'お金+50。使い切り（この戦闘中は戻らない）。' },
  forge:    { kind: 'skill', name: '鍛冶仕事', cost: 1, target: 'tower', rarity: 'uncommon', icon: 'hammer',
              text: 'タワー1つをお金を使わずにLv+1（この戦闘中ずっと）。' },
  warcry:   { kind: 'skill', buff: true, name: '号令', cost: 1, target: 'none', rarity: 'uncommon', icon: 'horn', mult: 1.5,
              text: 'すべてのタワーの攻撃速度をこのターンだけ1.5倍。' },
  timestop: { kind: 'skill', name: 'ストップ', cost: 1, target: 'none', rarity: 'rare', icon: 'hourglass', sec: 3,   // 2026-10-22 名前「時止め」→「ストップ」・コスト2→1（オーナー指定）
              text: '次の3秒間（攻撃中）、すべての敵が止まる。ボスは半分の速さになる。' },
  masterwork: { kind: 'skill', name: '名匠の技', cost: 1, target: 'tower', rarity: 'rare', icon: 'star', exhaust: true,
              text: 'タワー1つを、お金を使わずに最大レベルまで強化（この戦闘中ずっと）。使い切り。' },
  patch:    { kind: 'skill', name: '応急手当', cost: 0, target: 'none', rarity: 'common', icon: 'bandage', exhaust: true, heal: 3,
              text: '砦の耐久値+3（砦の最大耐久値まで）。使い切り。' },
  focus:    { kind: 'skill', buff: true, name: '集中', cost: 0, target: 'tower', rarity: 'common', icon: 'target', mult: 1.5,
              text: 'タワー1つの攻撃速度をこのターンだけ1.5倍。' },
  bounty:   { kind: 'skill', name: '懸賞金', cost: 1, target: 'none', rarity: 'uncommon', icon: 'poster', mult: 2,
              text: 'このターン、敵を倒した時のお金が2倍。' },
  rally:    { kind: 'skill', buff: true, name: '総攻撃', cost: 1, target: 'none', rarity: 'rare', icon: 'sword', mult: 1.6,
              text: 'すべてのタワーの攻撃力をこのターンだけ1.6倍。' },
  // ---- ここから下は、経験値をためると解放されるカード（unlock: true） ----
  overclock: { kind: 'skill', buff: true, name: '過負荷', cost: 1, target: 'none', rarity: 'rare', icon: 'gear', mult: 2, unlock: true,
              text: 'すべてのタワーの攻撃速度をこのターンだけ2倍。' },
  architect: { kind: 'skill', name: '設計の天才', cost: 1, target: 'none', rarity: 'rare', icon: 'scroll', n: 2, unlock: true,
              text: 'このターン、次に使うタワーのカード2枚のエネルギーが0になる。' },
  meteor:   { kind: 'skill', name: '隕石', cost: 1, target: 'none', rarity: 'rare', icon: 'meteor', dmg: 90, unlock: true, burn: { dps: 10, dur: 2 },   // 2026-10-22 コスト2→1・やけど追加（オーナー指定）
              text: '今マップにいるすべての敵に90ダメージ（魔法）と、やけど（毎秒10・2秒）。攻撃中に使う。' },
  energize: { kind: 'skill', name: 'エナジー補給', cost: 0, target: 'none', rarity: 'uncommon', icon: 'energy', n: 1,
              text: 'エネルギー+1。' },
  workshop: { kind: 'skill', name: '急造工房', cost: 2, target: 'none', rarity: 'rare', icon: 'saw', exhaust: true,
              text: '「弓兵の塔（エネルギー0・使い切り）」を2枚手札に加える。使い切り。',
              give: { card: 'archer', n: 2, cost: 0 } },
  // 作戦変更（2026-10-23 オーナー指定）：手札のカードを1枚選んで、この戦闘中は外す（使い切りを使った時と同じ扱い）。そのあと2枚引く
  //   target: 'hand'＝手札のカードを選んで使う。手札がこのカードだけなら、選ばずに2枚引くだけ
  replan:   { kind: 'skill', name: '作戦変更', cost: 1, target: 'hand', rarity: 'uncommon', icon: 'replan', n: 2,
              text: '手札のカードを1枚選び、この戦闘中は外す。カードを2枚引く。' },
  // びっくり箱（2026-10-22 オーナー指定）：商人でしか買えない（shopOnly。報酬・イベントには出ない）。レア度はアンコモン扱い（商人の値段とくじの重み）
  surprise: { kind: 'skill', name: 'びっくり箱', cost: 1, target: 'none', rarity: 'uncommon', icon: 'box', exhaust: true, shopOnly: true,
              text: 'ランダムなアンコモンかレアのタワーを1枚、エネルギー0で手札に加える（この戦闘だけ）。使い切り。' }
};
// タワーのカードは名前・コスト・説明をタワーから取る
Object.keys(G.CARDS).forEach(function (id) {
  var c = G.CARDS[id]; c.id = id;
  if (c.kind === 'tower') { var T = G.TOWERS[c.tower]; c.name = T.name; c.cost = T.cost; c.text = T.text; }
});
// ---- 強化したカード（id の後ろに「+」、名前の後ろに「＋」）。たき火の「鍛える」などで作る ----
// タワー：強化できるタワーは Lv2 の状態で置かれる。強化のないタワーはエネルギー-1
// スキル：下の表のとおりに数値が良くなる
G.PLUS_SKILL = {
  // plusNote：鍛える前 → 後（画面では「→」の後ろをアップの色で出す）
  aim:      { mult: 2, text: 'タワー1つの攻撃力をこのターンだけ2倍。', plusNote: ['攻撃力の倍率', '1.5倍', '2倍'] },
  arcane:   { cost: 0, plusNote: ['エネルギー', '1', '0'] },   // 2026-10-24 鍛えるとコスト0（倍率は2倍のまま）
  energize: { n: 2, text: 'エネルギー+2。', plusNote: ['もらえるエネルギー', '+1', '+2'] },
  replan:   { cost: 0, text: '手札のカードを1枚選び、この戦闘中は外す。カードを2枚引く。', plusNote: ['エネルギー', '1', '0'] },   // 2026-10-23 鍛えるとコスト0
  supply:   { cost: 0, text: 'カードを2枚引く。', plusNote: ['エネルギー', '1', '0'] },   // 2026-10-22 鍛えるとコスト0に（前：3枚引く）
  whet:     { amount: 5, text: 'タワー1つの攻撃力を+5（この戦闘中ずっと）。', plusNote: ['攻撃力', '+3', '+5'] },
  tax:      { gold: 80, text: 'お金+80。使い切り（この戦闘中は戻らない）。', plusNote: ['もらえるお金', '+50', '+80'] },
  forge:    { cost: 0, text: 'タワー1つをお金を使わずにLv+1（この戦闘中ずっと）。', plusNote: ['エネルギー', '1', '0'] },
  warcry:   { mult: 1.8, text: 'すべてのタワーの攻撃速度をこのターンだけ1.8倍。', plusNote: ['攻撃速度の倍率', '1.5倍', '1.8倍'] },
  workshop: { cost: 1, text: '「弓兵の塔（エネルギー0・使い切り）」を2枚手札に加える。使い切り。', plusNote: ['エネルギー', '2', '1'] },
  timestop: { sec: 4, text: '次の4秒間（攻撃中）、すべての敵が止まる。ボスは半分の速さになる。', plusNote: ['止める時間', '3秒', '4秒'] },
  surprise: { cost: 0, text: 'ランダムなアンコモンかレアのタワーを1枚、エネルギー0で手札に加える（この戦闘だけ）。使い切り。', plusNote: ['エネルギー', '1', '0'] },
  masterwork: { cost: 0, text: 'タワー1つを、お金を使わずに最大レベルまで強化（この戦闘中ずっと）。使い切り。', plusNote: ['エネルギー', '1', '0'] },
  patch:    { heal: 5, text: '砦の耐久値+5（砦の最大耐久値まで）。使い切り。', plusNote: ['回復', '+3', '+5'] },
  focus:    { mult: 2, text: 'タワー1つの攻撃速度をこのターンだけ2倍。', plusNote: ['攻撃速度の倍率', '1.5倍', '2倍'] },
  bounty:   { cost: 0, text: 'このターン、敵を倒した時のお金が2倍。', plusNote: ['エネルギー', '1', '0'] },
  rally:    { mult: 2, text: 'すべてのタワーの攻撃力をこのターンだけ2倍。', plusNote: ['攻撃力の倍率', '1.6倍', '2倍'] },
  overclock: { cost: 0, text: 'すべてのタワーの攻撃速度をこのターンだけ2倍。', plusNote: ['エネルギー', '1', '0'] },
  architect: { n: 3, text: 'このターン、次に使うタワーのカード3枚のエネルギーが0になる。', plusNote: ['0になる枚数', '2枚', '3枚'] },
  meteor:   { dmg: 140, text: '今マップにいるすべての敵に140ダメージ（魔法）と、やけど（毎秒10・2秒）。攻撃中に使う。', plusNote: ['ダメージ', '90', '140'] }
};
Object.keys(G.CARDS).forEach(function (id) {
  var c = G.CARDS[id], p = Object.assign({}, c, { id: id + '+', base: id, plus: true, name: c.name + '＋' });
  if (c.kind === 'tower') {
    if (G.TOWERS[c.tower].up.length) { p.startLv = 1; p.plusNote = ['置いた時のレベル', 'Lv1', 'Lv2（強化1回分）']; }
    else { p.cost = Math.max(0, c.cost - 1); p.plusNote = ['エネルギー', String(c.cost), String(p.cost)]; }
  } else Object.assign(p, G.PLUS_SKILL[id] || { cost: Math.max(0, c.cost - 1) });
  G.CARDS[id + '+'] = p;
});

// 初期デッキ（8枚・3種類）：見習い弓兵×4、投石小屋×3、狙い撃ち×1
G.START_DECK = ['bowman', 'bowman', 'bowman', 'sling', 'sling', 'warcry', 'barricade', 'recruit'];   // 騎士隊長と同じ（指揮官を選ばない時の予備）

// ---- 指揮官（ランの最初に1人選ぶ）。初期デッキ・最大ライフ・固有の能力が違う ----
// ============================================================
// アセンション（難易度）。1つ前の難易度でクリアすると、次を選べる（10まで）
// 効果は下の段ほど足されていく（A3 なら A1〜A3 のすべて）
// ============================================================
G.ASCENSION = [
  // 文のきまり（2026-10-22 オーナー指定）：お金・速さ・ライフだけ数字を書き、ほかは「増える」「上がる」とざっくり書く
  // 指揮官を選ぶ画面には、選んだ段の文だけを「さらに、」をつけて出す（A1 だけ「さらに」なし）。文の中に「さらに」はつけない。tag は「さらに、」の前に出す
  { lv: 1, text: 'エリートの体力が増える', elite: 1.15 },
  { lv: 2, text: '砦の最大耐久値-4', life: 4 },
  { lv: 3, text: '通常の敵の体力が増える', hp: 1.05 },
  { lv: 4, text: 'ボスの体力が増える', boss: 1.06 },
  { lv: 5, text: '戦闘で手に入るお金が15%減る', gold: 0.85 },
  // 6〜10：2026-10-22 追加
  { lv: 6, text: '敵の歩く速さが5%上がる', speed: 1.05 },
  { lv: 7, text: 'ボスが砦に着いた時のダメージが増える', bossHit: 2 },
  // A8：通常の敵（エリート戦・ボス戦に出る敵も。ボスは入らない）が砦に着いた時のダメージが増える。小型（ライフ1）+1、中型（ライフ2以上）+2
  { lv: 8, text: '通常の敵の攻撃力が上がる', leak: [1, 2] },
  { lv: 9, text: 'エリートとボスの体力が増える', elite: 1.1, boss: 1.06 },
  // A10（2026-10-22 変更。前：最大ライフ-6・敵の速さ+5%）：3層のボス戦に勝つと、続けて別の3層ボスともう1戦（マップは動かない。タワーは引き継がない）
  { lv: 10, tag: '（最大レベル）', text: '火山ボスが2体登場する', twoBoss: true }
];
G.ASC_MAX = 10;
// a までのアセンションの効果をまとめる（倍率はかけ算、ライフ・攻撃は足し算）
G.ascMods = function (a) {
  var m = { hp: 1, elite: 1, life: 0, boss: 1, bossHit: 0, speed: 1, gold: 1, leakS: 0, leakM: 0, twoBoss: false };
  G.ASCENSION.forEach(function (x) {
    if (x.lv > (a || 0)) return;
    ['hp', 'elite', 'boss', 'speed', 'gold'].forEach(function (k) { if (x[k]) m[k] *= x[k]; });
    if (x.life) m.life += x.life; if (x.bossHit) m.bossHit += x.bossHit;
    if (x.leak) { m.leakS += x.leak[0]; m.leakM += x.leak[1]; }   // 小型・中型が砦に着いた時の追加ダメージ
    if (x.twoBoss) m.twoBoss = true;   // 3層ボスが2体
  });
  return m;
};
G.COMMANDERS = {   // 2026-10-22 初期デッキ・ライフを変更、名前を 隊長→騎士隊長・魔女→宮廷魔導師・工兵→工兵将校 に（オーナー指定）
  captain:  { name: '騎士隊長', icon: 'bowman', life: 36, relic: 'cmd_captain', deck: ['bowman', 'bowman', 'bowman', 'sling', 'sling', 'warcry', 'barricade', 'recruit'],
              text: '攻撃力・攻撃速度を上げるスキルのコストが1下がる。', sub: '指揮にすぐれ、スキルを使いこなす指揮官。' },
  witch:    { name: '宮廷魔導師', icon: 'mage', life: 34, relic: 'cmd_witch', deck: ['bowman', 'bowman', 'poison', 'poison', 'thunder', 'sling', 'arcane', 'recruit'],   // 2026-10-24 狙い撃ち→魔術強化
              text: '魔法のタワーの攻撃力+25%。毒とやけどが1秒長く続く。', sub: '魔法に長け、魔法攻撃力が高いが砦の耐久値が低い。' },
  engineer: { name: '工兵将校', icon: 'barracks', life: 40, relic: 'cmd_engineer', deck: ['bowman', 'bowman', 'bowman', 'sling', 'sling', 'recruit', 'barricade', 'whet'],
              text: 'バトルごとの最初のドローが2枚増える。', sub: 'タワー建設に特化した指揮官。砦の耐久値が高い。' }
};

// ============================================================
// 敵
// speed はマス/秒、armor は物理ダメージを減らす割合、life はゴールに着いた時に減るライフ
// revive：一度だけ体力半分で起き上がる。split：倒すと分かれる。immune：効かない状態異常。magicResist：魔法・炎を減らす割合
// fly：空を飛ぶ（道を通らず入口から砦へまっすぐ。罠・バリケード・兵士に止められず、大砲は当たらない）
// heal：近くの仲間の体力を回復する。summon：一定の時間ごとに手下を呼ぶ（ボス）
// ボスは砦に着いても消えず、砦の前で止まって bossHit.every 秒ごとに砦を攻撃する（1回で bossHit.dmg のライフが減る）
// ============================================================
G.ENEMIES = {
  slime:  { name: 'スライム',   hp: 48,   speed: 0.9,  armor: 0,   life: 1,  gold: 3,   gap: 1.2 },
  goblin: { name: 'ゴブリン',   hp: 35,   speed: 1.6,  armor: 0,   life: 1,  gold: 4,   gap: 0.9 },
  wolf:   { name: 'ウルフ',     hp: 28,   speed: 2.1,  armor: 0,   life: 1,  gold: 4,   gap: 0.7 },
  orc:    { name: 'オーク',     hp: 190,  speed: 0.6,  armor: 0.4, life: 2,  gold: 10,  gap: 2.6 },
  knight: { name: '重装オーク', hp: 260,  speed: 0.55, armor: 0.5, life: 3,  gold: 20,  gap: 4.0 },
  bat:    { name: 'コウモリ',   hp: 20,   speed: 0.95,  armor: 0,   life: 1,  gold: 3,   gap: 0.5, fly: true },
  skeleton: { name: 'ガイコツ', hp: 60,   speed: 1.0,  armor: 0.2, life: 1,  gold: 6,   gap: 1.4, revive: true },
  kingslime: { name: '大スライム', hp: 150, speed: 0.7, armor: 0,   life: 2,  gold: 8,   gap: 3.0, split: { type: 'slime', n: 3 } },
  yeti:   { name: 'イエティ',   hp: 240,  speed: 0.7,  armor: 0.2, life: 2,  gold: 14,  gap: 3.0, immune: ['slow'] },
  salamander: { name: '火トカゲ', hp: 120, speed: 1.2, armor: 0.1, life: 1, gold: 8,  gap: 1.6, immune: ['burn'], magicResist: 0.3 },
  icebat:    { name: '氷コウモリ', hp: 24,  speed: 0.95,  armor: 0,   life: 1,  gold: 4,   gap: 0.5, fly: true },
  harpy:     { name: 'ハーピー',   hp: 90, speed: 0.75, armor: 0,   life: 1,  gold: 8,   gap: 1.4, fly: true },
  wyvern:    { name: 'ワイバーン', hp: 380, speed: 0.48,  armor: 0.2, life: 3,  gold: 24,  gap: 4.0, fly: true, immune: ['burn'] },
  // warp：道の at（0〜1）まで進むと、別の入口の道の同じ進み具合の所へワープする（道が1本なら jump マス先へ）。2026-10-22 追加
  warper:    { name: '影の魔術師', hp: 80, speed: 0.95, armor: 0, magicResist: 0.2, life: 2, gold: 10, gap: 1.8, warp: { at: 0.4, jump: 3 } },
  shaman:    { name: 'ゴブリン呪術師', hp: 150, speed: 0.8, armor: 0, life: 2, gold: 14, gap: 3.0, heal: { r: 1.4, amt: 15, every: 3 } },
  goblinlord: { name: 'ゴブリン将軍', hp: 1400, speed: 0.42, armor: 0.25, life: 10, gold: 100, gap: 1, boss: true, summon: { type: 'goblin', n: 3, every: 8 } },
  lich:      { name: '死霊の王',   hp: 1000, speed: 0.4, armor: 0.2, magicResist: 0.2, life: 10, gold: 100, gap: 1, boss: true, summon: { type: 'skeleton', n: 2, every: 8 } },
  demonlord: { name: '魔王',       hp: 1800, speed: 0.36, armor: 0.3, life: 15, gold: 0, gap: 1, boss: true, final: true, immune: ['burn'], summon: { type: 'bat', n: 3, every: 7 } },
  iceknight: { name: '氷の騎士',   hp: 300, speed: 0.55, armor: 0.5, life: 3,  gold: 22,  gap: 4.0, immune: ['slow'] },
  magma:     { name: '溶岩スライム', hp: 160, speed: 0.7, armor: 0,  life: 2,  gold: 9,   gap: 3.0, immune: ['burn'], split: { type: 'salamander', n: 2 } },
  demon:     { name: '炎の悪魔',   hp: 320, speed: 0.7,  armor: 0.3, life: 3,  gold: 24,  gap: 4.0, immune: ['burn'], magicResist: 0.3 },
  frostgiant: { name: '霜の巨人',  hp: 1500, speed: 0.4, armor: 0.3, life: 10, gold: 100, gap: 1, boss: true, immune: ['slow'] },
  dragon:    { name: '火竜',       hp: 1800, speed: 0.35, armor: 0.3, life: 15, gold: 0, gap: 1, boss: true, final: true, immune: ['burn'], magicResist: 0.25 },
  ogre:   { name: 'オーガ王',   hp: 1500, speed: 0.4,  armor: 0.3, life: 10, gold: 100, gap: 1, boss: true },
  // ---- 追加のボス（2026-10-20） ----
  slimeking:  { name: 'スライムキング', hp: 1500, speed: 0.45, armor: 0,   life: 10, gold: 100, gap: 1, boss: true, split: { type: 'kingslime', n: 2 } },
  wolfking:   { name: '牙の王',     hp: 900,  speed: 0.8,  armor: 0,   life: 10, gold: 100, gap: 1, boss: true, summon: { type: 'wolf', n: 4, every: 6 } },
  harpyqueen: { name: 'ハーピークイーン', hp: 1000, speed: 0.5, armor: 0, life: 10, gold: 100, gap: 1, boss: true, fly: true, summon: { type: 'harpy', n: 2, every: 10 } },
  icecommander: { name: '氷の騎士団長', hp: 800, speed: 0.4, armor: 0.4, life: 10, gold: 100, gap: 1, boss: true, immune: ['slow'], summon: { type: 'iceknight', n: 1, every: 14 } },
  // freeze：every秒ごとに、いちばん近いタワーn個を dur秒 止める
  blizzardwitch: { name: '吹雪の魔女', hp: 1300, speed: 0.4, armor: 0, magicResist: 0.3, life: 10, gold: 100, gap: 1, boss: true, freeze: { n: 2, every: 10, dur: 3 } },
  flamegeneral: { name: '炎の将軍', hp: 1000, speed: 0.38, armor: 0.2, life: 15, gold: 0, gap: 1, boss: true, final: true, immune: ['burn'], summon: { type: 'salamander', n: 2, every: 10 }, heal: { r: 1.6, amt: 30, every: 3 } }
};

// ============================================================
// 攻撃の予定（ひな形）
// 1つの戦闘＝攻撃の回数ぶんの配列。1回の攻撃＝敵のグループの配列 [種類, 数, 最初の1体が出るまでの秒]
// 入口はマップの入口から自動で割りふる。体力は階が進むほど増える（G.RULES.floorScale）
// ============================================================
G.WAVE_SETS = {
  // ---- 第1層 草原 ----
  a1: {
    early: [
      [[['slime', 4, 0]], [['slime', 4, 0], ['goblin', 2, 3]], [['goblin', 4, 0], ['slime', 3, 2]]],
      [[['slime', 5, 0]], [['goblin', 4, 0]], [['slime', 4, 0], ['wolf', 2, 3]]],
      [[['slime', 6, 0]], [['slime', 5, 0], ['goblin', 4, 3]], [['goblin', 6, 0], ['slime', 5, 2]]],
      [[['goblin', 6, 0]], [['slime', 6, 0], ['wolf', 3, 4]], [['orc', 1, 0], ['goblin', 6, 2]]],
      [[['slime', 4, 0], ['slime', 4, 4]], [['wolf', 5, 0]], [['slime', 6, 0], ['orc', 1, 5]]],
      [[['bat', 3, 0]], [['wolf', 4, 0], ['slime', 4, 3]], [['kingslime', 1, 0], ['goblin', 6, 2]]]
    ],
    mid: [
      [[['goblin', 7, 0]], [['orc', 2, 0], ['slime', 8, 2]], [['wolf', 8, 0], ['orc', 3, 4]]],
      [[['slime', 8, 0]], [['orc', 2, 0], ['goblin', 7, 4]], [['wolf', 7, 0], ['goblin', 6, 2], ['orc', 2, 6]]],
      [[['bat', 4, 0]], [['kingslime', 2, 0], ['wolf', 5, 3]], [['orc', 3, 0], ['bat', 4, 3]]]
    ],
    elite: [[[['goblin', 4, 0], ['wolf', 2, 3]], [['knight', 1, 0], ['slime', 4, 3]], [['orc', 2, 0], ['wolf', 4, 4]], [['knight', 1, 0], ['goblin', 5, 3], ['orc', 1, 8]]],
            [[['goblin', 5, 0]], [['shaman', 1, 0], ['goblin', 6, 1]], [['orc', 2, 0], ['shaman', 1, 2], ['slime', 5, 4]], [['shaman', 2, 0], ['orc', 2, 1], ['wolf', 4, 5]]],
            [[['bat', 3, 0]], [['harpy', 2, 0], ['bat', 3, 3]], [['knight', 1, 0], ['harpy', 2, 3]], [['harpy', 3, 0], ['bat', 4, 2], ['orc', 1, 6]]]],
    boss: [[[['slime', 5, 0]], [['goblin', 5, 0], ['wolf', 3, 3]], [['orc', 2, 0], ['slime', 5, 3]],
            [['knight', 1, 0], ['wolf', 5, 3]], [['ogre', 1, 0], ['goblin', 5, 5], ['wolf', 4, 10]]],
           [[['goblin', 6, 0]], [['wolf', 5, 0], ['bat', 2, 3]], [['shaman', 1, 0], ['goblin', 6, 1]],
            [['orc', 2, 0], ['wolf', 5, 3]], [['goblinlord', 1, 0], ['shaman', 1, 3], ['wolf', 4, 10]]],
           // スライムキング（倒すと大スライムに分かれる）
           [[['slime', 6, 0]], [['slime', 4, 0], ['goblin', 4, 3]], [['kingslime', 2, 0], ['slime', 5, 3]],
            [['orc', 2, 0], ['wolf', 4, 3]], [['slimeking', 1, 0], ['slime', 5, 5], ['kingslime', 1, 10]]],
           // 牙の王（速い・ウルフを呼ぶ）
           [[['wolf', 7, 0]], [['goblin', 5, 0], ['wolf', 4, 3]], [['wolf', 6, 0], ['orc', 1, 2]],
            [['orc', 2, 0], ['wolf', 5, 3]], [['wolfking', 1, 0], ['wolf', 5, 5], ['goblin', 4, 10]]],
           // ハーピークイーン（空を飛ぶ・ハーピーを呼ぶ）
           [[['bat', 4, 0]], [['harpy', 2, 0], ['goblin', 5, 3]], [['bat', 3, 0], ['orc', 2, 3]],
            [['harpy', 3, 0], ['wolf', 4, 3]], [['harpyqueen', 1, 0], ['bat', 3, 5], ['harpy', 1, 10]]]]
  },
  // ---- 第2層 雪山 ----
  a2: {
    early: [
      [[['wolf', 4, 0]], [['skeleton', 2, 0], ['wolf', 3, 2]], [['wolf', 5, 0], ['skeleton', 2, 3]]],
      [[['skeleton', 3, 0]], [['wolf', 5, 0]], [['icebat', 3, 0], ['skeleton', 3, 2]]],
      [[['wolf', 6, 0]], [['icebat', 3, 0], ['skeleton', 3, 3]], [['yeti', 1, 0], ['wolf', 6, 2]]],
      [[['skeleton', 4, 0]], [['icebat', 4, 0]], [['yeti', 2, 0], ['skeleton', 4, 3]]],
      [[['icebat', 3, 0], ['wolf', 4, 3]], [['yeti', 1, 0], ['skeleton', 4, 2]], [['wolf', 8, 0], ['yeti', 1, 4]]]
    ],
    mid: [
      [[['wolf', 8, 0]], [['yeti', 2, 0], ['icebat', 3, 3]], [['skeleton', 6, 0], ['yeti', 2, 4]]],
      [[['skeleton', 6, 0]], [['icebat', 5, 0], ['wolf', 4, 3]], [['yeti', 3, 0], ['skeleton', 5, 4]]],
      [[['icebat', 3, 0], ['wolf', 4, 2]], [['harpy', 2, 0], ['skeleton', 5, 2]], [['yeti', 2, 0], ['harpy', 2, 3], ['icebat', 2, 5]]],
      [[['skeleton', 5, 0], ['warper', 2, 3]], [['wolf', 6, 0], ['warper', 3, 2]], [['yeti', 2, 0], ['warper', 3, 2], ['icebat', 3, 5]]]
    ],
    elite: [[[['wolf', 5, 0], ['icebat', 2, 3]], [['iceknight', 1, 0], ['skeleton', 4, 3]], [['yeti', 2, 0], ['wolf', 5, 4]], [['iceknight', 1, 0], ['icebat', 3, 3], ['yeti', 1, 8]]],
            [[['icebat', 4, 0]], [['harpy', 3, 0], ['icebat', 2, 3]], [['iceknight', 1, 0], ['harpy', 2, 3]], [['harpy', 4, 0], ['yeti', 2, 3]]],
            [[['skeleton', 5, 0]], [['shaman', 1, 0], ['skeleton', 5, 1]], [['yeti', 2, 0], ['shaman', 1, 2]], [['iceknight', 1, 0], ['shaman', 2, 2], ['skeleton', 5, 4]]]],
    boss: [[[['wolf', 6, 0]], [['skeleton', 5, 0], ['icebat', 3, 3]], [['yeti', 2, 0], ['wolf', 5, 3]],
            [['iceknight', 1, 0], ['skeleton', 5, 3]], [['frostgiant', 1, 0], ['icebat', 3, 5], ['yeti', 1, 10]]],
           [[['skeleton', 6, 0]], [['icebat', 3, 0], ['wolf', 5, 3]], [['harpy', 2, 0], ['skeleton', 5, 3]],
            [['iceknight', 1, 0], ['harpy', 2, 3]], [['lich', 1, 0], ['icebat', 3, 6], ['yeti', 1, 12]]],
           // 氷の騎士団長（遅くならない・氷の騎士を呼ぶ）
           [[['wolf', 6, 0]], [['skeleton', 4, 0], ['icebat', 3, 3]], [['yeti', 2, 0], ['skeleton', 4, 3]],
            [['iceknight', 1, 0], ['wolf', 5, 3]], [['icecommander', 1, 0], ['icebat', 3, 5], ['yeti', 1, 10]]],
           // 吹雪の魔女（近いタワーを一時的に止める）
           [[['icebat', 4, 0]], [['skeleton', 5, 0], ['wolf', 4, 3]], [['harpy', 2, 0], ['yeti', 1, 3]],
            [['iceknight', 1, 0], ['icebat', 3, 3]], [['blizzardwitch', 1, 0], ['skeleton', 4, 5], ['yeti', 1, 10]]]]
  },
  // ---- 第3層 火山 ----
  a3: {
    early: [
      [[['salamander', 3, 0]], [['skeleton', 3, 0], ['salamander', 2, 3]], [['salamander', 4, 0], ['skeleton', 2, 3]]],
      [[['skeleton', 3, 0]], [['salamander', 4, 0]], [['bat', 3, 0], ['salamander', 3, 2]]],
      [[['salamander', 4, 0]], [['bat', 4, 0], ['skeleton', 3, 3]], [['magma', 1, 0], ['salamander', 4, 3]]],
      [[['bat', 4, 0]], [['salamander', 5, 0], ['skeleton', 2, 3]], [['magma', 2, 0], ['bat', 3, 3]]],
      [[['skeleton', 4, 0]], [['salamander', 6, 0]], [['orc', 2, 0], ['salamander', 4, 3], ['bat', 2, 6]]]
    ],
    mid: [
      [[['salamander', 5, 0], ['bat', 2, 3]], [['magma', 2, 0], ['skeleton', 4, 3]], [['demon', 1, 0], ['salamander', 6, 3]]],
      [[['bat', 5, 0]], [['skeleton', 6, 0], ['magma', 1, 4]], [['salamander', 8, 0], ['orc', 3, 3]]],
      [[['salamander', 5, 0]], [['harpy', 3, 0], ['bat', 3, 2]], [['magma', 1, 0], ['harpy', 2, 2], ['salamander', 4, 4]]],
      [[['salamander', 4, 0], ['warper', 3, 2]], [['skeleton', 5, 0], ['warper', 4, 2]], [['demon', 1, 0], ['warper', 4, 2], ['salamander', 4, 5]]]
    ],
    elite: [[[['salamander', 5, 0], ['bat', 2, 3]], [['demon', 1, 0], ['skeleton', 4, 3]], [['magma', 2, 0], ['salamander', 5, 4]], [['demon', 2, 0], ['bat', 3, 3]]],
            [[['bat', 4, 0]], [['wyvern', 1, 0], ['bat', 3, 2]], [['harpy', 3, 0], ['salamander', 4, 2]], [['wyvern', 2, 0], ['harpy', 2, 4]]],
            [[['salamander', 6, 0]], [['shaman', 1, 0], ['magma', 1, 1]], [['demon', 1, 0], ['shaman', 1, 2], ['salamander', 4, 3]], [['wyvern', 1, 0], ['demon', 1, 3], ['shaman', 1, 4]]]],
    boss: [[[['salamander', 6, 0]], [['bat', 4, 0], ['skeleton', 4, 3]], [['magma', 2, 0], ['salamander', 5, 3]],
            [['demon', 1, 0], ['bat', 4, 3]], [['dragon', 1, 0], ['salamander', 6, 6], ['demon', 1, 12]]],
           [[['skeleton', 6, 0]], [['harpy', 3, 0], ['salamander', 4, 3]], [['magma', 2, 0], ['bat', 3, 3]],
            [['wyvern', 1, 0], ['demon', 1, 4]], [['demonlord', 1, 0], ['salamander', 5, 6], ['harpy', 2, 12]]],
           // 炎の将軍（火トカゲを呼ぶ・まわりを回復）
           [[['salamander', 6, 0]], [['bat', 4, 0], ['skeleton', 4, 3]], [['magma', 2, 0], ['salamander', 4, 3]],
            [['demon', 1, 0], ['salamander', 4, 3]], [['flamegeneral', 1, 0], ['salamander', 4, 6], ['demon', 1, 12]]]]
  }
};

// ============================================================
// 層（ACT）：3層で1ラン。層ごとに地域・マップ・敵の強さが変わる
// maps：ふつうの戦闘のマップ（theme で色を変えて使い回す）。big：エリート・ボスのマップ
// ============================================================
G.ACTS = [
  { name: '第1層', area: '草原', theme: 'grass',   maps: ['field', 'snake', 'zigzag', 'cross', 'ushape', 'stairs', 'twin', 'hook', 'wave', 'longsnake', 'forkgate'], big: ['valley', 'crown', 'trident'], hp: 1.0 },
  { name: '第2層', area: '雪山', theme: 'snow',    maps: ['snowpass', 'snowpass', 'field', 'snake', 'zigzag', 'cross', 'ushape', 'stairs', 'twin', 'hook', 'wave', 'longsnake', 'spiral', 'forkgate'], big: ['valley', 'crown', 'trident'], hp: 1.05 },
  { name: '第3層', area: '火山', theme: 'volcano', maps: ['lavaflow', 'lavaflow', 'snake', 'field', 'zigzag', 'cross', 'ushape', 'stairs', 'twin', 'hook', 'wave', 'longsnake', 'spiral', 'forkgate'], big: ['valley', 'crown', 'trident'], hp: 1.2 }
];

// ============================================================
// イベント（？マス）。choices の effect は run.js が実行する
// ============================================================
G.EVENTS = [
  { id: 'smith', acts: [1, 2, 3], title: '旅の鍛冶屋', text: '道ばたで鍛冶屋が店を広げている。「いらない道具を引き取ろうか？」',
    choices: [{ label: 'カードを1枚鍛える', note: '-●40、カードを＋にする', effect: 'upgradeCard', gold: -40 },
              { label: 'カードを1枚手放す', note: '-●30', effect: 'removeCard', gold: -30 },
              { label: '立ち去る', effect: 'none' }] },
  { id: 'spring', acts: [1], title: '不思議な泉', text: '澄んだ水がわき出ている。底には金貨が光っている。',
    choices: [{ label: '水を飲む', note: '砦の耐久値+8', effect: 'heal', amount: 8 },
              { label: '金貨を投げ入れる', note: '-●10、ランダムなカードを1枚得る', effect: 'randomCard', gold: -10 }] },
  { id: 'fallen', acts: [1, 2], title: '倒れた冒険者', text: '冒険者が倒れている。荷物は手つかずのようだ。',
    choices: [{ label: '荷物を探す', note: '+●40、砦の耐久値-4', effect: 'goldLife', gold: 40, life: -4 },
              { label: '弔う', note: '砦の耐久値+3', effect: 'heal', amount: 3 }] },
  { id: 'gambler', acts: [1, 2, 3], title: '賭け好きの商人', text: '「コインの裏表、当てたら3倍だ」',
    choices: [{ label: '●20を賭ける', note: '50%で+●60', effect: 'gamble', gold: -20, win: 60 },
              { label: '断る', effect: 'none' }] },
  { id: 'altar', acts: [3], title: '古い祭壇', text: '赤い石の祭壇。ささげ物をすれば力を授けるという。',
    choices: [{ label: '血をささげる', note: '砦の耐久値-6、珍しいカードを3枚から1枚選ぶ', effect: 'rareCard', life: -6 },
              { label: '立ち去る', effect: 'none' }] },
  { id: 'child', acts: [1], title: '迷子の子ども', text: '泣いている子どもがいる。家まで送ると遠回りになりそうだ。',
    choices: [{ label: '家まで送る', note: '砦の耐久値-3、お礼にレリックを1つ', effect: 'relic', life: -3 },
              { label: '道だけ教える', note: '+●15（親からのお礼）', effect: 'goldLife', gold: 15 }] },
  { id: 'box', acts: [1, 2, 3], title: '謎の宝箱', text: '古びた宝箱。鍵はかかっていないが、何かの気配がする。',
    choices: [{ label: '開ける', note: '50%でレリック、50%で砦の耐久値-6', effect: 'box' },
              { label: '開けない', effect: 'none' }] },
  { id: 'forge', acts: [3], title: '溶岩の鍛冶場', text: '溶岩の熱を使う鍛冶場。「同じ道具をもう1つ作ってやろう」',
    choices: [{ label: 'カードを1枚複製する', note: '-●40、選んだカードと同じものをデッキに追加', effect: 'copyCard', gold: -40 },
              { label: '立ち去る', effect: 'none' }] },
  { id: 'hut', acts: [2], title: '雪山の小屋', text: '暖炉のある無人の小屋。薪が積んである。',
    choices: [{ label: '暖まって休む', note: '砦の耐久値+6', effect: 'heal', amount: 6 },
              { label: '薪を売りに持っていく', note: '+●25', effect: 'goldLife', gold: 25 }] },
  { id: 'shrine', acts: [2], title: '氷の祠', text: '氷に閉じ込められた祠。中に何かが光っている。',
    choices: [{ label: '素手で氷を割る', note: '砦の耐久値-5、レリックを1つ', effect: 'relic', life: -5 },
              { label: '祈るだけにする', note: '砦の耐久値+4', effect: 'heal', amount: 4 }] },
  { id: 'stranded', acts: [2], title: '遭難した旅人', text: '雪に埋もれかけた旅人がいる。「食べ物を分けてくれないか」',
    choices: [{ label: '食料を分ける', note: '-●20、砦の最大耐久値+4', effect: 'maxLife', gold: -20, amount: 4 },
              { label: '道を急ぐ', effect: 'none' }] },
  { id: 'firespring', acts: [3], title: '火の泉', text: '煮えたぎる泉。浴びれば体がきたえられるという。',
    choices: [{ label: '泉を浴びる', note: '砦の耐久値-8、砦の最大耐久値+6', effect: 'maxLife', life: -8, amount: 6 },
              { label: '立ち去る', effect: 'none' }] },
  // 傭兵団の野営地（2026-10-23 オーナー指定・全層）。say：選んだ後に出る文。se：選んだ時の効果音
  //   needLife：ライフがこの数より少ないと選べない（ライフ15以下では稽古を選べない）。お金が足りない時も選べない
  { id: 'mercs', acts: [1, 2, 3], title: '傭兵団の野営地', text: '道の脇で傭兵たちが野営している。たき火の向こうから、傷だらけの団長が声をかけてきた。\n「ここらは危ないぜ？ あんたら、訓練は十分か？」',
    choices: [{ label: '厳しい稽古をつけてもらう', note: '砦の耐久値-15、カードを1枚手放す', effect: 'drill', life: -15, needLife: 16, se: 'drill',
                say: '稽古は夜明けまで続いた。翌朝、隊の一部が書き置きを残して姿を消していた。\n団長は笑った。「ついて来られないやつが抜けただけさ。残ったのは本物だ」' },
              { label: '物資を売ってもらう', note: '-●20、ランダムなスキル3枚から1枚選ぶ', effect: 'skillCard', gold: -20, se: 'supplies',
                say: '団長が荷車の布をめくった。「戦場で拾った物ばかりだが、まだ使えるぜ」' },
              { label: '無視する', effect: 'none', se: 'walkaway',
                say: '団長は肩をすくめた。「忠告はしたぜ」\n背中に笑い声を聞きながら、先へ進んだ。' }] },
  { id: 'lavatreasure', acts: [3], title: '溶岩の中の宝', text: '溶岩の流れの向こうに金貨の山が見える。',
    choices: [{ label: '手を伸ばす', note: '50%で+●80、50%で砦の耐久値-8', effect: 'risk', win: 80, lose: 8 },
              { label: 'やめておく', effect: 'none' }] }
];

// ============================================================
// レリック（持っているだけで効く。エリート撃破・商人・イベントで手に入る）
// kind：number（数値が上がる）/ change（遊び方が変わる）
// ============================================================
G.RELICS = {
  sharp:     { name: '鋭い矢じり', kind: 'number', rarity: 'common',   text: '物理のタワーの攻撃力+15%。' },
  crystal:   { name: '魔力の結晶', kind: 'number', rarity: 'common',   text: '魔法のタワー（魔導士・氷・炎・雷・毒）の攻撃力+20%。' },
  oldmap:    { name: '古い地図',   kind: 'number', rarity: 'common',   text: 'すべてのタワーの射程+0.3マス。' },
  scale:     { name: '金の天秤',   kind: 'number', rarity: 'common',   text: '敵を倒した時のお金+1。' },
  vial:      { name: '毒の小瓶',   kind: 'number', rarity: 'common',   text: '毒とやけどの時間+2秒。' },
  frostbell: { name: '氷の鈴',     kind: 'number', rarity: 'uncommon', text: 'すべての敵の速さ-10%。' },
  banner:    { name: '戦旗',       kind: 'number', rarity: 'uncommon', text: '戦闘の最初の準備ターンだけ、エネルギー+2。' },
  spring:    { name: '泉の水',     kind: 'number', rarity: 'uncommon', text: '戦闘に勝つと砦の耐久値+3。' },
  seal:      { name: '商人の印',   kind: 'number', rarity: 'uncommon', text: '商人の値段が25%安くなる。' },
  blueprint: { name: '設計図の束', kind: 'change', rarity: 'uncommon', text: 'タワーを建てると、1ターンに1回だけカードを1枚引く。' },
  wall:      { name: '応急の石壁', kind: 'change', rarity: 'rare',     text: '攻撃1回ごとに、砦に着いた最初の敵では砦の耐久値が減らない。' },
  stone:     { name: 'エネルギー石', kind: 'change', rarity: 'rare',   text: '毎ターンのエネルギー+1。' },
  // ---- 組み合わせのレリック（2つの効果が重なると強くなる） ----
  conductor: { name: '導電の氷',   kind: 'combo', rarity: 'uncommon', text: '遅くなっている敵（氷・沼）が受ける雷のダメージが2倍。' },
  oil:       { name: '油の壺',     kind: 'combo', rarity: 'uncommon', text: '沼で遅くなっている敵に炎が当たると、ダメージ1.5倍・やけどの時間2倍。' },
  brittle:   { name: '砕ける霜',   kind: 'combo', rarity: 'common',   text: '遅くなっている敵（氷・沼）への物理ダメージ+25%。' },
  plague:    { name: '疫病の灰',   kind: 'combo', rarity: 'rare',     text: '毒の敵が倒れると、周り1.2マスの敵に同じ毒がうつる。' },
  // ---- 経験値をためると解放されるレリック（unlock: true） ----
  magnet:    { name: '金の磁石',   kind: 'number', rarity: 'uncommon', unlock: true, text: '敵を倒した時のお金+25%。' },
  anvil:     { name: '見習いの金床', kind: 'change', rarity: 'uncommon', unlock: true, text: '戦闘で最初に建てたタワーは、強化1回分のレベルで置かれる。' },
  crown:     { name: '小さな王冠', kind: 'number', rarity: 'rare',     unlock: true, text: '毎ターン引くカード+1枚。' },
  // 王の解任状（2026-10-23 オーナー指定）：手に入れた時、デッキからカードを2枚まで手放せる（1回きり。run.dismiss に残りの枚数）
  dismiss:   { name: '王の解任状', kind: 'change', rarity: 'rare', text: '手に入れた時、デッキからカードを2枚まで手放せる。' },
  phoenix:   { name: '不死鳥の羽', kind: 'change', rarity: 'rare',     unlock: true, text: '砦の耐久値が0になった時、1回だけ砦の耐久値10で立ち直る（使うと消える）。' },
  // ---- 指揮官のレリック（最初から1つだけ持っている。報酬・商人・イベントでは出ない） ----
  cmd_captain:  { name: '隊長の勲章',   kind: 'commander', rarity: 'starter', text: '攻撃力・攻撃速度を上げるスキルのコストが1下がる。' },   // 2026-10-24 対象を絞った（buff: true のスキルだけ）。2026-10-22 変更（前：勝つたびにお金+8）。0より下にはならない（説明には書かない）
  cmd_witch:    { name: '魔導師の杖',     kind: 'commander', rarity: 'starter', text: '魔法のタワーの攻撃力+25%。毒とやけどが1秒長く続く。' },
  cmd_engineer: { name: '熟練工兵の工具箱', kind: 'commander', rarity: 'starter', text: 'バトルごとの最初のドローが2枚増える。' }   // 2026-10-24 変更（前：タワーの強化の値段が30%安い）
};
Object.keys(G.RELICS).forEach(function (k) { G.RELICS[k].id = k; });

// ============================================================
// 経験値と解放（ランが終わるたびに経験値がたまり、決まった量を超えるごとに次のランから新しいカード・レリックが出る）
// ============================================================
G.UNLOCKS = [
  { xp: 150,  kind: 'card',  id: 'overclock' },
  { xp: 400,  kind: 'relic', id: 'magnet' },
  { xp: 700,  kind: 'card',  id: 'architect' },
  { xp: 1100, kind: 'relic', id: 'anvil' },
  { xp: 1600, kind: 'card',  id: 'meteor' },
  { xp: 2200, kind: 'relic', id: 'crown' },
  { xp: 3000, kind: 'relic', id: 'phoenix' }
];
// 経験値の計算（数はラン全体で数える）
G.XP_RULES = { battle: 8, elite: 20, boss: 60, floor: 2, clear: 150 };

// ---- ダメージ数字の色 ----
// normal：ふつう / resisted：よろい・耐性で減った / poison：毒 / burn：やけど（今後）
G.DMG_COLORS = { normal: '#ffffff', resisted: '#8fa6bd', poison: '#a6e85a', burn: '#ff9a3a', combo: '#ffd84a' };

// アップ・ダウンの色（ゲーム全体で統一）
// アップ＝強くなる（強化ボタン、強化後の射程、強くなる数値の差）＝赤
// ダウン＝弱くなる（弱体、射程が縮む、弱くなる数値の差）＝青
G.UP_COLOR = '#ff5b4a';
G.DOWN_COLOR = '#4ea8ff';

// ============================================================
// ルール（仮の数値）
// ============================================================
// 何日目か（2026-10-23 オーナー指定。前は「1層3階」）。地域が変わっても0にもどさない。1地域＝10マス＋ボス＝11日（ボスのマスも1日）
// act：1〜3、floor：0から（ボスのマスは floors 以上）、boss：ボスのマスなら true
G.dayOf = function (act, floor, boss) { var F = G.RULES.floors; return (act - 1) * (F + 1) + (boss || floor >= F ? F + 1 : floor + 1); };

G.RULES = {
  // 敵の数とマップの道の長さ（2026-10-22）：敵の数を「その敵が通る道の長さ ÷ mapLenRef」倍にする（ボスは増やさない）
  // mapLenRef は「草原の分かれ道」（field）の道の長さ。マップごとに決めたい時は G.MAPS[種類].enemyMult に倍率を書く（書いた方が優先）
  mapLenRef: 25.8,
  maxLife: 40,        // ラン全体のライフ（戦闘をまたいで持ち越す）
  startGold: 30,      // ラン開始時のお金（戦闘・商人で共通）
  energyPerTurn: 3,   // 準備ターンの始めにこの値まで回復（持ち越しなし）
  drawPerTurn: 4,     // 毎ターン無料で引く枚数
  handMax: 8,
  extraDrawCost: 15,  // お金で1枚追加で引く
  floors: 10,         // 1層あたりのボスの前の階の数（最後の階はたき火）
  acts: 3,            // 層の数（3層目のボスがラスボス）
  actHeal: 99,        // 次の層へ進む時に回復するライフ（99＝全回復）
  restPerRoute: [2, 5],   // どの道を通っても、たき火マスはこの範囲（最後の階のたき火も数える）
  shopPerRoute: 2,        // どの道を通っても、商人マスはこの数まで
  floorScale: 0.04,   // 1階進むごとに敵の体力が4%ずつ増える（数はひな形どおり）
  battleGold: { battle: 10, elite: 30 },   // 戦闘に勝った時のおまけのお金
  restHeal: 20,   // たき火の「休む」で回復するライフ（2026-10-24 12→20・オーナー指定）
  bossHit: { every: 2.5, dmg: 7, finalDmg: 10 },   // 砦の前で止まったボスの攻撃（間隔の秒・1回で減るライフ。ラスボスは finalDmg）
  bossHp: 0.7,        // ボスの体力の倍率（階が進む分の倍率はボスにはかけず、層の倍率×これ）
  easyBattles: 3,     // 各層の最初の3回の通常戦闘は、その層で弱い方の攻撃のひな形から選ぶ
  easyPool: 3,        // 弱い順に何個のひな形から選ぶか
  shop: { price: { common: 35, uncommon: 55, rare: 80 }, remove: 50, heal: 30, healAmount: 10,
          relicPrice: { common: 90, uncommon: 120, rare: 160 } }
};

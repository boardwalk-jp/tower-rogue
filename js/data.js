// データ：マップ・タワー・カード・敵・攻撃の予定・イベント・ルール
// 数値はすべて試作用の仮の値（SPEC.md「数値全般」は未定）
'use strict';
var G = window.G = window.G || {};

// ============================================================
// バトルマップ（1マス = 横16ドット × 縦12ドットの斜め見下ろし、11×15マス）
// . 地面（タワーを置ける）  # 道  T 木（地域で見た目が変わる）  R 岩  L 湖・溶岩（置けない）  X 城の敷地（置けない）  A/B/C 入口（いちばん上の行）  G 城（ゴール）
// paths は入口ごとの敵の通り道（マスの中心座標）。洞穴の出口のすぐ前（y=0.8）から出てくる
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
Object.keys(G.MAPS).forEach(function (k) {
  var m = G.MAPS[k];
  m.id = k; m.cols = m.rows[0].length; m.rowsN = m.rows.length;
  m.rows.forEach(function (r, i) { if (r.length !== m.cols) throw new Error('map ' + k + ' row ' + i + ' width'); });
});
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
    name: '見張り小屋', muzzle: 1.1, cost: 0, range: 2.0, dmg: 3, rate: 0.8, dmgType: 'physical', shot: 'arrow', speed: 9,
    text: 'エネルギー0で建てられる小さな見張り。弱いが数を並べられる。',
    up: [{ cost: 15, dmg: 5, range: 2.2, rate: 0.75 }, { cost: 30, dmg: 8, range: 2.4, rate: 0.7 }]
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
    name: '魔導士の塔', cost: 2, range: 2.2, dmg: 15, rate: 1.6, dmgType: 'magic', shot: 'orb', speed: 5,
    text: '魔法の玉。よろいを無視する。',
    up: [{ cost: 30, dmg: 26, range: 2.5, rate: 1.5 }, { cost: 60, dmg: 42, range: 2.8, rate: 1.4 }]
  },
  cannon: {
    name: '大砲', muzzle: 0.6, cost: 2, range: 2.4, dmg: 11, rate: 2.0, dmgType: 'physical', shot: 'ball', speed: 4, splash: 0.95,
    text: '砲弾が爆発し、まわりの敵もまとめて攻撃。',
    up: [{ cost: 30, dmg: 18, range: 2.6, rate: 1.9, splash: 1.1 }, { cost: 60, dmg: 28, range: 2.8, rate: 1.8, splash: 1.25 }]
  },
  frost: {
    name: '氷の塔', muzzle: 1.7, cost: 2, range: 2.2, dmg: 4, rate: 1.2, dmgType: 'magic', shot: 'ice', speed: 6,
    slow: { pct: 0.4, dur: 1.5 },
    text: '当たった敵を遅くする（1.5秒間）。ダメージは小さい。',
    up: [{ cost: 30, dmg: 6, range: 2.4, rate: 1.1, slow: { pct: 0.5, dur: 1.5 } }, { cost: 60, dmg: 9, range: 2.6, rate: 1.0, slow: { pct: 0.6, dur: 2 } }]
  },
  fire: {
    name: '炎の塔', muzzle: 1.6, cost: 2, range: 2.2, dmg: 6, rate: 1.4, dmgType: 'magic', shot: 'flame', speed: 6, splash: 0.6,
    burn: { dps: 8, dur: 2 },
    text: '火の玉で周りの敵もまとめて燃やす（2秒間、毎秒ダメージ）。火に強い敵には効かない。',
    up: [{ cost: 30, dmg: 9, splash: 0.7, burn: { dps: 12, dur: 2 } }, { cost: 60, dmg: 13, range: 2.5, splash: 0.8, burn: { dps: 18, dur: 2.5 } }]
  },
  thunder: {
    name: '雷の塔', muzzle: 1.8, cost: 2, range: 2.4, dmg: 10, rate: 1.5, dmgType: 'magic', shot: 'spark', speed: 16, chain: 2,
    text: '当たった敵から近くの敵へ電気が飛ぶ（2体まで、70%のダメージ）。',
    up: [{ cost: 30, dmg: 15, chain: 3 }, { cost: 60, dmg: 22, range: 2.7, chain: 4 }]
  },
  mine: {
    name: '金鉱', muzzle: 0.5, cost: 1, range: 0, dmg: 0, rate: 1, dmgType: 'none', noAttack: true, income: 8,
    text: '攻撃しない。攻撃を1回しのぐたびにお金+8。',
    up: [{ cost: 25, income: 14 }, { cost: 50, income: 22 }]
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
  aim:      { kind: 'skill', name: '狙い撃ち', cost: 0, target: 'tower', rarity: 'starter', icon: 'eye',
              text: 'タワー1つの攻撃力をこのターンだけ1.5倍。' },

  watch:    { kind: 'tower', tower: 'watch', rarity: 'common' },
  archer:   { kind: 'tower', tower: 'archer', rarity: 'common' },
  poison:   { kind: 'tower', tower: 'poison', rarity: 'common' },
  mage:     { kind: 'tower', tower: 'mage', rarity: 'uncommon' },
  cannon:   { kind: 'tower', tower: 'cannon', rarity: 'uncommon' },
  frost:    { kind: 'tower', tower: 'frost', rarity: 'uncommon' },
  ballista: { kind: 'tower', tower: 'ballista', rarity: 'rare' },
  fire:     { kind: 'tower', tower: 'fire', rarity: 'uncommon' },
  thunder:  { kind: 'tower', tower: 'thunder', rarity: 'uncommon' },
  mine:     { kind: 'tower', tower: 'mine', rarity: 'common' },

  supply:   { kind: 'skill', name: '補給', cost: 0, target: 'none', rarity: 'common', icon: 'bag',
              text: 'カードを2枚引く。' },
  whet:     { kind: 'skill', name: '研ぎ石', cost: 0, target: 'tower', rarity: 'common', icon: 'stone',
              text: 'タワー1つの攻撃力を+3（この戦闘中ずっと）。' },
  tax:      { kind: 'skill', name: '臨時徴税', cost: 0, target: 'none', rarity: 'common', icon: 'coin', exhaust: true,
              text: 'お金+20。使い切り（この戦闘中は戻らない）。' },
  forge:    { kind: 'skill', name: '鍛冶仕事', cost: 1, target: 'tower', rarity: 'uncommon', icon: 'hammer',
              text: 'タワー1つをお金を使わずにLv+1（この戦闘中ずっと）。' },
  warcry:   { kind: 'skill', name: '号令', cost: 1, target: 'none', rarity: 'uncommon', icon: 'horn',
              text: 'すべてのタワーの攻撃速度をこのターンだけ1.5倍。' },
  workshop: { kind: 'skill', name: '急造工房', cost: 2, target: 'none', rarity: 'rare', icon: 'saw', exhaust: true,
              text: '「弓兵の塔（エネルギー0・使い切り）」を2枚手札に加える。使い切り。',
              give: { card: 'archer', n: 2, cost: 0 } }
};
// タワーのカードは名前・コスト・説明をタワーから取る
Object.keys(G.CARDS).forEach(function (id) {
  var c = G.CARDS[id]; c.id = id;
  if (c.kind === 'tower') { var T = G.TOWERS[c.tower]; c.name = T.name; c.cost = T.cost; c.text = T.text; }
});

// 初期デッキ（8枚・3種類）：見習い弓兵×4、投石小屋×3、狙い撃ち×1
G.START_DECK = ['bowman', 'bowman', 'bowman', 'bowman', 'sling', 'sling', 'sling', 'aim'];

// ============================================================
// 敵
// speed はマス/秒、armor は物理ダメージを減らす割合、life はゴールに着いた時に減るライフ
// revive：一度だけ体力半分で起き上がる。split：倒すと分かれる。immune：効かない状態異常。magicResist：魔法・炎を減らす割合
// ============================================================
G.ENEMIES = {
  slime:  { name: 'スライム',   hp: 48,   speed: 0.9,  armor: 0,   life: 1,  gold: 3,   gap: 1.2 },
  goblin: { name: 'ゴブリン',   hp: 35,   speed: 1.6,  armor: 0,   life: 1,  gold: 4,   gap: 0.9 },
  wolf:   { name: 'ウルフ',     hp: 28,   speed: 2.1,  armor: 0,   life: 1,  gold: 4,   gap: 0.7 },
  orc:    { name: 'オーク',     hp: 190,  speed: 0.6,  armor: 0.4, life: 2,  gold: 10,  gap: 2.6 },
  knight: { name: '重装オーク', hp: 260,  speed: 0.55, armor: 0.5, life: 3,  gold: 20,  gap: 4.0 },
  bat:    { name: 'コウモリ',   hp: 20,   speed: 2.5,  armor: 0,   life: 1,  gold: 3,   gap: 0.5 },
  skeleton: { name: 'ガイコツ', hp: 60,   speed: 1.0,  armor: 0.2, life: 1,  gold: 6,   gap: 1.4, revive: true },
  kingslime: { name: '大スライム', hp: 150, speed: 0.7, armor: 0,   life: 2,  gold: 8,   gap: 3.0, split: { type: 'slime', n: 3 } },
  yeti:   { name: 'イエティ',   hp: 240,  speed: 0.7,  armor: 0.2, life: 2,  gold: 14,  gap: 3.0, immune: ['slow'] },
  salamander: { name: '火トカゲ', hp: 120, speed: 1.2, armor: 0.1, life: 1, gold: 8,  gap: 1.6, immune: ['burn'], magicResist: 0.3 },
  icebat:    { name: '氷コウモリ', hp: 24,  speed: 2.4,  armor: 0,   life: 1,  gold: 4,   gap: 0.5 },
  iceknight: { name: '氷の騎士',   hp: 300, speed: 0.55, armor: 0.5, life: 3,  gold: 22,  gap: 4.0, immune: ['slow'] },
  magma:     { name: '溶岩スライム', hp: 160, speed: 0.7, armor: 0,  life: 2,  gold: 9,   gap: 3.0, immune: ['burn'], split: { type: 'salamander', n: 2 } },
  demon:     { name: '炎の悪魔',   hp: 320, speed: 0.7,  armor: 0.3, life: 3,  gold: 24,  gap: 4.0, immune: ['burn'], magicResist: 0.3 },
  frostgiant: { name: '霜の巨人',  hp: 1700, speed: 0.4, armor: 0.3, life: 10, gold: 100, gap: 1, boss: true, immune: ['slow'] },
  dragon:    { name: '火竜',       hp: 2600, speed: 0.35, armor: 0.35, life: 15, gold: 0, gap: 1, boss: true, immune: ['burn'], magicResist: 0.25 },
  ogre:   { name: 'オーガ王',   hp: 1500, speed: 0.4,  armor: 0.3, life: 10, gold: 100, gap: 1, boss: true }
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
      [[['slime', 6, 0]], [['slime', 5, 0], ['goblin', 4, 3]], [['goblin', 6, 0], ['slime', 5, 2]]],
      [[['goblin', 6, 0]], [['slime', 6, 0], ['wolf', 3, 4]], [['orc', 1, 0], ['goblin', 6, 2]]],
      [[['slime', 4, 0], ['slime', 4, 4]], [['wolf', 5, 0]], [['slime', 6, 0], ['orc', 1, 5]]],
      [[['bat', 6, 0]], [['wolf', 4, 0], ['slime', 4, 3]], [['kingslime', 1, 0], ['goblin', 6, 2]]]
    ],
    mid: [
      [[['goblin', 7, 0]], [['orc', 2, 0], ['slime', 8, 2]], [['wolf', 8, 0], ['orc', 3, 4]]],
      [[['slime', 8, 0]], [['orc', 2, 0], ['goblin', 7, 4]], [['wolf', 7, 0], ['goblin', 6, 2], ['orc', 2, 6]]],
      [[['bat', 8, 0]], [['kingslime', 2, 0], ['wolf', 5, 3]], [['orc', 3, 0], ['bat', 8, 3]]]
    ],
    elite: [[[['goblin', 4, 0], ['wolf', 2, 3]], [['knight', 1, 0], ['slime', 4, 3]], [['orc', 2, 0], ['wolf', 4, 4]], [['knight', 1, 0], ['goblin', 5, 3], ['orc', 1, 8]]]],
    boss: [[[['slime', 5, 0]], [['goblin', 5, 0], ['wolf', 3, 3]], [['orc', 2, 0], ['slime', 5, 3]],
            [['knight', 1, 0], ['wolf', 5, 3]], [['ogre', 1, 0], ['goblin', 5, 5], ['wolf', 4, 10]]]]
  },
  // ---- 第2層 雪山 ----
  a2: {
    early: [
      [[['wolf', 6, 0]], [['icebat', 6, 0], ['skeleton', 3, 3]], [['yeti', 1, 0], ['wolf', 6, 2]]],
      [[['skeleton', 4, 0]], [['icebat', 8, 0]], [['yeti', 2, 0], ['skeleton', 4, 3]]],
      [[['icebat', 5, 0], ['wolf', 4, 3]], [['yeti', 1, 0], ['skeleton', 4, 2]], [['wolf', 8, 0], ['yeti', 1, 4]]]
    ],
    mid: [
      [[['wolf', 8, 0]], [['yeti', 2, 0], ['icebat', 6, 3]], [['skeleton', 6, 0], ['yeti', 2, 4]]],
      [[['skeleton', 6, 0]], [['icebat', 10, 0], ['wolf', 4, 3]], [['yeti', 3, 0], ['skeleton', 5, 4]]]
    ],
    elite: [[[['wolf', 5, 0], ['icebat', 4, 3]], [['iceknight', 1, 0], ['skeleton', 4, 3]], [['yeti', 2, 0], ['wolf', 5, 4]], [['iceknight', 1, 0], ['icebat', 6, 3], ['yeti', 1, 8]]]],
    boss: [[[['wolf', 6, 0]], [['skeleton', 5, 0], ['icebat', 5, 3]], [['yeti', 2, 0], ['wolf', 5, 3]],
            [['iceknight', 1, 0], ['skeleton', 5, 3]], [['frostgiant', 1, 0], ['icebat', 6, 5], ['yeti', 1, 10]]]]
  },
  // ---- 第3層 火山 ----
  a3: {
    early: [
      [[['salamander', 4, 0]], [['bat', 8, 0], ['skeleton', 3, 3]], [['magma', 1, 0], ['salamander', 4, 3]]],
      [[['bat', 8, 0]], [['salamander', 5, 0], ['skeleton', 2, 3]], [['magma', 2, 0], ['bat', 6, 3]]],
      [[['skeleton', 4, 0]], [['salamander', 6, 0]], [['orc', 2, 0], ['salamander', 4, 3], ['bat', 4, 6]]]
    ],
    mid: [
      [[['salamander', 5, 0], ['bat', 4, 3]], [['magma', 2, 0], ['skeleton', 4, 3]], [['demon', 1, 0], ['salamander', 6, 3]]],
      [[['bat', 10, 0]], [['skeleton', 6, 0], ['magma', 1, 4]], [['salamander', 8, 0], ['orc', 3, 3]]]
    ],
    elite: [[[['salamander', 5, 0], ['bat', 4, 3]], [['demon', 1, 0], ['skeleton', 4, 3]], [['magma', 2, 0], ['salamander', 5, 4]], [['demon', 2, 0], ['bat', 6, 3]]]],
    boss: [[[['salamander', 6, 0]], [['bat', 8, 0], ['skeleton', 4, 3]], [['magma', 2, 0], ['salamander', 5, 3]],
            [['demon', 1, 0], ['bat', 8, 3]], [['dragon', 1, 0], ['salamander', 6, 6], ['demon', 1, 12]]]]
  }
};

// ============================================================
// 層（ACT）：3層で1ラン。層ごとに地域・マップ・敵の強さが変わる
// maps：ふつうの戦闘のマップ（theme で色を変えて使い回す）。big：エリート・ボスのマップ
// ============================================================
G.ACTS = [
  { name: '第1層', area: '草原', theme: 'grass',   maps: ['field', 'snake'],              big: 'valley', hp: 1.0, boss: 'オーガ王' },
  { name: '第2層', area: '雪山', theme: 'snow',    maps: ['snowpass', 'snowpass', 'field', 'snake'], big: 'valley', hp: 1.05, boss: '霜の巨人' },
  { name: '第3層', area: '火山', theme: 'volcano', maps: ['lavaflow', 'lavaflow', 'snake', 'field'], big: 'valley', hp: 1.2, boss: '火竜' }
];

// ============================================================
// イベント（？マス）。choices の effect は run.js が実行する
// ============================================================
G.EVENTS = [
  { id: 'smith', acts: [1, 2, 3], title: '旅の鍛冶屋', text: '道ばたで鍛冶屋が店を広げている。「いらない道具を引き取ろうか？」',
    choices: [{ label: 'カードを1枚手放す', note: '-30G', effect: 'removeCard', gold: -30 },
              { label: '立ち去る', effect: 'none' }] },
  { id: 'spring', acts: [1], title: '不思議な泉', text: '澄んだ水がわき出ている。底には金貨が光っている。',
    choices: [{ label: '水を飲む', note: 'ライフ+8', effect: 'heal', amount: 8 },
              { label: '金貨を投げ入れる', note: '-10G、ランダムなカードを1枚得る', effect: 'randomCard', gold: -10 }] },
  { id: 'fallen', acts: [1, 2], title: '倒れた冒険者', text: '冒険者が倒れている。荷物は手つかずのようだ。',
    choices: [{ label: '荷物を探す', note: '+40G、ライフ-4', effect: 'goldLife', gold: 40, life: -4 },
              { label: '弔う', note: 'ライフ+3', effect: 'heal', amount: 3 }] },
  { id: 'gambler', acts: [1, 2, 3], title: '賭け好きの商人', text: '「コインの裏表、当てたら3倍だ」',
    choices: [{ label: '20Gを賭ける', note: '50%で+60G', effect: 'gamble', gold: -20, win: 60 },
              { label: '断る', effect: 'none' }] },
  { id: 'altar', acts: [3], title: '古い祭壇', text: '赤い石の祭壇。ささげ物をすれば力を授けるという。',
    choices: [{ label: '血をささげる', note: 'ライフ-6、珍しいカードを3枚から1枚選ぶ', effect: 'rareCard', life: -6 },
              { label: '立ち去る', effect: 'none' }] },
  { id: 'child', acts: [1], title: '迷子の子ども', text: '泣いている子どもがいる。家まで送ると遠回りになりそうだ。',
    choices: [{ label: '家まで送る', note: 'ライフ-3、お礼にレリックを1つ', effect: 'relic', life: -3 },
              { label: '道だけ教える', note: '+15G（親からのお礼）', effect: 'goldLife', gold: 15 }] },
  { id: 'box', acts: [1, 2, 3], title: '謎の宝箱', text: '古びた宝箱。鍵はかかっていないが、何かの気配がする。',
    choices: [{ label: '開ける', note: '50%でレリック、50%でライフ-6', effect: 'box' },
              { label: '開けない', effect: 'none' }] },
  { id: 'forge', acts: [3], title: '溶岩の鍛冶場', text: '溶岩の熱を使う鍛冶場。「同じ道具をもう1つ作ってやろう」',
    choices: [{ label: 'カードを1枚複製する', note: '-40G、選んだカードと同じものをデッキに追加', effect: 'copyCard', gold: -40 },
              { label: '立ち去る', effect: 'none' }] },
  { id: 'hut', acts: [2], title: '雪山の小屋', text: '暖炉のある無人の小屋。薪が積んである。',
    choices: [{ label: '暖まって休む', note: 'ライフ+6', effect: 'heal', amount: 6 },
              { label: '薪を売りに持っていく', note: '+25G', effect: 'goldLife', gold: 25 }] },
  { id: 'shrine', acts: [2], title: '氷の祠', text: '氷に閉じ込められた祠。中に何かが光っている。',
    choices: [{ label: '素手で氷を割る', note: 'ライフ-5、レリックを1つ', effect: 'relic', life: -5 },
              { label: '祈るだけにする', note: 'ライフ+4', effect: 'heal', amount: 4 }] },
  { id: 'stranded', acts: [2], title: '遭難した旅人', text: '雪に埋もれかけた旅人がいる。「食べ物を分けてくれないか」',
    choices: [{ label: '食料を分ける', note: '-20G、最大ライフ+4', effect: 'maxLife', gold: -20, amount: 4 },
              { label: '道を急ぐ', effect: 'none' }] },
  { id: 'firespring', acts: [3], title: '火の泉', text: '煮えたぎる泉。浴びれば体がきたえられるという。',
    choices: [{ label: '泉を浴びる', note: 'ライフ-8、最大ライフ+6', effect: 'maxLife', life: -8, amount: 6 },
              { label: '立ち去る', effect: 'none' }] },
  { id: 'lavatreasure', acts: [3], title: '溶岩の中の宝', text: '溶岩の流れの向こうに金貨の山が見える。',
    choices: [{ label: '手を伸ばす', note: '50%で+80G、50%でライフ-8', effect: 'risk', win: 80, lose: 8 },
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
  spring:    { name: '泉の水',     kind: 'number', rarity: 'uncommon', text: '戦闘に勝つとライフ+3。' },
  seal:      { name: '商人の印',   kind: 'number', rarity: 'uncommon', text: '商人の値段が25%安くなる。' },
  blueprint: { name: '設計図の束', kind: 'change', rarity: 'uncommon', text: 'タワーを建てると、1ターンに1回だけカードを1枚引く。' },
  wall:      { name: '応急の石壁', kind: 'change', rarity: 'rare',     text: '攻撃1回ごとに、城に着いた最初の敵ではライフが減らない。' },
  stone:     { name: 'エネルギー石', kind: 'change', rarity: 'rare',   text: '毎ターンのエネルギー+1。' }
};
Object.keys(G.RELICS).forEach(function (k) { G.RELICS[k].id = k; });

// ---- ダメージ数字の色 ----
// normal：ふつう / resisted：よろい・耐性で減った / poison：毒 / burn：やけど（今後）
G.DMG_COLORS = { normal: '#ffffff', resisted: '#8fa6bd', poison: '#a6e85a', burn: '#ff9a3a' };

// アップ・ダウンの色（ゲーム全体で統一）
// アップ＝強くなる（強化ボタン、強化後の射程、強くなる数値の差）＝赤
// ダウン＝弱くなる（弱体、射程が縮む、弱くなる数値の差）＝青
G.UP_COLOR = '#ff5b4a';
G.DOWN_COLOR = '#4ea8ff';

// ============================================================
// ルール（仮の数値）
// ============================================================
G.RULES = {
  maxLife: 40,        // ラン全体のライフ（戦闘をまたいで持ち越す）
  startGold: 30,      // ラン開始時のお金（戦闘・商人で共通）
  energyPerTurn: 3,   // 準備ターンの始めにこの値まで回復（持ち越しなし）
  drawPerTurn: 4,     // 毎ターン無料で引く枚数
  handMax: 8,
  extraDrawCost: 15,  // お金で1枚追加で引く
  floors: 10,         // 1層あたりのボスの前の階の数（最後の階は休憩）
  acts: 3,            // 層の数（3層目のボスがラスボス）
  actHeal: 99,        // 次の層へ進む時に回復するライフ（99＝全回復）
  restPerRoute: [2, 5],   // どの道を通っても、休憩マスはこの範囲（最後の階の休憩も数える）
  shopPerRoute: 2,        // どの道を通っても、商人マスはこの数まで
  floorScale: 0.04,   // 1階進むごとに敵の体力が4%ずつ増える（数はひな形どおり）
  battleGold: { battle: 10, elite: 30 },   // 戦闘に勝った時のおまけのお金
  restHeal: 12,
  shop: { price: { common: 35, uncommon: 55, rare: 80 }, remove: 50, heal: 30, healAmount: 10,
          relicPrice: { common: 90, uncommon: 120, rare: 160 } }
};

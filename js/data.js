// データ：マップ・タワー・敵・攻撃の予定・初期デッキ
// 数値はすべて試作用の仮の値（SPEC.md「数値全般」は未定）
'use strict';
var G = window.G = window.G || {};

// ---- マップ（1マス = 横16ドット × 縦12ドットの斜め見下ろし） ----
// . 草地（タワーを置ける）  # 道  T 木  R 岩  X 城の敷地（置けない）  A 左の入口  B 右の入口  G 城（ゴール）
G.MAP = {
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
  // 敵の通り道（マスの中心座標）。入口ごとに1本。洞穴の出口のすぐ前（y=0.8）から出てくる
  paths: {
    A: [[2.5,0.8],[2.5,4.5],[5.5,4.5],[5.5,7.5],[2.5,7.5],[2.5,11.5],[8.5,11.5],[8.5,14.6]],
    B: [[8.5,0.8],[8.5,4.5],[5.5,4.5],[5.5,7.5],[2.5,7.5],[2.5,11.5],[8.5,11.5],[8.5,14.6]]
  },
  gateName: { A: '左の入口', B: '右の入口' }
};
G.MAP.cols = G.MAP.rows[0].length;
G.MAP.rowsN = G.MAP.rows.length;

// ---- タワー ----
// range はマス数、rate は攻撃の間隔（秒）、dmgType は physical（物理）/ magic（魔法）
G.TOWERS = {
  archer: {
    name: '弓兵の塔', cost: 1, range: 2.6, dmg: 6, rate: 0.8, dmgType: 'physical',
    shot: 'arrow', speed: 9,
    text: '矢を速く撃つ。1体ずつ攻撃。',
    up: [{ cost: 25, dmg: 10, range: 2.9, rate: 0.7 }, { cost: 50, dmg: 16, range: 3.2, rate: 0.6 }]
  },
  mage: {
    name: '魔導士の塔', cost: 2, range: 2.2, dmg: 15, rate: 1.6, dmgType: 'magic',
    shot: 'orb', speed: 5,
    text: '魔法の玉。オークのよろいを無視する。',
    up: [{ cost: 30, dmg: 26, range: 2.5, rate: 1.5 }, { cost: 60, dmg: 42, range: 2.8, rate: 1.4 }]
  },
  cannon: {
    name: '大砲', cost: 2, range: 2.4, dmg: 11, rate: 2.0, dmgType: 'physical',
    shot: 'ball', speed: 4, splash: 0.95,
    text: '砲弾が爆発し、まわりの敵もまとめて攻撃。',
    up: [{ cost: 30, dmg: 18, range: 2.6, rate: 1.9, splash: 1.1 }, { cost: 60, dmg: 28, range: 2.8, rate: 1.8, splash: 1.25 }]
  }
};

// ---- 敵 ----
// speed はマス/秒、armor は物理ダメージを減らす割合、life はゴールに着いた時に減るライフ
G.ENEMIES = {
  slime:  { name: 'スライム', hp: 48,  speed: 0.9, armor: 0,   life: 1, gold: 3 },
  goblin: { name: 'ゴブリン', hp: 35,  speed: 1.6, armor: 0,   life: 1, gold: 4 },
  orc:    { name: 'オーク',   hp: 190, speed: 0.6, armor: 0.4, life: 2, gold: 10 }
};

// ---- 攻撃の予定（5回の攻撃をしのげば勝ち） ----
// 各グループ：入口・敵の種類・数・出てくる間隔（秒）・最初の1体が出るまでの待ち（秒）
G.WAVES = [
  [{ gate: 'A', type: 'slime', n: 6, gap: 1.3, delay: 0 }],
  [{ gate: 'A', type: 'slime', n: 5, gap: 1.3, delay: 0 },
   { gate: 'B', type: 'goblin', n: 5, gap: 1.0, delay: 3 }],
  [{ gate: 'B', type: 'goblin', n: 8, gap: 0.8, delay: 0 },
   { gate: 'A', type: 'orc', n: 1, gap: 1, delay: 4 }],
  [{ gate: 'A', type: 'orc', n: 3, gap: 3.0, delay: 0 },
   { gate: 'B', type: 'slime', n: 8, gap: 1.0, delay: 2 }],
  [{ gate: 'A', type: 'goblin', n: 10, gap: 0.7, delay: 0 },
   { gate: 'B', type: 'orc', n: 4, gap: 2.5, delay: 2 },
   { gate: 'A', type: 'slime', n: 6, gap: 1.0, delay: 9 }]
];

// ---- ダメージ数字の色 ----
// normal：ふつう / resisted：よろい・耐性で減った / poison：毒（今後） / burn：やけど（今後）
G.DMG_COLORS = { normal: '#ffffff', resisted: '#8fa6bd', poison: '#a6e85a', burn: '#ff9a3a' };

// 強化の色（強化ボタンと、強化後の射程の線をそろえる）
G.UP_COLOR = '#ff7ad9';   // 草の緑の上でも見えるピンク

// ---- ルール（仮の数値） ----
G.RULES = {
  life: 20,
  energyPerTurn: 3,   // 準備ターンの始めにこの値まで回復（持ち越しなし）
  startGold: 20,
  drawPerTurn: 4,     // 毎ターン無料で引く枚数
  handMax: 8,
  extraDrawCost: 15   // お金で1枚追加で引く
};

// 初期デッキ（8枚）
G.START_DECK = ['archer', 'archer', 'archer', 'archer', 'mage', 'mage', 'cannon', 'cannon'];

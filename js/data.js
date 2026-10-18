// データ：マップ・タワー・カード・敵・攻撃の予定・イベント・ルール
// 数値はすべて試作用の仮の値（SPEC.md「数値全般」は未定）
'use strict';
var G = window.G = window.G || {};

// ============================================================
// バトルマップ（1マス = 横16ドット × 縦12ドットの斜め見下ろし、11×15マス）
// . 草地（タワーを置ける）  # 道  T 木  R 岩  X 城の敷地（置けない）  A/B/C 入口（いちばん上の行）  G 城（ゴール）
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
// ============================================================
G.ENEMIES = {
  slime:  { name: 'スライム',   hp: 48,   speed: 0.9,  armor: 0,   life: 1,  gold: 3,   gap: 1.2 },
  goblin: { name: 'ゴブリン',   hp: 35,   speed: 1.6,  armor: 0,   life: 1,  gold: 4,   gap: 0.9 },
  wolf:   { name: 'ウルフ',     hp: 28,   speed: 2.1,  armor: 0,   life: 1,  gold: 4,   gap: 0.7 },
  orc:    { name: 'オーク',     hp: 190,  speed: 0.6,  armor: 0.4, life: 2,  gold: 10,  gap: 2.6 },
  knight: { name: '重装オーク', hp: 260,  speed: 0.55, armor: 0.5, life: 3,  gold: 20,  gap: 4.0 },
  ogre:   { name: 'オーガ王',   hp: 1500, speed: 0.4,  armor: 0.3, life: 10, gold: 100, gap: 1, boss: true }
};

// ============================================================
// 攻撃の予定（ひな形）
// 1つの戦闘＝攻撃の回数ぶんの配列。1回の攻撃＝敵のグループの配列 [種類, 数, 最初の1体が出るまでの秒]
// 入口はマップの入口から自動で割りふる。体力は階が進むほど増える（G.RULES.floorScale）
// ============================================================
G.WAVE_SETS = {
  early: [
    [[['slime', 6, 0]], [['slime', 5, 0], ['goblin', 4, 3]], [['goblin', 6, 0], ['slime', 5, 2]]],
    [[['goblin', 6, 0]], [['slime', 6, 0], ['wolf', 3, 4]], [['orc', 1, 0], ['goblin', 6, 2]]],
    [[['slime', 4, 0], ['slime', 4, 4]], [['wolf', 5, 0]], [['slime', 6, 0], ['orc', 1, 5]]]
  ],
  mid: [
    [[['goblin', 7, 0]], [['orc', 2, 0], ['slime', 8, 2]], [['wolf', 8, 0], ['orc', 3, 4]]],
    [[['slime', 8, 0]], [['orc', 2, 0], ['goblin', 7, 4]], [['wolf', 7, 0], ['goblin', 6, 2], ['orc', 2, 6]]]
  ],
  elite: [
    [[['goblin', 4, 0], ['wolf', 2, 3]], [['knight', 1, 0], ['slime', 4, 3]], [['orc', 2, 0], ['wolf', 4, 4]], [['knight', 1, 0], ['goblin', 5, 3], ['orc', 1, 8]]]
  ],
  boss: [
    [[['slime', 5, 0]], [['goblin', 5, 0], ['wolf', 3, 3]], [['orc', 2, 0], ['slime', 5, 3]],
     [['knight', 1, 0], ['wolf', 5, 3]], [['ogre', 1, 0], ['goblin', 5, 5], ['wolf', 4, 10]]]
  ]
};

// ============================================================
// イベント（？マス）。choices の effect は run.js が実行する
// ============================================================
G.EVENTS = [
  { id: 'smith', title: '旅の鍛冶屋', text: '道ばたで鍛冶屋が店を広げている。「いらない道具を引き取ろうか？」',
    choices: [{ label: 'カードを1枚手放す', note: '-30G', effect: 'removeCard', gold: -30 },
              { label: '立ち去る', effect: 'none' }] },
  { id: 'spring', title: '不思議な泉', text: '澄んだ水がわき出ている。底には金貨が光っている。',
    choices: [{ label: '水を飲む', note: 'ライフ+8', effect: 'heal', amount: 8 },
              { label: '金貨を投げ入れる', note: '-10G、ランダムなカードを1枚得る', effect: 'randomCard', gold: -10 }] },
  { id: 'fallen', title: '倒れた冒険者', text: '冒険者が倒れている。荷物は手つかずのようだ。',
    choices: [{ label: '荷物を探す', note: '+40G、ライフ-4', effect: 'goldLife', gold: 40, life: -4 },
              { label: '弔う', note: 'ライフ+3', effect: 'heal', amount: 3 }] },
  { id: 'gambler', title: '賭け好きの商人', text: '「コインの裏表、当てたら3倍だ」',
    choices: [{ label: '20Gを賭ける', note: '50%で+60G', effect: 'gamble', gold: -20, win: 60 },
              { label: '断る', effect: 'none' }] },
  { id: 'altar', title: '古い祭壇', text: '赤い石の祭壇。ささげ物をすれば力を授けるという。',
    choices: [{ label: '血をささげる', note: 'ライフ-6、珍しいカードを3枚から1枚選ぶ', effect: 'rareCard', life: -6 },
              { label: '立ち去る', effect: 'none' }] }
];

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
  maxLife: 30,        // ラン全体のライフ（戦闘をまたいで持ち越す）
  startGold: 30,      // ラン開始時のお金（戦闘・商人で共通）
  energyPerTurn: 3,   // 準備ターンの始めにこの値まで回復（持ち越しなし）
  drawPerTurn: 4,     // 毎ターン無料で引く枚数
  handMax: 8,
  extraDrawCost: 15,  // お金で1枚追加で引く
  floors: 10,         // ボスの前の階の数（最後の階は休憩）
  floorScale: 0.04,   // 1階進むごとに敵の体力が4%ずつ増える（数はひな形どおり）
  battleGold: { battle: 10, elite: 30 },   // 戦闘に勝った時のおまけのお金
  restHeal: 10,
  shop: { price: { common: 35, uncommon: 55, rare: 80 }, remove: 50, heal: 30, healAmount: 10 }
};

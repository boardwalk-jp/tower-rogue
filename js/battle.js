// 戦闘処理：ターン・デッキ・カード・タワー・敵・弾・状態異常。画面（DOM）には触らない
// → この部分だけを取り出して自動で何戦も回せる（tools/sim.js）
'use strict';
var G = window.G = window.G || {};

(function () {
  // ---- 道の形を前計算（マップごと・入口ごとに、区間と累積の長さ） ----
  var pathCache = {};
  function pathsOf(map) {
    if (pathCache[map.id]) return pathCache[map.id];
    var out = {};
    Object.keys(map.paths).forEach(function (k) {
      var pts = map.paths[k], segs = [], total = 0;
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        segs.push({ a: a, b: b, s: total, l: l });
        total += l;
      }
      out[k] = { segs: segs, len: total };
    });
    return (pathCache[map.id] = out);
  }
  function posOnPath(s, gate, d) {
    var P = s.paths[gate];
    for (var i = 0; i < P.segs.length; i++) {
      var sg = P.segs[i];
      if (d <= sg.s + sg.l || i === P.segs.length - 1) {
        var t = Math.max(0, Math.min(1, (d - sg.s) / sg.l));
        return { x: sg.a[0] + (sg.b[0] - sg.a[0]) * t, y: sg.a[1] + (sg.b[1] - sg.a[1]) * t,
                 dx: sg.b[0] - sg.a[0], dy: sg.b[1] - sg.a[1] };
      }
    }
  }

  function tileAt(s, tx, ty) {
    var M = s.map;
    if (ty < 0 || ty >= M.rowsN || tx < 0 || tx >= M.cols) return null;
    return M.rows[ty][tx];
  }

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, r) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // opts: { map: 'field', waves: [[{gate,type,n,gap,delay}...]...], hpMult, deck: ['bowman',...], life, maxLife, gold, seed, kind }
  function create(opts) {
    opts = opts || {};
    var R = G.RULES, map = G.MAPS[opts.map || 'field'];
    var s = {
      rand: rng(opts.seed || (Date.now() & 0xffffff)),
      kind: opts.kind || 'battle',
      map: map, paths: pathsOf(map),
      waves: opts.waves || [[{ gate: Object.keys(map.paths)[0], type: 'slime', n: 5, gap: 1.2, delay: 0 }]],
      hpMult: opts.hpMult || 1,
      phase: 'prep', turn: 0,
      life: opts.life !== undefined ? opts.life : R.maxLife, maxLife: opts.maxLife || R.maxLife,
      energy: 0, gold: opts.gold !== undefined ? opts.gold : R.startGold,
      draw: [], hand: [], discard: [], exhaust: [],
      towers: [], enemies: [], shots: [], events: [],
      buff: { speedMult: 1 },     // 全タワーへのこのターンだけの強化（号令など）
      spawnQueue: [], time: 0, nextId: 1, uid: 1,
      stats: { killed: 0, leaked: 0, built: 0, goldEarned: 0 }
    };
    s.totalTurns = s.waves.length;
    s.draw = shuffle((opts.deck || G.START_DECK).map(function (id) { return { uid: s.uid++, id: id }; }), s.rand);
    startPrep(s);
    return s;
  }

  function ev(s, e) { s.events.push(e); }

  function cardDef(card) { return G.CARDS[card.id]; }
  function cardCost(card) { return card.cost !== undefined ? card.cost : cardDef(card).cost; }

  // 山札から1枚引く。山札が空なら捨て札を混ぜて山札に戻す
  function drawOne(s) {
    if (s.hand.length >= G.RULES.handMax) return false;
    if (!s.draw.length) {
      if (!s.discard.length) return false;
      s.draw = shuffle(s.discard, s.rand); s.discard = [];
      ev(s, { k: 'reshuffle' });
    }
    s.hand.push(s.draw.pop());
    return true;
  }

  function startPrep(s) {
    s.phase = 'prep';
    s.energy = G.RULES.energyPerTurn;
    // 「このターンだけ」の強化を外す
    s.buff.speedMult = 1;
    s.towers.forEach(function (tw) { tw.turnDmgMult = 1; });
    // 前のターンの手札は捨て札へ（使い切りの一時カードは消える）
    while (s.hand.length) { var c = s.hand.pop(); if (c.temp) s.exhaust.push(c); else s.discard.push(c); }
    for (var i = 0; i < G.RULES.drawPerTurn; i++) drawOne(s);
    ev(s, { k: 'prep', turn: s.turn });
  }

  function nextWave(s) { return s.waves[s.turn] || []; }

  function canPlaceAt(s, tx, ty) {
    var c = tileAt(s, tx, ty);
    if (c === null) return false;
    for (var i = 0; i < s.towers.length; i++) if (s.towers[i].tx === tx && s.towers[i].ty === ty) return false;
    return c === '.';   // 道・木・岩・城の敷地以外ならどこでも
  }

  // スキルが今そのタワーに使えるか（使えない理由を返す。使えるなら null）
  function skillBlocked(s, def, tw) {
    if (def.target === 'tower') {
      if (!tw) return 'タワーを選んでください';
      if (def.id === 'forge' && tw.lv >= G.TOWERS[tw.type].up.length) return 'これ以上強化できません';
    }
    return null;
  }

  // target：タワーカードなら {tx, ty}、タワー対象のスキルなら {tower: id}、対象なしなら null
  function playCard(s, handIndex, target) {
    if (s.phase !== 'prep' && s.phase !== 'attack') return '今は使えません';
    var card = s.hand[handIndex];
    if (!card) return 'カードがありません';
    var def = cardDef(card), cost = cardCost(card);
    if (s.energy < cost) return 'エネルギーが足りません';
    var tw = null;
    if (def.kind === 'tower') {
      if (!target || !canPlaceAt(s, target.tx, target.ty)) return 'そこには置けません';
    } else {
      tw = target && target.tower ? findTower(s, target.tower) : null;
      var why = skillBlocked(s, def, tw); if (why) return why;
    }
    s.energy -= cost;
    s.hand.splice(handIndex, 1);
    if (card.temp || def.exhaust) s.exhaust.push(card); else s.discard.push(card);

    if (def.kind === 'tower') {
      var t = { id: s.nextId++, type: def.tower, tx: target.tx, ty: target.ty, x: target.tx + 0.5, y: target.ty + 0.5,
                lv: 0, bonusDmg: 0, turnDmgMult: 1, cd: 0.2, aim: 0, fire: 0 };
      s.towers.push(t);
      s.stats.built++;
      ev(s, { k: 'build', x: t.x, y: t.y });
      return null;
    }
    applySkill(s, def, tw);
    ev(s, { k: 'skill', id: def.id, x: tw ? tw.x : null, y: tw ? tw.y : null });
    return null;
  }

  function applySkill(s, def, tw) {
    switch (def.id) {
      case 'aim': tw.turnDmgMult *= 1.5; break;
      case 'whet': tw.bonusDmg += 3; break;
      case 'forge': tw.lv++; break;
      case 'supply': drawOne(s); drawOne(s); break;
      case 'tax': s.gold += 20; s.stats.goldEarned += 20; break;
      case 'warcry': s.buff.speedMult *= 1.5; break;
      case 'workshop':
        for (var i = 0; i < def.give.n; i++) {
          if (s.hand.length >= G.RULES.handMax) break;
          s.hand.push({ uid: s.uid++, id: def.give.card, temp: true, cost: def.give.cost });
        }
        break;
    }
  }

  // 強化レベルだけの強さ（カードや一時強化は入れない）。ランクの基準はこれ
  function baseStats(type, lv) {
    var T = G.TOWERS[type];
    var st = { range: T.range, dmg: T.dmg, rate: T.rate, splash: T.splash || 0, poison: T.poison || null, slow: T.slow || null };
    if (lv > 0) { var u = T.up[lv - 1]; for (var k in u) if (k !== 'cost') st[k] = u[k]; }
    return st;
  }
  // 今の強さ：強化レベル＋スキルの強化（研ぎ石・狙い撃ち・号令）
  function towerStats(tw, s) {
    var st = baseStats(tw.type, tw.lv || 0);
    st.dmg = (st.dmg + (tw.bonusDmg || 0)) * (tw.turnDmgMult || 1);
    st.dmg = Math.round(st.dmg * 10) / 10;
    if (s && s.buff.speedMult !== 1) st.rate = st.rate / s.buff.speedMult;
    return st;
  }
  function nextStats(tw, s) { // 次のレベルの強さ（最大なら null）
    if (tw.lv >= G.TOWERS[tw.type].up.length) return null;
    return towerStats({ type: tw.type, lv: tw.lv + 1, bonusDmg: tw.bonusDmg, turnDmgMult: tw.turnDmgMult }, s);
  }
  function upgradeCost(tw) {
    var T = G.TOWERS[tw.type];
    return tw.lv < T.up.length ? T.up[tw.lv].cost : null;
  }
  function upgrade(s, towerId) {
    var tw = findTower(s, towerId);
    if (!tw) return 'タワーがありません';
    var c = upgradeCost(tw);
    if (c === null) return 'これ以上強化できません';
    if (s.gold < c) return 'お金が足りません';
    s.gold -= c; tw.lv++;
    ev(s, { k: 'upgrade', x: tw.x, y: tw.y });
    return null;
  }
  function findTower(s, id) {
    for (var i = 0; i < s.towers.length; i++) if (s.towers[i].id === id) return s.towers[i];
    return null;
  }

  function extraDraw(s) {
    if (s.phase !== 'prep' && s.phase !== 'attack') return '今は引けません';
    if (s.hand.length >= G.RULES.handMax) return '手札がいっぱいです';
    if (s.gold < G.RULES.extraDrawCost) return 'お金が足りません';
    if (!s.draw.length && !s.discard.length) return '引けるカードがありません';
    s.gold -= G.RULES.extraDrawCost;
    drawOne(s);
    return null;
  }

  function startAttack(s) {
    if (s.phase !== 'prep') return;
    s.phase = 'attack';
    s.time = 0;
    s.spawnQueue = [];
    nextWave(s).forEach(function (g) {
      for (var i = 0; i < g.n; i++) s.spawnQueue.push({ t: g.delay + i * g.gap, gate: g.gate, type: g.type });
    });
    s.spawnQueue.sort(function (a, b) { return a.t - b.t; });
    ev(s, { k: 'attack', turn: s.turn });
  }

  function spawn(s, q) {
    var E = G.ENEMIES[q.type], hp = Math.round(E.hp * s.hpMult);
    var e = { id: s.nextId++, type: q.type, gate: q.gate, hp: hp, max: hp, d: 0,
              off: E.boss ? 0 : (s.rand() - 0.5) * 0.3, x: 0, y: 0, face: 1, walk: s.rand() * 10, flash: 0,
              slowPct: 0, slowT: 0, poisonDps: 0, poisonT: 0, poisonTick: 0 };
    place(s, e);
    s.enemies.push(e);
    ev(s, { k: 'spawn', x: e.x, y: e.y, boss: !!E.boss });
  }
  function place(s, e) {
    var p = posOnPath(s, e.gate, e.d);
    var L = Math.hypot(p.dx, p.dy) || 1;
    // 進む向きに対して横にずらす（列にならないように）
    e.x = p.x + (-p.dy / L) * e.off;
    e.y = p.y + (p.dx / L) * e.off;
    if (Math.abs(p.dx) > 0.01) e.face = p.dx > 0 ? 1 : -1;
  }

  // type：physical（よろいで減る）/ magic / poison（どちらもよろい無視）
  function hurt(s, e, dmg, type) {
    if (e.hp <= 0) return;
    var E = G.ENEMIES[e.type];
    var real = type === 'physical' ? dmg * (1 - E.armor) : dmg;
    e.hp -= real; if (type !== 'poison') e.flash = 0.12;
    var kind = type === 'poison' ? 'poison' : (type === 'physical' && E.armor > 0) ? 'resisted' : 'normal';
    ev(s, { k: 'hit', x: e.x, y: e.y, amount: real, kind: kind });
    if (e.hp <= 0) {
      s.gold += E.gold; s.stats.goldEarned += E.gold; s.stats.killed++;
      ev(s, { k: 'kill', x: e.x, y: e.y, type: e.type, gold: E.gold });
    }
  }
  // 弾が当たった時の追加効果（毒・遅くする）
  function applyOnHit(s, e, sh) {
    if (e.hp <= 0) return;
    var E = G.ENEMIES[e.type];
    if (sh.poison) { e.poisonDps = Math.max(e.poisonDps, sh.poison.dps); e.poisonT = Math.max(e.poisonT, sh.poison.dur); }
    if (sh.slow) {
      var pct = E.boss ? sh.slow.pct / 2 : sh.slow.pct;   // ボスには半分しか効かない
      e.slowPct = Math.max(e.slowPct, pct); e.slowT = Math.max(e.slowT, sh.slow.dur);
    }
  }

  function update(s, dt) {
    if (s.phase !== 'attack') return;
    s.time += dt;
    while (s.spawnQueue.length && s.spawnQueue[0].t <= s.time) spawn(s, s.spawnQueue.shift());

    // 敵が進む・毒のダメージ
    for (var i = 0; i < s.enemies.length; i++) {
      var e = s.enemies[i], E = G.ENEMIES[e.type];
      if (e.hp <= 0) continue;
      var sp = E.speed;
      if (e.slowT > 0) { sp *= (1 - e.slowPct); e.slowT -= dt; if (e.slowT <= 0) e.slowPct = 0; }
      e.d += sp * dt;
      e.walk += dt * sp * 4;
      if (e.flash > 0) e.flash -= dt;
      if (e.poisonT > 0) {
        e.poisonT -= dt; e.poisonTick += dt;
        if (e.poisonTick >= 0.5) { e.poisonTick -= 0.5; hurt(s, e, e.poisonDps * 0.5, 'poison'); }
        if (e.poisonT <= 0) { e.poisonDps = 0; e.poisonTick = 0; }
        if (e.hp <= 0) continue;
      }
      place(s, e);
      if (e.d >= s.paths[e.gate].len) {
        e.hp = 0; e.leaked = true;
        s.life = Math.max(0, s.life - E.life); s.stats.leaked++;
        ev(s, { k: 'leak', x: e.x, y: e.y, life: E.life });
      }
    }

    // タワーが撃つ（射程内で一番ゴールに近い敵をねらう）
    for (i = 0; i < s.towers.length; i++) {
      var tw = s.towers[i], st = towerStats(tw, s), T = G.TOWERS[tw.type];
      tw.cd -= dt; if (tw.fire > 0) tw.fire -= dt;
      var best = null;
      for (var j = 0; j < s.enemies.length; j++) {
        var en = s.enemies[j];
        if (en.hp <= 0 || en.y < 0) continue;
        if (Math.hypot(en.x - tw.x, en.y - tw.y) <= st.range && (!best || en.d > best.d)) best = en;
      }
      if (best) tw.aim = best.x < tw.x ? -1 : 1;
      if (best && tw.cd <= 0) {
        tw.cd = st.rate; tw.fire = 0.25;
        var sy = tw.y - (T.muzzle !== undefined ? T.muzzle : 1.5);
        s.shots.push({ kind: T.shot, x: tw.x, y: sy, sx: tw.x, sy: sy, target: best.id,
                       tx: best.x, ty: best.y, speed: T.speed, dmg: st.dmg, dmgType: T.dmgType,
                       splash: st.splash, poison: st.poison, slow: st.slow, t: 0 });
        ev(s, { k: 'fire', type: tw.type, x: tw.x, y: sy });
      }
    }

    // 弾が飛ぶ（大砲・投石は着弾点に向かって山なり、ほかは敵を追いかける）
    for (i = s.shots.length - 1; i >= 0; i--) {
      var sh = s.shots[i], tgt = null;
      for (j = 0; j < s.enemies.length; j++) if (s.enemies[j].id === sh.target) { tgt = s.enemies[j]; break; }
      var arc = sh.kind === 'ball' || sh.kind === 'stone';
      if (!arc && tgt && tgt.hp > 0) { sh.tx = tgt.x; sh.ty = tgt.y - 0.3; }
      if (arc) {
        if (!sh.dur) sh.dur = Math.max(0.3, Math.hypot(sh.tx - sh.sx, sh.ty - sh.sy) / sh.speed);
        sh.t += dt;
        var p = Math.min(1, sh.t / sh.dur);
        sh.x = sh.sx + (sh.tx - sh.sx) * p; sh.y = sh.sy + (sh.ty - sh.sy) * p;
        sh.h = Math.sin(p * Math.PI) * (sh.kind === 'ball' ? 1.2 : 0.7);
        if (p >= 1) {
          for (j = 0; j < s.enemies.length; j++) {
            var ee = s.enemies[j];
            if (ee.hp > 0 && Math.hypot(ee.x - sh.tx, ee.y - sh.ty) <= sh.splash) hurt(s, ee, sh.dmg, sh.dmgType);
          }
          ev(s, { k: 'boom', x: sh.tx, y: sh.ty, r: sh.splash, small: sh.kind === 'stone' });
          s.shots.splice(i, 1);
        }
        continue;
      }
      var dx = sh.tx - sh.x, dy = sh.ty - sh.y, dist = Math.hypot(dx, dy), step = sh.speed * dt;
      sh.ang = Math.atan2(dy, dx);
      if (dist <= step) {
        if (tgt && tgt.hp > 0) { hurt(s, tgt, sh.dmg, sh.dmgType); applyOnHit(s, tgt, sh); }
        ev(s, { k: sh.kind === 'orb' ? 'zap' : sh.kind === 'ice' ? 'frost' : sh.kind === 'drip' ? 'splat' : 'pin', x: sh.tx, y: sh.ty });
        s.shots.splice(i, 1);
      } else { sh.x += dx / dist * step; sh.y += dy / dist * step; }
    }

    s.enemies = s.enemies.filter(function (e) { return e.hp > 0; });

    if (s.life <= 0) { s.phase = 'lose'; s.shots = []; ev(s, { k: 'lose' }); return; }
    if (!s.spawnQueue.length && !s.enemies.length) {
      s.shots = [];
      s.turn++;
      if (s.turn >= s.totalTurns) { s.phase = 'win'; ev(s, { k: 'win' }); }
      else startPrep(s);
    }
  }

  // ---- 数値のランク（S〜E、効果で範囲外なら SS/SSS・F/G） ----
  // 全タワーの Lv1〜最大の通常の値から、数値ごとに「一番大きい値〜一番小さい値」を出し、等間隔で区切る。
  // その数値を持つタワーが1種類だけならランクなし。2種類以上なら S〜E の6段階。
  // タワーを増やしたり数値を変えたら、G.Rank.build() を呼ぶと計算し直す（起動時に1回呼ぶ）。
  var RANKS = ['S', 'A', 'B', 'C', 'D', 'E'];
  var RANK_STATS = {
    dmg:    function (st) { return st.dmg; },
    range:  function (st) { return st.range; },
    speed:  function (st) { return 1 / st.rate; },          // 発/s
    splash: function (st) { return st.splash || null; }
  };
  var rankTable = {};
  function buildRanks() {
    rankTable = {};
    Object.keys(RANK_STATS).forEach(function (key) {
      var vals = [], types = 0;
      Object.keys(G.TOWERS).forEach(function (type) {
        var has = false;
        for (var lv = 0; lv <= G.TOWERS[type].up.length; lv++) {
          var v = RANK_STATS[key](baseStats(type, lv));
          if (v !== null && v !== undefined) { vals.push(v); has = true; }
        }
        if (has) types++;
      });
      if (types < 2) return;                       // 1種類だけ：ランクなし
      var n = RANKS.length;
      var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
      rankTable[key] = { lo: lo, hi: hi, n: n, step: (hi - lo) / n };
    });
    return rankTable;
  }
  function rankOf(key, v) {
    var r = rankTable[key], eps = 1e-9;
    if (!r || v === null || v === undefined) return '';
    if (r.step <= 0) return RANKS[0];
    if (v > r.hi + eps) return (v - r.hi) <= r.step + eps ? 'SS' : 'SSS';   // 通常の最大より上（同じ間隔で1段ごと）
    if (v < r.lo - eps) return (r.lo - v) <= r.step + eps ? 'F' : 'G';      // 通常の最小より下
    var i = Math.min(r.n - 1, Math.floor((v - r.lo) / r.step + eps));      // 境目ちょうどは上のランク
    return RANKS[r.n - 1 - i];
  }
  // タワーの今の強さ（st）を数値ごとのランクにする
  function ranksOf(st) {
    return { dmg: rankOf('dmg', st.dmg), range: rankOf('range', st.range), speed: rankOf('speed', 1 / st.rate),
             splash: st.splash ? rankOf('splash', st.splash) : '' };
  }
  G.Rank = { build: buildRanks, of: rankOf, ofStats: ranksOf, table: function () { return rankTable; } };
  buildRanks();

  G.Battle = {
    create: create, update: update, startAttack: startAttack, playCard: playCard, skillBlocked: skillBlocked,
    canPlaceAt: canPlaceAt, upgrade: upgrade, upgradeCost: upgradeCost, towerStats: towerStats, nextStats: nextStats,
    baseStats: baseStats, extraDraw: extraDraw, nextWave: nextWave, findTower: findTower, tileAt: tileAt,
    cardCost: cardCost, cardDef: cardDef, rng: rng, shuffle: shuffle
  };
})();

// 戦闘処理：ターン・デッキ・タワー・敵・弾。画面（DOM）には触らない
// → この部分だけを取り出して自動で何戦も回せる（段階5の自動対戦用）
'use strict';
var G = window.G = window.G || {};

(function () {
  var M = G.MAP;

  // ---- 道の形を前計算（入口ごとに、区間と累積の長さ） ----
  var PATHS = {};
  Object.keys(M.paths).forEach(function (k) {
    var pts = M.paths[k], segs = [], total = 0;
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segs.push({ a: a, b: b, s: total, l: l });
      total += l;
    }
    PATHS[k] = { segs: segs, len: total };
  });
  function posOnPath(gate, d) {
    var P = PATHS[gate];
    for (var i = 0; i < P.segs.length; i++) {
      var sg = P.segs[i];
      if (d <= sg.s + sg.l || i === P.segs.length - 1) {
        var t = Math.max(0, Math.min(1, (d - sg.s) / sg.l));
        return { x: sg.a[0] + (sg.b[0] - sg.a[0]) * t, y: sg.a[1] + (sg.b[1] - sg.a[1]) * t,
                 dx: sg.b[0] - sg.a[0], dy: sg.b[1] - sg.a[1] };
      }
    }
  }

  function tileAt(tx, ty) {
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

  function create(opts) {
    opts = opts || {};
    var R = G.RULES;
    var s = {
      rand: rng(opts.seed || (Date.now() & 0xffffff)),
      phase: 'prep', turn: 0, totalTurns: G.WAVES.length,
      life: R.life, energy: 0, gold: R.startGold,
      draw: [], hand: [], discard: [],
      towers: [], enemies: [], shots: [], events: [],
      spawnQueue: [], time: 0, nextId: 1,
      stats: { killed: 0, leaked: 0, built: 0 }
    };
    var uid = 1;
    s.draw = shuffle(G.START_DECK.map(function (t) { return { id: uid++, type: t }; }), s.rand);
    startPrep(s);
    return s;
  }

  function ev(s, e) { s.events.push(e); }

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
    // 前のターンの手札は捨て札へ（スレイザスパイア式・仮）
    while (s.hand.length) s.discard.push(s.hand.pop());
    for (var i = 0; i < G.RULES.drawPerTurn; i++) drawOne(s);
    ev(s, { k: 'prep', turn: s.turn });
  }

  function nextWave(s) { return G.WAVES[s.turn] || []; }

  function canPlaceAt(s, tx, ty) {
    var c = tileAt(tx, ty);
    if (c === null) return false;
    for (var i = 0; i < s.towers.length; i++) if (s.towers[i].tx === tx && s.towers[i].ty === ty) return false;
    return c === '.';   // 道・木・岩・城の敷地以外ならどこでも
  }

  function playCard(s, handIndex, tx, ty) {
    if (s.phase !== 'prep' && s.phase !== 'attack') return '今は置けません';
    var card = s.hand[handIndex];
    if (!card) return 'カードがありません';
    var T = G.TOWERS[card.type];
    if (s.energy < T.cost) return 'エネルギーが足りません';
    if (!canPlaceAt(s, tx, ty)) return 'そこには置けません';
    s.energy -= T.cost;
    s.hand.splice(handIndex, 1);
    s.discard.push(card);
    var tw = { id: s.nextId++, type: card.type, tx: tx, ty: ty, x: tx + 0.5, y: ty + 0.5, lv: 0, cd: 0.2, aim: 0, fire: 0 };
    s.towers.push(tw);
    s.stats.built++;
    ev(s, { k: 'build', x: tw.x, y: tw.y });
    return null;
  }

  // 現在の強さ（強化レベル込み）
  function towerStats(tw) {
    var T = G.TOWERS[tw.type], st = { range: T.range, dmg: T.dmg, rate: T.rate, splash: T.splash || 0 };
    if (tw.lv > 0) {
      var u = T.up[tw.lv - 1];
      for (var k in u) if (k !== 'cost') st[k] = u[k];
    }
    return st;
  }
  function nextStats(tw) { // 次のレベルの強さ（最大なら null）
    if (tw.lv >= G.TOWERS[tw.type].up.length) return null;
    return towerStats({ type: tw.type, lv: tw.lv + 1 });
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
    var E = G.ENEMIES[q.type];
    var e = { id: s.nextId++, type: q.type, gate: q.gate, hp: E.hp, max: E.hp, d: 0,
              off: (s.rand() - 0.5) * 0.3, x: 0, y: 0, face: 1, walk: s.rand() * 10, flash: 0, slow: 0 };
    place(e);
    s.enemies.push(e);
    ev(s, { k: 'spawn', x: e.x, y: e.y });
  }
  function place(e) {
    var p = posOnPath(e.gate, e.d);
    var L = Math.hypot(p.dx, p.dy) || 1;
    // 進む向きに対して横にずらす（列にならないように）
    e.x = p.x + (-p.dy / L) * e.off;
    e.y = p.y + (p.dx / L) * e.off;
    if (Math.abs(p.dx) > 0.01) e.face = p.dx > 0 ? 1 : -1;
  }

  function hurt(s, e, dmg, type) {
    if (e.hp <= 0) return;
    var E = G.ENEMIES[e.type];
    var real = type === 'physical' ? dmg * (1 - E.armor) : dmg;
    e.hp -= real; e.flash = 0.12;
    var kind = type === 'poison' ? 'poison' : (type === 'physical' && E.armor > 0) ? 'resisted' : 'normal';
    ev(s, { k: 'hit', x: e.x, y: e.y, amount: real, kind: kind });
    if (e.hp <= 0) {
      s.gold += E.gold; s.stats.killed++;
      ev(s, { k: 'kill', x: e.x, y: e.y, type: e.type, gold: E.gold });
    }
  }

  function update(s, dt) {
    if (s.phase !== 'attack') return;
    s.time += dt;
    while (s.spawnQueue.length && s.spawnQueue[0].t <= s.time) spawn(s, s.spawnQueue.shift());

    // 敵が進む
    for (var i = 0; i < s.enemies.length; i++) {
      var e = s.enemies[i], E = G.ENEMIES[e.type];
      if (e.hp <= 0) continue;
      e.d += E.speed * dt;
      e.walk += dt * E.speed * 4;
      if (e.flash > 0) e.flash -= dt;
      place(e);
      if (e.d >= PATHS[e.gate].len) {
        e.hp = 0; e.leaked = true;
        s.life = Math.max(0, s.life - E.life); s.stats.leaked++;
        ev(s, { k: 'leak', x: e.x, y: e.y, life: E.life });
      }
    }

    // タワーが撃つ（射程内で一番ゴールに近い敵をねらう）
    for (i = 0; i < s.towers.length; i++) {
      var tw = s.towers[i], st = towerStats(tw), T = G.TOWERS[tw.type];
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
        var sy = tw.y - (tw.type === 'cannon' ? 0.6 : 1.5);
        s.shots.push({ kind: T.shot, x: tw.x, y: sy, sx: tw.x, sy: sy, target: best.id,
                       tx: best.x, ty: best.y, speed: T.speed, dmg: st.dmg, dmgType: T.dmgType,
                       splash: st.splash, t: 0 });
        ev(s, { k: 'fire', type: tw.type, x: tw.x, y: sy });
      }
    }

    // 弾が飛ぶ（大砲は着弾点に向かって山なり、ほかは敵を追いかける）
    for (i = s.shots.length - 1; i >= 0; i--) {
      var sh = s.shots[i], tgt = null;
      for (j = 0; j < s.enemies.length; j++) if (s.enemies[j].id === sh.target) { tgt = s.enemies[j]; break; }
      if (sh.kind !== 'ball' && tgt && tgt.hp > 0) { sh.tx = tgt.x; sh.ty = tgt.y - 0.3; }
      if (sh.kind === 'ball') {
        if (!sh.dur) sh.dur = Math.max(0.35, Math.hypot(sh.tx - sh.sx, sh.ty - sh.sy) / sh.speed);
        sh.t += dt;
        var p = Math.min(1, sh.t / sh.dur);
        sh.x = sh.sx + (sh.tx - sh.sx) * p; sh.y = sh.sy + (sh.ty - sh.sy) * p; sh.h = Math.sin(p * Math.PI) * 1.2;
        if (p >= 1) {
          for (j = 0; j < s.enemies.length; j++) {
            var ee = s.enemies[j];
            if (ee.hp > 0 && Math.hypot(ee.x - sh.tx, ee.y - sh.ty) <= sh.splash) hurt(s, ee, sh.dmg, sh.dmgType);
          }
          ev(s, { k: 'boom', x: sh.tx, y: sh.ty, r: sh.splash });
          s.shots.splice(i, 1);
        }
        continue;
      }
      var dx = sh.tx - sh.x, dy = sh.ty - sh.y, dist = Math.hypot(dx, dy), step = sh.speed * dt;
      sh.ang = Math.atan2(dy, dx);
      if (dist <= step) {
        if (tgt && tgt.hp > 0) hurt(s, tgt, sh.dmg, sh.dmgType);
        ev(s, { k: sh.kind === 'orb' ? 'zap' : 'pin', x: sh.tx, y: sh.ty });
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

  G.Battle = {
    create: create, update: update, startAttack: startAttack, playCard: playCard,
    canPlaceAt: canPlaceAt, upgrade: upgrade, upgradeCost: upgradeCost, towerStats: towerStats, nextStats: nextStats,
    extraDraw: extraDraw, nextWave: nextWave, findTower: findTower, tileAt: tileAt
  };
})();

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
  // 空を飛ぶ敵の道：入口から城までまっすぐ（入口の名前の後ろに「~」）
  var flyCache = {};
  function flyPathsOf(map) {
    if (flyCache[map.id]) return flyCache[map.id];
    var out = {};
    Object.keys(map.paths).forEach(function (k) {
      var pts = map.paths[k], a = pts[0], b = pts[pts.length - 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      out[k + '~'] = { segs: [{ a: a, b: b, s: 0, l: l }], len: l };
    });
    return (flyCache[map.id] = out);
  }
  function pathOf(s, gate) { return s.paths[gate] || s.fly[gate]; }
  function posOnPath(s, gate, d) {
    var P = pathOf(s, gate);
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

  // 決まった数（seed）から同じ並びの乱数を作る。state() で今の位置を取り出せる（セーブ用）
  function rng(seed) {
    var f = function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    f.state = function () { return seed | 0; };
    return f;
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
    // 層の地域に合わせて色だけ変える（道や置ける場所は同じ）
    if (opts.theme && opts.theme !== (map.theme || 'grass')) { map = Object.assign({}, map, { theme: opts.theme, id: map.id + '@' + opts.theme }); }
    var s = {
      rand: rng(opts.seed || (Date.now() & 0xffffff)),
      kind: opts.kind || 'battle',
      map: map, paths: pathsOf(map), fly: flyPathsOf(map), cmd: opts.cmd || null,
      waves: opts.waves || [[{ gate: Object.keys(map.paths)[0], type: 'slime', n: 5, gap: 1.2, delay: 0 }]],
      hpMult: opts.hpMult || 1, bossMult: opts.bossMult || opts.hpMult || 1,
      phase: 'prep', turn: 0,
      life: opts.life !== undefined ? opts.life : R.maxLife, maxLife: opts.maxLife || R.maxLife,
      energy: 0, gold: opts.gold !== undefined ? opts.gold : R.startGold,
      draw: [], hand: [], discard: [], exhaust: [],
      towers: [], enemies: [], shots: [], events: [],
      buff: { speedMult: 1, goldMult: 1 },     // 全タワーへのこのターンだけの強化（号令など）
      relics: opts.relics || [],  // 持っているレリックのid（同じものが複数あれば重ねがけ）
      phoenix: opts.phoenix || 0, freeTowers: 0,
      bpUsed: false, wallUsed: false, pendingSpawn: [], soldiers: [],
      spawnQueue: [], time: 0, nextId: 1, uid: 1,
      stats: { killed: 0, leaked: 0, built: 0, goldEarned: 0 }
    };
    s.totalTurns = s.waves.length;
    s.draw = shuffle((opts.deck || G.START_DECK).map(function (id) { return { uid: s.uid++, id: id }; }), s.rand);
    startPrep(s);
    return s;
  }

  function ev(s, e) { s.events.push(e); }
  // レリックは同じものを複数持てる（重ねがけ）。has は持っている数を返す
  function has(s, id) { if (!s || !s.relics) return 0; var n = 0; for (var i = 0; i < s.relics.length; i++) if (s.relics[i] === id) n++; return n; }
  function cmd(s, id) { return s && s.cmd === id; }

  function cardDef(card) { return G.CARDS[card.id]; }
  function cardCost(card, s) {
    var c = card.cost !== undefined ? card.cost : cardDef(card).cost;
    if (s && s.freeTowers > 0 && cardDef(card).kind === 'tower') return 0;   // 設計の天才：タワーのカードが0
    return c;
  }

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
    s.energy = G.RULES.energyPerTurn + has(s, 'stone') + (s.turn === 0 ? 2 * has(s, 'banner') : 0);
    s.bpUsed = 0; s.freeTowers = 0;
    // 「このターンだけ」の強化を外す
    s.buff.speedMult = 1; s.buff.goldMult = 1;
    s.towers.forEach(function (tw) { tw.turnDmgMult = 1; tw.turnRateMult = 1; });
    // 兵士は準備ターンの始めに全員元気になって持ち場に戻る
    s.soldiers.forEach(function (u) { u.dead = 0; u.hp = u.max; u.eng = null; u.x = u.hx; u.y = u.hy; });
    // 前のターンの手札は捨て札へ（使い切りの一時カードは消える）
    while (s.hand.length) { var c = s.hand.pop(); if (c.temp) s.exhaust.push(c); else s.discard.push(c); }
    for (var i = 0; i < G.RULES.drawPerTurn + has(s, 'crown'); i++) drawOne(s);
    ev(s, { k: 'prep', turn: s.turn });
  }

  function nextWave(s) { return s.waves[s.turn] || []; }

  // type：置こうとしているタワーの種類。道に置く物（place: 'path'）は道のマスだけ、ほかは道以外の地面だけ
  function canPlaceAt(s, tx, ty, type) {
    var c = tileAt(s, tx, ty);
    if (c === null) return false;
    for (var i = 0; i < s.towers.length; i++) if (s.towers[i].tx === tx && s.towers[i].ty === ty) return false;
    if (type && G.TOWERS[type].place === 'path') return c === '#' && ty > 0;
    return c === '.';
  }

  // スキルが今そのタワーに使えるか（使えない理由を返す。使えるなら null）
  function skillBlocked(s, def, tw) {
    if (def.target === 'tower') {
      if (!tw) return 'タワーを選んでください';
      var bid = def.base || def.id;
      if ((bid === 'forge' || bid === 'masterwork') && tw.lv >= G.TOWERS[tw.type].up.length) return 'これ以上強化できません';
    }
    return null;
  }

  // target：タワーカードなら {tx, ty}、タワー対象のスキルなら {tower: id}、対象なしなら null
  function playCard(s, handIndex, target) {
    if (s.phase !== 'prep' && s.phase !== 'attack') return '今は使えません';
    var card = s.hand[handIndex];
    if (!card) return 'カードがありません';
    var def = cardDef(card), cost = cardCost(card, s);
    if (s.energy < cost) return 'エネルギーが足りません';
    var tw = null;
    if (def.kind === 'tower') {
      if (!target || !canPlaceAt(s, target.tx, target.ty, def.tower)) return G.TOWERS[def.tower].place === 'path' ? '道の上に置いてください' : 'そこには置けません';
    } else {
      tw = target && target.tower ? findTower(s, target.tower) : null;
      var why = skillBlocked(s, def, tw); if (why) return why;
    }
    s.energy -= cost;
    if (def.kind === 'tower' && s.freeTowers > 0) s.freeTowers--;
    s.hand.splice(handIndex, 1);
    if (card.temp || def.exhaust) s.exhaust.push(card); else s.discard.push(card);

    if (def.kind === 'tower') {
      var TD0 = G.TOWERS[def.tower];
      var t = { id: s.nextId++, type: def.tower, tx: target.tx, ty: target.ty, x: target.tx + 0.5, y: target.ty + 0.5,
                lv: Math.min(def.startLv || 0, TD0.up.length), bonusDmg: 0, turnDmgMult: 1, cd: 0.2, aim: 0, fire: 0, target: TD0.defTarget || 'first' };
      var TD = G.TOWERS[def.tower];
      if (TD.blocker) t.hp = t.maxHp = baseStats(t.type, t.lv).blocker.hp;
      if (TD.trap) t.hitSet = {};
      s.towers.push(t);
      if (TD.soldiers) makeSoldiers(s, t);
      s.stats.built++;
      ev(s, { k: 'build', x: t.x, y: t.y });
      if (s.bpUsed < has(s, 'blueprint')) { s.bpUsed++; drawOne(s); ev(s, { k: 'relic', id: 'blueprint' }); }
      // 見習いの金床：戦闘で最初に建てたタワーは強化1回分（持っている数だけ）
      if (s.stats.built === 1 && has(s, 'anvil')) { t.lv = Math.min(TD.up.length, t.lv + has(s, 'anvil')); var ab = baseStats(t.type, t.lv); if (ab.blocker) t.hp = t.maxHp = ab.blocker.hp; if (ab.soldiers) makeSoldiers(s, t); ev(s, { k: 'relic', id: 'anvil', x: t.x, y: t.y }); }
      return null;
    }
    applySkill(s, def, tw);
    ev(s, { k: 'skill', id: def.id, x: tw ? tw.x : null, y: tw ? tw.y : null });
    return null;
  }

  function applySkill(s, def, tw) {
    switch (def.base || def.id) {
      case 'aim': tw.turnDmgMult *= def.mult; break;
      case 'whet': tw.bonusDmg += def.amount; break;
      case 'forge': tw.lv++; ev(s, { k: 'upgrade', x: tw.x, y: tw.y, id: tw.id }); var fb = baseStats(tw.type, tw.lv); if (fb.blocker) { tw.hp += fb.blocker.hp - tw.maxHp; tw.maxHp = fb.blocker.hp; } if (fb.soldiers) makeSoldiers(s, tw); break;
      case 'supply': for (var d = 0; d < def.n; d++) drawOne(s); break;
      case 'tax': s.gold += def.gold; s.stats.goldEarned += def.gold; break;
      case 'warcry': case 'overclock': s.buff.speedMult *= def.mult; break;
      case 'rally': s.towers.forEach(function (t2) { t2.turnDmgMult *= def.mult; }); break;
      case 'focus': tw.turnRateMult = (tw.turnRateMult || 1) * def.mult; break;
      case 'bounty': s.buff.goldMult = (s.buff.goldMult || 1) * def.mult; break;
      case 'patch': s.life = Math.min(s.maxLife, s.life + def.heal); break;
      case 'timestop': s.freezeT = Math.max(s.freezeT || 0, def.sec); break;
      case 'masterwork':
        tw.lv = G.TOWERS[tw.type].up.length; ev(s, { k: 'upgrade', x: tw.x, y: tw.y, id: tw.id });
        var mb = baseStats(tw.type, tw.lv); if (mb.blocker) { tw.hp += mb.blocker.hp - tw.maxHp; tw.maxHp = mb.blocker.hp; } if (mb.soldiers) makeSoldiers(s, tw);
        break;
      case 'architect': s.freeTowers += def.n; break;
      case 'meteor':
        // 隕石：今マップにいる敵すべてにダメージ（準備ターンに使うと、次の攻撃の最初の敵には当たらない）
        s.enemies.forEach(function (e2) { if (e2.hp > 0) hurt(s, e2, def.dmg, 'magic'); });
        ev(s, { k: 'boom', x: 5.5, y: 7, r: 6 });
        break;
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
    var st = { range: T.range, dmg: T.dmg, rate: T.rate, splash: T.splash || 0, poison: T.poison || null, slow: T.slow || null,
               burn: T.burn || null, chain: T.chain || 0, income: T.income || 0,
               trap: T.trap || null, blocker: T.blocker || null, soldiers: T.soldiers || null };
    if (lv > 0) { var u = T.up[lv - 1]; for (var k in u) if (k !== 'cost') st[k] = u[k]; }
    return st;
  }
  // 今の強さ：強化レベル＋スキルの強化（研ぎ石・狙い撃ち・号令）
  function towerStats(tw, s) {
    var st = baseStats(tw.type, tw.lv || 0);
    var T = G.TOWERS[tw.type];
    st.dmg = (st.dmg + (tw.bonusDmg || 0)) * (tw.turnDmgMult || 1);
    // レリックの数値アップ
    if (T.dmgType === 'physical') st.dmg *= Math.pow(1.15, has(s, 'sharp'));
    if (T.dmgType === 'magic') st.dmg *= Math.pow(1.2, has(s, 'crystal'));
    if (cmd(s, 'witch') && T.dmgType === 'magic') st.dmg *= 1.25;
    if (has(s, 'oldmap') && st.range > 0) st.range = Math.round((st.range + 0.3 * has(s, 'oldmap')) * 10) / 10;
    var plusDur = 2 * has(s, 'vial') + (cmd(s, 'witch') ? 1 : 0);
    if (plusDur) {
      if (st.poison) st.poison = { dps: st.poison.dps, dur: st.poison.dur + plusDur };
      if (st.burn) st.burn = { dps: st.burn.dps, dur: st.burn.dur + plusDur };
    }
    st.dmg = Math.round(st.dmg * 10) / 10;
    if (s && s.buff.speedMult !== 1) st.rate = st.rate / s.buff.speedMult;
    if (tw.turnRateMult && tw.turnRateMult !== 1) st.rate = st.rate / tw.turnRateMult;
    return st;
  }
  function nextStats(tw, s) { // 次のレベルの強さ（最大なら null）
    if (tw.lv >= G.TOWERS[tw.type].up.length) return null;
    return towerStats({ type: tw.type, lv: tw.lv + 1, bonusDmg: tw.bonusDmg, turnDmgMult: tw.turnDmgMult }, s);
  }
  function upgradeCost(tw, s) {
    var T = G.TOWERS[tw.type];
    if (tw.lv >= T.up.length) return null;
    return cmd(s, 'engineer') ? Math.round(T.up[tw.lv].cost * 0.8) : T.up[tw.lv].cost;
  }
  function upgrade(s, towerId) {
    var tw = findTower(s, towerId);
    if (!tw) return 'タワーがありません';
    var c = upgradeCost(tw, s);
    if (c === null) return 'これ以上強化できません';
    if (s.gold < c) return 'お金が足りません';
    s.gold -= c; tw.lv++;
    var bs = baseStats(tw.type, tw.lv);
    if (bs.blocker) { var add = bs.blocker.hp - tw.maxHp; tw.maxHp = bs.blocker.hp; tw.hp += add; }
    if (bs.soldiers) makeSoldiers(s, tw);
    ev(s, { k: 'upgrade', x: tw.x, y: tw.y, id: tw.id });
    return null;
  }
  // ---- 兵士：兵舎から一番近い道の上に立つ ----
  function nearestPathPoint(s, x, y) {
    var best = null, bd = 1e9;
    Object.keys(s.paths).forEach(function (k) {
      s.paths[k].segs.forEach(function (sg) {
        var n = Math.max(1, Math.ceil(sg.l * 4));
        for (var i = 0; i <= n; i++) {
          var px = sg.a[0] + (sg.b[0] - sg.a[0]) * i / n, py = sg.a[1] + (sg.b[1] - sg.a[1]) * i / n;
          if (py < 1) continue;
          var d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = { x: px, y: py, d: d }; }
        }
      });
    });
    return best;
  }
  function makeSoldiers(s, tw) {
    var st = baseStats(tw.type, tw.lv).soldiers, home = nearestPathPoint(s, tw.x, tw.y) || { x: tw.x, y: tw.y };
    tw.rally = home;
    var mine = s.soldiers.filter(function (u) { return u.tower === tw.id; });
    for (var i = mine.length; i < st.n; i++) {
      var ang = i * 2.1;
      s.soldiers.push({ id: s.nextId++, tower: tw.id, hx: home.x + Math.cos(ang) * 0.3, hy: home.y + Math.sin(ang) * 0.22,
                        x: tw.x, y: tw.y, hp: st.hp, max: st.hp, cd: 0, eng: null, dead: 0, face: 1, flash: 0 });
    }
    s.soldiers.forEach(function (u) { if (u.tower === tw.id && u.dead <= 0) { var add = st.hp - u.max; u.max = st.hp; u.hp += Math.max(0, add); } else if (u.tower === tw.id) u.max = st.hp; });
  }
  function enemyAtk(E) { return E.atk || (5 + E.life * 3); }

  function findTowerAt(s, tx, ty) {
    for (var i = 0; i < s.towers.length; i++) if (s.towers[i].tx === tx && s.towers[i].ty === ty) return s.towers[i];
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
    s.wallUsed = 0;
    s.spawnQueue = [];
    nextWave(s).forEach(function (g) {
      for (var i = 0; i < g.n; i++) s.spawnQueue.push({ t: g.delay + i * g.gap, gate: g.gate, type: g.type });
    });
    s.spawnQueue.sort(function (a, b) { return a.t - b.t; });
    ev(s, { k: 'attack', turn: s.turn });
  }

  function spawn(s, q) {
    var E = G.ENEMIES[q.type], hp = Math.round(E.hp * (E.boss ? s.bossMult : s.hpMult));
    var gate = E.fly && q.gate.slice(-1) !== '~' ? q.gate + '~' : q.gate;
    var e = { id: s.nextId++, type: q.type, gate: gate, hp: hp, fly: !!E.fly, sumT: 0, healT: 0, max: hp, d: q.d || 0,
              off: E.boss ? 0 : (s.rand() - 0.5) * (q.d ? 0.5 : 0.3), x: 0, y: 0, face: 1, walk: s.rand() * 10, flash: 0,
              slowPct: 0, slowT: 0, poisonDps: 0, poisonT: 0, poisonTick: 0, burnDps: 0, burnT: 0, burnTick: 0 };
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

  // type：physical（よろいで減る）/ magic（魔法に強い敵で減る）/ burn（やけど、魔法と同じ）/ poison（何でも通る）
  function hurt(s, e, dmg, type, src) {
    if (e.hp <= 0) return;
    var E = G.ENEMIES[e.type], cut = 0, combo = false;
    // 組み合わせのレリック
    var slowed = e.slowT > 0 || e.tarT > 0;
    if (src === 'thunder' && slowed && has(s, 'conductor')) { dmg *= Math.pow(2, has(s, 'conductor')); combo = true; }
    if (src === 'fire' && e.tarT > 0 && has(s, 'oil')) { dmg *= Math.pow(1.5, has(s, 'oil')); combo = true; }
    if (type === 'physical' && slowed && has(s, 'brittle')) { dmg *= Math.pow(1.25, has(s, 'brittle')); combo = true; }
    if (type === 'physical') cut = E.armor;
    else if ((type === 'magic' || type === 'burn') && E.magicResist) cut = E.magicResist;
    var real = dmg * (1 - cut);
    e.hp -= real; if (type !== 'poison' && type !== 'burn') e.flash = 0.12;
    var kind = type === 'poison' ? 'poison' : type === 'burn' ? 'burn' : combo ? 'combo' : cut > 0 ? 'resisted' : 'normal';
    ev(s, { k: 'hit', x: e.x, y: e.y, amount: real, kind: kind });
    if (e.hp <= 0) {
      // ガイコツ：一度だけ体力半分で起き上がる
      if (E.revive && !e.revived) { e.revived = true; e.hp = e.max * 0.5; e.poisonT = e.burnT = 0; ev(s, { k: 'revive', x: e.x, y: e.y }); return; }
      var gold = Math.round((E.gold + has(s, 'scale')) * (1 + 0.25 * has(s, 'magnet')) * ((s.buff && s.buff.goldMult) || 1));
      s.gold += gold; s.stats.goldEarned += gold; s.stats.killed++;
      ev(s, { k: 'kill', x: e.x, y: e.y, type: e.type, gold: gold, boss: !!E.boss, big: E.life >= 3 });
      // 疫病の灰：毒の敵が倒れると周りに毒がうつる
      if (has(s, 'plague') && e.poisonT > 0) {
        s.enemies.forEach(function (o) {
          if (o === e || o.hp <= 0 || Math.hypot(o.x - e.x, o.y - e.y) > 1.2) return;
          o.poisonDps = Math.max(o.poisonDps, e.poisonDps * has(s, 'plague')); o.poisonT = Math.max(o.poisonT, e.poisonT + 1);
        });
        ev(s, { k: 'plague', x: e.x, y: e.y });
      }
      // 大スライム：倒すと小さいスライムに分かれる（同じ場所から）
      if (E.split) for (var i = 0; i < E.split.n; i++) s.pendingSpawn.push({ gate: e.gate, type: E.split.type, d: Math.max(0, e.d - 0.15 * i) });
    }
  }
  // 弾が当たった時の追加効果（毒・遅くする）
  function applyOnHit(s, e, sh) {
    if (e.hp <= 0) return;
    var E = G.ENEMIES[e.type];
    var imm = E.immune || [];
    if (sh.poison) { e.poisonDps = Math.max(e.poisonDps, sh.poison.dps); e.poisonT = Math.max(e.poisonT, sh.poison.dur); }
    if (sh.burn && imm.indexOf('burn') < 0) {
      var bd = sh.burn.dur * (sh.src === 'fire' && e.tarT > 0 ? Math.pow(2, has(s, 'oil')) : 1);
      e.burnDps = Math.max(e.burnDps, sh.burn.dps); e.burnT = Math.max(e.burnT, bd);
    }
    if (sh.slow && imm.indexOf('slow') < 0) {
      var pct = E.boss ? sh.slow.pct / 2 : sh.slow.pct;   // ボスには半分しか効かない
      e.slowPct = Math.max(e.slowPct, pct); e.slowT = Math.max(e.slowT, sh.slow.dur);
    }
  }

  // ---- タワーが狙う敵の決め方（射程内の敵のうち、点数が一番大きい敵を狙う） ----
  var TARGET_SCORE = {
    first:  function (e) { return e.d; },               // 先頭（一番城に近い）
    last:   function (e) { return -e.d; },              // 最後尾
    strong: function (e) { return e.hp; },              // 体力が一番多い
    weak:   function (e) { return -e.hp; },             // 体力が一番少ない
    near:   function (e, dist) { return -dist; },       // タワーから一番近い
    far:    function (e, dist) { return dist; }         // タワーから一番遠い
  };
  var TARGET_MODES = [
    { id: 'first', name: '先頭' }, { id: 'last', name: '最後尾' }, { id: 'strong', name: '体力が多い' },
    { id: 'weak', name: '体力が少ない' }, { id: 'near', name: '近い' }, { id: 'far', name: '遠い' }
  ];
  function setTarget(s, towerId, mode) { var tw = findTower(s, towerId); if (tw && TARGET_SCORE[mode]) tw.target = mode; }

  // ---- 罠・バリケード・兵士（敵が動く前に、止める・ダメージを与える） ----
  function updateBlockers(s, dt) {
    var i, j, e, E;
    s.enemies.forEach(function (en) { en.blockedBy = null; });
    // 罠
    for (i = s.towers.length - 1; i >= 0; i--) {
      var tw = s.towers[i], st = baseStats(tw.type, tw.lv);
      if (st.trap) {
        for (j = 0; j < s.enemies.length; j++) {
          e = s.enemies[j]; if (e.hp <= 0 || e.fly) continue;
          var on = Math.abs(e.x - tw.x) < 0.55 && Math.abs(e.y - tw.y) < 0.55;
          if (!on) continue;
          if (st.trap.type === 'spike' && !tw.hitSet[e.id]) { tw.hitSet[e.id] = 1; hurt(s, e, st.trap.dmg, 'physical'); ev(s, { k: 'pin', x: e.x, y: e.y }); }
          if (st.trap.type === 'tar') { e.tarT = 1.5; e.tarSlow = st.trap.slow; }
          if (st.trap.type === 'bomb') {
            for (var k = 0; k < s.enemies.length; k++) { var be = s.enemies[k]; if (be.hp > 0 && !be.fly && Math.hypot(be.x - tw.x, be.y - tw.y) <= st.trap.splash) hurt(s, be, st.trap.dmg, 'physical'); }
            ev(s, { k: 'boom', x: tw.x, y: tw.y, r: st.trap.splash });
            s.towers.splice(i, 1); break;
          }
        }
      } else if (st.blocker) {
        // バリケード：上に来た敵（ボス以外）を止め、止めた敵から攻撃される
        for (j = 0; j < s.enemies.length; j++) {
          e = s.enemies[j]; E = G.ENEMIES[e.type];
          if (e.hp <= 0 || E.boss || e.fly) continue;
          if (Math.hypot(e.x - tw.x, e.y - tw.y) < 0.6) { e.blockedBy = 'b' + tw.id; tw.hp -= enemyAtk(E) * dt; }
        }
        if (tw.hp <= 0) { ev(s, { k: 'broken', x: tw.x, y: tw.y }); s.towers.splice(i, 1); s.enemies.forEach(function (en) { if (en.blockedBy === 'b' + tw.id) en.blockedBy = null; }); }
      }
    }
    // 兵士：近くの敵1体と戦う（ボスは止められないが攻撃はする）
    var engaged = {};
    s.soldiers.forEach(function (u) { if (u.dead <= 0 && u.eng) engaged[u.eng] = (engaged[u.eng] || 0) + 1; });
    for (i = 0; i < s.soldiers.length; i++) {
      var u = s.soldiers[i];
      var owner = findTower(s, u.tower); if (!owner) { s.soldiers.splice(i--, 1); continue; }
      var ss = baseStats(owner.type, owner.lv).soldiers;
      if (u.flash > 0) u.flash -= dt;
      if (u.swing > 0) u.swing -= dt;
      if (u.dead > 0) { u.dead -= dt; if (u.dead <= 0) { u.hp = u.max; u.x = owner.x; u.y = owner.y; } continue; }
      var tgt = null;
      if (u.eng) { for (j = 0; j < s.enemies.length; j++) if (s.enemies[j].id === u.eng) tgt = s.enemies[j]; }
      if (tgt && (tgt.hp <= 0 || Math.hypot(tgt.x - u.hx, tgt.y - u.hy) > 1.1)) tgt = null;
      if (!tgt) {
        u.eng = null;
        var bd = 0.9;
        for (j = 0; j < s.enemies.length; j++) {
          e = s.enemies[j]; if (e.hp <= 0 || e.y < 1 || e.fly) continue;
          var d = Math.hypot(e.x - u.hx, e.y - u.hy);
          if (d < bd && !engaged[e.id]) { bd = d; tgt = e; }
        }
        if (tgt) { u.eng = tgt.id; engaged[tgt.id] = 1; }
      }
      // 動く：戦っている敵の横へ、いなければ持ち場へ
      var gx = tgt ? tgt.x - 0.25 * (tgt.face || 1) : u.hx, gy = tgt ? tgt.y : u.hy;
      var dx = gx - u.x, dy = gy - u.y, dd = Math.hypot(dx, dy), step = 2.2 * dt;
      if (dd > step) { u.x += dx / dd * step; u.y += dy / dd * step; } else { u.x = gx; u.y = gy; }
      if (Math.abs(dx) > 0.02) u.face = dx > 0 ? 1 : -1;
      if (tgt && dd < 0.35) {
        E = G.ENEMIES[tgt.type];
        if (!E.boss || ss.stopsBoss) tgt.blockedBy = 's' + u.id;   // 石の巨人はボスも止める
        u.cd -= dt;
        if (u.cd <= 0) { u.cd = ss.rate; hurt(s, tgt, ss.dmg, 'physical'); u.swing = 0.2; }
        if (!E.boss || dd < 0.35) { u.hp -= enemyAtk(E) * dt; u.flash = 0.05; }
        if (u.hp <= 0) { u.dead = ss.respawn; u.eng = null; ev(s, { k: 'soldierDown', x: u.x, y: u.y }); }
      }
      if (u.swing > 0) u.swing -= dt;
    }
  }

  function update(s, dt) {
    if (s.phase !== 'attack') return;
    s.time += dt;
    if (s.freezeT > 0) s.freezeT -= dt;   // 時止め
    while (s.spawnQueue.length && s.spawnQueue[0].t <= s.time) spawn(s, s.spawnQueue.shift());
    while (s.pendingSpawn.length) spawn(s, s.pendingSpawn.shift());

    updateBlockers(s, dt);

    // 敵が進む・毒のダメージ
    for (var i = 0; i < s.enemies.length; i++) {
      var e = s.enemies[i], E = G.ENEMIES[e.type];
      if (e.hp <= 0) continue;
      var sp = E.speed * Math.pow(0.9, has(s, 'frostbell'));
      if (e.tarT > 0) { e.tarT -= dt; if ((E.immune || []).indexOf('slow') < 0) sp *= (1 - e.tarSlow); }
      if (e.blockedBy) { sp = 0; }   // 兵士・バリケードに止められている
      if (s.freezeT > 0) sp *= E.boss ? 0.5 : 0;   // 時止め（ボスは半分の速さ）
      // ボス：一定の時間ごとに手下を呼ぶ（飛ぶ手下は入口から、歩く手下はボスのすぐ後ろから）
      if (E.summon) {
        e.sumT += dt;
        if (e.sumT >= E.summon.every) {
          e.sumT = 0;
          var SE = G.ENEMIES[E.summon.type];
          for (var q = 0; q < E.summon.n; q++) s.pendingSpawn.push(SE.fly ? { gate: e.gate.replace('~', ''), type: E.summon.type, d: 0.2 * q } : { gate: e.gate, type: E.summon.type, d: Math.max(0, e.d - 0.35 - 0.3 * q) });
          ev(s, { k: 'summon', x: e.x, y: e.y });
        }
      }
      // 呪術師：近くの仲間（自分以外）の体力を回復
      if (E.heal) {
        e.healT += dt;
        if (e.healT >= E.heal.every) {
          e.healT = 0;
          var amt = E.heal.amt * s.hpMult, healed = false;
          s.enemies.forEach(function (o) {
            if (o === e || o.hp <= 0 || o.hp >= o.max || Math.hypot(o.x - e.x, o.y - e.y) > E.heal.r) return;
            o.hp = Math.min(o.max, o.hp + amt); healed = true; ev(s, { k: 'healed', x: o.x, y: o.y, amount: amt });
          });
          if (healed) ev(s, { k: 'healcast', x: e.x, y: e.y, r: E.heal.r });
        }
      }
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
      if (e.burnT > 0) {
        e.burnT -= dt; e.burnTick += dt;
        if (e.burnTick >= 0.5) { e.burnTick -= 0.5; hurt(s, e, e.burnDps * 0.5, 'burn'); }
        if (e.burnT <= 0) { e.burnDps = 0; e.burnTick = 0; }
        if (e.hp <= 0) continue;
      }
      place(s, e);
      // ボス：城の前で止まり、一定の間隔で城を攻撃する（倒すまで戦闘は終わらない）
      if (E.boss && e.d >= pathOf(s, e.gate).len - 1.6) {
        e.d = pathOf(s, e.gate).len - 1.6; place(s, e);
        if (!e.atCastle) { e.atCastle = true; e.atkT = 1.0; ev(s, { k: 'bossArrive', x: e.x, y: e.y, type: e.type }); }
        e.atkT -= dt; if (e.atkAnim > 0) e.atkAnim -= dt;
        if (e.atkT <= 0) {
          var BH = G.RULES.bossHit, hit = E.final ? BH.finalDmg : BH.dmg;
          e.atkT = BH.every; e.atkAnim = 0.45;
          s.life = Math.max(0, s.life - hit); s.stats.bossHits = (s.stats.bossHits || 0) + hit;
          ev(s, { k: 'bossHit', x: e.x, y: e.y + 0.6, life: hit, type: e.type });
        }
        continue;
      }
      if (e.d >= pathOf(s, e.gate).len) {
        e.hp = 0; e.leaked = true; s.stats.leaked++;
        if (s.wallUsed < has(s, 'wall') && !E.boss) { s.wallUsed++; ev(s, { k: 'relic', id: 'wall', x: e.x, y: e.y }); }
        else { s.life = Math.max(0, s.life - E.life); ev(s, { k: 'leak', x: e.x, y: e.y, life: E.life, type: e.type }); }
      }
    }

    // タワーが撃つ（射程内で一番ゴールに近い敵をねらう）
    for (i = 0; i < s.towers.length; i++) {
      var tw = s.towers[i], T = G.TOWERS[tw.type];
      if (T.noAttack) continue;
      var st = towerStats(tw, s), noAir = !!T.noAir;
      // 吹雪の塔：弾を撃たず、射程の中の敵すべてにダメージと遅くする効果
      if (T.aura) {
        tw.cd -= dt; if (tw.fire > 0) tw.fire -= dt;
        if (tw.cd <= 0) {
          var hitAny = false;
          for (var aj = 0; aj < s.enemies.length; aj++) {
            var ae = s.enemies[aj]; if (ae.hp <= 0 || Math.hypot(ae.x - tw.x, ae.y - tw.y) > st.range) continue;
            hurt(s, ae, st.dmg, 'magic', tw.type); applyOnHit(s, ae, { slow: st.slow }); hitAny = true;
          }
          if (hitAny) { tw.cd = st.rate; tw.fire = 0.3; ev(s, { k: 'blizzard', x: tw.x, y: tw.y, r: st.range }); }
        }
        continue;
      }
      tw.cd -= dt; if (tw.fire > 0) tw.fire -= dt;
      var best = null, bestScore = 0, score = TARGET_SCORE[tw.target] || TARGET_SCORE.first;
      for (var j = 0; j < s.enemies.length; j++) {
        var en = s.enemies[j];
        if (en.hp <= 0 || en.y < 0 || (noAir && en.fly)) continue;
        var dist = Math.hypot(en.x - tw.x, en.y - tw.y);
        if (dist > st.range) continue;
        var sc = score(en, dist);
        if (!best || sc > bestScore) { best = en; bestScore = sc; }
      }
      if (best) tw.aim = best.x < tw.x ? -1 : 1;
      if (best && tw.cd <= 0) {
        tw.cd = st.rate; tw.fire = 0.25;
        var sy = tw.y - (T.muzzle !== undefined ? T.muzzle : 1.5);
        s.shots.push({ kind: T.shot, x: tw.x, y: sy, sx: tw.x, sy: sy, target: best.id,
                       tx: best.x, ty: best.y, speed: T.speed, dmg: st.dmg, dmgType: T.dmgType,
                       splash: st.splash, poison: st.poison, slow: st.slow, burn: st.burn, chain: st.chain, t: 0, src: tw.type, noAir: noAir, vsBoss: T.vsBoss || 0, chainMul: T.chainFull ? 1 : 0.7 });
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
            if (ee.hp > 0 && !(sh.noAir && ee.fly) && Math.hypot(ee.x - sh.tx, ee.y - sh.ty) <= sh.splash) hurt(s, ee, sh.dmg, sh.dmgType, sh.src);
          }
          ev(s, { k: 'boom', x: sh.tx, y: sh.ty, r: sh.splash, small: sh.kind === 'stone' });
          s.shots.splice(i, 1);
        }
        continue;
      }
      var dx = sh.tx - sh.x, dy = sh.ty - sh.y, dist = Math.hypot(dx, dy), step = sh.speed * dt;
      sh.ang = Math.atan2(dy, dx);
      if (dist <= step) {
        if (sh.splash) {   // 炎：当たった所の周りにもダメージとやけど
          for (j = 0; j < s.enemies.length; j++) {
            var se = s.enemies[j];
            if (se.hp > 0 && Math.hypot(se.x - sh.tx, se.y - (sh.ty + 0.3)) <= sh.splash) { hurt(s, se, sh.dmg, sh.dmgType, sh.src); applyOnHit(s, se, sh); }
          }
        } else if (tgt && tgt.hp > 0) { hurt(s, tgt, sh.dmg * (sh.vsBoss && G.ENEMIES[tgt.type].boss ? sh.vsBoss : 1), sh.dmgType, sh.src); applyOnHit(s, tgt, sh); }
        // 雷：近くの敵へ順に飛び移る（70%のダメージ）
        if (sh.chain && tgt) {
          var hit = [tgt.id], from = tgt;
          for (var c = 0; c < sh.chain; c++) {
            var nx = null, nd = 1.6;
            for (j = 0; j < s.enemies.length; j++) {
              var ce = s.enemies[j];
              if (ce.hp <= 0 || hit.indexOf(ce.id) >= 0) continue;
              var cd = Math.hypot(ce.x - from.x, ce.y - from.y); if (cd < nd) { nd = cd; nx = ce; }
            }
            if (!nx) break;
            ev(s, { k: 'chain', x0: from.x, y0: from.y - 0.4, x1: nx.x, y1: nx.y - 0.4 });
            hurt(s, nx, sh.dmg * sh.chainMul, sh.dmgType, sh.src); hit.push(nx.id); from = nx;
          }
        }
        ev(s, { k: sh.kind === 'orb' ? 'zap' : sh.kind === 'ice' ? 'frost' : sh.kind === 'drip' ? 'splat' : sh.kind === 'flame' ? 'flame' : sh.kind === 'spark' ? 'zap' : 'pin', x: sh.tx, y: sh.ty });
        s.shots.splice(i, 1);
      } else { sh.x += dx / dist * step; sh.y += dy / dist * step; }
    }

    s.enemies = s.enemies.filter(function (e) { return e.hp > 0; });

    // 不死鳥の羽：ライフが0になったら1枚使ってライフ10で立ち直る
    if (s.life <= 0 && s.phoenix > 0) { s.phoenix--; s.life = 10; s.phoenixUsed = (s.phoenixUsed || 0) + 1; ev(s, { k: 'relic', id: 'phoenix', x: 5.5, y: 12 }); }
    if (s.life <= 0) { s.phase = 'lose'; s.shots = []; ev(s, { k: 'lose' }); return; }
    if (!s.spawnQueue.length && !s.enemies.length && !s.pendingSpawn.length) {
      s.shots = [];
      // 金鉱：攻撃を1回しのぐたびにお金
      s.towers.forEach(function (tw) {
        var inc = G.TOWERS[tw.type].noAttack ? baseStats(tw.type, tw.lv).income : 0;
        if (inc) { s.gold += inc; s.stats.goldEarned += inc; ev(s, { k: 'income', x: tw.x, y: tw.y, gold: inc }); }
      });
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
        if (G.TOWERS[type].noAttack) return;   // 攻撃しないタワー（金鉱）は比べない
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
    cardCost: cardCost, cardDef: cardDef, pathLengths: function (map) { var P = pathsOf(map), o = {}; Object.keys(P).forEach(function (k) { o[k] = P[k].len; }); return o; }, nearestPathPoint: nearestPathPoint, rng: rng, shuffle: shuffle, TARGET_MODES: TARGET_MODES, setTarget: setTarget, findTowerAt: findTowerAt
  };
})();

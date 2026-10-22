// 自動対戦：戦闘処理とランの処理だけを Node で動かし、決まった作戦で1層を最後まで遊んで結果を出す
// 使い方：node tools/sim.js [回数]
'use strict';
global.window = global;
require('../js/data.js');
require('../js/battle.js');
require('../js/run.js');
var G = global.G, B = G.Battle;

// 置ける場所のうち、射程（2.4マス）の中を通る道の長さが一番長い所を選ぶ（入口が多い道ほど重く数える）
var coverCache = {}, LEAK = {}, BOSS = {}, bossNow = null, TFREEZE = 0, TFREEZE_TOWERS = 0;
function coverage(s) {
  if (coverCache[s.map.id]) return coverCache[s.map.id];
  var pts = [];
  Object.keys(s.map.paths).forEach(function (k) {
    var P = s.map.paths[k];
    for (var i = 0; i < P.length - 1; i++) {
      var n = Math.ceil(Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]) * 3);
      for (var j = 0; j < n; j++) pts.push([P[i][0] + (P[i + 1][0] - P[i][0]) * j / n, P[i][1] + (P[i + 1][1] - P[i][1]) * j / n]);
    }
  });
  // 空を飛ぶ敵のまっすぐな道も同じ重さで数える
  Object.keys(s.map.paths).forEach(function (k) {
    var P = s.map.paths[k], a = P[0], b = P[P.length - 1], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 3);
    for (var j = 0; j < n; j++) pts.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]);
  });
  var score = {};
  for (var ty = 0; ty < s.map.rowsN; ty++) for (var tx = 0; tx < s.map.cols; tx++) {
    var c = 0; pts.forEach(function (p) { if (Math.hypot(p[0] - tx - 0.5, p[1] - ty - 0.5) <= 2.4) c++; });
    score[tx + ',' + ty] = c;
  }
  return (coverCache[s.map.id] = score);
}
function bestSpot(s, type) {
  var sc = coverage(s), best = null;
  for (var ty = 0; ty < s.map.rowsN; ty++) for (var tx = 0; tx < s.map.cols; tx++) {
    if (!B.canPlaceAt(s, tx, ty, type)) continue;
    var n = sc[tx + ',' + ty];
    if (!best || n > best.n) best = { tx: tx, ty: ty, n: n };
  }
  return best;
}
function strongest(s) {
  var best = null;
  s.towers.forEach(function (tw) { var d = B.towerStats(tw, s).dmg; if (!best || d > best.d) best = { tw: tw, d: d }; });
  return best && best.tw;
}

// 準備ターンの作戦：使えるカードを全部使い、余ったお金で強化
function playTurn(s) {
  var guard = 0, played = true;
  while (played && guard++ < 30) {
    played = false;
    for (var i = 0; i < s.hand.length; i++) {
      var c = s.hand[i], def = B.cardDef(c);
      if (B.cardCost(c, s) > s.energy) continue;
      var target = null;
      if (def.kind === 'tower') { target = bestSpot(s, def.tower); if (!target) continue; }
      else if (def.target === 'tower') {
        var tw = def.id === 'forge' ? s.towers.filter(function (t) { return t.lv < G.TOWERS[t.type].up.length; })[0] : strongest(s);
        if (!tw) continue; target = { tower: tw.id };
      }
      if (!B.playCard(s, i, target)) { played = true; break; }
    }
  }
  s.towers.slice().sort(function (a, b) { var pa = G.TOWERS[a.type].place === 'path' ? 500 : 0, pb = G.TOWERS[b.type].place === 'path' ? 500 : 0; return pa + (B.upgradeCost(a, s) || 999) - pb - (B.upgradeCost(b, s) || 999); }).forEach(function (tw) {
    var c = B.upgradeCost(tw, s); if (c !== null && s.gold >= c + 20) B.upgrade(s, tw.id);
  });
}

function fight(opts) {
  var s = B.create(opts), guard = 0;
  while ((s.phase === 'prep' || s.phase === 'attack') && guard++ < 400000) {
    if (s.phase === 'prep') { playTurn(s); B.startAttack(s); }
    B.update(s, 1 / 30);
    if (process.env.LEAKS) s.events.forEach(function (e) { if (e.k === 'leak') LEAK[e.type] = (LEAK[e.type] || 0) + e.life; });
    // ボス本体：倒せたか・砦に着いたか、着いた時に残っていた体力の割合
    if (process.env.BOSS) s.events.forEach(function (e) {
      if (e.k === 'tfreeze') { TFREEZE++; TFREEZE_TOWERS += e.towers.length; }
      if (e.k === 'spawn' && e.boss) bossNow = s.enemies[s.enemies.length - 1];
      if (e.k === 'kill' && e.boss) { var bk = (BOSS[e.type] = BOSS[e.type] || { kill: 0, leak: 0, left: [] }); bk.kill++; if (!bossNow || !bossNow.atCastle) bk.early = (bk.early || 0) + 1; }
      if (e.k === 'bossArrive') { var ba = (BOSS[e.type] = BOSS[e.type] || { kill: 0, leak: 0, left: [] }); ba.arrive = (ba.arrive || 0) + 1; if (bossNow) ba.left.push(Math.round(bossNow.hp / bossNow.max * 100)); }
      if (e.k === 'bossHit') { var bh = (BOSS[e.type] = BOSS[e.type] || { kill: 0, leak: 0, left: [] }); bh.hits = (bh.hits || 0) + e.life; }
      if (e.k === 'leak' && G.ENEMIES[e.type].boss) { var b = (BOSS[e.type] = BOSS[e.type] || { kill: 0, leak: 0, left: [] }); b.leak++; if (bossNow) b.left.push(Math.round(bossNow.lastHp / bossNow.max * 100)); }
    });
    if (bossNow && bossNow.hp > 0) bossNow.lastHp = bossNow.hp;
    s.events.length = 0;
  }
  return s;
}

// たき火：ライフが6割以上なら1枚鍛える（強い順の表の最初の1枚）、それ以外は休む
var UP_ORDER = ['archer', 'mage', 'thunder', 'fire', 'cannon', 'ballista', 'frost', 'barracks', 'poison', 'bowman', 'sling', 'aim'];
function upgradeBest(run) {
  for (var k = 0; k < UP_ORDER.length; k++) { var i = run.deck.indexOf(UP_ORDER[k]); if (i >= 0) return G.Run.upgradeCard(run, i); }
  for (i = 0; i < run.deck.length; i++) if (G.Run.canUpgradeCard(run.deck[i])) return G.Run.upgradeCard(run, i);
  return false;
}
function playRun(seed, log, cmdId) {
  var run = G.Run.create(seed, cmdId, +process.env.ASC || 0), steps = [];
  while (!run.over) {
    var opts = G.Run.reachable(run);
    var nid = opts[Math.floor(run.rand() * opts.length)];
    G.Run.enter(run, nid);
    var n = G.Run.node(run);
    if (n.type === 'battle' || n.type === 'elite' || n.type === 'boss') {
      var lifeBefore = run.life;
      var s = fight(G.Run.battleOpts(run));
      G.Run.finishBattle(run, s);
      steps.push(n.floor + n.type[0] + '(-' + (lifeBefore - s.life) + ')');
      if (run.secondBoss) { run.secondBoss = false; var s2 = fight(G.Run.battleOpts(run)); G.Run.finishBattle(run, s2); steps.push('B2(-' + (lifeBefore - s2.life) + ')'); }   // A10：2体目の3層ボス
      if (run.actClear) { var cs = G.Run.rollCards(run, 3, 'boss'); G.Run.logPick(run, 'boss', cs, cs[0]); G.Run.addCard(run, cs[0]); G.Run.addRelic(run, G.Run.rollRelic(run, 'elite')); G.Run.nextAct(run); steps.push('| 第' + run.act + '層'); continue; }
      if (!run.over) {
        if (n.type === 'elite' || n.type === 'boss') G.Run.addRelic(run, G.Run.rollRelic(run, 'elite'));
        var cards = G.Run.rollCards(run, 3, n.type === 'boss' ? 'boss' : n.type === 'elite' ? 'elite' : 'battle');
        G.Run.logPick(run, n.type, cards, cards[0]); G.Run.addCard(run, cards[0]);
      }
    } else if (n.type === 'rest') {
      if (process.env.NOUP || run.life < run.maxLife * 0.6 || !upgradeBest(run)) { G.Run.logSet(run, 'rest', 'heal'); G.Run.rest(run); steps.push(n.floor + 'R'); }
      else { G.Run.logSet(run, 'rest', 'up'); steps.push(n.floor + 'U'); }
    }
    else if (n.type === 'shop') {
      var stk = G.Run.shopStock(run), st = stk.cards.filter(function (x) { return x.price <= run.gold; })[0];
      G.Run.logSet(run, 'shop', { o: stk.cards.map(function (x) { return x.id; }), r: stk.relic ? stk.relic.id : null });
      if (st) { run.gold -= st.price; G.Run.logAdd(run, 'buy', st.id); G.Run.addCard(run, st.id); }
      steps.push(n.floor + 'S');
    } else {
      var e = G.Run.rollEvent(run), res = G.Run.eventChoice(run, e.choices[0]);
      G.Run.logSet(run, 'ev', { id: e.id, c: 0 });
      if (res.next === 'pickCard') { G.Run.logPick(run, 'event', res.cards, res.cards[0]); G.Run.addCard(run, res.cards[0]); }
      if (res.next === 'pickCopy') G.Run.addCard(run, run.deck[run.deck.length - 1]);
      if (res.next === 'pickUpgrade') upgradeBest(run);
      if (res.next === 'pickRemove' && run.deck.length > 5) G.Run.removeCard(run, run.deck.indexOf('sling'));
      steps.push(n.floor + 'E');
    }
  }
  if (log) console.log((run.won ? '勝ち' : '負け') + ' レリック' + run.relics.length + ' ライフ' + run.life + ' お金' + run.gold + ' デッキ' + run.deck.length + '枚 | ' + steps.join(' '));
  return run;
}

// 使い方：node tools/sim.js [回数] [指揮官のid（省略すると全員）]
var N = +process.argv[2] || 10, only = process.argv[3], total = 0, totalWins = 0;
Object.keys(G.COMMANDERS).filter(function (c) { return !only || c === only; }).forEach(function (cmdId) {
  var wins = 0, reached = [];
  for (var i = 1; i <= N; i++) {
    var r = playRun(i * 7919, !!process.env.LOG, cmdId);
    if (r.won) wins++;
    reached.push(r.act + '-' + (G.Run.node(r) ? G.Run.node(r).floor : 0));
  }
  total += N; totalWins += wins;
  console.log(G.COMMANDERS[cmdId].name + '：勝率 ' + wins + '/' + N + '、到達した階 ' + reached.join(','));
});
console.log('合計 ' + totalWins + '/' + total);
if (process.env.LEAKS) console.log(JSON.stringify(LEAK));
if (process.env.BOSS) console.log('吹雪の魔女が止めた回数：' + TFREEZE + '回（タワー ' + TFREEZE_TOWERS + '個ぶん）');
if (process.env.BOSS) Object.keys(BOSS).forEach(function (k) { var b = BOSS[k], tot = b.kill + (b.lost || 0); console.log(G.ENEMIES[k].name + '：倒した ' + b.kill + '（砦に着く前 ' + (b.early || 0) + '）・砦に着いた ' + (b.arrive || 0) + (b.left.length ? '（着いた時の残り体力 平均' + Math.round(b.left.reduce(function (a, c) { return a + c; }, 0) / b.left.length) + '%）' : '') + '・砦をたたいて減らしたライフ 合計' + (b.hits || 0)); });

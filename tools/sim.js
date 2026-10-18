// 自動対戦：戦闘処理とランの処理だけを Node で動かし、決まった作戦で1層を最後まで遊んで結果を出す
// 使い方：node tools/sim.js [回数]
'use strict';
global.window = global;
require('../js/data.js');
require('../js/battle.js');
require('../js/run.js');
var G = global.G, B = G.Battle;

// 置ける場所のうち、射程（2.4マス）の中を通る道の長さが一番長い所を選ぶ（入口が多い道ほど重く数える）
var coverCache = {};
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
      if (B.cardCost(c) > s.energy) continue;
      var target = null;
      if (def.kind === 'tower') { target = bestSpot(s, def.tower); if (!target) continue; }
      else if (def.target === 'tower') {
        var tw = def.id === 'forge' ? s.towers.filter(function (t) { return t.lv < G.TOWERS[t.type].up.length; })[0] : strongest(s);
        if (!tw) continue; target = { tower: tw.id };
      }
      if (!B.playCard(s, i, target)) { played = true; break; }
    }
  }
  s.towers.slice().sort(function (a, b) { var pa = G.TOWERS[a.type].place === 'path' ? 500 : 0, pb = G.TOWERS[b.type].place === 'path' ? 500 : 0; return pa + (B.upgradeCost(a) || 999) - pb - (B.upgradeCost(b) || 999); }).forEach(function (tw) {
    var c = B.upgradeCost(tw); if (c !== null && s.gold >= c + 20) B.upgrade(s, tw.id);
  });
}

function fight(opts) {
  var s = B.create(opts), guard = 0;
  while ((s.phase === 'prep' || s.phase === 'attack') && guard++ < 400000) {
    if (s.phase === 'prep') { playTurn(s); B.startAttack(s); }
    B.update(s, 1 / 30);
    s.events.length = 0;
  }
  return s;
}

function playRun(seed, log) {
  var run = G.Run.create(seed), steps = [];
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
      if (run.actClear) { var cs = G.Run.rollCards(run, 3, 'elite'); G.Run.addCard(run, cs[0]); G.Run.addRelic(run, G.Run.rollRelic(run, 'elite')); G.Run.nextAct(run); steps.push('| 第' + run.act + '層'); continue; }
      if (!run.over) {
        if (n.type === 'elite' || n.type === 'boss') G.Run.addRelic(run, G.Run.rollRelic(run, 'elite'));
        var cards = G.Run.rollCards(run, 3, n.type === 'elite' ? 'elite' : 'battle');
        G.Run.addCard(run, cards[0]);
      }
    } else if (n.type === 'rest') { G.Run.rest(run); steps.push(n.floor + 'R'); }
    else if (n.type === 'shop') {
      var st = G.Run.shopStock(run).cards.filter(function (x) { return x.price <= run.gold; })[0];
      if (st) { run.gold -= st.price; G.Run.addCard(run, st.id); }
      steps.push(n.floor + 'S');
    } else {
      var e = G.Run.rollEvent(run), res = G.Run.eventChoice(run, e.choices[0]);
      if (res.next === 'pickCard') G.Run.addCard(run, res.cards[0]);
      if (res.next === 'pickCopy') G.Run.addCard(run, run.deck[run.deck.length - 1]);
      if (res.next === 'pickRemove' && run.deck.length > 5) G.Run.removeCard(run, run.deck.indexOf('sling'));
      steps.push(n.floor + 'E');
    }
  }
  if (log) console.log((run.won ? '勝ち' : '負け') + ' レリック' + run.relics.length + ' ライフ' + run.life + ' お金' + run.gold + ' デッキ' + run.deck.length + '枚 | ' + steps.join(' '));
  return run;
}

var N = +process.argv[2] || 10, wins = 0, reached = [];
for (var i = 1; i <= N; i++) {
  var r = playRun(i * 7919, true);
  if (r.won) wins++;
  reached.push(r.act + '-' + (G.Run.node(r) ? G.Run.node(r).floor : 0));
}
console.log('勝率 ' + wins + '/' + N + '、到達した階 ' + reached.join(','));

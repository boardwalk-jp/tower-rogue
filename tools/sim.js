// 自動対戦：戦闘処理だけを Node で動かし、決まった作戦で最後まで遊んで結果を出す
// 使い方：node tools/sim.js
'use strict';
global.window = global;
require('../js/data.js');
require('../js/battle.js');
var G = global.G;

// 置ける場所のうち、道のマスがまわりに多い所から順に使う
function spots(s) {
  var list = [];
  for (var ty = 0; ty < G.MAP.rowsN; ty++) for (var tx = 0; tx < G.MAP.cols; tx++) {
    if (!G.Battle.canPlaceAt(s, tx, ty)) continue;
    var n = 0;
    for (var y = ty - 2; y <= ty + 2; y++) for (var x = tx - 2; x <= tx + 2; x++) if (G.Battle.tileAt(x, y) === '#') n++;
    list.push({ tx: tx, ty: ty, n: n });
  }
  return list.sort(function (a, b) { return b.n - a.n; });
}

function play(opts) {
  var s = G.Battle.create({ mode: opts.mode, seed: opts.seed });
  var guard = 0;
  while ((s.phase === 'prep' || s.phase === 'attack') && guard++ < 200000) {
    if (s.phase === 'prep') {
      if (opts.build) {
        for (var i = s.hand.length - 1; i >= 0; i--) {
          var sp = spots(s)[0];
          if (sp) G.Battle.playCard(s, i, sp.tx, sp.ty);
        }
        if (opts.upgrade) s.towers.forEach(function (tw) { G.Battle.upgrade(s, tw.id); });
      }
      G.Battle.startAttack(s);
    }
    G.Battle.update(s, 1 / 60);
    s.events.length = 0;
  }
  return { result: s.phase, turn: s.turn, life: s.life, gold: s.gold, towers: s.towers.length, killed: s.stats.killed, leaked: s.stats.leaked };
}

['pedestal', 'free'].forEach(function (mode) {
  console.log('== 置き方: ' + mode + ' ==');
  console.log('何も建てない     ', JSON.stringify(play({ mode: mode, seed: 1, build: false })));
  for (var seed = 1; seed <= 3; seed++) {
    console.log('建てるだけ   s' + seed, JSON.stringify(play({ mode: mode, seed: seed, build: true })));
    console.log('建てて強化   s' + seed, JSON.stringify(play({ mode: mode, seed: seed, build: true, upgrade: true })));
  }
});

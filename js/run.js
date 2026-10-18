// ラン（1回の挑戦）の処理：ワールドマップ、デッキ、ライフ・お金、報酬、商人、イベント、休憩
// 画面（DOM）には触らない
'use strict';
var G = window.G = window.G || {};

(function () {
  var B = G.Battle;
  var LANES = 5;

  function pick(arr, r) { return arr[Math.floor(r() * arr.length)]; }

  // ---- ワールドマップ（スレイザスパイア式の分かれ道） ----
  // 下（0階）から上へ進む。最後の階（floors-1）はすべて休憩、その上がボス
  function makeWorld(r) {
    var F = G.RULES.floors, nodes = {}, edges = {};
    function id(f, c) { return f + ':' + c; }
    function add(f, c) { if (!nodes[id(f, c)]) nodes[id(f, c)] = { id: id(f, c), floor: f, lane: c, next: [] }; return nodes[id(f, c)]; }
    // 4本の道を下から上へ引く（1階ごとに左・まっすぐ・右のどれかへ）
    var starts = B.shuffle([0, 1, 2, 3, 4], r).slice(0, 3);
    starts.push(starts[0]);
    starts.forEach(function (c0) {
      var c = c0;
      for (var f = 0; f < F; f++) {
        var a = add(f, c);
        if (f === F - 1) break;
        var nc = Math.max(0, Math.min(LANES - 1, c + Math.floor(r() * 3) - 1));
        // 隣の道と交差しないよう、同じ階の逆向きの線があれば まっすぐにする
        if (nc !== c && edges[id(f, nc) + '>' + id(f + 1, c)]) nc = c;
        edges[id(f, c) + '>' + id(f + 1, nc)] = true;
        if (a.next.indexOf(id(f + 1, nc)) < 0) a.next.push(id(f + 1, nc));
        c = nc;
      }
    });
    var boss = { id: 'boss', floor: F, lane: 2, next: [], type: 'boss' };
    nodes.boss = boss;
    Object.keys(nodes).forEach(function (k) { var n = nodes[k]; if (n.floor === F - 1) n.next = ['boss']; });

    // マスの種類を決める
    Object.keys(nodes).forEach(function (k) {
      var n = nodes[k]; if (n.type) return;
      var f = n.floor;
      if (f === 0) { n.type = 'battle'; return; }
      if (f === F - 1) { n.type = 'rest'; return; }
      var x = r(), t;
      if (f >= 3 && x < 0.14) t = 'elite';
      else if (x < 0.36) t = 'event';
      else if (f >= 2 && x < 0.47) t = 'shop';
      else if (f >= 4 && x < 0.57) t = 'rest';
      else t = 'battle';
      n.type = t;
    });
    // 同じ道で 休憩・商人・エリートが続かないようにする（続いたら戦闘に）
    Object.keys(nodes).forEach(function (k) {
      var n = nodes[k];
      n.next.forEach(function (nk) {
        var m = nodes[nk];
        if (m.type !== 'boss' && m.floor !== F - 1 && m.type === n.type && (m.type === 'rest' || m.type === 'shop' || m.type === 'elite')) m.type = 'battle';
      });
    });
    return { nodes: nodes, floors: F };
  }

  function create(seed) {
    var r = B.rng(seed || (Date.now() & 0xffffff));
    var run = {
      rand: r, world: makeWorld(r), at: null, visited: [],
      deck: G.START_DECK.slice(), life: G.RULES.maxLife, maxLife: G.RULES.maxLife, gold: G.RULES.startGold,
      stats: { battles: 0, elites: 0, cardsTaken: 0 }, over: false, won: false
    };
    return run;
  }

  // 今進めるマス
  function reachable(run) {
    var W = run.world;
    if (!run.at) return Object.keys(W.nodes).filter(function (k) { return W.nodes[k].floor === 0; });
    return W.nodes[run.at].next.slice();
  }
  function enter(run, nodeId) {
    if (reachable(run).indexOf(nodeId) < 0) return false;
    run.at = nodeId; run.visited.push(nodeId);
    return true;
  }
  function node(run) { return run.at ? run.world.nodes[run.at] : null; }

  // ---- 戦闘の準備（マップと攻撃の予定） ----
  function battleOpts(run) {
    var n = node(run), kind = n.type, f = n.floor, r = run.rand;
    var mapId = kind === 'elite' || kind === 'boss' ? 'valley' : pick(['field', 'snake'], r);
    var map = G.MAPS[mapId], gates = Object.keys(map.paths);
    var set = kind === 'boss' ? G.WAVE_SETS.boss : kind === 'elite' ? G.WAVE_SETS.elite : f < 4 ? G.WAVE_SETS.early : G.WAVE_SETS.mid;
    var tpl = pick(set, r), scale = 1 + f * G.RULES.floorScale;
    var waves = tpl.map(function (wave) {
      return wave.map(function (g) {
        var E = G.ENEMIES[g[0]];
        var gate = E.boss && map.paths.C ? 'C' : pick(gates, r);
        return { gate: gate, type: g[0], n: g[1], gap: E.gap, delay: g[2] };
      });
    });
    return { map: mapId, waves: waves, hpMult: scale, deck: run.deck.slice(), life: run.life, maxLife: run.maxLife,
             gold: run.gold, seed: Math.floor(r() * 1e9), kind: kind };
  }
  // 戦闘の結果をランに戻す
  function finishBattle(run, s) {
    run.life = s.life; run.gold = s.gold;
    if (s.phase === 'lose') { run.over = true; return; }
    run.stats.battles++;
    var n = node(run);
    if (n.type === 'boss') { run.over = true; run.won = true; return; }
    if (n.type === 'elite') run.stats.elites++;
    run.gold += G.RULES.battleGold[n.type] || 0;
  }

  // ---- カードを選ぶ（報酬・商人・イベント） ----
  var WEIGHT = { battle: { common: 60, uncommon: 32, rare: 8 }, elite: { common: 30, uncommon: 45, rare: 25 },
                 shop: { common: 50, uncommon: 35, rare: 15 }, rare: { common: 0, uncommon: 40, rare: 60 } };
  function cardPool() { return Object.keys(G.CARDS).filter(function (id) { return G.CARDS[id].rarity !== 'starter'; }); }
  function rollCards(run, n, table) {
    var w = WEIGHT[table] || WEIGHT.battle, out = [], pool = cardPool(), guard = 0;
    while (out.length < n && guard++ < 200) {
      var x = run.rand() * (w.common + w.uncommon + w.rare);
      var rar = x < w.common ? 'common' : x < w.common + w.uncommon ? 'uncommon' : 'rare';
      var cands = pool.filter(function (id) { return G.CARDS[id].rarity === rar && out.indexOf(id) < 0; });
      if (cands.length) out.push(pick(cands, run.rand));
    }
    return out;
  }
  function addCard(run, id) { run.deck.push(id); run.stats.cardsTaken++; }
  function removeCard(run, index) { run.deck.splice(index, 1); }

  // ---- 商人 ----
  function shopStock(run) {
    return rollCards(run, 3, 'shop').map(function (id) {
      var base = G.RULES.shop.price[G.CARDS[id].rarity];
      return { id: id, price: Math.round(base * (0.9 + run.rand() * 0.2)), sold: false };
    });
  }

  // ---- イベント ----
  function rollEvent(run) { return pick(G.EVENTS, run.rand); }
  // 選択肢を実行する。返り値：{ msg, next }（next：'pickRemove'＝削除するカードを選ぶ／'pickCard'＝カードを選ぶ）
  function eventChoice(run, choice) {
    if (choice.gold && run.gold + choice.gold < 0) return { msg: 'お金が足りません', fail: true };
    if (choice.gold && choice.effect !== 'gamble') run.gold += choice.gold;
    if (choice.life) run.life = Math.max(1, run.life + choice.life);
    switch (choice.effect) {
      case 'heal': run.life = Math.min(run.maxLife, run.life + choice.amount); return { msg: 'ライフが' + choice.amount + '回復した。' };
      case 'goldLife': return { msg: 'お金を' + choice.gold + '手に入れた。' };
      case 'gamble':
        run.gold += choice.gold;
        if (run.rand() < 0.5) { run.gold += choice.win; return { msg: '当たり！ ' + choice.win + 'G を受け取った。' }; }
        return { msg: 'はずれ。20G を失った。' };
      case 'randomCard': var id = pick(cardPool(), run.rand); addCard(run, id); return { msg: '「' + G.CARDS[id].name + '」を手に入れた。' };
      case 'removeCard': return { msg: '手放すカードを選んでください。', next: 'pickRemove' };
      case 'rareCard': return { msg: '祭壇が光った。', next: 'pickCard', cards: rollCards(run, 3, 'rare') };
      default: return { msg: 'その場を後にした。' };
    }
  }

  // ---- セーブ用：ランを文字にできる形にする／元に戻す ----
  function toSave(run) {
    return { world: run.world, at: run.at, visited: run.visited, deck: run.deck, life: run.life, maxLife: run.maxLife,
             gold: run.gold, stats: run.stats, rng: run.rand.state() };
  }
  function fromSave(d) {
    return { rand: B.rng(d.rng), world: d.world, at: d.at, visited: d.visited, deck: d.deck, life: d.life, maxLife: d.maxLife,
             gold: d.gold, stats: d.stats, over: false, won: false };
  }

  function rest(run) { var before = run.life; run.life = Math.min(run.maxLife, run.life + G.RULES.restHeal); return run.life - before; }

  G.Run = {
    create: create, reachable: reachable, enter: enter, node: node, battleOpts: battleOpts, finishBattle: finishBattle,
    rollCards: rollCards, addCard: addCard, removeCard: removeCard, shopStock: shopStock,
    rollEvent: rollEvent, eventChoice: eventChoice, rest: rest, toSave: toSave, fromSave: fromSave
  };
})();

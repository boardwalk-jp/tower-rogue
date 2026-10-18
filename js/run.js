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
    enforceRoutes(nodes, F, r);
    return { nodes: nodes, floors: F };
  }

  // 下から上までの道（マスのidの並び）をすべて挙げる
  function allRoutes(nodes) {
    var out = [];
    function walk(id, acc) {
      var n = nodes[id];
      if (n.type === 'boss') { out.push(acc); return; }
      n.next.forEach(function (k) { walk(k, acc.concat([id])); });
    }
    Object.keys(nodes).forEach(function (k) { if (nodes[k].floor === 0) walk(k, []); });
    return out;
  }
  // どの道を通っても：休憩は G.RULES.restPerRoute の範囲、商人は shopPerRoute 以下になるように直す
  function enforceRoutes(nodes, F, r) {
    var lo = G.RULES.restPerRoute[0], hi = G.RULES.restPerRoute[1], shopMax = G.RULES.shopPerRoute;
    for (var guard = 0; guard < 200; guard++) {
      var routes = allRoutes(nodes), fixed = false;
      for (var i = 0; i < routes.length && !fixed; i++) {
        var route = routes[i].map(function (k) { return nodes[k]; });
        var rests = route.filter(function (n) { return n.type === 'rest'; });
        var shops = route.filter(function (n) { return n.type === 'shop'; });
        if (rests.length < lo) {
          // 5〜9階の 戦闘・イベントのうち、前後が休憩でないマスを休憩に変える
          var cands = route.filter(function (n, j) {
            return n.floor >= 4 && n.floor <= F - 2 && (n.type === 'battle' || n.type === 'event') &&
              (!route[j - 1] || route[j - 1].type !== 'rest') && (!route[j + 1] || route[j + 1].type !== 'rest');
          });
          if (!cands.length) cands = route.filter(function (n) { return n.floor >= 3 && n.floor <= F - 2 && n.type !== 'rest'; });
          if (cands.length) { cands[Math.floor(r() * cands.length)].type = 'rest'; fixed = true; }
        } else if (rests.length > hi) {
          var ex = rests.filter(function (n) { return n.floor < F - 1; });
          ex[Math.floor(r() * ex.length)].type = 'battle'; fixed = true;
        } else if (shops.length > shopMax) {
          shops[Math.floor(r() * shops.length)].type = 'event'; fixed = true;
        }
      }
      if (!fixed) return true;
    }
    return false;
  }

  function create(seed) {
    var r = B.rng(seed || (Date.now() & 0xffffff));
    var run = {
      rand: r, world: makeWorld(r), at: null, visited: [],
      act: 1, deck: G.START_DECK.slice(), life: G.RULES.maxLife, maxLife: G.RULES.maxLife, gold: G.RULES.startGold,
      relics: [], stats: { battles: 0, elites: 0, cardsTaken: 0 }, over: false, won: false
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
    // 層ごとの地域：マップと敵の組み合わせ（G.ACTS・G.WAVE_SETS.a1〜a3）。エリートとボスは大きいマップ
    var A = G.ACTS[run.act - 1], W = G.WAVE_SETS['a' + run.act];
    var mapId = kind === 'elite' || kind === 'boss' ? A.big : pick(A.maps, r);
    var set = kind === 'elite' || kind === 'boss' ? W[kind] : f < 4 ? W.early : W.mid;
    var map = G.MAPS[mapId], gates = Object.keys(map.paths);
    var tpl = pick(set, r), scale = (1 + f * G.RULES.floorScale) * A.hp;
    var waves = tpl.map(function (wave) {
      return wave.map(function (g) {
        var E = G.ENEMIES[g[0]];
        var gate = E.boss && map.paths.C ? 'C' : pick(gates, r);
        return { gate: gate, type: g[0], n: g[1], gap: E.gap, delay: g[2] };
      });
    });
    return { map: mapId, theme: A.theme, waves: waves, hpMult: scale, deck: run.deck.slice(), life: run.life, maxLife: run.maxLife,
             gold: run.gold, seed: Math.floor(r() * 1e9), kind: kind, relics: run.relics.slice() };
  }
  // 戦闘の結果をランに戻す
  function finishBattle(run, s) {
    run.life = s.life; run.gold = s.gold;
    if (s.phase === 'lose') { run.over = true; return; }
    run.stats.battles++;
    var n = node(run);
    if (n.type === 'boss') {
      if (run.act >= G.RULES.acts) { run.over = true; run.won = true; return; }
      run.actClear = true; return;      // 次の層へ（screens.js が nextAct を呼ぶ）
    }
    if (n.type === 'elite') run.stats.elites++;
    if (run.relics.indexOf('spring') >= 0) run.life = Math.min(run.maxLife, run.life + 3);
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
  // まだ持っていないレリックを1つ（table：elite/shop/rare）
  var RELIC_W = { elite: { common: 50, uncommon: 35, rare: 15 }, shop: { common: 40, uncommon: 40, rare: 20 }, event: { common: 45, uncommon: 40, rare: 15 } };
  function rollRelic(run, table) {
    var w = RELIC_W[table] || RELIC_W.event, all = Object.keys(G.RELICS).filter(function (k) { return run.relics.indexOf(k) < 0; });
    if (!all.length) return null;
    for (var g = 0; g < 50; g++) {
      var x = run.rand() * (w.common + w.uncommon + w.rare);
      var rar = x < w.common ? 'common' : x < w.common + w.uncommon ? 'uncommon' : 'rare';
      var c = all.filter(function (k) { return G.RELICS[k].rarity === rar; });
      if (c.length) return pick(c, run.rand);
    }
    return pick(all, run.rand);
  }
  function addRelic(run, id) { if (id && run.relics.indexOf(id) < 0) run.relics.push(id); }
  function price(run, base) { return Math.round(base * (run.relics.indexOf('seal') >= 0 ? 0.75 : 1)); }
  function addCard(run, id) { run.deck.push(id); run.stats.cardsTaken++; }
  function removeCard(run, index) { run.deck.splice(index, 1); }

  // ---- 商人 ----
  function shopStock(run) {
    var items = rollCards(run, 3, 'shop').map(function (id) {
      var base = G.RULES.shop.price[G.CARDS[id].rarity];
      return { id: id, price: price(run, base * (0.9 + run.rand() * 0.2)), sold: false };
    });
    var rel = rollRelic(run, 'shop');
    return { cards: items, relic: rel ? { id: rel, price: price(run, G.RULES.shop.relicPrice[G.RELICS[rel].rarity]), sold: false } : null };
  }

  // ---- イベント ----
  function rollEvent(run) { return pick(G.EVENTS.filter(function (e) { return !e.acts || e.acts.indexOf(run.act) >= 0; }), run.rand); }
  // 次の層へ：新しいワールドマップ、ライフ回復
  function nextAct(run) {
    run.act++; run.actClear = false;
    run.world = makeWorld(run.rand); run.at = null; run.visited = [];
    var before = run.life; run.life = Math.min(run.maxLife, run.life + G.RULES.actHeal);
    return run.life - before;
  }
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
      case 'maxLife': run.maxLife += choice.amount; run.life = Math.min(run.maxLife, run.life + choice.amount); return { msg: '最大ライフが' + choice.amount + '増えた。' };
      case 'risk':
        if (run.rand() < 0.5) { run.gold += choice.win; return { msg: 'うまく取れた！ +' + choice.win + 'G。' }; }
        run.life = Math.max(1, run.life - choice.lose); return { msg: 'やけどをした。ライフ-' + choice.lose + '。' };
      case 'removeCard': return { msg: '手放すカードを選んでください。', next: 'pickRemove' };
      case 'copyCard': return { msg: '複製するカードを選んでください。', next: 'pickCopy' };
      case 'relic': var rl = rollRelic(run, 'event'); addRelic(run, rl); return { msg: rl ? 'レリック「' + G.RELICS[rl].name + '」を手に入れた。' + G.RELICS[rl].text : 'お礼を言われた。' };
      case 'box':
        if (run.rand() < 0.5) { var rb = rollRelic(run, 'event'); addRelic(run, rb); return { msg: rb ? 'レリック「' + G.RELICS[rb].name + '」が入っていた！ ' + G.RELICS[rb].text : '空っぽだった。' }; }
        run.life = Math.max(1, run.life - 6); return { msg: '罠だった！ ライフ-6。' };
      case 'rareCard': return { msg: '祭壇が光った。', next: 'pickCard', cards: rollCards(run, 3, 'rare') };
      default: return { msg: 'その場を後にした。' };
    }
  }

  // ---- セーブ用：ランを文字にできる形にする／元に戻す ----
  function toSave(run) {
    return { world: run.world, at: run.at, visited: run.visited, deck: run.deck, life: run.life, maxLife: run.maxLife,
             gold: run.gold, stats: run.stats, rng: run.rand.state(), relics: run.relics, act: run.act };
  }
  function fromSave(d) {
    return { rand: B.rng(d.rng), world: d.world, at: d.at, visited: d.visited, deck: d.deck, life: d.life, maxLife: d.maxLife,
             gold: d.gold, stats: d.stats, relics: d.relics || [], act: d.act || 1, over: false, won: false };
  }

  function rest(run) { var before = run.life; run.life = Math.min(run.maxLife, run.life + G.RULES.restHeal); return run.life - before; }

  G.Run = {
    create: create, reachable: reachable, enter: enter, node: node, battleOpts: battleOpts, finishBattle: finishBattle,
    rollCards: rollCards, addCard: addCard, removeCard: removeCard, shopStock: shopStock,
    rollEvent: rollEvent, eventChoice: eventChoice, nextAct: nextAct, allRoutes: allRoutes, rest: rest, rollRelic: rollRelic, addRelic: addRelic, price: price, toSave: toSave, fromSave: fromSave
  };
})();

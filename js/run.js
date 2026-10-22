// ラン（1回の挑戦）の処理：ワールドマップ、デッキ、ライフ・お金、報酬、商人、イベント、休憩
// 画面（DOM）には触らない
'use strict';
var G = window.G = window.G || {};

(function () {
  var B = G.Battle;
  var LANES = 5;

  function pick(arr, r) { return arr[Math.floor(r() * arr.length)]; }
  function count(arr, id) { var n = 0; for (var i = 0; i < arr.length; i++) if (arr[i] === id) n++; return n; }

  // ============================================================
  // 経験値と解放（このブラウザに保存。ランをまたいで残る）
  // ============================================================
  var META_KEY = 'towerRogue.meta.v1';
  var hasLS = typeof localStorage !== 'undefined';
  function metaLoad() { try { return (hasLS && JSON.parse(localStorage.getItem(META_KEY) || 'null')) || { xp: 0, runs: 0 }; } catch (e) { return { xp: 0, runs: 0 }; } }
  function metaSave(m) { try { if (hasLS) localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) {} }
  // 解放済みか（解放の一覧にないものは最初から使える。自動対戦（保存場所なし）ではすべて使える）
  function unlocked(kind, id) {
    var u = G.UNLOCKS.filter(function (x) { return x.kind === kind && x.id === (kind === 'card' ? String(id).replace('+', '') : id); })[0];
    return !u || !hasLS || metaLoad().xp >= u.xp;
  }
  // ランの終わりに経験値を計算して足す。返り値：内訳・前後の経験値・新しく解放されたもの
  function gainXp(run) {
    var X = G.XP_RULES, n = node(run), bosses = (run.won ? G.RULES.acts : run.act - 1) + (run.boss2Fight ? 1 : 0);   // A10 の1体目に勝っていれば+1
    var elites = run.stats.elites, normal = Math.max(0, run.stats.battles - elites - bosses);
    var floors = (run.act - 1) * (G.RULES.floors + 1) + (n ? (n.type === 'boss' ? G.RULES.floors + 1 : n.floor + 1) : 0);
    var rows = [['通常戦闘の勝利', normal, X.battle], ['エリートの勝利', elites, X.elite], ['ボスの撃破', bosses, X.boss], ['進んだ階', floors, X.floor]];
    if (run.won) rows.push(['3層クリア', 1, X.clear]);
    if (run.asc) rows.push(['アセンション' + run.asc + 'のおまけ（+' + run.asc * 10 + '%）', 1, 0]);
    var add = rows.reduce(function (a, r) { return a + r[1] * r[2]; }, 0);
    add = Math.round(add * (1 + 0.1 * (run.asc || 0)));
    if (run.asc) rows[rows.length - 1][2] = add - Math.round(add / (1 + 0.1 * run.asc));
    var m = metaLoad(), before = m.xp, ascBefore = m.ascMax || 0;
    m.xp += add; m.runs = (m.runs || 0) + 1; if (run.won) m.wins = (m.wins || 0) + 1;
    // クリアすると次のアセンションが選べるようになる
    if (run.won && (run.asc || 0) >= ascBefore && ascBefore < G.ASC_MAX) m.ascMax = (run.asc || 0) + 1;
    metaSave(m);
    var newly = G.UNLOCKS.filter(function (u) { return u.xp > before && u.xp <= m.xp; });
    return { rows: rows, add: add, before: before, after: m.xp, newly: newly, ascUnlocked: (m.ascMax || 0) > ascBefore ? m.ascMax : 0 };
  }
  function nextUnlock(xp) { return G.UNLOCKS.filter(function (u) { return u.xp > xp; })[0] || null; }

  // ---- ワールドマップ（スレイザスパイア式の分かれ道） ----
  // 下（0階）から上へ進む。最後の階（floors-1）はすべて休憩、その上がボス
  // ボスの直前の段（すべてたき火）は2〜3マスにする（2026-10-22 オーナー指定）。そうならない形が出たら作り直す
  function makeWorld(r) {
    var w, tries = 0;
    do { w = makeWorld0(r); tries++; }
    while (tries < 60 && (function () { var n = Object.keys(w.nodes).filter(function (k) { return w.nodes[k].floor === w.floors - 1; }).length; return n < 2 || n > 3; })());
    return w;
  }
  function makeWorld0(r) {
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
  // 前後のマス（つながっている上下の階）に休憩がないか
  function restNear(nodes, n) {
    if (n.next.some(function (k) { return nodes[k].type === 'rest'; })) return true;
    return Object.keys(nodes).some(function (k) { return nodes[k].type === 'rest' && nodes[k].next.indexOf(n.id) >= 0; });
  }
  // 休憩が2つ続くか（どの道でも）。続く所の下側のマス（最後の階の休憩は動かさない）を返す
  function restPair(nodes) {
    var ks = Object.keys(nodes);
    for (var i = 0; i < ks.length; i++) {
      var n = nodes[ks[i]];
      if (n.type !== 'rest') continue;
      for (var j = 0; j < n.next.length; j++) if (nodes[n.next[j]].type === 'rest') return n;
    }
    return null;
  }
  function enforceRoutes(nodes, F, r) {
    var lo = G.RULES.restPerRoute[0], hi = G.RULES.restPerRoute[1], shopMax = G.RULES.shopPerRoute;
    for (var guard = 0; guard < 200; guard++) {
      var routes = allRoutes(nodes), fixed = false;
      // 休憩は絶対に2つ続けない（続いていたら下側を戦闘に）
      var pair = restPair(nodes);
      if (pair) { pair.type = 'battle'; continue; }
      for (var i = 0; i < routes.length && !fixed; i++) {
        var route = routes[i].map(function (k) { return nodes[k]; });
        var rests = route.filter(function (n) { return n.type === 'rest'; });
        var shops = route.filter(function (n) { return n.type === 'shop'; });
        if (rests.length < lo) {
          // 5〜9階の 戦闘・イベントのうち、前後が休憩でないマスを休憩に変える
          // 前後（ほかの道の分も含む）に休憩がないマスだけを休憩に変える
          var cands = route.filter(function (n) {
            return n.floor >= 4 && n.floor <= F - 3 && (n.type === 'battle' || n.type === 'event') && !restNear(nodes, n);
          });
          if (!cands.length) cands = route.filter(function (n) { return n.floor >= 2 && n.floor <= F - 3 && n.type !== 'rest' && n.type !== 'elite' && !restNear(nodes, n); });
          if (!cands.length) cands = route.filter(function (n) { return n.floor >= 1 && n.floor <= F - 3 && n.type !== 'rest' && !restNear(nodes, n); });
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

  // cmdId：指揮官（G.COMMANDERS のid）。初期デッキと最大ライフが変わる
  // asc：アセンション（難易度、0＝ノーマル）
  function create(seed, cmdId, asc) {
    var r = B.rng(seed || (Date.now() & 0xffffff));
    var C = G.COMMANDERS[cmdId] || G.COMMANDERS.captain, AM = G.ascMods(asc), life = C.life - AM.life;
    var run = {
      rand: r, world: makeWorld(r), at: null, visited: [], cmd: cmdId || 'captain', asc: asc || 0,
      act: 1, deck: C.deck.slice(), life: life, maxLife: life, gold: G.RULES.startGold,
      relics: C.relic ? [C.relic] : [], stats: { battles: 0, elites: 0, cardsTaken: 0 }, over: false, won: false
    };
    run.boss = pickBoss(run);
    return run;
  }
  // ひな形の強さの目安：敵の体力×数（よろいは多め、空の敵は1.4倍、復活・分かれる敵は多め）
  function tplScore(tpl) {
    var t = 0;
    tpl.forEach(function (w) { w.forEach(function (g) {
      var E = G.ENEMIES[g[0]], v = E.hp * (1 + E.armor) * (E.fly ? 1.4 : 1) * (E.revive ? 1.5 : 1);
      if (E.split) v += G.ENEMIES[E.split.type].hp * E.split.n;
      t += v * g[1];
    }); });
    return t;
  }
  // その層の通常戦闘（early と mid）のひな形を弱い順に並べ、最初の easyPool 個
  function easyTemplates(act) {
    var W = G.WAVE_SETS['a' + act];
    return W.early.concat(W.mid).slice().sort(function (a, b) { return tplScore(a) - tplScore(b); }).slice(0, G.RULES.easyPool);
  }
  // 層のボスをくじで決める（層に入った時に1回）
  function pickBoss(run) { return Math.floor(run.rand() * G.WAVE_SETS['a' + run.act].boss.length); }
  // ボスの名前（そのひな形の中のボスの敵）
  // ボスの敵の種類（マップのボスの絵に使う）
  function bossType(run, act, idx) {
    var W = G.WAVE_SETS['a' + (act || run.act)], tpl = W.boss[idx !== undefined ? idx : (run.boss2Fight ? run.boss2 : (run.boss || 0))], id = '';   // A10 の2戦目は2体目のボス
    tpl.forEach(function (w) { w.forEach(function (g) { if (G.ENEMIES[g[0]].boss) id = g[0]; }); });
    return id;
  }
  function bossName(run, act, idx) { var id = bossType(run, act, idx); return id ? G.ENEMIES[id].name : ''; }

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
    // マップ：前の戦闘と同じ形にならないように選ぶ
    var pool = (kind === 'elite' || kind === 'boss' ? A.big : A.maps).filter(function (m) { return m !== run.lastMap; });
    var mapId = pick(pool.length ? pool : A.maps, r); run.lastMap = mapId;
    var set = kind === 'elite' || kind === 'boss' ? W[kind] : f < 4 ? W.early : W.mid;
    // 各層の最初の数回の通常戦闘は、その層の通常戦闘のひな形のうち弱い方から（同じひな形は続けない）
    if (kind === 'battle' && (run.actBattles || 0) < G.RULES.easyBattles) set = easyTemplates(run.act).filter(function (t) { return t !== run.lastTpl; });
    var map = G.MAPS[mapId], gates = Object.keys(map.paths), PL = B.pathLengths(map);
    var longest = gates.slice().sort(function (a, b) { return PL[b] - PL[a]; })[0];
    var tpl = kind === 'boss' ? set[run.boss2Fight ? run.boss2 : (run.boss || 0)] : pick(set, r), scale = (1 + f * G.RULES.floorScale) * A.hp;
    if (kind === 'battle') run.lastTpl = tpl;
    var waves = tpl.map(function (wave) {
      return wave.map(function (g) {
        var E = G.ENEMIES[g[0]];
        // ボスは一番長い道から来る（倒すまでの時間をかせげるように）
        var gate = E.boss ? longest : pick(gates, r);
        return { gate: gate, type: g[0], n: E.boss ? g[1] : countFor(map, PL, gate, g[1]), gap: E.gap, delay: g[2] };
      });
    });
    var AM = G.ascMods(run.asc);   // アセンションで敵を強く
    return { map: mapId, theme: A.theme, waves: waves, hpMult: scale * AM.hp * (kind === 'elite' ? AM.elite : 1), deck: run.deck.slice(), life: run.life, maxLife: run.maxLife,
             bossMult: A.hp * G.RULES.bossHp * AM.hp * AM.boss, enemySpeed: AM.speed, bossHitAdd: AM.bossHit, leakS: AM.leakS, leakM: AM.leakM, ascGold: AM.gold, gold: run.gold, seed: Math.floor(r() * 1e9), kind: kind, relics: run.relics.slice(), cmd: run.cmd,
             phoenix: Math.max(0, count(run.relics, 'phoenix') - (run.phoenixUsed || 0)) };
  }
  // 敵の数：道が長いマップほど多く（道の長さに比例）。マップに enemyMult があればその倍率を使う（マップごとの個別の調整）
  function enemyMult(map, PL, gate) { return map.enemyMult != null ? map.enemyMult : PL[gate] / G.RULES.mapLenRef; }
  function countFor(map, PL, gate, n) { return Math.max(1, Math.round(n * enemyMult(map, PL, gate))); }
  // 戦闘の結果をランに戻す
  function finishBattle(run, s) {
    run.life = s.life; run.gold = s.gold;
    if (s.phase === 'lose') { run.over = true; return; }
    run.stats.battles++;
    var n = node(run);
    if (n.type === 'boss') {
      if (run.act >= G.RULES.acts) {
        // A10：3層ボスに勝ったら、続けて別の3層ボスともう1戦（screens.js が secondBoss を見て、同じマスでもう一度戦闘を始める。タワーは引き継がない）
        if (G.ascMods(run.asc).twoBoss && !run.boss2Fight) {
          var L = G.WAVE_SETS['a' + run.act].boss.length, k = Math.floor(run.rand() * (L - 1));
          run.boss2 = k >= (run.boss || 0) ? k + 1 : k;   // 1体目とちがうボス
          run.boss2Fight = true; run.secondBoss = true;
          run.phoenixUsed = (run.phoenixUsed || 0) + (s.phoenixUsed || 0);
          return;
        }
        run.over = true; run.won = true; return;
      }
      run.actClear = true; return;      // 次の層へ（screens.js が nextAct を呼ぶ）
    }
    if (n.type === 'elite') run.stats.elites++;
    if (n.type === 'battle') run.actBattles = (run.actBattles || 0) + 1;
    run.phoenixUsed = (run.phoenixUsed || 0) + (s.phoenixUsed || 0);
    if (count(run.relics, 'spring')) run.life = Math.min(run.maxLife, run.life + 3 * count(run.relics, 'spring'));
    run.gold += Math.round((G.RULES.battleGold[n.type] || 0) * G.ascMods(run.asc).gold);
  }

  // ---- カードを選ぶ（報酬・商人・イベント） ----
  var WEIGHT = { battle: { common: 60, uncommon: 32, rare: 8 }, elite: { common: 30, uncommon: 45, rare: 25 },
                 shop: { common: 50, uncommon: 35, rare: 15 }, rare: { common: 0, uncommon: 40, rare: 60 } };
  function cardPool() { return Object.keys(G.CARDS).filter(function (id) { return G.CARDS[id].rarity !== 'starter' && !G.CARDS[id].plus && unlocked('card', id); }); }
  function rollCards(run, n, table) {
    // ボスの報酬：レアのカードだけから選ぶ。足りない時はアンコモンで埋める
    if (table === 'boss') {
      var bp = cardPool(), out0 = [];
      ['rare', 'uncommon'].forEach(function (rar) {
        var c = bp.filter(function (id) { return G.CARDS[id].rarity === rar; });
        while (out0.length < n && c.length) out0.push(c.splice(Math.floor(run.rand() * c.length), 1)[0]);
      });
      return out0;
    }
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
  // 同じレリックは1回の挑戦で1個まで（持っている物はくじに入れない。addRelic でも2個目は足さない）。下の 0.35倍の重みは、昔の「重ねがけ」の名残で、今は使われない（持っている物は all に入らないため）
  function rollRelic(run, table) {
    // 1回の挑戦で同じレリックは1個まで（持っている物は出ない）
    var w = RELIC_W[table] || RELIC_W.event, all = Object.keys(G.RELICS).filter(function (k) { return G.RELICS[k].rarity !== 'starter' && unlocked('relic', k) && run.relics.indexOf(k) < 0; });
    if (!all.length) return null;
    var x = run.rand() * (w.common + w.uncommon + w.rare);
    var rar = x < w.common ? 'common' : x < w.common + w.uncommon ? 'uncommon' : 'rare';
    var c = all.filter(function (k) { return G.RELICS[k].rarity === rar; }); if (!c.length) c = all;
    var ws = c.map(function (k) { return Math.pow(0.35, count(run.relics, k)); }), tot = ws.reduce(function (a, b) { return a + b; }, 0), y = run.rand() * tot;
    for (var i = 0; i < c.length; i++) { y -= ws[i]; if (y <= 0) return c[i]; }
    return c[c.length - 1];
  }
  function addRelic(run, id) { if (id && run.relics.indexOf(id) < 0) run.relics.push(id); }
  function price(run, base) { return Math.round(base * Math.pow(0.75, Math.min(2, count(run.relics, 'seal')))); }
  function addCard(run, id) { run.deck.push(id); run.stats.cardsTaken++; }
  function removeCard(run, index) { run.deck.splice(index, 1); }
  // カードを鍛える（＋版にする）。もう＋なら何もしない
  function canUpgradeCard(id) { return !G.CARDS[id].plus && !!G.CARDS[id + '+']; }
  function upgradeCard(run, index) { var id = run.deck[index]; if (!canUpgradeCard(id)) return false; run.deck[index] = id + '+'; return true; }

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
    run.act++; run.actClear = false; run.shop = null;
    run.world = makeWorld(run.rand); run.at = null; run.visited = []; run.boss = pickBoss(run); run.actBattles = 0;
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
      case 'upgradeCard': return { msg: '鍛えるカードを選んでください。', next: 'pickUpgrade' };
      case 'copyCard': return { msg: '複製するカードを選んでください。', next: 'pickCopy' };
      case 'relic': var rl = rollRelic(run, 'event'); addRelic(run, rl); return { msg: rl ? 'レリック「' + G.RELICS[rl].name + '」を手に入れた。' + G.RELICS[rl].text : 'お礼を言われた。', relic: rl };
      case 'box':
        if (run.rand() < 0.5) { var rb = rollRelic(run, 'event'); addRelic(run, rb); return { msg: rb ? 'レリック「' + G.RELICS[rb].name + '」が入っていた！ ' + G.RELICS[rb].text : '空っぽだった。', relic: rb }; }
        run.life = Math.max(1, run.life - 6); return { msg: '罠だった！ ライフ-6。' };
      case 'rareCard': return { msg: '祭壇が光った。', next: 'pickCard', cards: rollCards(run, 3, 'rare') };
      default: return { msg: 'その場を後にした。' };
    }
  }

  // ---- セーブ用：ランを文字にできる形にする／元に戻す ----
  function toSave(run) {
    return { world: run.world, at: run.at, visited: run.visited, deck: run.deck, life: run.life, maxLife: run.maxLife,
             gold: run.gold, stats: run.stats, rng: run.rand.state(), relics: run.relics, act: run.act, cmd: run.cmd, asc: run.asc || 0, boss: run.boss, boss2: run.boss2 || 0, boss2Fight: !!run.boss2Fight, phoenixUsed: run.phoenixUsed || 0, actBattles: run.actBattles || 0, lastMap: run.lastMap || null, shop: run.shop || null };
  }
  function fromSave(d) {
    // 前の版のセーブ：指揮官のレリックがなければ足す
    var C = G.COMMANDERS[d.cmd || 'captain'], rel = (d.relics || []).slice();
    if (C && C.relic && rel.indexOf(C.relic) < 0) rel.unshift(C.relic);
    d.relics = rel;
    return { rand: B.rng(d.rng), world: d.world, at: d.at, visited: d.visited, deck: d.deck, life: d.life, maxLife: d.maxLife,
             gold: d.gold, stats: d.stats, relics: d.relics || [], act: d.act || 1, cmd: d.cmd || 'captain', asc: d.asc || 0, boss: d.boss || 0, boss2: d.boss2 || 0, boss2Fight: !!d.boss2Fight, phoenixUsed: d.phoenixUsed || 0, actBattles: d.actBattles || 0, lastMap: d.lastMap || null, shop: d.shop || null, over: false, won: false };
  }

  function rest(run) { var before = run.life; run.life = Math.min(run.maxLife, run.life + G.RULES.restHeal); return run.life - before; }

  G.Run = {
    create: create, reachable: reachable, enter: enter, node: node, battleOpts: battleOpts, finishBattle: finishBattle,
    rollCards: rollCards, addCard: addCard, removeCard: removeCard, shopStock: shopStock,
    rollEvent: rollEvent, eventChoice: eventChoice, gainXp: gainXp, nextUnlock: nextUnlock, unlocked: unlocked, metaLoad: metaLoad, metaSave: metaSave, count: count, easyTemplates: easyTemplates, tplScore: tplScore, upgradeCard: upgradeCard, canUpgradeCard: canUpgradeCard, bossName: bossName, bossType: bossType, nextAct: nextAct, allRoutes: allRoutes, rest: rest, rollRelic: rollRelic, addRelic: addRelic, price: price, toSave: toSave, fromSave: fromSave
  };
})();

// ランの画面：スタート、ワールドマップ、報酬、イベント、商人、休憩、ランの終わり、カード選び
'use strict';
var G = window.G = window.G || {};

(function () {
  var $ = function (id) { return document.getElementById(id); };
  var R = G.Run, UI = G.BattleUI, SPR = G.SPR;
  var run = null;
  var KIND = { battle: '戦闘', elite: 'エリート', event: 'イベント', shop: '商人', rest: '休憩', boss: 'ボス' };

  // ---- 画面の切り替え ----
  G.currentScreen = 'start';
  G.showScreen = function (name) {
    document.querySelectorAll('[data-screen]').forEach(function (el) { el.hidden = el.id !== name; });
    G.currentScreen = name;
    if (name !== 'game') renderRunBar();
  };
  function renderRunBar() {
    if (!run) return;
    document.querySelectorAll('.rb-life').forEach(function (e) { e.textContent = run.life + '/' + run.maxLife; });
    document.querySelectorAll('.rb-gold').forEach(function (e) { e.textContent = run.gold; });
    document.querySelectorAll('.rb-deck').forEach(function (e) { e.textContent = run.deck.length; });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function button(label, cls, fn) { var b = el('button', cls, label); b.type = 'button'; b.addEventListener('click', fn); return b; }

  // ---- スタート画面 ----
  (function titleArt() {
    var c = $('title-art').getContext('2d');
    c.fillStyle = '#2f5a2a'; c.fillRect(0, 30, 112, 10);
    c.fillStyle = '#94744a'; c.fillRect(0, 34, 112, 4);
    c.drawImage(G.towerImg('bowman', 2), 2, 10);
    c.drawImage(G.towerImg('frost', 1), 20, 4);
    c.drawImage(G.towerImg('sling', 0), 38, 20);
    c.drawImage(SPR.wolf[0].l, 60, 26);
    c.drawImage(SPR.goblin[1].l, 78, 22);
    c.drawImage(SPR.knight[0].l, 92, 17);
  })();
  // ============================================================
  // 自動セーブ（このブラウザの中に保存。マスに入る時・報酬が出た時・マップに戻った時）
  // resume：map＝マップから / node＝そのマスに入るところから（戦闘は最初から）/ reward＝報酬を選ぶところから
  // ============================================================
  var SAVE_KEY = 'towerRogue.save.v1';
  function save(resume) {
    if (!run || run.over) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, at: Date.now(), run: R.toSave(run), resume: resume || { type: 'map' } })); } catch (e) {}
  }
  function loadSave() {
    try { var d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return d && d.v === 1 ? d : null; } catch (e) { return null; }
  }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

  // ---- タイトル：「つづきから」「はじめから」を選んでから上にスワイプ ----
  var titleChoice = 'new';
  function refreshTitle() {
    var d = loadSave(), cont = $('t-cont');
    cont.disabled = !d;
    if (d) {
      var r = d.run, n = r.at ? r.world.nodes[r.at] : null;
      var where = '第' + (r.act || 1) + '層 ' + (!n ? 'スタート地点' : n.type === 'boss' ? 'ボス' : (n.floor + 1) + '階');
      var dt = new Date(d.at);
      $('t-cont-info').textContent = where + '・ライフ' + r.life + '/' + r.maxLife + '・デッキ' + r.deck.length + '枚・' + (dt.getMonth() + 1) + '/' + dt.getDate() + ' ' + dt.getHours() + ':' + String(dt.getMinutes()).padStart(2, '0');
    } else $('t-cont-info').textContent = '保存されたデータはありません';
    setChoice(d ? 'cont' : 'new');
  }
  function setChoice(c) {
    titleChoice = c;
    $('t-cont').setAttribute('aria-pressed', String(c === 'cont'));
    $('t-new').setAttribute('aria-pressed', String(c === 'new'));
    $('t-new-info').innerHTML = c === 'new' && loadSave() ? '<span class="warn">始めると、つづきのデータは消えます</span>' : '新しい挑戦を始める';
  }
  $('t-cont').addEventListener('click', function () { setChoice('cont'); });
  $('t-new').addEventListener('click', function () { setChoice('new'); });
  refreshTitle();

  function start() {
    if (G.started || $('start').hidden) return;
    G.started = true;
    $('start').hidden = true;
    var d = titleChoice === 'cont' ? loadSave() : null;
    if (d) continueRun(d); else newRun();
  }
  // ユーザーが自分でスクロールした時だけアドレスバーが縮むので、スクロールを合図に始める
  window.addEventListener('scroll', function () { if (window.scrollY > 60) start(); }, { passive: true });
  $('pc-start').addEventListener('click', start);

  function backToTitle() {
    save(lastResume);
    G.started = false;
    document.querySelectorAll('[data-screen]').forEach(function (e) { e.hidden = true; });
    G.currentScreen = 'start';
    $('start').hidden = false;
    refreshTitle();
    window.scrollTo(0, 0);
  }
  $('world-menu-btn').addEventListener('click', function () { $('world-menu').hidden = false; });
  $('wm-close').addEventListener('click', function () { $('world-menu').hidden = true; });
  $('wm-title').addEventListener('click', function () { $('world-menu').hidden = true; backToTitle(); });

  function newRun() {
    clearSave();
    run = R.create();
    G.run = run;
    showWorld();
  }
  function continueRun(d) {
    run = R.fromSave(d.run);
    G.run = run;
    var r = d.resume || { type: 'map' };
    if (r.type === 'node' && run.at) return enterNode(R.node(run));
    if (r.type === 'actclear') { run.actClear = true; return showActClear(); }
    if (r.type === 'reward' && run.at) return showReward(R.node(run), r.bonus, { stats: r.stats, relic: r.relic }, r.cards);
    showWorld();
  }
  var lastResume = { type: 'map' };

  // ============================================================
  // ワールドマップ：下（1階）から上（ボス）へ。光っているマスをタップ → もう一度タップで進む
  // ============================================================
  var pendingNode = null;
  var LANE_W = 62, FLOOR_H = 70, PAD_Y = 46, NODE = 44;
  function nodePos(n, width) {
    var lanes = 5, left = (width - LANE_W * (lanes - 1)) / 2;
    var floors = run.world.floors + 1;
    return { x: left + n.lane * LANE_W, y: PAD_Y + (floors - 1 - n.floor) * FLOOR_H };
  }
  function showWorld() {
    lastResume = { type: 'map' }; save(lastResume);
    G.showScreen('world');
    pendingNode = null;
    var box = $('world-map'), svg = $('world-lines'), width = Math.min(box.parentNode.clientWidth || 360, 420);
    var floors = run.world.floors + 1, height = PAD_Y * 2 + (floors - 1) * FLOOR_H;
    box.style.height = height + 'px'; box.style.width = width + 'px';
    svg.setAttribute('width', width); svg.setAttribute('height', height); svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    box.querySelectorAll('.node').forEach(function (b) { b.remove(); });
    var nodes = run.world.nodes, reach = R.reachable(run), lines = '';
    // 線（通った道は明るく）
    Object.keys(nodes).forEach(function (k) {
      var n = nodes[k], a = nodePos(n, width);
      n.next.forEach(function (nk) {
        var b = nodePos(nodes[nk], width), walked = run.visited.indexOf(k) >= 0 && run.visited.indexOf(nk) >= 0 && run.visited.indexOf(nk) === run.visited.indexOf(k) + 1;
        var open = k === run.at && reach.indexOf(nk) >= 0;
        lines += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" class="' + (walked ? 'walked' : open ? 'open' : '') + '"/>';
      });
    });
    svg.innerHTML = lines;
    // マス
    Object.keys(nodes).forEach(function (k) {
      var n = nodes[k], p = nodePos(n, width), b = el('button', 'node t-' + n.type);
      b.type = 'button';
      b.style.left = (p.x - NODE / 2) + 'px'; b.style.top = (p.y - NODE / 2) + 'px';
      if (n.type === 'boss') { b.style.width = b.style.height = '60px'; b.style.left = (p.x - 30) + 'px'; b.style.top = (p.y - 30) + 'px'; }
      var ic = document.createElement('canvas'); ic.width = 14; ic.height = 14; ic.getContext('2d').drawImage(SPR.node[n.type], 0, 0);
      b.appendChild(ic);
      b.setAttribute('aria-label', (n.floor + 1) + '階 ' + KIND[n.type]);
      if (run.visited.indexOf(k) >= 0) b.classList.add('visited');
      if (k === run.at) b.classList.add('here');
      if (reach.indexOf(k) >= 0) b.classList.add('reach'); else b.disabled = true;
      b.addEventListener('click', function () { tapNode(k, b); });
      box.appendChild(b);
    });
    renderRelics();
    var A = G.ACTS[run.act - 1];
    $('world').querySelector('.rb-title').textContent = A.name + ' ' + A.area;
    $('world-hint').textContent = run.at ? '次に進むマスを選んでください' : '最初のマスを選んでください（下から上へ進みます）';
    // 今いる階が見えるようにスクロール
    var cur = run.at ? nodes[run.at] : { floor: -1, lane: 2 };
    var target = nodePos({ floor: Math.max(0, cur.floor + 1), lane: 2 }, width).y - $('world-scroll').clientHeight * 0.6;
    $('world-scroll').scrollTop = Math.max(0, target);
  }
  function tapNode(k, b) {
    var n = run.world.nodes[k];
    if (pendingNode !== k) {
      pendingNode = k;
      document.querySelectorAll('.node.pick').forEach(function (x) { x.classList.remove('pick'); });
      b.classList.add('pick');
      $('world-hint').textContent = (n.floor + 1 > run.world.floors ? 'ボス' : (n.floor + 1) + '階 ' + KIND[n.type]) + '：もう一度タップで進む';
      return;
    }
    R.enter(run, k);
    enterNode(n);
  }
  function renderRelics() {
    var box = $('relic-strip'); box.innerHTML = '';
    if (!run.relics.length) { box.innerHTML = '<span class="relic-none">レリックなし（エリートを倒す・商人・イベントで手に入る）</span>'; return; }
    run.relics.forEach(function (id) {
      var R2 = G.RELICS[id], b = button(R2.name, 'relic-chip r-' + R2.rarity, function () { showRelic(id); });
      box.appendChild(b);
    });
  }
  function showRelic(id) {
    var R2 = G.RELICS[id];
    $('p-title').textContent = R2.name;
    $('p-note').textContent = R2.text + '（' + (R2.kind === 'change' ? '遊び方が変わる' : '数値が上がる') + '）';
    $('p-list').innerHTML = '';
    $('pile').hidden = false;
  }
  $('world').querySelector('.deck-btn').addEventListener('click', function () { UI.showList('デッキ', run.deck, 'カードをタップすると詳しい説明が出ます。'); });

  function enterNode(n) {
    // マスに入る時点で保存（途中でやめても、つづきからは同じマスに入り直す。戦闘は最初から）
    lastResume = { type: 'node' }; save(lastResume);
    if (n.type === 'battle' || n.type === 'elite' || n.type === 'boss') return startBattle(n);
    if (n.type === 'event') return showEvent();
    if (n.type === 'shop') return showShop();
    if (n.type === 'rest') return showRest();
  }

  // ============================================================
  // 戦闘
  // ============================================================
  function startBattle(n) {
    var opts = R.battleOpts(run);
    var label = run.act + '層' + (n.type === 'boss' ? 'ボス' : (n.floor + 1) + '階' + (n.type === 'elite' ? 'エリート' : ''));
    UI.start(opts, function (s) {
      R.finishBattle(run, s);
      if (run.over) { clearSave(); return showEnd(); }
      showReward(n, run.gold - s.gold, s);
    }, { label: label, title: n.type === 'boss' ? (run.act >= G.RULES.acts ? 'ラスボス戦' : 'ボス戦') : n.type === 'elite' ? 'エリート戦' : '準備ターン' });
  }

  // ---- 報酬：カード3枚から1枚（取らなくてもよい） ----
  function showReward(n, bonus, s, savedCards) {
    var big = n.type === 'elite' || n.type === 'boss';
    var cards = savedCards || R.rollCards(run, 3, big ? 'elite' : 'battle');
    // ボスに勝った後は、報酬を選んだら次の層の案内へ
    var after = function () { if (run.actClear) showActClear(); else showWorld(); };
    lastResume = { type: 'reward', cards: cards, bonus: bonus, stats: { killed: s.stats.killed, leaked: s.stats.leaked, goldEarned: s.stats.goldEarned } };
    save(lastResume);
    openPanel(n.type === 'boss' ? 'ボス撃破' : n.type === 'elite' ? 'エリート撃破' : '勝利', function (body, foot) {
      body.appendChild(el('h2', 'panel-title', '勝利！'));
      body.appendChild(el('p', 'panel-text', '倒した敵 ' + s.stats.killed + '体・通した敵 ' + s.stats.leaked + '体。戦闘で得たお金 +' + s.stats.goldEarned + 'G、勝利のおまけ +' + bonus + 'G。'));
      if (big) {
        if (!savedCards) { lastResume.relic = R.rollRelic(run, 'elite'); R.addRelic(run, lastResume.relic); save(lastResume); }
        var rid = savedCards ? s.relic : lastResume.relic;
        if (rid) { var rb = el('div', 'card-detail relic-get'); rb.innerHTML = '<h3></h3><p></p>'; rb.querySelector('h3').textContent = 'レリック獲得：' + G.RELICS[rid].name; rb.querySelector('p').textContent = G.RELICS[rid].text; body.appendChild(rb); }
      }
      body.appendChild(el('p', 'panel-sub', 'カードを1枚えらんでデッキに加えます'));
      choose(body, foot, cards, '受け取る', function (id) { R.addCard(run, id); after(); }, 'カードを受け取らない', after);
    });
  }

  // ---- 層をクリア → 次の層へ ----
  function showActClear() {
    var A = G.ACTS[run.act - 1], N = G.ACTS[run.act];
    lastResume = { type: 'actclear' }; save(lastResume);
    openPanel(A.name + 'クリア', function (body, foot) {
      body.appendChild(el('h2', 'panel-title win', A.name + ' ' + A.area + ' クリア！'));
      body.appendChild(el('p', 'panel-text', A.boss + 'を倒した。次は' + N.name + '「' + N.area + '」。敵が強くなる。' + (G.RULES.actHeal >= 99 ? '進む時にライフが全回復する。' : '進む時にライフが' + G.RULES.actHeal + '回復する。')));
      foot.appendChild(button(N.name + 'へ進む', 'go', function () { R.nextAct(run); showWorld(); }));
    });
  }

  // カードを並べて1枚選ばせる（報酬・祭壇）
  function choose(body, foot, cards, okLabel, onOk, skipLabel, onSkip) {
    var grid = el('div', 'cards-grid'), picked = null, desc = el('div', 'card-detail empty', 'カードをタップすると詳細が出ます');
    var ok = button(okLabel, 'go', function () { if (picked) onOk(picked); });
    ok.disabled = true;
    cards.forEach(function (id) {
      var c = UI.cardEl(id);
      c.addEventListener('click', function () {
        grid.querySelectorAll('.card').forEach(function (x) { x.classList.remove('sel'); });
        c.classList.add('sel'); picked = id; ok.disabled = false;
        var box = UI.detailBox(id); desc.replaceWith(box); desc = box;
      });
      grid.appendChild(c);
    });
    body.appendChild(grid); body.appendChild(desc);
    foot.appendChild(ok);
    if (skipLabel) foot.appendChild(button(skipLabel, '', onSkip));
  }

  // ============================================================
  // イベント
  // ============================================================
  function showEvent() {
    var ev = R.rollEvent(run);
    openPanel('イベント', function (body, foot) {
      body.appendChild(el('h2', 'panel-title', ev.title));
      body.appendChild(el('p', 'panel-text', ev.text));
      var list = el('div', 'choices');
      ev.choices.forEach(function (ch) {
        var b = button('', 'choice', function () {
          var res = R.eventChoice(run, ch);
          renderRunBar();
          if (res.fail) { msg.textContent = res.msg; return; }
          if (res.next === 'pickCopy') return pickFromDeck('複製するカードを選ぶ', function (i) { var id = run.deck[i]; R.addCard(run, id); afterEvent('「' + G.CARDS[id].name + '」をもう1枚手に入れた。'); }, true);
          if (res.next === 'pickRemove') return pickFromDeck('手放すカードを選ぶ', function (i) { R.removeCard(run, i); afterEvent('カードを手放した。'); }, true);
          if (res.next === 'pickCard') {
            return openPanel('イベント', function (b2, f2) {
              b2.appendChild(el('h2', 'panel-title', ev.title));
              b2.appendChild(el('p', 'panel-text', res.msg + ' カードを1枚えらぶ。'));
              choose(b2, f2, res.cards, '受け取る', function (id) { R.addCard(run, id); afterEvent('「' + G.CARDS[id].name + '」を手に入れた。'); });
            });
          }
          afterEvent(res.msg);
        });
        b.appendChild(el('b', '', ch.label));
        if (ch.note) b.appendChild(el('small', '', ch.note));
        list.appendChild(b);
      });
      body.appendChild(list);
      var msg = el('p', 'panel-sub'); body.appendChild(msg);
    });
    function afterEvent(text) {
      if (run.life <= 0) { run.over = true; clearSave(); return showEnd(); }
      lastResume = { type: 'map' }; save(lastResume);   // 選択肢が決まった時点で保存（つづきからはマップに戻る）
      openPanel('イベント', function (body, foot) {
        body.appendChild(el('h2', 'panel-title', ev.title));
        body.appendChild(el('p', 'panel-text', text));
        foot.appendChild(button('先へ進む', 'go', showWorld));
      });
    }
  }

  // ============================================================
  // 商人：カード3枚、カードを手放す、ライフ回復
  // ============================================================
  function showShop() {
    var shop = R.shopStock(run), stock = shop.cards, P = G.RULES.shop, used = { remove: false, heal: false };
    function render() {
      openPanel('商人', function (body, foot) {
        body.appendChild(el('h2', 'panel-title', '旅の商人'));
        var grid = el('div', 'cards-grid shop'), desc = el('div', 'card-detail empty', 'カードをタップすると詳細、もう一度タップで買う'), picked = null;
        function say(t) { var p = el('div', 'card-detail empty', t); desc.replaceWith(p); desc = p; }
        stock.forEach(function (it, i) {
          var wrap = el('div', 'shop-item'), c = UI.cardEl(it.id);
          if (it.sold) { c.classList.add('sold'); }
          c.addEventListener('click', function () {
            if (it.sold) return;
            if (picked !== i) {
              picked = i;
              grid.querySelectorAll('.card').forEach(function (x) { x.classList.remove('sel'); });
              c.classList.add('sel');
              var box = UI.detailBox(it.id, 'もう一度タップで ●' + it.price + ' で買う'); desc.replaceWith(box); desc = box;
              return;
            }
            if (run.gold < it.price) { say('お金が足りません'); return; }
            run.gold -= it.price; it.sold = true; R.addCard(run, it.id); render();
          });
          wrap.appendChild(c);
          wrap.appendChild(el('span', 'price' + (run.gold < it.price && !it.sold ? ' poor' : ''), it.sold ? '売り切れ' : '● ' + it.price));
          grid.appendChild(wrap);
        });
        body.appendChild(grid); body.appendChild(desc);
        var sv = el('div', 'choices');
        if (shop.relic) {
          var rl = shop.relic, RD = G.RELICS[rl.id];
          var rbtn = button('', 'choice relic-buy', function () {
            if (rl.sold) return;
            if (run.gold < rl.price) { say('お金が足りません'); return; }
            run.gold -= rl.price; rl.sold = true; R.addRelic(run, rl.id); render();
          });
          rbtn.appendChild(el('b', '', 'レリック：' + RD.name)); rbtn.appendChild(el('small', '', rl.sold ? '購入済み' : RD.text + '　● ' + rl.price));
          rbtn.disabled = rl.sold;
          sv.appendChild(rbtn);
        }
        var rm = button('', 'choice', function () {
          if (used.remove) return;
          if (run.gold < R.price(run, P.remove)) { say('お金が足りません'); return; }
          pickFromDeck('手放すカードを選ぶ（●' + R.price(run, P.remove) + '）', function (idx) { run.gold -= R.price(run, P.remove); used.remove = true; R.removeCard(run, idx); render(); }, false, render);
        });
        rm.appendChild(el('b', '', 'カードを1枚手放す')); rm.appendChild(el('small', '', used.remove ? '利用済み' : '● ' + R.price(run, P.remove)));
        rm.disabled = used.remove;
        var hl = button('', 'choice', function () {
          if (used.heal) return;
          if (run.gold < R.price(run, P.heal)) { say('お金が足りません'); return; }
          run.gold -= R.price(run, P.heal); used.heal = true; run.life = Math.min(run.maxLife, run.life + P.healAmount); render();
        });
        hl.appendChild(el('b', '', 'ライフを' + P.healAmount + '回復')); hl.appendChild(el('small', '', used.heal ? '利用済み' : '● ' + R.price(run, P.heal)));
        hl.disabled = used.heal || run.life >= run.maxLife;
        sv.appendChild(rm); sv.appendChild(hl);
        body.appendChild(sv);
        foot.appendChild(button('店を出る', 'go', showWorld));
      });
    }
    render();
  }

  // ============================================================
  // 休憩：ライフ回復 または カードを1枚手放す
  // ============================================================
  function showRest() {
    openPanel('休憩', function (body, foot) {
      body.appendChild(el('h2', 'panel-title', 'たき火'));
      body.appendChild(el('p', 'panel-text', 'ひと休みできる。どちらか1つを選ぶ。'));
      var list = el('div', 'choices');
      var a = button('', 'choice', function () { var h = R.rest(run); done('ライフが' + h + '回復した。'); });
      a.appendChild(el('b', '', '休む')); a.appendChild(el('small', '', 'ライフ+' + G.RULES.restHeal + '（最大' + run.maxLife + '）'));
      var b = button('', 'choice', function () { pickFromDeck('手放すカードを選ぶ', function (i) { R.removeCard(run, i); done('カードを手放した。'); }, false, showRest); });
      b.appendChild(el('b', '', '整理する')); b.appendChild(el('small', '', 'デッキからカードを1枚手放す'));
      list.appendChild(a); list.appendChild(b);
      body.appendChild(list);
    });
    function done(text) {
      lastResume = { type: 'map' }; save(lastResume);
      openPanel('休憩', function (body, foot) {
        body.appendChild(el('h2', 'panel-title', 'たき火'));
        body.appendChild(el('p', 'panel-text', text));
        foot.appendChild(button('先へ進む', 'go', showWorld));
      });
    }
  }

  // ============================================================
  // ランの終わり
  // ============================================================
  function showEnd() {
    clearSave();
    openPanel(run.won ? 'クリア' : '敗北', function (body, foot) {
      body.appendChild(el('h2', 'panel-title ' + (run.won ? 'win' : 'lose'), run.won ? '全3層クリア！' : '敗北…'));
      var n = R.node(run);
      body.appendChild(el('p', 'panel-text', (run.won ? 'ラスボスの火竜を倒した。' : G.ACTS[run.act - 1].name + 'の' + (n ? (n.type === 'boss' ? 'ボス戦' : (n.floor + 1) + '階') : '') + 'で力つきた。') +
        ' 勝った戦闘 ' + run.stats.battles + '回（エリート ' + run.stats.elites + '回）、手に入れたカード ' + run.stats.cardsTaken + '枚、最後のデッキ ' + run.deck.length + '枚。'));
      foot.appendChild(button('新しく始める', 'go', newRun));
      foot.appendChild(button('タイトルに戻る', '', backToTitle));
      foot.appendChild(button('最後のデッキを見る', '', function () { UI.showList('デッキ', run.deck); }));
    });
  }

  // ---- パネル画面（報酬・イベント・商人・休憩・終わり）の共通の入れ物 ----
  function openPanel(kind, fill) {
    G.showScreen('panel');
    $('panel-kind').textContent = kind;
    var body = $('panel-body'), foot = $('panel-foot');
    body.innerHTML = ''; foot.innerHTML = '';
    body.scrollTop = 0;
    fill(body, foot);
    renderRunBar();
  }

  // ---- デッキから1枚選ぶ ----
  function pickFromDeck(title, onOk, mustPick, onCancel) {
    var grid = $('pk-grid'), picked = -1;
    $('pk-title').textContent = title;
    var tip = document.createElement('p'); tip.id = 'pk-text'; tip.className = 'pk-text'; tip.textContent = 'カードをタップして選ぶ';
    $('pk-text').replaceWith(tip);
    grid.innerHTML = '';
    run.deck.forEach(function (id, i) {
      var c = UI.cardEl(id);
      c.addEventListener('click', function () {
        grid.querySelectorAll('.card').forEach(function (x) { x.classList.remove('sel'); });
        c.classList.add('sel'); picked = i; $('pk-ok').disabled = false;
        var box = UI.detailBox(id); box.id = 'pk-text'; $('pk-text').replaceWith(box);
      });
      grid.appendChild(c);
    });
    $('pk-ok').disabled = true;
    $('pk-cancel').hidden = !!mustPick;
    $('pk-ok').onclick = function () { if (picked < 0) return; $('picker').hidden = true; onOk(picked); };
    $('pk-cancel').onclick = function () { $('picker').hidden = true; if (onCancel) onCancel(); };
    $('picker').hidden = false;
  }

  // 開発用
  G.Screens = { newRun: newRun, showWorld: showWorld, enterNode: enterNode, showEnd: showEnd, get run() { return run; } };
})();

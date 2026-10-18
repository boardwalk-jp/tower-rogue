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
  function start() {
    if (G.started) return;
    G.started = true;
    $('start').hidden = true;
    newRun();
  }
  // ユーザーが自分でスクロールした時だけアドレスバーが縮むので、スクロールを合図に始める
  window.addEventListener('scroll', function () { if (window.scrollY > 60) start(); }, { passive: true });
  $('pc-start').addEventListener('click', start);

  function newRun() {
    run = R.create();
    G.run = run;
    showWorld();
  }

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
  $('world').querySelector('.deck-btn').addEventListener('click', function () { UI.showList('デッキ', run.deck, 'カードをタップすると詳しい説明が出ます。'); });

  function enterNode(n) {
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
    var label = n.type === 'boss' ? 'ボス' : (n.floor + 1) + '階' + (n.type === 'elite' ? 'エリート' : '');
    UI.start(opts, function (s) {
      R.finishBattle(run, s);
      if (run.over) return showEnd();
      showReward(n, run.gold - s.gold, s);
    }, { label: label, title: n.type === 'boss' ? 'ボス戦' : n.type === 'elite' ? 'エリート戦' : '準備ターン' });
  }

  // ---- 報酬：カード3枚から1枚（取らなくてもよい） ----
  function showReward(n, bonus, s) {
    var cards = R.rollCards(run, 3, n.type === 'elite' ? 'elite' : 'battle');
    openPanel(n.type === 'elite' ? 'エリート撃破' : '勝利', function (body, foot) {
      body.appendChild(el('h2', 'panel-title', '勝利！'));
      body.appendChild(el('p', 'panel-text', '倒した敵 ' + s.stats.killed + '体・通した敵 ' + s.stats.leaked + '体。戦闘で得たお金 +' + s.stats.goldEarned + 'G、勝利のおまけ +' + bonus + 'G。'));
      body.appendChild(el('p', 'panel-sub', 'カードを1枚えらんでデッキに加えます'));
      choose(body, foot, cards, '受け取る', function (id) { R.addCard(run, id); showWorld(); }, 'カードを受け取らない', showWorld);
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
      if (run.life <= 0) { run.over = true; return showEnd(); }
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
    var stock = R.shopStock(run), P = G.RULES.shop, used = { remove: false, heal: false };
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
        var rm = button('', 'choice', function () {
          if (used.remove) return;
          if (run.gold < P.remove) { say('お金が足りません'); return; }
          pickFromDeck('手放すカードを選ぶ（●' + P.remove + '）', function (idx) { run.gold -= P.remove; used.remove = true; R.removeCard(run, idx); render(); }, false, render);
        });
        rm.appendChild(el('b', '', 'カードを1枚手放す')); rm.appendChild(el('small', '', used.remove ? '利用済み' : '● ' + P.remove));
        rm.disabled = used.remove;
        var hl = button('', 'choice', function () {
          if (used.heal) return;
          if (run.gold < P.heal) { say('お金が足りません'); return; }
          run.gold -= P.heal; used.heal = true; run.life = Math.min(run.maxLife, run.life + P.healAmount); render();
        });
        hl.appendChild(el('b', '', 'ライフを' + P.healAmount + '回復')); hl.appendChild(el('small', '', used.heal ? '利用済み' : '● ' + P.heal));
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
    openPanel(run.won ? 'クリア' : '敗北', function (body, foot) {
      body.appendChild(el('h2', 'panel-title ' + (run.won ? 'win' : 'lose'), run.won ? '第1層クリア！' : '敗北…'));
      var n = R.node(run);
      body.appendChild(el('p', 'panel-text', (run.won ? 'オーガ王を倒した。' : (n ? (n.type === 'boss' ? 'ボス戦' : (n.floor + 1) + '階') : '') + 'で力つきた。') +
        ' 勝った戦闘 ' + run.stats.battles + '回（エリート ' + run.stats.elites + '回）、手に入れたカード ' + run.stats.cardsTaken + '枚、最後のデッキ ' + run.deck.length + '枚。'));
      foot.appendChild(button('新しく始める', 'go', newRun));
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

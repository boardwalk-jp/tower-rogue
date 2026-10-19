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
  function button(label, cls, fn) { var b = el('button', cls, label); b.type = 'button'; b.addEventListener('click', function (e) { if (G.Sound) G.Sound.play('tap'); fn(e); }); return b; }
  function music(name) { if (G.Sound) G.Sound.music(name); }

  // ---- スタート画面 ----
  // ---- タイトルの背景：夕暮れの空、星、月、山、城、タワーが魔物の行列に矢を撃つ（ずっと動く） ----
  (function titleScene() {
    var cv = $('title-bg'), c = cv.getContext('2d'), W = cv.width, H = cv.height;
    c.imageSmoothingEnabled = false;
    // 動かない部分（空・山・城）は先に描いておく
    var bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    var g = bg.getContext('2d');
    var sky = g.createLinearGradient(0, 0, 0, H * 0.8);
    sky.addColorStop(0, '#120a24'); sky.addColorStop(0.45, '#3a1638'); sky.addColorStop(0.72, '#9a3a2a'); sky.addColorStop(0.86, '#e8843a'); sky.addColorStop(1, '#ffc46a');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffe9c0'; g.beginPath(); g.arc(24, 14, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f6d6a0'; g.beginPath(); g.arc(21, 12, 2, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(27, 17, 1.5, 0, Math.PI * 2); g.fill();
    function ridge(y0, amp, col, seed) {
      g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
      for (var x = 0; x <= W; x += 2) g.lineTo(x, y0 - Math.abs(Math.sin(x * 0.045 + seed) * amp) - Math.abs(Math.sin(x * 0.13 + seed * 2)) * amp * 0.35);
      g.lineTo(W, H); g.fill();
    }
    ridge(178, 26, '#4a1e3a', 1.3); ridge(192, 18, '#2a1428', 4.1);
    // 城（右の丘の上）
    g.fillStyle = '#160c18';
    g.fillRect(96, 150, 40, 50); g.fillRect(92, 138, 10, 62); g.fillRect(130, 136, 10, 64); g.fillRect(110, 128, 12, 30);
    for (var k = 0; k < 6; k++) { g.fillRect(92 + k * 9, 146, 4, 4); }
    g.fillRect(93, 134, 2, 4); g.fillRect(98, 134, 2, 4); g.fillRect(131, 132, 2, 4); g.fillRect(137, 132, 2, 4); g.fillRect(112, 124, 2, 4); g.fillRect(118, 124, 2, 4);
    g.fillRect(115, 112, 1, 16); g.fillStyle = '#d94a3a'; g.fillRect(116, 112, 7, 4);
    // 地面と道
    g.fillStyle = '#1a1a14'; g.fillRect(0, 200, W, H - 200);
    g.fillStyle = '#3a2a1a'; g.fillRect(0, 214, W, 9); g.fillStyle = '#4a3622'; g.fillRect(0, 214, W, 2);
    for (var x2 = 0; x2 < W; x2 += 3) { g.fillStyle = (x2 * 7) % 5 ? '#22281a' : '#2e3820'; g.fillRect(x2, 200 + (x2 * 13) % 6, 2, 2); }
    var stars = []; for (var i2 = 0; i2 < 46; i2++) stars.push({ x: (i2 * 53) % W, y: (i2 * 37) % 110, p: i2 * 0.7 });
    var embers = [], arrows = [], mons = [], t = 0, spawnT = 0, last = performance.now();
    [-6, 22, 48].forEach(function (x0, i0) { mons.push({ type: ['goblin', 'slime', 'wolf'][i0], x: x0, hp: 7 }); });   // 最初から何体か歩いている
    var TYPES = ['goblin', 'slime', 'wolf', 'orc', 'skeleton', 'goblin', 'bat'];
    var TOWERS = [{ type: 'bowman', lv: 2, x: 18, cd: 0 }, { type: 'frost', lv: 1, x: 44, cd: 0.5 }, { type: 'mage', lv: 1, x: 70, cd: 1 }];
    function frame(now) {
      var dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
      if (!$('start').hidden) {
        t += dt;
        c.drawImage(bg, 0, 0);
        stars.forEach(function (st) { var a = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + st.p)); c.globalAlpha = a; c.fillStyle = '#fff6e0'; c.fillRect(st.x, st.y, 1, 1); });
        c.globalAlpha = 1;
        // 城の窓（ゆらぐ灯り）
        c.fillStyle = Math.sin(t * 9) > -0.6 ? '#ffcf6a' : '#d9952e';
        [[100, 160], [110, 160], [124, 160], [97, 176], [133, 150], [115, 138]].forEach(function (w) { c.fillRect(w[0], w[1], 2, 3); });
        // 魔物の行列（左から城へ）
        spawnT -= dt;
        if (spawnT <= 0) { spawnT = 1.1 + Math.random() * 1.0; var ty = TYPES[Math.floor(Math.random() * TYPES.length)]; mons.push({ type: ty, x: -20, hp: 7, fly: ty === 'bat' }); }
        for (var m = mons.length - 1; m >= 0; m--) {
          var mo = mons[m]; mo.x += dt * (mo.type === 'wolf' ? 14 : mo.type === 'orc' ? 6 : 9);
          var fr = Math.abs(Math.floor(t * 4 + m)) % 2, spr = SPR[mo.type][fr].r, my = mo.fly ? 196 + Math.sin(t * 5 + m) * 3 : 220;
          c.drawImage(spr, Math.round(mo.x - spr.width / 2), Math.round(my - spr.height));
          if (mo.x > 96 || mo.hp <= 0) {
            if (mo.hp <= 0) for (var q = 0; q < 8; q++) embers.push({ x: mo.x, y: my - 6, vx: (Math.random() - 0.5) * 30, vy: -Math.random() * 30, life: 0.6, col: '#ffd84a' });
            mons.splice(m, 1);
          }
        }
        // タワー（矢を撃つ）
        TOWERS.forEach(function (tw) {
          var img = G.towerImg(tw.type, tw.lv); c.drawImage(img, Math.round(tw.x - img.width / 2), 204 - img.height);
          tw.cd -= dt;
          var tgt = mons.filter(function (mo) { return mo.hp > 0 && Math.abs(mo.x - tw.x) < 50; })[0];
          if (tgt && tw.cd <= 0) { tw.cd = 1.8 + Math.random() * 1.0; arrows.push({ x: tw.x, y: 204 - img.height + 6, tgt: tgt, col: tw.type === 'frost' ? '#bfe8ff' : tw.type === 'mage' ? '#c79bff' : '#ffffff' }); }
        });
        for (var a2 = arrows.length - 1; a2 >= 0; a2--) {
          var ar = arrows[a2], tx = ar.tgt.x, ty2 = ar.tgt.fly ? 190 : 212, dx = tx - ar.x, dy = ty2 - ar.y, d = Math.hypot(dx, dy);
          if (d < 4) { ar.tgt.hp--; for (var q2 = 0; q2 < 4; q2++) embers.push({ x: tx, y: ty2, vx: (Math.random() - 0.5) * 20, vy: -Math.random() * 20, life: 0.35, col: ar.col }); arrows.splice(a2, 1); continue; }
          ar.x += dx / d * 90 * dt; ar.y += dy / d * 90 * dt;
          c.fillStyle = ar.col; c.fillRect(Math.round(ar.x), Math.round(ar.y), 2, 1);
        }
        // 火の粉（下からふわっと上る）
        if (Math.random() < 0.5) embers.push({ x: Math.random() * W, y: H, vx: (Math.random() - 0.5) * 6, vy: -12 - Math.random() * 14, life: 4, col: Math.random() < 0.5 ? '#ff9a3a' : '#ffd84a' });
        for (var e2 = embers.length - 1; e2 >= 0; e2--) {
          var em = embers[e2]; em.life -= dt; if (em.life <= 0) { embers.splice(e2, 1); continue; }
          em.x += em.vx * dt + Math.sin(t * 2 + e2) * 0.1; em.y += em.vy * dt;
          c.globalAlpha = Math.min(1, em.life); c.fillStyle = em.col; c.fillRect(Math.round(em.x), Math.round(em.y), 1, 1);
        }
        c.globalAlpha = 1;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
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
      $('t-cont-info').textContent = (G.COMMANDERS[r.cmd] || G.COMMANDERS.captain).name + (r.asc ? '・A' + r.asc : '') + '・' + where + '・ライフ' + r.life + '/' + r.maxLife + '・デッキ' + r.deck.length + '枚・' + (dt.getMonth() + 1) + '/' + dt.getDate() + ' ' + dt.getHours() + ':' + String(dt.getMinutes()).padStart(2, '0');
    } else $('t-cont-info').textContent = '保存されたデータはありません';
    var m = R.metaLoad(), nx = R.nextUnlock(m.xp), got = G.UNLOCKS.filter(function (u) { return u.xp <= m.xp; }).length;
    $('t-meta').textContent = '経験値 ' + m.xp + '　解放 ' + got + '/' + G.UNLOCKS.length + (nx ? '（次まで あと' + (nx.xp - m.xp) + '）' : '');
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
    if (d) continueRun(d); else chooseCommander();
  }
  // ---- 指揮官を選ぶ（はじめから） ----
  function chooseCommander() {
    // はじめての人には、指揮官を選ぶ前に遊び方を1回だけ出す
    var seen = false; try { seen = !!localStorage.getItem('towerRogue.helpSeen'); } catch (e) { seen = true; }
    if (!seen) setTimeout(showHelp, 50);
    openPanel('指揮官', function (body, foot) {
      body.appendChild(el('h2', 'panel-title', '指揮官を選ぶ'));
      body.appendChild(el('p', 'panel-text', '最初のデッキ・最大ライフ・能力が違う。'));
      var list = el('div', 'choices cmd-list'), picked = null;
      var ok = button('この指揮官で始める', 'go', function () { if (picked) newRun(picked, ascPick); });
      ok.disabled = true;
      Object.keys(G.COMMANDERS).forEach(function (id) {
        var C = G.COMMANDERS[id], b = button('', 'choice cmd', function () {
          list.querySelectorAll('.cmd').forEach(function (x) { x.classList.remove('sel'); });
          b.classList.add('sel'); picked = id; ok.disabled = false;
        });
        var cv = document.createElement('canvas'), img = G.towerImg(C.icon, 2); cv.width = 26; cv.height = 34;
        cv.getContext('2d').drawImage(img, Math.round((26 - img.width) / 2), 34 - img.height);
        b.appendChild(cv);
        var tx = el('span', 'cmd-txt');
        tx.appendChild(el('b', '', C.name + '　♥' + C.life));
        // 能力＝指揮官のレリック（最初から持っている。レリックを見ればどの指揮官か分かる）
        if (C.relic) {
          var rl = el('small', 'cmd-relic'); rl.appendChild(UI.relicCanvas(C.relic));
          rl.appendChild(el('span', '', G.RELICS[C.relic].name + '：' + G.RELICS[C.relic].text)); tx.appendChild(rl);
        }
        var cnt = {}; C.deck.forEach(function (k) { cnt[k] = (cnt[k] || 0) + 1; });
        tx.appendChild(el('small', 'cmd-deck', 'デッキ：' + Object.keys(cnt).map(function (k) { return G.CARDS[k].name + '×' + cnt[k]; }).join('、')));
        tx.appendChild(el('small', 'cmd-sub', C.sub));
        b.appendChild(tx);
        list.appendChild(b);
      });
      body.appendChild(list);
      // ---- アセンション（難易度）：1つ前の難易度をクリアすると次が選べる ----
      var maxA = Math.min(G.ASC_MAX, R.metaLoad().ascMax || 0), ascPick = Math.min(maxA, lastAsc());
      body.appendChild(el('h2', 'panel-sub', '難易度'));
      var row = el('div', 'asc-pick'), note = el('p', 'asc-note');
      function showNote() {
        if (!ascPick) { note.textContent = 'ノーマル：追加のルールなし。クリアするとアセンション1が選べる。'; return; }
        note.innerHTML = '';
        note.appendChild(document.createTextNode('アセンション' + ascPick + '：'));
        G.ASCENSION.filter(function (a) { return a.lv <= ascPick; }).forEach(function (a, i) { if (i) note.appendChild(document.createTextNode('・')); note.appendChild(el('b', '', a.text)); });
        note.appendChild(document.createTextNode('。経験値+' + ascPick * 10 + '%。' + (ascPick < G.ASC_MAX ? 'クリアするとアセンション' + (ascPick + 1) + 'が選べる。' : '')));
      }
      for (var a = 0; a <= G.ASC_MAX; a++) (function (a) {
        var b = button(a ? 'A' + a : 'ノーマル', a === ascPick ? 'sel' : '', function () { ascPick = a; row.querySelectorAll('button').forEach(function (x) { x.classList.remove('sel'); }); b.classList.add('sel'); showNote(); });
        if (a > maxA) { b.disabled = true; b.textContent = '🔒A' + a; }
        row.appendChild(b);
      })(a);
      body.appendChild(row); body.appendChild(note); showNote();
      foot.appendChild(ok);
    });
  }
  function lastAsc() { try { return +localStorage.getItem('towerRogue.lastAsc') || 0; } catch (e) { return 0; } }
  // ユーザーが自分でスクロールした時だけアドレスバーが縮むので、スクロールを合図に始める
  window.addEventListener('scroll', function () { if (window.scrollY > 60) start(); }, { passive: true });
  $('pc-start').addEventListener('click', start);

  function backToTitle() {
    save(lastResume);
    G.started = false;
    document.querySelectorAll('[data-screen]').forEach(function (e) { e.hidden = true; });
    G.currentScreen = 'start';
    $('start').hidden = false; music(null);
    refreshTitle();
    window.scrollTo(0, 0);
  }
  $('world-menu-btn').addEventListener('click', function () { $('world-menu').hidden = false; });
  $('wm-close').addEventListener('click', function () { $('world-menu').hidden = true; });
  $('wm-title').addEventListener('click', function () { $('world-menu').hidden = true; backToTitle(); });
  // 音の切り替え（効果音・BGM。このブラウザに覚えておく）
  function soundLabels() {
    if (!G.Sound) return;
    $('wm-se').textContent = '効果音：' + (G.Sound.get('se') ? 'オン' : 'オフ');
    $('wm-bgm').textContent = 'BGM：' + (G.Sound.get('bgm') ? 'オン' : 'オフ');
  }
  $('wm-se').addEventListener('click', function () { G.Sound.set('se', !G.Sound.get('se')); soundLabels(); });
  $('wm-bgm').addEventListener('click', function () { G.Sound.set('bgm', !G.Sound.get('bgm')); soundLabels(); });
  soundLabels();
  $('wm-test').addEventListener('click', function () {
    if (!G.Sound) { $('wm-sound-state').textContent = '音の仕組みが読み込まれていません。エラー：' + (window.__errs || []).join(' / '); return; }
    G.Sound.test();
    setTimeout(function () { var er = (window.__errs || []).slice(-3).join(' / '); $('wm-sound-state').textContent = '音の状態：' + G.Sound.state() + '。' + (er ? 'エラー：' + er : 'エラーなし') + '。鳴らない時はマナーモードと音量を確認してください。'; }, 400);
  });

  function newRun(cmdId, asc) {
    clearSave();
    try { localStorage.setItem('towerRogue.lastAsc', String(asc || 0)); } catch (e) {}
    run = R.create(null, cmdId || (run && run.cmd) || 'captain', asc || 0);
    G.run = run;
    showWorld();
  }
  function continueRun(d) {
    run = R.fromSave(d.run);
    G.run = run;
    var r = d.resume || { type: 'map' };
    if (r.type === 'node' && run.at) return enterNode(R.node(run));
    if (r.type === 'actclear') { run.actClear = true; music('victory'); return showActClear(); }
    if (r.type === 'reward' && run.at && R.node(run).type === 'boss') music('victory');
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
  // view：見るだけ（戦闘・イベント中に上の「マップ」ボタンから開いた時）。マスは選べず、「もどる」で元の画面へ
  var viewFrom = null;
  function showWorld(view) {
    view = view === true;
    if (!view) { lastResume = { type: 'map' }; save(lastResume); music('m' + run.act); viewFrom = null; }
    G.showScreen('world');
    $('world-menu-btn').hidden = view; $('world-back').hidden = !view;
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
        var xy = 'x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '"';
        // 下に濃い影の線を敷いて、背景の景色の上でも線が見えるように
        lines = '<line ' + xy + ' class="under"/>' + lines + '<line ' + xy + ' class="' + (walked ? 'walked' : open ? 'open' : '') + '"/>';
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
      if (reach.indexOf(k) >= 0) b.classList.add('reach');
      var backShop = !view && k === run.at && n.type === 'shop' && run.shop && run.shop.node === k;
      if (backShop) b.classList.add('reach');
      if (view || (reach.indexOf(k) < 0 && !backShop)) b.disabled = true;
      b.addEventListener('click', function () { if (backShop) { if (G.Sound) G.Sound.play('tap'); lastResume = { type: 'node' }; save(lastResume); return showShop(); } tapNode(k, b); });
      box.appendChild(b);
    });
    renderRelics();
    var A = G.ACTS[run.act - 1];
    if (G.worldBg) G.worldBg(run.act, A.theme, box, $('world-scroll'));   // 層ごとの景色（草原・雪山・火山）
    $('world').querySelector('.rb-title').textContent = A.name + ' ' + A.area;
    var inShop = run.at && nodes[run.at].type === 'shop' && run.shop && run.shop.node === run.at;
    $('world-hint').textContent = view ? '見るだけ（マスは選べません）' : inShop ? '次のマスを選ぶ（今いる商人をタップでお店に戻れる）' : run.at ? '次に進むマスを選んでください' : '最初のマスを選んでください（下から上へ進みます）';
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
      $('world-hint').textContent = (n.floor + 1 > run.world.floors ? 'ボス「' + R.bossName(run) + '」' : (n.floor + 1) + '階 ' + KIND[n.type]) + '：もう一度タップで進む';
      return;
    }
    R.enter(run, k);
    run.shop = null;   // 次のマスに進んだら、前の商人には戻れない
    enterNode(n);
  }
  function renderRelics() { UI.relicBar($('relic-strip'), run.relics, 'レリックなし（エリートを倒す・商人・イベントで手に入る）'); }
  function showDeck() { if (run) UI.showList('デッキ', run.deck, 'カードをタップすると詳しい説明が出ます。'); }
  $('world').querySelector('.deck-btn').addEventListener('click', showDeck);
  // ---- 画面の上の「マップ」「デッキ」（いつでも見られる） ----
  document.querySelectorAll('[data-nav]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.nav === 'help') return showHelp();
      if (!run) return;
      if (G.Sound) G.Sound.play('tap');
      if (b.dataset.nav === 'deck') return showDeck();
      if (b.dataset.nav === 'help') return showHelp();
      if (G.currentScreen === 'world') return;
      viewFrom = G.currentScreen;       // 戦闘中は、マップを見ている間 戦闘が止まる
      // カードを選んでいる途中なら、選ぶ画面をいったん隠して、もどる時に戻す
      pickerAway = !$('picker').hidden; if (pickerAway) $('picker').hidden = true;
      showWorld(true);
    });
  });
  var pickerAway = false;
  $('world-back').addEventListener('click', function () {
    if (pickerAway) { pickerAway = false; setTimeout(function () { $('picker').hidden = false; }, 0); }
    var to = viewFrom || 'world'; viewFrom = null;
    $('world-menu-btn').hidden = false; $('world-back').hidden = true;
    G.showScreen(to);
    if (to === 'game') UI.fit();
  });

  function enterNode(n) {
    // マスに入る時点で保存（途中でやめても、つづきからは同じマスに入り直す。戦闘は最初から）
    lastResume = { type: 'node' }; save(lastResume);
    if (n.type === 'battle' || n.type === 'elite' || n.type === 'boss') return startBattle(n);
    if (n.type !== 'battle' && n.type !== 'elite' && n.type !== 'boss') music('m' + run.act);
    if (n.type === 'event') return showEvent();
    if (n.type === 'shop') return showShop();
    if (n.type === 'rest') return showRest();
  }

  // ============================================================
  // 戦闘
  // ============================================================
  function startBattle(n) {
    var opts = R.battleOpts(run);
    music(n.type === 'boss' ? 'boss' : 'a' + run.act);
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
    var cards = savedCards || R.rollCards(run, 3, n.type === 'boss' ? 'boss' : big ? 'elite' : 'battle');
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
        if (rid) {
          var RR = G.RELICS[rid], rb = el('div', 'card-detail relic-get r-' + RR.rarity);
          rb.innerHTML = '<h3 class="relic-line"></h3><p></p>';
          var h3 = rb.querySelector('h3');
          h3.appendChild(UI.relicCanvas(rid));
          h3.appendChild(el('span', 'relic-line-name', 'レリック獲得：' + RR.name));
          h3.appendChild(el('span', 'rar-label r-' + RR.rarity, UI.RARITY[RR.rarity]));
          rb.querySelector('p').textContent = RR.text; body.appendChild(rb);
        }
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
      body.appendChild(el('p', 'panel-text', R.bossName(run) + 'を倒した。次は' + N.name + '「' + N.area + '」。敵が強くなる。' + (G.RULES.actHeal >= 99 ? '進む時にライフが全回復する。' : '進む時にライフが' + G.RULES.actHeal + '回復する。')));
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
    // イベントの場面の絵（js/eventart.js）
    function eventArt(box) { var a = G.eventArt && G.eventArt(ev.id, run.act); if (a) box.appendChild(a); }
    openPanel('イベント', function (body, foot) {
      eventArt(body); body.appendChild(el('h2', 'panel-title', ev.title));
      body.appendChild(el('p', 'panel-text', ev.text));
      var list = el('div', 'choices');
      ev.choices.forEach(function (ch) {
        var b = button('', 'choice', function () {
          var res = R.eventChoice(run, ch);
          renderRunBar();
          if (res.fail) { msg.textContent = res.msg; return; }
          if (res.next === 'pickCopy') return pickFromDeck('複製するカードを選ぶ', function (i) { var id = run.deck[i]; R.addCard(run, id); afterEvent('「' + G.CARDS[id].name + '」をもう1枚手に入れた。'); }, true);
          if (res.next === 'pickRemove') return pickFromDeck('手放すカードを選ぶ', function (i) { R.removeCard(run, i); afterEvent('カードを手放した。'); }, true);
          if (res.next === 'pickUpgrade') return pickFromDeck('鍛えるカードを選ぶ', function (i) { var nm = G.CARDS[run.deck[i]].name; R.upgradeCard(run, i); afterEvent('「' + nm + '」を鍛えて「' + G.CARDS[run.deck[i]].name + '」にした。'); }, true, null, R.canUpgradeCard);
          if (res.next === 'pickCard') {
            return openPanel('イベント', function (b2, f2) {
              eventArt(b2); b2.appendChild(el('h2', 'panel-title', ev.title));
              b2.appendChild(el('p', 'panel-text', res.msg + ' カードを1枚えらぶ。'));
              choose(b2, f2, res.cards, '受け取る', function (id) { R.addCard(run, id); afterEvent('「' + G.CARDS[id].name + '」を手に入れた。'); });
            });
          }
          afterEvent(res.msg, res.relic);
        });
        b.appendChild(el('b', '', ch.label));
        if (ch.note) b.appendChild(el('small', '', ch.note));
        list.appendChild(b);
      });
      body.appendChild(list);
      var msg = el('p', 'panel-sub'); body.appendChild(msg);
    });
    function afterEvent(text, rid) {
      if (run.life <= 0) { run.over = true; clearSave(); return showEnd(); }
      lastResume = { type: 'map' }; save(lastResume);   // 選択肢が決まった時点で保存（つづきからはマップに戻る）
      openPanel('イベント', function (body, foot) {
        eventArt(body); body.appendChild(el('h2', 'panel-title', ev.title));
        body.appendChild(el('p', 'panel-text', text));
        if (rid) {
          var RR = G.RELICS[rid], line = el('div', 'card-detail relic-get r-' + RR.rarity), h3 = el('h3', 'relic-line');
          h3.appendChild(UI.relicCanvas(rid)); h3.appendChild(el('span', 'relic-line-name', RR.name)); h3.appendChild(el('span', 'rar-label r-' + RR.rarity, UI.RARITY[RR.rarity]));
          line.appendChild(h3); body.appendChild(line);
        }
        foot.appendChild(button('先へ進む', 'go', showWorld));
      });
    }
  }

  // ============================================================
  // 商人：カード3枚、カードを手放す、ライフ回復
  // ============================================================
  function showShop() {
    // 同じ商人のマスにいる間は、出た時と同じ品ぞろえ（売り切れも）で入り直せる
    if (!run.shop || run.shop.node !== run.at) { var st0 = R.shopStock(run); run.shop = { node: run.at, cards: st0.cards, relic: st0.relic || null, used: { remove: false, heal: false } }; }
    var shop = run.shop, stock = shop.cards, P = G.RULES.shop, used = shop.used;
    function render() {
      save({ type: 'node' });
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
          rbtn.className += ' r-' + RD.rarity;
          var rline = el('b', 'relic-line'); rline.appendChild(UI.relicCanvas(rl.id)); rline.appendChild(el('span', 'relic-line-name', 'レリック：' + RD.name)); rline.appendChild(el('span', 'rar-label r-' + RD.rarity, UI.RARITY[RD.rarity]));
          rbtn.appendChild(rline); rbtn.appendChild(el('small', '', rl.sold ? '購入済み' : RD.text + '　● ' + rl.price));
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
        foot.appendChild(button('店を出る', 'go', function () { save({ type: 'map' }); showWorld(); }));
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
      body.appendChild(el('p', 'panel-text', 'ひと休みできる。どれか1つを選ぶ。'));
      var list = el('div', 'choices');
      var a = button('', 'choice', function () { var h = R.rest(run); done('ライフが' + h + '回復した。'); });
      a.appendChild(el('b', '', '休む')); a.appendChild(el('small', '', 'ライフ+' + G.RULES.restHeal + '（最大' + run.maxLife + '）'));
      var u = button('', 'choice', function () { pickFromDeck('鍛えるカードを選ぶ', function (i) { var nm = G.CARDS[run.deck[i]].name; R.upgradeCard(run, i); done('「' + nm + '」を鍛えて「' + G.CARDS[run.deck[i]].name + '」にした。'); }, false, showRest, R.canUpgradeCard); });
      u.appendChild(el('b', '', '鍛える')); u.appendChild(el('small', '', 'カードを1枚「＋」にする（タワーはLv2で置かれる・スキルは効果アップ）'));
      u.disabled = !run.deck.some(R.canUpgradeCard);
      var b = button('', 'choice', function () { pickFromDeck('手放すカードを選ぶ', function (i) { R.removeCard(run, i); done('カードを手放した。'); }, false, showRest); });
      b.appendChild(el('b', '', '整理する')); b.appendChild(el('small', '', 'デッキからカードを1枚手放す'));
      list.appendChild(a); list.appendChild(u); list.appendChild(b);
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
    clearSave(); music(run.won ? 'victory' : null);
    openPanel(run.won ? 'クリア' : '敗北', function (body, foot) {
      body.appendChild(el('h2', 'panel-title ' + (run.won ? 'win' : 'lose'), (run.won ? '全3層クリア！' : '敗北…') + (run.asc ? '（アセンション' + run.asc + '）' : '')));
      var n = R.node(run);
      body.appendChild(el('p', 'panel-text', (run.won ? 'ラスボスの' + R.bossName(run) + 'を倒した。' : G.ACTS[run.act - 1].name + 'の' + (n ? (n.type === 'boss' ? 'ボス戦' : (n.floor + 1) + '階') : '') + 'で力つきた。') +
        ' 勝った戦闘 ' + run.stats.battles + '回（エリート ' + run.stats.elites + '回）、手に入れたカード ' + run.stats.cardsTaken + '枚、最後のデッキ ' + run.deck.length + '枚。'));
      // 経験値（ランごとに1回だけ足す）
      if (!run.xpResult) run.xpResult = R.gainXp(run);
      body.appendChild(xpBox(run.xpResult));
      foot.appendChild(button('新しく始める', 'go', chooseCommander));
      foot.appendChild(button('タイトルに戻る', '', backToTitle));
      foot.appendChild(button('最後のデッキを見る', '', function () { UI.showList('デッキ', run.deck); }));
    });
  }

  // ============================================================
  // 遊び方（はじめての人向けの説明）。{node:battle} などはドット絵のアイコンに置きかえる
  // ============================================================
  var HELP = [
    '<h3>目的</h3>',
    '<p>タワーで<b>城</b>を守りながら進み、<b>第3層のボス</b>を倒せばクリア。<b>ライフ</b>が0で終わり。</p>',
    '<h3>マップの記号</h3>',
    '<ul class="help-list">',
    '<li>{node:battle}<span><b>戦闘</b></span></li>',
    '<li>{node:elite}<span><b>エリート</b>：強い敵。勝つとレリック</span></li>',
    '<li>{node:event}<span><b>イベント</b>：選んだ結果で何かが起こる</span></li>',
    '<li>{node:shop}<span><b>商人</b>：お金でカード・レリックを買う</span></li>',
    '<li>{node:rest}<span><b>たき火</b>：回復か、カードを強くする</span></li>',
    '<li>{node:boss}<span><b>ボス</b>：倒すと次の層へ</span></li>',
    '</ul>',
    '<h3>戦闘</h3>',
    '<ul class="help-list">',
    '<li><span><b class="c-life">♥ ライフ</b>：城に敵が着くと減る。戦闘をまたいで続く</span></li>',
    '<li><span><b class="c-en">◆ エネルギー</b>：カードを使う力。毎ターン3。カード左上の数字だけ減る</span></li>',
    '<li><span><b>■ カード</b>：毎ターン' + G.RULES.drawPerTurn + '枚引く。<b class="c-gold">' + G.RULES.extraDrawCost + '金</b>払うと「ドロー」で1枚追加</span></li>',
    '<li><span><b class="c-gold">● お金</b>：敵を倒すともらえる。タワーをタップ →「強化」で強くできる</span></li>',
    '</ul>',
    '<p class="help-how">建て方：カードをタップ → 置くマスを<b>2回</b>タップ</p>',
    '<h3>カードの種類</h3>',
    '<ul class="help-list">',
    '<li>{tower:archer}<span><b>タワー</b>：近づいた敵を自動で攻撃</span></li>',
    '<li>{tower:spikes}<span><b>罠</b>：道の上にだけ置ける</span></li>',
    '<li>{tower:barracks}<span><b>兵舎</b>：兵士が道で敵を止める</span></li>',
    '<li>{icon:eye}<span><b>スキル</b>：タワーを強くする・カードを引く など</span></li>',
    '</ul>',
    '<p class="help-how">カードを長押しで説明。枠の色は <span class="rr" style="color:var(--r-common)">ノーマル</span> <span class="rr" style="color:var(--r-uncommon)">アンコモン</span> <span class="rr" style="color:var(--r-rare)">レア</span></p>'
  ].join('');
  function helpIcon(key) {
    var k = key.split(':'), img = null, sc = 2;
    try {
      if (k[0] === 'node') img = SPR.node[k[1]];
      else if (k[0] === 'icon') img = SPR.icon[k[1]];
      else if (k[0] === 'tower') { img = G.towerImg(k[1], 0); sc = 1; }
      else if (k[0] === 'enemy') { img = SPR[k[1]][0].r; sc = k[1] === 'ogre' ? 0.6 : 1; }
    } catch (e) { img = null; }
    if (!img) return '';
    var w = Math.round(img.width * sc), h = Math.round(img.height * sc);
    if (h > 26) { w = Math.round(w * 26 / h); h = 26; }
    var c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0);
    return '<img class="ico" alt="" width="' + w + '" height="' + h + '" src="' + c.toDataURL() + '">';
  }
  function showHelp() {
    var body = $('help-body');
    if (!body.dataset.done) { body.innerHTML = HELP.replace(/\{(\w+:\w+)\}/g, function (m, k) { return helpIcon(k); }); body.dataset.done = '1'; }
    body.scrollTop = 0;
    $('help').hidden = false;
    try { localStorage.setItem('towerRogue.helpSeen', '1'); } catch (e) {}
  }
  $('help-close').addEventListener('click', function () { $('help').hidden = true; });
  $('t-help').addEventListener('click', showHelp);
  $('wm-help').addEventListener('click', function () { $('world-menu').hidden = true; showHelp(); });
  G.showHelp = showHelp;

  // ---- 経験値の結果：内訳・合計・次の解放までのバー・新しく解放されたもの ----
  function unlockName(u) { return u.kind === 'card' ? 'カード「' + G.CARDS[u.id].name + '」' : 'レリック「' + G.RELICS[u.id].name + '」'; }
  function xpBox(x) {
    var box = el('div', 'card-detail xp-box');
    box.appendChild(el('h3', '', '経験値 +' + x.add));
    var dl = el('dl', 'xp-rows');
    x.rows.forEach(function (r) { if (!r[1]) return; dl.appendChild(el('dt', '', r[0])); dl.appendChild(el('dd', '', r[1] + ' × ' + r[2] + ' = ' + (r[1] * r[2]))); });
    box.appendChild(dl);
    var nx = R.nextUnlock(x.after), prev = G.UNLOCKS.filter(function (u) { return u.xp <= x.after; }).pop();
    var lo = prev ? prev.xp : 0, hi = nx ? nx.xp : x.after;
    box.appendChild(el('p', '', '合計 ' + x.after + (nx ? '　次の解放まで あと ' + (nx.xp - x.after) + '（' + unlockName(nx) + '）' : '　すべて解放済み')));
    var bar = el('div', 'xp-bar'), fill = el('i'); fill.style.width = (nx ? Math.max(2, (x.after - lo) / (hi - lo) * 100) : 100) + '%'; bar.appendChild(fill); box.appendChild(bar);
    x.newly.forEach(function (u) { box.appendChild(el('p', 'xp-new', '新しく解放：' + unlockName(u) + '（次のランから報酬・商人に出る）')); });
    if (x.ascUnlocked) box.appendChild(el('p', 'xp-new', '新しく解放：アセンション' + x.ascUnlocked + '（指揮官を選ぶ画面で選べる）'));
    return box;
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
    UI.relicBar($('p-relics'), run ? run.relics : [], '');
  }

  // ---- デッキから1枚選ぶ ----
  // ok：選べるカードか（省略するとすべて選べる）。選べないカードは暗く出す
  function pickFromDeck(title, onOk, mustPick, onCancel, ok) {
    var grid = $('pk-grid'), picked = -1;
    $('pk-title').textContent = title;
    var tip = document.createElement('p'); tip.id = 'pk-text'; tip.className = 'pk-text'; tip.textContent = 'カードをタップして選ぶ';
    $('pk-text').replaceWith(tip);
    grid.innerHTML = '';
    run.deck.forEach(function (id, i) {
      var c = UI.cardEl(id);
      if (ok && !ok(id)) { c.classList.add('sold'); grid.appendChild(c); return; }
      c.addEventListener('click', function () {
        grid.querySelectorAll('.card').forEach(function (x) { x.classList.remove('sel'); });
        c.classList.add('sel'); picked = i; $('pk-ok').disabled = false;
        // 鍛える時は、鍛えた後（＋）の中身を見せる
        var box = ok === R.canUpgradeCard ? UI.compareBox(id) : UI.detailBox(id); box.id = 'pk-text'; $('pk-text').replaceWith(box);
      });
      grid.appendChild(c);
    });
    $('pk-ok').disabled = true;
    $('pk-cancel').hidden = !!mustPick;
    $('pk-ok').onclick = function () { if (picked < 0) return; $('picker').hidden = true; onOk(picked); };
    $('pk-cancel').onclick = function () { $('picker').hidden = true; if (onCancel) onCancel(); };
    // 上の帯（マップ・デッキ・？・レリック）は隠さない：カードを選んでいる間も確かめられる
    var scr = document.querySelector('.screen:not([hidden])'), top = 0;
    if (scr) { var bar = scr.querySelector('.runbar'), rs = scr.querySelector('.relic-strip:not(:empty)'); top = Math.max(bar ? bar.getBoundingClientRect().bottom : 0, rs ? rs.getBoundingClientRect().bottom : 0); }
    $('picker').style.top = Math.round(top) + 'px';
    $('picker').hidden = false;
  }

  // 開発用
  G.Screens = { newRun: newRun, showWorld: showWorld, enterNode: enterNode, showEnd: showEnd, get run() { return run; } };
})();

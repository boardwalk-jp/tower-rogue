// 画面：スタート、手札、ボタン、タップ・ドラッグ・長押し、ゲームの時計
'use strict';
var G = window.G = window.G || {};

(function () {
  var $ = function (id) { return document.getElementById(id); };
  var SPR = G.buildSprites();
  var mode = 'pedestal';
  var s = null;
  var ui = { selIndex: -1, selType: null, selTower: null, preview: null, time: 0 };
  var speed = 1;
  var cv = $('map'), ctx = cv.getContext('2d');
  var started = false;

  // ---- Safari の長押しメニュー・文字選択・拡大を止める ----
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('selectstart', function (e) { e.preventDefault(); });
  ['gesturestart', 'gesturechange'].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); }); });
  // ゲーム中は画面がスクロールしないように（細くなったアドレスバーを戻さないため）
  document.addEventListener('touchmove', function (e) { if (started) e.preventDefault(); }, { passive: false });

  // ---- スタート画面 ----
  (function titleArt() {
    var c = $('title-art').getContext('2d');
    c.fillStyle = '#2f5a2a'; c.fillRect(0, 30, 112, 10);
    c.fillStyle = '#94744a'; c.fillRect(0, 34, 112, 4);
    c.drawImage(SPR.archer[2][0], 4, 6);
    c.drawImage(SPR.mage[1][0], 24, 2);
    c.drawImage(SPR.cannon[0][0].r, 42, 18);
    c.drawImage(SPR.slime[0].l, 66, 25);
    c.drawImage(SPR.goblin[1].l, 80, 20);
    c.drawImage(SPR.orc[0].l, 92, 15);
  })();

  function setMode(m) {
    mode = m;
    document.querySelectorAll('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === m)); });
  }
  document.querySelectorAll('[data-mode]').forEach(function (b) {
    b.addEventListener('click', function () { setMode(b.dataset.mode); });
  });

  function start() {
    if (started) return;
    started = true;
    $('game').hidden = false;
    newBattle();
    requestAnimationFrame(fit);
  }
  // ユーザーが自分でスクロールした時だけアドレスバーが縮むので、スクロールを合図に始める
  window.addEventListener('scroll', function () { if (window.scrollY > 60) start(); }, { passive: true });
  $('pc-start').addEventListener('click', start);

  // ---- 戦闘の開始・やり直し ----
  function newBattle() {
    s = G.Battle.create({ mode: mode });
    G.Render.clearFx();
    deselect();
    $('result').hidden = true;
    s.events = [];
    renderHand(); renderInfo(); renderHud(true);
    showBanner('準備ターン', 'prep');
  }
  $('r-again').addEventListener('click', newBattle);

  // ---- 表示 ----
  var last = {};
  function renderHud(force) {
    var v = { life: s.life, gold: s.gold, energy: s.energy, turn: s.turn, phase: s.phase, draw: s.draw.length, disc: s.discard.length, hand: s.hand.length };
    if (!force && JSON.stringify(v) === JSON.stringify(last)) return;
    var energyChanged = force || v.energy !== last.energy, goldChanged = force || v.gold !== last.gold;
    last = v;
    $('h-life').textContent = s.life;
    $('h-gold').textContent = s.gold;
    $('h-turn').textContent = Math.min(s.turn + 1, s.totalTurns) + '/' + s.totalTurns;
    $('h-phase').textContent = s.phase === 'attack' ? '攻撃' : s.phase === 'prep' ? '準備' : '終了';
    var max = Math.max(G.RULES.energyPerTurn, s.energy), h = '';
    for (var i = 0; i < max; i++) h += '<span class="gem' + (i < s.energy ? ' on' : '') + '"></span>';
    $('h-energy').innerHTML = h + '<b class="en-num">' + s.energy + '</b>';
    $('h-draw').textContent = s.draw.length; $('h-disc').textContent = s.discard.length;
    $('draw-cost').textContent = G.RULES.extraDrawCost;
    $('btn-draw').disabled = s.gold < G.RULES.extraDrawCost || s.hand.length >= G.RULES.handMax || (s.phase !== 'prep' && s.phase !== 'attack');
    $('btn-go').disabled = s.phase !== 'prep';
    $('btn-go').textContent = s.phase === 'attack' ? '攻撃中…' : '攻撃開始';
    if (energyChanged || goldChanged) { markPoor(); if (ui.selTower) renderTowerSheet(); }
  }

  function enemyIcon(type) {
    var c = document.createElement('canvas'), img = SPR[type][0].l;
    c.width = 22; c.height = 18; c.getContext('2d').drawImage(img, Math.round((22 - img.width) / 2), 18 - img.height);
    return c;
  }
  function renderInfo() {
    var el = $('info'); el.innerHTML = '';
    if (s.phase === 'prep') {
      var lbl = document.createElement('span'); lbl.className = 'lbl'; lbl.textContent = '次の攻撃：'; el.appendChild(lbl);
      var byGate = {};
      G.Battle.nextWave(s).forEach(function (g) { (byGate[g.gate] = byGate[g.gate] || []).push(g); });
      Object.keys(byGate).sort().forEach(function (k) {
        var gt = document.createElement('span'); gt.className = 'gate'; gt.textContent = G.MAP.gateName[k]; el.appendChild(gt);
        byGate[k].forEach(function (g) {
          var ch = document.createElement('span'); ch.className = 'chip';
          ch.appendChild(enemyIcon(g.type));
          ch.appendChild(document.createTextNode(G.ENEMIES[g.type].name + '×' + g.n));
          el.appendChild(ch);
        });
      });
    } else if (s.phase === 'attack') {
      var left = s.spawnQueue.length + s.enemies.length;
      el.innerHTML = '<span class="lbl">残り ' + left + '体</span><span>攻撃中もカードを使えます</span>';
    }
  }

  function cardArt(type, big) {
    var img = SPR[type][0][0]; if (type === 'cannon') img = img.r;
    var c = document.createElement('canvas'); c.width = 24; c.height = 34;
    c.getContext('2d').drawImage(img, Math.round((24 - img.width) / 2), 34 - img.height);
    return c;
  }
  function renderHand() {
    var el = $('hand'); el.innerHTML = '';
    el.classList.toggle('two', s.hand.length > 4);
    s.hand.forEach(function (card, i) {
      var T = G.TOWERS[card.type], d = document.createElement('div');
      d.className = 'card' + (i === ui.selIndex ? ' sel' : '');
      d.dataset.index = i;
      d.setAttribute('role', 'button'); d.setAttribute('aria-label', T.name + ' エネルギー' + T.cost);
      d.innerHTML = '<span class="cost">' + T.cost + '</span>';
      d.appendChild(cardArt(card.type));
      var nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = T.name; d.appendChild(nm);
      bindCard(d, i);
      el.appendChild(d);
    });
    // 空いている枠（4枚に満たない時の目印）
    for (var k = s.hand.length; k < 4; k++) { var e = document.createElement('div'); e.className = 'card empty'; el.appendChild(e); }
    markPoor();
    requestAnimationFrame(fit);
  }
  function markPoor() {
    if (!s) return;
    document.querySelectorAll('#hand .card[data-index]').forEach(function (d) {
      var c = s.hand[+d.dataset.index]; if (!c) return;
      d.classList.toggle('poor', G.TOWERS[c.type].cost > s.energy);
    });
  }

  var toastT = 0, bannerT = 0;
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('show'); toastT = 1.6; }
  function showBanner(msg, cls) { var b = $('banner'); b.textContent = msg; b.className = 'banner show ' + cls; bannerT = 1.2; }

  // ---- 選択 ----
  function selectCard(i) {
    if (ui.selIndex === i) { deselect(); return; }
    closeTowerSheet();
    ui.selIndex = i; ui.selType = s.hand[i].type; ui.preview = null;
    var T = G.TOWERS[ui.selType];
    if (T.cost > s.energy) toast('エネルギーが足りません');
    else toast('置く場所をタップ');
    renderHand();
  }
  function deselect() {
    ui.selIndex = -1; ui.selType = null; ui.preview = null;
    document.querySelectorAll('#hand .card.sel').forEach(function (d) { d.classList.remove('sel'); });
  }
  function tryPlace(i, tx, ty) {
    var err = G.Battle.playCard(s, i, tx, ty);
    if (err) { toast(err); return false; }
    deselect(); renderHand(); renderHud(true);
    return true;
  }

  // ---- カードの操作：タップで選択／ドラッグで配置／長押しで詳細 ----
  function bindCard(el, i) {
    var st = null;
    el.addEventListener('pointerdown', function (e) {
      if (s.phase !== 'prep' && s.phase !== 'attack') return;
      st = { x: e.clientX, y: e.clientY, drag: false, long: false, ghost: null };
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      st.timer = setTimeout(function () { if (st && !st.drag) { st.long = true; showDetail(s.hand[i].type); } }, 450);
    });
    el.addEventListener('pointermove', function (e) {
      if (!st || st.long) return;
      var dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.drag && Math.hypot(dx, dy) > 10) {
        st.drag = true; clearTimeout(st.timer);
        closeTowerSheet();
        ui.selIndex = i; ui.selType = s.hand[i].type;
        st.ghost = el.cloneNode(true); st.ghost.classList.add('ghost'); st.ghost.style.width = el.offsetWidth + 'px';
        document.body.appendChild(st.ghost);
      }
      if (st.drag) {
        st.ghost.style.left = e.clientX + 'px'; st.ghost.style.top = e.clientY + 'px';
        ui.preview = tileFromClient(e.clientX, e.clientY);
        st.ghost.style.opacity = ui.preview ? '.25' : '.85';
      }
    });
    function end(e, cancel) {
      if (!st) return;
      clearTimeout(st.timer);
      if (st.ghost) st.ghost.remove();
      if (st.drag) {
        var t = cancel ? null : tileFromClient(e.clientX, e.clientY);
        if (t) { if (!tryPlace(i, t.tx, t.ty)) { ui.preview = null; renderHand(); } }
        else { deselect(); renderHand(); }
      } else if (!st.long && !cancel) selectCard(i);
      st = null;
    }
    el.addEventListener('pointerup', function (e) { end(e, false); });
    el.addEventListener('pointercancel', function (e) { end(e, true); });
  }

  function tileFromClient(x, y) {
    var r = cv.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
    var t = G.Render.toTile(x - r.left, y - r.top, r.width, r.height);
    if (t.tx < 0 || t.ty < 0 || t.tx >= G.MAP.cols || t.ty >= G.MAP.rowsN) return null;
    return t;
  }

  // ---- マップの操作 ----
  var mp = null;
  cv.addEventListener('pointerdown', function (e) {
    mp = { x: e.clientX, y: e.clientY };
    if (ui.selType && e.pointerType !== 'mouse') ui.preview = tileFromClient(e.clientX, e.clientY);
  });
  cv.addEventListener('pointermove', function (e) {
    if (ui.selType && (e.pointerType === 'mouse' || mp)) ui.preview = tileFromClient(e.clientX, e.clientY);
  });
  cv.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') ui.preview = null; });
  cv.addEventListener('pointerup', function (e) {
    if (!mp) return;
    var moved = Math.hypot(e.clientX - mp.x, e.clientY - mp.y) > 14; mp = null;
    if (moved && !ui.selType) return;
    var r = cv.getBoundingClientRect();
    if (ui.selType) {
      var t = tileFromClient(e.clientX, e.clientY);
      if (t && G.Battle.canPlaceAt(s, t.tx, t.ty)) { tryPlace(ui.selIndex, t.tx, t.ty); return; }
      var tw0 = G.Render.towerAt(s, e.clientX - r.left, e.clientY - r.top, r.width, r.height);
      if (tw0) { deselect(); renderHand(); openTowerSheet(tw0.id); return; }
      toast('そこには置けません');
      return;
    }
    var tw = G.Render.towerAt(s, e.clientX - r.left, e.clientY - r.top, r.width, r.height);
    if (tw) openTowerSheet(tw.id); else closeTowerSheet();
  });

  // ---- タワーの小窓（強化） ----
  function openTowerSheet(id) { ui.selTower = id; renderTowerSheet(); $('tower-sheet').hidden = false; }
  function closeTowerSheet() { ui.selTower = null; $('tower-sheet').hidden = true; }
  function renderTowerSheet() {
    var tw = G.Battle.findTower(s, ui.selTower); if (!tw) { closeTowerSheet(); return; }
    var T = G.TOWERS[tw.type], st = G.Battle.towerStats(tw), c = G.Battle.upgradeCost(tw);
    $('ts-name').textContent = T.name;
    $('ts-lv').textContent = 'Lv' + (tw.lv + 1) + '/' + (T.up.length + 1);
    var txt = '攻撃力 ' + st.dmg + '・射程 ' + st.range.toFixed(1) + 'マス・' + st.rate.toFixed(1) + '秒ごと';
    if (c !== null) {
      var n = T.up[tw.lv];
      txt += '<br>強化すると → 攻撃力 ' + n.dmg + '・射程 ' + n.range.toFixed(1);
    }
    $('ts-stats').innerHTML = txt;
    var up = $('ts-up');
    if (c === null) { up.textContent = '最大まで強化済み'; up.disabled = true; }
    else { up.textContent = '強化 ● ' + c; up.disabled = s.gold < c; }
  }
  $('ts-up').addEventListener('click', function () {
    var err = G.Battle.upgrade(s, ui.selTower);
    if (err) toast(err); renderTowerSheet(); renderHud(true);
  });
  $('ts-close').addEventListener('click', closeTowerSheet);

  // ---- 詳細（長押し） ----
  function showDetail(type) {
    var T = G.TOWERS[type], c = $('detail-art').getContext('2d');
    c.clearRect(0, 0, 34, 36);
    var img = SPR[type][0][0]; if (type === 'cannon') img = img.r;
    c.drawImage(img, Math.round((34 - img.width) / 2), 36 - img.height);
    $('d-name').textContent = T.name;
    $('d-text').textContent = T.text;
    $('d-stats').innerHTML = '<dt>エネルギー</dt><dd>' + T.cost + '</dd><dt>攻撃力</dt><dd>' + T.dmg + (T.dmgType === 'magic' ? '（魔法）' : '（物理）') +
      '</dd><dt>射程</dt><dd>' + T.range + 'マス</dd><dt>攻撃の間隔</dt><dd>' + T.rate + '秒</dd>' +
      (T.splash ? '<dt>爆発の広さ</dt><dd>' + T.splash + 'マス</dd>' : '') +
      '<dt>強化</dt><dd>● ' + T.up.map(function (u) { return u.cost; }).join(' → ● ') + '</dd>';
    $('detail').hidden = false;
    deselect(); renderHand();
  }
  $('d-close').addEventListener('click', function () { $('detail').hidden = true; });
  $('detail').addEventListener('click', function (e) { if (e.target === this) this.hidden = true; });

  // ---- ボタン ----
  $('btn-go').addEventListener('click', function () {
    G.Battle.startAttack(s); renderInfo(); renderHud(true);
  });
  $('btn-draw').addEventListener('click', function () {
    var err = G.Battle.extraDraw(s);
    if (err) toast(err); else { renderHand(); renderHud(true); }
  });
  $('btn-speed').addEventListener('click', function () {
    speed = speed === 1 ? 2 : 1;
    this.textContent = '×' + speed; this.setAttribute('aria-pressed', String(speed === 2));
  });

  // ---- 戦闘の出来事を画面に反映 ----
  function handleEvents() {
    var evs = s.events.splice(0);
    if (!evs.length) return;
    G.Render.addEvents(evs);
    var info = false;
    evs.forEach(function (e) {
      if (e.k === 'prep') { closeTowerSheetIfGone(); renderHand(); showBanner('準備ターン', 'prep'); info = true; }
      else if (e.k === 'attack') { showBanner('攻撃ターン', 'attack'); }
      else if (e.k === 'kill' || e.k === 'leak') info = true;
      else if (e.k === 'reshuffle') toast('捨て札を混ぜて山札に戻しました');
      else if (e.k === 'win' || e.k === 'lose') showResult(e.k === 'win');
    });
    if (info) renderInfo();
  }
  function closeTowerSheetIfGone() { if (ui.selTower && !G.Battle.findTower(s, ui.selTower)) closeTowerSheet(); }
  function showResult(win) {
    deselect(); closeTowerSheet();
    $('r-title').textContent = win ? '勝利！' : '敗北…';
    $('r-title').style.color = win ? 'var(--good)' : 'var(--bad)';
    $('r-text').innerHTML = (win ? s.totalTurns + '回の攻撃をすべてしのぎました。' : (s.turn + 1) + '回目の攻撃でライフが0になりました。') +
      '<br>倒した敵 ' + s.stats.killed + '体・通した敵 ' + s.stats.leaked + '体・建てたタワー ' + s.stats.built + '基<br>残りライフ ' + s.life;
    setTimeout(function () { $('result').hidden = false; }, 700);
    renderInfo();
  }

  // ---- 画面の大きさに合わせてマップを拡大 ----
  function fit() {
    var st = $('stage').getBoundingClientRect();
    var W = G.Render.W, H = G.Render.H, k = Math.min(st.width / W, st.height / H);
    var cw = Math.floor(W * k), ch = Math.floor(H * k);
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    var d = Math.min(window.devicePixelRatio || 1, 3);
    var bw = Math.round(cw * d), bh = Math.round(ch * d);
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
  }
  window.addEventListener('resize', fit);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);

  // ---- ゲームの時計 ----
  var prev = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    if (s) {
      ui.time += dt;
      // 速度2倍の時も細かく刻んで、弾が敵をすり抜けないようにする
      var left = dt * speed;
      while (left > 0) { var step = Math.min(left, 1 / 60); G.Battle.update(s, step); left -= step; }
      handleEvents();
      renderHud(false);
      if (s.phase === 'attack' && Math.floor(ui.time * 4) !== Math.floor((ui.time - dt) * 4)) renderInfo();
      G.Render.draw(s, ui, dt);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(G.Render.buf, 0, 0, cv.width, cv.height);
      if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('show'); }
      if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // 開発用：コンソールから状態を見られるように
  G.debug = { get state() { return s; }, ui: ui };
})();

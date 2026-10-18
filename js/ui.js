// 画面：スタート、手札、ボタン、タップ・ドラッグ・長押し、ゲームの時計
'use strict';
var G = window.G = window.G || {};

(function () {
  var $ = function (id) { return document.getElementById(id); };
  var SPR = G.buildSprites();
  var s = null;
  // pending：1回目のタップで仮に置いた場所（もう一度タップで建設が確定）
  var ui = { selIndex: -1, selType: null, selTower: null, preview: null, pending: null, time: 0 };
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
    s = G.Battle.create();
    closeGateInfo();
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
  // 攻撃中の残りの敵の数は上の帯に出す
  function renderInfo() {
    $('h-left').textContent = s.phase === 'attack' ? '残り' + (s.spawnQueue.length + s.enemies.length) + '体' : '';
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
      // 上の段：コストと名前（2段で重なっても見えるように）
      d.innerHTML = '<span class="top"><span class="cost">' + T.cost + '</span><span class="nm"></span></span>';
      d.querySelector('.nm').textContent = T.name;
      d.appendChild(cardArt(card.type));
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
    ui.selIndex = i; ui.selType = s.hand[i].type; ui.preview = null; ui.pending = null;
    var T = G.TOWERS[ui.selType];
    if (T.cost > s.energy) toast('エネルギーが足りません');
    else toast('置く場所をタップ');
    renderHand();
  }
  function deselect() {
    ui.selIndex = -1; ui.selType = null; ui.preview = null; ui.pending = null;
    document.querySelectorAll('#hand .card.sel').forEach(function (d) { d.classList.remove('sel'); });
  }
  // 1回目：仮置き（射程が見える）。同じマスをもう一度タップで建設
  function setPending(t) {
    ui.pending = { tx: t.tx, ty: t.ty }; ui.preview = ui.pending;
    toast('もう一度タップで建設');
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
        ui.selIndex = i; ui.selType = s.hand[i].type; ui.pending = null;
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
        // ドラッグで離した場所も仮置き。確定はタップで
        if (t && G.Battle.canPlaceAt(s, t.tx, t.ty)) { renderHand(); setPending(t); }
        else if (t) { ui.preview = null; renderHand(); toast('そこには置けません'); }
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
  });
  // マウスの時だけ、仮置き前はカーソルの場所に見本を出す
  cv.addEventListener('pointermove', function (e) {
    if (ui.selType && !ui.pending && e.pointerType === 'mouse') ui.preview = tileFromClient(e.clientX, e.clientY);
  });
  cv.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !ui.pending) ui.preview = null; });
  cv.addEventListener('pointerup', function (e) {
    if (!mp) return;
    var moved = Math.hypot(e.clientX - mp.x, e.clientY - mp.y) > 14; mp = null;
    if (moved && !ui.selType) return;
    var r = cv.getBoundingClientRect();
    var gk = G.Render.gateAt(s, e.clientX - r.left, e.clientY - r.top, r.width, r.height);
    if (gk) { openGateInfo(gk); return; }
    closeGateInfo();
    if (ui.selType) {
      var t = tileFromClient(e.clientX, e.clientY);
      if (t && G.Battle.canPlaceAt(s, t.tx, t.ty)) {
        if (ui.pending && ui.pending.tx === t.tx && ui.pending.ty === t.ty) tryPlace(ui.selIndex, t.tx, t.ty);
        else setPending(t);
        return;
      }
      var tw0 = G.Render.towerAt(s, e.clientX - r.left, e.clientY - r.top, r.width, r.height);
      if (tw0) { deselect(); renderHand(); openTowerSheet(tw0.id); return; }
      toast('そこには置けません');
      return;
    }
    var tw = G.Render.towerAt(s, e.clientX - r.left, e.clientY - r.top, r.width, r.height);
    if (tw) openTowerSheet(tw.id); else closeTowerSheet();
  });

  // ---- 入口の「！」をタップ → 次に来る敵 ----
  function openGateInfo(k) {
    if (ui.gateOpen === k) { closeGateInfo(); return; }
    ui.gateOpen = k;
    var el = $('gate-info'); el.innerHTML = '';
    var gt = document.createElement('span'); gt.className = 'gate'; gt.textContent = G.MAP.gateName[k] + 'から'; el.appendChild(gt);
    G.Battle.nextWave(s).filter(function (g) { return g.gate === k; }).forEach(function (g) {
      var row = document.createElement('div'); row.className = 'row';
      row.appendChild(enemyIcon(g.type));
      row.appendChild(document.createTextNode(G.ENEMIES[g.type].name + ' ×' + g.n));
      var sub = document.createElement('span'); sub.className = 'sub';
      sub.textContent = g.delay > 0 ? '（' + g.delay + '秒後から）' : '';
      row.appendChild(sub);
      el.appendChild(row);
    });
    el.hidden = false;
    // 「！」の真下に吹き出しを出す。はみ出す時は内側に寄せて、三角だけ「！」を指す
    var st = $('stage').getBoundingClientRect(), r = cv.getBoundingClientRect(), p = G.Render.gatePos(k);
    var gx = r.left - st.left + p.x * r.width, w = el.offsetWidth;
    var left = Math.max(8 + w / 2, Math.min(st.width - 8 - w / 2, gx));
    el.style.left = left + 'px';
    el.style.top = (r.top - st.top + p.y * r.height) + 'px';
    el.style.setProperty('--tip', (w / 2 + gx - left) + 'px');
  }
  function closeGateInfo() { ui.gateOpen = null; $('gate-info').hidden = true; }

  // ---- タワーの小窓（強化） ----
  function openTowerSheet(id) { ui.selTower = id; renderTowerSheet(); $('tower-sheet').hidden = false; }
  function closeTowerSheet() { ui.selTower = null; $('tower-sheet').hidden = true; }
  // 攻撃速度の表示：データは「何秒に1回」なので、1秒あたりの発数に直す（例：0.8秒 → 1.25発/s）
  function perSec(interval) { return (1 / interval).toFixed(2); }
  function renderTowerSheet() {
    var tw = G.Battle.findTower(s, ui.selTower); if (!tw) { closeTowerSheet(); return; }
    var T = G.TOWERS[tw.type], st = G.Battle.towerStats(tw), c = G.Battle.upgradeCost(tw);
    $('ts-name').textContent = T.name;
    $('ts-lv').textContent = 'Lv' + (tw.lv + 1) + '/' + (T.up.length + 1);
    var txt = '<span class="now">攻撃力 ' + st.dmg + '・射程 ' + st.range.toFixed(1) + 'マス・' + perSec(st.rate) + '発/s' +
      (st.splash ? '・爆発 ' + st.splash.toFixed(2).replace(/0$/, '') + 'マス' : '') + '</span>';
    var n = G.Battle.nextStats(tw);
    if (n) {
      // 変わる数値の後ろに (+4) のように差を書く
      // 色は「強くなる＝アップの赤／弱くなる＝ダウンの青」
      var d = function (a, b, dec, lowerIsBetter) {
        var v = +(b - a).toFixed(dec); if (v === 0) return '';
        var good = lowerIsBetter ? v < 0 : v > 0;
        return '<b class="' + (good ? 'd-up' : 'd-down') + '">(' + (v > 0 ? '+' : '') + v + ')</b>';
      };
      var w = function (x) { return '<span>' + x + '</span>'; };  // 項目の途中で改行しないように
      txt += '<span class="next">強化 → ' + w('攻撃力 ' + n.dmg + d(st.dmg, n.dmg, 0)) +
        '・' + w('射程 ' + n.range.toFixed(1) + d(st.range, n.range, 1)) +
        '・' + w(perSec(n.rate) + '発/s' + d(+perSec(st.rate), +perSec(n.rate), 2)) +
        (n.splash ? '・' + w('爆発 ' + n.splash.toFixed(2).replace(/0$/, '') + d(st.splash, n.splash, 2)) : '') + '</span>';
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
  // 閉じるボタンはなし：小窓の外（マップ以外も含む）をタップすると閉じる
  document.addEventListener('pointerdown', function (e) {
    if ($('tower-sheet').hidden) return;
    if ($('tower-sheet').contains(e.target) || e.target === cv) return;
    closeTowerSheet();
  }, true);

  // ---- 詳細（長押し） ----
  function showDetail(type) {
    var T = G.TOWERS[type], c = $('detail-art').getContext('2d');
    c.clearRect(0, 0, 34, 36);
    var img = SPR[type][0][0]; if (type === 'cannon') img = img.r;
    c.drawImage(img, Math.round((34 - img.width) / 2), 36 - img.height);
    $('d-name').textContent = T.name;
    $('d-text').textContent = T.text;
    $('d-stats').innerHTML = '<dt>エネルギー</dt><dd>' + T.cost + '</dd><dt>攻撃力</dt><dd>' + T.dmg + (T.dmgType === 'magic' ? '（魔法）' : '（物理）') +
      '</dd><dt>射程</dt><dd>' + T.range + 'マス</dd><dt>攻撃速度</dt><dd>' + perSec(T.rate) + '発/s</dd>' +
      (T.splash ? '<dt>爆発の広さ</dt><dd>' + T.splash + 'マス</dd>' : '') +
      '<dt>強化</dt><dd>● ' + T.up.map(function (u) { return u.cost; }).join(' → ● ') + '</dd>';
    $('detail').hidden = false;
    deselect(); renderHand();
  }
  $('d-close').addEventListener('click', function () { $('detail').hidden = true; });
  $('detail').addEventListener('click', function (e) { if (e.target === this) this.hidden = true; });

  // ---- ボタン ----
  $('btn-go').addEventListener('click', function () {
    closeGateInfo(); G.Battle.startAttack(s); renderInfo(); renderHud(true);
  });
  $('btn-draw').addEventListener('click', function () {
    var err = G.Battle.extraDraw(s);
    if (err) toast(err); else { renderHand(); renderHud(true); }
  });
  // ---- 山札・捨て札の内訳（山札は順番が分からないよう種類ごとの枚数だけ） ----
  function showPile(which) {
    var list = which === 'draw' ? s.draw : s.discard, count = {};
    list.forEach(function (c) { count[c.type] = (count[c.type] || 0) + 1; });
    $('p-title').textContent = (which === 'draw' ? '山札' : '捨て札') + '（' + list.length + '枚）';
    $('p-note').textContent = which === 'draw' ? '引く順番は分かりません。山札がなくなると捨て札を混ぜて山札に戻します。' : '使ったカードと、ターンの終わりに残った手札が入ります。';
    var ul = $('p-list'); ul.innerHTML = '';
    var types = Object.keys(G.TOWERS).filter(function (k) { return count[k]; });
    if (!types.length) ul.innerHTML = '<li class="none">カードはありません</li>';
    types.forEach(function (k) {
      var li = document.createElement('li');
      li.appendChild(cardArt(k));
      var nm = document.createElement('span'); nm.textContent = G.TOWERS[k].name; li.appendChild(nm);
      var n = document.createElement('b'); n.textContent = '×' + count[k]; li.appendChild(n);
      ul.appendChild(li);
    });
    $('pile').hidden = false;
  }
  $('btn-pile-draw').addEventListener('click', function () { showPile('draw'); });
  $('btn-pile-disc').addEventListener('click', function () { showPile('discard'); });
  $('p-close').addEventListener('click', function () { $('pile').hidden = true; });
  $('pile').addEventListener('click', function (e) { if (e.target === this) this.hidden = true; });

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
      if (e.k === 'prep') { closeTowerSheetIfGone(); deselect(); renderHand(); showBanner('準備ターン', 'prep'); info = true; }
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
    // 手札が1段の時も2段分の高さ（OVERLAP_EXTRA）を見込んでおき、枚数でマップの大きさが変わらないようにする
    var two = $('hand').classList.contains('two');
    var extra = two ? 0 : parseFloat(getComputedStyle($('hand')).getPropertyValue('--row2')) || 0;
    var W = G.Render.W, H = G.Render.H, k = Math.min(st.width / W, (st.height - extra) / H);
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
      G.Render.drawNums(ctx, cv.width / G.Render.W);
      if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('show'); }
      if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // 開発用：コンソールから状態を見られるように
  G.debug = { get state() { return s; }, ui: ui };
})();

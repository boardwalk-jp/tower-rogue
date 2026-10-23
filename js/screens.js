// ランの画面：スタート、ワールドマップ、報酬、イベント、商人、たき火、ランの終わり、カード選び
'use strict';
var G = window.G = window.G || {};

(function () {
  var $ = function (id) { return document.getElementById(id); };
  var R = G.Run, UI = G.BattleUI, SPR = G.SPR;
  var run = null;
  var KIND = { battle: '戦闘', elite: 'エリート', event: 'イベント', shop: '商人', rest: 'たき火', boss: 'ボス' };

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
    // 指揮官の名前と、炎＋アセンション（2026-10-23 戦闘画面の上の帯とそろえた）
    document.querySelectorAll('.rb-cmd').forEach(function (e) { e.textContent = (G.COMMANDERS[run.cmd] || {}).name || ''; });
    document.querySelectorAll('.rb-asc').forEach(function (e) { e.textContent = run.asc || 0; });
    document.querySelectorAll('.rb-asc-box').forEach(function (e) { e.classList.toggle('zero', !run.asc); });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  // 画面に入った直後は、ダブルタップの2回目が選択肢に当たらないように、短い間だけタップを無視する
  var TAP_LOCK_MS = 700;
  var tapLockUntil = 0, tapLockTimer = 0;
  function lockTaps(ms) {
    tapLockUntil = Date.now() + ms;
    var pn = $('panel'); pn.classList.add('tap-lock');
    clearTimeout(tapLockTimer);
    tapLockTimer = setTimeout(function () { pn.classList.remove('tap-lock'); }, ms);
  }
  // quiet：true なら押した時の「カチャッ」を鳴らさない（自分で別の音を鳴らすボタン用）
  function button(label, cls, fn, quiet) { var b = el('button', cls, label); b.type = 'button'; b.addEventListener('click', function (e) { if (Date.now() < tapLockUntil) return; if (G.Sound && !quiet) G.Sound.play('tap'); fn(e); }); return b; }
  function music(name) { if (G.Sound) G.Sound.music(name); }

  // ---- スタート画面 ----
  // ---- タイトルの背景：夕暮れの空・星・月・山・石の砦。タワーが魔物の行列に矢を撃つ（ずっと動く） ----
  // 2026-10-22 作り直し：戦闘画面と同じドット疑似3Dの絵（砦・木・タワー・敵）を使い、1.67倍の細かさ（240×426ドット）にした
  (function titleScene() {
    var cv = $('title-bg'), c = cv.getContext('2d'), W = cv.width, H = cv.height, DA = G.DotArt, ART = DA.build();
    c.imageSmoothingEnabled = false;
    function hsh(n) { var x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }
    function R2(g, col, x, y, w, h) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w || 1, h || 1); }
    var GY = 336, RY = 352, RH = 18;   // GY：地面の上のふち、RY：道の上のふち、RH：道の幅
    // 夕暮れの色をかぶせた絵を作る（昼の色の絵を、空になじませる）
    function dusk(cv0, a) {
      var o = DA.mk(cv0.width, cv0.height); o.c.drawImage(cv0, 0, 0);
      o.c.globalCompositeOperation = 'source-atop'; o.c.fillStyle = 'rgba(40,14,48,' + a + ')'; o.c.fillRect(0, 0, cv0.width, cv0.height);
      o.c.fillStyle = 'rgba(255,140,60,' + (a * 0.25).toFixed(2) + ')'; o.c.fillRect(0, 0, Math.round(cv0.width * 0.4), cv0.height);   // 左（夕日の側）を少しオレンジに
      return o.cv;
    }
    // ---- 動かない部分（空・月・山・砦・地面・道・木）は先に描いておく ----
    var bg = DA.mk(W, H), g = bg.c;
    var SKY = ['#0e0820', '#1a0e2e', '#2e1438', '#4a1a3a', '#742634', '#a83c2c', '#d8662e', '#f69a44', '#ffc46a'];
    for (var y = 0; y < GY; y++) {   // 色の帯。帯のさかい目は1ドットおきに混ぜる
      var k = Math.pow(y / GY, 1.35) * (SKY.length - 1.001), a = Math.floor(k), f = k - a;
      R2(g, SKY[a], 0, y, W, 1);
      if (f > 0.7) for (var x = (y & 1); x < W; x += 2) R2(g, SKY[a + 1], x, y);
    }
    // 月：明るい円・左上にハイライト・クレーター・まわりのうすい光
    DA.ell(g, 44, 34, 20, 20, 'rgba(255,233,192,.08)'); DA.ell(g, 44, 34, 15, 15, 'rgba(255,233,192,.1)');
    DA.disc(g, 44, 34, 11, '#f6dcae'); DA.disc(g, 42, 32, 9, '#ffe9c0'); R2(g, '#fff8e4', 38, 27, 3, 2);
    DA.disc(g, 40, 36, 2, '#e8c890'); DA.disc(g, 48, 30, 1, '#e8c890'); DA.disc(g, 47, 39, 2, '#ecd09c');
    // 山（奥・手前の2列）。上のふちは夕日で明るい
    function ridge(y0, amp, col, lit, seed) {
      for (var x = 0; x < W; x++) {
        var top = Math.round(y0 - Math.abs(Math.sin(x * 0.027 + seed) * amp) - Math.abs(Math.sin(x * 0.08 + seed * 2)) * amp * 0.35);
        R2(g, col, x, top, 1, GY - top); R2(g, lit, x, top, 1, 1);
        if (Math.sin(x * 0.027 + seed) * Math.cos(x * 0.027 + seed) < 0) R2(g, lit, x, top + 1, 1, 1);   // 左を向いた斜面は、ふちを2ドット明るく
      }
    }
    ridge(300, 44, '#4a1e3a', '#7a3448', 1.3); ridge(322, 28, '#2a1428', '#4a2236', 4.1);
    // 地面：戦闘画面の草原の色に、夕暮れの色をかぶせる
    var GC = ['#2f4a2c', '#283f27', '#34522f', '#2a4429'];
    for (y = GY; y < H; y++) for (x = 0; x < W; x++) { var h = hsh(x * 0.37 + y * 13.1); R2(g, GC[h < 0.55 ? 0 : h < 0.75 ? 1 : h < 0.9 ? 2 : 3], x, y); }
    for (var i = 0; i < 160; i++) { x = Math.round(hsh(i + 0.5) * W); y = Math.round(GY + 3 + hsh(i + 7.3) * (H - GY - 4)); R2(g, '#1c2e1c', x, y, 1, 2); R2(g, '#1c2e1c', x - 1, y + 1); R2(g, '#1c2e1c', x + 1, y + 1); }
    for (y = GY; y < GY + 6; y++) { g.fillStyle = 'rgba(240,120,60,' + (0.22 - (y - GY) * 0.035) + ')'; g.fillRect(0, y, W, 1); }   // 地平線の照り返し
    // 道（戦闘画面と同じ作り：上のふち＝かげ、下のふち＝光、まん中に小石）
    for (x = 0; x < W; x++) {
      var wob = Math.round(Math.sin(x * 0.11) * 0.8);
      R2(g, '#6a5236', x, RY + wob, 1, RH); R2(g, '#4a3824', x, RY + wob, 1, 2); R2(g, '#3a2c1c', x, RY + wob, 1, 1);
      R2(g, '#8a6c46', x, RY + RH - 3 + wob, 1, 2); R2(g, '#5e4a30', x, RY + RH - 1 + wob, 1, 1);
      if (hsh(x * 3.7) < 0.12) { R2(g, '#a88a62', x, RY + 5 + Math.round(hsh(x) * 8), 2, 1); R2(g, '#463420', x, RY + 6 + Math.round(hsh(x) * 8), 2, 1); }
    }
    // 木（遠く・左右）と岩
    [[10, GY + 4, 0], [226, GY + 6, 1], [140, GY + 2, 1]].forEach(function (q) { var sp = ART.tree[q[2]]; g.drawImage(dusk(sp.cv, 0.55), q[0] - sp.ax, q[1] - sp.ay); });
    var rk = ART.rock.grass; g.drawImage(dusk(rk.cv, 0.5), 96 - rk.ax, GY + 46 - rk.ay); g.drawImage(dusk(rk.cv, 0.5), 30 - rk.ax, GY + 62 - rk.ay);
    // 石の砦（右の丘の上）：戦闘画面の砦を夕暮れの色で
    var fort = ART.castle.grass, FX = 166, FY = RY + 4;   // 縦長の画面では左右が切れるので、砦は少し内側に
    DA.ell(g, FX + 3, FY, 52, 6, 'rgba(0,0,0,.35)');
    g.drawImage(dusk(fort.cv, 0.52), FX - fort.ax, FY - fort.ay);
    // ---- 動く部分 ----
    var stars = []; for (var i2 = 0; i2 < 70; i2++) stars.push({ x: Math.round(hsh(i2 + 1) * W), y: Math.round(hsh(i2 + 50) * 200), p: i2 * 0.7, big: i2 % 9 === 0 });
    var embers = [], arrows = [], mons = [], t = 0, spawnT = 0, last = performance.now();
    var MY = RY + 13;   // 魔物の足もと（道のまん中より少し手前）
    [-10, 30, 70].forEach(function (x0, i0) { mons.push({ type: ['goblin', 'slime', 'wolf'][i0], x: x0, hp: 7 }); });
    var TYPES = ['goblin', 'slime', 'wolf', 'orc', 'skeleton', 'goblin', 'bat', 'shaman'];
    var TOWERS = [{ type: 'bowman', lv: 2, x: 34, cd: 0 }, { type: 'frost', lv: 1, x: 64, cd: 0.5 }, { type: 'mage', lv: 1, x: 94, cd: 1 }];
    var TOWER_Y = RY + 1;   // タワーの足もと（道の上のふちのすぐ上）
    function frame(now) {
      var dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
      if (!$('start').hidden) {
        t += dt;
        c.drawImage(bg.cv, 0, 0);
        stars.forEach(function (st) { var a = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.3 + st.p)); c.globalAlpha = a * (1 - st.y / 260); c.fillStyle = '#fff6e0'; c.fillRect(st.x, st.y, 1, 1); if (st.big && a > 0.8) { c.fillRect(st.x - 1, st.y, 3, 1); c.fillRect(st.x, st.y - 1, 1, 3); } });
        c.globalAlpha = 1;
        // 砦の窓とたいまつの灯り（ゆらぐ）
        c.globalAlpha = 0.25 + 0.15 * Math.sin(t * 9); c.fillStyle = '#ffb040';
        DA.ell(c, FX - 13, FY - 18, 5, 4, '#ffb040'); DA.ell(c, FX + 13, FY - 18, 5, 4, '#ffb040'); c.globalAlpha = 1;
        // タワー（後ろ）
        TOWERS.forEach(function (tw) {
          var img = G.towerImg(tw.type, tw.lv, tw.fire > 0);
          DA.ell(c, tw.x + 3, TOWER_Y - 2, 11, 5, 'rgba(0,0,0,.35)');
          c.drawImage(img, Math.round(tw.x - img.width / 2), TOWER_Y - img.height);
          tw.cd -= dt; if (tw.fire > 0) tw.fire -= dt;
          var tgt = mons.filter(function (mo) { return mo.hp > 0 && Math.abs(mo.x - tw.x) < 70; })[0];
          if (tgt && tw.cd <= 0) { tw.cd = 1.6 + Math.random() * 1.0; tw.fire = 0.15; arrows.push({ x: tw.x, y: TOWER_Y - img.height + 10, tgt: tgt, col: tw.type === 'frost' ? '#bfe8ff' : tw.type === 'mage' ? '#c79bff' : '#ffffff' }); }
        });
        // 魔物の行列（左から砦へ）
        spawnT -= dt;
        if (spawnT <= 0) { spawnT = 1.1 + Math.random() * 1.0; var ty = TYPES[Math.floor(Math.random() * TYPES.length)]; mons.push({ type: ty, x: -24, hp: 7, fly: ty === 'bat' }); }
        for (var m = mons.length - 1; m >= 0; m--) {
          var mo = mons[m]; mo.x += dt * (mo.type === 'wolf' ? 22 : mo.type === 'orc' ? 9 : 14);
          var fr = Math.abs(Math.floor(t * 4 + m)) % 2, spr = SPR[mo.type][fr].r, my = mo.fly ? MY - 16 + Math.sin(t * 6 + m) * 1.5 : MY;
          DA.ell(c, Math.round(mo.x), MY, spr.sr || 5, 2, mo.fly ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.3)');
          c.drawImage(spr, Math.round(mo.x - spr.width / 2), Math.round(my - spr.height));
          if (mo.x > FX - 40 || mo.hp <= 0) {
            if (mo.hp <= 0) for (var q = 0; q < 10; q++) embers.push({ x: mo.x, y: my - 8, vx: (Math.random() - 0.5) * 40, vy: -Math.random() * 40, life: 0.6, col: '#ffd84a' });
            mons.splice(m, 1);
          }
        }
        // 矢（タワー→魔物）
        for (var a2 = arrows.length - 1; a2 >= 0; a2--) {
          var ar = arrows[a2], tx = ar.tgt.x, ty2 = ar.tgt.fly ? MY - 24 : MY - 8, dx = tx - ar.x, dy = ty2 - ar.y, d = Math.hypot(dx, dy);
          if (d < 5) { ar.tgt.hp--; for (var q2 = 0; q2 < 5; q2++) embers.push({ x: tx, y: ty2, vx: (Math.random() - 0.5) * 30, vy: -Math.random() * 30, life: 0.35, col: ar.col }); arrows.splice(a2, 1); continue; }
          ar.x += dx / d * 140 * dt; ar.y += dy / d * 140 * dt;
          c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(Math.round(ar.x) - 1, Math.round(ar.y), 4, 2);
          c.fillStyle = ar.col; c.fillRect(Math.round(ar.x), Math.round(ar.y), 3, 1);
        }
        // 火の粉（下からふわっと上る）
        if (Math.random() < 0.6) embers.push({ x: Math.random() * W, y: H, vx: (Math.random() - 0.5) * 8, vy: -16 - Math.random() * 20, life: 5, col: Math.random() < 0.5 ? '#ff9a3a' : '#ffd84a' });
        for (var e2 = embers.length - 1; e2 >= 0; e2--) {
          var em = embers[e2]; em.life -= dt; if (em.life <= 0) { embers.splice(e2, 1); continue; }
          em.x += em.vx * dt + Math.sin(t * 2 + e2) * 0.15; em.y += em.vy * dt;
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
      var where = G.ACTS[(r.act || 1) - 1].area + ' ' + (!n ? 'スタート地点' : G.dayOf(r.act || 1, n.floor, n.type === 'boss') + '日目' + (n.type === 'boss' ? 'ボス' : ''));
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
  music('cmd');   // はじめて開いた時から指揮官を選ぶ画面の曲（2026-10-22 オーナー指定。指揮官を選ぶ画面に進んでも切りかえずに続ける）。音は最初のタップのあとに出る
  // タイトル・メニュー・遊び方・データの画面のボタンは、押すと「カチャッ」（button() で作るボタンは、そちらで鳴らす）
  document.addEventListener('click', function (e) {
    var bt = e.target && e.target.closest ? e.target.closest('button') : null;
    if (!bt || bt.disabled || !G.Sound) return;
    if (bt.id === 'world-menu-btn' || bt.closest('#start, #title-menu, #world-menu, #help, #data-modal')) G.Sound.play('tap');
  }, true);

  // ブラウザに「このサイトのデータは消さないで」とお願いする（Safari 17〜。許可するかはブラウザが決める。結果は記録だけして画面には出さない）
  function askPersist() {
    try {
      if (!(navigator.storage && navigator.storage.persist)) return;
      if (localStorage.getItem('towerRogue.persist') === '1') return;
      navigator.storage.persist().then(function (ok) { try { localStorage.setItem('towerRogue.persist', ok ? '1' : '0'); } catch (e) {} }, function () {});
    } catch (e) {}
  }
  function start() {
    if (G.started || $('start').hidden) return;
    G.started = true;
    askPersist();
    $('start').hidden = true;
    var d = titleChoice === 'cont' ? loadSave() : null;
    if (d) continueRun(d); else chooseCommander();
  }
  // ---- 指揮官を選ぶ（はじめから） ----
  function chooseCommander() {
    // はじめての人には、指揮官を選ぶ前に遊び方を1回だけ出す
    var seen = false; try { seen = !!localStorage.getItem('towerRogue.helpSeen'); } catch (e) { seen = true; }
    if (!seen) setTimeout(showHelp, 50);
    music('cmd');   // 指揮官を選ぶ画面の曲
    openPanel('指揮官', function (body, foot) {
      if (G.cmdBg) $('panel').insertBefore(G.cmdBg(), $('panel').firstChild);   // 背景：砦の中庭（いちばん下の層）
      body.appendChild(el('h2', 'panel-title', '指揮官を選ぶ'));
      var list = el('div', 'choices cmd-list'), picked = null;
      // 始める時：BGMをいったん止めて、出陣のファンファーレ。ワールドマップの曲は、ファンファーレが終わってから始まる
      var ok = button('この指揮官で始める', 'go', function () { if (!picked) return; if (G.Sound) { G.Sound.music(null); G.Sound.play('start'); G.Sound.hold(1.5); } newRun(picked, ascPick); }, true);
      ok.disabled = true;
      Object.keys(G.COMMANDERS).forEach(function (id) {
        var C = G.COMMANDERS[id], b = button('', 'choice cmd', function () {
          list.querySelectorAll('.cmd').forEach(function (x) { x.classList.remove('sel'); });
          b.classList.add('sel'); list.classList.add('has-sel'); picked = id; ok.disabled = false;
        });
        // 指揮官の全身の絵（2026-10-22 新デザイン。前はタワーの絵）
        var cv = G.cmdPortrait ? G.cmdPortrait(id) : null;
        if (cv) b.appendChild(cv);
        var tx = el('span', 'cmd-txt');
        var hd = el('span', 'cmd-head'); hd.appendChild(el('b', 'cmd-name', C.name)); hd.appendChild(el('span', 'cmd-life', '♥ ' + C.life)); tx.appendChild(hd);
        // 能力＝指揮官のレリック（最初から持っている。レリックを見ればどの指揮官か分かる）
        if (C.relic) {
          var rl = el('small', 'cmd-relic'); rl.appendChild(UI.relicCanvas(C.relic));
          rl.appendChild(el('span', '', G.RELICS[C.relic].name + '：' + G.RELICS[C.relic].text)); tx.appendChild(rl);
        }
        // 初期デッキ：小さなカードの絵を並べる（同じカードは×枚数）。名前は下の1行に
        var cnt = {}, ord = []; C.deck.forEach(function (k) { if (!cnt[k]) ord.push(k); cnt[k] = (cnt[k] || 0) + 1; });
        var dk = el('span', 'cmd-deck-icons'); dk.setAttribute('aria-label', 'デッキ ' + C.deck.length + '枚');
        ord.forEach(function (k) { var it = el('span', 'cmd-dk'); it.appendChild(UI.cardArt(k)); if (cnt[k] > 1) it.appendChild(el('b', '', '×' + cnt[k])); dk.appendChild(it); });
        tx.appendChild(dk);
        tx.appendChild(el('small', 'cmd-deck', 'デッキ' + C.deck.length + '枚：' + ord.map(function (k) { return G.CARDS[k].name + (cnt[k] > 1 ? '×' + cnt[k] : ''); }).join('・')));
        tx.appendChild(el('small', 'cmd-sub', C.sub));
        b.appendChild(tx);
        list.appendChild(b);
      });
      body.appendChild(list);
      // ---- アセンション（難易度）：1回クリアすると出てくる。◀ ▶ で A0〜 を切りかえる。下の固定欄に置く（スクロールなしで見える） ----
      var maxA = Math.min(G.ASC_MAX, R.metaLoad().ascMax || 0), ascPick = maxA;   // 初めは、いちばん上の解放ずみアセンションを選んでおく（2026-10-22 オーナー指定）
      if (maxA > 0) {
        var row = el('div', 'asc-pick'), note = el('p', 'asc-note'), lbl = el('b', 'asc-label'), prev = button('◀', 'asc-arrow', function () { setAsc(ascPick - 1); }), next = button('▶', 'asc-arrow', function () { setAsc(ascPick + 1); });
        var setAsc = function (v) {
          ascPick = Math.max(0, Math.min(maxA, v));
          lbl.textContent = 'アセンション ' + ascPick; prev.disabled = ascPick <= 0; next.disabled = ascPick >= maxA;
          note.innerHTML = '';
          if (!ascPick) { note.textContent = 'A0：追加のルールなし。'; return; }
          // 選んだ段の効果だけを出す（前の段の分はのせない）。A1 以外は頭に「さらに、」（2026-10-22 オーナー指定）
          var cur = G.ASCENSION.filter(function (a) { return a.lv === ascPick; })[0];
          if (cur) { if (cur.tag) note.appendChild(el('b', '', cur.tag)); if (ascPick > 1) note.appendChild(document.createTextNode('さらに、')); note.appendChild(el('b', '', cur.text)); }
          note.appendChild(document.createTextNode('。経験値+' + ascPick * 10 + '%'));
        };
        row.appendChild(prev); row.appendChild(lbl); row.appendChild(next);
        foot.appendChild(row); foot.appendChild(note); setAsc(ascPick);
      }
      foot.appendChild(ok);
    });
  }
  function lastAsc() { try { return +localStorage.getItem('towerRogue.lastAsc') || 0; } catch (e) { return 0; } }
  // ユーザーが自分でスクロールした時だけアドレスバーが縮むので、スクロールを合図に始める
  // （メニューやデータの引き継ぎを開いている間は、入力でキーボードが出て画面がずれても、始めない）
  function modalOpen() { return !!document.querySelector('.modal:not([hidden])'); }
  window.addEventListener('scroll', function () { if (window.scrollY > 60 && !modalOpen()) start(); }, { passive: true });
  $('pc-start').addEventListener('click', start);

  function backToTitle() {
    save(lastResume);
    G.started = false;
    document.querySelectorAll('[data-screen]').forEach(function (e) { e.hidden = true; });
    G.currentScreen = 'start';
    $('start').hidden = false; music('cmd');   // タイトルも指揮官を選ぶ画面の曲
    refreshTitle();
    window.scrollTo(0, 0);
  }
  // メニュー：ワールドマップと戦闘画面（右上の「≡」）のどちらからでも開く。戦闘中は開いている間、戦闘を止める
  var MENU_NOTE = 'マスを1つ進めるたびに自動で保存しています。タイトルの「つづきから」で再開できます。';
  function openMenu() {
    var inBattle = G.currentScreen === 'game';
    G.paused = inBattle;
    $('wm-note').textContent = inBattle ? '戦闘は止まっています。タイトルに戻ると、「つづきから」はこの戦闘の始めからになります（この戦闘で置いたタワー・使ったカードはもどります）。' : MENU_NOTE;
    $('world-menu').hidden = false;
  }
  function closeMenu() { $('world-menu').hidden = true; G.paused = false; }
  $('world-menu-btn').addEventListener('click', openMenu);
  $('wm-close').addEventListener('click', closeMenu);
  $('wm-title').addEventListener('click', function () { closeMenu(); backToTitle(); });
  // 音の切り替え（効果音・BGM。このブラウザに覚えておく）
  function soundLabels() {
    if (!G.Sound) return;
    $('wm-se').textContent = '効果音：' + (G.Sound.get('se') ? 'オン' : 'オフ');
    $('wm-bgm').textContent = 'BGM：' + (G.Sound.get('bgm') ? 'オン' : 'オフ');
    $('tm-se').textContent = $('wm-se').textContent; $('tm-bgm').textContent = $('wm-bgm').textContent;
    ['wm', 'tm'].forEach(function (p) { $(p + '-sevol').value = G.Sound.getVol('se'); $(p + '-bgmvol').value = G.Sound.getVol('bgm'); });
  }
  // 音量バー（メニューとタイトルのどちらでも。動かすとすぐ変わり、このブラウザに覚える）
  ['wm', 'tm'].forEach(function (p) {
    $(p + '-sevol').addEventListener('input', function () { G.Sound.setVol('se', this.value); soundLabels(); });
    $(p + '-sevol').addEventListener('change', function () { if (G.Sound.get('se')) G.Sound.play('tap'); });   // 離した時に、今の大きさで1回鳴らす
    $(p + '-bgmvol').addEventListener('input', function () { G.Sound.setVol('bgm', this.value); soundLabels(); });
  });
  $('wm-se').addEventListener('click', function () { G.Sound.set('se', !G.Sound.get('se')); soundLabels(); });
  $('wm-bgm').addEventListener('click', function () { G.Sound.set('bgm', !G.Sound.get('bgm')); soundLabels(); });
  $('tm-se').addEventListener('click', function () { G.Sound.set('se', !G.Sound.get('se')); soundLabels(); });
  $('tm-bgm').addEventListener('click', function () { G.Sound.set('bgm', !G.Sound.get('bgm')); soundLabels(); });
  soundLabels();
  // 戦闘画面の見た目の切り替え（砦／黒）。メニューとタイトルのメニューのどちらでも（2026-10-23 オーナー指定。js/battleskin.js）
  function skinLabels() { if (!G.Skin) return; var t = '戦闘画面：' + (G.Skin.get() === 'classic' ? '黒' : '砦'); $('wm-skin').textContent = t; $('tm-skin').textContent = t; }
  ['wm', 'tm'].forEach(function (p) { $(p + '-skin').addEventListener('click', function () { if (G.Skin) G.Skin.toggle(); skinLabels(); }); });
  skinLabels();
  $('wm-test').addEventListener('click', function () {
    if (!G.Sound) { $('wm-sound-state').textContent = '音の仕組みが読み込まれていません。エラー：' + (window.__errs || []).join(' / '); return; }
    G.Sound.test();
    setTimeout(function () { var er = (window.__errs || []).slice(-3).join(' / '); $('wm-sound-state').textContent = '音の状態：' + G.Sound.state() + '。' + (er ? 'エラー：' + er : 'エラーなし') + '。鳴らない時はマナーモードと音量を確認してください。'; }, 400);
  });

  function newRun(cmdId, asc) {
    // 途中のランを残したまま新しく始めた時は、そのランを「やめた」として統計に送る（2026-10-22）
    var old = loadSave();
    if (old && old.run && G.Stats) { try { G.Stats.send(R.report(R.fromSave(old.run), 'abandon')); } catch (e) {} }
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
  // ボスの絵は大きく（高さ BOSS_H まで）。ボスの上に少し余白、ボスと直前の段（たき火）のあいだは BOSS_GAP あける（2026-10-22）
  var BOSS_H = 84, BOSS_TOP = 16, BOSS_GAP = 26;
  function bossY() { return BOSS_TOP + BOSS_H / 2; }
  function firstRowY() { return bossY() + BOSS_H / 2 + BOSS_GAP + NODE / 2; }
  function nodePos(n, width) {
    var lanes = 5, left = (width - LANE_W * (lanes - 1)) / 2;
    var F = run.world.floors;
    if (n.type === 'boss') return { x: left + n.lane * LANE_W, y: bossY() };
    return { x: left + n.lane * LANE_W, y: firstRowY() + (F - 1 - n.floor) * FLOOR_H };
  }
  // view：見るだけ（戦闘・イベント中に上の「マップ」ボタンから開いた時）。マスは選べず、「もどる」で元の画面へ
  var viewFrom = null;
  function showWorld(view) {
    view = view === true;
    if (!view) { lastResume = { type: 'map' }; save(lastResume); music('w' + run.act); viewFrom = null; }   // ワールドマップ専用の曲（w1〜w3）
    // 王の解任状の手放しが残っていたら（イベントで手に入れた後・途中でやめて再開した時）、マップを描いた後で選ばせる
    if (!view && run.dismiss > 0) setTimeout(function () { if (G.currentScreen === 'world' && $('picker').hidden) runDismiss(function () {}); }, 0);
    G.showScreen('world');
    $('world-menu-btn').hidden = view; $('world-back').hidden = !view;
    pendingNode = null;
    var box = $('world-map'), svg = $('world-lines'), width = Math.min(box.parentNode.clientWidth || 360, 420);
    var height = firstRowY() + (run.world.floors - 1) * FLOOR_H + PAD_Y;
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
      var ic = document.createElement('canvas'), bossId = n.type === 'boss' ? R.bossType(run) : '';
      if (bossId && SPR[bossId]) {
        // ボスマス：枠をなくして、そのボスの絵を大きく出す（どのボスが出るか、マップで見分けられる）
        var bi = SPR[bossId][0].r, bk = bi.nu ? BOSS_H / bi.height : 1.7, bw = Math.round(bi.width * bk), bh = Math.round(bi.height * bk);   // 新しい絵は高さ BOSS_H（84px）にそろえる
        ic.width = bi.width; ic.height = bi.height; ic.getContext('2d').drawImage(bi, 0, 0);
        ic.style.width = bw + 'px'; ic.style.height = bh + 'px';
        b.classList.add('boss-art');
        b.style.width = (bw + 14) + 'px'; b.style.height = (bh + 14) + 'px';
        b.style.left = (p.x - (bw + 14) / 2) + 'px'; b.style.top = (p.y - (bh + 14) / 2) + 'px';
      } else {
        if (n.type === 'boss') { b.style.width = b.style.height = '60px'; b.style.left = (p.x - 30) + 'px'; b.style.top = (p.y - 30) + 'px'; }
        ic.width = 14; ic.height = 14; ic.getContext('2d').drawImage(SPR.node[n.type], 0, 0);
      }
      b.appendChild(ic);
      b.setAttribute('aria-label', G.dayOf(run.act, n.floor, n.type === 'boss') + '日目 ' + KIND[n.type] + (bossId ? '：' + G.ENEMIES[bossId].name : ''));
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
    $('world').querySelector('.rb-title').textContent = A.area;   // 2026-10-23 「第1層 草原」→「草原」
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
      $('world-hint').textContent = (n.floor + 1 > run.world.floors ? 'ボス「' + R.bossName(run) + '」' : G.dayOf(run.act, n.floor) + '日目 ' + KIND[n.type]) + '：もう一度タップで進む';
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
      if (b.dataset.nav === 'menu') return openMenu();
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
    if (n.type === 'event') music('w' + run.act);   // イベント：ワールドマップの曲のまま（2026-10-22。前は専用の曲）
    if (n.type === 'event') return showEvent();
    if (n.type === 'shop') return showShop();
    if (n.type === 'rest') return showRest();
  }

  // ============================================================
  // 戦闘
  // ============================================================
  function startBattle(n) {
    var opts = R.battleOpts(run);
    music(n.type === 'boss' ? 'boss' : 'w' + run.act);   // ふつうの戦闘・エリート：ワールドマップの曲のまま（2026-10-22。前は戦闘の曲）。ボス戦は今までどおり
    // 上の帯：「草原 3日目エリート」（2026-10-23 オーナー指定。前は「1層3階エリート」）
    // 日数は地域が変わっても0にもどさない。1地域＝10マス＋ボス＝11日（ボスのマスも1日と数える）。例：雪山の最初のマス＝12日目
    var day = G.dayOf(run.act, n.floor, n.type === 'boss');
    var label = G.ACTS[run.act - 1].area + ' ' + day + '日目' + (n.type === 'boss' ? 'ボス' : n.type === 'elite' ? 'エリート' : '');
    var t0 = Date.now();
    UI.start(opts, function (s) {
      s.realSec = Math.round((Date.now() - t0) / 1000);   // 統計用：戦闘にかかった時間（秒）
      var first = n.type === 'boss' ? R.bossName(run) : '';
      R.finishBattle(run, s);
      if (run.over) { clearSave(); return showEnd(); }
      if (run.secondBoss) { run.secondBoss = false; return showSecondBoss(n, first); }   // A10：もう1体の3層ボス
      showReward(n, run.gold - s.gold, s);
    }, { label: label, cmdName: (G.COMMANDERS[run.cmd] || {}).name || '', asc: run.asc || 0, title: n.type === 'boss' ? (run.act >= G.RULES.acts ? 'ラスボス戦' : 'ボス戦') : n.type === 'elite' ? 'エリート戦' : '準備ターン' });
  }

  // ---- A10：3層ボスを倒した後、別の3層ボスが現れる（マップは動かない。タワーは引き継がず、新しい戦闘を最初から） ----
  function showSecondBoss(n, first) {
    lastResume = { type: 'node' }; save(lastResume);   // ここでやめても、つづきからは2体目のボス戦から
    music('boss');
    lockTaps(TAP_LOCK_MS);
    openPanel('ラスボス戦', function (body, foot) {
      body.appendChild(el('h2', 'panel-title lose', 'もう1体のボスが現れた！'));
      body.appendChild(el('p', 'panel-text', (first ? first + 'を倒した。' : '') + 'だが、その奥から「' + R.bossName(run) + '」が姿を現した。'));
      body.appendChild(el('p', 'panel-text', 'タワーはすべてくずれてしまった。もう一度、はじめから守りを固めよう（ライフ ' + run.life + '/' + run.maxLife + '）。'));
      foot.appendChild(button('戦う', 'go', function () { startBattle(n); }));
    });
  }

  // ---- 報酬：カード3枚から1枚（取らなくてもよい） ----
  function showReward(n, bonus, s, savedCards) {
    var big = n.type === 'elite' || n.type === 'boss';
    var cards = savedCards || R.rollCards(run, 3, n.type === 'boss' ? 'boss' : big ? 'elite' : 'battle');
    // ボスに勝った後は、報酬を選んだら次の層の案内へ
    var after = function () { runDismiss(function () { if (run.actClear) showActClear(); else showWorld(); }); };   // 王の解任状を取った時は、先に手放すカードを選ぶ
    lastResume = { type: 'reward', cards: cards, bonus: bonus, stats: { killed: s.stats.killed, leaked: s.stats.leaked, goldEarned: s.stats.goldEarned } };
    save(lastResume);
    openPanel(n.type === 'boss' ? 'ボス撃破' : n.type === 'elite' ? 'エリート撃破' : '勝利', function (body, foot) {
      body.appendChild(el('h2', 'panel-title', '勝利！'));
      body.appendChild(el('p', 'panel-text', '倒した敵 ' + s.stats.killed + '体・通した敵 ' + s.stats.leaked + '体。戦闘で得たお金 ●' + s.stats.goldEarned + '、勝利のおまけ ●' + bonus + '。'));
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
      choose(body, foot, cards, '受け取る', function (id) { R.logPick(run, n.type, cards, id); R.addCard(run, id); after(); }, 'カードを受け取らない', function () { R.logPick(run, n.type, cards, null); after(); });
    });
  }

  // ---- 層をクリア → 次の層へ ----
  function showActClear() {
    var A = G.ACTS[run.act - 1], N = G.ACTS[run.act];
    lastResume = { type: 'actclear' }; save(lastResume);
    openPanel(A.area + 'クリア', function (body, foot) {
      body.appendChild(el('h2', 'panel-title win', A.area + ' クリア！'));
      body.appendChild(el('p', 'panel-text', R.bossName(run) + 'を倒した。次は' + N.area + '。敵が強くなる。' + (G.RULES.actHeal >= 99 ? '進む時にライフが全回復する。' : '進む時にライフが' + G.RULES.actHeal + '回復する。')));
      foot.appendChild(button(N.area + 'へ進む', 'go', function () { R.nextAct(run); showWorld(); }));
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
    lockTaps(TAP_LOCK_MS);
    // イベントの場面の絵（js/eventart.js）
    // key：選んだ後の結果の絵（選択肢の番号。賭けは当たり・はずれで分ける）。結果の絵がない選択肢は元の絵のまま
    function eventArt(box, key) { var a = G.eventArt && G.eventArt(ev.id, run.act, key); if (a) box.appendChild(a); }
    openPanel('イベント', function (body, foot) {
      eventArt(body); body.appendChild(el('h2', 'panel-title', ev.title));
      body.appendChild(el('p', 'panel-text', ev.text));
      var list = el('div', 'choices');
      ev.choices.forEach(function (ch, ci) {
        var b = button('', 'choice', function () {
          var res = R.eventChoice(run, ch);
          if (!res.fail && ch.se && G.Sound) G.Sound.play(ch.se);   // 選んだ時の効果音（傭兵団の野営地など）
          renderRunBar();
          if (res.fail) { msg.textContent = res.msg; return; }
          R.logSet(run, 'ev', { id: ev.id, c: ci, r: ch.effect === 'gamble' ? (res.msg.indexOf('当たり') === 0 ? 'win' : 'lose') : undefined });
          var key = String(ci) + (ch.effect === 'gamble' ? (res.msg.indexOf('当たり') === 0 ? 'win' : 'lose') : '');
          function afterEvent(text, rid) { afterEventK(text, rid, key); }
          if (res.next === 'pickCopy') return pickFromDeck('複製するカードを選ぶ', function (i) { var id = run.deck[i]; R.addCard(run, id); afterEvent('「' + G.CARDS[id].name + '」をもう1枚手に入れた。'); }, true);
          if (res.next === 'pickRemove') return pickFromDeck('手放すカードを選ぶ', function (i) {
            var rnm = G.CARDS[run.deck[i]].name; R.removeCard(run, i);
            if (ch.effect === 'drill') { if (G.Sound) G.Sound.play('depart'); afterEvent(res.msg + '\n「' + rnm + '」を手放した。'); }   // 稽古：隊を去る足音
            else afterEvent('カードを手放した。');
          }, true);
          if (res.next === 'pickUpgrade') return pickFromDeck('鍛えるカードを選ぶ', function (i) { var nm = G.CARDS[run.deck[i]].name; R.upgradeCard(run, i); afterEvent('「' + nm + '」を鍛えて「' + G.CARDS[run.deck[i]].name + '」にした。'); }, true, null, R.canUpgradeCard);
          if (res.next === 'pickCard') {
            return openPanel('イベント', function (b2, f2) {
              eventArt(b2, key); b2.appendChild(el('h2', 'panel-title', ev.title));
              b2.appendChild(el('p', 'panel-text', res.msg + (res.noSuffix ? '' : ' カードを1枚えらぶ。')));
              choose(b2, f2, res.cards, '受け取る', function (id) { R.logPick(run, 'event', res.cards, id); R.addCard(run, id); afterEvent('「' + G.CARDS[id].name + '」を手に入れた。'); });
            });
          }
          afterEvent(res.msg, res.relic);
        }, !!ch.se);   // 専用の効果音がある選択肢は、ボタンの「カチャッ」を鳴らさない
        b.appendChild(el('b', '', ch.label));
        if (ch.note) b.appendChild(el('small', '', ch.note));
        if (R.choiceBlocked(run, ch)) b.disabled = true;   // お金・ライフが足りない選択肢は押せない（2026-10-23）
        list.appendChild(b);
      });
      body.appendChild(list);
      var msg = el('p', 'panel-sub'); body.appendChild(msg);
    });
    function afterEventK(text, rid, key) {
      if (run.life <= 0) { run.over = true; clearSave(); return showEnd(); }
      lastResume = { type: 'map' }; save(lastResume);   // 選択肢が決まった時点で保存（つづきからはマップに戻る）
      lockTaps(TAP_LOCK_MS);
      openPanel('イベント', function (body, foot) {
        eventArt(body, key); body.appendChild(el('h2', 'panel-title', ev.title));
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
    music('shop');   // 商人だけは商人の曲（2026-10-22 オーナー指定）。マップを見てから戻っても、とぎれずに続く
    // 同じ商人のマスにいる間は、出た時と同じ品ぞろえ（売り切れも）で入り直せる
    if (!run.shop || run.shop.node !== run.at) { var st0 = R.shopStock(run); run.shop = { node: run.at, cards: st0.cards, relic: st0.relic || null, used: { remove: false, heal: false } };
      R.logSet(run, 'shop', { o: st0.cards.map(function (it) { return it.id; }), r: st0.relic ? st0.relic.id : null }); }
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
            run.gold -= it.price; it.sold = true; R.logAdd(run, 'buy', it.id); R.addCard(run, it.id); render();
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
            run.gold -= rl.price; rl.sold = true; R.logAdd(run, 'buy', 'relic:' + rl.id); R.addRelic(run, rl.id); render();
            if (run.dismiss > 0) runDismiss(render);   // 王の解任状
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
          pickFromDeck('手放すカードを選ぶ（●' + R.price(run, P.remove) + '）', function (idx) { run.gold -= R.price(run, P.remove); used.remove = true; R.logAdd(run, 'buy', 'remove'); R.removeCard(run, idx); render(); }, false, render);
        });
        rm.appendChild(el('b', '', 'カードを1枚手放す')); rm.appendChild(el('small', '', used.remove ? '利用済み' : '● ' + R.price(run, P.remove)));
        rm.disabled = used.remove;
        var hl = button('', 'choice', function () {
          if (used.heal) return;
          if (run.gold < R.price(run, P.heal)) { say('お金が足りません'); return; }
          run.gold -= R.price(run, P.heal); used.heal = true; R.logAdd(run, 'buy', 'heal'); run.life = Math.min(run.maxLife, run.life + P.healAmount); render();
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
  // たき火：ライフ回復 または カードを1枚手放す
  // ============================================================
  // たき火の背景の絵を、画面のいちばん下の層に敷く（選択肢は上にそのまま並ぶ）
  function restBg() { if (G.restArt) $('panel').insertBefore(G.restArt(run ? run.act : 1), $('panel').firstChild); }
  function showRest() {
    lockTaps(TAP_LOCK_MS);
    // たき火：BGMはなし。うっすら風の音とたき火の音（火山はグツグツも）。ワールドマップに戻ると曲にもどる（2026-10-22）
    music(null); if (G.Sound && G.Sound.ambient) G.Sound.ambient(G.ACTS[run.act - 1].theme === 'volcano' ? 'volcano' : 'camp');
    openPanel('たき火', function (body, foot) {
      restBg();
      body.appendChild(el('h2', 'panel-title', 'たき火'));
      body.appendChild(el('p', 'panel-text', 'ひと休みできる。どれか1つを選ぶ。'));
      var list = el('div', 'choices');
      var a = button('', 'choice', function () { R.logSet(run, 'rest', 'heal'); var h = R.rest(run); done('ライフが' + h + '回復した。'); });
      a.appendChild(el('b', '', '休む')); a.appendChild(el('small', '', 'ライフ+' + G.RULES.restHeal + '（最大' + run.maxLife + '）'));
      var u = button('', 'choice', function () { pickFromDeck('鍛えるカードを選ぶ', function (i) { R.logSet(run, 'rest', 'up'); var nm = G.CARDS[run.deck[i]].name; R.upgradeCard(run, i); done('「' + nm + '」を鍛えて「' + G.CARDS[run.deck[i]].name + '」にした。'); }, false, showRest, R.canUpgradeCard); });
      u.appendChild(el('b', '', '鍛える')); u.appendChild(el('small', '', 'カードを1枚「＋」にする（タワーはLv2で置かれる・スキルは効果アップ）'));
      u.disabled = !run.deck.some(R.canUpgradeCard);
      // 2026-10-23 オーナー指定：「整理する」（カードを1枚手放す）はなくした。たき火は 休む／鍛える の2つ
      list.appendChild(a); list.appendChild(u);
      body.appendChild(list);
    });
    function done(text) {
      lastResume = { type: 'map' }; save(lastResume);
      lockTaps(TAP_LOCK_MS);
      openPanel('たき火', function (body, foot) {
        restBg();
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
    clearSave(); music(run.won ? 'clear' : 'defeat');   // クリアの曲・敗北の曲（2026-10-22）
    openPanel(run.won ? 'クリア' : '敗北', function (body, foot) {
      // 場面の絵（クリア＝朝日の砦と花火、敗北＝燃える砦）と、記録のタイル（2026-10-22 新デザイン）
      var art = G.eventArt && G.eventArt(run.won ? 'victory' : 'defeat', run.act); if (art) body.appendChild(art);
      body.appendChild(el('h2', 'panel-title ' + (run.won ? 'win' : 'lose'), (run.won ? '全地域クリア！' : '敗北…') + (run.asc ? '（アセンション' + run.asc + '）' : '')));
      var n = R.node(run), cmd = (G.COMMANDERS[run.cmd] || G.COMMANDERS.captain).name;
      body.appendChild(el('p', 'panel-text end-lead', cmd + '：' + (run.won ? 'ラスボスの' + (run.boss2Fight ? R.bossName(run, run.act, run.boss || 0) + 'と' : '') + R.bossName(run) + 'を倒した。' : G.ACTS[run.act - 1].area + 'の' + (n ? (n.type === 'boss' ? 'ボス戦' : G.dayOf(run.act, n.floor) + '日目') : '') + 'で力つきた。')));
      var tiles = el('div', 'end-stats');
      [['勝った戦闘', run.stats.battles + '回'], ['エリート', run.stats.elites + '回'], ['手に入れたカード', run.stats.cardsTaken + '枚'], ['最後のデッキ', run.deck.length + '枚'], ['レリック', run.relics.length + '個'], ['ライフ', Math.max(0, run.life) + '/' + run.maxLife]].forEach(function (q) {
        var d = el('div', 'end-stat'); d.appendChild(el('small', '', q[0])); d.appendChild(el('b', '', q[1])); tiles.appendChild(d);
      });
      body.appendChild(tiles);
      // 経験値（ランごとに1回だけ足す）
      if (!run.xpResult) run.xpResult = R.gainXp(run);
      // 統計：ランの記録を送る（1回だけ。送れなければ次に開いた時に送り直す。js/stats.js）
      if (!run.sent) { run.sent = true; if (G.Stats) { try { G.Stats.send(R.report(run, run.won ? 'win' : 'lose')); } catch (e) {} } }
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
    // 2026-10-23 オーナーの文章で書き直し（背景の話は「魔物」、操作の説明は「敵」）
    '<h3>目的</h3>',
    '<p>国の領地のあちこちで魔物の侵攻が始まった。砦に兵を集め、塔を築き、魔物の進軍を食い止めよう！</p>',
    '<p>砦の耐久値（<b class="c-life">♥</b>）が0になると敗北。すべての敵を倒せばステージクリア</p>',
    '<h3>地図</h3>',
    '<ul class="help-list">',
    '<li>{node:battle}<span><b>戦闘</b></span></li>',
    '<li>{node:elite}<span><b>エリート</b>：強い敵。勝つとレリック</span></li>',
    '<li>{node:event}<span><b>イベント</b>：選んだ結果で何かが起こる</span></li>',
    '<li>{node:shop}<span><b>商人</b>：お金でカード・レリックを買う</span></li>',
    '<li>{node:rest}<span><b>たき火</b>：回復か、カードを強くする</span></li>',
    '<li>{node:boss}<span><b>ボス</b>：倒すと次の地域へ</span></li>',
    '</ul>',
    '<h3>戦闘</h3>',
    '<p><b>準備ターン</b>：カードを使って塔や罠を置く</p>',
    '<ul class="help-list">',
    '<li><span><b class="c-en">◆ エネルギー</b>：カードを使う力。毎ターン全回復する</span></li>',
    '<li><span><b>■ カード</b>：毎ターン' + G.RULES.drawPerTurn + '枚引く。<b class="c-gold">●</b>を払って追加で引ける。使わなかった手札も毎ターン捨て札へ。山札をすべて引くとシャッフルされ、捨て札は山札に戻る</span></li>',
    '</ul>',
    '<p class="help-how">タワーの建て方：カードをタップ → 置きたいマスを<b>2回</b>タップで建設</p>',
    '<p><b>敵の攻撃ターン</b>：「攻撃開始」で敵が攻めてくる。敵が砦に着くと砦がダメージを受けて<b class="c-life">♥</b>が減ってしまうので、それまでに敵を倒そう！</p>',
    '<h3>塔の強化と狙う敵</h3>',
    '<ul class="help-list">',
    '<li><span>配置した塔をタップ → <b class="c-gold">●</b>で強化。狙う敵も変えられる。<b class="c-gold">●</b>は敵を倒すと手に入る</span></li>',
    '</ul>',
    '<h3>カード</h3>',
    '<ul class="help-list">',
    '<li>{tower:archer}<span><b>タワー</b>：近づいた敵を自動で攻撃</span></li>',
    '<li>{tower:spikes}<span><b>罠</b>：道の上にだけ置ける</span></li>',
    '<li>{tower:barracks}<span><b>兵舎</b>：兵士が道で敵を止める</span></li>',
    '<li>{icon:eye}<span><b>スキル</b>：タワーを強くする・カードを引く など</span></li>',
    '</ul>',
    '<p class="help-how">カードの詳細を見る：カードを長押し</p>',
    '<h3>その他用語</h3>',
    '<ul class="help-list">',
    '<li><span><b>レリック</b>：持っているだけで効果発動。エリート・ボス・商人・イベントで手に入る</span></li>',
    '<li><span><b>アセンション</b>：クリアすると、次の難しさを選べるようになる</span></li>',
    '</ul>',
    '<h3 id="help-save">記録を消さないために</h3>',
    '<p>ブラウザは、しばらく遊ばないと、このゲームの記録（経験値・解放・クリア）を消すことがあります。ホーム画面に追加すると、消えにくくなります。</p>',
    '<p><b>iPhone（Safari）</b></p>',
    '<ol><li>画面下の共有ボタン（四角から上向きの矢印）をタップ</li><li>「ホーム画面に追加」を選ぶ</li><li>できたアイコンから遊ぶ</li></ol>',
    '<p><b>Android（Chrome）</b></p>',
    '<ol><li>右上のメニュー（点が3つ）をタップ</li><li>「ホーム画面に追加」または「アプリをインストール」を選ぶ</li><li>できたアイコンから遊ぶ</li></ol>',
    '<p class="help-how">ホーム画面のアイコンから遊ぶと、それまでブラウザで遊んだ記録が引き継がれないことがあります。先に下の「データの引き継ぎ」で書き出しておくと安心です。</p>',
    '<h3>別の端末・ブラウザで遊ぶとき</h3>',
    '<p>記録はブラウザごとに別々です。「データの引き継ぎ」で書き出した文字を、新しい方で読み込むと、続きから遊べます（経験値・解放・アセンション・クリアの記録と、途中のラン。戦闘の途中だった時は、その戦闘の始めから）。</p>',
    '<p><button type="button" class="help-link" id="help-data">▶ データの引き継ぎを開く</button></p>',
    '<h3>ベータ版のご注意点</h3>',
    '<p>本作品はベータ版にて予告なくデザイン、バランスの調整を行うことがございます。皆様のプレイ統計データを見ながら調整する事で、より楽しく、奥深いゲームにする事を目指しておりますのでご理解いただけますととても嬉しいです</p>',
    '<p class="help-how">※ページの再読み込みをして頂くと自動的に最新のアップデートが反映されます</p>'
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
  function showHelp(anchorId) {
    var body = $('help-body');
    if (!body.dataset.done) { body.innerHTML = HELP.replace(/\{(\w+:\w+)\}/g, function (m, k) { return helpIcon(k); }); body.dataset.done = '1'; }
    body.scrollTop = 0;
    $('help').hidden = false;
    var an = typeof anchorId === 'string' && $(anchorId);
    if (an) body.scrollTop = an.offsetTop - body.offsetTop;
    try { localStorage.setItem('towerRogue.helpSeen', '1'); } catch (e) {}
  }
  $('help-close').addEventListener('click', function () { $('help').hidden = true; });
  $('t-help').addEventListener('click', function () { showHelp(); });
  $('t-save').addEventListener('click', function () { showHelp('help-save'); });
  $('wm-help').addEventListener('click', function () { closeMenu(); showHelp(); });
  $('help-body').addEventListener('click', function (e) { if (e.target.id === 'help-data') { $('help').hidden = true; openData(); } });
  G.showHelp = showHelp;


  // ============================================================
  // データの引き継ぎ（経験値・解放・クリアの記録と、途中のラン（つづきから）を、文字にして書き出す／読み込む）
  // 形：「TR1:」＋ JSON を base64 にした文字。save は途中のランがある時だけ入る（2026-10-22 追加。古い文字もそのまま読める）
  // ============================================================
  function exportData() {
    var o = { v: 1, meta: R.metaLoad(), asc: lastAsc() }, sv = loadSave();
    if (sv) o.save = sv;
    return 'TR1:' + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  }
  // 読み込める文字か調べる。だめなら null。よければ { meta, asc }
  function parseData(txt) {
    try {
      // 貼り付けで全角になった・小文字になった・空白や引用符が入った、などを直してから調べる
      txt = String(txt || '');
      if (txt.normalize) txt = txt.normalize('NFKC');
      txt = txt.replace(/[\s"'“”‘’「」]+/g, '');
      if (txt.slice(0, 4).toUpperCase() !== 'TR1:') return null;
      var o = JSON.parse(decodeURIComponent(escape(atob(txt.slice(4)))));
      if (!o || o.v !== 1 || !o.meta || typeof o.meta !== 'object') return null;
      var m = {};
      Object.keys(o.meta).forEach(function (k) { var v = o.meta[k]; if (typeof v === 'number' && isFinite(v) && v >= 0) m[k] = v; });
      if (typeof m.xp !== 'number') return null;
      if (m.ascMax > G.ASC_MAX) m.ascMax = G.ASC_MAX;
      var asc = Math.max(0, Math.min(G.ASC_MAX, +o.asc || 0));
      // 途中のラン：形が正しく、実際に読み込める時だけ使う（壊れていたら途中のランだけ無視する）
      var sv = null;
      if (o.save && o.save.v === 1 && o.save.run && typeof o.save.run === 'object') {
        try { R.fromSave(JSON.parse(JSON.stringify(o.save.run))); sv = { v: 1, at: +o.save.at || Date.now(), run: o.save.run, resume: o.save.resume || { type: 'map' } }; } catch (e2) { sv = null; }
      }
      return { meta: m, asc: asc, save: sv };
    } catch (e) { return null; }
  }
  var dataArmed = false;
  function openData() {
    $('dt-out').value = exportData(); $('dt-in').value = ''; $('dt-msg').textContent = ''; $('dt-msg').className = 'data-msg';
    dataArmed = false; $('dt-load').textContent = '読み込む';
    $('data-modal').hidden = false;
  }
  function dataMsg(t, bad) { $('dt-msg').textContent = t; $('dt-msg').className = 'data-msg' + (bad ? ' bad' : ''); }
  $('dt-copy').addEventListener('click', function () {
    var ta = $('dt-out'), txt = ta.value, done = function () { dataMsg('コピーしました。メモなどに貼り付けて保存してください。'); };
    ta.focus(); ta.select(); try { ta.setSelectionRange(0, txt.length); } catch (e) {}
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    if (ok) return done();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { dataMsg('コピーできませんでした。文字を長押ししてコピーしてください。', true); });
    else dataMsg('コピーできませんでした。文字を長押ししてコピーしてください。', true);
  });
  $('dt-in').addEventListener('input', function () { dataArmed = false; $('dt-load').textContent = '読み込む'; dataMsg(''); });
  $('dt-load').addEventListener('click', function () {
    var d = parseData($('dt-in').value);
    if (!d) { dataArmed = false; $('dt-load').textContent = '読み込む'; return dataMsg('この文字は読み込めません。「TR1:」から始まる文字を、最後まで貼り付けてください。', true); }
    if (!dataArmed) {
      var now = R.metaLoad(), has = !!loadSave();
      var runMsg = d.save ? (has ? '今の途中のランも、書き出した時の途中のランに置きかえます。' : '書き出した時の途中のランも入ります。')
                          : (has ? '（この文字に途中のランは入っていないので、今の途中のランはそのまま残ります）' : '');
      dataArmed = true; $('dt-load').textContent = '上書きして読み込む';
      return dataMsg('今の経験値 ' + now.xp + ' を、経験値 ' + d.meta.xp + ' の記録に置きかえます。' + runMsg + 'よければもう一度押してください。', true);
    }
    R.metaSave(d.meta);
    try { localStorage.setItem('towerRogue.lastAsc', String(d.asc)); } catch (e) {}
    if (d.save) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(d.save)); } catch (e) {} }
    dataArmed = false; $('dt-load').textContent = '読み込む'; $('dt-in').value = '';
    refreshTitle();
    dataMsg('読み込みました（経験値 ' + d.meta.xp + (d.save ? '・途中のランあり。タイトルの「つづきから」で続けられます' : '') + '）。');
  });
  $('dt-close').addEventListener('click', function () { $('data-modal').hidden = true; });
  $('wm-data').addEventListener('click', function () { closeMenu(); openData(); });
  // ---- タイトルのメニュー ----
  $('t-menu').addEventListener('click', function () { $('title-menu').hidden = false; });
  // ページの更新：最後に番号を付けて読み直し、保存された古いページを使わずに最新版を読み込む
  function reloadPage() { location.replace(location.pathname + '?r=' + Date.now()); }
  $('t-reload').addEventListener('click', reloadPage);
  $('tm-update').addEventListener('click', reloadPage);
  // ワールドマップ・戦闘のメニューから：「タイトルに戻る」と同じく今の状態を保存してから読み直す（戦闘中なら、つづきからはその戦闘の始めから）
  $('wm-update').addEventListener('click', function () { save(lastResume); reloadPage(); });
  // 更新で付けた番号は、読み込んだ後にアドレスから消す（ホーム画面に追加する時などに残らないように）
  if (/[?&]r=\d+/.test(location.search)) { try { history.replaceState(null, '', location.pathname + location.hash); } catch (_) {} }
  $('tm-close').addEventListener('click', function () { $('title-menu').hidden = true; });
  $('tm-help').addEventListener('click', function () { $('title-menu').hidden = true; showHelp(); });
  $('tm-data').addEventListener('click', function () { $('title-menu').hidden = true; openData(); });

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

  // ---- パネル画面（報酬・イベント・商人・たき火・終わり）の共通の入れ物 ----
  function openPanel(kind, fill) {
    G.showScreen('panel');
    $('panel-kind').textContent = kind;
    var body = $('panel-body'), foot = $('panel-foot');
    body.innerHTML = ''; foot.innerHTML = '';
    var oldBg = $('panel').querySelector('.panel-bg'); if (oldBg) oldBg.remove();   // 前の画面の背景の絵（たき火など）を外す
    body.scrollTop = 0;
    fill(body, foot);
    renderRunBar();
    UI.relicBar($('p-relics'), run ? run.relics : [], '');
  }

  // ---- デッキから1枚選ぶ ----
  // ok：選べるカードか（省略するとすべて選べる）。選べないカードは暗く出す
  // 王の解任状（2026-10-23）：デッキからカードを run.dismiss 枚まで手放す。「やめる」で残りは手放さずに終わる。終わったら then()
  function runDismiss(then) {
    if (!(run.dismiss > 0) || run.deck.length <= 1) { if (run.dismiss) { run.dismiss = 0; save(lastResume); } return then(); }
    pickFromDeck('手放すカードを選ぶ（あと' + run.dismiss + '枚）', function (i) {
      R.removeCard(run, i); run.dismiss--; save(lastResume);
      if (G.Sound) G.Sound.play('stamp');   // 解任状に判を押す音
      renderRunBar();
      runDismiss(then);
    }, false, function () { run.dismiss = 0; save(lastResume); then(); });
  }
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
    // 「やめる」：カードを選んで詳細が出ている時は、選ぶ前の状態（カード選び）に戻る。何も選んでいない時だけ、前の画面に戻る
    $('pk-cancel').onclick = function () {
      if (picked >= 0) {
        picked = -1;
        grid.querySelectorAll('.card').forEach(function (x) { x.classList.remove('sel'); });
        $('pk-ok').disabled = true;
        var t2 = document.createElement('p'); t2.id = 'pk-text'; t2.className = 'pk-text'; t2.textContent = 'カードをタップして選ぶ';
        $('pk-text').replaceWith(t2);
        return;
      }
      $('picker').hidden = true; if (onCancel) onCancel();
    };
    // 上の帯（マップ・デッキ・？・レリック）は隠さない：カードを選んでいる間も確かめられる
    var scr = document.querySelector('.screen:not([hidden])'), top = 0;
    if (scr) { var bar = scr.querySelector('.runbar'), rs = scr.querySelector('.relic-strip:not(:empty)'); top = Math.max(bar ? bar.getBoundingClientRect().bottom : 0, rs ? rs.getBoundingClientRect().bottom : 0); }
    $('picker').style.top = Math.round(top) + 'px';
    $('picker').hidden = false;
  }

  // 開発用
  G.Screens = { exportData: exportData, parseData: parseData, chooseCommander: chooseCommander, showRest: showRest, showEvent: showEvent, newRun: newRun, showWorld: showWorld, enterNode: enterNode, showEnd: showEnd, get run() { return run; } };
})();

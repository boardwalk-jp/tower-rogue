// 戦闘画面：手札、ボタン、タップ・ドラッグ・長押し、タワーの小窓、ゲームの時計
// G.BattleUI.start(opts, onEnd) で戦闘を始め、勝ち負けが決まると onEnd(戦闘の状態) を呼ぶ
'use strict';
var G = window.G = window.G || {};

(function () {
  var $ = function (id) { return document.getElementById(id); };
  var SPR = G.buildSprites();
  var B = G.Battle;
  var s = null, onEnd = null, ended = false, info = {};
  // selIndex：選んでいるカード。selType：タワーカードならタワーの種類。selSkill：スキルカードならその定義
  // pending：1回目のタップで仮に置いた場所。pendingTower：タワー対象スキルで1回目にタップしたタワー
  var ui = { selIndex: -1, selType: null, selSkill: null, selTower: null, preview: null, pending: null, pendingTower: null, pendingHand: null, time: 0 };
  var speed = 1;
  var cv = $('map'), ctx = cv.getContext('2d');

  // ---- Safari の長押しメニュー・文字選択・拡大を止める ----
  // （ただし入力欄では止めない：データの引き継ぎで、長押しコピー・貼り付けを使うため）
  function inField(e) { return e.target && e.target.closest && e.target.closest('textarea, input'); }
  document.addEventListener('contextmenu', function (e) { if (!inField(e)) e.preventDefault(); });
  document.addEventListener('selectstart', function (e) { if (!inField(e)) e.preventDefault(); });
  // ---- 画面の拡大を止める（iPhone の Safari は「拡大しない」設定を無視するので、自分で止める） ----
  function zoomed() { return window.visualViewport && window.visualViewport.scale > 1.01; }
  // もし拡大されてしまったら、ピンチで戻せるようにする（拡大中だけ2本指の操作を通す）
  ['gesturestart', 'gesturechange'].forEach(function (n) { document.addEventListener(n, function (e) { if (!zoomed()) e.preventDefault(); }); });
  // ダブルタップでの拡大を止める：0.35秒以内の2回目のタップは拡大の合図にさせない。
  // その代わり、ボタンなら押したことにする（速く2回押した時に2回目が消えないように）
  var lastTouchEnd = 0;
  document.addEventListener('touchend', function (e) {
    var now = Date.now(), quick = now - lastTouchEnd < 350;
    lastTouchEnd = now;
    if (!quick || e.touches.length) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    e.preventDefault();
    var btn = e.target.closest && e.target.closest('button'), tgt = btn || e.target;
    if (!(btn && btn.disabled) && typeof tgt.click === 'function') tgt.click();
  }, { passive: false });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });
  // それでも拡大された・横にずれた時は、元の大きさ・位置に戻す
  // （画面の設定を一度ちがう値に書きかえてから戻すと、iPhone は倍率を1に戻す）
  var vpMeta = document.querySelector('meta[name=viewport]'), vpBase = vpMeta ? vpMeta.getAttribute('content') : '';
  function fixView() {
    if (window.scrollX) window.scrollTo(0, window.scrollY);
    if (!vpMeta || !zoomed()) return;
    vpMeta.setAttribute('content', 'width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=0,viewport-fit=cover');
    setTimeout(function () { vpMeta.setAttribute('content', vpBase); if (window.scrollX) window.scrollTo(0, window.scrollY); }, 80);
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () { setTimeout(fixView, 250); });
    window.visualViewport.addEventListener('scroll', function () { if (!zoomed() && window.visualViewport.offsetLeft) setTimeout(fixView, 100); });
  }
  window.addEventListener('scroll', function () { if (window.scrollX) window.scrollTo(0, window.scrollY); }, { passive: true });
  document.addEventListener('touchend', function () { setTimeout(fixView, 50); }, { passive: true });
  window.addEventListener('load', fixView);
  window.addEventListener('pageshow', fixView);
  // ゲーム中は画面がスクロールしないように（細くなったアドレスバーを戻さないため）。.scroll-y の中だけはスクロールできる
  document.addEventListener('touchmove', function (e) {
    if (e.touches.length > 1 && zoomed()) return;   // 拡大中のピンチ（元に戻す操作）は止めない
    if (e.target.closest && e.target.closest('input[type=range]')) return;   // 速度のつまみは動かせるように
    if (!G.started) return;
    if (e.target.closest && e.target.closest('.scroll-y')) return;
    e.preventDefault();
  }, { passive: false });

  // ============================================================
  // カードの見た目（手札・報酬・商人・デッキ一覧で共通）
  // ============================================================
  function cardArt(id) {
    var def = G.CARDS[id], c = document.createElement('canvas');
    if (def.kind === 'tower') {
      var img = G.towerImg(def.tower, 0, false);
      c.width = 26; c.height = 34;
      G.drawTowerFit(c.getContext('2d'), img, 26, 34);
    } else {
      c.width = 26; c.height = 26;
      c.getContext('2d').drawImage(SPR.icon[def.icon], 5, 5);
    }
    return c;
  }
  // card：{ id, cost?, temp? }（手札のカード）または カードのid
  function cardEl(card) {
    if (typeof card === 'string') card = { id: card };
    var def = G.CARDS[card.id], cost = card.cost !== undefined ? card.cost : def.cost;
    var d = document.createElement('div');
    d.className = 'card ' + (def.kind === 'skill' ? 'skill' : 'tower') + ' r-' + def.rarity + (def.plus ? ' plus' : '');
    d.setAttribute('role', 'button'); d.setAttribute('aria-label', def.name + ' エネルギー' + cost);
    d.innerHTML = '<span class="top"><span class="cost">' + cost + '</span><span class="nm"></span></span>';
    d.querySelector('.nm').textContent = def.name;
    d.appendChild(cardArt(card.id));
    if (card.temp || def.exhaust) { var tg = document.createElement('span'); tg.className = 'tag'; tg.textContent = '使い切り'; d.appendChild(tg); }
    return d;
  }

  // ============================================================
  // レリックの列（アイコンだけ。タップで説明）。ワールドマップと戦闘画面で共通
  // ============================================================
  var RARITY = { starter: '初期', common: 'ノーマル', uncommon: 'アンコモン', rare: 'レア' };
  function relicBar(box, relics, emptyText) {
    box.innerHTML = '';
    if (!relics.length) { if (emptyText) { var sp = document.createElement('span'); sp.className = 'relic-none'; sp.textContent = emptyText; box.appendChild(sp); } return; }
    var cnt = {}, order = [];
    relics.forEach(function (id) { if (!cnt[id]) order.push(id); cnt[id] = (cnt[id] || 0) + 1; });
    order.forEach(function (id) {
      var R2 = G.RELICS[id], b = document.createElement('button');
      b.type = 'button'; b.className = 'relic-ico r-' + R2.rarity; b.setAttribute('aria-label', R2.name + (cnt[id] > 1 ? ' ×' + cnt[id] : ''));
      var c = relicCv(id); b.appendChild(c);
      if (cnt[id] > 1) { var n = document.createElement('b'); n.className = 'relic-n'; n.textContent = '×' + cnt[id]; b.appendChild(n); }
      b.addEventListener('click', function () { if (G.Sound) G.Sound.play('tap'); showRelic(id, cnt[id]); });
      box.appendChild(b);
    });
  }
  // レリックの絵を、絵と同じ大きさの canvas に写す（新しい絵は20×20、古い絵は14×14）
  function relicCv(id) { var im = G.relicIcon(id), c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0); return c; }
  // レリックのアイコン（枠の色＝レア度）
  function relicCanvas(id, cls) {
    var w = document.createElement('span'); w.className = 'relic-ico r-' + G.RELICS[id].rarity + (cls ? ' ' + cls : '');
    var c = relicCv(id); w.appendChild(c);
    return w;
  }
  function showRelic(id, n) {
    var R2 = G.RELICS[id];
    $('p-title').textContent = R2.name + (n > 1 ? '　×' + n : '');
    $('p-note').innerHTML = '';
    var p1 = document.createElement('span'); p1.className = 'rar-label r-' + R2.rarity; p1.textContent = RARITY[R2.rarity]; $('p-note').appendChild(p1);
    $('p-note').appendChild(document.createTextNode('　' + R2.text + '（' + (R2.kind === 'commander' ? '指揮官の印・最初から持っている' : R2.kind === 'change' ? '遊び方が変わる' : R2.kind === 'combo' ? '組み合わせで強くなる' : '数値が上がる') + '）' + (n > 1 ? '　同じものを' + n + '個持っているので、効果が' + n + '回分重なる。' : '')));
    var ul = $('p-list'); ul.innerHTML = ''; ul.classList.remove('mini-cards');
    var li = document.createElement('li'); li.className = 'relic-big';
    var c = relicCv(id); li.appendChild(c);
    ul.appendChild(li);
    $('pile').hidden = false;
  }

  // ============================================================
  // 戦闘の開始
  // ============================================================
  function start(opts, cb, extra) {
    s = B.create(opts); onEnd = cb; ended = false; info = extra || {}; freeze = 0;
    G.Render.clearFx();
    closeGateInfo(); closeTowerSheet(); deselect();
    s.events = [];
    G.showScreen('game');
    renderHand(); renderInfo(); renderHud(true);
    relicBar($('b-relics'), s.relics, '');
    showBanner(info.title || '準備ターン', 'prep');
    requestAnimationFrame(fit);
  }

  // ---- 表示 ----
  var last = {};
  function renderHud(force) {
    var v = { life: s.life, gold: s.gold, energy: s.energy, turn: s.turn, phase: s.phase, draw: s.draw.length, disc: s.discard.length, hand: s.hand.length };
    if (!force && JSON.stringify(v) === JSON.stringify(last)) return;
    var energyChanged = force || v.energy !== last.energy, goldChanged = force || v.gold !== last.gold;
    last = v;
    $('h-life').textContent = s.life + '/' + s.maxLife;
    $('h-gold').textContent = s.gold;
    $('h-floor').textContent = info.label || '';
    $('h-cmd').textContent = info.cmdName || '';                  // 指揮官の名前（2026-10-23）
    $('h-asc').textContent = info.asc || 0;                       // アセンション（炎のアイコンの横）
    $('h-asc-box').classList.toggle('zero', !info.asc);
    $('h-turn').textContent = Math.min(s.turn + 1, s.totalTurns) + '/' + s.totalTurns;
    $('h-phase').textContent = s.phase === 'attack' ? '攻撃' : s.phase === 'prep' ? '準備' : '終了';
    var max = Math.max(G.RULES.energyPerTurn, s.energy), h = '';
    for (var i = 0; i < max; i++) h += '<span class="gem' + (i < s.energy ? ' on' : '') + '"></span>';
    $('h-energy').innerHTML = h + '<b class="en-num">' + s.energy + '</b>';
    $('h-draw').textContent = s.draw.length; $('h-disc').textContent = s.discard.length;
    $('h-deck').textContent = s.draw.length + s.hand.length + s.discard.length;   // デッキのアイコンの枚数：この戦闘で回っているカード全部（2026-10-23）
    $('draw-cost').textContent = G.RULES.extraDrawCost;
    $('btn-draw').disabled = s.gold < G.RULES.extraDrawCost || s.hand.length >= G.RULES.handMax || (s.phase !== 'prep' && s.phase !== 'attack');
    $('btn-go').disabled = s.phase !== 'prep';
    $('btn-go').textContent = s.phase === 'attack' ? '攻撃中…' : '攻撃開始';
    if (energyChanged || goldChanged) { markPoor(); if (ui.selTower) renderTowerSheet(); }
  }

  function enemyIcon(type) {
    var c = document.createElement('canvas'), img = SPR[type][0].l;
    var w = Math.max(22, img.width), h = Math.max(18, img.height);
    c.width = w; c.height = h; c.style.width = (w * 22 / Math.max(22, img.width)) + 'px';
    c.getContext('2d').drawImage(img, Math.round((w - img.width) / 2), h - img.height);
    return c;
  }
  // 攻撃中の残りの敵の数は上の帯に出す
  function renderInfo() {
    $('h-left').textContent = s.phase === 'attack' ? '残り' + (s.spawnQueue.length + s.enemies.length) + '体' : '';
  }

  function renderHand() {
    var el = $('hand'); el.innerHTML = '';
    el.classList.toggle('two', s.hand.length > 4);
    s.hand.forEach(function (card, i) {
      var d = cardEl({ id: card.id, temp: card.temp, cost: B.cardCost(card, s) });
      if (i === ui.selIndex) d.classList.add('sel');
      if (ui.pendingHand !== null && card.uid === ui.pendingHand) { d.classList.add('out-pick'); var om = document.createElement('span'); om.className = 'out-mark'; d.appendChild(om); }   // 作戦変更で外す候補
      d.dataset.index = i;
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
      d.classList.toggle('poor', B.cardCost(c, s) > s.energy);
    });
  }

  var toastT = 0, bannerT = 0;
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('show'); toastT = 1.6; }
  function showBanner(msg, cls) { var b = $('banner'); b.textContent = msg; b.className = 'banner show ' + cls; bannerT = 1.2; }

  // ============================================================
  // カードを選ぶ・使う
  //  タワー：選ぶ → マスをタップ（仮置き）→ 同じマスをもう一度タップで建設
  //  タワー対象スキル：選ぶ → タワーをタップ（仮選択）→ 同じタワーをもう一度タップで使う
  //  対象なしスキル：選ぶ → 同じカードをもう一度タップで使う
  // ============================================================
  function selectCard(i) {
    var card = s.hand[i], def = B.cardDef(card);
    if (G.Sound) G.Sound.play('card');
    // 手札を対象にするスキル（作戦変更）を選んでいる時：ほかの手札をタップ → 外す候補（×印）。同じカードをもう一度タップで使う
    if (ui.selSkill && ui.selSkill.target === 'hand' && ui.selIndex >= 0 && ui.selIndex !== i) {
      if (ui.pendingHand === card.uid) { useSkill(ui.selIndex, null, { hand: card.uid }); return; }
      ui.pendingHand = card.uid; toast('もう一度タップで外す'); renderHand(); return;
    }
    if (ui.selIndex === i) {
      if (def.kind === 'skill' && (def.target === 'none' || (def.target === 'hand' && s.hand.length === 1))) { useSkill(i, null); return; }
      if (def.target === 'hand' && ui.pendingHand !== null) { useSkill(i, null, { hand: ui.pendingHand }); return; }   // ×印をつけた後、作戦変更をもう一度タップでも使える
      deselect(); renderHand(); return;
    }
    closeTowerSheet();
    deselect();
    ui.selIndex = i;
    if (def.kind === 'tower') ui.selType = def.tower; else ui.selSkill = def;
    if (B.cardCost(card, s) > s.energy) toast('エネルギーが足りません');
    else if (def.kind === 'tower') toast('置く場所をタップ');
    else if (def.target === 'tower') toast(s.towers.length ? '使うタワーをタップ' : '先にタワーを建ててください');
    else if (def.target === 'hand' && s.hand.length > 1) toast('外すカードをタップ');
    else toast('もう一度タップで使う');
    renderHand();
  }
  function deselect() {
    ui.selIndex = -1; ui.selType = null; ui.selSkill = null; ui.preview = null; ui.pending = null; ui.pendingTower = null; ui.pendingHand = null;
    document.querySelectorAll('#hand .card.sel').forEach(function (d) { d.classList.remove('sel'); });
  }
  // 1回目：仮置き（射程が見える）。同じマスをもう一度タップで建設
  // swipe：ドラッグ（スワイプ）で仮置きした時だけ true。その時は仮置きの周り1マス（ななめ含む）のタップでも建設する
  function setPending(t, swipe) {
    ui.pending = { tx: t.tx, ty: t.ty, swipe: !!swipe }; ui.preview = ui.pending;
    toast('もう一度タップで建設');
  }
  function tryPlace(i, tx, ty) {
    var err = B.playCard(s, i, { tx: tx, ty: ty });
    if (err) { toast(err); return false; }
    deselect(); renderHand(); renderHud(true);
    return true;
  }
  // target：作戦変更の時だけ { hand: 外すカードの uid }
  function useSkill(i, towerId, target) {
    var def = B.cardDef(s.hand[i]);
    var err = B.playCard(s, i, target || (towerId ? { tower: towerId } : null));
    if (err) { toast(err); return false; }
    toast(def.name + 'を使った');
    deselect(); renderHand(); renderHud(true);
    if (ui.selTower) renderTowerSheet();
    return true;
  }

  // ---- カードの操作：タップで選択／ドラッグで配置／長押しで詳細 ----
  function bindCard(el, i) {
    var st = null;
    el.addEventListener('pointerdown', function (e) {
      if (s.phase !== 'prep' && s.phase !== 'attack') return;
      st = { x: e.clientX, y: e.clientY, drag: false, long: false, ghost: null };
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      st.timer = setTimeout(function () { if (st && !st.drag) { st.long = true; showDetail(s.hand[i].id); } }, 450);
    });
    el.addEventListener('pointermove', function (e) {
      if (!st || st.long) return;
      var dx = e.clientX - st.x, dy = e.clientY - st.y, def = B.cardDef(s.hand[i]);
      if (!st.drag && Math.hypot(dx, dy) > 10) {
        if (def.kind === 'skill' && (def.target === 'none' || def.target === 'hand')) return;   // 対象なし・手札が対象のスキルはドラッグしない
        st.drag = true; clearTimeout(st.timer);
        closeTowerSheet(); deselect();
        ui.selIndex = i;
        if (def.kind === 'tower') ui.selType = def.tower; else ui.selSkill = def;
        st.ghost = el.cloneNode(true); st.ghost.classList.add('ghost'); st.ghost.style.width = el.offsetWidth + 'px';
        document.body.appendChild(st.ghost);
      }
      if (st.drag) {
        st.ghost.style.left = e.clientX + 'px'; st.ghost.style.top = e.clientY + 'px';
        if (ui.selType) ui.preview = tileFromClient(e.clientX, e.clientY);
        else { var tw = towerFromClient(e.clientX, e.clientY); ui.pendingTower = tw ? tw.id : null; }
        st.ghost.style.opacity = (ui.preview || ui.pendingTower) ? '.25' : '.85';
      }
    });
    function end(e, cancel) {
      if (!st) return;
      clearTimeout(st.timer);
      if (st.ghost) st.ghost.remove();
      if (st.drag) {
        if (ui.selType) {
          var t = cancel ? null : tileFromClient(e.clientX, e.clientY);
          if (t && ui.selType) t = B.fitTile(s, t, ui.selType) || t;   // 2マスのタワーは、置ける向きに合わせる
          // ドラッグで離した場所も仮置き。確定はタップで
          if (t && B.canPlaceAt(s, t.tx, t.ty, ui.selType)) { renderHand(); setPending(t, true); }
          else if (t) { ui.preview = null; renderHand(); toast('そこには置けません'); }
          else { deselect(); renderHand(); }
        } else {
          if (ui.pendingTower && !cancel) { renderHand(); toast('もう一度タップで使う'); }
          else { deselect(); renderHand(); }
        }
      } else if (!st.long && !cancel) selectCard(i);
      st = null;
    }
    el.addEventListener('pointerup', function (e) { end(e, false); });
    el.addEventListener('pointercancel', function (e) { end(e, true); });
  }

  // タップしたマスが、仮置きしたタワーのマス（2マスのタワーは両方）から縦・横・ななめ1マス以内か
  function nearPending(t, p, type) {
    var n = B.sizeOf(type);
    for (var k = 0; k < n; k++) if (Math.abs(t.tx - (p.tx + k)) <= 1 && Math.abs(t.ty - p.ty) <= 1) return true;
    return false;
  }
  function tileFromClient(x, y) {
    var r = cv.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
    var t = G.Render.toTile(x - r.left, y - r.top, r.width, r.height);
    if (t.tx < 0 || t.ty < 0 || t.tx >= s.map.cols || t.ty >= s.map.rowsN) return null;
    return t;
  }
  function towerFromClient(x, y) {
    var r = cv.getBoundingClientRect();
    return G.Render.towerAt(s, x - r.left, y - r.top, r.width, r.height);
  }

  // ---- マップの操作 ----
  var mp = null;
  cv.addEventListener('pointerdown', function (e) { mp = { x: e.clientX, y: e.clientY }; });
  // マウスの時だけ、仮置き前はカーソルの場所に見本を出す
  cv.addEventListener('pointermove', function (e) {
    if (ui.selType && !ui.pending && e.pointerType === 'mouse') ui.preview = tileFromClient(e.clientX, e.clientY);
  });
  cv.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !ui.pending) ui.preview = null; });
  cv.addEventListener('pointerup', function (e) {
    if (!mp) return;
    var moved = Math.hypot(e.clientX - mp.x, e.clientY - mp.y) > 14; mp = null;
    if (moved) return;
    var r = cv.getBoundingClientRect();
    var gk = G.Render.gateAt(s, e.clientX - r.left, e.clientY - r.top, r.width, r.height);
    if (gk) { openGateInfo(gk); return; }
    closeGateInfo();
    var tw = towerFromClient(e.clientX, e.clientY);
    if (ui.selType) {
      var t = tileFromClient(e.clientX, e.clientY);
      // スワイプで仮置きした時だけ：仮置きの周り1マス以内のタップも建設（指で隠れた場所を正確に押さなくてよい）
      if (t && ui.pending && ui.pending.swipe && nearPending(t, ui.pending, ui.selType)) { tryPlace(ui.selIndex, ui.pending.tx, ui.pending.ty); return; }
      t = B.fitTile(s, t, ui.selType) || t;
      // タワーを置くカードを選んでいる間は、タワーの絵をタップしても小窓は開かない（後ろのマスをねらった誤タップを防ぐ）
      if (t && B.canPlaceAt(s, t.tx, t.ty, ui.selType)) {
        if (ui.pending && ui.pending.tx === t.tx && ui.pending.ty === t.ty) tryPlace(ui.selIndex, t.tx, t.ty);
        else setPending(t);
        return;
      }
      toast(t && B.findTowerAt && B.findTowerAt(s, t.tx, t.ty) ? 'もうタワーがあります（カードを外すとタワーを選べます）' : 'そこには置けません');
      return;
    }
    if (ui.selSkill) {
      if (ui.selSkill.target === 'tower') {
        if (!tw) { toast('タワーをタップしてください'); return; }
        var why = B.skillBlocked(s, ui.selSkill, tw); if (why) { toast(why); return; }
        if (ui.pendingTower === tw.id) useSkill(ui.selIndex, tw.id);
        else { ui.pendingTower = tw.id; toast('もう一度タップで使う'); }
        return;
      }
      toast('カードをもう一度タップで使う');
      return;
    }
    if (tw) openTowerSheet(tw.id); else closeTowerSheet();
  });

  // ---- 入口の「！」をタップ → 次に来る敵 ----
  function openGateInfo(k) {
    if (ui.gateOpen === k) { closeGateInfo(); return; }
    ui.gateOpen = k;
    var el = $('gate-info'); el.innerHTML = '';
    var gt = document.createElement('span'); gt.className = 'gate'; gt.textContent = s.map.gateName[k] + 'から'; el.appendChild(gt);
    B.nextWave(s).filter(function (g) { return g.gate === k; }).forEach(function (g) {
      var row = document.createElement('div'); row.className = 'row';
      row.appendChild(enemyIcon(g.type));
      row.appendChild(document.createTextNode(G.ENEMIES[g.type].name + ' ×' + g.n + (G.ENEMIES[g.type].fly ? '（空）' : G.ENEMIES[g.type].warp ? '（途中で別の道へワープ）' : '')));
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

  // ============================================================
  // タワーの小窓（強さの表と強化）
  // ============================================================
  function openTowerSheet(id) { ui.selTower = id; renderTowerSheet(); $('tower-sheet').hidden = false; }
  function closeTowerSheet() { ui.selTower = null; $('tower-sheet').hidden = true; }
  // 攻撃速度の表示：データは「何秒に1回」なので、1秒あたりの発数に直す（例：0.8秒 → 1.25発/s）
  function perSec(interval) { return (1 / interval).toFixed(2); }
  function fmtSplash(v) { return v.toFixed(2).replace(/0$/, ''); }
  function fmtNum(v) { return Math.round(v * 10) / 10; }
  // ランクの小さな札（ランクがない数値は何も出さない）
  function rk(r) { return r ? '<i class="rank rank-' + r.toLowerCase() + '">' + r + '</i>' : ''; }
  // 強化後のランク：上がれば赤の↑、下がれば青の↓を前に付け、札もその色にする。
  // ただし新しいランクがA以上なら札は元の金色のまま（矢印だけ色付き）。変わらなければ普通の札
  var RANK_ORDER = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
  function rkNext(before, after) {
    if (!after || !before || before === after) return rk(after);
    var up = RANK_ORDER.indexOf(after) < RANK_ORDER.indexOf(before), dir = up ? 'up' : 'down';
    var high = RANK_ORDER.indexOf(after) <= RANK_ORDER.indexOf('A');
    return '<b class="rk-arrow d-' + dir + '">' + (up ? '↑' : '↓') + '</b>' +
      '<i class="rank rank-' + after.toLowerCase() + (high ? '' : ' rank-' + dir) + '">' + after + '</i>';
  }
  // 変わる数値の後ろに (+4) のように差を書く。色は「強くなる＝アップの赤／弱くなる＝ダウンの青」
  function diff(a, b, dec) {
    var v = +(b - a).toFixed(dec); if (v === 0) return '';
    return ' <b class="' + (v > 0 ? 'd-up' : 'd-down') + '">(' + (v > 0 ? '+' : '') + v + ')</b>';
  }
  // 短くなるほど良い数値（兵士が戻るまでの秒数）：減ったらアップの色で (-1) と出す
  function backDiff(a, b) {
    var v = b - a; if (v === 0) return '';
    return ' <b class="' + (v < 0 ? 'd-up' : 'd-down') + '">(' + (v > 0 ? '+' : '') + v + ')</b>';
  }
  function renderTowerSheet() {
    var tw = B.findTower(s, ui.selTower); if (!tw) { closeTowerSheet(); return; }
    var T = G.TOWERS[tw.type], st = B.towerStats(tw, s), c = B.upgradeCost(tw, s), R = G.Rank.ofStats(st);
    $('ts-name').textContent = T.name;
    // かかっている効果（重ねがけした分もまとめて出す）
    var fx = [];
    if (tw.bonusDmg) fx.push('攻撃+' + tw.bonusDmg);
    if (tw.turnDmgMult > 1) fx.push('攻撃×' + (Math.round(tw.turnDmgMult * 100) / 100));
    if (s.buff.speedMult > 1 && !T.noAttack) fx.push('速さ×' + (Math.round(s.buff.speedMult * 100) / 100));
    $('ts-lv').innerHTML = 'Lv' + (tw.lv + 1) + '/' + (T.up.length + 1) + (fx.length ? '　<b class="d-up">' + fx.join('・') + '</b>' : '');
    var n = B.nextStats(tw, s), RN = n ? G.Rank.ofStats(n) : null;
    // 1行＝1項目：[項目名, 今の値, 強化後の値]
    var rows = [
      ['攻撃力', fmtNum(st.dmg) + rk(R.dmg), n && (fmtNum(n.dmg) + rkNext(R.dmg, RN.dmg) + diff(st.dmg, n.dmg, 1))],
      ['射程', st.range.toFixed(1) + 'マス' + rk(R.range), n && (n.range.toFixed(1) + 'マス' + rkNext(R.range, RN.range) + diff(st.range, n.range, 1))],
      ['攻撃速度', perSec(st.rate) + '発/s' + rk(R.speed), n && (perSec(n.rate) + '発/s' + rkNext(R.speed, RN.speed) + diff(+perSec(st.rate), +perSec(n.rate), 2))]
    ];
    if (st.splash) rows.push(['爆発範囲', fmtSplash(st.splash) + 'マス' + rk(R.splash),
      n && (fmtSplash(n.splash) + 'マス' + rkNext(R.splash, RN.splash) + diff(st.splash, n.splash, 2))]);
    if (st.poison) rows.push(['毒', '毎秒' + st.poison.dps + '×' + st.poison.dur + '秒',
      n && ('毎秒' + n.poison.dps + '×' + n.poison.dur + '秒' + diff(st.poison.dps, n.poison.dps, 0))]);
    if (st.burn) rows.push(['やけど', '毎秒' + st.burn.dps + '×' + st.burn.dur + '秒',
      n && ('毎秒' + n.burn.dps + '×' + n.burn.dur + '秒' + diff(st.burn.dps, n.burn.dps, 0))]);
    if (st.chain) rows.push(['連鎖', st.chain + '体', n && (n.chain + '体' + diff(st.chain, n.chain, 0))]);
    if (T.income) rows = [['収入', '攻撃1回ごと ' + st.income + 'G', n && (n.income + 'G' + diff(st.income, n.income, 0))]];
    if (T.trap && T.trap.type === 'spike') rows = [['罠のダメージ', st.trap.dmg + '（通った敵ごと）', n && (n.trap.dmg + diff(st.trap.dmg, n.trap.dmg, 0))]];
    if (T.trap && T.trap.type === 'tar') rows = [['遅くする', Math.round(st.trap.slow * 100) + '%（離れても1.5秒）', n && (Math.round(n.trap.slow * 100) + '%' + diff(st.trap.slow * 100, n.trap.slow * 100, 0))]];
    if (T.trap && T.trap.type === 'bomb') rows = [['爆発', st.trap.dmg + 'ダメージ・' + st.trap.splash + 'マス', null]];
    if (T.blocker) rows = [['体力', Math.ceil(tw.hp) + '/' + tw.maxHp, n && (n.blocker.hp + diff(st.blocker.hp, n.blocker.hp, 0))]];
    if (T.soldiers) rows = [['兵士', st.soldiers.n + '人', n && (n.soldiers.n + '人' + diff(st.soldiers.n, n.soldiers.n, 0))],
      ['兵士の体力', st.soldiers.hp, n && (n.soldiers.hp + diff(st.soldiers.hp, n.soldiers.hp, 0))],
      ['兵士の攻撃', st.soldiers.dmg, n && (n.soldiers.dmg + diff(st.soldiers.dmg, n.soldiers.dmg, 0))],
      ['戻るまで', st.soldiers.respawn + '秒', n && (n.soldiers.respawn + '秒' + backDiff(st.soldiers.respawn, n.soldiers.respawn))]];
    if (st.slow) rows.push(['遅くする', Math.round(st.slow.pct * 100) + '%×' + st.slow.dur + '秒',
      n && (Math.round(n.slow.pct * 100) + '%×' + n.slow.dur + '秒' + diff(st.slow.pct * 100, n.slow.pct * 100, 0))]);
    var txt = rows.map(function (r) {
      return '<span class="k">' + r[0] + '</span><span class="v">' + r[1] + '</span>' + (n ? '<span class="nx">' + r[2] + '</span>' : '');
    }).join('');
    if (n) txt += '<span class="mid" style="grid-row:1 / span ' + rows.length + '"><small>強化後</small>' +
      '<svg width="30" height="18" viewBox="0 0 30 18" aria-hidden="true"><path d="M0 6h17V0l13 9-13 9v-6H0z"/></svg></span>';
    $('ts-stats').classList.toggle('maxed', !n);
    $('ts-stats').innerHTML = txt;
    var mode = B.TARGET_MODES.filter(function (m) { return m.id === (tw.target || 'first'); })[0];
    $('ts-target').innerHTML = '<small>狙う敵（タップで変更）</small><b>' + mode.name + '</b>';
    $('ts-target').hidden = !!T.noAttack;
    var up = $('ts-up');
    if (c === null) { up.textContent = '最大まで強化済み'; up.disabled = true; }
    else { up.textContent = '強化 ● ' + c; up.disabled = s.gold < c; }
  }
  $('ts-target').addEventListener('click', function () {
    var tw = B.findTower(s, ui.selTower); if (!tw) return;
    var ids = B.TARGET_MODES.map(function (m) { return m.id; });
    B.setTarget(s, tw.id, ids[(ids.indexOf(tw.target || 'first') + 1) % ids.length]);
    renderTowerSheet();
  });
  $('ts-up').addEventListener('click', function () {
    var err = B.upgrade(s, ui.selTower);
    if (err) toast(err); renderTowerSheet(); renderHud(true);
  });
  // 閉じるボタンはなし：小窓の外（マップ以外も含む）をタップすると閉じる
  document.addEventListener('pointerdown', function (e) {
    if ($('tower-sheet').hidden) return;
    if ($('tower-sheet').contains(e.target) || e.target === cv) return;
    closeTowerSheet();
  }, true);

  // ============================================================
  // カードの詳細（長押し・デッキ一覧から）
  // ============================================================
  function detailStats(id) {
    var def = G.CARDS[id];
    var h = '<dt>エネルギー</dt><dd>' + def.cost + '</dd><dt>種類</dt><dd>' + (def.kind === 'tower' ? 'タワー' : 'スキル') + '</dd>' +
      '<dt>レア度</dt><dd><span class="rar-label r-' + def.rarity + '">' + RARITY[def.rarity] + '</span></dd>';
    // 鍛えたカード：何がどう良くなったか（前 → 後）。後ろの値はアップの色
    if (def.plus && def.plusNote) h += '<dt>鍛えた効果</dt><dd>' + def.plusNote[0] + '：' + def.plusNote[1] + ' → <b class="d-up">' + def.plusNote[2] + '</b></dd>';
    if (def.kind === 'tower' && G.TOWERS[def.tower].noAir) h += '<dt>空の敵</dt><dd>当たらない</dd>';
    if (def.kind === 'tower') {
      var T = G.TOWERS[def.tower], L0 = def.startLv || 0, st = B.baseStats(def.tower, L0), R = G.Rank.ofStats(st), UPS = T.up.slice(L0);
      if (T.place === 'path') h += '<dt>置ける場所</dt><dd>道の上だけ</dd>';
      if (st.trap || st.blocker || st.soldiers) {
        var x = '';
        if (st.trap && st.trap.type === 'spike') x = '<dt>罠のダメージ</dt><dd>' + st.trap.dmg + '（物理）</dd>';
        if (st.trap && st.trap.type === 'tar') x = '<dt>遅くする</dt><dd>' + Math.round(st.trap.slow * 100) + '%</dd>';
        if (st.trap && st.trap.type === 'bomb') x = '<dt>爆発</dt><dd>' + st.trap.dmg + 'ダメージ・' + st.trap.splash + 'マス</dd>';
        if (st.blocker) x = '<dt>体力</dt><dd>' + st.blocker.hp + '</dd>';
        if (st.soldiers) x = '<dt>兵士</dt><dd>' + st.soldiers.n + '人（体力' + st.soldiers.hp + '・攻撃' + st.soldiers.dmg + '）</dd><dt>戻るまで</dt><dd>' + st.soldiers.respawn + '秒</dd>';
        return h + x + (UPS.length ? '<dt>強化</dt><dd>● ' + UPS.map(function (u) { return u.cost; }).join(' → ● ') + '</dd>' : '');
      }
      if (T.noAttack) return h + '<dt>攻撃</dt><dd>しない</dd><dt>収入</dt><dd>攻撃1回ごと ' + st.income + 'G</dd><dt>強化</dt><dd>● ' + UPS.map(function (u) { return u.cost; }).join(' → ● ') + '（収入 ' + UPS.map(function (u) { return u.income; }).join('→') + 'G）</dd>';
      h += '<dt>攻撃力</dt><dd>' + st.dmg + (T.dmgType === 'magic' ? '（魔法）' : '（物理）') + rk(R.dmg) +
        '</dd><dt>射程</dt><dd>' + st.range + 'マス' + rk(R.range) + '</dd><dt>攻撃速度</dt><dd>' + perSec(st.rate) + '発/s' + rk(R.speed) + '</dd>' +
        (st.splash ? '<dt>爆発の広さ</dt><dd>' + st.splash + 'マス' + rk(R.splash) + '</dd>' : '') +
        (st.poison ? '<dt>毒</dt><dd>毎秒' + st.poison.dps + '×' + st.poison.dur + '秒</dd>' : '') +
        (st.burn ? '<dt>やけど</dt><dd>毎秒' + st.burn.dps + '×' + st.burn.dur + '秒</dd>' : '') +
        (st.chain ? '<dt>連鎖</dt><dd>' + st.chain + '体（70%）</dd>' : '') +
        (st.slow ? '<dt>遅くする</dt><dd>' + Math.round(st.slow.pct * 100) + '%×' + st.slow.dur + '秒</dd>' : '') +
        (UPS.length ? '<dt>強化</dt><dd>● ' + UPS.map(function (u) { return u.cost; }).join(' → ● ') + '</dd>' : '<dt>強化</dt><dd>最大</dd>');
    } else {
      h += '<dt>使う相手</dt><dd>' + (def.target === 'tower' ? 'タワー1つ' : def.target === 'hand' ? '手札のカード1枚' : 'なし（すぐ効く）') + '</dd>';
    }
    if (def.exhaust) h += '<dt>使い切り</dt><dd>この戦闘中は戻らない</dd>';
    return h;
  }
  // 報酬・商人・カード選びの画面で、選んだカードの詳細を出す箱
  function detailBox(id, extra) {
    var box = document.createElement('div'); box.className = 'card-detail';
    var def = G.CARDS[id];
    box.innerHTML = '<h3></h3><p></p><dl>' + detailStats(id) + '</dl>' + (extra ? '<p class="extra"></p>' : '');
    box.querySelector('h3').textContent = def.name;
    box.querySelector('p').textContent = def.text;
    if (extra) box.querySelector('.extra').textContent = extra;
    return box;
  }
  // 鍛える前と後を並べて見せる箱（たき火・鍛冶屋で使う）。変わる項目はアップの色、変わらない項目はうすく
  function statPairs(id) {
    var out = [], re = /<dt>(.*?)<\/dt><dd>(.*?)<\/dd>/g, m, h = detailStats(id);
    while ((m = re.exec(h))) if (m[1] !== 'レア度' && m[1] !== '鍛えた効果') out.push([m[1], m[2]]);
    return out;
  }
  function compareBox(id) {
    var A = G.CARDS[id], P = G.CARDS[id + '+'], before = statPairs(id), after = statPairs(id + '+');
    var box = document.createElement('div'); box.className = 'card-detail cmp-box';
    var keys = [];
    before.concat(after).forEach(function (r) { if (keys.indexOf(r[0]) < 0) keys.push(r[0]); });
    function val(list, k) { for (var i = 0; i < list.length; i++) if (list[i][0] === k) return list[i][1]; return '―'; }
    var rows = keys.map(function (k) {
      var a = val(before, k), b = val(after, k), ch = a.replace(/<[^>]+>/g, '') !== b.replace(/<[^>]+>/g, '');
      return { k: k, a: a, b: b, ch: ch };
    });
    // スキルの倍率など、表に出ない数字は plusNote（前・後）から1行足す
    if (P.plusNote && !rows.some(function (r) { return r.k === P.plusNote[0] && r.ch; })) rows.unshift({ k: P.plusNote[0], a: P.plusNote[1], b: P.plusNote[2], ch: true });
    // 変わる項目だけ出す（変わらない項目は省く）
    var chRows = rows.filter(function (r) { return r.ch; });
    if (chRows.length) rows = chRows;
    var h = '<h3></h3><div class="cmp-head"><span>今</span><span></span><span>鍛えた後</span></div><div class="cmp">';
    rows.forEach(function (r) {
      h += '<div class="cmp-row' + (r.ch ? ' ch' : '') + '"><span class="cmp-k">' + (r.k === '強化' ? '強化の値段' : r.k) + '</span>' +
        '<span class="cmp-a">' + r.a + '</span><span class="cmp-ar">' + (r.ch ? '→' : '') + '</span><span class="cmp-b">' + r.b + '</span></div>';
    });
    h += '</div>';
    if (A.text !== P.text) h += '<div class="cmp-text"><p class="cmp-t0"></p><p class="cmp-t1"></p></div>';
    box.innerHTML = h;
    box.querySelector('h3').textContent = A.name + ' → ' + P.name;
    if (A.text !== P.text) { box.querySelector('.cmp-t0').textContent = '今：' + A.text; box.querySelector('.cmp-t1').textContent = '後：' + P.text; }
    return box;
  }
  function showDetail(id) {
    var def = G.CARDS[id], c = $('detail-art').getContext('2d');
    c.clearRect(0, 0, 34, 36);
    if (def.kind === 'tower') { var img = G.towerImg(def.tower, 0, false); G.drawTowerFit(c, img, 34, 36); }
    else c.drawImage(SPR.icon[def.icon], 9, 10);
    $('d-name').textContent = def.name;
    $('d-text').textContent = def.text;
    $('d-stats').innerHTML = detailStats(id);
    $('detail').hidden = false;
    if (s && G.currentScreen === 'game') { deselect(); renderHand(); }
  }
  $('d-close').addEventListener('click', function () { $('detail').hidden = true; });
  $('detail').addEventListener('click', function (e) { if (e.target === this) this.hidden = true; });

  // ---- ボタン ----
  $('btn-go').addEventListener('click', function () {
    closeGateInfo(); B.startAttack(s); renderInfo(); renderHud(true);
  });
  $('btn-draw').addEventListener('click', function () {
    var err = B.extraDraw(s);
    if (err) toast(err); else { renderHand(); renderHud(true); }
  });
  // ---- カードの一覧（山札・捨て札・デッキ）。山札は順番が分からないよう種類ごとの枚数だけ ----
  function showList(title, ids, note) {
    var count = {}, order = [];
    ids.forEach(function (id) { if (!count[id]) order.push(id); count[id] = (count[id] || 0) + 1; });
    $('p-title').textContent = title + '（' + ids.length + '枚）';
    $('p-note').textContent = note || '';
    // 手札と同じ見た目のカードを小さくして並べる（同じカードは1枚にまとめて「×枚数」）。タップで詳しい説明
    var ul = $('p-list'); ul.innerHTML = ''; ul.classList.add('mini-cards');
    if (!order.length) ul.innerHTML = '<li class="none">カードはありません</li>';
    var keys = Object.keys(G.CARDS);
    order.sort(function (a, b) { return keys.indexOf(a) - keys.indexOf(b); }).forEach(function (k) {
      var li = document.createElement('li');
      li.appendChild(cardEl(k));
      if (count[k] > 1) { var n = document.createElement('b'); n.className = 'mini-n'; n.textContent = '×' + count[k]; li.appendChild(n); }
      li.addEventListener('click', function () { showDetail(k); });
      ul.appendChild(li);
    });
    $('pile').hidden = false;
  }
  $('btn-pile-draw').addEventListener('click', function () {
    showList('山札', s.draw.map(function (c) { return c.id; }), '引く順番は分かりません。山札がなくなると捨て札を混ぜて山札に戻します。');
  });
  $('btn-pile-disc').addEventListener('click', function () {
    showList('捨て札', s.discard.map(function (c) { return c.id; }),
      '使ったカードと、ターンの終わりに残った手札が入ります。' + (s.exhaust.length ? '使い切りで消えたカード：' + s.exhaust.length + '枚' : ''));
  });
  $('p-close').addEventListener('click', function () { $('pile').hidden = true; });
  $('pile').addEventListener('click', function (e) { if (e.target === this) this.hidden = true; });

  // 速度：つまみを横にずらすと1〜4倍
  $('speed').addEventListener('input', function () { speed = +this.value; $('speed-val').textContent = '×' + speed; });

  // ---- 戦闘の出来事を画面に反映 ----
  function handleEvents() {
    var evs = s.events.splice(0);
    if (!evs.length) return;
    G.Render.addEvents(evs);
    playSounds(evs);
    var inf = false;
    evs.forEach(function (e) {
      if (e.k === 'prep') { closeTowerSheetIfGone(); deselect(); renderHand(); showBanner('準備ターン', 'prep'); inf = true; }
      else if (e.k === 'attack') { showBanner(s.turn === s.totalTurns - 1 ? '最後の攻撃' : '攻撃ターン', 'attack'); }
      else if (e.k === 'spawn' && e.boss) showBanner('ボス出現！', 'attack');
      else if (e.k === 'summon') toast('ボスが手下を呼んだ！');
      else if (e.k === 'tfreeze') toast('吹雪でタワーが止まった！');
      else if (e.k === 'bossArrive') showBanner('ボスが砦に着いた！', 'attack');
      else if (e.k === 'bossHit') inf = true;
      else if (e.k === 'kill' || e.k === 'leak') {
        inf = true;
        if (e.k === 'kill' && e.boss) freeze = Math.max(freeze, 0.45);
        else if (e.k === 'kill' && e.big) freeze = Math.max(freeze, 0.07);
      }
      else if (e.k === 'exhaustOut') { if (G.Sound) G.Sound.play('cardout'); }   // 作戦変更でカードを外した
      else if (e.k === 'reshuffle') { toast('捨て札を混ぜて山札に戻しました'); if (G.Sound) G.Sound.play('shuffle'); }   // 2026-10-23 混ぜ直す音
      else if (e.k === 'relic') toast('レリック「' + G.RELICS[e.id].name + '」が働いた');
      else if (e.k === 'surprise') toast('びっくり箱から「' + G.CARDS[e.id].name + '」が出た！');
      else if (e.k === 'win' || e.k === 'lose') finish();
    });
    if (inf) renderInfo();
  }
  // 出来事ごとの効果音
  function playSounds(evs) {
    var SND = G.Sound; if (!SND) return;
    evs.forEach(function (e) {
      switch (e.k) {
        case 'fire': SND.play(G.TOWERS[e.type].shot || 'arrow'); break;
        case 'hit': if (e.kind !== 'poison' && e.kind !== 'burn') SND.play('hit'); break;
        case 'kill': SND.play(e.boss ? 'bossdown' : e.big ? 'bigkill' : 'kill'); if (!e.boss) SND.play('coin'); if (e.boss && SND.bossTheme && !bossesLeft()) SND.bossTheme(false); break;
        case 'leak': SND.play('leak'); if (G.ENEMIES[e.type].boss && SND.bossTheme && !bossesLeft()) SND.bossTheme(false); break;
        case 'build': SND.play('build'); break;
        case 'upgrade': SND.play('upgrade'); break;
        case 'skill': SND.play('skill'); break;
        case 'boom': SND.play(e.small ? 'stone' : 'boom'); break;
        case 'broken': SND.play('boom'); break;
        case 'spawn': if (e.boss) { SND.play('boss'); if (SND.bossTheme) SND.bossTheme(true); } break;
        case 'summon': SND.play('summon'); break;
        case 'tfreeze': SND.play('ice'); break;
        case 'blizzard': SND.play('ice'); break;
        case 'bossHit': SND.play('bossHit'); break;
        case 'bossArrive': SND.play('bossRoar'); break;
        case 'healcast': SND.play('heal'); break;
        case 'warp': SND.play('warp'); break;
        case 'attack': SND.play('attack'); break;
        case 'income': SND.play('coin'); break;
        case 'win': SND.play('win'); if (s.kind === 'boss') SND.music('victory'); break;   // ボスに勝ったら勝利の曲（次の層へ進むまで）
        case 'lose': SND.play('lose'); break;
      }
    });
  }
  // まだ生きているボスがいるか（ボスを倒す・砦に着くと元のBGMに戻す）
  function bossesLeft() { return s.enemies.some(function (en) { return en.hp > 0 && G.ENEMIES[en.type].boss; }) || s.spawnQueue.some(function (q) { return G.ENEMIES[q.type].boss; }); }
  function closeTowerSheetIfGone() { if (ui.selTower && !B.findTower(s, ui.selTower)) closeTowerSheet(); }
  function finish() {
    if (ended) return; ended = true;
    if (G.Sound && G.Sound.bossTheme) G.Sound.bossTheme(false);
    deselect(); closeTowerSheet(); closeGateInfo();
    showBanner(s.phase === 'win' ? '勝利！' : '敗北…', s.phase === 'win' ? 'prep' : 'attack');
    renderInfo();
    setTimeout(function () { if (onEnd) onEnd(s); }, 1200);
  }

  // ---- 画面の大きさに合わせてマップを拡大 ----
  function fit() {
    var st = $('stage').getBoundingClientRect();
    if (!st.width) return;
    // 手札の場所はいつも2段分の高さを確保してある（style.css の .hand）ので、マップの大きさと位置は手札の枚数で変わらない
    var W = G.Render.W, H = G.Render.H, k = Math.min(st.width / W, st.height / H);
    var cw = Math.floor(W * k), ch = Math.floor(H * k);
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    $('rampart').style.top = ch + 'px';   // 地図の下に余りがある時だけ見える城壁（2026-10-23 新デザイン。Safari ではふつう見えない）
    var d = Math.min(window.devicePixelRatio || 1, 3);
    var bw = Math.round(cw * d), bh = Math.round(ch * d);
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
  }
  window.addEventListener('resize', fit);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);

  // ---- ゲームの時計 ----
  var prev = performance.now(), freeze = 0;
  function frame(now) {
    var dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    if (s && G.currentScreen === 'game' && !G.paused) {   // G.paused：メニューを開いている間は止める
      ui.time += dt;
      // 手ごたえの演出：大きな敵を倒した瞬間だけ、ほんの少し時間を止める
      if (freeze > 0) freeze -= dt;
      else {
        // 速度2倍の時も細かく刻んで、弾が敵をすり抜けないようにする
        var left = dt * speed;
        while (left > 0) { var step = Math.min(left, 1 / 60); B.update(s, step); left -= step; }
      }
      handleEvents();
      renderHud(false);
      if (s.phase === 'attack' && Math.floor(ui.time * 4) !== Math.floor((ui.time - dt) * 4)) renderInfo();
      G.Render.draw(s, ui, dt);
      ctx.imageSmoothingEnabled = false;
      var k = cv.width / G.Render.W, sh = G.Render.shakeOffset(dt);
      if (sh.x || sh.y) { ctx.fillStyle = '#0b0d0a'; ctx.fillRect(0, 0, cv.width, cv.height); }
      ctx.drawImage(G.Render.buf, Math.round(sh.x * k), Math.round(sh.y * k), cv.width, cv.height);
      if (G.Render.fx.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (G.Render.fx.flash * 0.6).toFixed(3) + ')'; ctx.fillRect(0, 0, cv.width, cv.height); }
      G.Render.drawNums(ctx, k);
    }
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('show'); }
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  G.BattleUI = { relicBar: relicBar, showRelic: showRelic, compareBox: compareBox, relicCanvas: relicCanvas, RARITY: RARITY, start: start, cardEl: cardEl, cardArt: cardArt, showDetail: showDetail, showList: showList, detailBox: detailBox, fit: fit };
  // 開発用：コンソールから状態を見られるように
  G.debug = { get state() { return s; }, ui: ui, renderHand: function () { renderHand(); }, openSheet: openTowerSheet };
})();

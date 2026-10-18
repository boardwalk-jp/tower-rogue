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
  var ui = { selIndex: -1, selType: null, selSkill: null, selTower: null, preview: null, pending: null, pendingTower: null, time: 0 };
  var speed = 1;
  var cv = $('map'), ctx = cv.getContext('2d');

  // ---- Safari の長押しメニュー・文字選択・拡大を止める ----
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('selectstart', function (e) { e.preventDefault(); });
  ['gesturestart', 'gesturechange'].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); }); });
  // ゲーム中は画面がスクロールしないように（細くなったアドレスバーを戻さないため）。.scroll-y の中だけはスクロールできる
  document.addEventListener('touchmove', function (e) {
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
      c.getContext('2d').drawImage(img, Math.round((26 - img.width) / 2), 34 - img.height);
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
    d.className = 'card ' + (def.kind === 'skill' ? 'skill' : 'tower') + ' r-' + def.rarity;
    d.setAttribute('role', 'button'); d.setAttribute('aria-label', def.name + ' エネルギー' + cost);
    d.innerHTML = '<span class="top"><span class="cost">' + cost + '</span><span class="nm"></span></span>';
    d.querySelector('.nm').textContent = def.name;
    d.appendChild(cardArt(card.id));
    if (card.temp || def.exhaust) { var tg = document.createElement('span'); tg.className = 'tag'; tg.textContent = '使い切り'; d.appendChild(tg); }
    return d;
  }

  // ============================================================
  // 戦闘の開始
  // ============================================================
  function start(opts, cb, extra) {
    s = B.create(opts); onEnd = cb; ended = false; info = extra || {};
    G.Render.clearFx();
    closeGateInfo(); closeTowerSheet(); deselect();
    s.events = [];
    G.showScreen('game');
    renderHand(); renderInfo(); renderHud(true);
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
    $('h-life').textContent = s.life;
    $('h-gold').textContent = s.gold;
    $('h-floor').textContent = info.label || '';
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
      var d = cardEl(card);
      if (i === ui.selIndex) d.classList.add('sel');
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
      d.classList.toggle('poor', B.cardCost(c) > s.energy);
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
    if (ui.selIndex === i) {
      if (def.kind === 'skill' && def.target === 'none') { useSkill(i, null); return; }
      deselect(); renderHand(); return;
    }
    closeTowerSheet();
    deselect();
    ui.selIndex = i;
    if (def.kind === 'tower') ui.selType = def.tower; else ui.selSkill = def;
    if (B.cardCost(card) > s.energy) toast('エネルギーが足りません');
    else if (def.kind === 'tower') toast('置く場所をタップ');
    else if (def.target === 'tower') toast(s.towers.length ? '使うタワーをタップ' : '先にタワーを建ててください');
    else toast('もう一度タップで使う');
    renderHand();
  }
  function deselect() {
    ui.selIndex = -1; ui.selType = null; ui.selSkill = null; ui.preview = null; ui.pending = null; ui.pendingTower = null;
    document.querySelectorAll('#hand .card.sel').forEach(function (d) { d.classList.remove('sel'); });
  }
  // 1回目：仮置き（射程が見える）。同じマスをもう一度タップで建設
  function setPending(t) {
    ui.pending = { tx: t.tx, ty: t.ty }; ui.preview = ui.pending;
    toast('もう一度タップで建設');
  }
  function tryPlace(i, tx, ty) {
    var err = B.playCard(s, i, { tx: tx, ty: ty });
    if (err) { toast(err); return false; }
    deselect(); renderHand(); renderHud(true);
    return true;
  }
  function useSkill(i, towerId) {
    var def = B.cardDef(s.hand[i]);
    var err = B.playCard(s, i, towerId ? { tower: towerId } : null);
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
        if (def.kind === 'skill' && def.target === 'none') return;   // 対象なしスキルはドラッグしない
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
          // ドラッグで離した場所も仮置き。確定はタップで
          if (t && B.canPlaceAt(s, t.tx, t.ty)) { renderHand(); setPending(t); }
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
      // タワーを置くカードを選んでいる間は、タワーの絵をタップしても小窓は開かない（後ろのマスをねらった誤タップを防ぐ）
      if (t && B.canPlaceAt(s, t.tx, t.ty)) {
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
  function renderTowerSheet() {
    var tw = B.findTower(s, ui.selTower); if (!tw) { closeTowerSheet(); return; }
    var T = G.TOWERS[tw.type], st = B.towerStats(tw, s), c = B.upgradeCost(tw), R = G.Rank.ofStats(st);
    $('ts-name').textContent = T.name;
    $('ts-lv').textContent = 'Lv' + (tw.lv + 1) + '/' + (T.up.length + 1) + (tw.bonusDmg ? '　研ぎ+' + tw.bonusDmg : '');
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
    if (T.noAttack) rows = [['収入', '攻撃1回ごと ' + st.income + 'G', n && (n.income + 'G' + diff(st.income, n.income, 0))]];
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
    var h = '<dt>エネルギー</dt><dd>' + def.cost + '</dd><dt>種類</dt><dd>' + (def.kind === 'tower' ? 'タワー' : 'スキル') + '</dd>';
    if (def.kind === 'tower') {
      var T = G.TOWERS[def.tower], st = B.baseStats(def.tower, 0), R = G.Rank.ofStats(st);
      if (T.noAttack) return h + '<dt>攻撃</dt><dd>しない</dd><dt>収入</dt><dd>攻撃1回ごと ' + T.income + 'G</dd><dt>強化</dt><dd>● ' + T.up.map(function (u) { return u.cost; }).join(' → ● ') + '（収入 ' + T.up.map(function (u) { return u.income; }).join('→') + 'G）</dd>';
      h += '<dt>攻撃力</dt><dd>' + T.dmg + (T.dmgType === 'magic' ? '（魔法）' : '（物理）') + rk(R.dmg) +
        '</dd><dt>射程</dt><dd>' + T.range + 'マス' + rk(R.range) + '</dd><dt>攻撃速度</dt><dd>' + perSec(T.rate) + '発/s' + rk(R.speed) + '</dd>' +
        (T.splash ? '<dt>爆発の広さ</dt><dd>' + T.splash + 'マス' + rk(R.splash) + '</dd>' : '') +
        (T.poison ? '<dt>毒</dt><dd>毎秒' + T.poison.dps + '×' + T.poison.dur + '秒</dd>' : '') +
        (T.burn ? '<dt>やけど</dt><dd>毎秒' + T.burn.dps + '×' + T.burn.dur + '秒</dd>' : '') +
        (T.chain ? '<dt>連鎖</dt><dd>' + T.chain + '体（70%）</dd>' : '') +
        (T.slow ? '<dt>遅くする</dt><dd>' + Math.round(T.slow.pct * 100) + '%×' + T.slow.dur + '秒</dd>' : '') +
        '<dt>強化</dt><dd>● ' + T.up.map(function (u) { return u.cost; }).join(' → ● ') + '</dd>';
    } else {
      h += '<dt>使う相手</dt><dd>' + (def.target === 'tower' ? 'タワー1つ' : 'なし（すぐ効く）') + '</dd>';
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
  function showDetail(id) {
    var def = G.CARDS[id], c = $('detail-art').getContext('2d');
    c.clearRect(0, 0, 34, 36);
    if (def.kind === 'tower') { var img = G.towerImg(def.tower, 0, false); c.drawImage(img, Math.round((34 - img.width) / 2), 36 - img.height); }
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
    var ul = $('p-list'); ul.innerHTML = '';
    if (!order.length) ul.innerHTML = '<li class="none">カードはありません</li>';
    var keys = Object.keys(G.CARDS);
    order.sort(function (a, b) { return keys.indexOf(a) - keys.indexOf(b); }).forEach(function (k) {
      var li = document.createElement('li');
      li.appendChild(cardArt(k));
      var nm = document.createElement('span'); nm.textContent = G.CARDS[k].name; li.appendChild(nm);
      var n = document.createElement('b'); n.textContent = '×' + count[k]; li.appendChild(n);
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

  $('btn-speed').addEventListener('click', function () {
    speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;   // ×1 → ×2 → ×4 → ×1
    this.textContent = '×' + speed; this.setAttribute('aria-pressed', String(speed > 1));
  });

  // ---- 戦闘の出来事を画面に反映 ----
  function handleEvents() {
    var evs = s.events.splice(0);
    if (!evs.length) return;
    G.Render.addEvents(evs);
    var inf = false;
    evs.forEach(function (e) {
      if (e.k === 'prep') { closeTowerSheetIfGone(); deselect(); renderHand(); showBanner('準備ターン', 'prep'); inf = true; }
      else if (e.k === 'attack') { showBanner(s.turn === s.totalTurns - 1 ? '最後の攻撃' : '攻撃ターン', 'attack'); }
      else if (e.k === 'spawn' && e.boss) showBanner('ボス出現！', 'attack');
      else if (e.k === 'kill' || e.k === 'leak') inf = true;
      else if (e.k === 'reshuffle') toast('捨て札を混ぜて山札に戻しました');
      else if (e.k === 'relic') toast('レリック「' + G.RELICS[e.id].name + '」が働いた');
      else if (e.k === 'win' || e.k === 'lose') finish();
    });
    if (inf) renderInfo();
  }
  function closeTowerSheetIfGone() { if (ui.selTower && !B.findTower(s, ui.selTower)) closeTowerSheet(); }
  function finish() {
    if (ended) return; ended = true;
    deselect(); closeTowerSheet(); closeGateInfo();
    showBanner(s.phase === 'win' ? '勝利！' : '敗北…', s.phase === 'win' ? 'prep' : 'attack');
    renderInfo();
    setTimeout(function () { if (onEnd) onEnd(s); }, 1200);
  }

  // ---- 画面の大きさに合わせてマップを拡大 ----
  function fit() {
    var st = $('stage').getBoundingClientRect();
    if (!st.width) return;
    // 手札が1段の時も2段分の高さを見込んでおき、枚数でマップの大きさが変わらないようにする
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
    if (s && G.currentScreen === 'game') {
      ui.time += dt;
      // 速度2倍の時も細かく刻んで、弾が敵をすり抜けないようにする
      var left = dt * speed;
      while (left > 0) { var step = Math.min(left, 1 / 60); B.update(s, step); left -= step; }
      handleEvents();
      renderHud(false);
      if (s.phase === 'attack' && Math.floor(ui.time * 4) !== Math.floor((ui.time - dt) * 4)) renderInfo();
      G.Render.draw(s, ui, dt);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(G.Render.buf, 0, 0, cv.width, cv.height);
      G.Render.drawNums(ctx, cv.width / G.Render.W);
    }
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('show'); }
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  G.BattleUI = { start: start, cardEl: cardEl, cardArt: cardArt, showDetail: showDetail, showList: showList, detailBox: detailBox, fit: fit };
  // 開発用：コンソールから状態を見られるように
  G.debug = { get state() { return s; }, ui: ui };
})();

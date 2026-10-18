// 描画：小さなドット画面（176×198）に描いてから拡大表示する
'use strict';
var G = window.G = window.G || {};

(function () {
  var TW = 16, TH = 12, OY = 14;
  var W = G.MAP.cols * TW, H = G.MAP.rowsN * TH + OY + 4;
  var buf = document.createElement('canvas'); buf.width = W; buf.height = H;
  var b = buf.getContext('2d');
  var bgCache = {}, M = G.MAPS.field;   // M：今描いているマップ
  var parts = [], rings = [], floats = [], nums = [];

  function sx(x) { return x * TW; }
  function sy(y) { return y * TH + OY; }
  function hash(x, y) {
    var h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function blitB(img, x, y) { // 下の真ん中を (x, y) に合わせて描く
    b.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height));
  }

  // ---- 3×5ドットの数字（お金・ダメージ表示用） ----
  var DIG = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
    '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010',
    '8': '111101111101111', '9': '111101111001111', '+': '000010111010000', '-': '000000111000000'
  };
  function text(str, x, y, col) {
    str = String(str);
    var w = str.length * 4 - 1; x = Math.round(x - w / 2); y = Math.round(y);
    for (var n = 0; n < str.length; n++) {
      var d = DIG[str[n]]; if (!d) continue;
      for (var i = 0; i < 15; i++) if (d[i] === '1') {
        var px = x + n * 4 + (i % 3), py = y + Math.floor(i / 3);
        b.fillStyle = '#120d08'; b.fillRect(px + 1, py + 1, 1, 1);
        b.fillStyle = col; b.fillRect(px, py, 1, 1);
      }
    }
  }

  // ---- 地面（草・道・台座・入口）を作り置き ----
  function buildBg() {
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var g = cv.getContext('2d'), S = G.SPR;
    g.fillStyle = '#2f5a2a'; g.fillRect(0, 0, W, H);
    function charAt(tx, ty) { return (ty < 0 || ty >= M.rowsN || tx < 0 || tx >= M.cols) ? null : M.rows[ty][tx]; }
    function isGate(c) { return c === 'A' || c === 'B' || c === 'C'; }
    function isPath(tx, ty) {
      var c = charAt(tx, ty);
      return c === '#' || c === 'G' || isGate(c) || (c === null && ty < 0 && isGate(charAt(tx, 0)));
    }
    for (var ty = -1; ty < M.rowsN; ty++) for (var tx = 0; tx < M.cols; tx++) {
      var x0 = tx * TW, y0 = sy(ty), path = isPath(tx, ty);
      for (var py = 0; py < TH; py++) for (var px = 0; px < TW; px++) {
        var h = hash(tx * TW + px, ty * TH + py + 99), col;
        if (path) col = h < 0.1 ? '#a3804f' : h < 0.2 ? '#7e6038' : h < 0.24 ? '#6b5235' : '#94744a';
        else col = h < 0.07 ? '#4f8a3d' : h < 0.16 ? '#264d24' : h < 0.2 ? '#3c7232' : '#33642d';
        g.fillStyle = col; g.fillRect(x0 + px, y0 + py, 1, 1);
      }
      if (!path && hash(tx, ty) < 0.3) { // 小さな花
        var fx = x0 + 3 + Math.floor(hash(ty, tx) * 10), fy = y0 + 2 + Math.floor(hash(tx + 7, ty) * 8);
        g.fillStyle = hash(tx, ty + 3) < 0.5 ? '#f4e36a' : '#f0f0f0'; g.fillRect(fx, fy, 1, 1);
      }
    }
    // 道のふち（草とのさかい目を暗く）
    for (ty = 0; ty < M.rowsN; ty++) for (tx = 0; tx < M.cols; tx++) {
      if (!isPath(tx, ty)) continue;
      x0 = tx * TW; y0 = sy(ty);
      g.fillStyle = '#5e4a2e';
      if (!isPath(tx - 1, ty)) g.fillRect(x0, y0, 1, TH);
      if (!isPath(tx + 1, ty)) g.fillRect(x0 + TW - 1, y0, 1, TH);
      if (!isPath(tx, ty - 1) && ty > 0) g.fillRect(x0, y0, TW, 1);
      if (!isPath(tx, ty + 1) && ty < M.rowsN - 1) { g.fillStyle = '#4a3a22'; g.fillRect(x0, y0 + TH - 1, TW, 1); }
    }
    // 台座・木・岩・入口・城（上の行から順に描いて重なりを正しくする）
    for (ty = 0; ty < M.rowsN; ty++) for (tx = 0; tx < M.cols; tx++) {
      var c = M.rows[ty][tx], cx = tx * TW + TW / 2, by = sy(ty + 1);
      if (c === 'T') g.drawImage(S.tree[(tx + ty) % 2], cx - 8, by - 20);
      if (c === 'R') g.drawImage(S.rock, cx - 7, by - 10);
      if (isGate(c)) g.drawImage(S.gate, cx - 10, sy(0) - 6);
    }
    return cv;
  }

  function addEvents(events) {
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e.k === 'hit') {
        burst(e.x, e.y - 0.4, 3, e.kind === 'resisted' ? ['#d0d0d8', '#ffffff'] : ['#ff6b5b', '#ffd0c0'], 22, 60, 0.3);
        // ダメージの数字（少し左右にばらして重なりにくく）
        if (nums.length < 120) nums.push({ x: sx(e.x) + (Math.random() - 0.5) * 8, y: sy(e.y) - 16, vy: -22,
          text: String(Math.max(1, Math.round(e.amount))), col: G.DMG_COLORS[e.kind] || G.DMG_COLORS.normal,
          size: e.kind === 'resisted' ? 0.85 : 1, life: 0.7, ml: 0.7 });
      } else if (e.k === 'kill') {
        var cols = e.type === 'slime' ? ['#5cc350', '#b6f29a'] : e.type === 'goblin' ? ['#8bc34a', '#7a5230'] : ['#6e9a4e', '#a0a0aa'];
        burst(e.x, e.y - 0.4, 12, cols, 40, 90, 0.6);
        nums.push({ x: sx(e.x), y: sy(e.y) - 22, vy: -14, text: '+' + e.gold, col: '#ffd84a', size: 0.9, life: 0.9, ml: 0.9, coin: true });
      } else if (e.k === 'boom') {
        if (e.small) burst(e.x, e.y, 6, ['#9ca1a7', '#cfc2ab', '#6b5235'], 26, 60, 0.35);
        else burst(e.x, e.y, 14, ['#ffb347', '#ffe08a', '#ff6b3a', '#5a5048'], 50, 40, 0.5);
        rings.push({ x: sx(e.x), y: sy(e.y), r: 2, max: e.r * TW, col: e.small ? '#cfc2ab' : '#ffcf6a', life: 0.3, ml: 0.3 });
      } else if (e.k === 'spawn') { // 洞穴から出てきた時の土ぼこり
        burst(e.x, e.y, 8, ['#8a7a68', '#b0a08a', '#5a5048'], 18, -10, 0.45);
      } else if (e.k === 'frost') {
        burst(e.x, e.y, 6, ['#bff0ff', '#ffffff', '#5fc8ff'], 26, 10, 0.35);
      } else if (e.k === 'splat') {
        burst(e.x, e.y, 5, ['#a6e85a', '#4a8a2a'], 20, 40, 0.35);
      } else if (e.k === 'skill') {
        if (e.x !== null) { burst(e.x, e.y - 0.8, 14, [G.UP_COLOR, '#ffffff', '#ffd0c0'], 30, -20, 0.6); rings.push({ x: sx(e.x), y: sy(e.y), r: 3, max: 16, col: G.UP_COLOR, life: 0.45, ml: 0.45 }); }
      } else if (e.k === 'zap') {
        burst(e.x, e.y, 6, ['#c79bff', '#ffffff', '#9be7ff'], 30, 0, 0.35);
      } else if (e.k === 'leak') {
        floats.push({ x: sx(e.x), y: sy(e.y) - 20, text: '-' + e.life, col: '#ff5a5a', life: 1.2, heart: true });
      } else if (e.k === 'build' || e.k === 'upgrade') {
        burst(e.x, e.y, 14, e.k === 'build' ? ['#e8e0c8', '#a39581'] : ['#ffe14d', '#ffffff'], 35, 30, 0.5);
        rings.push({ x: sx(e.x), y: sy(e.y), r: 3, max: 14, col: e.k === 'build' ? '#ffffff' : '#ffe14d', life: 0.4, ml: 0.4 });
      }
    }
  }
  function burst(x, y, n, cols, spd, grav, life) {
    for (var i = 0; i < n && parts.length < 400; i++) {
      var a = Math.random() * Math.PI * 2, v = spd * (0.35 + Math.random() * 0.75);
      parts.push({ x: sx(x), y: sy(y), vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.75 - spd * 0.4,
                   g: grav, life: life, ml: life, col: cols[(Math.random() * cols.length) | 0] });
    }
  }
  function stepFx(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (i = rings.length - 1; i >= 0; i--) { rings[i].life -= dt; if (rings[i].life <= 0) rings.splice(i, 1); }
    for (i = floats.length - 1; i >= 0; i--) { floats[i].life -= dt; floats[i].y -= dt * 14; if (floats[i].life <= 0) floats.splice(i, 1); }
    for (i = nums.length - 1; i >= 0; i--) { var n = nums[i]; n.life -= dt; n.y += n.vy * dt; n.vy *= 0.92; if (n.life <= 0) nums.splice(i, 1); }
  }
  function clearFx() { parts = []; rings = []; floats = []; nums = []; }

  function rangeEllipse(x, y, r, col, t) { // 射程（点線のだ円。草の上でも見えるよう下に黒い影をつける）
    var n = Math.max(32, Math.round(r * 26));
    for (var pass = 0; pass < 2; pass++) {
      b.fillStyle = pass ? col : 'rgba(10,14,10,.7)';
      for (var i = 0; i < n; i++) {
        if ((i + Math.floor(t * 8)) % 4 === 0) continue;
        var a = i / n * Math.PI * 2;
        b.fillRect(Math.round(sx(x) + Math.cos(a) * r * TW) + (pass ? 0 : 1), Math.round(sy(y) + Math.sin(a) * r * TH) + (pass ? 0 : 1), 1, 1);
      }
    }
  }
  function fillEllipse(x, y, r, col, a) {
    b.globalAlpha = a; b.fillStyle = col;
    b.beginPath(); b.ellipse(sx(x), sy(y), r * TW, r * TH, 0, 0, Math.PI * 2); b.fill();
    b.globalAlpha = 1;
  }
  function hpBar(x, y, w, r, col) {
    x = Math.round(x - w / 2); y = Math.round(y);
    b.fillStyle = '#0b0d0a'; b.fillRect(x - 1, y - 1, w + 2, 4);
    b.fillStyle = '#4a1a1a'; b.fillRect(x, y, w, 2);
    b.fillStyle = col; b.fillRect(x, y, Math.max(1, Math.round(w * r)), 2);
  }

  // ui: { selType, selTower, preview:{tx,ty}, time }
  function draw(s, ui, dt) {
    var S = G.SPR, t = ui.time;
    M = s.map;
    stepFx(dt);
    if (!bgCache[M.id]) bgCache[M.id] = buildBg();
    b.drawImage(bgCache[M.id], 0, 0);

    // 置ける場所の表示（カード選択中）
    if (ui.selType && !ui.pending && (s.phase === 'prep' || s.phase === 'attack')) {
      b.globalAlpha = 0.45 + 0.25 * Math.sin(t * 6);
      for (var ty = 0; ty < M.rowsN; ty++) for (var tx = 0; tx < M.cols; tx++) {
        if (!G.Battle.canPlaceAt(s, tx, ty)) continue;
        b.fillStyle = '#fff3b0';
        b.fillRect(tx * TW + 1, sy(ty) + 1, 2, 1); b.fillRect(tx * TW + TW - 3, sy(ty) + 1, 2, 1);
        b.fillRect(tx * TW + 1, sy(ty) + TH - 2, 2, 1); b.fillRect(tx * TW + TW - 3, sy(ty) + TH - 2, 2, 1);
      }
      b.globalAlpha = 1;
    }

    // 次の攻撃で使われる入口に「！」（タップすると次の敵が見える）
    if (s.phase === 'prep') {
      gatesNext(s).forEach(function (k) {
        var p = M.paths[k][0], gx = Math.round(sx(p[0])), gy = sy(0) - 3 + Math.round(Math.sin(t * 5) * 1.5);
        var open = ui.gateOpen === k;
        b.fillStyle = '#16120f'; b.fillRect(gx - 4, gy - 13, 9, 12);
        b.fillStyle = open ? '#ffe14d' : '#ff4d3a'; b.fillRect(gx - 3, gy - 12, 7, 10);
        b.fillStyle = '#ffffff'; b.fillRect(gx - 1, gy - 11, 3, 5); b.fillRect(gx - 1, gy - 5, 3, 2);
      });
    }

    // 奥（画面の上）から順に並べて重なりを正しく
    var list = [];
    s.towers.forEach(function (tw) { list.push({ y: tw.y + 0.2, k: 'tower', o: tw }); });
    s.enemies.forEach(function (e) { list.push({ y: e.y, k: 'enemy', o: e }); });
    var castleAt = null;
    M.rows.forEach(function (r, y) { var x = r.indexOf('G'); if (x >= 0) castleAt = { x: x + 0.5, y: y }; });
    list.push({ y: castleAt.y + 0.4, k: 'castle' });
    list.sort(function (a, c) { return a.y - c.y; });

    for (var i = 0; i < list.length; i++) {
      var it = list[i], o = it.o;
      if (it.k === 'castle') { blitB(S.castle, sx(castleAt.x), sy(castleAt.y + 1) + 4); continue; }
      if (it.k === 'tower') {
        var fire = o.fire > 0.12 ? 1 : 0, spr = S[o.type][Math.min(2, o.lv)][fire];
        if (spr.r) spr = o.aim < 0 ? spr.l : spr.r;
        b.fillStyle = 'rgba(0,0,0,.35)'; b.fillRect(sx(o.x) - 7, sy(o.y) + 3, 14, 2);
        // タワーを置くカードを選んでいる間は、後ろのマスが見えるようにタワーを半透明にする
        if (ui.selType) b.globalAlpha = 0.45;
        blitB(spr, sx(o.x), sy(o.y) + 5);
        b.globalAlpha = 1;
        for (var l = 0; l < o.lv; l++) { b.fillStyle = '#ffe14d'; b.fillRect(sx(o.x) - 3 + l * 4, sy(o.y) + 3, 2, 2); }
        // スキルで強くなっている間は、タワーの上に赤い↑（アップの色）
        if (o.bonusDmg > 0 || o.turnDmgMult > 1 || s.buff.speedMult > 1) {
          var ax = sx(o.x) + 6, ay = sy(o.y) + 5 - spr.height - 2 + Math.round(Math.sin(t * 4 + o.id) * 1);
          b.fillStyle = '#16120f'; b.fillRect(ax - 3, ay - 1, 7, 6);
          b.fillStyle = G.UP_COLOR; b.fillRect(ax, ay, 1, 4); b.fillRect(ax - 1, ay + 1, 3, 1); b.fillRect(ax - 2, ay + 2, 1, 1); b.fillRect(ax + 2, ay + 2, 1, 1);
        }
        // タワー対象のスキルを使う前の仮選択：点滅する枠
        if (ui.pendingTower === o.id) {
          var on = Math.floor(t * 4) % 2 === 0;
          b.fillStyle = on ? '#ffffff' : G.UP_COLOR;
          var bx0 = sx(o.x) - 9, by0 = sy(o.y) + 5 - spr.height - 3, bw = 18, bh = spr.height + 5;
          b.fillRect(bx0, by0, 3, 1); b.fillRect(bx0, by0, 1, 3); b.fillRect(bx0 + bw - 3, by0, 3, 1); b.fillRect(bx0 + bw - 1, by0, 1, 3);
          b.fillRect(bx0, by0 + bh - 1, 3, 1); b.fillRect(bx0, by0 + bh - 3, 1, 3); b.fillRect(bx0 + bw - 3, by0 + bh - 1, 3, 1); b.fillRect(bx0 + bw - 1, by0 + bh - 3, 1, 3);
        }
        continue;
      }
      // 敵
      var E = G.ENEMIES[o.type], fr = Math.floor(o.walk) % 2, es = S[o.type][fr];
      var img = o.face < 0 ? es.l : es.r, ex = sx(o.x), ey = sy(o.y) + 3;
      b.fillStyle = 'rgba(0,0,0,.35)'; b.fillRect(ex - 5, ey - 1, 10, 2);
      blitB(img, ex, ey);
      if (o.flash > 0) {
        b.globalCompositeOperation = 'lighter'; b.globalAlpha = 0.6; blitB(img, ex, ey);
        b.globalAlpha = 1; b.globalCompositeOperation = 'source-over';
      }
      // 状態異常：遅い＝青い粒、毒＝緑の泡
      if (o.slowT > 0 && Math.random() < 0.3) parts.push({ x: ex + (Math.random() - 0.5) * 10, y: ey - Math.random() * img.height, vx: 0, vy: 6, g: 0, life: 0.35, ml: 0.35, col: '#bff0ff' });
      if (o.poisonT > 0 && Math.random() < 0.3) parts.push({ x: ex + (Math.random() - 0.5) * 8, y: ey - img.height * 0.6, vx: 0, vy: -10, g: 0, life: 0.5, ml: 0.5, col: '#a6e85a' });
      var barW = E.boss ? 28 : (o.type === 'orc' || o.type === 'knight') ? 14 : 10;
      if (o.hp < o.max || E.boss) hpBar(ex, ey - img.height - 3, barW, Math.max(0, o.hp / o.max), o.hp / o.max > 0.5 ? '#7fd36a' : '#ffb347');
    }

    // 選んだタワーの射程：今の射程＝白、強化後の射程＝アップの赤（強化ボタンと同じ色）
    var selTw = ui.selTower ? G.Battle.findTower(s, ui.selTower) : null;
    if (selTw) {
      var cur = G.Battle.towerStats(selTw).range, nx = G.Battle.nextStats(selTw);
      // 強化後に射程が広がるならアップの赤、縮むならダウンの青
      var nc = nx && (nx.range >= cur ? G.UP_COLOR : G.DOWN_COLOR);
      if (nx) fillEllipse(selTw.x, selTw.y, nx.range, nc, 0.16);
      fillEllipse(selTw.x, selTw.y, cur, '#ffffff', 0.16);
      rangeEllipse(selTw.x, selTw.y, cur, '#ffffff', t);
      if (nx) rangeEllipse(selTw.x, selTw.y, nx.range, nc, t);
    }

    // 弾
    s.shots.forEach(function (sh) {
      var x = sx(sh.x), y = sy(sh.y);
      if (sh.kind === 'arrow' || sh.kind === 'bolt') {
        var ca = Math.cos(sh.ang || 0), sa = Math.sin(sh.ang || 0), len = sh.kind === 'bolt' ? 9 : 5;
        for (var k = 0; k < len; k++) {
          b.fillStyle = k === 0 ? '#ffffff' : sh.kind === 'bolt' ? '#8a8f99' : '#c08a4a';
          b.fillRect(Math.round(x - ca * k), Math.round(y - sa * k * 0.75), sh.kind === 'bolt' ? 2 : 1, 1);
        }
      } else if (sh.kind === 'ice') {
        b.fillStyle = '#5fc8ff'; b.fillRect(Math.round(x) - 1, Math.round(y) - 2, 3, 5); b.fillRect(Math.round(x) - 2, Math.round(y) - 1, 5, 3);
        b.fillStyle = '#ffffff'; b.fillRect(Math.round(x), Math.round(y), 1, 1);
      } else if (sh.kind === 'drip') {
        b.fillStyle = '#4a8a2a'; b.fillRect(Math.round(x) - 2, Math.round(y) - 1, 4, 4);
        b.fillStyle = '#a6e85a'; b.fillRect(Math.round(x) - 1, Math.round(y), 2, 2);
      } else if (sh.kind === 'stone') {
        var hy2 = y - (sh.h || 0) * TH * 1.6;
        b.fillStyle = 'rgba(0,0,0,.35)'; b.fillRect(Math.round(x) - 1, Math.round(y), 2, 1);
        b.fillStyle = '#16120f'; b.fillRect(Math.round(x) - 1, Math.round(hy2) - 1, 3, 3);
        b.fillStyle = '#9ca1a7'; b.fillRect(Math.round(x), Math.round(hy2), 1, 1);
      } else if (sh.kind === 'orb') {
        b.fillStyle = '#6f4cc0'; b.fillRect(Math.round(x) - 2, Math.round(y) - 2, 5, 5);
        b.fillStyle = '#c79bff'; b.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
        b.fillStyle = '#ffffff'; b.fillRect(Math.round(x), Math.round(y), 1, 1);
        if (Math.random() < 0.5) parts.push({ x: x, y: y, vx: 0, vy: 0, g: 0, life: 0.25, ml: 0.25, col: '#9a6ad8' });
      } else {
        var hy = y - (sh.h || 0) * TH * 1.6;
        b.fillStyle = 'rgba(0,0,0,.35)'; b.fillRect(Math.round(x) - 1, Math.round(y), 3, 1);
        b.fillStyle = '#16120f'; b.fillRect(Math.round(x) - 2, Math.round(hy) - 1, 4, 4);
        b.fillStyle = '#4a4d52'; b.fillRect(Math.round(x) - 1, Math.round(hy), 2, 2);
      }
    });

    // 置く前の見本（ドラッグ中・選択中に指している場所）
    if (ui.selType && ui.preview) {
      var pv = ui.preview, ok = G.Battle.canPlaceAt(s, pv.tx, pv.ty);
      var T = G.TOWERS[ui.selType];
      // 射程の内側をうすく塗る
      fillEllipse(pv.tx + 0.5, pv.ty + 0.5, T.range, ok ? '#ffffff' : '#ff5a5a', 0.2);
      rangeEllipse(pv.tx + 0.5, pv.ty + 0.5, T.range, ok ? '#ffffff' : '#ff5a5a', t);
      var ps = G.towerImg(ui.selType, 0, false);
      b.globalAlpha = ui.pending ? 0.75 : 0.6; blitB(ps, sx(pv.tx + 0.5), sy(pv.ty + 0.5) + 5); b.globalAlpha = 1;
      if (ui.pending && ok) { // 仮置き中：マスのかどを点滅させて「もう一度タップ」を示す
        var on = Math.floor(t * 4) % 2 === 0, x0 = pv.tx * TW, y0 = sy(pv.ty);
        b.fillStyle = on ? '#ffffff' : '#ffe14d';
        [[0, 0, 1, 1], [TW - 3, 0, -1, 1], [0, TH - 1, 1, -1], [TW - 3, TH - 1, -1, -1]].forEach(function (c) {
          b.fillRect(x0 + c[0], y0 + c[1], 3, 1); b.fillRect(x0 + (c[2] > 0 ? c[0] : c[0] + 2), y0 + c[1] + (c[3] > 0 ? 0 : -2), 1, 3);
        });
      }
    }

    // 効果
    rings.forEach(function (r) {
      var p = 1 - r.life / r.ml, rr = r.r + (r.max - r.r) * p, n = Math.max(12, Math.round(rr * 2.5));
      b.globalAlpha = 1 - p; b.fillStyle = r.col;
      for (var k = 0; k < n; k++) { var a = k / n * Math.PI * 2; b.fillRect(Math.round(r.x + Math.cos(a) * rr), Math.round(r.y + Math.sin(a) * rr * 0.75), 1, 1); }
      b.globalAlpha = 1;
    });
    parts.forEach(function (p) {
      b.globalAlpha = Math.min(1, p.life / p.ml * 1.6); b.fillStyle = p.col;
      b.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    });
    b.globalAlpha = 1;
    floats.forEach(function (f) {
      if (f.heart) { b.drawImage(S.heart, Math.round(f.x) - 9, Math.round(f.y) - 1); text(f.text, f.x + 3, f.y, f.col); }
      else text(f.text, f.x, f.y, f.col);
    });
  }

  function gatesNext(s) {
    var g = {}; G.Battle.nextWave(s).forEach(function (w) { g[w.gate] = true; });
    return Object.keys(g).sort();
  }
  // 「！」をタップしたか（指でも押しやすいよう広めに判定）
  function gateAt(s, px, py, cssW, cssH) {
    if (s.phase !== 'prep') return null;
    var x = px / cssW * W, y = py / cssH * H, hit = null;
    gatesNext(s).forEach(function (k) {
      var p = s.map.paths[k][0];
      if (Math.abs(x - sx(p[0])) <= 13 && y >= 0 && y <= sy(1) + 2) hit = k;
    });
    return hit;
  }
  // 数字は拡大後の画面に普通の文字で描く（小さなドット数字より読みやすい）
  function drawNums(ctx, scale) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    nums.forEach(function (n) {
      var a = Math.min(1, n.life / n.ml * 2.5), fs = Math.round(15 * n.size * scale / 2.1);
      ctx.globalAlpha = a;
      ctx.font = fs + 'px "DotGothic16", ui-monospace, monospace';
      ctx.lineWidth = Math.max(2, fs * 0.28); ctx.strokeStyle = '#120d08';
      ctx.strokeText(n.text, n.x * scale, n.y * scale);
      ctx.fillStyle = n.col; ctx.fillText(n.text, n.x * scale, n.y * scale);
    });
    ctx.globalAlpha = 1;
  }
  function gatePos(k) { var p = M.paths[k][0]; return { x: sx(p[0]) / W, y: (sy(1) + 2) / H }; }

  // 画面座標 → マス
  function toTile(px, py, cssW, cssH) {
    var x = px / cssW * W, y = py / cssH * H;
    return { tx: Math.floor(x / TW), ty: Math.floor((y - OY) / TH) };
  }
  function towerAt(s, px, py, cssW, cssH) { // タワーの絵の上を触っても選べるように少し上まで判定
    var x = px / cssW * W, y = py / cssH * H, best = null, bd = 1e9;
    s.towers.forEach(function (tw) {
      var dx = x - sx(tw.x), dy = y - (sy(tw.y) - 6);
      if (Math.abs(dx) <= 9 && dy >= -20 && dy <= 10) { var d = Math.abs(dx) + Math.abs(dy); if (d < bd) { bd = d; best = tw; } }
    });
    return best;
  }

  G.Render = { W: W, H: H, buf: buf, draw: draw, addEvents: addEvents, toTile: toTile, towerAt: towerAt, clearFx: clearFx,
               gateAt: gateAt, gatePos: gatePos, drawNums: drawNums };
})();

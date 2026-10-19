// 音：効果音とBGMをその場でコードから作る（音声ファイルは使わない）
// ブラウザの決まりで、画面に1回触れるまでは音が出ない（最初のタップで音の準備をする）
'use strict';
var G = window.G = window.G || {};

(function () {
  var ac = null, master = null, sfxBus = null, bgmBus = null, noiseBuf = null;
  var KEY = 'towerRogue.sound';
  var cfg = { se: true, bgm: true };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved) { cfg.se = saved.se !== false; cfg.bgm = saved.bgm !== false; } } catch (e) {}
  function saveCfg() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} }

  // ---- 最初のタップで音の準備（iPhone の Safari はタップの中でないと音を始められない） ----
  // 注意：iPhone では「指を置いた瞬間（pointerdown / touchstart）」は合図として認められない。
  // 指を離した時（touchend）・クリック・キー入力の中で作る／再開する
  function build(C) {
    ac = new C();
    master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = cfg.se ? 0.32 : 0; sfxBus.connect(master);
    bgmBus = ac.createGain(); bgmBus.gain.value = cfg.bgm ? 0.12 : 0; bgmBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
    var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    boss = null; bossOut = null;      // ボスの曲は音の準備ごとに作り直す
    tried = false;
  }
  // 音の準備は「本当のタップ」の中でだけする。
  //  ・スワイプ（指が動いた）の終わりはタップとして認められないので使わない
  //  ・1回のタップで touchend と click が続けて来るので、作り直しは前のタップから時間がたっている時だけ
  var tried = false, triedAt = 0, rebuilds = 0, touch0 = null;
  document.addEventListener('touchstart', function (e) { var t = e.touches[0]; touch0 = t ? { x: t.clientX, y: t.clientY } : null; }, { passive: true, capture: true });
  function unlock(e) {
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    if (e && e.isTrusted === false) return;   // プログラムが出したクリック（ダブルタップ対策など）はタップとして認められない
    if (e && e.type === 'touchend' && touch0 && e.changedTouches && e.changedTouches[0]) {
      var t = e.changedTouches[0];
      if (Math.hypot(t.clientX - touch0.x, t.clientY - touch0.y) > 12) return;   // スワイプだった
    }
    // iOS 17 以降：音楽アプリと同じ扱いにする（消音スイッチの影響を受けにくくする）
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e2) {}
    var now = Date.now();
    if (!ac) build(C);
    else if (ac.state !== 'running' && tried && now - triedAt > 800 && rebuilds < 3) {
      // 前のタップで再開できなかった（ブラウザを開き直した後など）：音の準備を作り直す
      rebuilds++;
      try { ac.close(); } catch (e3) {}
      build(C);
      if (bossOn) { bossOn = false; bossTheme(true); }
      else if (wantTrack) startTrack(wantTrack);
    }
    if (ac.state !== 'running') {
      if (!tried) triedAt = now;
      tried = true;
      try { var pr = ac.resume(); if (pr && pr.then) pr.then(function () { if (ac.state === 'running') tried = false; }); } catch (e4) {}
      // 無音を1回鳴らす（古い iPhone はこれで音が出るようになる）
      try { var b = ac.createBuffer(1, 1, 22050), src = ac.createBufferSource(); src.buffer = b; src.connect(ac.destination); src.start(0); } catch (e5) {}
    }
    if (wantTrack && !playing && !bossOn) startTrack(wantTrack);
  }
  ['touchend', 'click', 'keydown'].forEach(function (n) { document.addEventListener(n, unlock, { passive: true, capture: true }); });
  // 別のアプリに切り替えたら止め、戻ったら再開（だめなら次のタップで作り直す）
  document.addEventListener('visibilitychange', function () {
    if (!ac) return;
    if (document.hidden) ac.suspend(); else try { ac.resume(); } catch (e) {}
  });
  // ブラウザの「戻る」やアプリの切り替えでページがそのまま戻ってきた時も、次のタップで作り直せるように
  window.addEventListener('pageshow', function (e) { if (e.persisted && ac) { tried = true; triedAt = 0; } });
  function ready() { return ac && ac.state === 'running'; }

  // ---- 音の部品 ----
  // 音程のある音：f→f2 へ音の高さを動かす。type：sine / square / triangle / sawtooth
  function tone(t, o) {
    var os = ac.createOscillator(), g = ac.createGain(), st = t + (o.delay || 0), dur = o.dur || 0.1;
    os.type = o.type || 'square';
    os.frequency.setValueAtTime(o.f, st);
    if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, st + dur);
    g.gain.setValueAtTime(0.0001, st);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.2, st + Math.min(0.01, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
    os.connect(g); g.connect(o.bus || sfxBus);
    os.start(st); os.stop(st + dur + 0.02);
  }
  // ザッという音（爆発・風切り音）。f：フィルターの高さ、hp：高い音だけ残す
  function noise(t, o) {
    var src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), st = t + (o.delay || 0), dur = o.dur || 0.1;
    src.buffer = noiseBuf;
    f.type = o.hp ? 'highpass' : o.bp ? 'bandpass' : 'lowpass'; f.frequency.value = o.f || 1200;
    g.gain.setValueAtTime(o.vol || 0.2, st); g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    src.start(st, Math.random() * 0.3); src.stop(st + dur + 0.02);
  }
  function notes(t, list, o) { list.forEach(function (f, i) { tone(t, Object.assign({}, o, { f: f, delay: i * (o.step || 0.07) })); }); }

  // ---- 効果音の一覧 ----
  var SFX = {
    arrow:  function (t) { noise(t, { dur: 0.06, vol: 0.18, f: 2500, hp: true }); tone(t, { f: 880, f2: 520, dur: 0.05, type: 'triangle', vol: 0.06 }); },
    bolt:   function (t) { noise(t, { dur: 0.1, vol: 0.25, f: 1500, hp: true }); tone(t, { f: 300, f2: 140, dur: 0.1, type: 'square', vol: 0.08 }); },
    stone:  function (t) { tone(t, { f: 240, f2: 130, dur: 0.07, type: 'square', vol: 0.07 }); },
    ball:   function (t) { noise(t, { dur: 0.18, vol: 0.3, f: 500 }); tone(t, { f: 120, f2: 45, dur: 0.16, type: 'sine', vol: 0.3 }); },
    orb:    function (t) { tone(t, { f: 600, f2: 1100, dur: 0.12, type: 'sine', vol: 0.12 }); },
    ice:    function (t) { tone(t, { f: 1600, f2: 2200, dur: 0.08, type: 'triangle', vol: 0.08 }); },
    flame:  function (t) { noise(t, { dur: 0.16, vol: 0.18, f: 900, bp: true }); },
    spark:  function (t) { tone(t, { f: 1400, f2: 300, dur: 0.09, type: 'sawtooth', vol: 0.07 }); noise(t, { dur: 0.05, vol: 0.12, f: 4000, hp: true }); },
    drip:   function (t) { tone(t, { f: 500, f2: 220, dur: 0.08, type: 'sine', vol: 0.1 }); },
    hit:    function (t) { noise(t, { dur: 0.04, vol: 0.1, f: 1800 }); },
    kill:   function (t) { tone(t, { f: 520, f2: 980, dur: 0.07, type: 'square', vol: 0.07 }); },
    bigkill: function (t) { noise(t, { dur: 0.3, vol: 0.3, f: 700 }); notes(t, [392, 523, 659], { type: 'square', dur: 0.08, vol: 0.09, step: 0.05 }); },
    bossdown: function (t) { noise(t, { dur: 0.8, vol: 0.45, f: 600 }); tone(t, { f: 110, f2: 30, dur: 0.8, type: 'sawtooth', vol: 0.25 }); notes(t, [523, 659, 784, 1047], { type: 'square', dur: 0.14, vol: 0.1, step: 0.11, delay: 0.3 }); },
    coin:   function (t) { notes(t, [1319, 1760], { type: 'square', dur: 0.06, vol: 0.06, step: 0.05 }); },
    leak:   function (t) { tone(t, { f: 240, f2: 90, dur: 0.28, type: 'sawtooth', vol: 0.16 }); },
    build:  function (t) { noise(t, { dur: 0.08, vol: 0.18, f: 700 }); notes(t, [330, 440], { type: 'triangle', dur: 0.08, vol: 0.12, step: 0.06 }); },
    // 強化：上がっていくきらきらの和音＋ふわっと広がる低い音
    upgrade: function (t) {
      notes(t, [523, 659, 784, 1047, 1319], { type: 'triangle', dur: 0.22, vol: 0.11, step: 0.055 });
      notes(t, [1047, 1319, 1568, 2093, 2637], { type: 'sine', dur: 0.3, vol: 0.05, step: 0.055 });
      tone(t, { f: 262, f2: 523, dur: 0.45, type: 'sine', vol: 0.09 });
      noise(t, { dur: 0.4, vol: 0.05, f: 7000, hp: true, delay: 0.12 });
    },
    skill:  function (t) { tone(t, { f: 660, f2: 1320, dur: 0.18, type: 'sine', vol: 0.12 }); tone(t, { f: 990, dur: 0.12, type: 'triangle', vol: 0.06, delay: 0.06 }); },
    card:   function (t) { tone(t, { f: 1200, dur: 0.03, type: 'square', vol: 0.04 }); },
    tap:    function (t) { tone(t, { f: 880, dur: 0.035, type: 'triangle', vol: 0.06 }); },
    boom:   function (t) { noise(t, { dur: 0.3, vol: 0.35, f: 400 }); tone(t, { f: 90, f2: 35, dur: 0.25, type: 'sine', vol: 0.3 }); },
    boss:   function (t) { tone(t, { f: 82, dur: 0.9, type: 'sawtooth', vol: 0.18 }); tone(t, { f: 110, dur: 0.9, type: 'sawtooth', vol: 0.12, delay: 0.05 }); noise(t, { dur: 0.6, vol: 0.2, f: 300 }); },
    summon: function (t) { tone(t, { f: 320, f2: 140, dur: 0.3, type: 'square', vol: 0.1 }); tone(t, { f: 480, f2: 210, dur: 0.3, type: 'square', vol: 0.05, delay: 0.04 }); },
    heal:   function (t) { tone(t, { f: 880, f2: 1250, dur: 0.15, type: 'sine', vol: 0.06 }); },
    attack: function (t) { notes(t, [392, 392, 523], { type: 'square', dur: 0.09, vol: 0.08, step: 0.1 }); },
    win:    function (t) { notes(t, [523, 659, 784, 1047, 784, 1047], { type: 'square', dur: 0.12, vol: 0.09, step: 0.11 }); },
    lose:   function (t) { notes(t, [392, 330, 262, 196], { type: 'triangle', dur: 0.25, vol: 0.14, step: 0.22 }); }
  };
  // 同じ音が続けて鳴りすぎないように、最短の間隔（秒）
  var GAP = { hit: 0.07, arrow: 0.05, stone: 0.06, kill: 0.05, coin: 0.08, drip: 0.08, flame: 0.08, spark: 0.06, orb: 0.06, ice: 0.06, heal: 0.2 };
  var lastAt = {};
  function play(name) {
    if (!cfg.se || !ready() || !SFX[name]) return;
    var t = ac.currentTime;
    if (lastAt[name] && t - lastAt[name] < (GAP[name] || 0.03)) return;
    lastAt[name] = t;
    SFX[name](t);
  }

  // ============================================================
  // BGM：小さな曲を繰り返す。1つの文字の並び＝8分音符の並び（「-」は休み）
  // ============================================================
  var NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(n) {   // 'C5' 'F#4' 'Bb3' → 周波数
    var m = /^([A-G])([#b]?)(\d)$/.exec(n); if (!m) return 0;
    var k = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12;
    return 440 * Math.pow(2, (k - 69) / 12);
  }
  function seq(str) { return str.trim().split(/\s+/).map(function (x) { return x === '-' ? 0 : freq(x); }); }
  function roots(str) { return seq(str.trim().split(/\s+/).map(function (n) { return n + ' - - -'; }).join(' ')); }   // 1小節の頭だけ鳴らすベース
  var TRACKS = {
    // ---- ワールドマップ・イベント・商人・休憩の曲（戦闘よりゆったり） ----
    m1: { bpm: 92, lead: 'triangle', vol: 0.75,
          mel: seq('G4 - C5 - E5 - D5 C5 D5 - - - G4 - - - A4 - C5 - F5 - E5 D5 C5 - - - - - - - ' +
                   'E5 - G5 - E5 - D5 C5 D5 - E5 - C5 - - - A4 - C5 - D5 - B4 - C5 - - - - - - -'),
          bass: roots('C3 G2 F2 G2 A2 F2 C3 G2 C3 E2 F2 C3 A2 G2 C3 C3') },
    m2: { bpm: 78, lead: 'sine', vol: 0.9,
          mel: seq('E5 - - - D5 - C5 - B4 - - - A4 - - - C5 - - - D5 - E5 - G5 - - - E5 - - - ' +
                   'F5 - - - E5 - D5 - C5 - - - B4 - - - A4 - B4 - C5 - D5 - E5 - - - - - - -'),
          bass: roots('A2 E2 F2 C3 A2 G2 C3 E2 D2 A2 F2 E2 F2 G2 A2 A2') },
    m3: { bpm: 100, lead: 'triangle', vol: 0.75,
          mel: seq('E4 - G4 - B4 - - - A4 - G4 - F#4 - - - E4 - G4 - B4 - E5 - D5 - - - - - - - ' +
                   'C5 - B4 - A4 - - - B4 - A4 - G4 - - - F#4 - G4 - A4 - B4 - E4 - - - - - - -'),
          bass: roots('E2 E2 D2 B1 E2 G2 D2 D2 C2 C2 G2 G2 D2 E2 B1 E2') },
    // 第1層 草原：明るい長調
    a1: { bpm: 112, lead: 'square', vol: 0.5,
          mel: seq('E5 - G5 E5 D5 - C5 - D5 E5 G5 - A5 G5 E5 - C5 - E5 D5 C5 - A4 - G4 A4 C5 D5 E5 - - - ' +
                   'E5 - G5 E5 D5 - C5 - D5 E5 G5 - A5 - C6 - B5 A5 G5 E5 D5 - E5 - C5 - - - - - - -'),
          bass: seq('C3 - G3 - C3 - G3 - F3 - C4 - F3 - C4 - A2 - E3 - A2 - E3 - G2 - D3 - G2 - B2 - ' +
                    'C3 - G3 - C3 - G3 - F3 - C4 - F3 - C4 - G2 - D3 - G2 - D3 - C3 - G3 - C3 - - -') },
    // 第2層 雪山：静かな短調
    a2: { bpm: 96, lead: 'triangle', vol: 0.7,
          mel: seq('A4 - C5 - E5 - D5 C5 B4 - - - E4 - - - A4 - C5 - E5 - G5 F5 E5 - D5 - C5 - - - ' +
                   'F5 - E5 - D5 - C5 B4 C5 - A4 - - - - - D5 - C5 - B4 - G#4 - A4 - - - - - - -'),
          bass: seq('A2 - - - E3 - - - G2 - - - D3 - - - F2 - - - C3 - - - E2 - - - B2 - - - ' +
                    'D2 - - - A2 - - - F2 - - - C3 - - - E2 - - - E3 - - - A2 - - - A2 - - -') },
    // 第3層 火山：速くて不穏
    a3: { bpm: 132, lead: 'sawtooth', vol: 0.32,
          mel: seq('E5 - E5 F5 E5 - D5 - C5 - B4 - C5 D5 E5 - G5 - F5 E5 F5 - E5 - D5 - C5 - B4 - - - ' +
                   'E5 - B5 - A5 G5 F5 - E5 - F5 - G5 - A5 - B5 - A5 G5 F5 - E5 - F5 - E5 - D#5 - E5 -'),
          bass: seq('E2 E3 E2 E3 E2 E3 E2 E3 F2 F3 F2 F3 F2 F3 F2 F3 D2 D3 D2 D3 D2 D3 D2 D3 E2 E3 E2 E3 B1 B2 B1 B2 ' +
                    'E2 E3 E2 E3 E2 E3 E2 E3 F2 F3 F2 F3 F2 F3 F2 F3 G2 G3 G2 G3 A2 A3 A2 A3 B1 B2 B1 B2 E2 E3 E2 E3') },
    // ボスに勝った後（次の層へ進むまで）：明るいファンファーレ
    victory: { bpm: 120, lead: 'square', vol: 0.45,
          mel: seq('C5 - E5 G5 C6 - - - B5 - A5 - G5 - - - A5 - F5 A5 C6 - - - B5 - G5 B5 D6 - - - ' +
                   'E6 - D6 C6 B5 - C6 - D6 - E6 - C6 - - - A5 - B5 C6 D6 - G5 - C6 - - - - - - -'),
          bass: seq('C3 - G3 - C3 - G3 - G2 - D3 - G2 - D3 - F2 - C3 - F2 - C3 - G2 - D3 - G2 - B2 - ' +
                    'A2 - E3 - A2 - E3 - G2 - D3 - G2 - D3 - F2 - C3 - G2 - D3 - C3 - G3 - C3 - - -') },
    // ボス戦：低い音が刻む
    boss: { bpm: 144, lead: 'square', vol: 0.42,
          mel: seq('A4 - A4 C5 - A4 D5 - C5 - A4 - G4 - A4 - A4 - A4 C5 - A4 E5 - D5 C5 D5 - E5 - - - ' +
                   'F5 - E5 - D5 - C5 - D5 - C5 - B4 - G4 - A4 - C5 - E5 - A5 - G#5 - E5 - B4 - - -'),
          bass: seq('A1 A2 A1 A2 A1 A2 A1 A2 F1 F2 F1 F2 G1 G2 G1 G2 A1 A2 A1 A2 A1 A2 A1 A2 F1 F2 F1 F2 E1 E2 E1 E2 ' +
                    'D2 D3 D2 D3 D2 D3 D2 D3 F1 F2 F1 F2 G1 G2 G1 G2 A1 A2 A1 A2 C2 C3 C2 C3 E1 E2 E1 E2 E1 E2 E1 E2') }
  };
  var wantTrack = null, playing = null, pos = 0, nextT = 0, timer = null;
  function startTrack(name) {
    if (!ac) return;
    playing = name; pos = 0; nextT = ac.currentTime + 0.1;
    if (!timer) timer = setInterval(tick, 60);
  }
  function tick() {
    if (!playing || !ready()) return;
    var T = TRACKS[playing], step = 60 / T.bpm / 2, len = T.mel.length;
    // 少し先の分まで音を予約しておく（タイマーのずれで音がとぎれないように）
    while (nextT < ac.currentTime + 0.25) {
      var m = T.mel[pos % len], bs = T.bass[pos % T.bass.length];
      if (m) tone(nextT, { f: m, dur: step * 0.9, type: T.lead, vol: T.vol * 0.5, bus: bgmBus });
      if (bs) tone(nextT, { f: bs, dur: step * 0.8, type: 'triangle', vol: 0.55, bus: bgmBus });
      if (pos % 4 === 0) noise(nextT, { dur: 0.04, vol: 0.12, f: 6000, hp: true, bus: bgmBus });
      pos++; nextT += step;
    }
  }
  // ---- ボス出現の曲（終焉の玉座 ver11）：流している間は、ふつうのBGMを止めておく ----
  var boss = null, bossOut = null, bossOn = false;
  var bossErr = '';
  function bossTheme(on) {
    if (on === bossOn) return;
    bossOn = on;
    if (on) {
      playing = null;            // まずふつうのBGMを止める（wantTrack は覚えておく）
      if (!ac || !G.makeBossTheme) { bossErr = !ac ? '音の準備前' : '曲のファイルなし'; return; }
      try {
        if (!boss) { bossOut = ac.createGain(); bossOut.connect(master); boss = G.makeBossTheme(ac, bossOut); }
        bossOut.gain.value = cfg.bgm ? 0.55 : 0;
        boss.start(); bossErr = '';
      } catch (e) {
        // 鳴らせなかった時は、ふつうのBGMに戻す（理由は「音のテスト」に出す）
        bossErr = String(e && e.message || e); bossOn = false; boss = null;
        if (wantTrack) startTrack(wantTrack);
      }
    } else {
      if (boss) try { boss.stop(); } catch (e) {}
      if (wantTrack && ac) startTrack(wantTrack);   // 元のBGMに戻す
    }
  }
  // 曲を変える（同じ曲なら何もしない）。null で止める
  function music(name) {
    if (bossOn) bossTheme(false);
    if (wantTrack === name) return;
    wantTrack = name;
    if (!name) { playing = null; return; }
    if (ac) startTrack(name);
  }

  function set(kind, v) {
    cfg[kind] = v; saveCfg();
    if (ac) { (kind === 'se' ? sfxBus : bgmBus).gain.value = v ? (kind === 'se' ? 0.32 : 0.12) : 0; }
    if (kind === 'bgm' && bossOut) bossOut.gain.value = v ? 0.55 : 0;
  }
  // 音の状態（メニューの「音のテスト」で表示）
 function state() { return (ac ? '［' + ac.state + '・作り直し' + rebuilds + '回］' : '') + (!ac ? 'まだ準備していない（画面をタップすると準備）' : ac.state === 'running' ? '鳴らせる状態' : '止まっている（' + ac.state + '）') + (bossErr ? '・ボス曲のエラー：' + bossErr : '') + '・ボス曲' + (G.makeBossTheme ? 'あり' : 'なし'); }
  function test() { unlock(); var was = cfg.se; cfg.se = true; play('upgrade'); cfg.se = was; }
  // 曲を流したいのに音がまだ出せない時は、画面の下に「タップすると音が出ます」を出す
  setInterval(function () {
    var el = document.getElementById('tap-sound'); if (!el) return;
    el.hidden = !(G.started && (cfg.bgm || cfg.se) && (wantTrack || bossOn) && !ready());
  }, 500);
  G.Sound = { play: play, music: music, set: set, bossTheme: bossTheme, track: function () { return playing; }, bossPlaying: function () { return bossOn && !!boss && boss.playing; }, get: function (k) { return cfg[k]; }, state: state, test: test };
})();

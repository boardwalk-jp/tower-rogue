// 音：効果音とBGMをその場でコードから作る（音声ファイルは使わない）
// ブラウザの決まりで、画面に1回触れるまでは音が出ない（最初のタップで音の準備をする）
'use strict';
var G = window.G = window.G || {};

(function () {
  var ac = null, master = null, sfxBus = null, bgmBus = null, noiseBuf = null;
  var KEY = 'towerRogue.sound';
  // 音量：seVol・bgmVol は 0〜100（50が標準＝基礎音量。100で2倍）。オン／オフとは別に覚える
  var cfg = { se: true, bgm: true, seVol: 50, bgmVol: 50 };
  function clampVol(v) { v = +v; return isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 50; }
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved) { cfg.se = saved.se !== false; cfg.bgm = saved.bgm !== false; if (saved.seVol != null) cfg.seVol = clampVol(saved.seVol); if (saved.bgmVol != null) cfg.bgmVol = clampVol(saved.bgmVol); } } catch (e) {}
  // 基礎音量（標準の位置での大きさ）。2026-10-20に 効果音0.32→0.45・BGM0.12→0.18・ボス曲0.55→0.8 に上げた
  function seGain() { return cfg.se ? 0.45 * cfg.seVol / 50 : 0; }
  function bgmGain() { return cfg.bgm ? 0.18 * cfg.bgmVol / 50 : 0; }
  function bossGain() { return cfg.bgm ? 0.8 * cfg.bgmVol / 50 : 0; }
  function saveCfg() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} }

  // ---- 最初のタップで音の準備（iPhone の Safari はタップの中でないと音を始められない） ----
  // 注意：iPhone では「指を置いた瞬間（pointerdown / touchstart）」は合図として認められない。
  // 指を離した時（touchend）・クリック・キー入力の中で作る／再開する
  function build(C) {
    ac = new C();
    master = ac.createGain(); master.gain.value = 0.9;
    // 音がたくさん重なっても割れないように、最後に「音の大きさをおさえる部品」（コンプレッサー）を通す（2026-10-22）
    var comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
    master.connect(comp); comp.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = seGain(); sfxBus.connect(master);
    bgmBus = ac.createGain(); bgmBus.gain.value = bgmGain(); bgmBus.connect(master);
    // BGM のこだま：少し遅れて小さく、こもった音で何回か返す（広い場所で鳴っているように聞こえる）
    var dl = ac.createDelay(1.0), fb = ac.createGain(), wet = ac.createGain(), lp = ac.createBiquadFilter();
    dl.delayTime.value = 0.21; fb.gain.value = 0.28; wet.gain.value = 0.22; lp.type = 'lowpass'; lp.frequency.value = 2200;
    bgmBus.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
    var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    boss = null; bossOut = null;      // ボスの曲は音の準備ごとに作り直す
    for (var k in lastAt) delete lastAt[k];   // 効果音の「最後に鳴らした時刻」も消す（新しい時計は0から）
    tried = false;
    watchState();
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
    else if ((needFresh && now - shownAt < 600000) || (ac.state !== 'running' && tried && now - triedAt > 800)) {
      // ・別のアプリから戻ってきた後の最初のタップ：iPhone では「鳴らせる状態」と出ていても実は音が出ないことがあるので、毎回作り直す
      // ・前のタップで再開できなかった（ブラウザを開き直した後など）：作り直す（回数の上限なし）
      needFresh = false;
      rebuilds++;
      if (boss) try { boss.stop(); } catch (e6) {}   // 古い方のボス曲を止めてから
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
  // 戻った後の最初のタップで、音の準備を作り直す（needFresh）
  var needFresh = false, shownAt = 0;
  document.addEventListener('visibilitychange', function () {
    if (!ac) return;
    if (document.hidden) { try { ac.suspend(); } catch (e) {} }
    else { needFresh = true; shownAt = Date.now(); try { ac.resume(); } catch (e) {} }
  });
  // ブラウザの「戻る」やアプリの切り替えでページがそのまま戻ってきた時も、次のタップで作り直す
  window.addEventListener('pageshow', function (e) { if (e.persisted && ac) { needFresh = true; shownAt = Date.now(); } });
  // 電話・アラーム・他のアプリの音で止められた（iPhone の 'interrupted'）時も、次のタップで作り直す
  function watchState() { if (ac) ac.onstatechange = function () { if (ac.state === 'interrupted') { needFresh = true; shownAt = Date.now(); } }; }
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
  // 楽器らしい音（BGM用）：2つの音を少しずらして重ね（ふくらみ）、高い音をけずり（やわらかく）、
  // 出だしは速く・そのあと少し小さくなって続き・最後はすっと消える（ADSR）
  function voice(t, o) {
    var st = t, dur = o.dur, g = ac.createGain(), f = ac.createBiquadFilter(), v = o.vol || 0.1, a = o.att || 0.008;
    f.type = 'lowpass'; f.frequency.setValueAtTime(o.cut || 3000, st); f.Q.value = 0.7;
    if (o.cutEnd) f.frequency.exponentialRampToValueAtTime(o.cutEnd, st + dur);
    g.gain.setValueAtTime(0.0001, st);
    g.gain.exponentialRampToValueAtTime(v, st + a);
    g.gain.exponentialRampToValueAtTime(v * (o.sus || 0.6), st + a + Math.min(0.12, dur * 0.4));
    g.gain.setValueAtTime(v * (o.sus || 0.6), st + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, st + dur + (o.rel || 0.06));
    f.connect(g); g.connect(o.bus || sfxBus);
    (o.det || [-6, 6]).forEach(function (c) {
      var os = ac.createOscillator(); os.type = o.type || 'square'; os.frequency.setValueAtTime(o.f, st); os.detune.value = c;
      os.connect(f); os.start(st); os.stop(st + dur + (o.rel || 0.06) + 0.02);
    });
  }
  // 太鼓：kick（低いドン）・snare（シャッ）・hat（チッ）
  function drum(t, kind, vol, bus) {
    if (kind === 'kick') tone(t, { f: 150, f2: 42, dur: 0.16, type: 'sine', vol: 0.55 * vol, bus: bus });
    else if (kind === 'snare') { noise(t, { dur: 0.12, vol: 0.28 * vol, f: 1800, bp: true, bus: bus }); tone(t, { f: 220, f2: 160, dur: 0.06, type: 'triangle', vol: 0.12 * vol, bus: bus }); }
    else noise(t, { dur: 0.03, vol: 0.09 * vol, f: 7000, hp: true, bus: bus });
  }
  function notes(t, list, o) { list.forEach(function (f, i) { tone(t, Object.assign({}, o, { f: f, delay: i * (o.step || 0.07) })); }); }

  // ---- 効果音の一覧 ----
  var SFX = {
    arrow:  function (t) { noise(t, { dur: 0.09, vol: 0.16, f: 3200, bp: true }); tone(t, { f: 980, f2: 420, dur: 0.06, type: 'triangle', vol: 0.06 }); tone(t, { f: 196, dur: 0.05, type: 'triangle', vol: 0.05 }); },   // 風を切る音＋弦のビン
    bolt:   function (t) { noise(t, { dur: 0.1, vol: 0.25, f: 1500, hp: true }); tone(t, { f: 300, f2: 140, dur: 0.1, type: 'square', vol: 0.08 }); },
    stone:  function (t) { tone(t, { f: 240, f2: 130, dur: 0.07, type: 'square', vol: 0.07 }); },
    ball:   function (t) { noise(t, { dur: 0.18, vol: 0.3, f: 500 }); tone(t, { f: 120, f2: 45, dur: 0.16, type: 'sine', vol: 0.3 }); },
    orb:    function (t) { tone(t, { f: 600, f2: 1100, dur: 0.12, type: 'sine', vol: 0.12 }); },
    ice:    function (t) { tone(t, { f: 1600, f2: 2200, dur: 0.08, type: 'triangle', vol: 0.08 }); },
    flame:  function (t) { noise(t, { dur: 0.16, vol: 0.18, f: 900, bp: true }); },
    spark:  function (t) { tone(t, { f: 1400, f2: 300, dur: 0.09, type: 'sawtooth', vol: 0.07 }); noise(t, { dur: 0.05, vol: 0.12, f: 4000, hp: true }); },
    drip:   function (t) { tone(t, { f: 500, f2: 220, dur: 0.08, type: 'sine', vol: 0.1 }); },
    hit:    function (t) { noise(t, { dur: 0.05, vol: 0.1, f: 1800 }); tone(t, { f: 180, f2: 110, dur: 0.04, type: 'sine', vol: 0.06 }); },
    kill:   function (t) { tone(t, { f: 520, f2: 980, dur: 0.07, type: 'square', vol: 0.06 }); noise(t, { dur: 0.06, vol: 0.08, f: 900, delay: 0.01 }); tone(t, { f: 1960, dur: 0.05, type: 'sine', vol: 0.03, delay: 0.04 }); },   // ポンとはじける
    bigkill: function (t) { noise(t, { dur: 0.3, vol: 0.3, f: 700 }); notes(t, [392, 523, 659], { type: 'square', dur: 0.08, vol: 0.09, step: 0.05 }); },
    bossdown: function (t) { noise(t, { dur: 0.8, vol: 0.45, f: 600 }); tone(t, { f: 110, f2: 30, dur: 0.8, type: 'sawtooth', vol: 0.25 }); notes(t, [523, 659, 784, 1047], { type: 'square', dur: 0.14, vol: 0.1, step: 0.11, delay: 0.3 }); },
    coin:   function (t) { notes(t, [1319, 1760], { type: 'square', dur: 0.06, vol: 0.05, step: 0.05 }); notes(t, [2637, 3520], { type: 'sine', dur: 0.12, vol: 0.03, step: 0.05 }); },   // チャリン（高い響きを重ねる）
    leak:   function (t) { tone(t, { f: 240, f2: 90, dur: 0.28, type: 'sawtooth', vol: 0.16 }); },
    build:  function (t) { tone(t, { f: 120, f2: 60, dur: 0.12, type: 'sine', vol: 0.25 }); noise(t, { dur: 0.08, vol: 0.18, f: 700 }); noise(t, { dur: 0.04, vol: 0.12, f: 2500, bp: true, delay: 0.07 }); notes(t, [330, 440, 554], { type: 'triangle', dur: 0.09, vol: 0.1, step: 0.06, delay: 0.05 }); },   // ドスッ＋トン（木をたたく）＋上がる音
    // 強化：上がっていくきらきらの和音＋ふわっと広がる低い音
    upgrade: function (t) {
      notes(t, [523, 659, 784, 1047, 1319], { type: 'triangle', dur: 0.22, vol: 0.11, step: 0.055 });
      notes(t, [1047, 1319, 1568, 2093, 2637], { type: 'sine', dur: 0.3, vol: 0.05, step: 0.055 });
      tone(t, { f: 262, f2: 523, dur: 0.45, type: 'sine', vol: 0.09 });
      noise(t, { dur: 0.4, vol: 0.05, f: 7000, hp: true, delay: 0.12 });
    },
    skill:  function (t) { tone(t, { f: 660, f2: 1320, dur: 0.18, type: 'sine', vol: 0.12 }); tone(t, { f: 990, dur: 0.12, type: 'triangle', vol: 0.06, delay: 0.06 }); },
    card:   function (t) { noise(t, { dur: 0.05, vol: 0.06, f: 5000, hp: true }); tone(t, { f: 1200, dur: 0.03, type: 'triangle', vol: 0.04 }); },   // カードをめくるシュッ
    // ボタンを押した時の「カチャッ」（2026-10-22 オーナー指定。前は高い「ピッ」）：
    //   カチ＝ごく短い高いザッと硬い音（つめが当たる）／ャッ＝35ミリ秒あとに、少し低い2つ目の音と小さなこもった音（はまる手ごたえ）
    tap:    function (t) {
      noise(t, { dur: 0.018, vol: 0.3, f: 3800, hp: true }); tone(t, { f: 2100, f2: 1500, dur: 0.02, type: 'square', vol: 0.04 });
      noise(t, { dur: 0.03, vol: 0.2, f: 2200, bp: true, delay: 0.035 }); tone(t, { f: 1250, f2: 900, dur: 0.03, type: 'triangle', vol: 0.07, delay: 0.035 });
      tone(t, { f: 190, f2: 120, dur: 0.05, type: 'sine', vol: 0.1, delay: 0.035 });
    },
    // 「この指揮官で始める」：出陣のファンファーレ（タ・タ・タ・ジャーン）。約1.5秒。この間はBGMを止めておく
    start:  function (t) {
      notes(t, [392, 523, 659], { type: 'square', dur: 0.09, vol: 0.07, step: 0.1 });
      var t2 = t + 0.32;
      tone(t2, { f: 150, f2: 42, dur: 0.2, type: 'sine', vol: 0.4 });                       // ドン
      noise(t2, { dur: 0.9, vol: 0.1, f: 5000, hp: true });                                // シャーン（シンバル）
      [523, 659, 784, 1047].forEach(function (f, i) { voice(t2, { f: f, dur: 0.95, type: i ? 'square' : 'triangle', vol: 0.05, cut: 2600, cutEnd: 1200, sus: 0.7, rel: 0.4 }); });
      voice(t2, { f: 131, dur: 1.0, type: 'triangle', vol: 0.22, cut: 900, sus: 0.8, rel: 0.4, det: [0] });
    },
    boom:   function (t) { noise(t, { dur: 0.3, vol: 0.35, f: 400 }); tone(t, { f: 90, f2: 35, dur: 0.25, type: 'sine', vol: 0.3 }); },
    boss:   function (t) { tone(t, { f: 82, dur: 0.9, type: 'sawtooth', vol: 0.18 }); tone(t, { f: 110, dur: 0.9, type: 'sawtooth', vol: 0.12, delay: 0.05 }); noise(t, { dur: 0.6, vol: 0.2, f: 300 }); },
    // ボスが砦をたたく：重い一撃＋石がくだける音
    bossHit: function (t) { tone(t, { f: 70, f2: 32, dur: 0.35, type: 'sine', vol: 0.4 }); noise(t, { dur: 0.25, vol: 0.4, f: 900 }); noise(t, { dur: 0.5, vol: 0.18, f: 2500, bp: true, delay: 0.05 }); tone(t, { f: 160, f2: 90, dur: 0.18, type: 'square', vol: 0.08 }); },
    // ボスが砦の前にたどり着いた：うなり声
    bossRoar: function (t) { tone(t, { f: 140, f2: 70, dur: 0.7, type: 'sawtooth', vol: 0.18 }); tone(t, { f: 210, f2: 95, dur: 0.6, type: 'sawtooth', vol: 0.1, delay: 0.05 }); noise(t, { dur: 0.6, vol: 0.12, f: 500, bp: true }); },
    summon: function (t) { tone(t, { f: 320, f2: 140, dur: 0.3, type: 'square', vol: 0.1 }); tone(t, { f: 480, f2: 210, dur: 0.3, type: 'square', vol: 0.05, delay: 0.04 }); },
    heal:   function (t) { tone(t, { f: 880, f2: 1250, dur: 0.15, type: 'sine', vol: 0.06 }); },
    warp:   function (t) { tone(t, { f: 1400, f2: 300, dur: 0.18, type: 'triangle', vol: 0.05 }); tone(t + 0.12, { f: 260, f2: 1100, dur: 0.16, type: 'triangle', vol: 0.045 }); },   // ワープ：下がって上がる「ヒュン」
    attack: function (t) { notes(t, [392, 392, 523], { type: 'square', dur: 0.09, vol: 0.08, step: 0.1 }); },
    win:    function (t) { notes(t, [523, 659, 784, 1047, 784, 1047], { type: 'square', dur: 0.12, vol: 0.09, step: 0.11 }); },
    lose:   function (t) { notes(t, [392, 330, 262, 196], { type: 'triangle', dur: 0.25, vol: 0.14, step: 0.22 }); }
  };
  // 同じ音が続けて鳴りすぎないように、最短の間隔（秒）
  var GAP = { hit: 0.07, arrow: 0.05, stone: 0.06, kill: 0.05, coin: 0.08, drip: 0.08, flame: 0.08, spark: 0.06, orb: 0.06, ice: 0.06, heal: 0.2, warp: 0.25 };
  var lastAt = {};
  function play(name) {
    if (!cfg.se || !ready() || !SFX[name]) return;
    var t = ac.currentTime;
    // 同じ音の鳴らしすぎを防ぐ。音の準備を作り直すと時計が0に戻るので、前の時刻より小さい時は気にしない
    if (lastAt[name] && t >= lastAt[name] && t - lastAt[name] < (GAP[name] || 0.03)) return;
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
  // 和音の名前（'C' 'Am' 'F#m' 'Bb' など）→ 根の音からの半音の数 [根, 3度, 5度] と、根の音の名前
  function chord(name) { var m = /^([A-G][#b]?)(m?)$/.exec(name); return { root: m[1], iv: [0, m[2] ? 3 : 4, 7] }; }
  function semi(f, n) { return f * Math.pow(2, n / 12); }
  // 2026-10-22：戦闘の曲（a1〜a3）とイベント等の曲（m1〜m3）は消した（戦闘・イベント・商人はワールドマップの曲のまま。たき火は曲なし）
  var TRACKS = {
    // ---- ワールドマップ専用の曲（2026-10-22）。16小節。chords：小節ごとの和音、arp：和音の音を順にならす飾りの音 ----
    // ---- タイトル・指揮官を選ぶ・クリア・敗北の曲（2026-10-22） ----
    // タイトル：夕暮れの砦。短調で始まり、後半で明るく広がる
    title: { style: 'calm', bpm: 88, lead: 'triangle', vol: 0.9, arp: { pat: [0, 1, 2, 1, 0, 1, 2, 1], oct: 4, type: 'triangle', vol: 0.045 },
          chords: 'Am F C G Am F G G F G Em Am F G C C'.split(' '),
          mel: seq('A4 - - - E5 - - - F5 - E5 - C5 - A4 - G4 - C5 - E5 - G5 - D5 - - - - - - - ' +
                   'A4 - C5 - E5 - A5 - A5 - G5 - F5 - C5 - D5 - G5 - B5 - D6 - D6 - - - - - - - ' +
                   'C6 - - - A5 - F5 - D6 - - - B5 - G5 - E5 - G5 - B5 - G5 - A5 - - - E5 - C5 - ' +
                   'F5 - A5 - C6 - A5 - B5 - D6 - G5 - B5 - C6 - - - G5 - E5 - C6 - - - - - - -') },
    // 指揮官を選ぶ：出発の準備。小太鼓の入った行進曲（長調）
    cmd: { style: 'battleSoft', bpm: 100, lead: 'square', vol: 0.5, arp: { pat: [0, 0, 1, 0, 2, 0, 1, 0], oct: 3, type: 'square', vol: 0.03 },
          chords: 'G C D G Em C D D G C D Em C D G G'.split(' '),
          mel: seq('G4 - B4 - D5 - G5 - E5 - - - C5 - E5 - F#5 - E5 - D5 - A4 - B4 - - - G4 - - - ' +
                   'B4 - E5 - G5 - B5 - A5 - G5 - E5 - C5 - D5 - F#5 - A5 - F#5 - A5 - - - - - - - ' +
                   'B5 - - - G5 - D5 - E5 - G5 - C6 - G5 - F#5 - A5 - D6 - A5 - G5 - - - E5 - B4 - ' +
                   'C5 - E5 - G5 - C6 - A5 - F#5 - D5 - F#5 - G5 - - - D5 - B4 - G5 - - - - - - -') },
    // クリア：全3層を守りきった。大きく明るいフィナーレ（長調）
    clear: { style: 'map', bpm: 108, lead: 'square', vol: 0.5, arp: { pat: [0, 1, 2, 3, 2, 1, 2, 1], oct: 4, type: 'triangle', vol: 0.05 },
          chords: 'C Am F G C Am Dm G F G Em Am F G C C'.split(' '),
          mel: seq('C5 - E5 - G5 - C6 - E6 - - - C6 - A5 - F5 - A5 - C6 - A5 - B5 - - - G5 - D5 - ' +
                   'E5 - G5 - C6 - E6 - C6 - - - A5 - E5 - F5 - A5 - D6 - F6 - D6 - - - - - - - ' +
                   'C6 - - - A5 - F5 - B5 - - - G5 - D5 - E5 - G5 - B5 - E6 - C6 - - - A5 - - - ' +
                   'A5 - C6 - F6 - C6 - B5 - D6 - G6 - D6 - E6 - - - C6 - G5 - C6 - - - - - - -') },
    // 敗北：静かでさみしい短調（8小節）
    defeat: { style: 'calm', bpm: 70, lead: 'sine', vol: 0.95, arp: { pat: [0, -1, 1, -1, 2, -1, 1, -1], oct: 4, type: 'sine', vol: 0.045 },
          chords: 'Am Dm E Am F Dm E Am'.split(' '),
          mel: seq('E5 - - - C5 - - - D5 - - - F5 - - - E5 - D5 - B4 - G#4 - A4 - - - - - - - ' +
                   'C5 - - - A4 - - - F4 - A4 - D5 - - - B4 - - - G#4 - - - A4 - - - - - - -') },
    // 第1層 草原：明るく冒険に出る感じ（長調）
    w1: { style: 'map', bpm: 104, lead: 'triangle', vol: 0.85, arp: { pat: [0, 1, 2, 1, 0, 1, 2, 1], oct: 4, type: 'triangle', vol: 0.05 },
          chords: 'C G Am F C G F G Am F C G F G C C'.split(' '),
          mel: seq('G4 - C5 - E5 - G5 - F5 - E5 D5 - B4 - - A4 - C5 - E5 - A5 - G5 F5 E5 - C5 - - - ' +
                   'E5 - G5 - C6 - B5 A5 G5 - D5 - B4 - D5 - C5 - F5 - A5 - G5 F5 G5 - - - - - - - ' +
                   'E5 - A5 - G5 E5 C5 - F5 - A5 - C6 - A5 - G5 - E5 - C5 - E5 G5 D6 - B5 - G5 - - - ' +
                   'A5 - G5 F5 C5 - F5 - B5 - A5 G5 D5 - G5 - C6 - G5 - E5 - G5 - C6 - - - - - - -') },
    // 商人（2026-10-22 オーナー指定）：にぎやかでちょっとおどけた店の曲（ヘ長調）。どの層でも同じ。飾りの音は「ズン・チャッ」と跳ねる形
    shop: { style: 'map', bpm: 112, lead: 'square', vol: 0.45, arp: { pat: [0, 2, 1, 2, 0, 2, 1, 2], oct: 4, type: 'triangle', vol: 0.05 },
          chords: 'F C Dm Bb F C Bb C Dm Bb F C Bb C F F'.split(' '),
          mel: seq('F5 - A5 C6 A5 - F5 - G5 - E5 C5 E5 - G5 - A5 - F5 D5 F5 - A5 - Bb5 A5 G5 F5 D5 - - - ' +
                   'F5 - A5 C6 A5 - F5 - G5 - E5 G5 C6 - Bb5 - A5 G5 F5 - D5 - F5 - E5 - G5 - C6 - - - ' +
                   'D6 - C6 A5 F5 - A5 - Bb5 - A5 G5 F5 - D5 - C6 - A5 F5 A5 - C6 - Bb5 A5 G5 - E5 - C5 - ' +
                   'D5 F5 Bb5 - A5 G5 F5 - E5 G5 C6 - Bb5 A5 G5 - A5 - F5 - C5 - F5 - F5 - - - - - - -') },
    // 第2層 雪山：静かで少しさみしい（短調から明るい所へ）。きらきらした鐘のような飾りの音
    w2: { style: 'calm', bpm: 84, lead: 'sine', vol: 0.95, arp: { pat: [0, -1, 2, -1, 1, -1, 2, -1], oct: 5, type: 'sine', vol: 0.06 },
          chords: 'Am F C G Am F E E F G Em Am Dm E Am Am'.split(' '),
          mel: seq('E5 - - - A4 - C5 - F5 - - - C5 - A4 - G5 - - - E5 - C5 - D5 - - - B4 - G4 - ' +
                   'A4 - C5 - E5 - A5 - G5 - F5 - E5 - C5 - B4 - - - G#4 - B4 - E5 - - - - - - - ' +
                   'A5 - - - F5 - C5 - B5 - - - G5 - D5 - G5 - E5 - B4 - E5 - C6 - - - A5 - E5 - ' +
                   'F5 - - - D5 - A4 - G#4 - B4 - E5 - D5 - C5 - - - E5 - - - A4 - - - - - - -') },
    // 第3層 火山：緊張感のある短調。低い音で刻む飾りの音
    w3: { style: 'battleSoft', bpm: 112, lead: 'triangle', vol: 0.8, arp: { pat: [0, 0, 1, 0, 2, 0, 1, 0], oct: 3, type: 'square', vol: 0.035 },
          chords: 'Em C D Em Em C B B Am C Em Em C D B Em'.split(' '),
          mel: seq('E4 - G4 - B4 - E5 - G5 - E5 - C5 - E5 - F#5 - A5 - D5 - F#5 - G5 - - - E5 - - - ' +
                   'B4 - E5 - G5 - B5 - C6 - B5 - G5 - E5 - D#5 - F#5 - B5 - A5 - B5 - - - - - - - ' +
                   'A5 - C6 - B5 - A5 - G5 - E5 - C5 - E5 - B4 - - - E5 - G5 - B5 - - - - - - - ' +
                   'C6 - B5 - G5 - E5 - F#5 - A5 - D6 - C6 - B5 - F#5 - D#5 - B4 - E5 - - - - - - -') },
    // ボスに勝った後（次の層へ進むまで）：明るいファンファーレ
    victory: { style: 'battle', bpm: 120, lead: 'square', vol: 0.45,
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
  var wantTrack = null, playing = null, pos = 0, nextT = 0, timer = null, holdUntil = 0;
  // hold(秒)：これから始める曲を、その秒数だけ待ってから始める（スタートのファンファーレと重ならないように）
  function hold(sec) { holdUntil = ac ? ac.currentTime + sec : 0; }
  function startTrack(name) {
    if (!ac) return;
    playing = name; pos = 0; nextT = Math.max(ac.currentTime + 0.1, holdUntil);
    if (!timer) timer = setInterval(tick, 60);
  }
  function tick() {
    if (!playing || !ready()) return;
    var T = TRACKS[playing], step = 60 / T.bpm / 2, len = T.mel.length;
    // 少し先の分まで音を予約しておく（タイマーのずれで音がとぎれないように）
    // 2026-10-22 改良：メロディは「楽器らしい音」で、同じ高さが続く所は長くのばす。ベースの下にもう1つ低い音。
    // ベースの音が変わるたびに、うすい和音（根の音・5度・オクターブ）を長くのばす。曲の種類ごとに太鼓を入れる
    var calm = T.style === 'calm', soft = T.style === 'battleSoft';
    var cut = T.lead === 'sawtooth' ? 1800 : T.lead === 'square' ? 2600 : 4200;
    while (nextT < ac.currentTime + 0.25) {
      var i = pos % len, m = T.mel[i], bs = T.bass ? T.bass[pos % T.bass.length] : 0;
      if (m) {
        var n = 1; while (n < 4 && T.mel[(i + n) % len] === 0 && (i + n) % 8 !== 0) n++;   // 後ろが休みなら、その分のばす（小節はまたがない）
        voice(nextT, { f: m, dur: step * (n - 0.15), type: T.lead, vol: T.vol * 0.42, bus: bgmBus, cut: cut, cutEnd: cut * 0.6, sus: calm ? 0.75 : 0.55, rel: calm ? 0.18 : 0.06 });
      }
      if (T.chords) {   // 和音つきの曲：ベース・うすい和音・飾りの音を、小節ごとの和音から作る
        var C = chord(T.chords[Math.floor(pos / 8) % T.chords.length]), rf = freq(C.root + '2');
        if (pos % 4 === 0) {
          voice(nextT, { f: rf, dur: step * 3.8, type: 'triangle', vol: 0.48, bus: bgmBus, cut: 1200, sus: 0.7, det: [0] });
          voice(nextT, { f: rf / 2, dur: step * 3.8, type: 'sine', vol: 0.3, bus: bgmBus, cut: 500, sus: 0.8, det: [0] });
        }
        if (pos % 8 === 0) C.iv.forEach(function (n, j) {
          voice(nextT, { f: semi(rf * 2, n), dur: step * 7.8, type: calm ? 'sine' : 'triangle', vol: 0.055 - j * 0.008, bus: bgmBus, cut: 1500, att: 0.12, sus: 0.85, rel: 0.4, det: [-5, 5] });
        });
        var A = T.arp, ai = A && A.pat[pos % A.pat.length];
        if (A && ai >= 0) {
          var base = freq(C.root + A.oct), n2 = ai < 3 ? C.iv[ai] : 12;
          voice(nextT, { f: semi(base, n2), dur: step * 0.9, type: A.type, vol: A.vol, bus: bgmBus, cut: A.type === 'square' ? 900 : 3500, sus: 0.4, rel: 0.12, det: [0] });
        }
      }
      if (bs && !T.chords) {
        var bl = 1; while (bl < 4 && !T.bass[(pos + bl) % T.bass.length]) bl++;
        voice(nextT, { f: bs, dur: step * (bl - 0.2), type: 'triangle', vol: 0.5, bus: bgmBus, cut: 1400, sus: 0.7, det: [0] });
        voice(nextT, { f: bs / 2, dur: step * (bl - 0.2), type: 'sine', vol: 0.32, bus: bgmBus, cut: 600, sus: 0.8, det: [0] });
        if (pos % 4 === 0) [2, 3, 4].forEach(function (k, j) {   // うすい和音（ふわっと出て、ゆっくり消える）
          voice(nextT, { f: bs * k, dur: step * 3.8, type: calm ? 'sine' : 'triangle', vol: 0.06 - j * 0.012, bus: bgmBus, cut: 1600, att: 0.08, sus: 0.8, rel: 0.25, det: [-4, 5] });
        });
      }
      if (calm) { if (pos % 2 === 1) drum(nextT, 'hat', 0.5, bgmBus); }
      else if (T.style === 'map') { if (pos % 8 === 0 || pos % 8 === 5) drum(nextT, 'kick', 0.55, bgmBus); if (pos % 8 === 4) drum(nextT, 'snare', 0.35, bgmBus); if (pos % 2 === 1) drum(nextT, 'hat', 0.55, bgmBus); }
      else if (soft) { if (pos % 8 === 0) drum(nextT, 'kick', 0.7, bgmBus); if (pos % 8 === 4) drum(nextT, 'snare', 0.5, bgmBus); if (pos % 2 === 0) drum(nextT, 'hat', 0.6, bgmBus); }
      else { if (pos % 4 === 0) drum(nextT, 'kick', 1, bgmBus); if (pos % 8 === 4) drum(nextT, 'snare', 0.9, bgmBus); drum(nextT, 'hat', pos % 2 ? 0.5 : 0.9, bgmBus); }
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
        bossOut.gain.value = bossGain();
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
    if (name) ambient(null);   // ほかの曲に変わったら、たき火の音は止める
    if (wantTrack === name) return;
    wantTrack = name;
    if (!name) { playing = null; return; }
    if (ac) startTrack(name);
  }

  // ---- たき火の音（2026-10-22）：BGMはなし。うっすらした風の音＋たき火のパチパチ。火山はそれにグツグツ ----
  // ambient('camp') / ambient('volcano') / ambient(null)。効果音の音量（sfxBus）で鳴る。音の準備を作り直したら、自動で作り直す
  var amb = null, ambWant = null, ambBuf = null;
  function ambient(kind) { ambWant = kind || null; ambSync(); }
  function ambStop() {
    if (!amb) return;
    clearInterval(amb.timer);
    try { var g = amb.out.gain; g.cancelScheduledValues(ac.currentTime); g.setTargetAtTime(0.0001, ac.currentTime, 0.25); } catch (e) {}
    var old = amb; setTimeout(function () { old.srcs.forEach(function (n) { try { n.stop(); } catch (e) {} }); try { old.out.disconnect(); } catch (e) {} }, 1200);
    amb = null;
  }
  function ambSync() {
    if (amb && (amb.kind !== ambWant || amb.ac !== ac)) ambStop();
    if (!ambWant || amb || !ac) return;
    // 4秒のざーっという音（短いとくり返しが分かるので、効果音用の0.6秒とは別に長く作る）
    if (!ambBuf || ambBuf.ac !== ac) {
      ambBuf = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate); ambBuf.ac = ac;
      var d = ambBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var out = ac.createGain(), now = ac.currentTime, srcs = [];
    out.gain.setValueAtTime(0.0001, now); out.gain.setTargetAtTime(1, now, 0.6); out.connect(sfxBus);   // ふわっと始める
    function bed(type, freq, q, vol) {   // ずっと鳴っているざーっという音（フィルターで色をつける）
      var src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = ambBuf; src.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
      src.connect(f); f.connect(g); g.connect(out); src.start(now, Math.random() * 3.5); srcs.push(src);
      return { f: f, g: g };
    }
    var wind = bed('bandpass', 520, 0.6, 0.05), wind2 = bed('lowpass', 240, 0.7, 0.03);   // 風：ヒューという帯と、低いゴーッ
    var fire = bed('lowpass', 170, 0.8, 0.05);                                             // たき火の低いゴーッ（炎の息）
    var lava = ambWant === 'volcano' ? bed('lowpass', 90, 0.9, 0.06) : null;              // 火山：溶岩のうなり
    var k = 0;
    var timer = setInterval(function () {
      if (!ready()) return;
      var t = ac.currentTime + 0.05; k++;
      if (k % 10 === 0) {   // 0.5秒ごとに、風の強さと高さをゆっくり変える（強く吹いたり、やんだり）
        wind.g.gain.setTargetAtTime(0.015 + Math.random() * 0.06, t, 0.8); wind.f.frequency.setTargetAtTime(350 + Math.random() * 450, t, 1.0);
        wind2.g.gain.setTargetAtTime(0.015 + Math.random() * 0.03, t, 1.0);
      }
      fire.g.gain.setTargetAtTime(0.03 + Math.random() * 0.04, t, 0.08);   // 炎のゆらぎ
      if (Math.random() < 0.28) noise(t, { dur: 0.006 + Math.random() * 0.016, vol: 0.04 + Math.random() * 0.14, f: 1500 + Math.random() * 3000, hp: true, bus: out });   // パチッ
      if (Math.random() < 0.025) { tone(t, { f: 95, f2: 50, dur: 0.05, type: 'sine', vol: 0.07, bus: out }); noise(t, { dur: 0.05, vol: 0.08, f: 900, bp: true, bus: out }); }   // パンッ（まきがはじける）
      if (lava && Math.random() < 0.12) {   // グツグツ：低い音が「ぽこっ」と上がる泡
        var f0 = 80 + Math.random() * 90;
        tone(t, { f: f0, f2: f0 * 1.8, dur: 0.07 + Math.random() * 0.05, type: 'sine', vol: 0.05 + Math.random() * 0.04, bus: out });
        if (Math.random() < 0.4) tone(t + 0.09, { f: f0 * 1.2, f2: f0 * 2.1, dur: 0.06, type: 'sine', vol: 0.04, bus: out });
      }
    }, 50);
    amb = { kind: ambWant, ac: ac, out: out, srcs: srcs, timer: timer };
  }

  function set(kind, v) {
    cfg[kind] = v; saveCfg();
    applyGain(kind);
  }
  function applyGain(kind) {
    if (ac) { (kind === 'se' ? sfxBus : bgmBus).gain.value = kind === 'se' ? seGain() : bgmGain(); }
    if (kind === 'bgm' && bossOut) bossOut.gain.value = bossGain();
  }
  function setVol(kind, v) { cfg[kind + 'Vol'] = clampVol(v); saveCfg(); applyGain(kind); }
  // 音の状態（メニューの「音のテスト」で表示）
 function state() { return (ac ? '［' + ac.state + '・作り直し' + rebuilds + '回］' : '') + (!ac ? 'まだ準備していない（画面をタップすると準備）' : ac.state === 'running' ? '鳴らせる状態' : '止まっている（' + ac.state + '）') + (bossErr ? '・ボス曲のエラー：' + bossErr : '') + '・ボス曲' + (G.makeBossTheme ? 'あり' : 'なし'); }
  function test() { unlock(); var was = cfg.se; cfg.se = true; play('upgrade'); cfg.se = was; }
  // 曲を流したいのに音がまだ出せない時は、画面の下に「タップすると音が出ます」を出す
  setInterval(function () {
    if (ambWant) ambSync();   // 音の準備ができた・作り直した時に、たき火の音を始める
    var el = document.getElementById('tap-sound'); if (!el) return;
    el.hidden = !(G.started && (cfg.bgm || cfg.se) && (wantTrack || bossOn || ambWant) && (!ready() || needFresh));
  }, 500);
  G.Sound = { play: play, music: music, hold: hold, ambient: ambient, ambientNow: function () { return amb ? amb.kind : null; }, wanted: function () { return wantTrack; }, set: set, setVol: setVol, getVol: function (k) { return cfg[k + 'Vol']; }, bossTheme: bossTheme, track: function () { return playing; }, bossPlaying: function () { return bossOn && !!boss && boss.playing; }, get: function (k) { return cfg[k]; }, state: state, test: test };
})();

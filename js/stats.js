// 統計：ランが終わったら、その記録をサーバー（Cloudflare の /api/run）へ送る（2026-10-22）
// - プレイヤーはランダムな番号（この端末で1回だけ作る）で区別する。名前などは送らない
// - 送れなかった記録（電波がない時など）は、この端末に取っておき、次に開いた時に送り直す（最大30件）
// - 旧URL（GitHub Pages）と、ファイルを直接開いた時は送らない
(function () {
  'use strict';
  var G = window.G = window.G || {};
  var PID_KEY = 'towerRogue.pid', BOX_KEY = 'towerRogue.outbox', BOX_MAX = 30, URL = 'api/run';

  function enabled() {
    var h = location.hostname || '';
    if (location.protocol === 'file:') return false;
    if (/github\.io$/.test(h)) return false;
    return true;
  }
  // プレイヤーの番号：英数字16けた。この端末（ブラウザ）で1回だけ作る
  function pid() {
    var id = null;
    try { id = localStorage.getItem(PID_KEY); } catch (e) {}
    if (!id) {
      var abc = 'abcdefghijklmnopqrstuvwxyz0123456789', b = new Uint8Array(16);
      try { crypto.getRandomValues(b); } catch (e) { for (var i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256); }
      id = ''; for (var j = 0; j < 16; j++) id += abc[b[j] % abc.length];
      try { localStorage.setItem(PID_KEY, id); } catch (e) {}
    }
    return id;
  }
  // タイトル右下の「版 10/22 17:09」から版を取る（調整の前と後を分けるため）
  function ver() { var v = document.getElementById('ver'); return v ? v.textContent.replace(/^版\s*/, '').trim() : ''; }

  function loadBox() { try { return JSON.parse(localStorage.getItem(BOX_KEY) || '[]') || []; } catch (e) { return []; } }
  function saveBox(b) { try { localStorage.setItem(BOX_KEY, JSON.stringify(b.slice(-BOX_MAX))); } catch (e) {} }

  function post(rec) {
    return fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec), keepalive: true })
      .then(function (r) { if (!r.ok && r.status >= 500) throw new Error('server ' + r.status); return true; });
  }
  // 送れなかった記録を順番に送り直す
  var flushing = false;
  function flush() {
    if (!enabled() || flushing || typeof fetch !== 'function') return;
    var box = loadBox(); if (!box.length) return;
    flushing = true;
    var rec = box[0];
    post(rec).then(function () {
      var b = loadBox(); if (b.length && b[0].uid === rec.uid) b.shift(); saveBox(b);
      flushing = false; flush();
    }, function () { flushing = false; });
  }
  function send(rep) {
    if (!enabled()) return;
    var rec = Object.assign({}, rep, { pid: pid(), ver: ver(), uid: pid() + '-' + Date.now().toString(36), sentAt: Date.now() });
    var box = loadBox(); box.push(rec); saveBox(box);   // 先に取っておき、送れたら消す
    flush();
  }

  G.Stats = { send: send, flush: flush, pid: pid };
  if (typeof window.addEventListener === 'function') window.addEventListener('load', function () { setTimeout(flush, 3000); });
})();

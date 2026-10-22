// 自動対戦の統計（node tools/sim.js を STATS_OUT=ファイル名 で動かした物）を、統計のサーバーへ送る
// 使い方：node tools/sendstats.js ファイル名 [送り先。省略すると https://syoppaiya-td.pages.dev]
'use strict';
var fs = require('fs');
var file = process.argv[2], base = (process.argv[3] || 'https://syoppaiya-td.pages.dev').replace(/\/$/, '');
if (!file) { console.log('使い方：node tools/sendstats.js ファイル名 [送り先]'); process.exit(1); }
var lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
(async function () {
  var ok = 0, ng = 0;
  for (var i = 0; i < lines.length; i++) {
    var r = await fetch(base + '/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: lines[i] });
    if (r.ok) ok++; else { ng++; console.log((i + 1) + '行目：' + r.status + ' ' + (await r.text())); }
  }
  console.log('送った ' + ok + '件・失敗 ' + ng + '件');
})();

// 戦闘画面の撮影（確認用）。使い方: NODE_PATH=$(npm root -g) node tools/shot.js 出力フォルダ マップ:テーマ ...   例: node tools/shot.js out field:grass snowpass:snow lavaflow:volcano
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const dir = process.argv[2]; fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(String(e.message))); p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.goto('http://localhost:8123/index.html?nocache=' + Date.now(), { waitUntil: 'load' });
  await p.waitForTimeout(500);
  await p.evaluate(() => { document.getElementById('start').hidden = true; });
  for (const a of process.argv.slice(3)) {
    const [map, theme] = a.split(':');
    await p.evaluate(([map, theme]) => {
      G.BattleUI.start({ map: map, theme: theme, seed: 7 }, function () {}, { label: 'test', title: 'test' });
      var s = G.debug.state; s.energy = 99;
      var types = ['archer', 'fire', 'thunder', 'frost'], placed = [];
      types.forEach(function (ty) {
        var cid = Object.keys(G.CARDS).filter(function (k) { return G.CARDS[k].kind === 'tower' && G.CARDS[k].tower === ty; })[0];
        if (!cid) return;
        for (var y = 2; y < s.map.rowsN - 3; y++) for (var x = 0; x < s.map.cols; x++) {
          if (placed.length >= 4 || placed.some(function (q) { return q.ty === ty; })) continue;
          if (placed.some(function (q) { return Math.abs(q.x - x) + Math.abs(q.y - y) < 4; })) continue;
          if (!G.Battle.canPlaceAt(s, x, y, ty)) continue;
          s.hand.push({ uid: 900 + placed.length, id: cid });
          if (!G.Battle.playCard(s, s.hand.length - 1, { tx: x, ty: y })) placed.push({ x: x, y: y, ty: ty });
        }
      });
      G.Battle.startAttack(s);
      for (var i = 0; i < 90; i++) G.Battle.update(s, 0.05);
      G.debug.ui.time += 1;
    }, [map, theme]);
    await p.waitForTimeout(300);
    const el = await p.$('#map');
    await el.screenshot({ path: `${dir}/${map}_${theme}.png` });
    const box = await el.boundingBox();
    console.log(a, '→ 画面上の大きさ', Math.round(box.width) + '×' + Math.round(box.height));
  }
  console.log('エラー:', errs.length ? errs.join(' | ') : 'なし');
  await b.close();
})();

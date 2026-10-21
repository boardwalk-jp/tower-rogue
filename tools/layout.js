// 手札の枚数でマップの位置・大きさが変わらないかを3つの画面サイズで確かめる。使い方: NODE_PATH=$(npm root -g) node tools/layout.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const vp of [{ width: 393, height: 852 }, { width: 375, height: 667 }, { width: 430, height: 932 }]) {
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2 });
    await p.goto('http://localhost:8123/index.html?n=' + Date.now(), { waitUntil: 'load' });
    await p.waitForTimeout(400);
    await p.evaluate(() => { document.getElementById('start').hidden = true; G.BattleUI.start({ map: 'field', theme: 'grass', seed: 7 }, function () {}, { label: 't', title: 't' }); });
    const out = [];
    for (const n of [0, 4, 5, 8]) {
      await p.evaluate((n) => { var s = G.debug.state; var ids = Object.keys(G.CARDS); s.hand = []; for (var i = 0; i < n; i++) s.hand.push({ uid: 700 + i, id: ids[i % ids.length] }); G.debug.renderHand(); window.dispatchEvent(new Event('resize')); }, n);
      await p.waitForTimeout(100);
      const r = await p.evaluate(() => { var r = document.getElementById('map').getBoundingClientRect(), h = document.getElementById('hand').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height), Math.round(h.top)]; });
      out.push(n + '枚: map(left,top,w,h)+手札top=' + r.join(','));
    }
    console.log(vp.width + 'x' + vp.height + '\n  ' + out.join('\n  '));
    await p.close();
  }
  await b.close();
})();

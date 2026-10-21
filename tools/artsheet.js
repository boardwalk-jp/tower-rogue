// 絵の一覧画像を作る（確認用）。草原・雪山・火山の地面の上に、タワー（3段階×ふだん/攻撃中）や敵（2コマ×左右）を並べて1枚のPNGにする
// 使い方（リポジトリのフォルダで python3 -m http.server 8123 を動かしてから）：
//   NODE_PATH=$(npm root -g) node tools/artsheet.js 出力.png towers archer,cannon,frost
//   NODE_PATH=$(npm root -g) node tools/artsheet.js 出力.png enemies slime,goblin,orc
//   種類を省くと全部。倍率は3倍（画面の見え方に近い大きさ）
const { chromium } = require('playwright');
(async () => {
  const [out, kind = 'towers', list = ''] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 800, height: 600 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e.message)));
  await p.goto('http://localhost:8123/index.html?n=' + Date.now(), { waitUntil: 'load' });
  await p.waitForTimeout(400);
  const png = await p.evaluate(([kind, list]) => {
    var S = G.SPR, names = list ? list.split(',') : (kind === 'towers' ? Object.keys(G.TOWERS) : Object.keys(G.ENEMIES)).filter(function (k) { return S[k]; });
    var grounds = ['#4f8a3e', '#e6eef6', '#2e2527'], cellW = 44, cellH = 80, cols = kind === 'towers' ? 6 : 4;
    var cv = document.createElement('canvas'); cv.width = 70 + cols * cellW; cv.height = names.length * cellH * 3 / 3 * 1 + 4; cv.height = names.length * cellH; 
    var c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    names.forEach(function (k, i) {
      var y0 = i * cellH;
      c.fillStyle = grounds[i % 3]; c.fillRect(0, y0, cv.width, cellH);
      c.fillStyle = i % 3 === 1 ? '#222' : '#fff'; c.font = '10px sans-serif'; c.fillText(k, 2, y0 + 12);
      var imgs = [];
      if (kind === 'towers') { for (var lv = 0; lv < 3; lv++) for (var f = 0; f < 2; f++) { var sp = S[k][lv][f]; imgs.push(sp.r ? (f ? sp.l : sp.r) : sp); } }
      else { for (var fr = 0; fr < 2; fr++) { imgs.push(S[k][fr].r); imgs.push(S[k][fr].l); } }
      imgs.forEach(function (im, j) {
        var cx = 70 + j * cellW + cellW / 2, by = y0 + cellH - 8;
        c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(cx - 8, by - 1, 16, 2);
        c.drawImage(im, Math.round(cx - im.width / 2), Math.round(by - im.height));
      });
    });
    var big = document.createElement('canvas'); big.width = cv.width * 3; big.height = cv.height * 3;
    var bc = big.getContext('2d'); bc.imageSmoothingEnabled = false; bc.drawImage(cv, 0, 0, big.width, big.height);
    return big.toDataURL('image/png');
  }, [kind, list]);
  require('fs').writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
  console.log('保存:', out, ' エラー:', errs.length ? errs.join(' | ') : 'なし');
  await b.close();
})();

// レリックの絵の一覧画像を作る（確認用）
// 1行に1つ：名前・実際の大きさに近い見え方（3倍＝iPhoneの画面の点の細かさ）・大きく（6倍）・古い絵（比べる用）
// 背景はゲームの枠と同じ暗い色、枠の色はレア度
// 使い方（リポジトリのフォルダで python3 -m http.server 8123 を動かしてから）：
//   NODE_PATH=$(npm root -g) node tools/relicsheet.js 出力.png            … 全部
//   NODE_PATH=$(npm root -g) node tools/relicsheet.js 出力.png sharp,oil  … 指定した物だけ
const { chromium } = require('playwright');
(async () => {
  const [out, list = ''] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 800, height: 600 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e.message)));
  await p.goto('http://localhost:8123/index.html?n=' + Date.now(), { waitUntil: 'load' });
  await p.waitForTimeout(400);
  const png = await p.evaluate((list) => {
    var ids = list ? list.split(',') : Object.keys(G.RELICS);
    var FR = { starter: '#9a9a9a', common: '#9a9a9a', uncommon: '#6f8fd0', rare: '#ffd84a' };
    try { var css = getComputedStyle(document.documentElement); FR.common = css.getPropertyValue('--r-common').trim() || FR.common; FR.starter = FR.common; FR.uncommon = css.getPropertyValue('--r-uncommon').trim() || FR.uncommon; FR.rare = css.getPropertyValue('--r-rare').trim() || FR.rare; } catch (e) {}
    var rowH = 140, W = 640, cv = document.createElement('canvas'); cv.width = W; cv.height = ids.length * rowH;
    var c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    // 古い絵を作るため、新しい絵を一時的に止める
    var keep = G.RelicArt; G.RelicArt = null; var old = {}; ids.forEach(function (id) { delete G.SPR.relic[id]; old[id] = G.relicIcon(id); delete G.SPR.relic[id]; }); G.RelicArt = keep;
    function frame(x, y, s, col, im, k) {   // ゲームの枠（30×30、角丸8、ふち2）を s 倍で。中に絵を k 倍で
      c.fillStyle = col; c.fillRect(x, y, 30 * s, 30 * s);
      c.fillStyle = '#1a1f1b'; c.fillRect(x + 2 * s, y + 2 * s, 26 * s, 26 * s);
      var w = im.width * k, h = im.height * k; c.drawImage(im, x + (30 * s - w) / 2, y + (30 * s - h) / 2, w, h);
    }
    ids.forEach(function (id, i) {
      var y = i * rowH, RR = G.RELICS[id], im = G.relicIcon(id);
      c.fillStyle = i % 2 ? '#2a2f2b' : '#232824'; c.fillRect(0, y, W, rowH);
      c.fillStyle = '#fff'; c.font = '14px sans-serif'; c.fillText(id + '  ' + RR.name, 6, y + 18);
      c.fillStyle = im.nu ? '#8f8' : '#f88'; c.fillText(im.nu ? '新' : '旧のまま', 6, y + 36);
      frame(10, y + 45, 3, FR[RR.rarity], im, 3);           // iPhone での見え方（20px × 3）
      frame(120, y + 8, 4.2, FR[RR.rarity], im, 6);         // 大きく
      c.fillStyle = '#1a1f1b'; c.fillRect(270, y + 8, 126, 126);
      c.drawImage(im, 273, y + 11, 120, 120);               // 大きい表示（タップした時）と同じ 4倍＝80px を、さらに1.5倍
      c.fillStyle = '#888'; c.font = '11px sans-serif'; c.fillText('旧', 420, y + 20);
      frame(420, y + 25, 3, FR[RR.rarity], old[id], 3 * 20 / 14);
    });
    return cv.toDataURL('image/png');
  }, list);
  require('fs').writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
  console.log('保存:', out, ' エラー:', errs.length ? errs.join(' | ') : 'なし');
  await b.close();
})();

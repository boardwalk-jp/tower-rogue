// マップの点検：ちがう道（または同じ道の離れた部分）のマスがとなり合って、くっついて見える所を探す
// 使い方：node tools/mapcheck.js   （問題がなければ「くっついて見える所はありません」）
global.window = global; global.document = {}; require(process.cwd() + '/js/data.js');
let found = 0;
for (const k in G.MAPS) {
  const m = G.MAPS[k], conn = new Set(), road = new Set();
  for (const g in m.paths) {
    const P = m.paths[g];
    for (let i = 0; i < P.length - 1; i++) {
      const x0 = Math.floor(P[i][0]), y0 = Math.floor(Math.min(14, P[i][1])), x1 = Math.floor(P[i + 1][0]), y1 = Math.floor(Math.min(14, P[i + 1][1]));
      const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0); let x = x0, y = y0; road.add(x + ',' + y);
      while (x !== x1 || y !== y1) { const nx = x + dx, ny = y + dy; conn.add([x, y, nx, ny].join()); conn.add([nx, ny, x, y].join()); x = nx; y = ny; road.add(x + ',' + y); }
    }
  }
  const bad = [];
  road.forEach(t => { const [x, y] = t.split(',').map(Number); [[1, 0], [0, 1]].forEach(([a, b]) => { if (road.has((x + a) + ',' + (y + b)) && !conn.has([x, y, x + a, y + b].join())) bad.push(`(${x},${y})-(${x + a},${y + b})`); }); });
  if (bad.length) { found++; console.log(m.name + '（' + k + '）：' + bad.length + 'か所 ' + bad.join(' ')); }
}
if (!found) console.log('くっついて見える所はありません');

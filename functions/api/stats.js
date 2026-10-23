// 統計：集計した表を返す（2026-10-22）。集計ページ stats.html が読む
// しぼりこみ：?cmd=captain&asc=3&ver=10/22 17:09&partial=0&days=7
// 外すプレイヤー：&ex=番号,番号,…（プレイヤーの番号。全部で90人まで。2026-10-23）。外した人の記録は、どの表にも入らない（プレイヤーごとの表だけは全員を出す）
// 自動対戦の記録は入れない（受け取りもしない。念のため bot=1 の行も数えない）
// 合言葉：Cloudflare の環境変数 STATS_KEY を決めた時だけ、?k=合言葉 が必要になる（決めていなければ、だれでも見られる）

import { ensureSchema } from '../../db/schema.js';

const EX_MAX = 90;   // D1 は1つの問い合わせに付けられる値が100個まで。しぼりこみの分をのこして90人まで

// withEx：外すプレイヤーを除くか（プレイヤーごとの表だけ false）
function where(u, withEx) {
  const w = [], b = [];
  const cmd = u.searchParams.get('cmd'), asc = u.searchParams.get('asc'), ver = u.searchParams.get('ver');
  const partial = u.searchParams.get('partial'), days = Number(u.searchParams.get('days'));
  if (cmd) { w.push('r.cmd = ?'); b.push(cmd); }
  if (asc !== null && asc !== '') { w.push('r.asc = ?'); b.push(Number(asc)); }
  if (ver) { w.push('r.ver = ?'); b.push(ver); }
  w.push('r.bot = 0');
  if (partial === '0') w.push('r.partial = 0');
  if (days > 0) { w.push('r.ts >= ?'); b.push(Date.now() - days * 86400000); }
  if (withEx) {
    const ex = excluded(u);
    if (ex.length) { w.push('r.pid NOT IN (' + ex.map(() => '?').join(',') + ')'); b.push(...ex); }
  }
  return { sql: w.join(' AND '), bind: b };
}
function excluded(u) {
  return (u.searchParams.get('ex') || '').split(',').filter(x => /^[a-z0-9]{4,32}$/.test(x)).slice(0, EX_MAX);
}

// 中央値：SQLite には中央値の関数がないので、小さい順に並べた順番（ROW_NUMBER）で、真ん中の1つ（個数が奇数）か2つ（偶数）を平均する
// groups：まとめる列、vals：中央値を出したい列（どちらも SQL の式の配列）。値が空（NULL）の行は数えない
function medianSql(from, where, groups, vals) {
  const part = groups.join(', ');
  const inner = [
    ...groups.map((g, i) => g + ' g' + i),
    ...vals.map((v, i) => v + ' v' + i),
    ...vals.map((v, i) => `ROW_NUMBER() OVER (PARTITION BY ${part} ORDER BY ${v} IS NULL, ${v}) rn${i}`),
    ...vals.map((v, i) => `COUNT(${v}) OVER (PARTITION BY ${part}) c${i}`)
  ].join(', ');
  const outer = [
    ...groups.map((g, i) => 'g' + i),
    ...vals.map((v, i) => `AVG(CASE WHEN rn${i} IN ((c${i}+1)/2, (c${i}+2)/2) THEN v${i} END) m${i}`)
  ].join(', ');
  return `SELECT ${outer} FROM (SELECT ${inner} FROM ${from}${where ? ' WHERE ' + where : ''}) GROUP BY ${groups.map((g, i) => 'g' + i).join(', ')}`;
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return new Response('no database', { status: 503 });
  await ensureSchema(env.DB);   // 表がなければ作る
  const u = new URL(request.url);
  if (env.STATS_KEY && u.searchParams.get('k') !== env.STATS_KEY) return new Response('key', { status: 403 });
  const W = where(u, true), WP = where(u, false), DB = env.DB;
  const J = 'JOIN runs r ON r.id = x.run_id';
  const WL = W.sql + " AND r.result IN ('win','lose')";   // 勝ち負けの決まったランだけ
  const Q = {
    // 指揮官×アセンション：ラン数・勝ち・負け・やめた・平均の時間・ドロー
    overview: `SELECT r.cmd, r.asc, COUNT(*) n, SUM(r.result='win') wins, SUM(r.result='lose') loses, SUM(r.result='abandon') abandons,
               AVG(r.dur) dur, AVG(r.draws) draws, AVG(r.extra_draws) extra_draws, AVG(r.deck_n) deck_n, COUNT(DISTINCT r.pid) players
               FROM runs r WHERE ${W.sql} GROUP BY r.cmd, r.asc`,
    // 負けた場所（層・マスの種類・階）
    deaths: `SELECT r.act, r.at, r.floor, COUNT(*) n FROM runs r WHERE ${W.sql} AND r.result='lose' GROUP BY r.act, r.at, r.floor`,
    // マップごと（戦闘の種類ごと）
    maps: `SELECT x.map, x.kind, x.act, COUNT(*) n, AVG(x.life_lost) life_lost, MAX(x.life_lost) life_max, SUM(x.won=0) lost, AVG(x.leaked) leaked,
           AVG(x.killed) killed, AVG(x.sec) sec, AVG(x.draws) draws FROM fights x ${J} WHERE ${W.sql} GROUP BY x.map, x.kind, x.act`,
    // 敵の種類ごとの減ったライフ
    enemyDmg: `SELECT x.enemy, SUM(x.life) life, SUM(x.fights) fights FROM run_dmg x ${J} WHERE ${W.sql} GROUP BY x.enemy`,
    // 敵の種類ごとの出た戦闘数・出た数
    enemySeen: `SELECT j.key enemy, COUNT(*) fights, SUM(j.value) spawned FROM fights x ${J}, json_each(x.enemies) j WHERE ${W.sql} GROUP BY j.key`,
    // カード：最後のデッキに入っていたランの数と勝ち（＋も同じカードとして数える）
    deckCards: `SELECT base card, COUNT(*) runs, SUM(win) wins, AVG(cnt) copies FROM (SELECT x.run_id, x.base, SUM(x.n) cnt, MAX(r.result='win') win FROM run_cards x ${J} WHERE ${WL} GROUP BY x.run_id, x.base) GROUP BY base`,
    // カード：出た回数と取られた回数（報酬・イベント・商人）
    picks: `SELECT x.card, x.src, COUNT(*) offered, SUM(x.taken) taken FROM picks x ${J} WHERE ${W.sql} GROUP BY x.card, x.src`,
    // カード：戦闘で使った回数
    played: `SELECT x.card, SUM(x.n) n, SUM(x.fights) fights FROM run_played x ${J} WHERE ${W.sql} GROUP BY x.card`,
    // レリック：持っていたランの数と勝ち
    relics: `SELECT x.relic, COUNT(*) runs, SUM(r.result='win') wins FROM run_relics x ${J} WHERE ${WL} GROUP BY x.relic`,
    // ダメージの出どころ（タワーの種類など）
    towers: `SELECT x.src, SUM(x.fights) fights, SUM(x.dmg) dmg, SUM(x.kills) kills FROM run_src x ${J} WHERE ${W.sql} GROUP BY x.src`,
    // お金：クリアした時の所持金
    goldEnd: `SELECT r.cmd, r.asc, COUNT(*) n, AVG(r.gold) avg, MIN(r.gold) min, MAX(r.gold) max FROM runs r WHERE ${W.sql} AND r.result='win' GROUP BY r.cmd, r.asc`,
    // お金：最終ボス（3層ボス）に入る前の所持金
    goldBoss: `SELECT r.cmd, r.asc, COUNT(*) n, AVG(x.gold_before) avg, MIN(x.gold_before) min, MAX(x.gold_before) max, AVG(x.life_before) life
               FROM fights x ${J} WHERE ${W.sql} AND x.act=3 AND x.kind='boss' GROUP BY r.cmd, r.asc`,
    // アセンションの到達（プレイヤーごとの、いちばん上の解放ずみ）
    ascDist: `SELECT asc_max, COUNT(*) players FROM (SELECT r.pid, MAX(COALESCE(r.asc_max,0)) asc_max FROM runs r WHERE ${W.sql} GROUP BY r.pid) GROUP BY asc_max`,
    // プレイヤーごと：外したプレイヤーも出す（外すか戻すかを選べるように）。n・勝ち・負け・やめた は、しぼりこみの中の数
    players: `SELECT r.pid pid, COUNT(*) n, SUM(r.result='win') wins, SUM(r.result='lose') loses, SUM(r.result='abandon') abandons,
              MAX(COALESCE(r.asc_max,0)) asc_max, MIN(r.ts) first, MAX(r.ts) last FROM runs r WHERE ${WP.sql} GROUP BY r.pid`,
    // プレイヤーごとの総ラン数（しぼりこみも外す設定も関係なく、そのプレイヤーの全部）
    totals: `SELECT r.pid pid, COUNT(*) total, SUM(r.result='win') total_wins FROM runs r WHERE r.bot = 0 GROUP BY r.pid`,
    // 戦闘画面の見た目（2026-10-23）：プレイヤーごと。しぼりこみ・外す設定に関係なく、そのプレイヤーの全部のランから出す
    // data（送られてきた記録そのまま）の skin＝終わった時の設定、skinSec.f／.c＝戦闘画面を見ていた秒数（砦／黒）、skinSw＝その端末で切り替えた回数
    // last_skin：見た目の記録があるランのうち、いちばん新しいランの設定（古い版のランには記録がないので飛ばす）
    skins: `SELECT r.pid pid, COUNT(*) total, SUM(COALESCE(r.dur,0)) dur,
              SUM(COALESCE(json_extract(r.data,'$.skinSec.f'),0)) sec_f, SUM(COALESCE(json_extract(r.data,'$.skinSec.c'),0)) sec_c,
              MAX(COALESCE(json_extract(r.data,'$.skinSw'),0)) sw, SUM(json_extract(r.data,'$.skin') IS NOT NULL) known,
              (SELECT json_extract(r2.data,'$.skin') FROM runs r2 WHERE r2.pid = r.pid AND r2.bot = 0 AND json_extract(r2.data,'$.skin') IS NOT NULL ORDER BY r2.ts DESC LIMIT 1) last_skin,
              MAX(r.ts) last FROM runs r WHERE r.bot = 0 GROUP BY r.pid`,
    // 戦闘以外の選択
    choices: `SELECT x.kind, x.item, x.detail, COUNT(*) n FROM choices x ${J} WHERE ${W.sql} GROUP BY x.kind, x.item, x.detail`,
    // 版の一覧（しぼりこみ用）
    vers: `SELECT r.ver, COUNT(*) n, MIN(r.ts) first FROM runs r WHERE r.bot = 0 GROUP BY r.ver ORDER BY first DESC`,
    // 最近のラン
    recent: `SELECT r.id, r.ts, r.pid pid, r.ver, r.cmd, r.asc, r.result, r.act, r.at, r.floor, r.life, r.gold, r.deck_n, r.dur FROM runs r WHERE ${W.sql} ORDER BY r.id DESC LIMIT 50`
  };
  const noBind = { vers: 1, totals: 1, skins: 1 };
  const keys = Object.keys(Q);
  const stmts = keys.map(k => DB.prepare(Q[k]).bind(...(noBind[k] ? [] : k === 'players' ? WP.bind : W.bind)));

  // 中央値（平均がある表に足す）。key＝表の行とつなぐ印、props＝足す名前（vals と同じ順）
  const MED = [
    { to: 'overview', from: 'runs r', where: W.sql, groups: ['r.cmd', 'r.asc'], vals: ['r.dur', 'r.draws', 'r.extra_draws', 'r.deck_n'], props: ['med_dur', 'med_draws', 'med_extra_draws', 'med_deck_n'], key: r => r.cmd + '|' + r.asc, bind: W.bind },
    { to: 'maps', from: `fights x ${J}`, where: W.sql, groups: ['x.map', 'x.kind', 'x.act'], vals: ['x.life_lost', 'x.leaked', 'x.killed', 'x.sec', 'x.draws'], props: ['med_life_lost', 'med_leaked', 'med_killed', 'med_sec', 'med_draws'], key: r => r.map + '|' + r.kind + '|' + r.act, bind: W.bind },
    { to: 'deckCards', from: `(SELECT x.run_id run_id, x.base card, SUM(x.n) cnt FROM run_cards x ${J} WHERE ${WL} GROUP BY x.run_id, x.base) t`, where: '', groups: ['t.card'], vals: ['t.cnt'], props: ['med_copies'], key: r => r.card, bind: W.bind },
    { to: 'goldEnd', from: 'runs r', where: W.sql + " AND r.result='win'", groups: ['r.cmd', 'r.asc'], vals: ['r.gold'], props: ['med'], key: r => r.cmd + '|' + r.asc, bind: W.bind },
    { to: 'goldBoss', from: `fights x ${J}`, where: W.sql + " AND x.act=3 AND x.kind='boss'", groups: ['r.cmd', 'r.asc'], vals: ['x.gold_before', 'x.life_before'], props: ['med', 'med_life'], key: r => r.cmd + '|' + r.asc, bind: W.bind }
  ];
  MED.forEach(m => stmts.push(DB.prepare(medianSql(m.from, m.where, m.groups, m.vals)).bind(...m.bind)));

  const res = await DB.batch(stmts);
  const out = { at: Date.now(), excluded: excluded(u).length };
  keys.forEach((k, i) => { out[k] = res[i].results; });
  // 中央値を、それぞれの表の行にくっつける（まとめる列の値が同じ行どうし）
  MED.forEach((m, mi) => {
    const rows = res[keys.length + mi].results, map = {};
    rows.forEach(r => { map[m.groups.map((g, i) => r['g' + i]).join('|')] = r; });
    out[m.to].forEach(row => {
      const r = map[m.key(row)];
      m.props.forEach((p, i) => { row[p] = r ? r['m' + i] : null; });
    });
  });
  // 総ラン数をプレイヤーの行にくっつける
  const tot = {}; out.totals.forEach(t => { tot[t.pid] = t; });
  out.players.forEach(p => { const t = tot[p.pid] || {}; p.total = t.total || p.n; p.total_wins = t.total_wins || 0; });
  delete out.totals;
  return Response.json(out, { headers: { 'Cache-Control': 'no-store' } });
}

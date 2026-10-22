// 統計：集計した表を返す（2026-10-22）。集計ページ stats.html が読む
// しぼりこみ：?cmd=captain&asc=3&ver=10/22 17:09&partial=0&days=7
// 自動対戦の記録は入れない（受け取りもしない。念のため bot=1 の行も数えない）
// 合言葉：Cloudflare の環境変数 STATS_KEY を決めた時だけ、?k=合言葉 が必要になる（決めていなければ、だれでも見られる）

import { ensureSchema } from '../../db/schema.js';

function where(u) {
  const w = [], b = [];
  const cmd = u.searchParams.get('cmd'), asc = u.searchParams.get('asc'), ver = u.searchParams.get('ver');
  const partial = u.searchParams.get('partial'), days = Number(u.searchParams.get('days'));
  if (cmd) { w.push('r.cmd = ?'); b.push(cmd); }
  if (asc !== null && asc !== '') { w.push('r.asc = ?'); b.push(Number(asc)); }
  if (ver) { w.push('r.ver = ?'); b.push(ver); }
  w.push('r.bot = 0');
  if (partial === '0') w.push('r.partial = 0');
  if (days > 0) { w.push('r.ts >= ?'); b.push(Date.now() - days * 86400000); }
  return { sql: w.length ? w.join(' AND ') : '1=1', bind: b };
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return new Response('no database', { status: 503 });
  await ensureSchema(env.DB);   // 表がなければ作る
  const u = new URL(request.url);
  if (env.STATS_KEY && u.searchParams.get('k') !== env.STATS_KEY) return new Response('key', { status: 403 });
  const W = where(u), DB = env.DB;
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
    // プレイヤーごと（1人のデータにかたよっていないか見る）
    players: `SELECT substr(r.pid,1,6) pid, COUNT(*) n, SUM(r.result='win') wins, MAX(COALESCE(r.asc_max,0)) asc_max, MAX(r.ts) last FROM runs r WHERE ${W.sql} GROUP BY r.pid`,
    // 戦闘以外の選択
    choices: `SELECT x.kind, x.item, x.detail, COUNT(*) n FROM choices x ${J} WHERE ${W.sql} GROUP BY x.kind, x.item, x.detail`,
    // 版の一覧（しぼりこみ用）
    vers: `SELECT r.ver, COUNT(*) n, MIN(r.ts) first FROM runs r WHERE r.bot = 0 GROUP BY r.ver ORDER BY first DESC`,
    // 最近のラン
    recent: `SELECT r.id, r.ts, substr(r.pid,1,6) pid, r.ver, r.cmd, r.asc, r.result, r.act, r.at, r.floor, r.life, r.gold, r.deck_n, r.dur FROM runs r WHERE ${W.sql} ORDER BY r.id DESC LIMIT 50`
  };
  const keys = Object.keys(Q);
  const res = await DB.batch(keys.map(k => DB.prepare(Q[k]).bind(...(k === 'vers' ? [] : W.bind))));
  const out = { at: Date.now() };
  keys.forEach((k, i) => { out[k] = res[i].results; });
  return Response.json(out, { headers: { 'Cache-Control': 'no-store' } });
}

// 統計：ゲームから送られたランの記録を受け取って、データベース（Cloudflare D1、名前 DB）に入れる（2026-10-22）
// ゲーム側は js/stats.js。表の作りは db/schema.js
// Cloudflare Pages の「Functions」として動く（このファイルの場所が、そのまま /api/run というURLになる）

import { ensureSchema } from '../../db/schema.js';

const CMDS = ['captain', 'witch', 'engineer'];
const RESULTS = ['win', 'lose', 'abandon'];
const MAX_BYTES = 200000;

// 数字にする（だめなら null）
function num(v) { const n = Number(v); return Number.isFinite(n) ? Math.round(n) : null; }
// 文字にする（長すぎる物は切る。英数字と記号だけ通す）
function str(v, max) { return typeof v === 'string' ? v.replace(/[^\w+:\-./ ]/g, '').slice(0, max || 40) : null; }
function obj(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
function arr(v) { return Array.isArray(v) ? v : []; }

export async function onRequestPost({ request, env }) {
  if (!env.DB) return new Response('no database', { status: 503 });
  await ensureSchema(env.DB);   // 表がなければ作る
  const text = await request.text();
  if (text.length > MAX_BYTES) return new Response('too large', { status: 413 });
  let d;
  try { d = JSON.parse(text); } catch (e) { return new Response('bad json', { status: 400 }); }
  if (!d || d.v !== 1 || CMDS.indexOf(d.cmd) < 0 || RESULTS.indexOf(d.result) < 0) return new Response('bad data', { status: 400 });
  const uid = str(d.uid, 60), pid = str(d.pid, 32);
  if (!uid || !pid) return new Response('bad id', { status: 400 });
  // 自動対戦の記録は受け取らない（オーナー指定・2026-10-22。自動対戦の結果は手元で tools/sim.js を動かした時だけ見る）
  if (d.bot || /^bot-/.test(pid) || /^sim-/.test(uid)) return new Response('bot data is not accepted', { status: 400 });

  // 同じ記録を2回受け取らない（送り直しの時）
  const dup = await env.DB.prepare('SELECT id FROM runs WHERE uid = ?').bind(uid).first();
  if (dup) return Response.json({ ok: true, dup: true });

  const floors = arr(d.floors).slice(0, 120), stats = obj(d.stats), meta = obj(d.meta);
  let draws = 0, extra = 0;
  floors.forEach(f => { const b = obj(f && f.b); draws += num(b.dr) || 0; extra += num(b.xd) || 0; });
  const deck = arr(d.deck).slice(0, 200).map(c => str(c)).filter(Boolean);
  const relics = arr(d.relics).slice(0, 60).map(c => str(c)).filter(Boolean);

  const DB = env.DB, q = [];
  q.push(DB.prepare(`INSERT INTO runs (uid, ts, pid, ver, bot, cmd, asc, result, act, floor, at, life, max_life, gold, deck_n, relic_n, draws, extra_draws, dur, partial, xp, asc_max, data)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(uid, Date.now(), pid, str(d.ver, 30), 0, d.cmd, num(d.asc) || 0, d.result, num(d.act), num(d.floor), str(d.at, 12),
          num(d.life), num(d.maxLife), num(d.gold), deck.length, relics.length, draws, extra, num(d.dur), d.partial ? 1 : 0,
          num(meta.xp), num(meta.ascMax), text));
  const RID = '(SELECT id FROM runs WHERE uid = ?)';

  // 最後のデッキ（同じカードはまとめる）
  const cnt = {};
  deck.forEach(c => { cnt[c] = (cnt[c] || 0) + 1; });
  Object.keys(cnt).forEach(c => q.push(DB.prepare(`INSERT INTO run_cards (run_id, card, base, n) VALUES (${RID}, ?, ?, ?)`).bind(uid, c, c.replace(/\+$/, ''), cnt[c])));
  relics.forEach(r => q.push(DB.prepare(`INSERT INTO run_relics (run_id, relic) VALUES (${RID}, ?)`).bind(uid, r)));

  const dmgT = {}, srcT = {}, playT = {};
  const add = (t, k) => t[k] || (t[k] = { life: 0, dmg: 0, kills: 0, n: 0, fights: 0 });
  floors.forEach((f0, i) => {
    const f = obj(f0), a = num(f.a), fl = num(f.f);
    // カードを選ぶ場面
    arr(f.pk).forEach(p0 => {
      const p = obj(p0), taken = str(p.t);
      let tookOne = false;
      arr(p.o).slice(0, 6).forEach(c0 => {
        const c = str(c0); if (!c) return;
        const t = !tookOne && c === taken ? 1 : 0; if (t) tookOne = true;
        q.push(DB.prepare(`INSERT INTO picks (run_id, act, src, card, taken) VALUES (${RID}, ?, ?, ?, ?)`).bind(uid, a, str(p.s, 12), c, t));
      });
    });
    // 商人：並んだカードは「出たカード」、買ったカードは「取った」として数える
    if (f.shop) {
      const buys = arr(f.buy).map(x => str(x));
      arr(obj(f.shop).o).slice(0, 6).forEach(c0 => {
        const c = str(c0); if (!c) return;
        q.push(DB.prepare(`INSERT INTO picks (run_id, act, src, card, taken) VALUES (${RID}, ?, 'shop', ?, ?)`).bind(uid, a, c, buys.indexOf(c) >= 0 ? 1 : 0));
      });
    }
    // 戦闘以外の選択
    const ch = (kind, item, detail) => q.push(DB.prepare(`INSERT INTO choices (run_id, act, floor, kind, item, detail) VALUES (${RID}, ?, ?, ?, ?, ?)`).bind(uid, a, fl, kind, item, detail == null ? null : String(detail).slice(0, 20)));
    if (f.ev) { const e = obj(f.ev); ch('event', str(e.id), (num(e.c) != null ? num(e.c) : '') + (e.r ? ':' + str(e.r, 5) : '')); }
    if (f.rest) ch('rest', str(f.rest, 8), null);
    arr(f.buy).forEach(x => ch('buy', str(x), null));
    arr(f.rm).forEach(x => ch('remove', str(x), f.t));
    arr(f.up).forEach(x => ch('upgrade', str(x), f.t));
    // 戦闘
    const b = f.b && obj(f.b);
    if (b) {
      const life = num(f.l), lifeAfter = num(b.life);
      q.push(DB.prepare(`INSERT INTO fights (run_id, seq, act, floor, kind, map, life_before, life_lost, max_life, gold_before, won, turns, killed, leaked, built, gold_earned, draws, extra_draws, sec, enemies)
                         VALUES (${RID},?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(uid, i, a, fl, str(f.t, 12), str(b.map, 30), life, life != null && lifeAfter != null ? Math.max(0, life - lifeAfter) : null, num(f.ml), num(f.g), b.win ? 1 : 0,
              num(b.turns), num(b.kl), num(b.lk), num(b.bt), num(b.ge), num(b.dr), num(b.xd), num(b.sec), JSON.stringify(obj(b.en))));
      // 敵ごとのダメージ・出どころごとのダメージ・使ったカードは、ラン全体で足し合わせてから入れる（行の数を減らすため）
      Object.keys(obj(b.dmg)).slice(0, 40).forEach(k => { const o = add(dmgT, str(k)); o.life += num(b.dmg[k]) || 0; o.fights++; });
      Object.keys(obj(b.tw)).slice(0, 40).forEach(k => { const v = arr(b.tw[k]), o = add(srcT, str(k)); o.dmg += num(v[0]) || 0; o.kills += num(v[1]) || 0; o.fights++; });
      Object.keys(obj(b.pl)).slice(0, 60).forEach(k => { const o = add(playT, str(k)); o.n += num(b.pl[k]) || 0; o.fights++; });
    }
  });

  Object.keys(dmgT).forEach(k => q.push(DB.prepare(`INSERT INTO run_dmg (run_id, enemy, life, fights) VALUES (${RID}, ?, ?, ?)`).bind(uid, k, dmgT[k].life, dmgT[k].fights)));
  Object.keys(srcT).forEach(k => q.push(DB.prepare(`INSERT INTO run_src (run_id, src, dmg, kills, fights) VALUES (${RID}, ?, ?, ?, ?)`).bind(uid, k, srcT[k].dmg, srcT[k].kills, srcT[k].fights)));
  Object.keys(playT).forEach(k => q.push(DB.prepare(`INSERT INTO run_played (run_id, card, n, fights) VALUES (${RID}, ?, ?, ?)`).bind(uid, k, playT[k].n, playT[k].fights)));

  await DB.batch(q);   // まとめて1回で入れる（途中で失敗したら全部入らない）
  return Response.json({ ok: true, rows: q.length });
}

export function onRequestGet() { return new Response('POST only', { status: 405 }); }

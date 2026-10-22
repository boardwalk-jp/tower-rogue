// 統計のデータベース（Cloudflare D1）の表の作り（2026-10-22）
// functions/api/run.js と stats.js が、最初に1回 実行する（表がなければ作る。あれば何もしない）。なので管理画面で表を作る作業はいらない
// 無料の範囲（1日の書き込み10万行・読み込み500万行）に収まるように、行の数を少なくしている。索引（INDEX）も、書き込みが2倍になるので付けていない
// runs：1ラン＝1行。data に送られてきた記録をそのまま全部入れておく（あとで別の集計が必要になった時に作り直せるように）
export const SCHEMA = [
  // runs の列：uid＝同じ記録を2回受け取らないための番号、ts＝受け取った時刻（ミリ秒）、pid＝プレイヤーのランダム番号、ver＝ゲームの版（タイトル右下）、
  // bot＝1なら自動対戦、result＝win / lose / abandon（途中でやめた）、act・floor・at＝終わった場所（層・階・マスの種類）、dur＝ランの時間（秒）、
  // partial＝1なら統計を入れる前から続いていたラン（記録が途中から）、xp・asc_max＝その時点の経験値・解放したアセンション
  `CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT UNIQUE,
  ts INTEGER,
  pid TEXT,
  ver TEXT,
  bot INTEGER DEFAULT 0,
  cmd TEXT, asc INTEGER,
  result TEXT,
  act INTEGER, floor INTEGER, at TEXT,
  life INTEGER, max_life INTEGER, gold INTEGER,
  deck_n INTEGER, relic_n INTEGER,
  draws INTEGER, extra_draws INTEGER,
  dur INTEGER,
  partial INTEGER,
  xp INTEGER, asc_max INTEGER,
  data TEXT
);`,
  // 最後のデッキ（カード1種類＝1行。＋は base に＋なしの名前）
  `CREATE TABLE IF NOT EXISTS run_cards (run_id INTEGER, card TEXT, base TEXT, n INTEGER);`,
  // 最後のレリック
  `CREATE TABLE IF NOT EXISTS run_relics (run_id INTEGER, relic TEXT);`,
  // カードを選ぶ場面で出たカード（1枚＝1行。taken＝取ったら1）。src＝battle / elite / boss / event / shop
  `CREATE TABLE IF NOT EXISTS picks (run_id INTEGER, act INTEGER, src TEXT, card TEXT, taken INTEGER);`,
  // 戦闘（1戦＝1行）
  `CREATE TABLE IF NOT EXISTS fights (
  id INTEGER PRIMARY KEY AUTOINCREMENT, run_id INTEGER, seq INTEGER,
  act INTEGER, floor INTEGER, kind TEXT, map TEXT,
  life_before INTEGER, life_lost INTEGER, max_life INTEGER, gold_before INTEGER, won INTEGER,
  turns INTEGER, killed INTEGER, leaked INTEGER, built INTEGER, gold_earned INTEGER,
  draws INTEGER, extra_draws INTEGER, sec INTEGER, enemies TEXT
);`,
  // ラン全体で、敵の種類ごとの減ったライフ（fights＝ライフを減らされた戦闘の数）
  `CREATE TABLE IF NOT EXISTS run_dmg (run_id INTEGER, enemy TEXT, life INTEGER, fights INTEGER);`,
  // ラン全体で、ダメージの出どころ（タワーの種類など）ごとの与えたダメージ・倒した数・使った戦闘の数
  `CREATE TABLE IF NOT EXISTS run_src (run_id INTEGER, src TEXT, dmg INTEGER, kills INTEGER, fights INTEGER);`,
  // ラン全体で、カードを使った回数（fights＝使った戦闘の数）
  `CREATE TABLE IF NOT EXISTS run_played (run_id INTEGER, card TEXT, n INTEGER, fights INTEGER);`,
  // 戦闘以外の選択（イベント・たき火・商人で買った物・手放した／鍛えたカード）
  `CREATE TABLE IF NOT EXISTS choices (run_id INTEGER, act INTEGER, floor INTEGER, kind TEXT, item TEXT, detail TEXT);`,
];

// 1回だけ実行する（同じ動いているサーバーの中では2回目からは何もしない）
let ready = null;
export function ensureSchema(DB) {
  if (!ready) ready = DB.batch(SCHEMA.map(s => DB.prepare(s))).catch(e => { ready = null; throw e; });
  return ready;
}

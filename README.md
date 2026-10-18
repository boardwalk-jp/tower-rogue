# ローグライク・タワーディフェンス（仮）

スマホ縦持ち向けのブラウザゲーム。仕様は [docs/SPEC.md](docs/SPEC.md)。

- `index.html`：段階2 1層の試作（ワールドマップ・戦闘・報酬・イベント・商人・休憩・ボス）
- `samples/orc-vs-mage-dot.html`：表現サンプル（ドット版）
- `node tools/sim.js 30`：1層を自動で30回遊んで勝率を見る
- 公開前に `python3 tools/stamp.py`（スマホが古いファイルを使わないように版の印を付け直す）

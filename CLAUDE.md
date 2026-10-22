# このリポジトリについて

スマホ縦持ち向けの「デッキ構築型ローグライク × タワーディフェンス」のブラウザゲーム。

- 新しい会話を始めたら、まず `docs/HANDOFF_NEXT.md`（引き継ぎ書）を最後まで読むこと
- 作業を始める前に必ず `docs/SPEC.md`（仕様書）を読むこと。決定事項と未定事項はすべてそこにある
- 仕様が変わったら、コードと一緒に `docs/SPEC.md` も更新する
- 素のHTML/CSS/JavaScriptのみ。画像・音声ファイルは使わず、ドット絵とBGMはコードで生成する
- 基準端末は iPhone の Safari（縦持ち）
- 公開は Cloudflare Pages（プロジェクト名 `syoppaiya-td`、本番URL https://syoppaiya-td.pages.dev ）。GitHub の main ブランチに反映すると自動で公開される（ビルドなし・リポジトリの直下をそのまま公開）。旧URL https://boardwalk-jp.github.io/tower-rogue/ はテストプレイヤーのデータ引き継ぎが終わるまで残す
- ほかのチャットも main に commit することがあるので、作業の前と push の前に `git pull` する
- 公開する（main に push する）前に、毎回 `python3 tools/stamp.py` を実行する（読み込むファイルの番号とタイトル右下の版を新しくする。スマホが古いファイルを使わないように）
- オーナーへの説明は日本語で、高校生が分かる言葉で書く

# Decisions

## 2026-07-30 — One page, one clap link

- Decision: 個人サイト全体の管理サービスを作らず、一つの公開ページに対する拍手リンクだけを扱う
- Reason: 外部スクリプトやアカウントを要求せず、既存ページへ通常のリンク一つで追加できる
- Boundary: コメント、メール通知、公開ランキング、読者プロフィール、サイト横断ダッシュボードを扱わない

## 2026-07-30 — Fixed reactions, private detail

- Decision: 「よかった」「続きも読みたい」「役立った」「ありがとう」の四種類に固定する
- Decision: 公開ページは合計だけ、種類別の件数と30日グラフは管理画面だけに表示する
- Reason: 作者へ手触りのある反応を返しながら、読者の自由文や公開比較が生む管理負担を持たない

## 2026-07-30 — Capability URL, no Better Auth

- Decision: Better Authを導入せず、拍手リンクごとの管理鍵を発行する
- Reason: 一ページで試す作者に登録を要求せず、メールとアカウント復旧情報を保有しない
- Boundary: 管理鍵はhash化して保存し、URL fragmentからBearer tokenへ渡す

## 2026-07-30 — Source safety and canonical delivery

- Decision: 元ページを取得せず、一般公開されたHTTPS URLだけをリンク先として保存する
- Decision: 正規URLを`https://pon-hakushu.yhay81.com`とし、`workers.dev`とpreview URLを無効にする
- Reason: SSRFとコンテンツ複製を避け、運用責任と共有先を小さく保つ

## 2026-07-30 — Limited retention

- Decision: 拍手リンクと反応を180日以内、匿名操作イベントを45日以内に削除する
- Reason: 試用と反応の変化を観測できる期間を残しながら、不要な履歴を恒久保存しない

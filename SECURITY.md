# Security

## Controls

- 128-bit box IDと256-bit owner capability key
- D1には管理鍵のSHA-256 hashだけを保存し、定時間比較
- same-origin write、JSON content type、body size、文字数、列挙値を検証
- 元ページは公開HTTPS URLだけを許可し、資格情報、任意port、localhost、ローカル用TLD、IPリテラルを拒否
- お礼文のURL、メールアドレス、制御文字、honeypot入力を拒否
- 1匿名ブラウザ1日1反応を選び直し可能、1拍手リンク5,000反応
- 1匿名ブラウザ1日10リンク作成
- 3つの異なる匿名セッションから報告された拍手ページを自動非表示
- private routeの`noindex` / `no-store`、CSP、HSTS、nosniff、frame deny
- JSXとDOM `textContent`だけで利用者入力を表示
- scheduled cleanupで拍手リンクと反応を180日以内、匿名操作イベントを45日以内に削除

## Capability boundary

公開APIは公開ページの情報と集計だけを返し、読者ごとの反応、匿名ブラウザID、管理鍵を返しません。種類別の件数と30日グラフは管理APIだけが返します。管理APIはURL fragmentから読み出した管理鍵をBearer tokenとして受け取ります。

管理URLを失うと復旧できません。拍手ページURLと分けて安全な場所へ保管してください。

## Reporting

秘密鍵の漏えいや脆弱性は公開issueへ本文を貼らず、GitHub Security Advisoryのprivate reportを利用してください。

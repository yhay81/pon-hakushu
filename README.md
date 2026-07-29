# ぽん拍手

個人サイトのページへ一つのリンクを置き、読者から四種類の定型反応を受け取る日本語Webサービスです。

- サービス: <https://pon-hakushu.yhay81.com>
- 使い方: <https://pon-hakushu.yhay81.com/guide>
- プライバシー: <https://pon-hakushu.yhay81.com/privacy>

## Product boundary

作者はサイト名、ページ名、公開中の元ページURL、任意のお礼を入力し、拍手ページURLと作者用の管理URLを受け取ります。読者は「よかった」「続きも読みたい」「役立った」「ありがとう」から一つを選びます。公開ページに出す集計は合計だけで、種類別の件数と30日グラフは管理鍵を持つ作者だけが確認できます。

自由文、読者名、メール、通知、公開ランキング、埋め込みJavaScript、サイト横断ダッシュボードは扱いません。拍手リンクと反応は180日以内、匿名操作イベントは45日以内に削除します。

## Development

Node.js 24 LTSとnpmを使います。

```powershell
npm ci
npx wrangler d1 migrations apply pon-hakushu --local
npm run dev -- --host 127.0.0.1 --port 5176
```

検査:

```powershell
npm run release:check
npm run check
npm test
npm run build
npm audit --omit=dev
```

本番:

```powershell
npx wrangler d1 migrations apply pon-hakushu --remote
npm run deploy
npm run indexnow
npm run metrics
```

## Stack

Cloudflare Workers / D1、Hono / Hono JSX、Vite+、TypeScript。Better Authは使わず、拍手リンクごとの256-bit owner capability keyで管理権限を分離します。

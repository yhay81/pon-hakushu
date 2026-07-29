# Stack

- Runtime: Cloudflare Workers
- API / rendering: Hono / Hono JSX
- Build and quality: Vite+ / TypeScript / Oxlint / Oxfmt / Vitest
- Persistence: Cloudflare D1
- Delivery: `pon-hakushu.yhay81.com` custom domain; `workers.dev` and preview URLs disabled
- Authentication: Better Authなし。拍手リンク単位のowner capability key

アカウント、メール、Cookieを不要にできる単発リンクの境界なので、Better Authは導入しません。複数ページを継続管理する作者アカウントや請求が必要になった場合に再評価します。

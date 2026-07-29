# Privacy

## Product data

D1へサイト名、ページ名、元ページURL、任意のお礼文、拍手の種類、匿名ブラウザID、日付を保存します。拍手ページは推測困難な128-bit IDで共有し、公開一覧やsitemapへ載せません。

氏名、メールアドレス、自由文、IPアドレス、User-Agentは保存しません。拍手リンクと反応は作成から180日以内に削除し、作者は管理URLから即時削除できます。

## Visibility and capability key

拍手ページへ表示するのはサイト名、ページ名、元ページURL、任意のお礼文、拍手合計です。四種類の件数と30日グラフは256-bit管理鍵を持つ作者だけが取得できます。D1には管理鍵のSHA-256 hashだけを保存します。

管理鍵はURL fragmentに含めるため、通常のHTTPリクエスト、Referer、アクセスログへ送られません。ブラウザは管理APIへBearer tokenとして渡し、作成端末のlocalStorageにも保存します。管理URLを失うと復旧できません。

## Anonymous telemetry

Cookieは使いません。ブラウザのlocalStorageにランダムUUIDを作り、訪問、リンク作成、URLコピー、拍手保存、管理画面表示、削除、別日再訪の操作名と発生日を45日以内保存します。サイト名、ページ名、元ページURL、お礼文、拍手の種類、IPアドレス、User-Agentは操作イベントへ含めません。`?qa=1`、WebDriver、`x-automated-qa`による自動QAは記録しません。

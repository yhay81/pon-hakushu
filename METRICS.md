# Metrics

拍手リンクと反応の業務行を正本にし、訪問、URLコピー、管理画面表示、別日再訪だけを匿名イベントで補います。自動QAは`?qa=1`、WebDriver、`x-automated-qa`で除外します。

| Metric                  | Source                      | Meaning                         |
| ----------------------- | --------------------------- | ------------------------------- |
| `users`                 | distinct `visited` session  | 匿名訪問者                      |
| `owners`                | distinct box creator        | 拍手リンクを作った匿名作者      |
| `boxes_created`         | visible `boxes`             | 作成された実拍手リンク          |
| `links_copied`          | distinct box context        | URLまたはHTMLをコピーしたリンク |
| `owner_opened`          | distinct box context        | 管理画面が開かれたリンク        |
| `reactions`             | `reactions`                 | 現在保存されている反応          |
| `reactors`              | distinct reaction session   | 反応した匿名読者                |
| `boxes_with_reactions`  | reaction aggregation        | 1件以上反応があるリンク         |
| `boxes_with_5_reactors` | reaction aggregation        | 5読者以上から反応があるリンク   |
| `clap_reactions`        | `reactions.kind`            | 「よかった」の反応              |
| `more_reactions`        | `reactions.kind`            | 「続きも読みたい」の反応        |
| `useful_reactions`      | `reactions.kind`            | 「役立った」の反応              |
| `thanks_reactions`      | `reactions.kind`            | 「ありがとう」の反応            |
| `repeat_owners`         | creator aggregation         | 2リンク以上作った匿名作者       |
| `returned`              | distinct `returned` session | 別日に再訪した匿名利用者        |

サイト名、ページ名、元ページURL、お礼文、拍手の種類、IPアドレス、User-Agentは操作イベントへ記録しません。ブラウザ生成UUID、操作名、拍手リンクIDまたは`home`、発生日だけを45日以内保存します。

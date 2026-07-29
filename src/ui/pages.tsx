import { product } from "../config/product";
import { Layout } from "./layout";

const reactions = [
  ["clap", "👏", "よかった"],
  ["more", "🌱", "続きも読みたい"],
  ["useful", "💡", "役立った"],
  ["thanks", "💌", "ありがとう"],
] as const;

function PageCard({ compact = false }: { compact?: boolean }) {
  return (
    <div aria-hidden="true" class={compact ? "page-card compact" : "page-card"}>
      <header>
        <i></i>
        <span>MY LITTLE WEB</span>
        <b>● ● ●</b>
      </header>
      <article>
        <small>ESSAY / 2026.07.30</small>
        <strong>
          机の上に残った
          <br />
          小さな景色
        </strong>
        <p></p>
        <p></p>
        <p></p>
      </article>
      <footer>
        <span>👏</span>
        <b>このページへ拍手</b>
      </footer>
    </div>
  );
}

function FlyingClaps() {
  return (
    <div aria-hidden="true" class="flying-claps">
      <svg viewBox="0 0 430 260">
        <path d="M18 70C105 68 104 32 191 78s133 21 220-13" />
        <path d="M15 130c84 0 98 44 180 8s135-2 216 18" />
        <path d="M22 203c94-6 112-28 185 8s132 4 204-13" />
      </svg>
      <span class="token token-a">👏</span>
      <span class="token token-b">🌱</span>
      <span class="token token-c">💡</span>
      <span class="token token-d">💌</span>
      <small>LINK</small>
      <b>ぽん</b>
      <em>作者へ</em>
    </div>
  );
}

function OwnerTray() {
  return (
    <div aria-hidden="true" class="owner-tray">
      <header>
        <span>PRIVATE TRAY</span>
        <b>TODAY</b>
      </header>
      <div class="tray-total">
        <small>届いた拍手</small>
        <strong>18</strong>
      </div>
      <div class="tray-bars">
        {reactions.map((reaction, index) => (
          <article>
            <span>{reaction[1]}</span>
            <div>
              <i style={`--amount:${[78, 48, 62, 35][index]}%`}></i>
            </div>
            <b>{[7, 3, 5, 3][index]}</b>
          </article>
        ))}
      </div>
      <footer>
        <span>誰が送ったかは残しません</span>
      </footer>
    </div>
  );
}

export function HomePage() {
  return (
    <Layout>
      <section class="clap-stage" aria-label="ページに置いた拍手リンクから作者へ反応が届くイメージ">
        <div class="stage-label left">
          <span>YOUR PAGE</span>
          <b>いつもの記事</b>
        </div>
        <PageCard />
        <FlyingClaps />
        <OwnerTray />
        <div class="stage-label right">
          <span>PRIVATE TOTAL</span>
          <b>作者だけの集計</b>
        </div>
      </section>

      <section class="maker-shell" id="make">
        <div class="maker-intro">
          <span class="eyebrow">ONE LINK, FOUR REACTIONS</span>
          <h1>{product.headline}</h1>
          <p>
            記事や作品の末尾へリンクを一つ。読者は名前も文章も入れず、四つの定型拍手から気持ちを送れます。
          </p>
          <ol>
            <li>
              <span>01</span>拍手を置くページを登録
            </li>
            <li>
              <span>02</span>生成したリンクを貼る
            </li>
            <li>
              <span>03</span>作者だけが集計を見る
            </li>
          </ol>
        </div>
        <form class="maker" id="create-form">
          <header>
            <span class="clap-icon" aria-hidden="true">
              <i></i>
              <b></b>
              <em></em>
            </span>
            <div>
              <small>NEW CLAP LINK</small>
              <h2>このページに拍手を置く</h2>
            </div>
          </header>
          <label class="field">
            <span>サイト名</span>
            <input id="site-title" maxlength={60} placeholder="MY LITTLE WEB" required />
          </label>
          <label class="field">
            <span>ページ名</span>
            <input id="page-title" maxlength={80} placeholder="机の上に残った小さな景色" required />
          </label>
          <label class="field">
            <span>公開ページURL</span>
            <input
              id="source-url"
              inputmode="url"
              maxlength={500}
              placeholder="https://example.com/essay"
              required
              type="url"
            />
          </label>
          <label class="field">
            <span>
              拍手後のひとこと <small>任意</small>
            </span>
            <input
              id="thank-you"
              maxlength={120}
              placeholder="読んでくださって、ありがとうございます。"
            />
          </label>
          <label class="ownership-check">
            <input id="ownership" required type="checkbox" />
            <span>この公開ページを自分または所属先が管理しています</span>
          </label>
          <label aria-hidden="true" class="honeypot">
            Website
            <input id="website" tabindex={-1} />
          </label>
          <button class="button primary" id="create-button" type="submit">
            拍手リンクをつくる <span aria-hidden="true">→</span>
          </button>
          <p class="action-status" id="create-status" aria-live="polite"></p>
          <footer>
            <span>外部スクリプトなし</span>
            <span>自由文なし</span>
            <span>公開一覧なし</span>
          </footer>
        </form>
      </section>
      <script src="/home.js?v=1" type="module"></script>
    </Layout>
  );
}

export function ReactionPage({ boxId, pageTitle }: { boxId: string; pageTitle: string }) {
  return (
    <Layout
      bodyClass="private-page"
      canonical={`${product.url}/p/${boxId}`}
      noindex
      title={`${pageTitle}への拍手 | ${product.name}`}
    >
      <section class="reaction-shell" data-box-id={boxId} id="reaction-app">
        <header class="reaction-heading">
          <span class="eyebrow" id="site-title">
            読み込み中
          </span>
          <h1 id="page-title">{pageTitle}</h1>
          <a href="#" id="source-link" rel="nofollow noopener noreferrer">
            元のページを開く ↗
          </a>
        </header>
        <div class="reaction-stage">
          <div class="reader-page">
            <PageCard compact />
          </div>
          <div class="reaction-picker">
            <header>
              <span>SEND ONE</span>
              <h2>どの拍手を送りますか？</h2>
              <p>名前や文章は送りません。同じページへは一日一回、選び直せます。</p>
            </header>
            <div class="reaction-buttons">
              {reactions.map(([kind, icon, label]) => (
                <button data-kind={kind} type="button">
                  <span>{icon}</span>
                  <b>{label}</b>
                </button>
              ))}
            </div>
            <p class="action-status" id="reaction-status" aria-live="polite"></p>
            <div class="thank-you-card" hidden id="thank-you-card">
              <span>届きました</span>
              <p id="thank-you-text"></p>
            </div>
          </div>
          <aside class="public-total">
            <span>ALL CLAPS</span>
            <strong id="public-total">0</strong>
            <small>合計だけを表示</small>
          </aside>
        </div>
        <button class="report-link" id="report-button" type="button">
          この拍手ページを報告
        </button>
      </section>
      <script src="/reaction.js?v=1" type="module"></script>
    </Layout>
  );
}

export function ManagePage({ boxId }: { boxId: string }) {
  return (
    <Layout
      bodyClass="private-page"
      canonical={`${product.url}/manage/${boxId}`}
      noindex
      title={`拍手の集計 | ${product.name}`}
    >
      <section class="manage-shell" data-box-id={boxId} id="manage-app">
        <header class="manage-heading">
          <div>
            <span class="eyebrow">PRIVATE TRAY</span>
            <h1 id="manage-title">拍手を読み込んでいます</h1>
            <p id="manage-site"></p>
          </div>
          <a class="button compact" href="#" id="public-link">
            拍手ページを見る
          </a>
        </header>
        <div class="manage-board">
          <section class="total-card">
            <span>届いた拍手</span>
            <strong id="manage-total">0</strong>
            <small>直近30日の推移</small>
            <div class="day-chart" id="day-chart"></div>
          </section>
          <section class="reaction-summary" id="reaction-summary">
            {reactions.map(([kind, icon, label]) => (
              <article data-kind={kind}>
                <span>{icon}</span>
                <div>
                  <b>{label}</b>
                  <i>
                    <em></em>
                  </i>
                </div>
                <strong>0</strong>
              </article>
            ))}
          </section>
          <section class="install-card">
            <header>
              <span>PUT THE LINK</span>
              <h2>ページの末尾へ置く</h2>
            </header>
            <label>
              そのまま使えるリンク
              <textarea id="link-code" readonly rows={3}></textarea>
            </label>
            <div>
              <button class="button compact" id="copy-url" type="button">
                URLをコピー
              </button>
              <button class="button compact accent" id="copy-code" type="button">
                HTMLをコピー
              </button>
            </div>
            <p class="action-status" id="manage-status" aria-live="polite"></p>
          </section>
        </div>
        <section class="danger-zone">
          <div>
            <strong>拍手リンクを削除</strong>
            <p>集計と拍手をすべて削除します。元のページに置いたリンクも外してください。</p>
          </div>
          <button class="button danger" id="delete-button" type="button">
            削除する
          </button>
        </section>
      </section>
      <script src="/manage.js?v=1" type="module"></script>
    </Layout>
  );
}

export function GuidePage() {
  return (
    <Layout canonical={`${product.url}/guide`} title={`使い方 | ${product.name}`}>
      <article class="guide-board">
        <header>
          <span class="eyebrow">HOW TO CLAP</span>
          <h1>ページの外見を変えず、リンク一つで拍手を受け取る。</h1>
          <p>
            ぽん拍手は埋め込みスクリプトではありません。生成したリンクを、記事末尾の文字や画像へ設定します。
          </p>
        </header>
        <ol class="guide-steps">
          <li>
            <span>01</span>
            <div class="guide-icon page-mini">
              <i></i>
              <i></i>
              <i></i>
            </div>
            <h2>ページを登録</h2>
            <p>管理中の公開ページ名とURL、拍手後に見せる短いお礼を入れます。</p>
          </li>
          <li>
            <span>02</span>
            <div class="guide-icon link-mini">
              <i></i>
              <i></i>
            </div>
            <h2>リンクを置く</h2>
            <p>コピーしたURLまたはHTMLを、元ページの末尾へ貼ります。外部JavaScriptは不要です。</p>
          </li>
          <li>
            <span>03</span>
            <div class="guide-icon tray-mini">
              <i></i>
              <i></i>
              <i></i>
            </div>
            <h2>集計を見る</h2>
            <p>四種類の合計と30日の流れだけを管理URLで確認します。送信者名や自由文は集めません。</p>
          </li>
        </ol>
        <section class="guide-note">
          <strong>管理URLは復旧できません</strong>
          <p>
            管理鍵はURLの「#」以降と作成端末だけに保存されます。拍手ページと分けて安全な場所へ控えてください。
          </p>
        </section>
      </article>
    </Layout>
  );
}

export function PrivacyPage() {
  return (
    <Layout canonical={`${product.url}/privacy`} title={`プライバシー | ${product.name}`}>
      <article class="prose">
        <header>
          <span class="eyebrow">PRIVACY</span>
          <h1>名前も文章も集めず、拍手の形だけ。</h1>
        </header>
        <section>
          <h2>公開されるもの</h2>
          <p>
            サイト名、ページ名、元ページURL、任意のお礼文、拍手合計を、推測困難な共有URLを知る人へ表示します。公開一覧やsitemapへ載せません。
          </p>
        </section>
        <section>
          <h2>作者だけが見るもの</h2>
          <p>
            四種類の拍手数と直近30日の日別件数です。読者の名前、自由文、IPアドレス、User-Agentは製品データとして保存しません。
          </p>
        </section>
        <section>
          <h2>保持期間</h2>
          <p>
            拍手リンクと反応は作成から180日以内、匿名の操作イベントは45日以内に削除します。作者は管理URLから即時削除できます。
          </p>
        </section>
      </article>
    </Layout>
  );
}

export function NotFoundPage() {
  return (
    <Layout noindex title={`見つかりません | ${product.name}`}>
      <section class="not-found">
        <span>404</span>
        <h1>この拍手ページは見つかりません。</h1>
        <p>URLを確認するか、トップページから新しい拍手リンクをつくってください。</p>
        <a class="button compact" href="/">
          トップへ戻る
        </a>
      </section>
    </Layout>
  );
}

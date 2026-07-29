import {
  apiJson,
  isAutomatedQa,
  linkFor,
  rememberOwner,
  sessionId,
  setStatus,
  trackVisit,
} from "./common.js";

const form = document.querySelector("#create-form");
const button = document.querySelector("#create-button");
const status = document.querySelector("#create-status");

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (
    !(form instanceof HTMLFormElement) ||
    !(button instanceof HTMLButtonElement) ||
    !form.reportValidity()
  ) {
    return;
  }
  button.disabled = true;
  setStatus(status, "拍手リンクを用意しています…");
  try {
    const result = await apiJson("/api/boxes", {
      body: JSON.stringify({
        ownership: document.querySelector("#ownership")?.checked === true,
        pageTitle: document.querySelector("#page-title")?.value ?? "",
        sessionId,
        siteTitle: document.querySelector("#site-title")?.value ?? "",
        sourceUrl: document.querySelector("#source-url")?.value ?? "",
        thankYou: document.querySelector("#thank-you")?.value ?? "",
        website: document.querySelector("#website")?.value ?? "",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    rememberOwner(result.boxId, result.ownerToken);
    setStatus(status, "作成しました。作者だけの集計画面へ移動します。", "success");
    location.assign(linkFor(`/manage/${result.boxId}`, result.ownerToken));
  } catch (error) {
    const messages = {
      invalid_box: "サイト名、ページ名、公開URL、確認欄を見直してください。",
      invalid_source: "一般公開されたHTTPSページのURLを入力してください。",
      rate_limited: "今日は10件作成しています。明日もう一度お試しください。",
    };
    setStatus(
      status,
      messages[error.message] ?? "作成できませんでした。もう一度お試しください。",
      "error",
    );
    button.disabled = false;
  }
});

if (isAutomatedQa) document.documentElement.dataset.qa = "true";
trackVisit("home");

import { apiJson, sessionId, setStatus, trackVisit } from "./common.js";

const app = document.querySelector("#reaction-app");
const boxId = app?.dataset.boxId ?? "";
const status = document.querySelector("#reaction-status");
const thankYouCard = document.querySelector("#thank-you-card");
let model = null;

const setText = (selector, value) => {
  const node = document.querySelector(selector);
  if (node) node.textContent = String(value);
};

const renderSummary = (summary) => {
  setText("#public-total", summary?.total ?? 0);
};

const load = async () => {
  try {
    model = await apiJson(`/api/boxes/${boxId}`);
    setText("#site-title", model.siteTitle);
    setText("#page-title", model.pageTitle);
    setText("#thank-you-text", model.thankYou || "拍手をありがとうございます。");
    const source = document.querySelector("#source-link");
    if (source instanceof HTMLAnchorElement) source.href = model.sourceUrl;
    renderSummary(model.summary);
  } catch {
    setStatus(status, "この拍手ページは利用できません。", "error");
    document.querySelectorAll(".reaction-buttons button").forEach((item) => {
      item.disabled = true;
    });
  }
};

document.querySelectorAll(".reaction-buttons button").forEach((item) => {
  item.addEventListener("click", async () => {
    if (!(item instanceof HTMLButtonElement)) return;
    document.querySelectorAll(".reaction-buttons button").forEach((button) => {
      button.disabled = true;
    });
    setStatus(status, "拍手を届けています…");
    try {
      const result = await apiJson(`/api/boxes/${boxId}/reactions`, {
        body: JSON.stringify({
          kind: item.dataset.kind,
          sessionId,
          website: "",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      document.querySelectorAll(".reaction-buttons button").forEach((button) => {
        button.dataset.selected = button === item ? "true" : "false";
      });
      renderSummary(result.summary);
      if (thankYouCard instanceof HTMLElement) thankYouCard.hidden = false;
      setStatus(status, "作者へ届きました。同じ日の拍手は選び直せます。", "success");
    } catch (error) {
      setStatus(
        status,
        error.message === "box_full"
          ? "この拍手ページは受付上限に達しました。"
          : "拍手を届けられませんでした。もう一度お試しください。",
        "error",
      );
    } finally {
      document.querySelectorAll(".reaction-buttons button").forEach((button) => {
        button.disabled = false;
      });
    }
  });
});

document.querySelector("#report-button")?.addEventListener("click", async () => {
  if (!confirm("スパムや危険な誘導として、この拍手ページを報告しますか？")) return;
  try {
    await apiJson(`/api/boxes/${boxId}/report`, {
      body: JSON.stringify({ reason: "unsafe", sessionId }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    setStatus(status, "報告を受け付けました。", "success");
  } catch {
    setStatus(status, "報告を送れませんでした。", "error");
  }
});

void load();
trackVisit(boxId);

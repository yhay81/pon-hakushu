import {
  apiJson,
  authorization,
  copyText,
  forgetBox,
  linkFor,
  readOwner,
  setStatus,
  track,
} from "./common.js";

const app = document.querySelector("#manage-app");
const boxId = app?.dataset.boxId ?? "";
const owner = readOwner(boxId);
const status = document.querySelector("#manage-status");
let model = null;

if (location.hash) history.replaceState(null, "", `${location.pathname}${location.search}`);

const setText = (selector, value) => {
  const node = document.querySelector(selector);
  if (node) node.textContent = String(value);
};

const renderDays = (days) => {
  const chart = document.querySelector("#day-chart");
  if (!(chart instanceof HTMLElement)) return;
  const counts = new Map(days.map((item) => [item.day, Number(item.count)]));
  const dates = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(Date.now() + 9 * 60 * 60 * 1000 - (29 - index) * 86400000);
    return date.toISOString().slice(0, 10);
  });
  const maximum = Math.max(1, ...counts.values());
  chart.replaceChildren();
  dates.forEach((date) => {
    const count = counts.get(date) ?? 0;
    const bar = document.createElement("i");
    bar.style.setProperty("--height", `${Math.max(count > 0 ? 9 : 2, (count / maximum) * 100)}%`);
    bar.title = `${date}: ${count}件`;
    chart.append(bar);
  });
};

const renderSummary = (summary) => {
  const maximum = Math.max(1, summary.clap, summary.more, summary.useful, summary.thanks);
  setText("#manage-total", summary.total);
  document.querySelectorAll(".reaction-summary article").forEach((item) => {
    const kind = item.dataset.kind;
    const count = Number(summary[kind] ?? 0);
    const value = item.querySelector("strong");
    const bar = item.querySelector("em");
    if (value) value.textContent = String(count);
    if (bar instanceof HTMLElement) {
      bar.style.setProperty("--amount", `${(count / maximum) * 100}%`);
    }
  });
};

const load = async () => {
  if (!owner) {
    setStatus(status, "この端末に管理鍵がありません。作成時の管理URLを開いてください。", "error");
    document.querySelectorAll("button").forEach((item) => {
      item.disabled = true;
    });
    return;
  }
  try {
    model = await apiJson(`/api/boxes/${boxId}/manage`, {
      headers: authorization(owner),
    });
    setText("#manage-title", model.pageTitle);
    setText("#manage-site", model.siteTitle);
    const publicUrl = linkFor(`/p/${boxId}`);
    const publicLink = document.querySelector("#public-link");
    if (publicLink instanceof HTMLAnchorElement) publicLink.href = publicUrl;
    const code = `<a href="${publicUrl}" rel="nofollow">👏 このページへ拍手</a>`;
    const linkCode = document.querySelector("#link-code");
    if (linkCode instanceof HTMLTextAreaElement) linkCode.value = code;
    renderSummary(model.summary);
    renderDays(model.days);
    track("owner_opened", boxId);
  } catch {
    setStatus(status, "管理鍵が違うか、この拍手リンクは削除されています。", "error");
  }
};

document.querySelector("#copy-url")?.addEventListener("click", async () => {
  try {
    await copyText(linkFor(`/p/${boxId}`));
    setStatus(status, "拍手ページURLをコピーしました。", "success");
    track("link_copied", boxId);
  } catch {
    setStatus(status, "コピーできませんでした。", "error");
  }
});

document.querySelector("#copy-code")?.addEventListener("click", async () => {
  const code = document.querySelector("#link-code")?.value ?? "";
  try {
    await copyText(code);
    setStatus(status, "HTMLをコピーしました。ページの末尾へ貼ってください。", "success");
    track("link_copied", boxId);
  } catch {
    setStatus(status, "コピーできませんでした。", "error");
  }
});

document.querySelector("#delete-button")?.addEventListener("click", async () => {
  if (!owner || !confirm("この拍手リンクと集計をすべて削除しますか？元に戻せません。")) return;
  try {
    await apiJson(`/api/boxes/${boxId}`, {
      headers: authorization(owner),
      method: "DELETE",
    });
    track("box_deleted", boxId);
    forgetBox(boxId);
    location.assign(linkFor("/"));
  } catch {
    setStatus(status, "削除できませんでした。", "error");
  }
});

void load();

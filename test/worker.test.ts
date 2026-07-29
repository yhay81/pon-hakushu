import { readFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import { app, type Bindings } from "../src/worker";

const boxId = "a".repeat(32);
const ownerToken = "1".repeat(64);
const ownerHash = "3138bb9bc78df27c473ecfd1410f7bd45ebac1f59cf3ff9cfe4db77aab7aedd3";
const sessionId = "21d6f5db-2a77-4dd2-8319-e45fe918e687";
const readerSessionId = "38b80262-aaf5-4cf4-91f7-4dc052f9f08e";

type ReactionKind = "clap" | "more" | "thanks" | "useful";

type StoredBox = {
  created_at: number;
  expires_at: number;
  id: string;
  owner_token_hash: string;
  page_title: string;
  site_title: string;
  source_url: string;
  status: "hidden" | "open";
  thank_you: string;
};

type StoredReaction = {
  box_id: string;
  created_at: number;
  kind: ReactionKind;
  occurred_on: string;
  session_id: string;
  updated_at: number;
};

type TestState = {
  box: StoredBox | null;
  reactions: StoredReaction[];
  recentBoxes: number;
  reportSessions: Set<string>;
};

type Call = {
  arguments: unknown[];
  sql: string;
};

const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

const defaultState = (): TestState => ({
  box: {
    created_at: 1_721_000_000,
    expires_at: 4_102_444_800,
    id: boxId,
    owner_token_hash: ownerHash,
    page_title: "机の上に残った小さな景色",
    site_title: "MY LITTLE WEB",
    source_url: "https://author.example.com/essay",
    status: "open",
    thank_you: "読んでくださって、ありがとうございます。",
  },
  reactions: [
    {
      box_id: boxId,
      created_at: 1_721_000_100,
      kind: "clap",
      occurred_on: today,
      session_id: readerSessionId,
      updated_at: 1_721_000_100,
    },
  ],
  recentBoxes: 0,
  reportSessions: new Set(),
});

const makeBindings = (partial: Partial<TestState> = {}) => {
  const state = { ...defaultState(), ...partial };
  const calls: Call[] = [];
  const prepare = vi.fn((sql: string) => {
    const call: Call = { arguments: [], sql };
    calls.push(call);
    const statement = {
      all: async () => {
        if (sql.includes("GROUP BY occurred_on")) {
          const counts = new Map<string, number>();
          for (const reaction of state.reactions) {
            counts.set(reaction.occurred_on, (counts.get(reaction.occurred_on) ?? 0) + 1);
          }
          return {
            results: [...counts].map(([day, count]) => ({ count, day })),
          };
        }
        return { results: [] };
      },
      bind: (...values: unknown[]) => {
        call.arguments = values;
        return statement;
      },
      first: async () => {
        if (sql.includes("COUNT(*) AS count FROM boxes")) return { count: state.recentBoxes };
        if (sql.includes("COUNT(*) AS total_count")) {
          const relevant = state.reactions.filter(
            (reaction) => reaction.box_id === call.arguments[0],
          );
          return {
            clap_count: relevant.filter((reaction) => reaction.kind === "clap").length,
            more_count: relevant.filter((reaction) => reaction.kind === "more").length,
            thanks_count: relevant.filter((reaction) => reaction.kind === "thanks").length,
            total_count: relevant.length,
            useful_count: relevant.filter((reaction) => reaction.kind === "useful").length,
          };
        }
        if (sql.includes("COUNT(*) AS total") && sql.includes("FROM reactions")) {
          const relevant = state.reactions.filter(
            (reaction) => reaction.box_id === call.arguments[2],
          );
          return {
            own: relevant.filter(
              (reaction) =>
                reaction.session_id === call.arguments[0] &&
                reaction.occurred_on === call.arguments[1],
            ).length,
            total: relevant.length,
          };
        }
        if (sql.includes("COUNT(*) AS count FROM reports")) {
          return { count: state.reportSessions.size };
        }
        if (sql.includes("FROM boxes WHERE id")) {
          return state.box?.id === call.arguments[0] ? state.box : null;
        }
        return null;
      },
      raw: async () => [],
      run: async () => {
        if (sql.includes("INSERT INTO boxes")) {
          state.box = {
            created_at: 1_721_000_000,
            expires_at: 4_102_444_800,
            id: call.arguments[0] as string,
            owner_token_hash: call.arguments[1] as string,
            page_title: call.arguments[4] as string,
            site_title: call.arguments[3] as string,
            source_url: call.arguments[5] as string,
            status: "open",
            thank_you: call.arguments[6] as string,
          };
        }
        if (sql.includes("INSERT INTO reactions")) {
          const existing = state.reactions.find(
            (reaction) =>
              reaction.box_id === call.arguments[0] &&
              reaction.session_id === call.arguments[1] &&
              reaction.occurred_on === call.arguments[3],
          );
          if (existing) existing.kind = call.arguments[2] as ReactionKind;
          else {
            state.reactions.push({
              box_id: call.arguments[0] as string,
              created_at: 1_721_000_200,
              kind: call.arguments[2] as ReactionKind,
              occurred_on: call.arguments[3] as string,
              session_id: call.arguments[1] as string,
              updated_at: 1_721_000_200,
            });
          }
        }
        if (sql.includes("INSERT OR IGNORE INTO reports")) {
          state.reportSessions.add(call.arguments[1] as string);
        }
        if (sql.includes("UPDATE boxes SET status") && state.box) state.box.status = "hidden";
        if (sql.includes("DELETE FROM boxes")) state.box = null;
        return { meta: { changes: 1 } };
      },
    };
    return statement as unknown as D1PreparedStatement;
  });
  const db = {
    batch: vi.fn(async () => []),
    dump: vi.fn(async () => new ArrayBuffer(0)),
    exec: vi.fn(async () => ({ count: 0, duration: 0 })),
    prepare,
    withSession: vi.fn(),
  } as unknown as D1Database;
  return {
    bindings: {
      ASSETS: { fetch: vi.fn() } as unknown as Fetcher,
      DB: db,
    } satisfies Bindings,
    calls,
    state,
  };
};

const headers = {
  "content-type": "application/json",
  origin: "http://localhost",
  "sec-fetch-site": "same-origin",
};

const validBox = () => ({
  ownership: true,
  pageTitle: "机の上に残った小さな景色",
  sessionId,
  siteTitle: "MY LITTLE WEB",
  sourceUrl: "https://author.example.com/essay#section",
  thankYou: "読んでくださって、ありがとうございます。",
  website: "",
});

const createBox = (bindings: Bindings, body = validBox(), extraHeaders = {}) =>
  app.request(
    "/api/boxes",
    {
      body: JSON.stringify(body),
      headers: { ...headers, ...extraHeaders },
      method: "POST",
    },
    bindings,
  );

describe("ぽん拍手 worker", () => {
  it("公開ページに製品情報、構造化データ、固有canonicalを返す", async () => {
    const { bindings } = makeBindings();
    for (const path of ["/", "/guide", "/privacy"]) {
      const response = await app.request(path, undefined, bindings);
      const html = await response.text();
      expect(response.status).toBe(200);
      expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
      expect(html).toContain("ぽん拍手");
      expect(html).toContain("application/ld+json");
      expect(html).toContain(
        `href="https://pon-hakushu.yhay81.com${path === "/" ? "" : path}" rel="canonical"`,
      );
      expect(html).not.toMatch(/public validation|success criteria|experiment|仮説|成功条件/i);
    }
  });

  it("拍手ページと管理画面をnoindex・no-storeにする", async () => {
    const { bindings } = makeBindings();
    for (const path of [`/p/${boxId}`, `/manage/${boxId}`]) {
      const response = await app.request(path, undefined, bindings);
      const html = await response.text();
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("x-robots-tag")).toContain("noindex");
      expect(html).toContain(`data-box-id="${boxId}"`);
    }
  });

  it("非表示の拍手ページを公開しない", async () => {
    const state = defaultState();
    if (state.box) state.box.status = "hidden";
    const { bindings } = makeBindings(state);
    expect((await app.request(`/p/${boxId}`, undefined, bindings)).status).toBe(404);
  });

  it("公開APIはページ情報と集計だけを返す", async () => {
    const { bindings } = makeBindings();
    const response = await app.request(`/api/boxes/${boxId}`, undefined, bindings);
    const body = await response.json<Record<string, unknown>>();
    expect(response.status).toBe(200);
    expect(body.summary).toEqual({ clap: 1, more: 0, thanks: 0, total: 1, useful: 0 });
    expect(body).not.toHaveProperty("ownerTokenHash");
    expect(JSON.stringify(body)).not.toContain(readerSessionId);
    expect(JSON.stringify(body)).not.toContain(ownerHash);
  });

  it("管理鍵をhash化し、URL fragment用の管理URLを発行する", async () => {
    const { bindings, calls } = makeBindings({ box: null, reactions: [] });
    const response = await createBox(bindings);
    const body = await response.json<{
      boxId: string;
      manageUrl: string;
      ownerToken: string;
      publicUrl: string;
    }>();
    const insert = calls.find((call) => call.sql.includes("INSERT INTO boxes"));
    expect(response.status).toBe(201);
    expect(body.boxId).toMatch(/^[0-9a-f]{32}$/);
    expect(body.ownerToken).toMatch(/^[0-9a-f]{64}$/);
    expect(body.manageUrl).toContain(`#owner=${body.ownerToken}`);
    expect(body.publicUrl).not.toContain(body.ownerToken);
    expect(insert?.arguments).not.toContain(body.ownerToken);
    expect(insert?.arguments[5]).toBe("https://author.example.com/essay");
  });

  it("不正URL、未所有、リンク入りお礼、越境、作成上限を拒否する", async () => {
    const cases = [
      { ...validBox(), sourceUrl: "http://author.example.com/essay" },
      { ...validBox(), sourceUrl: "https://localhost/essay" },
      { ...validBox(), sourceUrl: "https://127.0.0.1/essay" },
      { ...validBox(), sourceUrl: "https://site.internal/essay" },
      { ...validBox(), ownership: false },
      { ...validBox(), thankYou: "続きは https://evil.example へ" },
    ];
    for (const body of cases) {
      expect((await createBox(makeBindings().bindings, body)).status).toBe(400);
    }
    expect(
      (
        await createBox(makeBindings().bindings, validBox(), {
          origin: "https://evil.example",
        })
      ).status,
    ).toBe(403);
    expect((await createBox(makeBindings({ recentBoxes: 10 }).bindings)).status).toBe(429);
  });

  it("一端末・一日・一ページの拍手を選び直せる", async () => {
    const { bindings, state } = makeBindings();
    const response = await app.request(
      `/api/boxes/${boxId}/reactions`,
      {
        body: JSON.stringify({ kind: "thanks", sessionId: readerSessionId, website: "" }),
        headers,
        method: "POST",
      },
      bindings,
    );
    const body = await response.json<{ summary: { thanks: number; total: number } }>();
    expect(response.status).toBe(200);
    expect(body.summary).toMatchObject({ thanks: 1, total: 1 });
    expect(state.reactions).toHaveLength(1);
    expect(state.reactions[0]?.kind).toBe("thanks");
  });

  it("新しい読者の拍手を追加し、5000件で新規受付を止める", async () => {
    const first = makeBindings();
    const added = await app.request(
      `/api/boxes/${boxId}/reactions`,
      {
        body: JSON.stringify({ kind: "useful", sessionId, website: "" }),
        headers,
        method: "POST",
      },
      first.bindings,
    );
    expect(added.status).toBe(200);
    expect(first.state.reactions).toHaveLength(2);

    const reactions = Array.from({ length: 5000 }, (_, index) => ({
      box_id: boxId,
      created_at: 1_721_000_100,
      kind: "clap" as const,
      occurred_on: today,
      session_id: `session-${index}`,
      updated_at: 1_721_000_100,
    }));
    const full = makeBindings({ reactions });
    const denied = await app.request(
      `/api/boxes/${boxId}/reactions`,
      {
        body: JSON.stringify({ kind: "clap", sessionId, website: "" }),
        headers,
        method: "POST",
      },
      full.bindings,
    );
    expect(denied.status).toBe(429);
  });

  it("管理鍵を持つ作者だけが日別集計を読み、削除できる", async () => {
    const owner = makeBindings();
    const response = await app.request(
      `/api/boxes/${boxId}/manage`,
      { headers: { authorization: `Bearer ${ownerToken}` } },
      owner.bindings,
    );
    const body = await response.json<{ days: Array<{ count: number; day: string }> }>();
    expect(response.status).toBe(200);
    expect(body.days).toEqual([{ count: 1, day: today }]);
    expect(JSON.stringify(body)).not.toContain(readerSessionId);

    const denied = await app.request(
      `/api/boxes/${boxId}/manage`,
      { headers: { authorization: `Bearer ${"9".repeat(64)}` } },
      owner.bindings,
    );
    expect(denied.status).toBe(403);

    const deleted = await app.request(
      `/api/boxes/${boxId}`,
      {
        headers: { ...headers, authorization: `Bearer ${ownerToken}` },
        method: "DELETE",
      },
      owner.bindings,
    );
    expect(deleted.status).toBe(204);
    expect(owner.state.box).toBeNull();
  });

  it("三つの独立報告で拍手ページを隠す", async () => {
    const state = defaultState();
    state.reportSessions = new Set(["first", "second"]);
    const { bindings, state: stored } = makeBindings(state);
    const response = await app.request(
      `/api/boxes/${boxId}/report`,
      {
        body: JSON.stringify({ reason: "unsafe", sessionId }),
        headers,
        method: "POST",
      },
      bindings,
    );
    expect(response.status).toBe(200);
    expect(stored.box?.status).toBe("hidden");
  });

  it("自動QAを操作イベントへ記録せず、通常イベントは45日で削除する", async () => {
    const qa = makeBindings();
    const qaResponse = await app.request(
      "/api/telemetry",
      {
        body: JSON.stringify({ context: boxId, name: "owner_opened", sessionId }),
        headers: { ...headers, "x-automated-qa": "1" },
        method: "POST",
      },
      qa.bindings,
    );
    expect(qaResponse.status).toBe(204);
    expect(qa.calls.some((call) => call.sql.includes("INSERT OR IGNORE INTO product_events"))).toBe(
      false,
    );

    const regular = makeBindings();
    const response = await app.request(
      "/api/telemetry",
      {
        body: JSON.stringify({ context: boxId, name: "owner_opened", sessionId }),
        headers,
        method: "POST",
      },
      regular.bindings,
    );
    expect(response.status).toBe(204);
    expect(
      regular.calls.some(
        (call) =>
          call.sql.includes("DELETE FROM product_events") && call.sql.includes("45 * 86400"),
      ),
    ).toBe(true);
  });

  it("ヘルスと未定義APIをJSONで返す", async () => {
    const { bindings } = makeBindings();
    const health = await app.request("/healthz", undefined, bindings);
    expect(await health.json()).toMatchObject({ healthy: true, service: "pon-hakushu" });
    const missing = await app.request("/api/missing", undefined, bindings);
    const body = await missing.json<{ error: string; requestId: string }>();
    expect(missing.status).toBe(404);
    expect(body.error).toBe("not_found");
    expect(body.requestId).toBeTruthy();
  });

  it("管理グラフの日付を反応保存と同じ日本時間で作る", async () => {
    const manageScript = await readFile(new URL("../public/manage.js", import.meta.url), "utf8");

    expect(manageScript).toContain("Date.now() + 9 * 60 * 60 * 1000");
  });
});

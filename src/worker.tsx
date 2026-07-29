import { Hono } from "hono";
import type { Context } from "hono";
import { requestId } from "hono/request-id";

import { securityHeaders } from "./middleware/security";
import {
  GuidePage,
  HomePage,
  ManagePage,
  NotFoundPage,
  PrivacyPage,
  ReactionPage,
} from "./ui/pages";

export type Bindings = {
  ASSETS: Fetcher;
  DB: D1Database;
};

type AppContext = Context<{ Bindings: Bindings; Variables: { requestId: string } }>;
type BoxStatus = "hidden" | "open";
type ReactionKind = "clap" | "more" | "thanks" | "useful";

type BoxRow = {
  created_at: number;
  expires_at: number;
  id: string;
  owner_token_hash: string;
  page_title: string;
  site_title: string;
  source_url: string;
  status: BoxStatus;
  thank_you: string;
};

type AggregateRow = {
  clap_count: number;
  more_count: number;
  thanks_count: number;
  total_count: number;
  useful_count: number;
};

class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: 400 | 403 | 404 | 409 | 413 | 415 | 429,
  ) {
    super(code);
  }
}

const app = new Hono<{ Bindings: Bindings; Variables: { requestId: string } }>();
const idPattern = /^[0-9a-f]{32}$/i;
const secretPattern = /^[0-9a-f]{64}$/i;
const browserSessionPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reactionKinds = new Set<ReactionKind>(["clap", "more", "thanks", "useful"]);
const reportReasons = new Set(["spam", "unsafe", "other"]);
const telemetryNames = new Set([
  "visited",
  "box_created",
  "link_copied",
  "reaction_saved",
  "owner_opened",
  "box_deleted",
  "returned",
]);
const blockedLinkPattern =
  /(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|jp|io|app|dev)\b|[\w.+-]+@[\w.-]+\.[a-z]{2,})/i;

const randomHex = (byteLength: number) => {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
};

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const sameHash = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
};

const cleanup = (db: D1Database) =>
  db.batch([
    db.prepare("DELETE FROM boxes WHERE expires_at <= unixepoch()"),
    db.prepare("DELETE FROM product_events WHERE created_at < unixepoch() - (45 * 86400)"),
  ]);

const enforceSameOrigin = (c: AppContext) => {
  const fetchSite = c.req.header("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") throw new ApiError("cross_site_request", 403);
  const origin = c.req.header("origin");
  if (origin && origin !== new URL(c.req.url).origin) {
    throw new ApiError("cross_site_request", 403);
  }
};

const parseJson = async (c: AppContext, maximumBytes: number) => {
  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new ApiError("unsupported_media_type", 415);
  }
  const contentLength = Number(c.req.header("content-length") ?? "0");
  if (contentLength > maximumBytes) throw new ApiError("payload_too_large", 413);
  const rawBody = await c.req.text();
  if (new TextEncoder().encode(rawBody).byteLength > maximumBytes) {
    throw new ApiError("payload_too_large", 413);
  }
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new ApiError("invalid_json", 400);
  }
};

const cleanText = (value: unknown, maximumLength: number) => {
  if (typeof value !== "string") return "";
  return Array.from(value.normalize("NFKC"))
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? " " : character;
    })
    .join("")
    .replaceAll(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);
};

const parseSourceUrl = (value: unknown) => {
  if (typeof value !== "string" || value.length > 500) throw new ApiError("invalid_source", 400);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ApiError("invalid_source", 400);
  }
  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    hostname.length > 253 ||
    !hostname.includes(".") ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".invalid") ||
    hostname.endsWith(".test") ||
    hostname.includes(":") ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
  ) {
    throw new ApiError("invalid_source", 400);
  }
  url.hash = "";
  return url.toString();
};

const getBox = (db: D1Database, boxId: string) =>
  db
    .prepare(
      `SELECT id, owner_token_hash, site_title, page_title, source_url,
        thank_you, status, created_at, expires_at
       FROM boxes WHERE id = ? AND expires_at > unixepoch()`,
    )
    .bind(boxId)
    .first<BoxRow>();

const bearerToken = (c: AppContext) => {
  const authorization = c.req.header("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!secretPattern.test(token)) throw new ApiError("access_denied", 403);
  return token;
};

const requireOwner = async (c: AppContext, boxId: string) => {
  const token = bearerToken(c);
  const box = await getBox(c.env.DB, boxId);
  if (!box || !sameHash(await sha256(token), box.owner_token_hash)) {
    throw new ApiError("access_denied", 403);
  }
  return box;
};

const getAggregates = async (db: D1Database, boxId: string) => {
  const row = await db
    .prepare(
      `SELECT
        COUNT(*) AS total_count,
        COUNT(CASE WHEN kind = 'clap' THEN 1 END) AS clap_count,
        COUNT(CASE WHEN kind = 'more' THEN 1 END) AS more_count,
        COUNT(CASE WHEN kind = 'useful' THEN 1 END) AS useful_count,
        COUNT(CASE WHEN kind = 'thanks' THEN 1 END) AS thanks_count
       FROM reactions WHERE box_id = ?`,
    )
    .bind(boxId)
    .first<AggregateRow>();
  return {
    clap: Number(row?.clap_count ?? 0),
    more: Number(row?.more_count ?? 0),
    thanks: Number(row?.thanks_count ?? 0),
    total: Number(row?.total_count ?? 0),
    useful: Number(row?.useful_count ?? 0),
  };
};

const publicBox = async (db: D1Database, box: BoxRow) => ({
  createdAt: box.created_at,
  id: box.id,
  pageTitle: box.page_title,
  siteTitle: box.site_title,
  sourceUrl: box.source_url,
  status: box.status,
  summary: await getAggregates(db, box.id),
  thankYou: box.thank_you,
});

const isAutomatedQa = (c: AppContext) => {
  if (c.req.header("x-automated-qa") === "1") return true;
  const referer = c.req.header("referer");
  if (!referer) return false;
  try {
    return new URL(referer).searchParams.get("qa") === "1";
  } catch {
    return false;
  }
};

const noStore = (c: AppContext) => {
  c.header("Cache-Control", "private, no-store");
  c.header("X-Robots-Tag", "noindex, nofollow, noarchive");
};

const recordEvent = async (db: D1Database, sessionId: string, name: string, context: string) => {
  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO product_events
         (session_id, name, context, occurred_on, created_at)
         VALUES (?, ?, ?, ?, unixepoch())`,
      )
      .bind(sessionId, name, context, new Date().toISOString().slice(0, 10)),
    db.prepare("DELETE FROM product_events WHERE created_at < unixepoch() - (45 * 86400)"),
  ]);
};

app.use("*", requestId());
app.use("*", securityHeaders);
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  await next();
});

app.get("/", (c) => {
  c.header("Cache-Control", "public, max-age=300, s-maxage=86400");
  return c.html(<HomePage />);
});
app.get("/guide", (c) => {
  c.header("Cache-Control", "public, max-age=300, s-maxage=86400");
  return c.html(<GuidePage />);
});
app.get("/privacy", (c) => {
  c.header("Cache-Control", "public, max-age=300, s-maxage=86400");
  return c.html(<PrivacyPage />);
});
app.get("/p/:id", async (c) => {
  const boxId = c.req.param("id");
  if (!idPattern.test(boxId)) return c.html(<NotFoundPage />, 404);
  const box = await getBox(c.env.DB, boxId);
  if (!box || box.status !== "open") return c.html(<NotFoundPage />, 404);
  noStore(c);
  return c.html(<ReactionPage boxId={box.id} pageTitle={box.page_title} />);
});
app.get("/manage/:id", async (c) => {
  const boxId = c.req.param("id");
  if (!idPattern.test(boxId)) return c.html(<NotFoundPage />, 404);
  const box = await getBox(c.env.DB, boxId);
  if (!box) return c.html(<NotFoundPage />, 404);
  noStore(c);
  return c.html(<ManagePage boxId={box.id} />);
});

app.post("/api/boxes", async (c) => {
  enforceSameOrigin(c);
  const payload = await parseJson(c, 4096);
  if (!payload || typeof payload !== "object") throw new ApiError("invalid_box", 400);
  const source = payload as Record<string, unknown>;
  const sessionId = typeof source.sessionId === "string" ? source.sessionId : "";
  const siteTitle = cleanText(source.siteTitle, 60);
  const pageTitle = cleanText(source.pageTitle, 80);
  const sourceUrl = parseSourceUrl(source.sourceUrl);
  const thankYou = cleanText(source.thankYou, 120);
  const website = cleanText(source.website, 100);
  if (
    !browserSessionPattern.test(sessionId) ||
    !siteTitle ||
    !pageTitle ||
    source.ownership !== true ||
    website ||
    blockedLinkPattern.test(thankYou)
  ) {
    throw new ApiError("invalid_box", 400);
  }
  if (!isAutomatedQa(c)) {
    const recent = await c.env.DB.prepare(
      `SELECT COUNT(*) AS count FROM boxes
       WHERE creator_session_id = ? AND created_at > unixepoch() - 86400`,
    )
      .bind(sessionId)
      .first<{ count: number }>();
    if (Number(recent?.count ?? 0) >= 10) throw new ApiError("rate_limited", 429);
  }
  const boxId = randomHex(16);
  const ownerToken = randomHex(32);
  await c.env.DB.prepare(
    `INSERT INTO boxes (
      id, owner_token_hash, creator_session_id, site_title, page_title,
      source_url, thank_you, status, created_at, updated_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', unixepoch(), unixepoch(), unixepoch() + (180 * 86400))`,
  )
    .bind(boxId, await sha256(ownerToken), sessionId, siteTitle, pageTitle, sourceUrl, thankYou)
    .run();
  if (!isAutomatedQa(c)) await recordEvent(c.env.DB, sessionId, "box_created", boxId);
  const origin = new URL(c.req.url).origin;
  return c.json(
    {
      boxId,
      manageUrl: `${origin}/manage/${boxId}#owner=${ownerToken}`,
      ownerToken,
      publicUrl: `${origin}/p/${boxId}`,
    },
    201,
  );
});

app.get("/api/boxes/:id", async (c) => {
  const boxId = c.req.param("id");
  if (!idPattern.test(boxId)) throw new ApiError("not_found", 404);
  const box = await getBox(c.env.DB, boxId);
  if (!box || box.status !== "open") throw new ApiError("not_found", 404);
  return c.json(await publicBox(c.env.DB, box));
});

app.post("/api/boxes/:id/reactions", async (c) => {
  enforceSameOrigin(c);
  const boxId = c.req.param("id");
  if (!idPattern.test(boxId)) throw new ApiError("not_found", 404);
  const box = await getBox(c.env.DB, boxId);
  if (!box || box.status !== "open") throw new ApiError("not_found", 404);
  const payload = await parseJson(c, 1024);
  if (!payload || typeof payload !== "object") throw new ApiError("invalid_reaction", 400);
  const source = payload as Record<string, unknown>;
  const sessionId = typeof source.sessionId === "string" ? source.sessionId : "";
  const kind = typeof source.kind === "string" ? (source.kind as ReactionKind) : "clap";
  const website = cleanText(source.website, 100);
  if (!browserSessionPattern.test(sessionId) || !reactionKinds.has(kind) || website) {
    throw new ApiError("invalid_reaction", 400);
  }
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const capacity = await c.env.DB.prepare(
    `SELECT
      COUNT(*) AS total,
      COUNT(CASE WHEN session_id = ? AND occurred_on = ? THEN 1 END) AS own
     FROM reactions WHERE box_id = ?`,
  )
    .bind(sessionId, today, boxId)
    .first<{ own: number; total: number }>();
  if (Number(capacity?.total ?? 0) >= 5000 && Number(capacity?.own ?? 0) === 0) {
    throw new ApiError("box_full", 429);
  }
  await c.env.DB.prepare(
    `INSERT INTO reactions
      (box_id, session_id, kind, occurred_on, created_at, updated_at)
     VALUES (?, ?, ?, ?, unixepoch(), unixepoch())
     ON CONFLICT(box_id, session_id, occurred_on)
     DO UPDATE SET kind = excluded.kind, updated_at = unixepoch()`,
  )
    .bind(boxId, sessionId, kind, today)
    .run();
  if (!isAutomatedQa(c)) await recordEvent(c.env.DB, sessionId, "reaction_saved", boxId);
  return c.json({ saved: true, summary: await getAggregates(c.env.DB, boxId) });
});

app.get("/api/boxes/:id/manage", async (c) => {
  const boxId = c.req.param("id");
  if (!idPattern.test(boxId)) throw new ApiError("access_denied", 403);
  const box = await requireOwner(c, boxId);
  const days = await c.env.DB.prepare(
    `SELECT occurred_on AS day, COUNT(*) AS count
     FROM reactions
     WHERE box_id = ? AND created_at > unixepoch() - (30 * 86400)
     GROUP BY occurred_on ORDER BY occurred_on`,
  )
    .bind(boxId)
    .all<{ count: number; day: string }>();
  return c.json({
    ...(await publicBox(c.env.DB, box)),
    days: days.results.map((row) => ({ count: Number(row.count), day: row.day })),
  });
});

app.delete("/api/boxes/:id", async (c) => {
  enforceSameOrigin(c);
  const boxId = c.req.param("id");
  if (!idPattern.test(boxId)) throw new ApiError("access_denied", 403);
  await requireOwner(c, boxId);
  await c.env.DB.prepare("DELETE FROM boxes WHERE id = ?").bind(boxId).run();
  return c.body(null, 204);
});

app.post("/api/boxes/:id/report", async (c) => {
  enforceSameOrigin(c);
  const boxId = c.req.param("id");
  if (!idPattern.test(boxId)) throw new ApiError("not_found", 404);
  const box = await getBox(c.env.DB, boxId);
  if (!box || box.status !== "open") throw new ApiError("not_found", 404);
  const payload = await parseJson(c, 1024);
  if (!payload || typeof payload !== "object") throw new ApiError("invalid_report", 400);
  const source = payload as Record<string, unknown>;
  const sessionId = typeof source.sessionId === "string" ? source.sessionId : "";
  const reason = typeof source.reason === "string" ? source.reason : "";
  if (!browserSessionPattern.test(sessionId) || !reportReasons.has(reason)) {
    throw new ApiError("invalid_report", 400);
  }
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO reports (box_id, reporter_session_id, reason, created_at)
     VALUES (?, ?, ?, unixepoch())`,
  )
    .bind(boxId, sessionId, reason)
    .run();
  const reports = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM reports WHERE box_id = ?")
    .bind(boxId)
    .first<{ count: number }>();
  if (Number(reports?.count ?? 0) >= 3) {
    await c.env.DB.prepare(
      "UPDATE boxes SET status = 'hidden', updated_at = unixepoch() WHERE id = ?",
    )
      .bind(boxId)
      .run();
  }
  return c.json({ received: true });
});

app.post("/api/telemetry", async (c) => {
  enforceSameOrigin(c);
  if (isAutomatedQa(c)) return c.body(null, 204);
  const payload = await parseJson(c, 1024);
  if (!payload || typeof payload !== "object") throw new ApiError("invalid_telemetry", 400);
  const source = payload as Record<string, unknown>;
  const sessionId = typeof source.sessionId === "string" ? source.sessionId : "";
  const name = typeof source.name === "string" ? source.name : "";
  const context = cleanText(source.context, 32);
  if (
    !browserSessionPattern.test(sessionId) ||
    !telemetryNames.has(name) ||
    (context !== "" && context !== "home" && !idPattern.test(context))
  ) {
    throw new ApiError("invalid_telemetry", 400);
  }
  await recordEvent(c.env.DB, sessionId, name, context);
  return c.body(null, 204);
});

app.get("/healthz", (c) =>
  c.json({ healthy: true, service: "pon-hakushu", time: new Date().toISOString() }),
);

app.notFound((c) => {
  if (c.req.method === "GET" && !c.req.path.startsWith("/api/")) {
    return c.html(<NotFoundPage />, 404);
  }
  return c.json({ error: "not_found", requestId: c.get("requestId") }, 404);
});

app.onError((error, c) => {
  if (error instanceof ApiError) {
    return c.json({ error: error.code, requestId: c.get("requestId") }, error.status);
  }
  console.error(
    JSON.stringify({
      event: "request_failed",
      message: error.message,
      requestId: c.get("requestId"),
    }),
  );
  return c.json({ error: "internal_error", requestId: c.get("requestId") }, 500);
});

export { app };
export default {
  fetch: app.fetch,
  scheduled(_controller: ScheduledController, env: Bindings, context: ExecutionContext) {
    context.waitUntil(cleanup(env.DB));
  },
};

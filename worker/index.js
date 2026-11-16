const cookieName = "qxd-article-reader";
const articlePattern = /^[\p{L}\p{N}][\p{L}\p{N}_-]{0,159}$/u;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const initializedDatabases = new WeakMap();

const schema = `CREATE TABLE IF NOT EXISTS article_stars (
  article_id TEXT NOT NULL,
  reader_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (article_id, reader_id)
) WITHOUT ROWID`;

function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function readerFrom(request) {
  const cookies = request.headers.get("Cookie") ?? "";
  const value = cookies
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  return value && uuidPattern.test(value) ? value : null;
}

function stateQuery(db, articleId, readerId) {
  return db
    .prepare(
      `SELECT COUNT(*) AS count,
       COALESCE(MAX(reader_id = ?), 0) AS starred
       FROM article_stars WHERE article_id = ?`,
    )
    .bind(readerId ?? "", articleId);
}

async function ensureSchema(db) {
  if (!initializedDatabases.has(db)) {
    const ready = db
      .prepare(schema)
      .run()
      .catch((error) => {
        initializedDatabases.delete(db);
        throw error;
      });
    initializedDatabases.set(db, ready);
  }
  await initializedDatabases.get(db);
}

async function stars(request, env, articleId) {
  const url = new URL(request.url);
  if (!articlePattern.test(articleId))
    return json({ error: "Invalid article" }, 400);

  if (request.method !== "GET" && request.method !== "PUT") {
    return json({ error: "Method not allowed" }, 405, { Allow: "GET, PUT" });
  }

  let desired;
  if (request.method === "PUT") {
    if (request.headers.get("Origin") !== url.origin) {
      return json({ error: "Origin not allowed" }, 403);
    }
    if (!request.headers.get("Content-Type")?.startsWith("application/json")) {
      return json({ error: "Expected JSON" }, 415);
    }
    if (Number(request.headers.get("Content-Length")) > 256) {
      return json({ error: "Request too large" }, 413);
    }
    const body = await request.text();
    if (body.length > 256) return json({ error: "Request too large" }, 413);
    try {
      desired = JSON.parse(body)?.starred;
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    if (typeof desired !== "boolean") {
      return json({ error: "Expected a starred boolean" }, 400);
    }
  }

  const article = await env.ASSETS.fetch(
    new Request(new URL(`/writing/${encodeURIComponent(articleId)}/`, url), {
      method: "HEAD",
    }),
  );
  if (article.status !== 200) return json({ error: "Article not found" }, 404);
  if (!env.STARS_DB)
    return json({ error: "Stars are not configured yet" }, 503);

  await ensureSchema(env.STARS_DB);
  let readerId = readerFrom(request);
  const headers = {};
  let row;

  if (request.method === "PUT") {
    if (!readerId) {
      readerId = crypto.randomUUID();
      headers["Set-Cookie"] =
        `${cookieName}=${readerId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${url.protocol === "https:" ? "; Secure" : ""}`;
    }

    const mutation = desired
      ? env.STARS_DB.prepare(
          "INSERT INTO article_stars (article_id, reader_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
        ).bind(articleId, readerId)
      : env.STARS_DB.prepare(
          "DELETE FROM article_stars WHERE article_id = ? AND reader_id = ?",
        ).bind(articleId, readerId);

    const result = await env.STARS_DB.batch([
      mutation,
      stateQuery(env.STARS_DB, articleId, readerId),
    ]);
    row = result[1].results[0];
  } else {
    row = await stateQuery(env.STARS_DB, articleId, readerId).first();
  }

  return json(
    { count: row.count, starred: Boolean(row.starred) },
    200,
    headers,
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    const match = url.pathname.match(/^\/api\/stars\/([^/]+)\/?$/);
    if (!match) return json({ error: "Not found" }, 404);

    try {
      return await stars(request, env, decodeURIComponent(match[1]));
    } catch (error) {
      if (error instanceof URIError)
        return json({ error: "Invalid article" }, 400);
      console.error("Article stars request failed", error);
      return json({ error: "Stars are temporarily unavailable" }, 503);
    }
  },
};

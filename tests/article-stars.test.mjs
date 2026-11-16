import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import worker from "../worker/index.js";

// Exercise the Worker against real SQLite, using D1's prepared-statement shape.
class LocalD1 {
  database = new DatabaseSync(":memory:");

  prepare(sql) {
    const database = this.database;
    let values = [];
    const statement = {
      bind(...args) {
        values = args;
        return statement;
      },
      execute() {
        const query = database.prepare(sql);
        return {
          success: true,
          results: query.columns().length ? query.all(...values) : [],
          ...(!query.columns().length ? { meta: query.run(...values) } : {}),
        };
      },
      async run() {
        return statement.execute();
      },
      async first() {
        return database.prepare(sql).get(...values) ?? null;
      },
    };
    return statement;
  }

  async batch(statements) {
    this.database.exec("BEGIN");
    try {
      const result = statements.map((statement) => statement.execute());
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

function fixture(t) {
  const db = new LocalD1();
  t.after(() => db.database.close());
  const env = {
    STARS_DB: db,
    ASSETS: {
      async fetch(request) {
        const path = new URL(request.url).pathname;
        return new Response(request.method === "HEAD" ? null : "site content", {
          status: ["/", "/writing/first/", "/writing/second/"].includes(path)
            ? 200
            : 404,
        });
      },
    },
  };

  return {
    env,
    async request(path = "/api/stars/first", options = {}) {
      return worker.fetch(
        new Request(`https://example.com${path}`, options),
        env,
      );
    },
    async put(starred, cookie, id = "first") {
      const response = await worker.fetch(
        new Request(`https://example.com/api/stars/${id}`, {
          method: "PUT",
          headers: {
            Origin: "https://example.com",
            "Content-Type": "application/json",
            ...(cookie ? { Cookie: cookie } : {}),
          },
          body: JSON.stringify({ starred }),
        }),
        env,
      );
      return {
        response,
        body: await response.json(),
        cookie: response.headers.get("Set-Cookie")?.split(";")[0] ?? cookie,
      };
    },
  };
}

test("shared totals persist across readers; starring is idempotent and reversible", async (t) => {
  const app = fixture(t);
  const empty = await app.request();
  assert.deepEqual(await empty.json(), { count: 0, starred: false });
  assert.equal(empty.headers.get("Set-Cookie"), null);
  assert.equal(empty.headers.get("Cache-Control"), "no-store");

  const first = await app.put(true);
  assert.equal(first.response.status, 200);
  assert.deepEqual(first.body, { count: 1, starred: true });
  assert.match(
    first.response.headers.get("Set-Cookie"),
    /HttpOnly; SameSite=Lax/,
  );
  assert.match(first.response.headers.get("Set-Cookie"), /; Secure/);

  assert.deepEqual((await app.put(true, first.cookie)).body, {
    count: 1,
    starred: true,
  });
  const second = await app.put(true);
  assert.deepEqual(second.body, { count: 2, starred: true });

  const returning = await app.request(undefined, {
    headers: { Cookie: first.cookie },
  });
  assert.deepEqual(await returning.json(), { count: 2, starred: true });
  assert.deepEqual((await app.put(false, first.cookie)).body, {
    count: 1,
    starred: false,
  });
  assert.deepEqual((await app.put(false, first.cookie)).body, {
    count: 1,
    starred: false,
  });
  assert.deepEqual(await (await app.request("/api/stars/second")).json(), {
    count: 0,
    starred: false,
  });
  assert.deepEqual((await app.put(true, second.cookie, "second")).body, {
    count: 1,
    starred: true,
  });
});

test("rejects cross-origin writes, invalid input, and nonexistent articles", async (t) => {
  const app = fixture(t);
  const put = {
    method: "PUT",
    headers: {
      Origin: "https://other.example",
      "Content-Type": "application/json",
    },
    body: '{"starred":true}',
  };
  assert.equal((await app.request(undefined, put)).status, 403);
  assert.equal(
    (await app.put(true, undefined, "missing")).response.status,
    404,
  );
  assert.equal((await app.request("/api/stars/%2Fprivate")).status, 400);
  assert.equal((await app.request("/api/stars/%E0%A4%A")).status, 400);
  assert.equal(
    (await app.request(undefined, { method: "DELETE" })).status,
    405,
  );
  assert.equal((await app.request("/api/unknown")).status, 404);

  put.headers.Origin = "https://example.com";
  put.body = "invalid json";
  assert.equal((await app.request(undefined, put)).status, 400);
  put.body = '{"starred":1}';
  assert.equal((await app.request(undefined, put)).status, 400);
  put.body = " ".repeat(257);
  assert.equal((await app.request(undefined, put)).status, 413);
  put.headers["Content-Type"] = "text/plain";
  assert.equal((await app.request(undefined, put)).status, 415);
  assert.deepEqual(await (await app.request()).json(), {
    count: 0,
    starred: false,
  });
});

test("missing storage gives an explicit service error; site pages still load", async (t) => {
  const app = fixture(t);
  delete app.env.STARS_DB;
  assert.equal((await app.request()).status, 503);
  const home = await app.request("/");
  assert.equal(home.status, 200);
  assert.equal(await home.text(), "site content");
});

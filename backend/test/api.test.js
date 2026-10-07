import { test, before, after } from "node:test";
import assert from "node:assert/strict";

// env.js eksik anahtarda süreci kapatır; testler gerçek servislere bağlanmaz, sahte değerler yeterli
process.env.DATABASE_URL ??= "postgresql://user:pass@localhost/db";
process.env.CLERK_PUBLISHABLE_KEY ??= "pk_test_Y2xlcmsuZXhhbXBsZS5jb20k";
process.env.CLERK_SECRET_KEY ??= "sk_test_dummy";

let server;
let base;

before(async () => {
  const { default: app } = await import("../src/app.js");
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

test("health herkese açık", async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { success: true });
});

test("token'sız tüm favori/hesap uçları 401 döner", async () => {
  const calls = [
    ["GET", "/api/favorites"],
    ["POST", "/api/favorites"],
    ["DELETE", "/api/favorites/123"],
    ["DELETE", "/api/account"],
  ];
  for (const [method, path] of calls) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify({ recipeId: 1, title: "x" }) : undefined,
    });
    assert.equal(res.status, 401, `${method} ${path}`);
  }
});

test("sahte token reddedilir", async () => {
  const res = await fetch(`${base}/api/favorites`, {
    headers: { Authorization: "Bearer not-a-real-token" },
  });
  assert.equal(res.status, 401);
});

test("body'deki userId ile başkası adına işlem yapılamaz", async () => {
  const res = await fetch(`${base}/api/favorites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "someone-else", recipeId: 1, title: "x" }),
  });
  assert.equal(res.status, 401);
});

test("eski userId'li URL'ler artık yok", async () => {
  const res = await fetch(`${base}/api/favorites/some-user-id`);
  assert.notEqual(res.status, 200);
});

test("bilinmeyen yol JSON 404 döner", async () => {
  const res = await fetch(`${base}/api/nope`);
  assert.equal(res.status, 404);
});

test("güvenlik başlıkları ayarlı, x-powered-by yok", async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.headers.get("x-powered-by"), null);
  assert.ok(res.headers.get("x-content-type-options"));
});

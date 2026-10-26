import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../server/worker.js";
test("Unconfigured deployment keeps the public shop available and admin protected", async () => {
  const env = {
    ASSETS: {
      fetch: async () =>
        new Response('[{"id":1}]', {
          headers: { "Content-Type": "application/json" },
        }),
    },
  };
  const request = (path) => new Request("https://store.example" + path);
  let response = await worker.fetch(request("/api/products"), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [{ id: 1 }]);
  response = await worker.fetch(request("/api/store"), env);
  assert.equal((await response.json()).ordersEnabled, false);
  response = await worker.fetch(request("/api/admin/session"), env);
  assert.deepEqual(await response.json(), {
    authenticated: false,
    configured: false,
  });
  response = await worker.fetch(request("/api/admin/data"), env);
  assert.equal(response.status, 401);
  response = await worker.fetch(
    new Request("https://store.example/api/admin/login", {
      method: "POST",
      headers: {
        Origin: "https://store.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: "not-a-production-password" }),
    }),
    env,
  );
  assert.equal(response.status, 503);
});

import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
const root = resolve(import.meta.dirname, "..");
const work = await mkdtemp(join(tmpdir(), "decanteassil-test-"));
const credentials = {
  ADMIN_PASSWORD: randomBytes(24).toString("hex"),
  SESSION_SECRET: randomBytes(48).toString("hex"),
};
const base = "http://127.0.0.1:8791";
await writeFile(
  join(work, ".dev.vars"),
  Object.entries(credentials)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n"),
  { mode: 0o600 },
);
await writeFile(join(work, "credentials.json"), JSON.stringify(credentials), {
  mode: 0o600,
});
await writeFile(
  join(work, "wrangler.json"),
  JSON.stringify({
    name: "decanteassil-tests",
    main: join(root, "server/worker.js"),
    compatibility_date: "2026-10-23",
    assets: {
      directory: join(root, "dist"),
      binding: "ASSETS",
      run_worker_first: ["/api/*", "/admin", "/admin/*"],
    },
    d1_databases: [{ binding: "DB", database_name: "isolated-tests" }],
  }),
);
let server,
  output = "";
try {
  // Simulate the existing 12-product deployment, including a merchant edit.
  const original = JSON.parse(
    await readFile(join(root, "public/catalog.json"), "utf8"),
  ).filter((p) => p.type !== "oud");
  const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
  const legacySQL =
    "CREATE TABLE settings (key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE products (id TEXT PRIMARY KEY,data TEXT NOT NULL); INSERT INTO settings(key,value) VALUES ('initialized','1');\n" +
    original
      .map((p) => {
        const record = { ...p, id: String(p.id), active: true, inStock: true };
        if (record.id === "2") record.tag = "Existing merchant edit";
        return `INSERT INTO products(id,data) VALUES (${quote(record.id)},${quote(JSON.stringify(record))});`;
      })
      .join("\n");
  await writeFile(join(work, "legacy.sql"), legacySQL);
  const prep = spawn(
    process.execPath,
    [
      join(root, "node_modules/wrangler/bin/wrangler.js"),
      "d1",
      "execute",
      "DB",
      "--local",
      "--file",
      join(work, "legacy.sql"),
      "--persist-to",
      join(work, "state"),
    ],
    {
      cwd: work,
      env: {
        ...process.env,
        XDG_CONFIG_HOME: join(work, "config"),
        WRANGLER_LOG_PATH: join(work, "seed.log"),
        WRANGLER_SEND_METRICS: "false",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  prep.stdout.on("data", (b) => (output += b.toString()));
  prep.stderr.on("data", (b) => (output += b.toString()));
  const prepared = await new Promise((res, rej) => {
    prep.on("error", rej);
    prep.on("exit", res);
  });
  if (prepared !== 0) throw Error("Could not prepare legacy database fixture.");
  server = spawn(
    process.execPath,
    [
      join(root, "node_modules/wrangler/bin/wrangler.js"),
      "dev",
      "--local",
      "--port",
      "8791",
      "--persist-to",
      join(work, "state"),
    ],
    {
      cwd: work,
      env: {
        ...process.env,
        XDG_CONFIG_HOME: join(work, "config"),
        WRANGLER_LOG_PATH: join(work, "wrangler.log"),
        WRANGLER_SEND_METRICS: "false",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (b) => (output += b.toString()));
  server.stderr.on("data", (b) => (output += b.toString()));
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null)
      throw Error("Local Worker exited before startup.");
    try {
      const r = await fetch(base + "/api/admin/session");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(500);
  }
  if (!ready) throw Error("Timed out starting the isolated Worker.");
  const child = spawn(
    process.execPath,
    [join(root, "tests/api.integration.cjs")],
    {
      cwd: root,
      env: {
        ...process.env,
        DA_TEST_BASE_URL: base,
        DA_TEST_CREDENTIALS_FILE: join(work, "credentials.json"),
      },
      stdio: "inherit",
    },
  );
  const code = await new Promise((res, rej) => {
    child.on("error", rej);
    child.on("exit", res);
  });
  if (code !== 0) throw Error("Integration checks failed.");
} catch (e) {
  console.error(e.message);
  if (!server || server.exitCode !== null)
    console.error(
      output.replace(
        /ADMIN_PASSWORD[^\n]*|SESSION_SECRET[^\n]*/g,
        "[local secret redacted]",
      ),
    );
  process.exitCode = 1;
} finally {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([
      new Promise((r) => server.once("exit", r)),
      delay(3000),
    ]);
    if (server.exitCode === null) server.kill("SIGKILL");
  }
  await rm(work, { recursive: true, force: true });
}

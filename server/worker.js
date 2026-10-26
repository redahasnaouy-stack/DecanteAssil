import { deliveryFee } from "../shared/delivery.js";
const COOKIE = "da_admin";
const SESSION_MS = 8 * 60 * 60 * 1000;
const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const encoder = new TextEncoder();
const DEFAULT_SETTINGS = {
  instagram: "https://www.instagram.com/elabbari10/",
  whatsapp: "393509071813",
};
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}
function check(ok, message, status = 400) {
  if (!ok) throw new HttpError(status, message);
}
function text(value, name, max = 150, required = true) {
  check(
    typeof value === "string" &&
      value.length <= max &&
      (!required || value.trim().length),
    `${name} invalide.`,
  );
  return value.trim();
}
function amount(value, name) {
  check(
    typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 1 &&
      value <= 100000,
    `${name} invalide.`,
  );
  return Math.round(value * 100) / 100;
}
async function body(request, limit = 24000) {
  check(
    Number(request.headers.get("content-length") || 0) <= limit,
    "Fichier trop volumineux.",
    413,
  );
  const content = await request.text();
  check(
    encoder.encode(content).length <= limit,
    "Requête trop volumineuse.",
    413,
  );
  try {
    return JSON.parse(content);
  } catch {
    throw new HttpError(400, "JSON invalide.");
  }
}
function originCheck(request) {
  check(
    request.headers.get("Origin") === new URL(request.url).origin,
    "Origine non autorisée.",
    403,
  );
}
async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
  );
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
function same(a, b) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
function configured(env) {
  return !!(
    env.DB &&
    env.ADMIN_PASSWORD?.length >= 12 &&
    env.SESSION_SECRET?.length >= 32
  );
}
function cookieOptions(request) {
  return `Path=/api/admin; HttpOnly; SameSite=Strict${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
function sessionKey(env) {
  return env.SESSION_SECRET + ":" + env.ADMIN_PASSWORD;
}
async function authorized(request, env) {
  if (!configured(env)) return false;
  const value = (request.headers.get("Cookie") || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(COOKIE + "="))
    ?.slice(COOKIE.length + 1);
  if (!value) return false;
  const [expires, nonce, signature, ...extra] = value.split(".");
  if (
    extra.length ||
    !/^\d+$/.test(expires) ||
    !/^[a-f0-9-]{36}$/.test(nonce || "") ||
    !/^[a-f0-9]{64}$/.test(signature || "") ||
    Number(expires) < Date.now() ||
    Number(expires) > Date.now() + SESSION_MS
  )
    return false;
  return same(signature, await sign(`${expires}.${nonce}`, sessionKey(env)));
}
const ready = new WeakMap();
async function initialize(env, request) {
  if (!env.DB) return;
  if (!ready.has(env.DB)) {
    const task = (async () => {
      await env.DB.exec(
        "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY,data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY,request_key TEXT UNIQUE NOT NULL,fingerprint TEXT NOT NULL,created_at TEXT NOT NULL,status TEXT NOT NULL,data TEXT NOT NULL); CREATE INDEX IF NOT EXISTS orders_created ON orders(created_at); CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY,mime TEXT NOT NULL,data BLOB NOT NULL);",
      );
      const initialized = await env.DB.prepare(
        "SELECT value FROM settings WHERE key='initialized'",
      ).first();
      if (!initialized) {
        const response = await env.ASSETS.fetch(
          new URL("/catalog.json", request.url),
        );
        check(response.ok, "Catalogue initial indisponible.", 503);
        const catalog = await response.json();
        await env.DB.batch([
          ...catalog.map((p) =>
            env.DB.prepare(
              "INSERT OR IGNORE INTO products(id,data) VALUES (?,?)",
            ).bind(
              String(p.id),
              JSON.stringify({
                ...p,
                id: String(p.id),
                active: true,
                inStock: true,
              }),
            ),
          ),
          env.DB.prepare(
            "INSERT OR IGNORE INTO settings(key,value) VALUES ('store',?)",
          ).bind(JSON.stringify(DEFAULT_SETTINGS)),
          env.DB.prepare(
            "INSERT OR IGNORE INTO settings(key,value) VALUES ('initialized','1')",
          ),
        ]);
      }
    })();
    ready.set(env.DB, task);
    task.catch(() => ready.delete(env.DB));
  }
  await ready.get(env.DB);
}
async function settings(env) {
  if (!env.DB) return DEFAULT_SETTINGS;
  const row = await env.DB.prepare(
    "SELECT value FROM settings WHERE key='store'",
  ).first();
  return { ...DEFAULT_SETTINGS, ...JSON.parse(row?.value || "{}") };
}
async function allProducts(env) {
  const result = await env.DB.prepare(
    "SELECT data FROM products ORDER BY rowid",
  ).all();
  return result.results.map((row) => JSON.parse(row.data));
}
async function rate(request, env, namespace, max, duration) {
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const bucket = Math.floor(Date.now() / duration);
  const key =
    namespace +
    ":" +
    (await sign(
      ip + ":" + bucket,
      env.SESSION_SECRET || "local-public-order-limits",
    ));
  const row = await env.DB.prepare(
    "INSERT INTO limits(key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
  )
    .bind(key, Date.now() + duration)
    .first();
  check(
    row.count <= max,
    "Trop de tentatives. Veuillez réessayer plus tard.",
    429,
  );
  await env.DB.prepare("DELETE FROM limits WHERE expires < ?")
    .bind(Date.now())
    .run();
}
function productInput(data, id) {
  const p = {
    id,
    name: text(data.name, "Nom", 100),
    brand: text(data.brand, "Marque", 100),
    notes: text(data.notes || "", "Notes", 250, false),
    description: text(data.description || "", "Description", 1200, false),
    tag: text(data.tag || "", "Badge", 40, false),
    type: data.type,
    gender: data.gender,
    image: text(data.image, "Image", 2000),
    price: amount(data.price, "Prix"),
    active: data.active !== false,
    inStock: data.inStock !== false,
  };
  check(
    ["decant", "full", "niche"].includes(p.type) &&
      ["homme", "femme", "mixte"].includes(p.gender),
    "Catégorie invalide.",
  );
  check(
    /^\/products\/[\w.-]+$/.test(p.image) ||
      /^\/api\/media\/[a-f0-9-]+$/.test(p.image) ||
      /^https:\/\/[^\s]+$/.test(p.image),
    "Utilisez une image HTTPS ou un fichier du catalogue.",
  );
  if (
    data.fullPrice !== undefined &&
    data.fullPrice !== null &&
    data.fullPrice !== ""
  )
    p.fullPrice = amount(data.fullPrice, "Prix flacon");
  return p;
}
function selectedPrice(p, size) {
  if (p.type === "full") {
    check(size === "Flacon complet", "Format indisponible.");
    return p.price;
  }
  if (size === "Flacon complet") {
    check(!!p.fullPrice, "Flacon complet indisponible.");
    return p.fullPrice;
  }
  check(["5 ml", "10 ml"].includes(size), "Format invalide.");
  return size === "5 ml" ? Math.round(p.price * 0.58) : p.price;
}
async function createOrder(request, env) {
  check(env.DB, "Le suivi des commandes est en cours de configuration.", 503);
  const input = await body(request);
  check(!input.website, "Demande non valide.");
  const requestKey = text(input.requestKey, "Référence", 60);
  check(/^[a-f0-9-]{36}$/.test(requestKey), "Référence invalide.");
  const customer = {
    name: text(input.name, "Nom", 100),
    phone: text(input.phone, "Téléphone", 20),
    city: text(input.city, "Ville", 100),
    address: text(input.address, "Adresse", 500),
  };
  check(/^[+\d\s().-]{8,20}$/.test(customer.phone), "Téléphone invalide.");
  check(
    Array.isArray(input.items) &&
      input.items.length > 0 &&
      input.items.length <= 50,
    "Panier invalide.",
  );
  const fingerprint = await sign(
    JSON.stringify({ customer, items: input.items }),
    env.SESSION_SECRET || "order-idempotency",
  );
  const existing = await env.DB.prepare(
    "SELECT id,data,fingerprint FROM orders WHERE request_key=?",
  )
    .bind(requestKey)
    .first();
  if (existing) {
    check(
      same(existing.fingerprint, fingerprint),
      "Référence déjà utilisée pour une autre commande.",
      409,
    );
    return json({ id: existing.id, ...JSON.parse(existing.data) });
  }
  await rate(request, env, "orders", 8, 10 * 60 * 1000);
  const catalog = await allProducts(env);
  const items = input.items.map((item) => {
    const p = catalog.find((p) => p.id === String(item.id));
    check(
      p && p.active && p.inStock,
      "Un produit est indisponible. Actualisez le catalogue.",
      409,
    );
    check(
      Number.isInteger(item.qty) && item.qty >= 1 && item.qty <= 30,
      "Quantité invalide.",
    );
    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      size: item.size,
      qty: item.qty,
      price: selectedPrice(p, item.size),
    };
  });
  const data = {
    customer,
    items,
    total:
      Math.round(items.reduce((n, p) => n + p.price * p.qty, 0) * 100) / 100,
  };
  data.shippingFee = deliveryFee(customer.city);
  data.grandTotal = Math.round((data.total + data.shippingFee) * 100) / 100;
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(
      "INSERT INTO orders(id,request_key,fingerprint,created_at,status,data) VALUES (?,?,?,?,'pending',?)",
    )
      .bind(
        id,
        requestKey,
        fingerprint,
        new Date().toISOString(),
        JSON.stringify(data),
      )
      .run();
  } catch (err) {
    const raced = await env.DB.prepare(
      "SELECT id,data,fingerprint FROM orders WHERE request_key=?",
    )
      .bind(requestKey)
      .first();
    if (!raced) throw err;
    check(
      same(raced.fingerprint, fingerprint),
      "Référence déjà utilisée pour une autre commande.",
      409,
    );
    return json({ id: raced.id, ...JSON.parse(raced.data) });
  }
  return json({ id, ...data }, 201);
}
async function api(request, env, path) {
  if (request.method !== "GET" && request.method !== "HEAD")
    originCheck(request);
  await initialize(env, request);
  if (path === "/api/store" && request.method === "GET")
    return json({ settings: await settings(env), ordersEnabled: !!env.DB });
  if (path === "/api/products" && request.method === "GET") {
    if (!env.DB) return env.ASSETS.fetch(new URL("/catalog.json", request.url));
    return json((await allProducts(env)).filter((p) => p.active));
  }
  if (path.startsWith("/api/media/") && request.method === "GET") {
    check(env.DB, "Image indisponible.", 404);
    const item = await env.DB.prepare("SELECT mime,data FROM media WHERE id=?")
      .bind(path.split("/").at(-1))
      .first();
    check(item, "Image introuvable.", 404);
    return new Response(new Uint8Array(item.data), {
      headers: {
        "Content-Type": item.mime,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  if (path === "/api/orders" && request.method === "POST")
    return createOrder(request, env);
  if (path === "/api/admin/session" && request.method === "GET")
    return json({
      authenticated: await authorized(request, env),
      configured: configured(env),
    });
  if (path === "/api/admin/login" && request.method === "POST") {
    check(
      configured(env),
      "Ajoutez la base D1, ADMIN_PASSWORD (12 caractères minimum) et SESSION_SECRET (32 caractères minimum) dans Cloudflare.",
      503,
    );
    await rate(request, env, "login", 6, 15 * 60 * 1000);
    const input = await body(request, 2000);
    check(
      typeof input.password === "string" && input.password.length <= 512,
      "Identifiants incorrects.",
      401,
    );
    check(
      same(
        await sign(input.password, env.SESSION_SECRET),
        await sign(env.ADMIN_PASSWORD, env.SESSION_SECRET),
      ),
      "Identifiants incorrects.",
      401,
    );
    const value = `${Date.now() + SESSION_MS}.${crypto.randomUUID()}`;
    return json({ ok: true }, 200, {
      "Set-Cookie": `${COOKIE}=${value}.${await sign(value, sessionKey(env))}; Max-Age=${SESSION_MS / 1000}; ${cookieOptions(request)}`,
    });
  }
  if (path === "/api/admin/logout" && request.method === "POST")
    return json({ ok: true }, 200, {
      "Set-Cookie": `${COOKIE}=; Max-Age=0; ${cookieOptions(request)}`,
    });
  check(path.startsWith("/api/admin/"), "Page introuvable.", 404);
  check(await authorized(request, env), "Connexion requise.", 401);
  if (path === "/api/admin/data" && request.method === "GET") {
    const orders = await env.DB.prepare(
      "SELECT id,created_at,status,data FROM orders ORDER BY created_at DESC LIMIT 1000",
    ).all();
    return json({
      products: await allProducts(env),
      settings: await settings(env),
      orders: orders.results.map((o) => ({
        id: o.id,
        createdAt: o.created_at,
        status: o.status,
        ...JSON.parse(o.data),
      })),
      limit: 1000,
    });
  }
  if (path === "/api/admin/products" && request.method === "POST") {
    const p = productInput(await body(request), crypto.randomUUID());
    await env.DB.prepare("INSERT INTO products(id,data) VALUES (?,?)")
      .bind(p.id, JSON.stringify(p))
      .run();
    return json(p, 201);
  }
  if (/^\/api\/admin\/products\/[^/]+$/.test(path)) {
    const id = path.split("/").at(-1);
    const exists = await env.DB.prepare("SELECT id FROM products WHERE id=?")
      .bind(id)
      .first();
    check(exists, "Produit introuvable.", 404);
    if (request.method === "PUT") {
      const p = productInput(await body(request), id);
      await env.DB.prepare("UPDATE products SET data=? WHERE id=?")
        .bind(JSON.stringify(p), id)
        .run();
      return json(p);
    }
    if (request.method === "DELETE") {
      await env.DB.prepare("DELETE FROM products WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if (
    /^\/api\/admin\/orders\/[^/]+$/.test(path) &&
    request.method === "PATCH"
  ) {
    const input = await body(request, 1000);
    check(STATUSES.includes(input.status), "Statut invalide.");
    const result = await env.DB.prepare("UPDATE orders SET status=? WHERE id=?")
      .bind(input.status, path.split("/").at(-1))
      .run();
    check(result.meta.changes, "Commande introuvable.", 404);
    return json({ ok: true });
  }
  if (path === "/api/admin/settings" && request.method === "PUT") {
    const input = await body(request, 3000);
    const next = {
      instagram: text(input.instagram || "", "Instagram", 250, false),
      whatsapp: text(input.whatsapp, "WhatsApp", 20),
    };
    if (next.instagram) {
      let url;
      try {
        url = new URL(next.instagram);
      } catch {}
      check(
        url &&
          url.protocol === "https:" &&
          ["instagram.com", "www.instagram.com"].includes(url.hostname) &&
          url.pathname !== "/" &&
          !url.username &&
          !url.password,
        "Lien Instagram invalide.",
      );
      next.instagram = url.origin + url.pathname;
    }
    check(
      /^\d{8,15}$/.test(next.whatsapp),
      "WhatsApp : chiffres uniquement, avec indicatif pays.",
    );
    await env.DB.prepare(
      "INSERT INTO settings(key,value) VALUES ('store',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    )
      .bind(JSON.stringify(next))
      .run();
    return json(next);
  }
  if (path === "/api/admin/media" && request.method === "POST") {
    const mime = request.headers.get("Content-Type");
    check(
      ["image/jpeg", "image/png", "image/webp"].includes(mime),
      "Format image non accepté.",
    );
    check(
      Number(request.headers.get("Content-Length") || 0) <= 524288,
      "Image trop volumineuse (512 Ko maximum).",
      413,
    );
    const buffer = await request.arrayBuffer();
    check(
      buffer.byteLength > 12 && buffer.byteLength <= 524288,
      "Image trop volumineuse (512 Ko maximum).",
      413,
    );
    const b = new Uint8Array(buffer);
    check(
      (mime === "image/jpeg" && b[0] === 255 && b[1] === 216 && b[2] === 255) ||
        (mime === "image/png" &&
          b[0] === 137 &&
          b[1] === 80 &&
          b[2] === 78 &&
          b[3] === 71) ||
        (mime === "image/webp" &&
          String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
          String.fromCharCode(...b.slice(8, 12)) === "WEBP"),
      "Contenu image invalide.",
    );
    const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO media(id,mime,data) VALUES (?,?,?)")
      .bind(id, mime, buffer)
      .run();
    return json({ url: "/api/media/" + id }, 201);
  }
  throw new HttpError(404, "Page introuvable.");
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await api(request, env, url.pathname);
      } catch (e) {
        if (!(e instanceof HttpError))
          console.error("API request failed:", e.name);
        return json(
          {
            error:
              e instanceof HttpError
                ? e.message
                : "Service momentanément indisponible.",
          },
          e.status || 500,
        );
      }
    }
    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      const asset = await env.ASSETS.fetch(new URL("/index.html", request.url));
      return new Response(asset.body, {
        status: asset.status,
        headers: {
          ...Object.fromEntries(asset.headers),
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow",
        },
      });
    }
    return env.ASSETS.fetch(request);
  },
};

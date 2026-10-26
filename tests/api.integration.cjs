const assert = require("node:assert/strict");
const fs = require("node:fs");
const crypto = require("node:crypto");
const base = process.env.DA_TEST_BASE_URL || "http://localhost:8791";
let cookie = "";
async function request(
  path,
  method = "GET",
  body,
  auth = false,
  origin = base,
  headers = {},
) {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(method !== "GET" ? { Origin: origin } : {}),
      ...(body && !Buffer.isBuffer(body)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(auth ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body
      ? Buffer.isBuffer(body)
        ? body
        : JSON.stringify(body)
      : undefined,
  });
  const data = (r.headers.get("content-type") || "").includes(
    "application/json",
  )
    ? await r.json()
    : await r.arrayBuffer();
  return { r, data };
}
(async () => {
  for (const path of ["/", "/admin"]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, `HTML route ${path}`);
    assert((await response.text()).includes('<div id="root"></div>'));
  }
  let x = await request("/api/admin/data");
  assert.equal(x.r.status, 401);
  x = await request("/api/admin/login", "POST", {
    password: "incorrectpassword",
  });
  assert.equal(x.r.status, 401);
  x = await request(
    "/api/admin/login",
    "POST",
    {},
    false,
    "https://other.example",
  );
  assert.equal(x.r.status, 403);
  let credentials = JSON.parse(
    fs.readFileSync(process.env.DA_TEST_CREDENTIALS_FILE),
  );
  x = await request("/api/admin/login", "POST", {
    password: credentials.ADMIN_PASSWORD,
  });
  assert.equal(x.r.status, 200, JSON.stringify(x.data));
  const setCookie = x.r.headers.get("set-cookie");
  assert(setCookie.includes("HttpOnly"));
  assert(setCookie.includes("SameSite=Strict"));
  cookie = setCookie.split(";")[0];
  x = await request("/api/admin/session", "GET", null, true);
  assert(x.data.authenticated);
  console.log(
    "Authentication, HttpOnly cookie, unauthorized access and CSRF: passed",
  );
  x = await request("/api/products");
  assert.equal(x.data.length, 12);
  x = await request("/api/store");
  assert(x.data.ordersEnabled);
  assert.equal(
    x.data.settings.instagram,
    "https://www.instagram.com/elabbari10/",
  );
  const payload = {
    requestKey: crypto.randomUUID(),
    name: "Test Ticket Client",
    phone: "0611111111",
    city: "Casablanca",
    shippingFee: 0,
    grandTotal: 1,
    address: "12 rue de validation",
    items: [{ id: "1", size: "10 ml", qty: 2, price: 1 }],
  };
  x = await request("/api/orders", "POST", payload);
  assert.equal(x.r.status, 201, JSON.stringify(x.data));
  assert.equal(x.data.total, 190);
  assert.equal(x.data.shippingFee, 20);
  assert.equal(x.data.grandTotal, 210);
  const id = x.data.id;
  let retry = await request("/api/orders", "POST", payload);
  assert.equal(retry.data.id, id);
  const otherCity = await request("/api/orders", "POST", {
    ...payload,
    requestKey: crypto.randomUUID(),
    city: "Rabat",
  });
  assert.equal(otherCity.r.status, 201);
  assert.equal(otherCity.data.shippingFee, 35);
  assert.equal(otherCity.data.grandTotal, 225);
  x = await request("/api/orders", "POST", {
    ...payload,
    name: "Different Client",
  });
  assert.equal(x.r.status, 409);
  x = await request("/api/orders", "POST", {
    ...payload,
    requestKey: crypto.randomUUID(),
    items: [{ id: "1", size: "99 ml", qty: 1 }],
  });
  assert.equal(x.r.status, 400);
  const concurrentPayload = { ...payload, requestKey: crypto.randomUUID() };
  const concurrent = await Promise.all([
    request("/api/orders", "POST", concurrentPayload),
    request("/api/orders", "POST", concurrentPayload),
  ]);
  assert(concurrent.every((x) => x.r.ok));
  assert.equal(concurrent[0].data.id, concurrent[1].data.id);
  x = await request(
    "/api/admin/orders/" + id,
    "PATCH",
    { status: "delivered" },
    true,
  );
  assert.equal(x.r.status, 200);
  x = await request("/api/admin/data", "GET", null, true);
  assert.equal(x.data.orders.find((o) => o.id === id).status, "delivered");
  console.log(
    "D1 orders, server-side prices, idempotency, invalid variants and order status: passed",
  );
  let product = {
    name: "Validation parfum",
    brand: "Validation",
    type: "decant",
    gender: "mixte",
    price: 99,
    fullPrice: 700,
    image: "/products/1.jpg",
    description: "Une description de validation",
    notes: "Floral",
    tag: "Test",
    active: true,
    inStock: true,
  };
  x = await request("/api/admin/products", "POST", product, true);
  assert.equal(x.r.status, 201);
  product = { ...x.data, price: 105 };
  const productId = product.id;
  x = await request("/api/admin/products/" + productId, "PUT", product, true);
  assert.equal(x.data.price, 105);
  assert.equal(x.data.gender, "mixte");
  x = await request(
    "/api/admin/products/" + productId,
    "PUT",
    { ...product, type: "full" },
    true,
  );
  assert.equal(x.r.status, 200);
  assert.equal(x.data.gender, "mixte");
  assert.equal(x.data.type, "full");
  await request("/api/admin/products/" + productId, "PUT", product, true);
  x = await request("/api/products");
  assert(
    x.data.some(
      (p) =>
        p.id === productId && p.description === "Une description de validation",
    ),
  );
  await request(
    "/api/admin/products/" + productId,
    "PUT",
    { ...product, active: false },
    true,
  );
  x = await request("/api/products");
  assert(!x.data.some((p) => p.id === productId));
  x = await request("/api/orders", "POST", {
    ...payload,
    requestKey: crypto.randomUUID(),
    items: [{ id: productId, size: "10 ml", qty: 1 }],
  });
  assert.equal(x.r.status, 409);
  await request(
    "/api/admin/products/" + productId,
    "PUT",
    { ...product, inStock: false },
    true,
  );
  x = await request("/api/orders", "POST", {
    ...payload,
    requestKey: crypto.randomUUID(),
    items: [{ id: productId, size: "10 ml", qty: 1 }],
  });
  assert.equal(x.r.status, 409);
  await request("/api/admin/products/" + productId, "DELETE", null, true);
  console.log(
    "Product create/update/delete, descriptions, visibility and availability: passed",
  );
  x = await request(
    "/api/admin/settings",
    "PUT",
    { instagram: "https://evil.example/", whatsapp: "393509071813" },
    true,
  );
  assert.equal(x.r.status, 400);
  x = await request(
    "/api/admin/settings",
    "PUT",
    {
      instagram: "https://www.instagram.com/elabbari10/?utm_source=test",
      whatsapp: "393509071813",
    },
    true,
  );
  assert.equal(x.r.status, 200);
  assert.equal(x.data.instagram, "https://www.instagram.com/elabbari10/");
  const image = fs.readFileSync(
    require("node:path").join(__dirname, "../public/products/1.jpg"),
  );
  x = await request("/api/admin/media", "POST", image, true, base, {
    "Content-Type": "image/jpeg",
  });
  assert.equal(x.r.status, 201, JSON.stringify(x.data));
  const media = await request(x.data.url);
  assert.equal(media.r.headers.get("content-type"), "image/jpeg");
  assert.equal(Buffer.compare(Buffer.from(media.data), image), 0);
  x = await request(
    "/api/admin/media",
    "POST",
    Buffer.from("not-an-image-at-all"),
    true,
    base,
    { "Content-Type": "image/jpeg" },
  );
  assert.equal(x.r.status, 400);
  console.log(
    "Instagram settings, URL validation, persistent media and image validation: passed",
  );
  x = await request("/api/admin/logout", "POST", {}, true);
  assert(x.r.headers.get("set-cookie").includes("Max-Age=0"));
  console.log("API integration suite: all checks passed.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

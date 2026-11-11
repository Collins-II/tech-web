import assert from "node:assert/strict";
import { promises as dnsPromises, setServers } from "node:dns";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const uri = process.env.MONGODB_TEST_URI;
const store = process.env.TEST_STORE_URL;
const portal = process.env.TEST_PORTAL_URL;
const email = process.env.TEST_ADMIN_EMAIL;
const password = process.env.TEST_ADMIN_PASSWORD;
if (!uri || !store || !portal || !email || !password) throw new Error("Set MONGODB_TEST_URI, TEST_STORE_URL, TEST_PORTAL_URL, TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD.");
const dbName = new URL(uri).pathname.slice(1);
if (!/^goodform_test_[a-z0-9]+$/.test(dbName) || dbName.length > 38) throw new Error("Test database name must start with goodform_test_, contain only lowercase letters and digits, and be at most 38 characters.");
for (const value of [store, portal]) {
  const url = new URL(value);
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(url.hostname) || url.origin !== value) {
    throw new Error("Test URLs must be local HTTP origins without paths.");
  }
}
if (process.env.MONGODB_DNS_SERVERS) {
  const servers = process.env.MONGODB_DNS_SERVERS.split(",").map((server) => server.trim());
  setServers(servers);
  dnsPromises.setServers(servers);
}
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
let safeToClean = false;

async function json(url, options) {
  const response = await fetch(url, options);
  return { response, body: await response.json() };
}
function cookies(response) {
  return response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
}

try {
  await client.connect();
  const db = client.db();
  assert.equal((await db.listCollections({}, { nameOnly: true }).toArray()).length, 0, "Test database must be empty.");
  safeToClean = true;
  const productName = `Platform test ${randomUUID()}`;
  await db.collection("goodform_products").insertOne({
    id: 1, name: productName, brand: "TEST", category: "Headphones",
    price: 99.5, oldPrice: null, color: "Black", tag: "", image: "https://example.com/image.jpg",
    stock: 5, published: true,
  });
  let result = await json(`${portal}/api/admin/products`);
  assert.equal(result.response.status, 401, "Products require authentication");

  const csrf = await json(`${portal}/api/auth/csrf`);
  assert.equal(csrf.response.status, 200);
  const invalidLogin = await fetch(`${portal}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies(csrf.response), Origin: portal },
    body: new URLSearchParams({ csrfToken: csrf.body.csrfToken, email, password: "incorrect-password", callbackUrl: portal, json: "true" }),
  });
  assert.doesNotMatch(cookies(invalidLogin), /session-token=/, "Invalid password must not create a session");
  const login = await fetch(`${portal}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies(csrf.response), Origin: portal },
    body: new URLSearchParams({ csrfToken: csrf.body.csrfToken, email, password, callbackUrl: portal, json: "true" }),
  });
  const sessionCookie = cookies(login);
  assert.match(sessionCookie, /session-token=/, "Login must issue a session cookie");
  const headers = { Cookie: sessionCookie, Origin: portal, "Content-Type": "application/json" };
  result = await json(`${portal}/api/admin/products`, { headers });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.products.length, 1);
  assert.equal(result.body.products[0].name, productName, "Portal must use the isolated test database");
  const productBeforeOrder = result.body.products[0];
  result = await json(`${portal}/api/admin/products`, { method: "POST", headers: { ...headers, Origin: "https://invalid.example" }, body: "{}" });
  assert.equal(result.response.status, 403, "Cross-origin mutation must fail");

  result = await json(`${store}/api/products`);
  assert.equal(result.response.status, 200);
  assert.equal(result.body.products.length, 1);
  assert.equal(result.body.products[0].name, productName, "Storefront must use the isolated test database");
  assert.equal(result.body.products[0].stock, 5);
  const order = {
    requestId: randomUUID(),
    customer: { name: "Test Customer", email: "customer@example.test", phone: "+260 970 123456" },
    fulfillment: "delivery", address: "Test address, Lusaka",
    items: [{ id: 1, quantity: 2, expectedPrice: 99.5 }],
  };
  const place = (body) => json(`${store}/api/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  result = await json(`${store}/api/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "x".repeat(17_000) });
  assert.equal(result.response.status, 413, "Oversized requests must be rejected");
  result = await place(order);
  assert.equal(result.response.status, 201);
  assert.equal(result.body.total, 199);
  const reference = result.body.reference;
  result = await place(order);
  assert.equal(result.response.status, 200, "Retry must be idempotent");
  assert.equal(result.body.reference, reference);
  assert.equal((await db.collection("goodform_products").findOne({ id: 1 })).stock, 3);
  const staleStockEdit = { ...productBeforeOrder, version: 0, previousStock: 5, stock: 10 };
  result = await json(`${portal}/api/admin/products`, { method: "POST", headers, body: JSON.stringify(staleStockEdit) });
  assert.equal(result.response.status, 409, "A stale stock edit must not overwrite an order");
  result = await place({ ...order, address: "A different address" });
  assert.equal(result.response.status, 409, "A request ID cannot be reused for a different order");
  result = await place({ ...order, requestId: randomUUID(), items: [{ id: 1, quantity: 4, expectedPrice: 99.5 }] });
  assert.equal(result.response.status, 409, "Insufficient stock must fail");
  result = await place({ ...order, requestId: randomUUID(), items: [{ id: 1, quantity: 1, expectedPrice: 1 }] });
  assert.equal(result.response.status, 409, "Changed price must fail");

  result = await json(`${portal}/api/admin/orders`, { headers });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.orders[0].reference, reference, "Order must appear in portal");
  const update = (status) => json(`${portal}/api/admin/orders`, { method: "PATCH", headers, body: JSON.stringify({ reference, status }) });
  result = await update("confirmed");
  assert.equal(result.response.status, 200);
  result = await update("cancelled");
  assert.equal(result.response.status, 200);
  assert.equal((await db.collection("goodform_products").findOne({ id: 1 })).stock, 5, "Cancellation restores stock");
  result = await update("cancelled");
  assert.equal(result.response.status, 409, "Repeated cancellation must not restore stock again");
  assert.equal((await db.collection("goodform_products").findOne({ id: 1 })).stock, 5);

  const concurrentOrders = await Promise.all([0, 1].map(() => place({
    ...order, requestId: randomUUID(), items: [{ id: 1, quantity: 4, expectedPrice: 99.5 }],
  })));
  assert.deepEqual(concurrentOrders.map((item) => item.response.status).sort(), [201, 409], "Concurrent orders must not oversell");
  assert.equal((await db.collection("goodform_products").findOne({ id: 1 })).stock, 1);
  const concurrentReference = concurrentOrders.find((item) => item.response.status === 201).body.reference;
  result = await json(`${portal}/api/admin/orders`, { method: "PATCH", headers, body: JSON.stringify({ reference: concurrentReference, status: "cancelled" }) });
  assert.equal(result.response.status, 200);

  const product = (await json(`${portal}/api/admin/products`, { headers })).body.products[0];
  const edit = { ...product, name: "Updated test headphones", price: 120, stock: 7, version: product.version || 0, previousStock: product.stock };
  result = await json(`${portal}/api/admin/products`, { method: "POST", headers, body: JSON.stringify(edit) });
  assert.equal(result.response.status, 200, "Admin can update product");
  result = await json(`${store}/api/products`);
  assert.equal(result.body.products[0].name, "Updated test headphones", "Admin updates reach the storefront");
  assert.equal(result.body.products[0].stock, 7);
  result = await json(`${portal}/api/admin/products`, { method: "POST", headers, body: JSON.stringify(edit) });
  assert.equal(result.response.status, 409, "Stale product edits must fail");
  result = await json(`${portal}/api/admin/products`, { method: "POST", headers, body: JSON.stringify({
    name: "Draft product", brand: "TEST", category: "Gaming", price: 20,
    oldPrice: null, color: "", tag: "", image: "https://example.com/image.jpg", stock: 3, published: false,
  }) });
  assert.equal(result.response.status, 200, "Admin can create a product");
  result = await json(`${store}/api/products`);
  assert.equal(result.body.products.length, 1, "Draft products must not appear on the storefront");

  if (60_000 - (Date.now() % 60_000) < 5000) await new Promise((resolve) => setTimeout(resolve, 5000));
  const bucket = Math.floor(Date.now() / 60_000);
  await db.collection("goodform_order_attempts").updateOne({ _id: `orders:${bucket}` }, { $set: { count: 60, expiresAt: new Date((bucket + 2) * 60_000) } }, { upsert: true });
  result = await place({ ...order, requestId: randomUUID(), items: [{ id: 1, quantity: 1, expectedPrice: 120 }] });
  assert.equal(result.response.status, 429, "Order rate limit must be enforced");
  result = await place(order);
  assert.equal(result.response.status, 200, "Idempotent retries remain available when rate-limited");
  console.log("Platform integration passed: auth, CSRF, catalog, checkout, rate limits, retries, pricing, concurrent stock and cancellation.");
} finally {
  if (safeToClean) {
    const db = client.db();
    for (const name of ["goodform_products", "goodform_orders", "goodform_login_attempts", "goodform_order_attempts"]) {
      if (await db.listCollections({ name }, { nameOnly: true }).hasNext()) await db.collection(name).drop();
    }
  }
  await client.close();
}

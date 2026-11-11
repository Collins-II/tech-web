import { createHash, randomUUID } from "node:crypto";
import { MongoServerError } from "mongodb";
import { z } from "zod";
import { getMongoClient } from "@/lib/mongodb";

const orderSchema = z.object({
  requestId: z.uuid(),
  customer: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.email().max(254).transform((value) => value.toLowerCase()),
    phone: z.string().trim().min(7).max(30).regex(/^[+\d\s()-]+$/),
  }).strict(),
  fulfillment: z.enum(["delivery", "pickup"]),
  address: z.string().trim().max(300),
  items: z.array(z.object({
    id: z.number().int().positive().safe(),
    quantity: z.number().int().min(1).max(20),
    expectedPrice: z.number().nonnegative().finite().max(1_000_000),
  }).strict()).min(1).max(30),
}).strict().superRefine((value, context) => {
  if (value.fulfillment === "delivery" && value.address.length < 5) {
    context.addIssue({ code: "custom", path: ["address"], message: "Enter a delivery address." });
  }
  if (new Set(value.items.map((item) => item.id)).size !== value.items.length) {
    context.addIssue({ code: "custom", path: ["items"], message: "Duplicate products are not allowed." });
  }
});

class OrderConflict extends Error {}
class RequestTooLarge extends Error {}

async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 16_384) {
      await reader.cancel();
      throw new RequestTooLarge();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function POST(request: Request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) {
    return Response.json({ error: "Expected JSON." }, { status: 415 });
  }

  let input: unknown;
  try {
    const body = await readBody(request);
    input = JSON.parse(body);
  } catch (error) {
    if (error instanceof RequestTooLarge) return Response.json({ error: "Request is too large." }, { status: 413 });
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return Response.json({ error: "Please check your contact details and order." }, { status: 400 });

  const order = parsed.data;
  const payloadHash = createHash("sha256").update(JSON.stringify(order)).digest("hex");
  try {
    const client = await getMongoClient();
    const db = client.db();
    const orders = db.collection("goodform_orders");
    const products = db.collection("goodform_products");
    await orders.createIndex({ requestId: 1 }, { unique: true });

    const existing = await orders.findOne({ requestId: order.requestId });
    if (existing) {
      if (existing.payloadHash !== payloadHash) return Response.json({ error: "This checkout request was already used. Please try again." }, { status: 409 });
      return Response.json({ reference: existing.reference, total: existing.total, currency: "ZMW" });
    }

    const attempts = db.collection<{ _id: string; count: number; expiresAt: Date }>("goodform_order_attempts");
    await attempts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    const bucket = Math.floor(Date.now() / 60_000);
    const attempt = await attempts.findOneAndUpdate(
      { _id: `orders:${bucket}` },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * 60_000) } },
      { upsert: true, returnDocument: "after" },
    );
    if (!attempt || attempt.count > 60) {
      return Response.json({ error: "Too many orders right now. Please try again shortly." }, { status: 429, headers: { "Retry-After": "60" } });
    }

    const session = client.startSession();
    try {
      const result = await session.withTransaction(async () => {
        const lines: { productId: number; name: string; quantity: number; unitPrice: number }[] = [];
        let totalMinor = 0;
        for (const item of order.items) {
          const product = await products.findOne({ id: item.id, published: true }, { session });
          if (!product || !Number.isSafeInteger(product.stock) || product.stock < item.quantity ||
              typeof product.price !== "number" || !Number.isFinite(product.price) ||
              product.price < 0 || product.price > 1_000_000 ||
              Math.abs(product.price * 100 - Math.round(product.price * 100)) > 1e-6 ||
              Math.round(product.price * 100) !== Math.round(item.expectedPrice * 100)) {
            throw new OrderConflict("A product is unavailable or its price has changed. Refresh the catalog and review your bag.");
          }
          const changed = await products.updateOne(
            { _id: product._id, published: true, stock: { $gte: item.quantity }, price: product.price },
            { $inc: { stock: -item.quantity } },
            { session },
          );
          if (changed.modifiedCount !== 1) throw new OrderConflict("Stock changed. Refresh the catalog and review your bag.");
          totalMinor += Math.round(product.price * 100) * item.quantity;
          lines.push({ productId: item.id, name: String(product.name), quantity: item.quantity, unitPrice: product.price });
        }
        const reference = randomUUID();
        const total = totalMinor / 100;
        await orders.insertOne({
          reference, requestId: order.requestId, payloadHash,
          customer: order.customer,
          fulfillment: order.fulfillment,
          address: order.fulfillment === "delivery" ? order.address : "",
          items: lines, total, currency: "ZMW",
          paymentMethod: "cash_on_delivery", status: "pending",
          createdAt: new Date(), updatedAt: new Date(),
        }, { session });
        return { reference, total, currency: "ZMW" };
      });
      return Response.json(result, { status: 201 });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    if (error instanceof OrderConflict) return Response.json({ error: error.message }, { status: 409 });
    if (error instanceof MongoServerError && error.code === 11000) {
      const client = await getMongoClient();
      const existing = await client.db().collection("goodform_orders").findOne({ requestId: order.requestId });
      if (existing && existing.payloadHash === payloadHash) {
        return Response.json({ reference: existing.reference, total: existing.total, currency: "ZMW" });
      }
      return Response.json({ error: "This checkout request was already used. Please try again." }, { status: 409 });
    }
    console.error("Could not place order", error instanceof Error ? error.name : "Unknown error");
    return Response.json({ error: "We could not place your order. Please try again." }, { status: 503 });
  }
}

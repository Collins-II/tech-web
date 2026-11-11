import nextEnv from "@next/env";
import { setServers } from "node:dns";
import { MongoClient } from "mongodb";

nextEnv.loadEnvConfig(process.cwd());
if (process.env.MONGODB_DNS_SERVERS) {
  setServers(process.env.MONGODB_DNS_SERVERS.split(",").map((server) => server.trim()));
}
if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is not configured");
}

const products = [
  { id: 1, brand: "SONY", name: "WH-1000XM5 Wireless Headphones", category: "Headphones", price: 8999, oldPrice: null, color: "Midnight Black", tag: "SAMPLE", image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=800&q=85" },
  { id: 2, brand: "MARSHALL", name: "Stanmore III Bluetooth Speaker", category: "Speakers", price: 9999, oldPrice: null, color: "Cream", tag: "SAMPLE", image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=85" },
  { id: 3, brand: "FUJIFILM", name: "Instax Mini 12 Instant Camera", category: "Cameras", price: 2299, oldPrice: null, color: "Clay White", tag: "SAMPLE", image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=85" },
  { id: 4, brand: "APPLE", name: "Watch Series 9 GPS", category: "Wearables", price: 10999, oldPrice: null, color: "Starlight", tag: "SAMPLE", image: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=800&q=85" },
  { id: 5, brand: "SONY", name: "DualSense Wireless Controller", category: "Gaming", price: 1999, oldPrice: null, color: "Cloud White", tag: "SAMPLE", image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=800&q=85" },
].map((product) => ({ ...product, stock: 10, published: true }));

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const collection = client.db().collection("goodform_products");
    await collection.createIndex({ id: 1 }, { unique: true });
    const result = await collection.bulkWrite(products.map((product) => ({
      updateOne: { filter: { id: product.id }, update: { $setOnInsert: product }, upsert: true },
    })));
    console.log(`Inserted ${result.upsertedCount} sample products; existing products were not changed.`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Product import failed:", error instanceof Error ? error.name : "Unknown error");
  process.exitCode = 1;
});

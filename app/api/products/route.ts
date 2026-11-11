import { getMongoClient } from "@/lib/mongodb";
import { connection } from "next/server";

export async function GET() {
  await connection();
  try {
    const client = await getMongoClient();
    const products = await client.db().collection("goodform_products").find(
      { published: true },
      { projection: { _id: 0, id: 1, brand: 1, name: 1, category: 1, price: 1, oldPrice: 1, color: 1, tag: 1, image: 1, stock: 1 } },
    ).sort({ id: 1 }).toArray();
    return Response.json({ products }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "unknown";
    const syscall = error instanceof Error && "syscall" in error ? String(error.syscall) : "unknown";
    console.error("Could not load products from MongoDB", error instanceof Error ? error.name : "Unknown error", code, syscall);
    return Response.json({ error: "The catalog is temporarily unavailable." }, { status: 503 });
  }
}

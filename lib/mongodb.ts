import { promises as dnsPromises, setServers } from "node:dns";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is not configured");
}
const mongoUri: string = uri;

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

export function getMongoClient() {
  if (!globalForMongo.mongoClientPromise) {
    if (process.env.MONGODB_DNS_SERVERS) {
      const servers = process.env.MONGODB_DNS_SERVERS.split(",").map((server) => server.trim());
      setServers(servers);
      dnsPromises.setServers(servers);
    }
    const client = new MongoClient(mongoUri);
    globalForMongo.mongoClientPromise = client.connect().catch((error: unknown) => {
      globalForMongo.mongoClientPromise = undefined;
      throw error;
    });
  }
  return globalForMongo.mongoClientPromise;
}

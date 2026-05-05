import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const rawConnectionString = process.env.DATABASE_URL;

// Clean up connection string: remove params that pg handles via options instead.
let connectionString = rawConnectionString;
if (connectionString) {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("channel_binding");
    connectionString = url.toString();
  } catch {
    // not a valid URL, pass as-is
  }
}

const isNeon = rawConnectionString?.includes("neon.tech") ?? false;

const pool = new Pool({
  connectionString,
  ssl: isNeon ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 5,
});

const adapter = new PrismaPg(pool);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

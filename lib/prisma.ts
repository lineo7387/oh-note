import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const rawConnectionString = process.env.DATABASE_URL;

// Remove sslmode from connection string to avoid pg warning.
// SSL is handled explicitly via the `ssl` option below.
let connectionString = rawConnectionString;
if (connectionString) {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete("sslmode");
    connectionString = url.toString();
  } catch {
    // not a valid URL, pass as-is
  }
}

const isNeon = rawConnectionString?.includes("neon.tech") ?? false;

const pool = new Pool({
  connectionString,
  ssl: isNeon ? { rejectUnauthorized: false } : undefined,
});

const adapter = new PrismaPg(pool);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

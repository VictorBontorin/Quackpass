import { PrismaClient } from "@prisma/client";

// Reaproveita o client entre hot-reloads em dev para não esgotar conexões.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * Database client — Standard PostgreSQL via postgres.js (Supabase compatible).
 *
 * Uses postgres.js driver + drizzle-orm.
 * Safe for serverless and connection pooling.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const queryClient = postgres(process.env.DATABASE_URL!);

export const db = drizzle({ client: queryClient });

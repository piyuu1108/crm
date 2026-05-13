import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let databaseUrl: string | undefined;

try {
	const { env } = await import('$env/dynamic/private');
	databaseUrl = env.DATABASE_URL;
} catch {
	databaseUrl = process.env.DATABASE_URL;
}

if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const client = postgres(databaseUrl);

export const db = drizzle(client, { schema });

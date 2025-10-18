import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

// Serverless-friendly Postgres client settings
// - ssl: require in production to connect to managed Postgres (e.g., AWS RDS)
// - max: 1 to avoid exhausting connections from serverless concurrency
// - connect_timeout: fail fast on unreachable networks
const useSSL = process.env.NODE_ENV === 'production' || process.env.PGSSL === 'true';
const client = postgres(process.env.DATABASE_URL, {
  ssl: useSSL ? 'require' : undefined,
  max: 1,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
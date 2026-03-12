// === START src/lib/db.ts ===
import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __payagPool: Pool | undefined;
}

export function getDbPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured');
  }

  if (!global.__payagPool) {
    global.__payagPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
  }

  return global.__payagPool;
}
// === END src/lib/db.ts ===

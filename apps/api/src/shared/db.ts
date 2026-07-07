import pg from "pg";

const { Pool } = pg;

export type DbMode = "postgres" | "demo";

const connectionString = process.env.DATABASE_URL;

export const dbMode: DbMode = connectionString ? "postgres" : "demo";

const pool = connectionString
  ? new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 2_000
    })
  : null;

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[] | null> {
  if (!pool) {
    return null;
  }

  try {
    const result = await pool.query(sql, params);
    return result.rows as T[];
  } catch (error) {
    console.error("database query failed", error);
    return null;
  }
}

export async function queryOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows?.[0] ?? null;
}

export async function checkDatabase() {
  if (!pool) {
    return {
      mode: "demo",
      connected: false
    };
  }

  try {
    await pool.query("SELECT 1");
    return {
      mode: "postgres",
      connected: true
    };
  } catch {
    return {
      mode: "postgres",
      connected: false
    };
  }
}

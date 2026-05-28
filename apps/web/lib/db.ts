/**
 * Postgres pool — singleton with lazy initialisation so `next build`
 * succeeds even before env vars are set.
 */
import { Pool } from 'pg'
import { env } from './env'

declare global {
  // eslint-disable-next-line no-var
  var __wrapd_pg_pool: Pool | undefined
}

function createPool(): Pool {
  return new Pool({
    connectionString: env.postgres.url,
    max: 10,
    idleTimeoutMillis: 30_000,
  })
}

function getPool(): Pool {
  if (!global.__wrapd_pg_pool) {
    global.__wrapd_pg_pool = createPool()
  }
  return global.__wrapd_pg_pool
}

// Proxy keeps the `pool` export but avoids creating it at module load.
export const pool = new Proxy({} as Pool, {
  get(_t, prop) {
    const p = getPool()
    const value = (p as unknown as Record<PropertyKey, unknown>)[prop as PropertyKey]
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(p) : value
  },
})

/** Query helper that returns typed rows. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query(text, params)
  return result.rows as T[]
}

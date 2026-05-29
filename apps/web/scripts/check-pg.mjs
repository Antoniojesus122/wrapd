#!/usr/bin/env node
/**
 * Valida que POSTGRES_URL es parseable y que la conexión a Supabase funciona.
 * Nunca imprime la password.
 *
 * Uso:  node --env-file=.env.local scripts/check-pg.mjs
 */
import { Client } from 'pg'

const url = process.env.POSTGRES_URL
if (!url) {
  console.error('❌ POSTGRES_URL no está definido en .env.local')
  process.exit(1)
}

// Sanitize: mask password between : and @
const masked = url.replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1***$2')
console.log('→ POSTGRES_URL  =', masked)

// 1) Parse check
let parsed
try {
  parsed = new URL(url)
} catch (e) {
  console.error('❌ La URL no se puede parsear:', e.message)
  console.error()
  console.error('Cosas a comprobar:')
  console.error('  · No debe haber CORCHETES literales tipo [YOUR-PASSWORD] o [PROJECT-REF]')
  console.error('  · Debe empezar por postgresql://')
  console.error('  · Caracteres especiales en la password deben estar URL-encoded')
  console.error('    (ej. # → %23, @ → %40, & → %26)')
  process.exit(1)
}

console.log('   protocol     =', parsed.protocol)
console.log('   host         =', parsed.host)
console.log('   port         =', parsed.port)
console.log('   database     =', parsed.pathname.slice(1))
console.log('   user         =', parsed.username)
console.log('   password set =', parsed.password ? 'yes (' + parsed.password.length + ' chars)' : 'NO ❌')
console.log()

// 2) Connect check
console.log('→ Conectando...')
const client = new Client({ connectionString: url })
try {
  await client.connect()
  const { rows } = await client.query('SELECT current_database() AS db, current_user AS usr, version() AS ver')
  console.log('✅ Conectado')
  console.log('   database = ', rows[0].db)
  console.log('   user     = ', rows[0].usr)
  console.log('   version  = ', rows[0].ver.split(',')[0])

  // 3) Schema check
  const schemaRows = (await client.query(
    `SELECT schema_name FROM information_schema.schemata
      WHERE schema_name IN ('raw', 'marts')
      ORDER BY schema_name`
  )).rows
  console.log()
  console.log('→ Schemas wrapd:')
  if (schemaRows.length === 0) {
    console.log('   ⚠️  NO existen los schemas raw/marts.')
    console.log('   Aplica packages/db/schemas/01_raw.sql y 02_marts.sql en Supabase SQL Editor.')
  } else {
    for (const r of schemaRows) console.log('   ✅', r.schema_name)
  }
} catch (e) {
  console.error('❌ Conexión fallida:', e.message)
  console.error()
  console.error('Cosas a comprobar:')
  console.error('  · ¿Password correcta? Cópiala desde Supabase → Project Settings → Database')
  console.error('  · ¿Caracteres especiales URL-encoded?')
  console.error('  · ¿Tu IP está permitida? Supabase permite todas por defecto pero verifica')
  console.error('    en Project Settings → Database → Network restrictions')
  process.exit(1)
} finally {
  await client.end()
}

#!/usr/bin/env node
/**
 * Diagnóstico avanzado de POSTGRES_URL. Detecta qué caracteres están rompiendo
 * el parser sin revelar la password.
 *
 * Uso:  node --env-file=.env.local scripts/diagnose-pg.mjs
 */
const url = process.env.POSTGRES_URL
if (!url) {
  console.error('❌ POSTGRES_URL no está definido')
  process.exit(1)
}

console.log('→ Longitud total de la URL:', url.length, 'caracteres')

// Split robust: encontrar el primer ":" tras "://", luego el último "@" antes del primer "/" tras eso
const protoMatch = url.match(/^([a-z+]+):\/\//i)
if (!protoMatch) {
  console.error('❌ La URL no empieza con un protocolo válido (ej. postgresql://)')
  process.exit(1)
}
const proto = protoMatch[1]
const afterProto = url.slice(protoMatch[0].length)

const lastAt = afterProto.lastIndexOf('@')
if (lastAt === -1) {
  console.error('❌ Falta @ entre userinfo y host')
  process.exit(1)
}
const userInfo = afterProto.slice(0, lastAt)
const afterAt = afterProto.slice(lastAt + 1)

const firstColon = userInfo.indexOf(':')
const user = firstColon === -1 ? userInfo : userInfo.slice(0, firstColon)
const password = firstColon === -1 ? '' : userInfo.slice(firstColon + 1)

console.log('→ Protocol:', proto)
console.log('→ Usuario:', user)
console.log('→ Host+path:', afterAt)
console.log('→ Password length:', password.length, 'chars')

// Detectar caracteres problemáticos en la password
const PROBLEMATIC = {
  '@': '%40',
  '#': '%23',
  '?': '%3F',
  '/': '%2F',
  ':': '%3A',
  '&': '%26',
  '=': '%3D',
  '+': '%2B',
  ' ': '%20',
  '%': '%25',
  '[': '%5B',
  ']': '%5D',
  '{': '%7B',
  '}': '%7D',
  '|': '%7C',
  '\\': '%5C',
  '^': '%5E',
  '<': '%3C',
  '>': '%3E',
  '"': '%22',
  '`': '%60',
}

const found = {}
for (const ch of password) {
  if (PROBLEMATIC[ch]) {
    found[ch] = (found[ch] || 0) + 1
  }
}

const problemKeys = Object.keys(found)
console.log()
if (problemKeys.length === 0) {
  console.log('✅ La password no contiene caracteres URL-reservados.')
  console.log('   El problema debe estar en otro lado. Pega aquí la URL ENCODEADA.')
} else {
  console.log('⚠️  Caracteres problemáticos en tu password:')
  for (const ch of problemKeys) {
    console.log(`   "${ch}"  ×${found[ch]}  →  reemplázalo por ${PROBLEMATIC[ch]}`)
  }
  console.log()
  // Encode and print the safe version
  const encodedPassword = encodeURIComponent(password)
  const safeUrl = `${proto}://${user}:${encodedPassword}@${afterAt}`
  // Mask only the encoded password
  const maskedSafe = safeUrl.replace(encodedPassword, '<<encoded-password>>')
  console.log('→ URL correcta debería verse así (la password va encodeada):')
  console.log('  ', maskedSafe)
  console.log()
  console.log('Para obtener la versión exacta a copiar, ejecuta:')
  console.log("  node -e \"const u=process.env.POSTGRES_URL; const m=u.match(/^([a-z+]+:\\/\\/[^:]+:)(.+)(@.+)$/i); console.log(m[1]+encodeURIComponent(m[2])+m[3])\" --env-file=.env.local")
}

// Try parsing as final check
console.log()
try {
  new URL(url)
  console.log('✅ La URL ACTUAL es parseable. El problema debe ser otro.')
} catch (e) {
  console.log('❌ La URL ACTUAL no es parseable:', e.message)
}

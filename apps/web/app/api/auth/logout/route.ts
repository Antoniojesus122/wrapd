import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/session'

export async function GET(req: Request) {
  await clearSessionCookie()
  return NextResponse.redirect(new URL('/', req.url))
}

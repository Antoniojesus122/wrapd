import { NextResponse, type NextRequest } from 'next/server'
import { clearSessionCookie } from '@/lib/session'
import { absoluteUrl } from '@/lib/url'

export async function GET(req: NextRequest) {
  await clearSessionCookie()
  return NextResponse.redirect(absoluteUrl(req, '/'))
}

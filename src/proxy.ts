import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session'

/**
 * Optimistic gate for /admin: a valid signed session cookie is required.
 * (Every admin page and server action re-checks the user against the database.)
 * Runs only on /admin so public pages stay fully static and fast.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/admin/login')) return NextResponse.next()
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login/'
    url.search = pathname === '/admin/' || pathname === '/admin' ? '' : `?next=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}

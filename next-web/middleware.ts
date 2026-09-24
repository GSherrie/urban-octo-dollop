import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED = ['/dashboard', '/expenses', '/income', '/transactions', '/reports', '/account', '/settings', '/protected']
const AUTH = ['/auth/login', '/auth/signup']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookies) {
          cookies.forEach((cookie) => request.cookies.set(cookie))
          supabaseResponse = NextResponse.next({ request: { headers: request.headers } })
          cookies.forEach((cookie) => supabaseResponse.cookies.set(cookie))
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + '/'))
  const isAuth = AUTH.some((p) => path === p || path.startsWith(p + '/'))
  if (isProtected && !user) return NextResponse.redirect(new URL('/auth/login', request.url))
  if (isAuth && user) return NextResponse.redirect(new URL('/dashboard', request.url))
  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

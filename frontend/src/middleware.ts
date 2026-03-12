import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PROTECTED_ROUTES: Record<string, string[]> = {
  "/admin": ["ADMIN"],
  "/hr": ["HR", "OWNER"],
  "/candidate": ["CANDIDATE"],
  "/org": ["HR", "OWNER"],
}

const PUBLIC_ONLY_ROUTES = ["/login", "/register", "/forgot-password"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const tokenCookie = request.cookies.get("jobnova_token")
  const userCookie = request.cookies.get("jobnova_user")

  const isAuthenticated = !!tokenCookie?.value

  // Redirect authenticated users away from public-only pages
  if (isAuthenticated && PUBLIC_ONLY_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Protect role-based routes
  for (const [route, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(route)) {
      if (!isAuthenticated) {
        const loginUrl = new URL("/login", request.url)
        loginUrl.searchParams.set("redirect", pathname)
        return NextResponse.redirect(loginUrl)
      }

      if (userCookie?.value) {
        try {
          const user = JSON.parse(decodeURIComponent(userCookie.value))
          if (!allowedRoles.includes(user.role)) {
            return NextResponse.redirect(new URL("/", request.url))
          }
        } catch {
          return NextResponse.redirect(new URL("/login", request.url))
        }
      }

      break
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/hr/:path*",
    "/candidate/:path*",
    "/org/:path*",
    "/login",
    "/register",
    "/forgot-password",
  ],
}


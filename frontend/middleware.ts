import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicPaths = ["/", "/login", "/register", "/jobs", "/forgot-password", "/reset-password", "/verify-email", "/verify-email-sent"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("jobnova_token")?.value
  const userCookie = request.cookies.get("jobnova_user")?.value

  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")
  )

  const hasSession = !!(token || userCookie)

  if (!isPublicPath && !hasSession) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (hasSession && (pathname === "/login" || pathname === "/register")) {
    try {
      if (userCookie) {
        const parsed = JSON.parse(userCookie)
        const role = parsed?.role
        if (role === "candidate") return NextResponse.redirect(new URL("/candidate/dashboard", request.url))
        if (role === "hr") return NextResponse.redirect(new URL("/hr/dashboard", request.url))
        if (role === "admin") return NextResponse.redirect(new URL("/admin/dashboard", request.url))
      }
    } catch {
      const response = NextResponse.next()
      response.cookies.delete("jobnova_token")
      response.cookies.delete("jobnova_user")
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon-light-32x32.png|icon-dark-32x32.png|icon.svg|apple-icon.png).*)"],
}

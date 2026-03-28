"use client"

import { Suspense, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { setCookie } from "@/src/lib/cookies"
import { api } from "@/src/lib/api"
import type { User } from "@/src/types/auth"

function GoogleCallbackInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    console.log('OAuth callback - search params:', window.location.search, 'code:', searchParams.get("code"))
    const code = searchParams.get("code")

    if (!code) {
      router.replace("/login?error=google_failed")
      return
    }

    api("/v1/auth/google/exchange", {
      method: "POST",
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        if (!res.ok) {
          router.replace("/login?error=google_failed")
          return
        }

        const data = await res.json() as {
          accessToken: string
          refreshToken: string
          user: { id: string; fullName: string; email: string; role: string }
        }

        const { accessToken, refreshToken, user } = data

        setCookie("jobnova_token", accessToken, 1)
        setCookie("jobnova_refresh", refreshToken, 7)

        const mappedUser: User = {
          id: user.id,
          name: user.fullName,
          email: user.email,
          role: user.role as User["role"],
          avatar: user.fullName
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .slice(0, 2),
          phone: "",
          location: "",
          createdAt: new Date().toISOString().split("T")[0],
        }
        setCookie("jobnova_user", JSON.stringify(mappedUser), 7)

        const role = user.role
        const path = role === "candidate" ? "/candidate/dashboard"
                   : role === "hr"        ? "/hr/dashboard"
                   : "/admin/dashboard"
        window.location.href = path
      })
      .catch(() => {
        router.replace("/login?error=google_failed")
      })
  }, [searchParams, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">جاري تسجيل الدخول بـ Google...</p>
      </div>
    </div>
  )
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <GoogleCallbackInner />
    </Suspense>
  )
}

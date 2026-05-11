"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { api } from "@/src/lib/api"

export default function GoogleCallbackClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
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
          user: { id: string; name: string; email: string; role: string }
        }

        const { user } = data

        // Set middleware cookie
        const userPayload = encodeURIComponent(JSON.stringify({ role: user.role }))
        document.cookie = `jobnova_user=${userPayload}; path=/; max-age=604800; SameSite=Lax`

        const path = user.role === "candidate" ? "/candidate/dashboard"
                   : user.role === "hr"        ? "/hr/dashboard"
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

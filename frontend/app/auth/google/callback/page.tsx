"use client"

import { Suspense, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { setCookie } from "@/src/lib/cookies"
import type { User } from "@/src/types/auth"

function GoogleCallbackInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const accessToken = searchParams.get("accessToken")
    const refreshToken = searchParams.get("refreshToken")
    const role = searchParams.get("role")
    const userId = searchParams.get("userId")
    const fullName = searchParams.get("fullName") ?? ""
    const email = searchParams.get("email") ?? ""

    if (!accessToken || !refreshToken || !role || !userId) {
      router.replace("/login?error=google_failed")
      return
    }

    // Store tokens matching what auth-context expects
    setCookie("jobnova_token", accessToken, 1)
    setCookie("jobnova_refresh", refreshToken, 7)

    // Build and store the user object the same way auth-context does via mapBackendUserToUser
    const mappedUser: User = {
      id: userId,
      name: fullName,
      email,
      role: role as User["role"],
      avatar: fullName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2),
      phone: "",
      location: "",
      createdAt: new Date().toISOString().split("T")[0],
    }
    setCookie("jobnova_user", JSON.stringify(mappedUser), 7)

    // Redirect based on role
    if (role === "hr") {
      router.replace("/hr/dashboard")
    } else if (role === "admin") {
      router.replace("/admin/dashboard")
    } else {
      router.replace("/candidate/dashboard")
    }
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

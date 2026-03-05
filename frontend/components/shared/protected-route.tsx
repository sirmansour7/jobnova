"use client"

import { useAuth } from "@/src/context/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, startTransition, type ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles?: readonly string[] }) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)
  const hasRedirected = useRef(false)

  useEffect(() => {
    if (isLoading) return
    if (hasRedirected.current) return

    if (!isAuthenticated) {
      hasRedirected.current = true
      startTransition(() => setRedirecting(true))
      router.replace("/login")
      return
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      hasRedirected.current = true
      startTransition(() => setRedirecting(true))
      router.replace("/")
      return
    }
  }, [isLoading, isAuthenticated, allowedRoles, user, router])

  if (isLoading || redirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    )
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    )
  }

  return <>{children}</>
}

"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import type { UserRole, User } from "@/src/types/auth"
import { API_URL } from "@/src/lib/api"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string, expectedRole?: string) => Promise<{ success: boolean; error?: string }>
  register: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>
  logout: () => void | Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

/** Backend auth login/refresh user shape */
interface BackendAuthUser {
  id: string
  name?: string
  fullName?: string
  email: string
  role: UserRole
}

/** Backend /auth/me user shape */
interface BackendMeUser {
  id: string
  fullName: string
  email: string
  role: UserRole
}

function mapBackendUserToUser(b: BackendAuthUser): User {
  const displayName = b.fullName ?? b.name ?? ""
  return {
    id: b.id,
    name: displayName,
    email: b.email,
    role: b.role,
    avatar: displayName.split(" ").map((n) => n[0]).join("").slice(0, 2),
    phone: "",
    location: "",
    createdAt: new Date().toISOString().split("T")[0],
  }
}

function mapMeUserToUser(b: BackendMeUser): User {
  return {
    id: b.id,
    name: b.fullName,
    email: b.email,
    role: b.role,
    avatar: b.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2),
    phone: "",
    location: "",
    createdAt: new Date().toISOString().split("T")[0],
  }
}

function getDashboardPath(role: string): string {
  if (role === "candidate") return "/candidate/dashboard"
  if (role === "hr") return "/hr/dashboard"
  return "/admin/dashboard"
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Don't check auth on public pages
    if (typeof window !== "undefined") {
      const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"]
      const isPublic = publicPaths.some(p => window.location.pathname.startsWith(p))
      if (isPublic) {
        setIsLoading(false)
        return
      }
    }

    ;(async () => {
      try {
        const meRes = await fetch(`${API_URL}/v1/auth/me`, {
          method: "GET",
          credentials: "include",
        })

        if (meRes.ok) {
          const me = (await meRes.json()) as BackendMeUser
          const mapped = mapMeUserToUser(me)
          // Refresh the middleware cookie
          const userPayload = encodeURIComponent(JSON.stringify({ role: mapped.role }))
          document.cookie = `jobnova_user=${userPayload}; path=/; max-age=604800; SameSite=Lax`
          setUser(mapped)
          return
        }

        if (meRes.status === 401) {
          const refreshRes = await fetch(`${API_URL}/v1/auth/refresh`, {
            method: "POST",
            credentials: "include",
          })

          if (refreshRes.ok) {
            const data = (await refreshRes.json()) as { user: BackendAuthUser }
            const mapped = mapBackendUserToUser(data.user)
            const userPayload = encodeURIComponent(JSON.stringify({ role: mapped.role }))
            document.cookie = `jobnova_user=${userPayload}; path=/; max-age=604800; SameSite=Lax`
            setUser(mapped)
            return
          }
        }

        setUser(null)
      } catch {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  const login = useCallback(
    async (email: string, password: string, expectedRole?: string) => {
      try {
        const res = await fetch(`${API_URL}/v1/auth/login`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          const msg = (data as { message?: string }).message
          return { success: false, error: msg ?? "البريد الإلكتروني أو كلمة المرور غير صحيحة" }
        }
        const data = (await res.json()) as { user: BackendAuthUser }
        const mappedUser = mapBackendUserToUser(data.user)

        // ✅ Role check — لو المستخدم اختار role مختلف عن اللي في الـ DB
        if (expectedRole && mappedUser.role !== expectedRole) {
          // logout فوراً عشان نمسح الـ cookie
          fetch(`${API_URL}/v1/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {})
          const roleLabel = expectedRole === "hr" ? "HR / شركة" : expectedRole === "admin" ? "Admin" : "باحث عن عمل"
          return {
            success: false,
            error: `هذا الحساب ليس حساب ${roleLabel}. يرجى اختيار نوع الحساب الصحيح.`,
          }
        }

        // Set client-readable cookie for middleware role check
        const userPayload = encodeURIComponent(JSON.stringify({ role: mappedUser.role }))
        document.cookie = `jobnova_user=${userPayload}; path=/; max-age=604800; SameSite=Lax`

        setUser(mappedUser)
        router.push(getDashboardPath(mappedUser.role))
        return { success: true }
      } catch {
        return { success: false, error: "خطأ في الاتصال بالخادم" }
      }
    },
    [router]
  )

  const register = useCallback(
    async (name: string, email: string, password: string, role: UserRole) => {
      try {
        const res = await fetch(`${API_URL}/v1/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName: name, email, password, role }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          const msg = (data as { message?: string | string[] }).message
          return {
            success: false,
            error: Array.isArray(msg) ? msg[0] : msg ?? "حدث خطأ أثناء إنشاء الحساب",
          }
        }
        return { success: true }
      } catch {
        return { success: false, error: "خطأ في الاتصال بالخادم" }
      }
    },
    []
  )

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      })
    } catch {
      // network failure is acceptable — proceed with local logout
    }
    // Clear the middleware cookie
    document.cookie = "jobnova_user=; path=/; max-age=0; SameSite=Lax"
    setUser(null)
    router.push("/login")
  }, [router])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

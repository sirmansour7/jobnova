"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import type { UserRole, User } from "@/src/types/auth"
import { getCookie, setCookie, deleteCookie } from "@/src/lib/cookies"
import { API_URL } from "@/src/lib/api"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>
  logout: () => void | Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const COOKIE_TOKEN = "jobnova_token"   // raw JWT for Authorization header
const COOKIE_USER = "jobnova_user"     // JSON user for session restore & middleware role

/** Backend auth login response user shape */
interface BackendAuthUser {
  id: string
  fullName: string
  email: string
  role: UserRole
  emailVerified: boolean
}

function mapBackendUserToUser(b: BackendAuthUser): User {
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

    // Session restore: use jobnova_user for user object; jobnova_token is used by API client for Authorization header
    const userJson = getCookie(COOKIE_USER)
    if (userJson) {
      try {
        const parsed = JSON.parse(userJson) as User
        if (parsed?.email && (parsed.name ?? parsed.role)) {
          queueMicrotask(() => setUser(parsed))
        } else {
          deleteCookie(COOKIE_USER)
        }
      } catch {
        deleteCookie(COOKIE_USER)
      }
    }
    queueMicrotask(() => setIsLoading(false))
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await fetch(`${API_URL}/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          const msg = (data as { message?: string }).message
          return { success: false, error: msg ?? "البريد الإلكتروني أو كلمة المرور غير صحيحة" }
        }
        const data = (await res.json()) as {
          accessToken: string
          refreshToken?: string
          user: BackendAuthUser
        }
        const mappedUser = mapBackendUserToUser(data.user)
        setCookie(COOKIE_TOKEN, data.accessToken, 1)
        if (data.refreshToken) {
          setCookie("jobnova_refresh", data.refreshToken, 7)
        }
        setCookie(COOKIE_USER, JSON.stringify(mappedUser), 7)
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
    const token = getCookie(COOKIE_TOKEN)
    if (token) {
      try {
        await fetch(`${API_URL}/v1/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
      } catch {
        // network failure is acceptable — proceed with local logout
      }
    }
    deleteCookie(COOKIE_TOKEN)
    deleteCookie(COOKIE_USER)
    deleteCookie("jobnova_refresh")
    setUser(null)
    router.push("/")
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

"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import type { UserRole, User } from "@/src/data/users"
import { mockUsers } from "@/src/data/users"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const COOKIE_TOKEN = "jobnova_token"   // raw JWT for Authorization header
const COOKIE_USER = "jobnova_user"     // JSON user for session restore & middleware role
const STORAGE_KEY = "jobnova_registered_users"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

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

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"))
  return match ? decodeURIComponent(match[2]) : null
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

function getRegisteredUsers(): User[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveRegisteredUser(user: User) {
  if (typeof window === "undefined") return
  const existing = getRegisteredUsers()
  existing.push(user)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
}

function findUserById(id: string): User | undefined {
  return mockUsers.find((u) => u.id === id) ?? getRegisteredUsers().find((u) => u.id === id)
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
          const foundUser = findUserById(parsed?.id)
          if (foundUser) queueMicrotask(() => setUser(foundUser))
          else deleteCookie(COOKIE_USER)
        }
      } catch {
        deleteCookie(COOKIE_USER)
      }
    }
    queueMicrotask(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        const data = (await res.json()) as { accessToken: string; refreshToken?: string; user: BackendAuthUser }
        const accessToken = data.accessToken
        const user = mapBackendUserToUser(data.user)
        setCookie(COOKIE_TOKEN, accessToken, 7)
        setCookie(COOKIE_USER, JSON.stringify(user), 7)
        setUser(user)
        router.push(getDashboardPath(user.role))
        return { success: true }
      }
    } catch {
      // Fall through to mock auth
    }

    const allUsers = [...mockUsers, ...getRegisteredUsers()]
    const foundUser = allUsers.find((u) => u.email === email)
    if (!foundUser) {
      return { success: false, error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" }
    }
    setCookie(COOKIE_USER, JSON.stringify(foundUser), 7)
    setUser(foundUser)
    router.push(getDashboardPath(foundUser.role))
    return { success: true }
  }, [router])

  const register = useCallback(async (name: string, email: string, _password: string, role: UserRole) => {
    const allUsers = [...mockUsers, ...getRegisteredUsers()]
    const exists = allUsers.find((u) => u.email === email)
    if (exists) {
      return { success: false, error: "البريد الإلكتروني مسجل بالفعل" }
    }
    const newUser: User = {
      id: String(Date.now()),
      name,
      email,
      role,
      avatar: name.split(" ").map((n) => n[0]).join("").slice(0, 2),
      phone: "",
      location: "",
      createdAt: new Date().toISOString().split("T")[0],
    }
    saveRegisteredUser(newUser)
    setCookie(COOKIE_USER, JSON.stringify(newUser), 7)
    setUser(newUser)
    router.push(getDashboardPath(role))
    return { success: true }
  }, [router])

  const logout = useCallback(() => {
    deleteCookie(COOKIE_TOKEN)
    deleteCookie(COOKIE_USER)
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

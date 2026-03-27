import { getCookie, setCookie, deleteCookie } from "./cookies"

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://jobnova-production-e410.up.railway.app"

function getToken(): string | null {
  return getCookie("jobnova_token")
}

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

function clearAuthCookies(): void {
  deleteCookie("jobnova_token")
  deleteCookie("jobnova_refresh")
  deleteCookie("jobnova_user")
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getCookie("jobnova_refresh")
  if (!refreshToken) return null
  try {
    const res = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      clearAuthCookies()
      return null
    }
    const data = (await res.json()) as { accessToken: string; refreshToken?: string }
    setCookie("jobnova_token", data.accessToken, 1)
    if (data.refreshToken) {
      setCookie("jobnova_refresh", data.refreshToken, 7)
    }
    return data.accessToken
  } catch {
    clearAuthCookies()
    return null
  }
}

export async function api(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const url = `${API_URL}${path}`

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  if (res.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true
      refreshPromise = refreshAccessToken().finally(() => {
        isRefreshing = false
        refreshPromise = null
      })
    }
    const newToken = await refreshPromise
    if (newToken) {
      return fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newToken}`,
          ...(options.headers ?? {}),
        },
      })
    }
    if (typeof window !== "undefined") {
      window.location.href = "/login"
      throw new Error("Session expired. Please log in again.")
    }
  }

  return res
}

export async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await api(path, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message: string = (body as { message?: string }).message ?? `HTTP ${res.status}`
    throw new Error(message)
  }
  return res.json() as Promise<T>
}
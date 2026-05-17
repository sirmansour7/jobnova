// Cookie-based auth uses HttpOnly cookies, so no JS-readable token logic here.

export const API_URL =
  (process.env.NEXT_PUBLIC_API_URL ?? "https://jobnova-backend.fly.dev").replace(/\/$/, "")

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
      signal: AbortSignal.timeout(10_000),
    })
    if (res.ok) {
      // Update the middleware cookie after successful refresh
      const data = await res.clone().json().catch(() => null)
      if (data?.user?.role) {
        const userPayload = encodeURIComponent(JSON.stringify({ role: data.user.role }))
        document.cookie = `jobnova_user=${userPayload}; path=/; max-age=604800; SameSite=Lax`
      }
      return true
    }
    return false
  } catch {
    return false
  }
}

export async function api(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_URL}${path}`

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  })

  if (res.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true
      refreshPromise = refreshSession().finally(() => {
        isRefreshing = false
        refreshPromise = null
      })
    }

    const refreshOk = await refreshPromise
    if (refreshOk) {
      return fetch(url, {
        ...options,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers ?? {}),
        },
      })
    }
    // Session expired — return the 401 response, let the page handle it
    return res
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
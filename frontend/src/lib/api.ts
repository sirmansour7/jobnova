export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"

export async function api(path: string, options: RequestInit = {}) {
  const url = `${API_URL}${path}`

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })

  return response
}

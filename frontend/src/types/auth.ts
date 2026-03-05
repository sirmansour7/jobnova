export type UserRole = "candidate" | "hr" | "admin"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar: string
  phone: string
  location: string
  createdAt: string
}


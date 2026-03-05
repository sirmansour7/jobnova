"use client"

import { useState, useEffect, useMemo } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { useAuth } from "@/src/context/auth-context"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Briefcase, Building2, MapPin, ShieldCheck, TrendingUp } from "lucide-react"
import Link from "next/link"
import { apiJson } from "@/src/lib/api"

interface AdminStats {
  totalUsers: number
  totalJobs: number
  totalApplications: number
  totalOrgs: number
}

interface AdminUser {
  id: string
  fullName: string
  email: string
  role: string
  emailVerified: boolean
  createdAt: string
}

const roleLabels: Record<string, string> = {
  candidate: "مرشح",
  hr: "مسؤول توظيف",
  admin: "مدير",
}

const roleBadgeStyles: Record<string, string> = {
  candidate: "bg-primary/10 text-primary border-primary/20",
  hr: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  admin: "bg-chart-4/10 text-chart-4 border-chart-4/20",
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalJobs: 0, totalApplications: 0, totalOrgs: 0 })
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    Promise.all([
      apiJson<AdminStats>("/v1/admin/stats").catch(() => ({ totalUsers: 0, totalJobs: 0, totalApplications: 0, totalOrgs: 0 })),
      apiJson<{ items: AdminUser[]; total: number; totalPages: number }>("/v1/admin/users").catch(() => ({ items: [], total: 0, totalPages: 0 })),
    ]).then(([s, data]) => {
      setStats(s)
      setRecentUsers(data.items.slice(0, 5))
      setLoading(false)
    })
  }, [])

  const statCards = [
    {
      label: "المستخدمون",
      value: loading ? "..." : String(stats.totalUsers),
      icon: <Users className="h-5 w-5" />,
      color: "text-primary",
      href: "/admin/users",
      sub: "إجمالي المستخدمين",
    },
    {
      label: "الوظائف",
      value: loading ? "..." : String(stats.totalJobs),
      icon: <Briefcase className="h-5 w-5" />,
      color: "text-chart-3",
      href: "/admin/moderate-jobs",
      sub: "إجمالي الوظائف",
    },
    {
      label: "الشركات",
      value: loading ? "..." : String(stats.totalOrgs),
      icon: <Building2 className="h-5 w-5" />,
      color: "text-chart-2",
      href: "/admin/companies",
      sub: "المنظمات المسجلة",
    },
    {
      label: "التقديمات",
      value: loading ? "..." : String(stats.totalApplications),
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-chart-4",
      href: "/admin/moderate-jobs",
      sub: "إجمالي التقديمات",
    },
  ]

  const allowedRoles = useMemo(() => ["admin"] as const, [])

  return (
    <ErrorBoundary>
      <ProtectedRoute allowedRoles={allowedRoles}>
        <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">لوحة تحكم المدير</h1>
            <p className="text-muted-foreground">مرحبًا، {user?.name ?? ""}. إليك نظرة عامة على المنصة</p>
          </div>

          {/* Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Link key={stat.label} href={stat.href}>
                <Card className="border-border bg-card transition-colors hover:border-primary/30">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-secondary ${stat.color}`}>
                      {stat.icon}
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-foreground block">{stat.value}</span>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-xs text-muted-foreground">{stat.sub}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Users */}
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground">آخر المستخدمين المسجلين</CardTitle>
                <Link href="/admin/users" className="text-sm text-primary hover:underline">عرض الكل</Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {u.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.fullName}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">{u.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={roleBadgeStyles[u.role]}>{roleLabels[u.role]}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions / Platform Health */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">صحة المنصة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-chart-3" />
                    <span className="text-sm text-foreground">إجمالي الوظائف</span>
                  </div>
                  <span className="text-sm font-bold text-chart-3">{loading ? "..." : stats.totalJobs}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <span className="text-sm text-foreground">إجمالي التقديمات</span>
                  </div>
                  <span className="text-sm font-bold text-primary">{loading ? "..." : stats.totalApplications}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-chart-2" />
                    <span className="text-sm text-foreground">المنظمات المسجلة</span>
                  </div>
                  <span className="text-sm font-bold text-chart-2">{loading ? "..." : stats.totalOrgs}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        </DashboardLayout>
      </ProtectedRoute>
    </ErrorBoundary>
  )
}

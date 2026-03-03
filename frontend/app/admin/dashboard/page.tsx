"use client"

import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Briefcase, Building2, MapPin, ShieldCheck, TrendingUp } from "lucide-react"
import { mockUsers } from "@/src/data/users"
import { jobs } from "@/src/data/jobs"
import { companies } from "@/src/data/companies"
import { governorates } from "@/src/data/governorates"
import Link from "next/link"

const statCards = [
  {
    label: "المستخدمون",
    value: String(mockUsers.length),
    icon: <Users className="h-5 w-5" />,
    color: "text-primary",
    href: "/admin/users",
    sub: `${mockUsers.filter((u) => u.role === "candidate").length} مرشح - ${mockUsers.filter((u) => u.role === "hr").length} HR`,
  },
  {
    label: "الوظائف",
    value: String(jobs.length),
    icon: <Briefcase className="h-5 w-5" />,
    color: "text-chart-3",
    href: "/admin/moderate-jobs",
    sub: `${jobs.filter((j) => j.isActive).length} نشطة`,
  },
  {
    label: "الشركات",
    value: String(companies.length),
    icon: <Building2 className="h-5 w-5" />,
    color: "text-chart-2",
    href: "/admin/companies",
    sub: `${companies.reduce((s, c) => s + c.jobCount, 0)} وظيفة إجمالي`,
  },
  {
    label: "المحافظات",
    value: String(governorates.length),
    icon: <MapPin className="h-5 w-5" />,
    color: "text-chart-4",
    href: "/admin/governorates",
    sub: `${governorates.reduce((s, g) => s + g.cities.length, 0)} مدينة`,
  },
]

const recentUsers = mockUsers.slice().reverse().slice(0, 5)

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
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">لوحة تحكم المدير</h1>
            <p className="text-muted-foreground">مرحبًا، محمد. إليك نظرة عامة على المنصة</p>
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
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
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
                        {u.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.name}</p>
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
                    <span className="text-sm text-foreground">الوظائف المعتمدة</span>
                  </div>
                  <span className="text-sm font-bold text-chart-3">{jobs.filter((j) => j.isActive).length}/{jobs.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <span className="text-sm text-foreground">إجمالي التقديمات</span>
                  </div>
                  <span className="text-sm font-bold text-primary">{jobs.reduce((s, j) => s + j.applicants, 0)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-chart-2" />
                    <span className="text-sm text-foreground">مسؤولي التوظيف</span>
                  </div>
                  <span className="text-sm font-bold text-chart-2">{mockUsers.filter((u) => u.role === "hr").length}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-chart-4" />
                    <span className="text-sm text-foreground">الشركات المسجلة</span>
                  </div>
                  <span className="text-sm font-bold text-chart-4">{companies.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

"use client"

import { useEffect, useState, useMemo } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { useAuth } from "@/src/context/auth-context"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Briefcase, Users, FileText, TrendingUp } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiJson } from "@/src/lib/api"
import { STATUS_COLOR, STATUS_LABEL } from "@/src/services/applications.service"
import type { ApplicationStatus } from "@/src/services/applications.service"

interface DashboardStats {
  totalJobs: number
  activeJobs: number
  totalApplications: number
  recentApplications: Array<{
    id: string
    status: string
    createdAt: string
    candidate: { id: string; fullName: string; email: string }
    job: { id: string; title: string }
  }>
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function HRDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [hasOrg, setHasOrg] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [statsData, orgsData] = await Promise.all([
          apiJson<DashboardStats>("/v1/orgs/dashboard-stats").catch(() => null),
          apiJson<Array<{ organization?: { name: string }; name?: string }>>("/v1/orgs/my").catch(() => []),
        ])

        if (statsData) setStats(statsData)

        const list = Array.isArray(orgsData) ? orgsData : []
        setHasOrg(list.length > 0)
        const firstOrg = list.length > 0 ? list[0] : null
        const name = firstOrg?.organization?.name ?? (firstOrg as { name?: string })?.name ?? null
        if (name) setOrgName(name)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  const totalJobs = stats?.totalJobs ?? 0
  const activeJobs = stats?.activeJobs ?? 0
  const totalApplications = stats?.totalApplications ?? 0
  const recentApplications = stats?.recentApplications ?? []
  const statusLabel = (s: string) => STATUS_LABEL[s as ApplicationStatus] ?? "قيد المراجعة"

  const statCards = [
    {
      label: "الوظائف المنشورة",
      value: String(totalJobs),
      icon: <Briefcase className="h-5 w-5" />,
      color: "text-primary",
    },
    {
      label: "إجمالي المتقدمين",
      value: String(totalApplications),
      icon: <Users className="h-5 w-5" />,
      color: "text-chart-3",
    },
    {
      label: "المقابلات هذا الأسبوع",
      value: "0",
      icon: <FileText className="h-5 w-5" />,
      color: "text-chart-2",
    },
    {
      label: "معدل القبول",
      value: "0%",
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-chart-4",
    },
  ]

  const allowedRoles = useMemo(() => ["hr"] as const, [])

  if (loading) {
    return (
      <ErrorBoundary>
        <ProtectedRoute allowedRoles={allowedRoles}>
          <DashboardLayout>
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
          </DashboardLayout>
        </ProtectedRoute>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <ProtectedRoute allowedRoles={allowedRoles}>
        <DashboardLayout>
        <div className="space-y-6">
          {!hasOrg && (
            <Card className="border-amber-500/50 bg-amber-500/10">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-foreground font-medium">
                  لم تقم بإنشاء شركتك بعد — لن تتمكن من نشر وظائف حتى تقوم بإنشاء ملف الشركة
                </p>
                <Button asChild>
                  <Link href="/hr/create-org">إنشاء الشركة الآن</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <div>
            <h1 className="text-2xl font-bold text-foreground">لوحة تحكم التوظيف</h1>
            <p className="text-muted-foreground">
              مرحبًا، {user?.name ?? ""}. إليك ملخص نشاطات التوظيف
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card key={stat.label} className="border-border bg-card">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-secondary ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-foreground block">{stat.value}</span>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Active Jobs summary */}
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground">الوظائف النشطة</CardTitle>
                <Link href="/hr/manage-jobs" className="text-sm text-primary hover:underline">
                  عرض الكل
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  لديك {activeJobs} وظيفة نشطة من إجمالي {totalJobs} وظيفة.
                </p>
              </CardContent>
            </Card>

            {/* Recent Applicants */}
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground">آخر المتقدمين</CardTitle>
                <Link href="/hr/applicants" className="text-sm text-primary hover:underline">
                  عرض الكل
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentApplications.slice(0, 4).map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {getInitials(app.candidate?.fullName ?? "مرشح")}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {app.candidate?.fullName ?? "مرشح"}
                        </p>
                        <p className="text-xs text-muted-foreground">{app.job?.title ?? "—"}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={STATUS_COLOR[statusLabel(app.status)] ?? ""}
                    >
                      {statusLabel(app.status)}
                    </Badge>
                  </div>
                ))}
                {recentApplications.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">لا يوجد متقدمون حديثون</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        </DashboardLayout>
      </ProtectedRoute>
    </ErrorBoundary>
  )
}

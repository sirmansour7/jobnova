"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/src/context/auth-context"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Briefcase, FileText, MessageSquare, Eye } from "lucide-react"
import Link from "next/link"
import { apiJson } from "@/src/lib/api"
import { STATUS_LABEL, STATUS_COLOR } from "@/src/services/applications.service"

interface RecentApplication {
  id: string
  status: string
  job: {
    id: string
    title: string
    partnerName: string
    organization?: { name: string }
  }
}

interface RecentJob {
  id: string
  title: string
  partnerName: string
  governorate?: string
  city?: string
  organization?: { id: string; name: string }
}

interface SavedJobStub {
  id: string
  jobId: string
  job: { id: string }
}

interface ApplicationsMyResponse {
  items?: RecentApplication[]
  total?: number
  page?: number
  totalPages?: number
}

export default function CandidateDashboard() {
  const { user } = useAuth()
  const [applications, setApplications] = useState<RecentApplication[]>([])
  const [applicationsTotal, setApplicationsTotal] = useState(0)
  const [jobs, setJobs] = useState<RecentJob[]>([])
  const [savedJobs, setSavedJobs] = useState<SavedJobStub[]>([])
  const [interviewsCount, setInterviewsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiJson<RecentApplication[] | ApplicationsMyResponse>("/v1/applications/my?page=1&limit=4")
        .then((r) => {
          if (Array.isArray(r)) return { items: r.slice(0, 4), total: r.length }
          const items = (r.items ?? []).slice(0, 4)
          const total = typeof (r as ApplicationsMyResponse).total === "number" ? (r as ApplicationsMyResponse).total : items.length
          return { items, total }
        })
        .catch(() => ({ items: [] as RecentApplication[], total: 0 })),
      apiJson<RecentJob[] | { items: RecentJob[] }>("/v1/jobs?limit=3")
        .then((r) => (Array.isArray(r) ? r : r.items ?? []).slice(0, 3))
        .catch(() => [] as RecentJob[]),
      apiJson<SavedJobStub[] | { items?: SavedJobStub[] }>("/v1/saved-jobs")
        .then((r) => (Array.isArray(r) ? r : r.items ?? []))
        .catch(() => [] as SavedJobStub[]),
      apiJson<unknown[]>("/v1/interviews")
        .then((r) => (Array.isArray(r) ? r.length : 0))
        .catch(() => 0),
    ])
      .then(([appsResult, jobsList, saved, interviews]) => {
        const apps = "items" in appsResult ? appsResult.items : []
        const total = "total" in appsResult && typeof appsResult.total === "number" ? appsResult.total : apps.length
        setApplications(apps)
        setApplicationsTotal(total)
        setJobs(jobsList)
        setSavedJobs(saved)
        setInterviewsCount(typeof interviews === "number" ? interviews : 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const statCards = [
    { label: "الطلبات المرسلة", value: loading ? <Skeleton className="h-8 w-16" /> : applicationsTotal, icon: <FileText className="h-5 w-5" />, color: "text-primary" },
    { label: "المقابلات", value: loading ? <Skeleton className="h-8 w-16" /> : interviewsCount, icon: <MessageSquare className="h-5 w-5" />, color: "text-chart-3" },
    { label: "الوظائف المحفوظة", value: loading ? <Skeleton className="h-8 w-16" /> : savedJobs.length, icon: <Briefcase className="h-5 w-5" />, color: "text-chart-2" },
    { label: "مرات الاطلاع", value: loading ? <Skeleton className="h-8 w-16" /> : 0, icon: <Eye className="h-5 w-5" />, color: "text-chart-4" },
  ]

  const allowedRoles = useMemo(() => ["candidate"] as const, [])

  return (
    <ErrorBoundary>
      <ProtectedRoute allowedRoles={allowedRoles}>
        <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">مرحبًا، {user?.name ?? "..."}</h1>
            <p className="text-muted-foreground">إليك ملخص نشاطك على JobNova</p>
          </div>

          {/* Stats */}
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
            {/* Recent Applications */}
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground">آخر الطلبات</CardTitle>
                <Link href="/candidate/applications" className="text-sm text-primary hover:underline">عرض الكل</Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
                ) : applications.length === 0 ? (
                  <p className="text-center py-4 text-sm text-muted-foreground">لا توجد طلبات بعد</p>
                ) : (
                  applications.map((app) => {
                    const statusLabel =
                      STATUS_LABEL[app.status as keyof typeof STATUS_LABEL] ?? app.status
                    const logo = (app.job.organization?.name ?? app.job.partnerName ?? "?").slice(0, 2).toUpperCase()
                    return (
                      <div key={app.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                            {logo}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{app.job.title}</p>
                            <p className="text-xs text-muted-foreground">{app.job.organization?.name ?? app.job.partnerName}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={STATUS_COLOR[statusLabel] ?? ""}>
                          {statusLabel}
                        </Badge>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            {/* Recommended Jobs */}
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground">وظائف مقترحة</CardTitle>
                <Link href="/jobs" className="text-sm text-primary hover:underline">عرض الكل</Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
                ) : jobs.length === 0 ? (
                  <p className="text-center py-4 text-sm text-muted-foreground">لا توجد وظائف متاحة</p>
                ) : (
                  jobs.map((job) => {
                    const logo = (job.organization?.name ?? job.partnerName ?? "?").slice(0, 2).toUpperCase()
                    const location = [job.city, job.governorate].filter(Boolean).join("، ") || "—"
                    return (
                      <Link key={job.id} href={`/jobs/${job.id}`} className="block rounded-lg border border-border bg-secondary/30 p-3 transition-colors hover:border-primary/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                              {logo}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{job.title}</p>
                              <p className="text-xs text-muted-foreground">{job.organization?.name ?? job.partnerName} - {location}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="border-primary/20 text-primary">دوام كامل</Badge>
                        </div>
                      </Link>
                    )
                  })
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

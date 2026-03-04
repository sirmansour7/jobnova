"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/src/context/auth-context"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Briefcase, FileText, MessageSquare, Eye } from "lucide-react"
import Link from "next/link"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://jobnova-production.up.railway.app"

function getToken(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/jobnova_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

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

export default function CandidateDashboard() {
  const { user } = useAuth()
  const [applications, setApplications] = useState<RecentApplication[]>([])
  const [jobs, setJobs] = useState<RecentJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }

    Promise.all([
      fetch(`${API_URL}/v1/applications/my`, { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/v1/jobs?isActive=true`, { headers }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([apps, jobsList]) => {
        setApplications(Array.isArray(apps) ? apps.slice(0, 4) : [])
        setJobs(Array.isArray(jobsList) ? jobsList.slice(0, 3) : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const statusLabelMap: Record<string, string> = {
    APPLIED: "قيد المراجعة",
    SHORTLISTED: "مقبول مبدئيًا",
    REJECTED: "مرفوض",
    HIRED: "مقبول",
  }
  const statusColors: Record<string, string> = {
    "قيد المراجعة": "bg-chart-4/10 text-chart-4 border-chart-4/20",
    "مقبول مبدئيًا": "bg-chart-2/10 text-chart-2 border-chart-2/20",
    "مرفوض": "bg-destructive/10 text-destructive border-destructive/20",
    "مقبول": "bg-chart-3/10 text-chart-3 border-chart-3/20",
  }

  const statCards = [
    { label: "الطلبات المرسلة", value: loading ? <Skeleton className="h-8 w-16" /> : applications.length, icon: <FileText className="h-5 w-5" />, color: "text-primary" },
    { label: "المقابلات", value: loading ? <Skeleton className="h-8 w-16" /> : applications.filter((a) => a.status === "SHORTLISTED").length, icon: <MessageSquare className="h-5 w-5" />, color: "text-chart-3" },
    { label: "الوظائف المحفوظة", value: loading ? <Skeleton className="h-8 w-16" /> : jobs.length, icon: <Briefcase className="h-5 w-5" />, color: "text-chart-2" },
    { label: "مرات الاطلاع", value: loading ? <Skeleton className="h-8 w-16" /> : applications.length * 5, icon: <Eye className="h-5 w-5" />, color: "text-chart-4" },
  ]

  return (
    <ProtectedRoute allowedRoles={["candidate"]}>
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
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
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
                    const statusLabel = statusLabelMap[app.status] ?? app.status
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
                        <Badge variant="outline" className={statusColors[statusLabel] ?? ""}>
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
  )
}

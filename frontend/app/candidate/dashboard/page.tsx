"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/src/context/auth-context"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Briefcase, FileText, MessageSquare, Eye, CheckCircle2, XCircle, Rocket, BookOpen, RefreshCw } from "lucide-react"
import Link from "next/link"
import { apiJson } from "@/src/lib/api"
import { STATUS_LABEL, STATUS_COLOR } from "@/src/services/applications.service"

// ─── CV Feedback types ────────────────────────────────────────────────────────
interface CvFeedback {
  score: number
  strengths: string[]
  weaknesses: string[]
  improvements: string[]
  recommendedSkills: string[]
  analyzedAt: string
}

// ─── Score ring component ─────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 30
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444"
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-20 w-20">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 76 76">
          <circle cx="38" cy="38" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-secondary" />
          <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-foreground">{score}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">جودة السيرة</span>
    </div>
  )
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
  const [cvFeedback, setCvFeedback] = useState<CvFeedback | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(true)
  const [reanalyzing, setReanalyzing] = useState(false)

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

  // Fetch CV feedback separately (non-blocking)
  useEffect(() => {
    apiJson<CvFeedback | null>("/v1/cv/me/feedback")
      .then((fb) => setCvFeedback(fb))
      .catch(() => setCvFeedback(null))
      .finally(() => setFeedbackLoading(false))
  }, [])

  const handleReanalyze = async () => {
    setReanalyzing(true)
    try {
      await apiJson("/v1/cv/re-analyze-pdf", { method: "POST" })
      // Poll after 8 seconds for updated feedback
      setTimeout(() => {
        apiJson<CvFeedback | null>("/v1/cv/me/feedback")
          .then((fb) => setCvFeedback(fb))
          .catch(() => {})
          .finally(() => setReanalyzing(false))
      }, 8000)
    } catch {
      setReanalyzing(false)
    }
  }

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

          {/* ── CV Analysis Section ─────────────────────────────────────── */}
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                تحليل السيرة الذاتية
              </CardTitle>
              <div className="flex gap-2">
                {cvFeedback && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs text-muted-foreground"
                    disabled={reanalyzing}
                    onClick={handleReanalyze}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${reanalyzing ? "animate-spin" : ""}`} />
                    {reanalyzing ? "جاري التحليل..." : "إعادة التحليل"}
                  </Button>
                )}
                <Link href="/candidate/cv-builder">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Rocket className="h-3.5 w-3.5" />
                    تحسين سيرتي
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {feedbackLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
                </div>
              ) : !cvFeedback ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="rounded-full bg-secondary p-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">لم يتم تحليل سيرتك الذاتية بعد</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      ارفع سيرتك الذاتية كـ PDF في صفحة المقابلة لتحصل على تحليل AI فوري
                    </p>
                  </div>
                  <Link href="/candidate/cv-builder">
                    <Button size="sm" className="mt-2 gap-1.5">
                      <Rocket className="h-4 w-4" />
                      أنشئ سيرتك الذاتية الآن
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Score header */}
                  <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:gap-6">
                    <ScoreRing score={cvFeedback.score} />
                    <div className="flex-1 text-center sm:text-right">
                      <p className="text-lg font-semibold text-foreground">
                        {cvFeedback.score >= 80 ? "سيرتك الذاتية ممتازة 🎉"
                          : cvFeedback.score >= 60 ? "سيرتك الذاتية جيدة ✅"
                          : cvFeedback.score >= 40 ? "سيرتك الذاتية تحتاج تحسين ⚠️"
                          : "سيرتك الذاتية تحتاج مراجعة شاملة ❌"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        آخر تحليل: {new Date(cvFeedback.analyzedAt).toLocaleDateString("ar-EG")}
                      </p>
                    </div>
                  </div>

                  {/* 4-column feedback grid */}
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" dir="rtl">
                    {/* Strengths */}
                    {cvFeedback.strengths.length > 0 && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">نقاط القوة</span>
                        </div>
                        <ul className="space-y-1.5">
                          {cvFeedback.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                              <span className="mt-0.5 text-emerald-500">•</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Weaknesses */}
                    {cvFeedback.weaknesses.length > 0 && (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">نقاط الضعف</span>
                        </div>
                        <ul className="space-y-1.5">
                          {cvFeedback.weaknesses.map((w, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                              <span className="mt-0.5 text-red-500">•</span>
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Improvements */}
                    {cvFeedback.improvements.length > 0 && (
                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Rocket className="h-4 w-4 text-blue-500 shrink-0" />
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">تحسينات مقترحة</span>
                        </div>
                        <ul className="space-y-1.5">
                          {cvFeedback.improvements.map((imp, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                              <span className="mt-0.5 text-blue-500">→</span>
                              {imp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommended Skills */}
                    {cvFeedback.recommendedSkills.length > 0 && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <BookOpen className="h-4 w-4 text-amber-500 shrink-0" />
                          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">مهارات لازم تتعلمها</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {cvFeedback.recommendedSkills.map((sk, i) => (
                            <span key={i} className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </DashboardLayout>
      </ProtectedRoute>
    </ErrorBoundary>
  )
}

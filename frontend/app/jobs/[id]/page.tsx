"use client"

import { use, useState, useEffect, useCallback } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { MapPin, Clock, Users, Banknote, Calendar, Building2, CheckCircle2, Loader2, Copy, Bookmark, BookmarkCheck } from "lucide-react"
import Link from "next/link"
import { api, apiJson } from "@/src/lib/api"
import type { JobListItem } from "@/src/services/jobs.service"
import { JobMatchPanel } from "@/components/jobs/JobMatchPanel"
import { useAuth } from "@/src/context/auth-context"

interface Job {
  id: string
  title: string
  partnerName?: string
  description?: string
  governorate?: string
  city?: string
  category?: string
  isActive: boolean
  createdAt?: string
  organization?: { id: string; name: string }
  _count?: { applications: number }
  companyId?: string
  companyName?: string
  companyLogo?: string
  location?: string
  type?: string
  experience?: string
  salaryMin?: number
  salaryMax?: number
  currency?: string
  salary?: string
  requirements?: string[]
  skills?: string[]
  postedAt?: string
  deadline?: string
  applicants?: number
}

/** API response shape for GET /v1/jobs/:id */
interface JobResponse {
  id: string
  title: string
  partnerName?: string
  description?: string
  governorate?: string
  city?: string
  category?: string
  createdAt?: string
  organization?: { id: string; name: string }
  _count?: { applications: number }
  salary?: string
  salaryMin?: number
  salaryMax?: number
  currency?: string
  requirements?: string[]
  skills?: string[]
  deadline?: string | null
  jobType?: string
}

const AR_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
}

function formatArDate(iso: string | undefined | null): string {
  if (!iso) return "غير محدد"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "غير محدد"
  return d.toLocaleDateString("ar-EG", AR_DATE_OPTIONS)
}

const renderSalary = (min?: number, max?: number, currency?: string) => {
  if (!min && !max) return <span>غير محدد</span>
  const curr = currency === "EGP" ? "جنيه" : (currency ?? "جنيه")
  const fmt = (n: number) => n.toLocaleString("en-US")
  if (min && max) return <span dir="ltr" className="inline-block">{fmt(min)} - {fmt(max)} <span dir="rtl">{curr}</span></span>
  if (min) return <span dir="ltr" className="inline-block">من {fmt(min)} <span dir="rtl">{curr}</span></span>
  if (max) return <span dir="ltr" className="inline-block">حتى {fmt(max)} <span dir="rtl">{curr}</span></span>
  return <span>غير محدد</span>
}

const formatRelativeDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return { relative: "اليوم", exact: date.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) }
  if (diffDays === 1) return { relative: "منذ يوم", exact: date.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) }
  if (diffDays < 7) return { relative: `منذ ${diffDays} أيام`, exact: date.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) }
  if (diffDays < 30) return { relative: `منذ ${Math.floor(diffDays / 7)} أسابيع`, exact: date.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) }
  return { relative: `منذ ${Math.floor(diffDays / 30)} أشهر`, exact: date.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) }
}

const formatDeadline = (deadline?: string) => {
  if (!deadline) return { text: "مفتوح حتى إشعار آخر", urgent: false }
  const date = new Date(deadline)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { text: "انتهى التقديم", urgent: true }
  if (diffDays === 0) return { text: "ينتهي اليوم", urgent: true }
  if (diffDays <= 3) return { text: `ينتهي خلال ${diffDays} أيام`, urgent: true }
  if (diffDays <= 7) return { text: `ينتهي خلال ${diffDays} أيام`, urgent: false }
  return { text: date.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }), urgent: false }
}

function mapApiJobToJob(j: JobResponse): Job {
  return {
    id: j.id,
    title: j.title,
    companyId: j.organization?.id ?? "",
    companyName: j.organization?.name ?? j.partnerName ?? "—",
    companyLogo: (j.organization?.name ?? "?").slice(0, 2).toUpperCase(),
    location: [j.city, j.governorate].filter(Boolean).join("، ") || "—",
    governorate: j.governorate ?? "",
    type: (j.jobType as Job["type"]) ?? "دوام كامل",
    experience: "1-3 سنوات",
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    currency: j.currency ?? "EGP",
    salary: j.salary ?? undefined,
    description: j.description ?? "",
    requirements: Array.isArray(j.requirements) ? j.requirements : [],
    skills: Array.isArray(j.skills) ? j.skills : [],
    postedAt: j.createdAt ?? new Date().toISOString(),
    deadline: j.deadline ?? "",
    applicants: j._count?.applications ?? 0,
    isActive: true,
    category: j.category ?? "",
    createdAt: j.createdAt ?? new Date().toISOString(),
  }
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const isCandidate = user?.role === "candidate"
  const [applied, setApplied] = useState(false)
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applyLoading, setApplyLoading] = useState(false)
  const [applyMessage, setApplyMessage] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [similarJobs, setSimilarJobs] = useState<JobListItem[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await apiJson<JobResponse>(`/v1/jobs/${id}`)
        if (cancelled) return
        setJob(mapApiJobToJob(data))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "حدث خطأ")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  // On load: check if user already applied (GET /v1/applications/my)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function checkApplied() {
      try {
        const data = await apiJson<{ items: Array<{ jobId: string }> }>("/v1/applications/my")
        if (cancelled) return
        const items = Array.isArray(data.items) ? data.items : []
        const alreadyApplied = items.some((a) => a.jobId === id)
        if (alreadyApplied) setApplied(true)
      } catch {
        // ignore
      }
    }
    checkApplied()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    const savedJobs = JSON.parse(localStorage.getItem("jobnova_saved_jobs") ?? "[]")
    setSaved(savedJobs.includes(job?.id))
  }, [job?.id])

  useEffect(() => {
    if (!job?.category) return
    apiJson<{ items: JobListItem[] }>(`/v1/jobs?category=${encodeURIComponent(job.category)}&limit=3`)
      .then((data) => {
        setSimilarJobs((data.items ?? []).filter((j) => j.id !== job.id).slice(0, 3))
      })
      .catch(() => {})
  }, [job?.category, job?.id])

  const handleSave = useCallback(() => {
    const savedJobs: string[] = JSON.parse(localStorage.getItem("jobnova_saved_jobs") ?? "[]")
    const newSaved = saved
      ? savedJobs.filter((id) => id !== job?.id)
      : [...savedJobs, job?.id].filter(Boolean)
    localStorage.setItem("jobnova_saved_jobs", JSON.stringify(newSaved))
    setSaved(!saved)
  }, [saved, job?.id])

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  async function handleApply() {
    setApplyLoading(true)
    setApplyMessage(null)
    try {
      const res = await api("/v1/applications", {
        method: "POST",
        body: JSON.stringify({ jobId: id }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.status === 201) {
        setApplied(true)
        setApplyMessage("تم التقديم بنجاح ✓")
      } else if (res.status === 409) {
        setApplied(true)
        setApplyMessage("لقد تقدمت لهذه الوظيفة من قبل")
      } else if (res.status === 401) {
        setApplyMessage("يجب تسجيل الدخول أولاً")
      } else {
        setApplyMessage(typeof body?.message === "string" ? body.message : "حدث خطأ، حاول مرة أخرى")
      }
    } catch {
      setApplyMessage("حدث خطأ، حاول مرة أخرى")
    } finally {
      setApplyLoading(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (error || !job) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg font-medium text-foreground">{error ?? "الوظيفة غير موجودة"}</p>
            <Link href="/jobs" className="mt-4 text-primary hover:underline">
              العودة للوظائف
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  const pubDate = job.postedAt ? formatRelativeDate(job.postedAt) : null
  const deadlineInfo = formatDeadline(job.deadline)

  const parseDescription = (text: string): {
    summary: string
    sections: { title: string; items: string[] }[]
  } => {
    if (!text?.trim()) return { summary: "", sections: [] }

    const DELIMITERS = [
      { key: "المسؤوليات الأساسية", pattern: /المسؤوليات[^:]*:/ },
      { key: "المتطلبات", pattern: /المتطلبات[^:]*:/ },
      { key: "المهارات المطلوبة", pattern: /المهارات[^:]*:/ },
      { key: "المزايا", pattern: /المزايا[^:]*:/ },
    ]

    // Find all section positions
    const found: { key: string; index: number; endIndex: number }[] = []
    for (const d of DELIMITERS) {
      const match = d.pattern.exec(text)
      if (match) {
        found.push({ key: d.key, index: match.index, endIndex: match.index + match[0].length })
      }
    }

    if (found.length === 0) {
      // No sections found — put everything as summary
      return { summary: text.trim(), sections: [] }
    }

    // Sort by position
    found.sort((a, b) => a.index - b.index)

    // Extract summary (text before first section)
    const summary = text.substring(0, found[0].index).trim().replace(/\.$/, "")

    // Extract sections
    const sections: { title: string; items: string[] }[] = []
    for (let i = 0; i < found.length; i++) {
      const start = found[i].endIndex
      const end = i + 1 < found.length ? found[i + 1].index : text.length
      const content = text.substring(start, end).trim()
      const items = content
        .split(/،|,|\n/)
        .map(s => s.trim().replace(/\.$/, "").replace(/^[-•*]\s*/, ""))
        .filter(s => s.length > 2)
      sections.push({ title: found[i].key, items })
    }

    return { summary, sections }
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-primary font-bold text-xl">
                    {(job.companyName ?? job.partnerName ?? "JN").slice(0, 2)}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">{job.title}</h1>
                    <p className="text-muted-foreground">{job.companyName}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-primary/20 text-primary">
                        {job.type}
                      </Badge>
                      <Badge variant="outline" className="border-border">
                        {job.experience}
                      </Badge>
                      {job.category ? (
                        <Badge variant="outline" className="border-border">
                          {job.category}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {isCandidate && <JobMatchPanel jobId={id} />}
                  <div className="flex flex-wrap items-center gap-2">
                    {applied ? (
                      <Button disabled className="gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        تم التقديم
                      </Button>
                    ) : (
                      <Button onClick={handleApply} disabled={applyLoading} className="gap-2">
                        {applyLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            جاري التقديم...
                          </>
                        ) : (
                          "تقدم لهذه الوظيفة"
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSave}
                      className="gap-2"
                    >
                      {saved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
                      {saved ? "محفوظة" : "حفظ"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      {copied ? "تم النسخ!" : "نسخ الرابط"}
                    </Button>
                  </div>
                  {applyMessage && (
                    <p
                      className={`text-sm ${
                        applyMessage.startsWith("تم") || applyMessage.includes("من قبل")
                          ? "text-green-600"
                          : "text-destructive"
                      }`}
                    >
                      {applyMessage}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="space-y-6 lg:col-span-2">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground">وصف الوظيفة</CardTitle>
                </CardHeader>
                <CardContent>
                  {job.description ? (() => {
                    const parsed = parseDescription(job.description)
                    return (
                      <div className="space-y-4 text-sm leading-relaxed" dir="rtl">
                        {parsed.summary && (
                          <div>
                            <h3 className="font-semibold text-foreground mb-2">ملخص</h3>
                            <p className="text-muted-foreground">{parsed.summary}</p>
                          </div>
                        )}
                        {parsed.sections.map((section) => (
                          <div key={section.title}>
                            <h3 className="font-semibold text-foreground mb-2">{section.title}</h3>
                            <ul className="space-y-1">
                              {section.items.map((item, i) => (
                                <li key={i} className="flex gap-2 text-muted-foreground">
                                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary mt-2" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )
                  })() : (
                    <p className="text-muted-foreground text-sm">لا يوجد وصف متاح لهذه الوظيفة.</p>
                  )}
                </CardContent>
              </Card>

              {job.requirements && job.requirements.length > 0 && (
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-foreground">المتطلبات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {job.requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-2 text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {job.skills && job.skills.length > 0 && (
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-foreground">المهارات المطلوبة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground">تفاصيل الوظيفة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">الموقع</p>
                      <p className="text-sm text-foreground">{job.location}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">الراتب</p>
                      <p className="text-sm text-foreground">
                        {renderSalary(job.salaryMin, job.salaryMax, job.currency)}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">الخبرة</p>
                      <p className="text-sm text-foreground">{job.experience}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">عدد المتقدمين</p>
                      <p className="text-sm text-foreground">{job.applicants} متقدم</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">تاريخ النشر</p>
                      <p className="text-sm text-foreground">
                        <span title={pubDate?.exact}>{pubDate?.relative ?? "—"}</span>
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">آخر موعد للتقديم</p>
                      <p className="text-sm text-foreground">
                        <span className={deadlineInfo.urgent ? "text-destructive font-medium" : ""}>
                          {deadlineInfo.text}
                        </span>
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">الشركة</p>
                      <p className="text-sm text-foreground">{job.companyName}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {similarJobs.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">وظائف مشابهة</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {similarJobs.map((similar) => (
                  <Link
                    key={similar.id}
                    href={`/jobs/${similar.id}`}
                    className="rounded-xl border border-border bg-card p-4 hover:border-primary transition-colors block"
                  >
                    <p className="font-medium text-sm text-foreground line-clamp-2">{similar.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{similar.partnerName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{similar.governorate}</p>
                    {similar.salaryMin != null && similar.salaryMax != null && (
                      <p className="text-xs text-primary mt-2">
                        {similar.salaryMin.toLocaleString("ar-EG")} - {similar.salaryMax.toLocaleString("ar-EG")} جنيه
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

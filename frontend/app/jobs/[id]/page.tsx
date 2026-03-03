"use client"

import { use, useState, useEffect } from "react"
import { getCookie } from "cookies-next"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { MapPin, Clock, Users, Banknote, Calendar, Building2, CheckCircle2, Loader2 } from "lucide-react"
import type { Job } from "@/src/data/jobs"
import Link from "next/link"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
const TOKEN_COOKIE = "jobnova_token"

/** Reads raw JWT from jobnova_token cookie for Authorization header. */
function getAuthToken(): string | null {
  const value = getCookie(TOKEN_COOKIE)
  if (value == null || value === "") return null
  return value as string
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
  requirements?: string[]
  skills?: string[]
  deadline?: string | null
  jobType?: string
}

/** Application item from GET /v1/applications/my */
interface MyApplicationItem {
  id: string
  jobId: string
  job?: { id: string; title?: string }
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
    salaryMin: 0,
    salaryMax: 0,
    currency: "جنيه مصري",
    salary: j.salary ?? undefined,
    description: j.description ?? "",
    requirements: Array.isArray(j.requirements) ? j.requirements : [],
    skills: Array.isArray(j.skills) ? j.skills : [],
    postedAt: j.createdAt ?? new Date().toISOString(),
    deadline: j.deadline ?? "",
    applicants: j._count?.applications ?? 0,
    isActive: true,
    category: j.category ?? "",
  }
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [applied, setApplied] = useState(false)
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applyLoading, setApplyLoading] = useState(false)
  const [applyMessage, setApplyMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_URL}/v1/jobs/${id}`, {
          headers: { "Content-Type": "application/json" },
        })
        if (!res.ok) {
          if (res.status === 404) {
            setJob(null)
            return
          }
          throw new Error("فشل تحميل الوظيفة")
        }
        const data = await res.json()
        if (cancelled) return
        setJob(mapApiJobToJob(data))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "حدث خطأ")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  // On load: check if user already applied (GET /v1/applications/my)
  useEffect(() => {
    if (!id) return
    const token = getAuthToken()
    if (!token) return
    let cancelled = false
    async function checkApplied() {
      try {
        const res = await fetch(`${API_URL}/v1/applications/my`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok || cancelled) return
        const data: MyApplicationItem[] = await res.json()
        if (cancelled) return
        const alreadyApplied = Array.isArray(data) && data.some((a) => a.jobId === id || a.job?.id === id)
        if (alreadyApplied) setApplied(true)
      } catch {
        // ignore
      }
    }
    checkApplied()
    return () => { cancelled = true }
  }, [id])

  async function handleApply() {
    const token = getAuthToken()
    if (!token) {
      setApplyMessage("يجب تسجيل الدخول أولاً")
      return
    }
    setApplyLoading(true)
    setApplyMessage(null)
    try {
      const res = await fetch(`${API_URL}/v1/applications`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
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
            <Link href="/jobs" className="mt-4 text-primary hover:underline">العودة للوظائف</Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
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
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                    {job.companyLogo}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">{job.title}</h1>
                    <p className="text-muted-foreground">{job.companyName}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-primary/20 text-primary">{job.type}</Badge>
                      <Badge variant="outline" className="border-border">{job.experience}</Badge>
                      {job.category ? <Badge variant="outline" className="border-border">{job.category}</Badge> : null}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
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
                  {applyMessage && (
                    <p className={`text-sm ${applyMessage.startsWith("تم") || applyMessage.includes("من قبل") ? "text-green-600" : "text-destructive"}`}>
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
                <CardHeader><CardTitle className="text-foreground">وصف الوظيفة</CardTitle></CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">{job.description}</p>
                </CardContent>
              </Card>

              {job.requirements && job.requirements.length > 0 && (
                <Card className="border-border bg-card">
                  <CardHeader><CardTitle className="text-foreground">المتطلبات</CardTitle></CardHeader>
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
                  <CardHeader><CardTitle className="text-foreground">المهارات المطلوبة</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map((skill) => (
                        <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="border-border bg-card">
                <CardHeader><CardTitle className="text-foreground">تفاصيل الوظيفة</CardTitle></CardHeader>
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
                      <p className="text-sm text-foreground">{job.salary?.trim() ? job.salary : "غير محدد"}</p>
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
                      <p className="text-sm text-foreground">{formatArDate(job.postedAt)}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">آخر موعد للتقديم</p>
                      <p className="text-sm text-foreground">{formatArDate(job.deadline || undefined)}</p>
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
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

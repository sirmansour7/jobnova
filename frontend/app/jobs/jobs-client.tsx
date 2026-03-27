"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Bookmark, Sparkles } from "lucide-react"
import { useJobs, type JobListItem } from "@/src/services/jobs.service"
import Link from "next/link"
import { useAuth } from "@/src/context/auth-context"
import { apiJson } from "@/src/lib/api"

// Maps Arabic UI labels → backend enum values (must match Prisma JobCategory / JobType enums)
const JOB_CATEGORIES: { value: string; label: string }[] = [
  { value: "TECHNOLOGY",       label: "تكنولوجيا المعلومات" },
  { value: "FINANCE",          label: "المالية والمحاسبة"   },
  { value: "MARKETING",        label: "التسويق"              },
  { value: "SALES",            label: "المبيعات"             },
  { value: "HR",               label: "الموارد البشرية"      },
  { value: "ENGINEERING",      label: "الهندسة"              },
  { value: "CUSTOMER_SERVICE", label: "خدمة العملاء"         },
  { value: "HEALTHCARE",       label: "الصحة والطب"          },
  { value: "EDUCATION",        label: "التعليم"              },
  { value: "LEGAL",            label: "القانون"              },
  { value: "OPERATIONS",       label: "الإدارة والعمليات"    },
  { value: "DESIGN",           label: "التصميم"              },
  { value: "OTHER",            label: "أخرى"                 },
]

const JOB_TYPES: { value: string; label: string }[] = [
  { value: "FULL_TIME",  label: "دوام كامل" },
  { value: "PART_TIME",  label: "دوام جزئي" },
  { value: "INTERNSHIP", label: "تدريب"      },
  { value: "FREELANCE",  label: "عمل حر"    },
  { value: "REMOTE",     label: "عن بعد"    },
  { value: "CONTRACT",   label: "عقد / مشروع" },
]

// Upper bound of experience range → backend maxExperience filter
// undefined means "no upper limit" (5+ years)
const EXPERIENCE_LEVELS: { value: number | undefined; label: string }[] = [
  { value: 0,         label: "حديث تخرج"   },
  { value: 3,         label: "1-3 سنوات"   },
  { value: 5,         label: "3-5 سنوات"   },
  { value: undefined, label: "5+ سنوات"    },
]

const getRelativeDate = (dateStr: string) => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return "اليوم"
  if (diff === 1) return "منذ يوم"
  if (diff < 7) return `منذ ${diff} أيام`
  if (diff < 30) return `منذ ${Math.floor(diff / 7)} أسابيع`
  return `منذ ${Math.floor(diff / 30)} أشهر`
}

const LIMIT = 12

interface SavedJobItem {
  id: string
  jobId: string
  job: { id: string }
}

export default function JobsClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1)

  const [governorates, setGovernorates]   = useState<string[]>([])
  const [search, setSearch]               = useState("")
  const [selectedType, setSelectedType]   = useState<string>("all")
  const [selectedGov, setSelectedGov]     = useState<string>("all")
  // "all" = no filter; otherwise the string representation of maxExperience (or "unlimited")
  const [selectedExp, setSelectedExp]     = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [recommendedOnly, setRecommendedOnly] = useState(false)

  useEffect(() => {
    apiJson<{ items: { name: string }[] }>("/v1/governorates?limit=100")
      .then((res) => setGovernorates(res.items.map((g) => g.name)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (user?.role !== "candidate") return
    apiJson<SavedJobItem[]>("/v1/saved-jobs")
      .then((list) => setSavedJobIds(new Set((list ?? []).map((s) => s.jobId))))
      .catch(() => setSavedJobIds(new Set()))
  }, [user?.role])

  const handleToggleSave = useCallback(
    async (jobId: string) => {
      if (togglingId) return
      setTogglingId(jobId)
      try {
        const res = await apiJson<{ saved: boolean }>(`/v1/saved-jobs/${jobId}`, { method: "POST" })
        setSavedJobIds((prev) => {
          const next = new Set(prev)
          if (res.saved) next.add(jobId)
          else next.delete(jobId)
          return next
        })
      } catch {
        // keep UI state unchanged on error
      } finally {
        setTogglingId(null)
      }
    },
    [togglingId]
  )

  // Resolve experience selection → maxExperience number (or undefined = no cap)
  // "unlimited" is the sentinel for "5+ years" (no upper bound).
  const maxExperience: number | undefined = (() => {
    if (selectedExp === "all" || selectedExp === "unlimited") return undefined
    const n = Number(selectedExp)
    return isNaN(n) ? undefined : n
  })()

  const { jobs, total, totalPages, loading, error } = useJobs({
    category:      selectedCategory !== "all" ? selectedCategory : undefined,
    jobType:       selectedType     !== "all" ? selectedType     : undefined,
    governorate:   selectedGov      !== "all" ? selectedGov      : undefined,
    search:        search.trim()    || undefined,
    maxExperience: selectedExp      !== "all" ? maxExperience    : undefined,
    page,
    limit: LIMIT,
  })

  const goToPage = (nextPage: number) => {
    router.push(`/jobs?page=${nextPage}`)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const allowedRoles = useMemo(() => ["candidate"] as const, [])

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">الوظائف المتاحة</h1>
            <p className="text-muted-foreground">
              {loading ? "جاري التحميل..." : error ? error : `تصفح ${total} وظيفة متاحة في مصر`}
            </p>
          </div>

          {/* Filters */}
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="ابحث عن وظيفة أو شركة..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onBlur={() => { if (page !== 1) router.replace("/jobs?page=1") }}
                    className="pe-10"
                  />
                </div>
                <Select
                  value={selectedCategory}
                  onValueChange={(v) => {
                    setSelectedCategory(v)
                    if (page !== 1) router.replace("/jobs?page=1")
                  }}
                >
                  <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="التخصص" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل التخصصات</SelectItem>
                    {JOB_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedGov}
                  onValueChange={(v) => {
                    setSelectedGov(v)
                    if (page !== 1) router.replace("/jobs?page=1")
                  }}
                >
                  <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="المحافظة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المحافظات</SelectItem>
                    {governorates.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedType}
                  onValueChange={(v) => {
                    setSelectedType(v)
                    if (page !== 1) router.replace("/jobs?page=1")
                  }}
                >
                  <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="نوع العمل" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأنواع</SelectItem>
                    {JOB_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedExp}
                  onValueChange={(v) => {
                    setSelectedExp(v)
                    if (page !== 1) router.replace("/jobs?page=1")
                  }}
                >
                  <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="الخبرة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المستويات</SelectItem>
                    {EXPERIENCE_LEVELS.map((e) => {
                      const v = e.value === undefined ? "unlimited" : String(e.value)
                      return <SelectItem key={v} value={v}>{e.label}</SelectItem>
                    })}
                  </SelectContent>
                </Select>
                {/* Recommended only toggle — only visible to candidates who have CV data */}
                {user?.role === "candidate" && (
                  <Button
                    variant={recommendedOnly ? "default" : "outline"}
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => {
                      setRecommendedOnly((v) => !v)
                      if (page !== 1) router.replace("/jobs?page=1")
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    مناسب لي
                  </Button>
                )}
                {/* Clear all filters */}
                {(selectedCategory !== "all" || selectedType !== "all" || selectedGov !== "all" || selectedExp !== "all" || search || recommendedOnly) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSelectedCategory("all")
                      setSelectedType("all")
                      setSelectedGov("all")
                      setSelectedExp("all")
                      setSearch("")
                      setRecommendedOnly(false)
                      if (page !== 1) router.replace("/jobs?page=1")
                    }}
                  >
                    مسح الفلاتر ✕
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">جاري التحميل...</p>
            ) : error ? (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-lg font-medium text-destructive">{error}</p>
                </CardContent>
              </Card>
            ) : (
              <>
            {(() => {
              const visibleJobs = recommendedOnly ? jobs.filter((j) => j.isRecommended) : jobs
              const recommendedCount = jobs.filter((j) => j.isRecommended).length
              return (
                <p className="text-sm text-muted-foreground">
                  {recommendedOnly ? visibleJobs.length : total} نتيجة
                  {recommendedCount > 0 && !recommendedOnly && (
                    <span className="mr-2 text-emerald-600 dark:text-emerald-400">
                      · {recommendedCount} مناسبة لك
                    </span>
                  )}
                </p>
              )
            })()}
            {(recommendedOnly ? jobs.filter((j) => j.isRecommended) : jobs).length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-lg font-medium text-foreground">لا توجد نتائج</p>
                  <p className="text-sm text-muted-foreground">جرب تغيير معايير البحث</p>
                </CardContent>
              </Card>
            ) : (
              <>
              {(recommendedOnly ? jobs.filter((j) => j.isRecommended) : jobs).map((job) => (
                <div
                  key={job.id}
                  className={`relative rounded-xl border bg-card p-4 hover:bg-card/80 transition-all ${
                    job.isRecommended
                      ? "border-emerald-500/40 hover:border-emerald-500/60"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Link href={`/jobs/${job.id}`} className="block">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-primary font-bold text-sm">
                        {(job.organization?.name ?? job.partnerName ?? "JN").slice(0, 2)}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0" dir="rtl">
                        <h3 className="font-semibold text-foreground text-base truncate">{job.title}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {job.organization?.name ?? job.partnerName ?? "—"}
                          {(job.city || job.governorate) && (
                            <span> · {job.city ?? job.governorate}{job.city && job.governorate ? `، ${job.governorate}` : ""}</span>
                          )}
                        </p>
                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {/* "مناسب لك" recommendation badge with score */}
                          {job.isRecommended && job.matchScore !== undefined && (() => {
                            const score = job.matchScore
                            const isExcellent = score >= 80
                            return (
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                isExcellent
                                  ? "border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400"
                                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              }`}>
                                {isExcellent ? "🔥" : <Sparkles className="h-3 w-3" />}
                                مناسب لك · {score}%
                              </span>
                            )
                          })()}
                          {job.category && (
                            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary font-medium">
                              {job.category}
                            </span>
                          )}
                          {job.jobType && (
                            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                              {job.jobType}
                            </span>
                          )}
                        </div>
                        {/* Matched skills hint */}
                        {job.matchedSkills && job.matchedSkills.length > 0 && (
                          <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                            ✓ {job.matchedSkills.slice(0, 4).join("، ")}
                            {job.matchedSkills.length > 4 && ` +${job.matchedSkills.length - 4}`} متطابقة
                          </p>
                        )}
                        {/* Footer */}
                        <div className="flex items-center flex-wrap gap-3 mt-2.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            🕐 {job.createdAt ? getRelativeDate(job.createdAt) : "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            👥 {job._count?.applications ?? 0} متقدم
                          </span>
                          {job.salaryMin != null && job.salaryMax != null && (
                            <span className="text-green-500 font-medium" dir="ltr">
                              {job.salaryMin.toLocaleString("en-US")} - {job.salaryMax.toLocaleString("en-US")} جنيه
                            </span>
                          )}
                          {job.matchScore !== undefined && job.matchScore > 0 && (
                            <span className="text-muted-foreground">
                              تطابق {job.matchScore}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                  {user?.role === "candidate" && (
                    <button
                      type="button"
                      aria-label={savedJobIds.has(job.id) ? "إلغاء الحفظ" : "حفظ الوظيفة"}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleToggleSave(job.id)
                      }}
                      disabled={togglingId === job.id}
                      className="absolute left-3 top-4 rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-primary disabled:opacity-50"
                    >
                      <Bookmark
                        className={`h-5 w-5 ${savedJobIds.has(job.id) ? "fill-current text-primary" : ""}`}
                      />
                    </button>
                  )}
                </div>
              ))}
              {totalPages > 1 && (
                <div className="flex flex-col items-center gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    صفحة {page} من {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => goToPage(page - 1)}
                    >
                      السابق
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => goToPage(page + 1)}
                    >
                      التالي
                    </Button>
                  </div>
                </div>
              )}
              </>
            )}
              </>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

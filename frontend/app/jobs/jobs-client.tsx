"use client"

import { useState, useEffect, useMemo } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, MapPin, Clock, Users } from "lucide-react"
import { useJobs, type JobListItem } from "@/src/services/jobs.service"
import Link from "next/link"

const governorates = ["القاهرة","الجيزة","الإسكندرية","الدقهلية","البحيرة","الغربية","الشرقية","المنوفية","القليوبية","كفر الشيخ","دمياط","بورسعيد","الإسماعيلية","السويس","شمال سيناء","جنوب سيناء","الفيوم","بني سويف","المنيا","أسيوط","سوهاج","قنا","الأقصر","أسوان","البحر الأحمر","الوادي الجديد","مطروح"]

const jobTypes = ["دوام كامل", "دوام جزئي", "تدريب", "عمل حر", "عن بعد", "هايبرد"]
const experienceLevels = ["حديث تخرج", "1-3 سنوات", "3-5 سنوات", "5+ سنوات"]
const jobCategories = [
  "تكنولوجيا المعلومات",
  "المالية والمحاسبة",
  "التسويق والمبيعات",
  "الموارد البشرية",
  "الهندسة",
  "خدمة العملاء",
  "الصحة والطب",
  "التعليم",
  "القانون",
  "الإدارة",
]

const getRelativeDate = (dateStr: string) => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return "اليوم"
  if (diff === 1) return "منذ يوم"
  if (diff < 7) return `منذ ${diff} أيام`
  if (diff < 30) return `منذ ${Math.floor(diff / 7)} أسابيع`
  return `منذ ${Math.floor(diff / 30)} أشهر`
}

export default function JobsClient() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedGov, setSelectedGov] = useState<string>("all")
  const [selectedExp, setSelectedExp] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const { jobs, total, totalPages, loading, error } = useJobs({
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    governorate: selectedGov !== "all" ? selectedGov : undefined,
    search: search.trim() || undefined,
    page,
    limit: 20,
  })

  const allowedRoles = useMemo(() => ["candidate"] as const, [])

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">الوظائف المتاحة</h1>
            <p className="text-muted-foreground">
              {loading ? "جاري التحميل..." : error ? error : `تصفح ${jobs.length} وظيفة متاحة في مصر`}
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
                    className="pe-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="التخصص" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل التخصصات</SelectItem>
                    {jobCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedGov} onValueChange={setSelectedGov}>
                  <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="المحافظة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المحافظات</SelectItem>
                    {governorates.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="نوع العمل" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأنواع</SelectItem>
                    {jobTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedExp} onValueChange={setSelectedExp}>
                  <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="الخبرة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المستويات</SelectItem>
                    {experienceLevels.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
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
            <p className="text-sm text-muted-foreground">{jobs.length} نتيجة</p>
            {jobs.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-lg font-medium text-foreground">لا توجد نتائج</p>
                  <p className="text-sm text-muted-foreground">جرب تغيير معايير البحث</p>
                </CardContent>
              </Card>
            ) : (
              <>
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="block rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:bg-card/80 transition-all"
                >
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
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {totalPages > 1 && (
                <div className="flex flex-col items-center gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    الصفحة {page} من {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                    >
                      السابق
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                    >
                      التالي
                    </button>
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

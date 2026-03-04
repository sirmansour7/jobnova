"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, MapPin, Clock, Users } from "lucide-react"
import type { Job } from "@/src/data/jobs"
import { jobTypes, experienceLevels, jobCategories } from "@/src/data/jobs"
import { governorates } from "@/src/data/governorates"
import Link from "next/link"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedGov, setSelectedGov] = useState<string>("all")
  const [selectedExp, setSelectedExp] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_URL}/v1/jobs`, {
          headers: { "Content-Type": "application/json" },
        })
        if (!res.ok) throw new Error("فشل تحميل الوظائف")
        const data = await res.json()
        if (cancelled) return
        // API returns jobs with id = CUID from backend; use only j.id for links (never slug/title)
        const mapped: Job[] = (Array.isArray(data) ? data : []).map((j: {
          id: string // backend CUID, e.g. "cmm6hflqp000ou99k2mt58uef"
          title: string
          partnerName?: string
          description?: string
          governorate?: string
          city?: string
          category?: string
          createdAt?: string
          organization?: { id: string; name: string }
          _count?: { applications: number }
        }) => ({
          id: j.id, // real database id (CUID) for /jobs/[id] route
          title: j.title,
          companyId: j.organization?.id ?? "",
          companyName: j.organization?.name ?? j.partnerName ?? "—",
          companyLogo: (j.organization?.name ?? "?").slice(0, 2).toUpperCase(),
          location: [j.city, j.governorate].filter(Boolean).join("، ") || "—",
          governorate: j.governorate ?? "",
          type: "دوام كامل",
          experience: "1-3 سنوات",
          salaryMin: 0,
          salaryMax: 0,
          currency: "جنيه مصري",
          description: j.description ?? "",
          requirements: [],
          skills: [],
          postedAt: j.createdAt ?? new Date().toISOString().slice(0, 10),
          deadline: "",
          applicants: j._count?.applications ?? 0,
          isActive: true,
          category: j.category ?? "",
        }))
        setJobs(mapped)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "حدث خطأ")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = jobs.filter((job) => {
    const matchSearch = search === "" || job.title.includes(search) || job.companyName.includes(search)
    const matchType = selectedType === "all" || job.type === selectedType
    const matchGov = selectedGov === "all" || job.governorate === selectedGov
    const matchExp = selectedExp === "all" || job.experience === selectedExp
    const matchCat = selectedCategory === "all" || job.category === selectedCategory
    return matchSearch && matchType && matchGov && matchExp && matchCat
  })

  return (
    <ProtectedRoute allowedRoles={["candidate"]}>
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
                    {governorates.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
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
            <p className="text-sm text-muted-foreground">{filtered.length} نتيجة</p>
            {filtered.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-lg font-medium text-foreground">لا توجد نتائج</p>
                  <p className="text-sm text-muted-foreground">جرب تغيير معايير البحث</p>
                </CardContent>
              </Card>
            ) : (
              filtered.map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`} className="block">
                  <Card className="border-border bg-card transition-colors hover:border-primary/30">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                            {job.companyLogo}
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{job.title}</h3>
                            <p className="text-sm text-muted-foreground">{job.companyName}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {job.experience}</span>
                              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {job.applicants} متقدم</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-2 sm:items-end">
                          <Badge variant="outline" className="border-primary/20 text-primary">{job.type}</Badge>
                          <p className="text-sm font-semibold text-foreground">
                            {job.salaryMin > 0 || job.salaryMax > 0
                              ? `${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()} ${job.currency}`
                              : "غير محدد"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
              </>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, MoreVertical, Eye, Pause, Play, Trash2, Users, ChevronLeft, ChevronRight } from "lucide-react"
import { apiJson } from "@/src/lib/api"
import { toast } from "sonner"

const jobCategories = ["تقنية المعلومات","المبيعات","التسويق","الموارد البشرية","المحاسبة","الهندسة","التعليم","الصحة","أخرى"]
const jobTypes: Record<string, string> = {
  "full-time": "دوام كامل",
  "part-time": "دوام جزئي",
  "remote": "عن بُعد",
  "contract": "عقد مؤقت",
  "internship": "تدريب",
}

const PAGE_SIZE = 20

export interface AdminJob {
  id: string
  title: string
  partnerName?: string
  category?: string
  jobType?: string
  governorate?: string
  isActive: boolean
  expiresAt?: string
  createdAt: string
  organization?: { id: string; name: string }
  _count?: { applications: number }
}

export default function ModerateJobsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orgFilter = searchParams?.get("org") ?? ""

  const [jobs, setJobs] = useState<AdminJob[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [statusFilter, categoryFilter])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (categoryFilter !== "all") params.set("category", categoryFilter)
      const data = await apiJson<{ items: AdminJob[]; total: number; totalPages: number }>(`/v1/admin/jobs?${params}`)
      let items = Array.isArray(data.items) ? data.items : []
      // Client-side org filter (for "Manage Jobs" button from companies page)
      if (orgFilter) items = items.filter((j) => j.organization?.id === orgFilter)
      setJobs(items)
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } catch { setJobs([]) }
    finally { setLoading(false) }
  }, [page, debouncedSearch, statusFilter, categoryFilter, orgFilter])

  useEffect(() => { load() }, [load])

  const companyName = (j: AdminJob) => j.organization?.name ?? j.partnerName ?? "—"
  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }) }
    catch { return iso }
  }
  function isExpired(job: AdminJob) {
    return !!job.expiresAt && new Date(job.expiresAt) < new Date()
  }

  async function handleToggle(id: string, isActive: boolean) {
    try {
      await apiJson(`/v1/admin/jobs/${id}/toggle`, { method: "PATCH" })
      setJobs((prev) => prev.map((j) => j.id === id ? { ...j, isActive: !isActive } : j))
      toast.success(isActive ? "تم تعليق الوظيفة" : "تم تفعيل الوظيفة")
    } catch { toast.error("فشل التحديث") }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل تريد حذف هذه الوظيفة؟")) return
    try {
      await apiJson(`/v1/admin/jobs/${id}`, { method: "DELETE" })
      toast.success("تم الحذف")
      load()
    } catch { toast.error("فشل الحذف") }
  }

  function statusBadge(job: AdminJob) {
    if (isExpired(job)) return <Badge variant="outline" className="border-orange-500/30 text-orange-500 text-xs">منتهية</Badge>
    if (!job.isActive) return <Badge variant="outline" className="border-destructive/30 text-destructive text-xs">متوقفة</Badge>
    return <Badge variant="outline" className="border-green-500/30 text-green-500 text-xs">نشطة</Badge>
  }

  const allowedRoles = useMemo(() => ["admin"] as const, [])

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة الوظائف</h1>
            <p className="text-muted-foreground">{total} وظيفة على المنصة</p>
          </div>

          {/* Filters */}
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="ابحث بعنوان الوظيفة أو اسم الشركة..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pe-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="active">نشطة</SelectItem>
                    <SelectItem value="inactive">متوقفة</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="التخصص" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل التخصصات</SelectItem>
                    {jobCategories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Jobs Table */}
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground">جاري التحميل...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-start">الوظيفة</TableHead>
                      <TableHead className="text-start">الشركة</TableHead>
                      <TableHead className="text-start">التخصص</TableHead>
                      <TableHead className="text-start">النوع</TableHead>
                      <TableHead className="text-start">المتقدمون</TableHead>
                      <TableHead className="text-start">الحالة</TableHead>
                      <TableHead className="text-start">تاريخ النشر</TableHead>
                      <TableHead className="text-start">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">لا توجد نتائج مطابقة</TableCell>
                      </TableRow>
                    ) : (
                      jobs.map((job) => (
                        <TableRow key={job.id} className="border-border hover:bg-secondary/30 transition-colors">
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{job.title}</p>
                              <p className="text-xs text-muted-foreground">{job.governorate ?? "—"}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary flex-shrink-0">
                                {companyName(job).slice(0, 2).toUpperCase()}
                              </div>
                              <span className="text-sm text-foreground">{companyName(job)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-border text-xs">{job.category ?? "—"}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {job.jobType ? (jobTypes[job.jobType] ?? job.jobType) : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              {job._count?.applications ?? 0}
                            </div>
                          </TableCell>
                          <TableCell>{statusBadge(job)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(job.createdAt)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem>
                                  <Eye className="ml-2 h-4 w-4" /> عرض التفاصيل
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggle(job.id, job.isActive)}>
                                  {job.isActive
                                    ? <><Pause className="ml-2 h-4 w-4" /> تعليق</>
                                    : <><Play className="ml-2 h-4 w-4" /> تفعيل</>
                                  }
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/hr/applicants?job=${job.id}`)}>
                                  <Users className="ml-2 h-4 w-4" /> عرض المتقدمين
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(job.id)}>
                                  <Trash2 className="ml-2 h-4 w-4" /> حذف
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-muted-foreground">صفحة {page} من {totalPages} — {total} وظيفة</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronRight className="h-4 w-4 ml-1" /> السابق
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  التالي <ChevronLeft className="h-4 w-4 mr-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

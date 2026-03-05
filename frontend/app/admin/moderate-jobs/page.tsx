"use client"

import { useState, useEffect, useMemo } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, MoreVertical, CheckCircle, XCircle, Eye, Pause } from "lucide-react"
import { apiJson } from "@/src/lib/api"

const jobCategories = ["تقنية المعلومات", "المبيعات", "التسويق", "الموارد البشرية", "المحاسبة", "الهندسة", "التعليم", "الصحة", "أخرى"]

export interface AdminJob {
  id: string
  title: string
  partnerName?: string
  category?: string
  governorate?: string
  isActive: boolean
  createdAt: string
  organization?: { name: string }
  _count?: { applications: number }
}

export default function ModerateJobsPage() {
  const [jobs, setJobs] = useState<AdminJob[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await apiJson<{ items: AdminJob[] }>("/v1/admin/jobs")
        if (!cancelled) setJobs(Array.isArray(data.items) ? data.items : [])
      } catch {
        if (!cancelled) setJobs([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const companyName = (j: AdminJob) => j.organization?.name ?? j.partnerName ?? "—"
  const companyLogo = (j: AdminJob) => (j.organization?.name ?? j.partnerName ?? "?").slice(0, 2).toUpperCase()
  const location = (j: AdminJob) => j.governorate ?? "—"
  const applicants = (j: AdminJob) => j._count?.applications ?? 0
  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })
    } catch {
      return iso
    }
  }

  async function handleToggle(id: string) {
    try {
      await apiJson(`/v1/admin/jobs/${id}/toggle`, { method: "PATCH" })
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, isActive: !j.isActive } : j)))
    } catch {
      // ignore or toast
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiJson(`/v1/admin/jobs/${id}`, { method: "DELETE" })
      setJobs((prev) => prev.filter((j) => j.id !== id))
    } catch {
      // ignore or toast
    }
  }

  const filtered = jobs.filter((j) => {
    const matchSearch = search === "" || j.title.includes(search) || companyName(j).includes(search)
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && j.isActive) ||
      (statusFilter === "inactive" && !j.isActive)
    const matchCategory = categoryFilter === "all" || (j.category ?? "") === categoryFilter
    return matchSearch && matchStatus && matchCategory
  })

  const allowedRoles = useMemo(() => ["admin"] as const, [])

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={allowedRoles}>
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">مراجعة الوظائف</h1>
            <p className="text-muted-foreground">مراجعة واعتماد الوظائف المنشورة على المنصة</p>
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
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="active">نشطة</SelectItem>
                    <SelectItem value="inactive">متوقفة</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="التخصص" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل التخصصات</SelectItem>
                    {jobCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-border bg-card">
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">إجمالي الوظائف</span>
                <span className="text-xl font-bold text-foreground">{jobs.length}</span>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">نشطة</span>
                <span className="text-xl font-bold text-chart-3">{jobs.filter((j) => j.isActive).length}</span>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">متوقفة</span>
                <span className="text-xl font-bold text-destructive">{jobs.filter((j) => !j.isActive).length}</span>
              </CardContent>
            </Card>
          </div>

          {/* Jobs Table */}
          <Card className="border-border bg-card">
            <CardContent className="p-0">
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
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                        لا توجد نتائج مطابقة
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((job) => (
                      <TableRow key={job.id} className="border-border">
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{job.title}</p>
                            <p className="text-xs text-muted-foreground">{location(job)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                              {companyLogo(job)}
                            </div>
                            <span className="text-sm text-foreground">{companyName(job)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-border text-xs">{job.category ?? "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">—</TableCell>
                        <TableCell className="text-sm font-medium text-foreground">{applicants(job)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={job.isActive ? "border-chart-3/20 text-chart-3" : "border-destructive/20 text-destructive"}
                          >
                            {job.isActive ? "نشطة" : "متوقفة"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(job.createdAt)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem><Eye className="ml-2 h-4 w-4" /> عرض التفاصيل</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggle(job.id)}>
                                <CheckCircle className="ml-2 h-4 w-4" /> اعتماد
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggle(job.id)}>
                                <Pause className="ml-2 h-4 w-4" /> تعليق
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(job.id)}>
                                <XCircle className="ml-2 h-4 w-4" /> رفض
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

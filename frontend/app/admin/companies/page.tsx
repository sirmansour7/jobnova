"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, MoreVertical, Eye, Trash2, Briefcase, ChevronLeft, ChevronRight } from "lucide-react"
import { apiJson } from "@/src/lib/api"
import { toast } from "sonner"

export interface AdminOrg {
  id: string
  name: string
  slug: string
  industry?: string
  location?: string
  size?: string
  createdAt: string
  _count: { jobs: number; memberships: number }
}

const PAGE_SIZE = 15

export default function ManageCompaniesPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<AdminOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (debouncedSearch) params.set("search", debouncedSearch)
      const data = await apiJson<{ items: AdminOrg[]; total: number; totalPages: number }>(`/v1/admin/orgs?${params}`)
      setCompanies(Array.isArray(data.items) ? data.items : [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } catch { setCompanies([]) }
    finally { setLoading(false) }
  }, [page, debouncedSearch])

  useEffect(() => { load() }, [load])

  function formatDate(iso: string) {
    try { return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }) }
    catch { return iso }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`هل تريد حذف شركة "${name}"؟`)) return
    try {
      await apiJson(`/v1/admin/orgs/${id}`, { method: "DELETE" })
      toast.success("تم حذف الشركة بنجاح")
      load()
    } catch { toast.error("فشل الحذف") }
  }

  const allowedRoles = useMemo(() => ["admin"] as const, [])

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة الشركات</h1>
            <p className="text-muted-foreground">{total} شركة مسجلة على المنصة</p>
          </div>

          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ابحث بالاسم أو القطاع أو الموقع..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pe-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground">جاري التحميل...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-start">الشركة</TableHead>
                      <TableHead className="text-start">القطاع</TableHead>
                      <TableHead className="text-start">الموقع</TableHead>
                      <TableHead className="text-start">الحجم</TableHead>
                      <TableHead className="text-start">الأعضاء</TableHead>
                      <TableHead className="text-start">الوظائف</TableHead>
                      <TableHead className="text-start">تأسست</TableHead>
                      <TableHead className="text-start">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">لا توجد نتائج مطابقة</TableCell>
                      </TableRow>
                    ) : (
                      companies.map((company) => (
                        <TableRow key={company.id} className="border-border hover:bg-secondary/30 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                                  {company.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">{company.name}</p>
                                <p className="text-xs text-muted-foreground font-mono" dir="ltr">{company.slug}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {company.industry
                              ? <Badge variant="outline" className="border-border text-xs">{company.industry}</Badge>
                              : <span className="text-muted-foreground text-sm">—</span>}
                          </TableCell>
                          <TableCell className="text-sm text-foreground">{company.location ?? <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{company.size ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{company._count.memberships}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{company._count.jobs} وظيفة</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(company.createdAt)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => router.push(`/admin/companies/${company.id}`)}>
                                  <Eye className="ml-2 h-4 w-4" /> عرض التفاصيل
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/admin/moderate-jobs?org=${company.id}`)}>
                                  <Briefcase className="ml-2 h-4 w-4" /> إدارة الوظائف
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(company.id, company.name)}>
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
              <p className="text-sm text-muted-foreground">صفحة {page} من {totalPages}</p>
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

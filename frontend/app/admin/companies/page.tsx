"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Search, MoreVertical, Eye, Trash2, Briefcase, ChevronLeft, ChevronRight, UserCog } from "lucide-react"
import { apiJson } from "@/src/lib/api"
import { toast } from "sonner"

interface HrUser {
  id: string
  fullName: string
  email: string
}

export interface AdminOrg {
  id: string
  name: string
  slug: string
  industry?: string
  location?: string
  size?: string
  createdAt: string
  responsibleHrs: HrUser[]
  _count: { jobs: number; memberships: number }
}

const PAGE_SIZE = 15

function StackedAvatars({ users }: { users: HrUser[] }) {
  if (users.length === 0) {
    return <span className="text-sm text-muted-foreground">غير محدد</span>
  }
  const visible = users.slice(0, 3)
  const extra = users.length - visible.length
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2 space-x-reverse">
        {visible.map((u) => (
          <Avatar key={u.id} className="h-7 w-7 border-2 border-card">
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {u.fullName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      {extra > 0 && (
        <span className="mr-2 text-xs text-muted-foreground">+{extra}</span>
      )}
    </div>
  )
}

export default function ManageCompaniesPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<AdminOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Assign HR dialog state
  const [assignTarget, setAssignTarget] = useState<AdminOrg | null>(null)
  const [hrUsers, setHrUsers] = useState<HrUser[]>([])
  const [hrSearch, setHrSearch] = useState("")
  const [selectedHrIds, setSelectedHrIds] = useState<Set<string>>(new Set())
  const [hrLoading, setHrLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)

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

  async function openAssignDialog(company: AdminOrg) {
    setAssignTarget(company)
    setSelectedHrIds(new Set(company.responsibleHrs.map((h) => h.id)))
    setHrSearch("")
    setHrLoading(true)
    try {
      const data = await apiJson<{ items: HrUser[] }>("/v1/admin/users?role=hr&limit=100")
      setHrUsers(data.items ?? [])
    } catch {
      setHrUsers([])
    } finally {
      setHrLoading(false)
    }
  }

  function toggleHr(id: string) {
    setSelectedHrIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleAssignHr() {
    if (!assignTarget) return
    setAssigning(true)
    try {
      const result = await apiJson<{ id: string; responsibleHrs: HrUser[] }>(
        `/v1/admin/orgs/${assignTarget.id}/assign-hr`,
        {
          method: "PATCH",
          body: JSON.stringify({ hrUserIds: [...selectedHrIds] }),
        }
      )
      setCompanies((prev) =>
        prev.map((c) => c.id === assignTarget.id ? { ...c, responsibleHrs: result.responsibleHrs } : c)
      )
      toast.success("تم تحديث HR المسؤولين")
      setAssignTarget(null)
    } catch {
      toast.error("فشل تعيين HR المسؤول")
    } finally {
      setAssigning(false)
    }
  }

  const filteredHrUsers = useMemo(() => {
    if (!hrSearch.trim()) return hrUsers
    const q = hrSearch.toLowerCase()
    return hrUsers.filter((u) =>
      u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }, [hrUsers, hrSearch])

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
                      <TableHead className="text-start">HR المسؤول</TableHead>
                      <TableHead className="text-start">الأعضاء</TableHead>
                      <TableHead className="text-start">الوظائف</TableHead>
                      <TableHead className="text-start">تأسست</TableHead>
                      <TableHead className="text-start">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">لا توجد نتائج مطابقة</TableCell>
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
                          <TableCell>
                            <StackedAvatars users={company.responsibleHrs ?? []} />
                          </TableCell>
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
                                <DropdownMenuItem onClick={() => openAssignDialog(company)}>
                                  <UserCog className="ml-2 h-4 w-4" /> تغيير HR المسؤول
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

        {/* Assign HR Dialog */}
        <Dialog open={!!assignTarget} onOpenChange={(open) => { if (!open) setAssignTarget(null) }}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>HR المسؤولون — {assignTarget?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {selectedHrIds.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedHrIds.size} HR محدد
                </p>
              )}
              <div className="space-y-2">
                <Label>بحث عن HR</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="ابحث بالاسم أو البريد الإلكتروني..."
                    value={hrSearch}
                    onChange={(e) => setHrSearch(e.target.value)}
                    className="pe-10"
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-md border border-border">
                {hrLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">جاري التحميل...</div>
                ) : filteredHrUsers.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">لا يوجد مستخدمون بدور HR</div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredHrUsers.map((user) => {
                      const checked = selectedHrIds.has(user.id)
                      return (
                        <button
                          key={user.id}
                          type="button"
                          className={`w-full px-4 py-3 text-start transition-colors hover:bg-secondary/40 ${checked ? "bg-primary/10" : ""}`}
                          onClick={() => toggleHr(user.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleHr(user.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                {user.fullName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-foreground">{user.fullName}</p>
                              <p className="text-xs text-muted-foreground" dir="ltr">{user.email}</p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setAssignTarget(null)} disabled={assigning}>إلغاء</Button>
              <Button onClick={handleAssignHr} disabled={assigning}>
                {assigning ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

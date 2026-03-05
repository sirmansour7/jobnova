"use client"

import { useState, useEffect, useMemo } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, MoreVertical, Eye, Ban, Trash2, ExternalLink } from "lucide-react"
import { apiJson } from "@/src/lib/api"

export interface AdminOrg {
  id: string
  name: string
  slug: string
  createdAt: string
  _count: { jobs: number; memberships: number }
}

export default function ManageCompaniesPage() {
  const [companies, setCompanies] = useState<AdminOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await apiJson<{ items: AdminOrg[] }>("/v1/admin/orgs")
        if (!cancelled) setCompanies(Array.isArray(data.items) ? data.items : [])
      } catch {
        if (!cancelled) setCompanies([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = companies.filter((c) => {
    return search === "" || c.name.includes(search) || c.slug.includes(search)
  })

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })
    } catch {
      return iso
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiJson(`/v1/admin/orgs/${id}`, { method: "DELETE" })
      setCompanies((prev) => prev.filter((c) => c.id !== id))
    } catch {
      // ignore or toast
    }
  }

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
            <h1 className="text-2xl font-bold text-foreground">إدارة الشركات</h1>
            <p className="text-muted-foreground">{companies.length} شركة مسجلة على المنصة</p>
          </div>

          {/* Search */}
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

          {/* Companies Table */}
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-start">الشركة</TableHead>
                    <TableHead className="text-start">القطاع</TableHead>
                    <TableHead className="text-start">الموقع</TableHead>
                    <TableHead className="text-start">الحجم</TableHead>
                    <TableHead className="text-start">الوظائف</TableHead>
                    <TableHead className="text-start">تأسست</TableHead>
                    <TableHead className="text-start">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                        لا توجد نتائج مطابقة
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((company) => (
                      <TableRow key={company.id} className="border-border">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                                {company.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">{company.name}</p>
                              <a
                                href={`https://${company.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                                dir="ltr"
                              >
                                {company.slug}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-border">—</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-foreground">—</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{company._count.memberships} أعضاء</TableCell>
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
                              <DropdownMenuItem><Eye className="ml-2 h-4 w-4" /> عرض التفاصيل</DropdownMenuItem>
                              <DropdownMenuItem><Ban className="ml-2 h-4 w-4" /> تعليق</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(company.id)}>
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
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

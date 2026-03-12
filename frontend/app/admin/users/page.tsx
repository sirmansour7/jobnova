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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, MoreVertical, Ban, ShieldCheck, Trash2, Eye } from "lucide-react"
import { toast } from "sonner"
import { apiJson } from "@/src/lib/api"

const roleLabels: Record<string, string> = {
  candidate: "مرشح",
  hr: "مسؤول توظيف",
  admin: "مدير",
}

const roleBadgeStyles: Record<string, string> = {
  candidate: "bg-primary/10 text-primary border-primary/20",
  hr: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  admin: "bg-chart-4/10 text-chart-4 border-chart-4/20",
}

interface AdminUser {
  id: string
  fullName: string
  email: string
  role: string
  emailVerified: boolean
  createdAt: string
  phone?: string
  location?: string
  lockedUntil?: string | null
}

export default function ManageUsersPage() {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [allUsers, setAllUsers] = useState<AdminUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  useEffect(() => {
    apiJson<{ items: AdminUser[]; total: number; totalPages: number }>(
      `/v1/admin/users?page=${page}&limit=${limit}`,
    )
      .then((data) => {
        setAllUsers(data.items ?? [])
        setTotal(data.total ?? 0)
        setTotalPages(data.totalPages ?? 1)
        setLoadingUsers(false)
      })
      .catch(() => setLoadingUsers(false))
  }, [page])

  const filtered = allUsers.filter((u) => {
    const matchSearch = search === "" || u.fullName.includes(search) || u.email.includes(search)
    const matchRole = roleFilter === "all" || u.role === roleFilter
    return matchSearch && matchRole
  })

  const allowedRoles = useMemo(() => ["admin"] as const, [])

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة المستخدمين</h1>
            <p className="text-muted-foreground">{loadingUsers ? "..." : total} مستخدم مسجل على المنصة</p>
          </div>

          {/* Filters */}
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="ابحث بالاسم أو البريد الإلكتروني..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pe-10"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأدوار</SelectItem>
                    <SelectItem value="candidate">مرشح</SelectItem>
                    <SelectItem value="hr">مسؤول توظيف</SelectItem>
                    <SelectItem value="admin">مدير</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-start">المستخدم</TableHead>
                    <TableHead className="text-start">الهاتف</TableHead>
                    <TableHead className="text-start">الموقع</TableHead>
                    <TableHead className="text-start">الدور</TableHead>
                    <TableHead className="text-start">تاريخ التسجيل</TableHead>
                    <TableHead className="text-start">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                        لا توجد نتائج مطابقة
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((user) => (
                      <TableRow key={user.id} className="border-border">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                {user.fullName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">{user.fullName}</p>
                              <p className="text-xs text-muted-foreground" dir="ltr">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" dir="ltr">{user.phone || "-"}</TableCell>
                        <TableCell className="text-sm text-foreground">{user.location || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={roleBadgeStyles[user.role]}>
                            {roleLabels[user.role]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.createdAt}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem><Eye className="ml-2 h-4 w-4" /> عرض الملف</DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={async () => {
                                  const newRole = window
                                    .prompt("أدخل الدور الجديد: candidate / hr / admin", user.role)
                                    ?.trim()
                                  if (!newRole) return
                                  const allowedRoles = ["candidate", "hr", "admin"]
                                  if (!allowedRoles.includes(newRole)) {
                                    toast.error("دور غير صالح. استخدم candidate أو hr أو admin.")
                                    return
                                  }
                                  try {
                                    const updated = await apiJson<AdminUser>(
                                      `/v1/admin/users/${user.id}/role`,
                                      {
                                        method: "PATCH",
                                        body: JSON.stringify({ role: newRole }),
                                      },
                                    )
                                    setAllUsers((prev) =>
                                      prev.map((u) => (u.id === user.id ? { ...u, role: updated.role } : u)),
                                    )
                                    toast.success("تم تغيير الدور")
                                  } catch (err) {
                                    const message =
                                      err instanceof Error ? err.message : "حدث خطأ أثناء تغيير الدور"
                                    toast.error(message)
                                  }
                                }}
                              >
                                <ShieldCheck className="ml-2 h-4 w-4" /> تغيير الدور
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    const updated = await apiJson<AdminUser>(
                                      `/v1/admin/users/${user.id}/ban`,
                                      { method: "PATCH" },
                                    )
                                    setAllUsers((prev) =>
                                      prev.map((u) => (u.id === user.id ? { ...u, lockedUntil: updated.lockedUntil } : u)),
                                    )
                                    toast.success("تم تحديث حالة المستخدم")
                                  } catch (err) {
                                    const message =
                                      err instanceof Error ? err.message : "حدث خطأ أثناء تحديث حالة الحظر"
                                    toast.error(message)
                                  }
                                }}
                              >
                                <Ban className="ml-2 h-4 w-4" />{" "}
                                {user.lockedUntil ? "رفع الحظر" : "حظر"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={async () => {
                                  const confirmed = window.confirm("هل أنت متأكد من حذف هذا المستخدم؟")
                                  if (!confirmed) return
                                  try {
                                    await apiJson(`/v1/admin/users/${user.id}`, {
                                      method: "DELETE",
                                    })
                                    setAllUsers((prev) => prev.filter((u) => u.id !== user.id))
                                    toast.success("تم حذف المستخدم")
                                  } catch (err) {
                                    const message =
                                      err instanceof Error ? err.message : "حدث خطأ أثناء حذف المستخدم"
                                    toast.error(message)
                                  }
                                }}
                              >
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  صفحة {page} من {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    السابق
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    التالي
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

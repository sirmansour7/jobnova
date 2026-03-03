"use client"

import { useState } from "react"
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
import { jobs, jobCategories } from "@/src/data/jobs"

export default function ModerateJobsPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  const filtered = jobs.filter((j) => {
    const matchSearch = search === "" || j.title.includes(search) || j.companyName.includes(search)
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && j.isActive) ||
      (statusFilter === "inactive" && !j.isActive)
    const matchCategory = categoryFilter === "all" || j.category === categoryFilter
    return matchSearch && matchStatus && matchCategory
  })

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
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
                            <p className="text-xs text-muted-foreground">{job.location}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                              {job.companyLogo}
                            </div>
                            <span className="text-sm text-foreground">{job.companyName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-border text-xs">{job.category}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{job.type}</TableCell>
                        <TableCell className="text-sm font-medium text-foreground">{job.applicants}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={job.isActive ? "border-chart-3/20 text-chart-3" : "border-destructive/20 text-destructive"}
                          >
                            {job.isActive ? "نشطة" : "متوقفة"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{job.postedAt}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem><Eye className="ml-2 h-4 w-4" /> عرض التفاصيل</DropdownMenuItem>
                              <DropdownMenuItem><CheckCircle className="ml-2 h-4 w-4" /> اعتماد</DropdownMenuItem>
                              <DropdownMenuItem><Pause className="ml-2 h-4 w-4" /> تعليق</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive"><XCircle className="ml-2 h-4 w-4" /> رفض</DropdownMenuItem>
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

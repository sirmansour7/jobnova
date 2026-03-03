"use client"

import { useState } from "react"
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
import { companies } from "@/src/data/companies"

export default function ManageCompaniesPage() {
  const [search, setSearch] = useState("")

  const filtered = companies.filter((c) => {
    return search === "" || c.name.includes(search) || c.industry.includes(search) || c.location.includes(search)
  })

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
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
                              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{company.logo}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">{company.name}</p>
                              <a
                                href={`https://${company.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                                dir="ltr"
                              >
                                {company.website}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-border">{company.industry}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-foreground">{company.location}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{company.size}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{company.jobCount} وظيفة</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{company.founded}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem><Eye className="ml-2 h-4 w-4" /> عرض التفاصيل</DropdownMenuItem>
                              <DropdownMenuItem><Ban className="ml-2 h-4 w-4" /> تعليق</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive"><Trash2 className="ml-2 h-4 w-4" /> حذف</DropdownMenuItem>
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

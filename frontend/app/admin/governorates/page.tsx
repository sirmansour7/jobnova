"use client"

import { useState } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, MoreVertical, Edit, Trash2, MapPin, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { governorates } from "@/src/data/governorates"

export default function ManageGovernoratesPage() {
  const [search, setSearch] = useState("")
  const [selectedGov, setSelectedGov] = useState<string | null>(null)

  const filtered = governorates.filter((g) => {
    return search === "" || g.name.includes(search) || g.cities.some((c) => c.includes(search))
  })

  const selectedGovernorate = governorates.find((g) => g.id === selectedGov)

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">إدارة المحافظات</h1>
              <p className="text-muted-foreground">{governorates.length} محافظة - {governorates.reduce((s, g) => s + g.cities.length, 0)} مدينة</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button><Plus className="ml-2 h-4 w-4" /> إضافة محافظة</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة محافظة جديدة</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>اسم المحافظة</Label>
                    <Input placeholder="مثال: دمياط" />
                  </div>
                  <div className="space-y-2">
                    <Label>المدن (مفصولة بفاصلة)</Label>
                    <Input placeholder="مثال: دمياط، رأس البر، فارسكور" />
                  </div>
                  <Button className="w-full">إضافة</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ابحث عن محافظة أو مدينة..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pe-10"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Governorates Table */}
            <div className="lg:col-span-2">
              <Card className="border-border bg-card">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-start">المحافظة</TableHead>
                        <TableHead className="text-start">عدد المدن</TableHead>
                        <TableHead className="text-start">المعرف</TableHead>
                        <TableHead className="text-start">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                            لا توجد نتائج مطابقة
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((gov) => (
                          <TableRow
                            key={gov.id}
                            className={`border-border cursor-pointer transition-colors ${selectedGov === gov.id ? "bg-primary/5" : "hover:bg-secondary/50"}`}
                            onClick={() => setSelectedGov(gov.id)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                <span className="font-medium text-foreground">{gov.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{gov.cities.length} مدينة</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground font-mono" dir="ltr">{gov.id}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  <DropdownMenuItem><Edit className="ml-2 h-4 w-4" /> تعديل</DropdownMenuItem>
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

            {/* Cities Panel */}
            <div>
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-sm text-foreground">
                    {selectedGovernorate ? `مدن ${selectedGovernorate.name}` : "اختر محافظة لعرض مدنها"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedGovernorate ? (
                    <div className="space-y-2">
                      {selectedGovernorate.cities.map((city) => (
                        <div key={city} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2">
                          <span className="text-sm text-foreground">{city}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-2">
                        <Input placeholder="أضف مدينة..." className="text-sm" />
                        <Button size="sm" variant="outline"><Plus className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <MapPin className="mb-3 h-8 w-8" />
                      <p className="text-sm">اضغط على محافظة من الجدول لعرض مدنها</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

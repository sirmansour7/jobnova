"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, MoreVertical, Edit, Trash2, MapPin, Plus, X } from "lucide-react"
import { apiJson } from "@/src/lib/api"
import { toast } from "sonner"

interface Governorate {
  id: string
  name: string
  _count: { cities: number }
}

interface City {
  id: string
  name: string
  governorateId: string
}

export default function ManageGovernoratesPage() {
  const [govs, setGovs] = useState<Governorate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedGov, setSelectedGov] = useState<Governorate | null>(null)
  const [cities, setCities] = useState<City[]>([])
  const [citiesLoading, setCitiesLoading] = useState(false)

  // Add Governorate dialog
  const [addGovOpen, setAddGovOpen] = useState(false)
  const [newGovName, setNewGovName] = useState("")
  const [savingGov, setSavingGov] = useState(false)

  // Edit Governorate dialog
  const [editGovOpen, setEditGovOpen] = useState(false)
  const [editingGov, setEditingGov] = useState<Governorate | null>(null)
  const [editGovName, setEditGovName] = useState("")

  // Add City dialog
  const [addCityOpen, setAddCityOpen] = useState(false)
  const [newCityName, setNewCityName] = useState("")
  const [savingCity, setSavingCity] = useState(false)

  // Edit City
  const [editCityOpen, setEditCityOpen] = useState(false)
  const [editingCity, setEditingCity] = useState<City | null>(null)
  const [editCityName, setEditCityName] = useState("")

  const loadGovs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      const data = await apiJson<{ items: Governorate[] }>(`/v1/governorates?${params}`)
      setGovs(Array.isArray(data.items) ? data.items : [])
    } catch { setGovs([]) }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => {
    const t = setTimeout(loadGovs, 300)
    return () => clearTimeout(t)
  }, [loadGovs])

  const loadCities = useCallback(async (govId: string) => {
    setCitiesLoading(true)
    try {
      const data = await apiJson<{ items: City[] }>(`/v1/governorates/${govId}/cities`)
      setCities(Array.isArray(data.items) ? data.items : [])
    } catch { setCities([]) }
    finally { setCitiesLoading(false) }
  }, [])

  function handleSelectGov(gov: Governorate) {
    setSelectedGov(gov)
    loadCities(gov.id)
  }

  async function handleAddGov() {
    if (!newGovName.trim()) return
    setSavingGov(true)
    try {
      await apiJson("/v1/governorates", { method: "POST", body: JSON.stringify({ name: newGovName.trim() }) })
      toast.success("تمت إضافة المحافظة")
      setNewGovName("")
      setAddGovOpen(false)
      loadGovs()
    } catch { toast.error("فشل الحفظ") }
    finally { setSavingGov(false) }
  }

  async function handleEditGov() {
    if (!editingGov || !editGovName.trim()) return
    setSavingGov(true)
    try {
      await apiJson(`/v1/governorates/${editingGov.id}`, { method: "PATCH", body: JSON.stringify({ name: editGovName.trim() }) })
      toast.success("تم التعديل")
      setEditGovOpen(false)
      setEditingGov(null)
      if (selectedGov?.id === editingGov.id) setSelectedGov((g) => g ? { ...g, name: editGovName.trim() } : g)
      loadGovs()
    } catch { toast.error("فشل التعديل") }
    finally { setSavingGov(false) }
  }

  async function handleDeleteGov(gov: Governorate) {
    if (!confirm(`هل تريد حذف محافظة "${gov.name}" وجميع مدنها؟`)) return
    try {
      await apiJson(`/v1/governorates/${gov.id}`, { method: "DELETE" })
      toast.success("تم الحذف")
      if (selectedGov?.id === gov.id) { setSelectedGov(null); setCities([]) }
      loadGovs()
    } catch { toast.error("فشل الحذف") }
  }

  async function handleAddCity() {
    if (!selectedGov || !newCityName.trim()) return
    setSavingCity(true)
    try {
      await apiJson(`/v1/governorates/${selectedGov.id}/cities`, { method: "POST", body: JSON.stringify({ name: newCityName.trim() }) })
      toast.success("تمت إضافة المدينة")
      setNewCityName("")
      setAddCityOpen(false)
      loadCities(selectedGov.id)
      // Update govs count
      setGovs((prev) => prev.map((g) => g.id === selectedGov.id ? { ...g, _count: { cities: g._count.cities + 1 } } : g))
    } catch { toast.error("فشل الحفظ") }
    finally { setSavingCity(false) }
  }

  async function handleEditCity() {
    if (!editingCity || !editCityName.trim()) return
    try {
      await apiJson(`/v1/governorates/cities/${editingCity.id}`, { method: "PATCH", body: JSON.stringify({ name: editCityName.trim() }) })
      toast.success("تم التعديل")
      setEditCityOpen(false)
      setEditingCity(null)
      if (selectedGov) loadCities(selectedGov.id)
    } catch { toast.error("فشل التعديل") }
  }

  async function handleDeleteCity(city: City) {
    if (!confirm(`هل تريد حذف مدينة "${city.name}"؟`)) return
    try {
      await apiJson(`/v1/governorates/cities/${city.id}`, { method: "DELETE" })
      toast.success("تم الحذف")
      setCities((prev) => prev.filter((c) => c.id !== city.id))
      setGovs((prev) => prev.map((g) => g.id === city.governorateId ? { ...g, _count: { cities: Math.max(0, g._count.cities - 1) } } : g))
    } catch { toast.error("فشل الحذف") }
  }

  const allowedRoles = useMemo(() => ["admin"] as const, [])

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">إدارة المحافظات والمدن</h1>
              <p className="text-muted-foreground">{govs.length} محافظة</p>
            </div>
            <Dialog open={addGovOpen} onOpenChange={setAddGovOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="ml-2 h-4 w-4" /> إضافة محافظة</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>إضافة محافظة جديدة</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>اسم المحافظة</Label>
                    <Input placeholder="مثال: دمياط" value={newGovName} onChange={(e) => setNewGovName(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={handleAddGov} disabled={savingGov || !newGovName.trim()}>
                    {savingGov ? "جاري الحفظ..." : "إضافة"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ابحث عن محافظة..."
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
                  {loading ? (
                    <div className="flex items-center justify-center py-20 text-muted-foreground">جاري التحميل...</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead className="text-start">المحافظة</TableHead>
                          <TableHead className="text-start">عدد المدن</TableHead>
                          <TableHead className="text-start">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {govs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="py-12 text-center text-muted-foreground">لا توجد محافظات</TableCell>
                          </TableRow>
                        ) : (
                          govs.map((gov) => (
                            <TableRow
                              key={gov.id}
                              className={`border-border cursor-pointer transition-colors ${selectedGov?.id === gov.id ? "bg-primary/5 border-r-2 border-r-primary" : "hover:bg-secondary/50"}`}
                              onClick={() => handleSelectGov(gov)}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-primary" />
                                  <span className="font-medium text-foreground">{gov.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{gov._count.cities} مدينة</Badge>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingGov(gov); setEditGovName(gov.name); setEditGovOpen(true) }}>
                                      <Edit className="ml-2 h-4 w-4" /> تعديل
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteGov(gov) }}>
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
            </div>

            {/* Cities Panel */}
            <div>
              <Card className="border-border bg-card h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm text-foreground">
                    {selectedGov ? `مدن ${selectedGov.name}` : "اختر محافظة"}
                  </CardTitle>
                  {selectedGov && (
                    <Dialog open={addCityOpen} onOpenChange={setAddCityOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline"><Plus className="h-3 w-3 ml-1" /> إضافة</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>إضافة مدينة في {selectedGov.name}</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>اسم المدينة</Label>
                            <Input placeholder="مثال: رأس البر" value={newCityName} onChange={(e) => setNewCityName(e.target.value)} />
                          </div>
                          <Button className="w-full" onClick={handleAddCity} disabled={savingCity || !newCityName.trim()}>
                            {savingCity ? "جاري الحفظ..." : "إضافة"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardHeader>
                <CardContent>
                  {!selectedGov ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <MapPin className="mb-3 h-8 w-8" />
                      <p className="text-sm">اضغط على محافظة من الجدول لعرض مدنها</p>
                    </div>
                  ) : citiesLoading ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">جاري التحميل...</p>
                  ) : cities.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">لا توجد مدن مضافة بعد</p>
                  ) : (
                    <div className="space-y-1 max-h-80 overflow-y-auto">
                      {cities.map((city) => (
                        <div key={city.id} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-secondary/50 group">
                          <span className="text-sm text-foreground">{city.name}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => { setEditingCity(city); setEditCityName(city.name); setEditCityOpen(true) }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteCity(city)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Edit Governorate Dialog */}
        <Dialog open={editGovOpen} onOpenChange={setEditGovOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>تعديل المحافظة</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>اسم المحافظة</Label>
                <Input value={editGovName} onChange={(e) => setEditGovName(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleEditGov} disabled={savingGov || !editGovName.trim()}>
                {savingGov ? "جاري الحفظ..." : "حفظ التعديل"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit City Dialog */}
        <Dialog open={editCityOpen} onOpenChange={setEditCityOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>تعديل المدينة</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>اسم المدينة</Label>
                <Input value={editCityName} onChange={(e) => setEditCityName(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleEditCity} disabled={!editCityName.trim()}>حفظ التعديل</Button>
            </div>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

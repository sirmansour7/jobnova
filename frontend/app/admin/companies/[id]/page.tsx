"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ArrowRight, Building2, MapPin, Users, Briefcase, Globe, Calendar, Pencil } from "lucide-react"
import { apiJson } from "@/src/lib/api"
import { toast } from "sonner"

interface OrgDetail {
  id: string
  name: string
  slug: string
  description?: string
  industry?: string
  location?: string
  size?: string
  website?: string
  createdAt: string
  _count: { jobs: number; memberships: number }
}

interface OrgJob {
  id: string
  title: string
  category?: string
  jobType?: string
  isActive: boolean
  createdAt: string
  organization?: { id: string }
  _count?: { applications: number }
}

interface EditForm {
  name: string
  description: string
  industry: string
  location: string
  website: string
  size: string
}

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [org, setOrg] = useState<OrgDetail | null>(null)
  const [jobs, setJobs] = useState<OrgJob[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<EditForm>({
    name: "", description: "", industry: "", location: "", website: "", size: "",
  })

  useEffect(() => {
    if (!id) return
    async function load() {
      setLoading(true)
      try {
        const [orgData, jobsData] = await Promise.all([
          apiJson<OrgDetail>(`/v1/admin/orgs/${id}`),
          apiJson<{ items: OrgJob[] }>(`/v1/admin/jobs?limit=100`),
        ])
        setOrg(orgData)
        setForm({
          name: orgData.name ?? "",
          description: orgData.description ?? "",
          industry: orgData.industry ?? "",
          location: orgData.location ?? "",
          website: orgData.website ?? "",
          size: orgData.size ?? "",
        })
        setJobs((jobsData.items ?? []).filter((j: OrgJob) => j.organization?.id === id))
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  function formatDate(iso: string) {
    try { return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) }
    catch { return iso }
  }

  function handleChange(field: keyof EditForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!org) return
    setSaving(true)
    try {
      const updated = await apiJson<OrgDetail>(`/v1/admin/orgs/${org.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name || undefined,
          description: form.description || undefined,
          industry: form.industry || undefined,
          location: form.location || undefined,
          website: form.website || undefined,
          size: form.size || undefined,
        }),
      })
      setOrg(prev => prev ? { ...prev, ...updated } : prev)
      setEditOpen(false)
      toast.success("تم حفظ بيانات الشركة")
    } catch {
      toast.error("حدث خطأ أثناء الحفظ")
    } finally {
      setSaving(false)
    }
  }

  const allowedRoles = useMemo(() => ["admin"] as const, [])

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={allowedRoles}>
        <DashboardLayout>
          <div className="flex items-center justify-center py-20 text-muted-foreground">جاري التحميل...</div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (!org) {
    return (
      <ProtectedRoute allowedRoles={allowedRoles}>
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
            <p>لم يتم العثور على الشركة</p>
            <Button variant="outline" onClick={() => router.push("/admin/companies")}>العودة</Button>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/admin/companies")}>
                <ArrowRight className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                    {org.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
                  <p className="text-muted-foreground font-mono text-sm" dir="ltr">{org.slug}</p>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 ml-2" />
              تعديل البيانات
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Briefcase, label: "الوظائف", value: org._count.jobs },
              { icon: Users, label: "الأعضاء", value: org._count.memberships },
            ].map(({ icon: Icon, label, value }) => (
              <Card key={label} className="border-border bg-card">
                <CardContent className="flex items-center gap-3 p-4">
                  <Icon className="h-8 w-8 text-primary/60" />
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="border-border bg-card">
              <CardContent className="flex items-center gap-3 p-4">
                <Building2 className="h-8 w-8 text-primary/60" />
                <div>
                  <p className="text-sm text-muted-foreground">القطاع</p>
                  <p className="text-sm font-semibold text-foreground">{org.industry ?? "—"}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="flex items-center gap-3 p-4">
                <Calendar className="h-8 w-8 text-primary/60" />
                <div>
                  <p className="text-sm text-muted-foreground">تأسست</p>
                  <p className="text-sm font-semibold text-foreground">{formatDate(org.createdAt)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-base">معلومات الشركة</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {org.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">الوصف</p>
                    <p className="text-sm text-foreground">{org.description}</p>
                  </div>
                )}
                {org.location && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {org.location}
                  </div>
                )}
                {org.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" dir="ltr">
                      {org.website}
                    </a>
                  </div>
                )}
                {org.size && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">حجم الشركة</p>
                    <Badge variant="outline">{org.size} موظف</Badge>
                  </div>
                )}
                {!org.description && !org.location && !org.website && !org.size && (
                  <p className="text-sm text-muted-foreground">لا توجد معلومات إضافية</p>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">وظائف الشركة ({jobs.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-start">الوظيفة</TableHead>
                        <TableHead className="text-start">التخصص</TableHead>
                        <TableHead className="text-start">المتقدمون</TableHead>
                        <TableHead className="text-start">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">لا توجد وظائف</TableCell>
                        </TableRow>
                      ) : (
                        jobs.map((job) => (
                          <TableRow key={job.id} className="border-border">
                            <TableCell className="font-medium text-foreground">{job.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{job.category ?? "—"}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-foreground">{job._count?.applications ?? 0}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={job.isActive ? "border-green-500/30 text-green-500 text-xs" : "border-destructive/30 text-destructive text-xs"}>
                                {job.isActive ? "نشطة" : "متوقفة"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>تعديل بيانات الشركة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>اسم الشركة</Label>
                  <Input value={form.name} onChange={e => handleChange("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>القطاع</Label>
                  <Input value={form.industry} onChange={e => handleChange("industry", e.target.value)} placeholder="مثال: تقنية المعلومات" />
                </div>
                <div className="space-y-2">
                  <Label>الموقع</Label>
                  <Input value={form.location} onChange={e => handleChange("location", e.target.value)} placeholder="مثال: القاهرة، مصر" />
                </div>
                <div className="space-y-2">
                  <Label>حجم الشركة</Label>
                  <Input value={form.size} onChange={e => handleChange("size", e.target.value)} placeholder="مثال: 10-50" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>الموقع الإلكتروني</Label>
                  <Input value={form.website} onChange={e => handleChange("website", e.target.value)} dir="ltr" className="text-left" placeholder="https://example.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>وصف الشركة</Label>
                <Textarea value={form.description} onChange={e => handleChange("description", e.target.value)} rows={3} placeholder="وصف مختصر عن الشركة..." />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>إلغاء</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

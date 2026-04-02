"use client"

import { useState, useEffect, useMemo } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { apiJson } from "@/src/lib/api"
import { toast } from "sonner"

export interface OrgProfile {
  id: string
  name: string
  slug: string
  description?: string | null
  industry?: string | null
  website?: string | null
  location?: string | null
  size?: string | null
  createdAt: string
  _count?: { jobs: number; memberships: number }
}

interface FormState {
  name: string
  description: string
  industry: string
  website: string
  location: string
  size: string
}

export default function CompanyProfilePage() {
  const [company, setCompany] = useState<OrgProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    industry: "",
    website: "",
    location: "",
    size: "",
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await apiJson<OrgProfile | null>("/v1/orgs/my/profile")
        if (!cancelled && data) {
          setCompany(data)
          setForm({
            name: data.name ?? "",
            description: data.description ?? "",
            industry: data.industry ?? "",
            website: data.website ?? "",
            location: data.location ?? "",
            size: data.size ?? "",
          })
        } else if (!cancelled) {
          setCompany(null)
        }
      } catch {
        if (!cancelled) setCompany(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const allowedRoles = useMemo(() => ["hr"] as const, [])

  function formatDate(iso: string) {
    try {
      return new Date(iso).getFullYear().toString()
    } catch {
      return iso
    }
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!company) return
    setSaving(true)
    try {
      await apiJson(`/v1/orgs/${company.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name || undefined,
          description: form.description || undefined,
          industry: form.industry || undefined,
          website: form.website || undefined,
          location: form.location || undefined,
          size: form.size || undefined,
        }),
      })
      setCompany(prev => prev ? { ...prev, ...form } : prev)
      toast.success("تم حفظ بيانات الشركة")
    } catch {
      toast.error("حدث خطأ أثناء الحفظ")
    } finally {
      setSaving(false)
    }
  }

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

  if (!company) {
    return (
      <ProtectedRoute allowedRoles={allowedRoles}>
        <DashboardLayout>
          <div className="mx-auto max-w-3xl space-y-6">
            <p className="text-muted-foreground">لا توجد شركة مرتبطة بحسابك.</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  const logo = company.name.slice(0, 2).toUpperCase()

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">ملف الشركة</h1>
            <p className="text-muted-foreground">إدارة معلومات الشركة الظاهرة للمرشحين</p>
          </div>

          {/* Company Header */}
          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-4 p-6">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/20 text-lg font-bold text-primary">{logo}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold text-foreground">{form.name || company.name}</h2>
                <p className="text-sm text-muted-foreground">{company.slug}</p>
                <p className="text-xs text-muted-foreground">
                  {company._count?.jobs ?? 0} وظيفة · {company._count?.memberships ?? 0} أعضاء · تأسست عام {formatDate(company.createdAt)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Edit Form */}
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-foreground">معلومات الشركة</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>اسم الشركة</Label>
                  <Input
                    value={form.name}
                    onChange={e => handleChange("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>القطاع</Label>
                  <Input
                    value={form.industry}
                    onChange={e => handleChange("industry", e.target.value)}
                    placeholder="مثال: تقنية المعلومات"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الموقع</Label>
                  <Input
                    value={form.location}
                    onChange={e => handleChange("location", e.target.value)}
                    placeholder="مثال: القاهرة، مصر"
                  />
                </div>
                <div className="space-y-2">
                  <Label>حجم الشركة</Label>
                  <Input
                    value={form.size}
                    onChange={e => handleChange("size", e.target.value)}
                    placeholder="مثال: 1-10، 50-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الموقع الإلكتروني</Label>
                  <Input
                    value={form.website}
                    onChange={e => handleChange("website", e.target.value)}
                    dir="ltr"
                    className="text-left"
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>سنة التأسيس</Label>
                  <Input value={formatDate(company.createdAt)} dir="ltr" className="text-left" disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label>وصف الشركة</Label>
                <Textarea
                  value={form.description}
                  onChange={e => handleChange("description", e.target.value)}
                  rows={4}
                  placeholder="اكتب وصفاً مختصراً عن الشركة..."
                />
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

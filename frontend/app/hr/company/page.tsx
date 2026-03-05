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
import { Building2 } from "lucide-react"
import { apiJson } from "@/src/lib/api"

export interface OrgProfile {
  id: string
  name: string
  slug: string
  createdAt: string
  _count?: { jobs: number; memberships: number }
}

export default function CompanyProfilePage() {
  const [company, setCompany] = useState<OrgProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await apiJson<OrgProfile | null>("/v1/orgs/my/profile")
        if (!cancelled) setCompany(data ?? null)
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
                <h2 className="text-xl font-bold text-foreground">{company.name}</h2>
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
                  <Input defaultValue={company.name} />
                </div>
                <div className="space-y-2">
                  <Label>القطاع</Label>
                  <Input defaultValue="" placeholder="—" />
                </div>
                <div className="space-y-2">
                  <Label>الموقع</Label>
                  <Input defaultValue="" placeholder="—" />
                </div>
                <div className="space-y-2">
                  <Label>حجم الشركة</Label>
                  <Input defaultValue="" placeholder="—" />
                </div>
                <div className="space-y-2">
                  <Label>الموقع الإلكتروني</Label>
                  <Input defaultValue={company.slug} dir="ltr" className="text-left" placeholder="—" />
                </div>
                <div className="space-y-2">
                  <Label>سنة التأسيس</Label>
                  <Input defaultValue={formatDate(company.createdAt)} dir="ltr" className="text-left" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>وصف الشركة</Label>
                <Textarea defaultValue="" rows={4} placeholder="—" />
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button>حفظ التغييرات</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

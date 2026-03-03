"use client"

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
import { companies } from "@/src/data/companies"

const company = companies.find((c) => c.id === "6")!

export default function CompanyProfilePage() {
  return (
    <ProtectedRoute allowedRoles={["hr"]}>
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
                <AvatarFallback className="bg-primary/20 text-lg font-bold text-primary">{company.logo}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold text-foreground">{company.name}</h2>
                <p className="text-sm text-muted-foreground">{company.industry} - {company.location}</p>
                <p className="text-xs text-muted-foreground">{company.size} - تأسست عام {company.founded}</p>
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
                  <Input defaultValue={company.industry} />
                </div>
                <div className="space-y-2">
                  <Label>الموقع</Label>
                  <Input defaultValue={company.location} />
                </div>
                <div className="space-y-2">
                  <Label>حجم الشركة</Label>
                  <Input defaultValue={company.size} />
                </div>
                <div className="space-y-2">
                  <Label>الموقع الإلكتروني</Label>
                  <Input defaultValue={company.website} dir="ltr" className="text-left" />
                </div>
                <div className="space-y-2">
                  <Label>سنة التأسيس</Label>
                  <Input defaultValue={company.founded} dir="ltr" className="text-left" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>وصف الشركة</Label>
                <Textarea defaultValue={company.description} rows={4} />
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

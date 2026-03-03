"use client"

import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"

export default function CandidateSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["candidate"]}>
      <DashboardLayout>
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">الإعدادات</h1>
            <p className="text-muted-foreground">إدارة حسابك والتفضيلات</p>
          </div>

          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-foreground">المعلومات الشخصية</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input defaultValue="أحمد محمد" />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input defaultValue="ahmed@example.com" dir="ltr" className="text-left" />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <Input defaultValue="01012345678" dir="ltr" className="text-left" />
                </div>
                <div className="space-y-2">
                  <Label>الموقع</Label>
                  <Input defaultValue="القاهرة" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button>حفظ التغييرات</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-foreground">تغيير كلمة المرور</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>كلمة المرور الحالية</Label>
                <Input type="password" dir="ltr" className="text-left" />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور الجديدة</Label>
                <Input type="password" dir="ltr" className="text-left" />
              </div>
              <div className="space-y-2">
                <Label>تأكيد كلمة المرور</Label>
                <Input type="password" dir="ltr" className="text-left" />
              </div>
              <div className="flex justify-end">
                <Button>تحديث كلمة المرور</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-foreground">الإشعارات</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">إشعارات البريد الإلكتروني</p>
                  <p className="text-xs text-muted-foreground">استلم إشعارات عن الوظائف الجديدة</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">تحديثات الطلبات</p>
                  <p className="text-xs text-muted-foreground">استلم إشعارات عند تغيير حالة طلبك</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">الرسائل</p>
                  <p className="text-xs text-muted-foreground">استلم إشعارات عند وصول رسائل جديدة</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border border-destructive/20 bg-card">
            <CardHeader><CardTitle className="text-destructive">منطقة الخطر</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">حذف حسابك سيؤدي إلى إزالة جميع بياناتك نهائيًا.</p>
              <Button variant="destructive">حذف الحساب</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

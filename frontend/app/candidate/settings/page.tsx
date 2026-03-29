"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { apiJson } from "@/src/lib/api"
import { deleteCookie } from "@/src/lib/cookies"

interface MeResponse {
  id: string
  fullName: string
  email: string
  role: string
  emailVerified: boolean
}

export default function CandidateSettingsPage() {
  const allowedRoles = useMemo(() => ["candidate"] as const, [])
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")

  const [saving, setSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)

  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const me = await apiJson<MeResponse>("/v1/auth/me")
        if (cancelled) return
        setFullName(me.fullName ?? "")
        setEmail(me.email ?? "")
        // phone/location not yet supported in backend; leave empty but editable
        setPhone("")
        setLocation("")
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "حدث خطأ أثناء تحميل البيانات")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSavePersonal = async () => {
    setSaving(true)
    try {
      await apiJson<MeResponse>("/v1/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ fullName }),
      })
      toast.success("تم حفظ التغييرات بنجاح")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ"
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("يرجى ملء جميع حقول كلمة المرور")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("كلمة المرور الجديدة وتأكيدها غير متطابقتين")
      return
    }
    if (newPassword.length < 8) {
      toast.error("يجب أن تكون كلمة المرور الجديدة 8 أحرف على الأقل")
      return
    }
    setPasswordSaving(true)
    try {
      await apiJson("/v1/auth/me/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      toast.success("تم تحديث كلمة المرور بنجاح")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "فشل تحديث كلمة المرور"
      toast.error(errorMessage)
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm("هل أنت متأكد من حذف حسابك؟ هذا الإجراء لا يمكن التراجع عنه.")) return
    setDeleting(true)
    try {
      await apiJson("/v1/auth/me", { method: "DELETE" })
      deleteCookie("jobnova_token")
      deleteCookie("jobnova_refresh")
      deleteCookie("jobnova_user")
      toast.success("تم حذف الحساب بنجاح")
      router.replace("/")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "فشل حذف الحساب"
      toast.error(errorMessage)
      setDeleting(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">الإعدادات</h1>
            <p className="text-muted-foreground">إدارة حسابك والتفضيلات</p>
          </div>

          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-foreground">المعلومات الشخصية</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>الاسم الكامل</Label>
                    <Skeleton className="h-9 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Label>البريد الإلكتروني</Label>
                    <Skeleton className="h-9 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهاتف</Label>
                    <Skeleton className="h-9 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Label>الموقع</Label>
                    <Skeleton className="h-9 w-full" />
                  </div>
                </div>
              ) : (
                <>
                  {loadError && (
                    <p className="text-sm text-destructive">{loadError}</p>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>الاسم الكامل</Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>البريد الإلكتروني</Label>
                      <Input
                        value={email}
                        dir="ltr"
                        className="text-left"
                        disabled
                        readOnly
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رقم الهاتف</Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        dir="ltr"
                        className="text-left"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الموقع</Label>
                      <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSavePersonal} disabled={saving}>
                      {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-foreground">تغيير كلمة المرور</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>كلمة المرور الحالية</Label>
                <Input
                  type="password"
                  dir="ltr"
                  className="text-left"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور الجديدة</Label>
                <Input
                  type="password"
                  dir="ltr"
                  className="text-left"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>تأكيد كلمة المرور</Label>
                <Input
                  type="password"
                  dir="ltr"
                  className="text-left"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleChangePassword} disabled={passwordSaving}>
                  {passwordSaving ? "جاري التحديث..." : "تحديث كلمة المرور"}
                </Button>
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
              <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
                {deleting ? "جاري الحذف..." : "حذف الحساب"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

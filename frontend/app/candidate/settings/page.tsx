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
  const [errors, setErrors] = useState<Record<string, string>>({})

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

  const validatePersonal = () => {
    const newErrors: Record<string, string> = {}
    if (!fullName.trim()) {
      newErrors.fullName = "هذا الحقل مطلوب"
    }
    setErrors(prev => ({ ...prev, ...newErrors }))
    return !newErrors.fullName
  }

  const handleSavePersonal = async () => {
    if (!validatePersonal()) return
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

  const validatePassword = () => {
    const newErrors: Record<string, string> = {}
    if (!currentPassword) {
      newErrors.currentPassword = "هذا الحقل مطلوب"
    }
    if (!newPassword) {
      newErrors.newPassword = "هذا الحقل مطلوب"
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "هذا الحقل مطلوب"
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "كلمتا المرور غير متطابقتين"
    }
    setErrors(prev => ({ ...prev, ...newErrors }))
    return !newErrors.currentPassword && !newErrors.newPassword && !newErrors.confirmPassword
  }

  const handleChangePassword = async () => {
    if (!validatePassword()) return
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
      // Call logout to clear HttpOnly cookies (jobnova_token & jobnova_refresh)
      // since JS cannot delete HttpOnly cookies directly
      await apiJson("/v1/auth/logout", { method: "POST" }).catch(() => null)
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
            <CardContent>
              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 p-6">
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
                <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-4 p-6">
                  {loadError && (
                    <p className="text-sm text-destructive">{loadError}</p>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>الاسم الكامل</Label>
                      <Input
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value)
                          setErrors(prev => ({ ...prev, fullName: "" }))
                        }}
                      />
                      {errors.fullName && (
                        <p className="text-red-400 text-xs mt-1 text-right">{errors.fullName}</p>
                      )}
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
                    <Button type="button" onClick={handleSavePersonal} disabled={saving}>
                      {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-foreground">تغيير كلمة المرور</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-4 p-6">
                <div className="space-y-2">
                  <Label>كلمة المرور الحالية</Label>
                  <Input
                    type="password"
                    dir="ltr"
                    className="text-left"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value)
                      setErrors(prev => ({ ...prev, currentPassword: "" }))
                    }}
                  />
                  {errors.currentPassword && (
                    <p className="text-red-400 text-xs mt-1 text-right">{errors.currentPassword}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور الجديدة</Label>
                  <Input
                    type="password"
                    dir="ltr"
                    className="text-left"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      setErrors(prev => ({ ...prev, newPassword: "" }))
                    }}
                  />
                  {errors.newPassword && (
                    <p className="text-red-400 text-xs mt-1 text-right">{errors.newPassword}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>تأكيد كلمة المرور</Label>
                  <Input
                    type="password"
                    dir="ltr"
                    className="text-left"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setErrors(prev => ({ ...prev, confirmPassword: "" }))
                    }}
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1 text-right">{errors.confirmPassword}</p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button type="button" onClick={handleChangePassword} disabled={passwordSaving}>
                    {passwordSaving ? "جاري التحديث..." : "تحديث كلمة المرور"}
                  </Button>
                </div>
              </form>
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

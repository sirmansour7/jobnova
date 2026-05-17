"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/src/lib/api"

type Step = "form" | "success"

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>("form")
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!token) {
    return (
      <div className="bg-gradient-auth noise-overlay relative flex min-h-screen items-center justify-center px-4">
        <div className="relative z-10 w-full max-w-md">
          <Card className="border-border bg-card text-center">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">إعادة تعيين كلمة المرور</CardTitle>
              <CardDescription>حدث خطأ في رابط إعادة التعيين</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-destructive">رابط غير صالح</p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">العودة للرئيسية</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
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
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setError("")

    setLoading(true)
    try {
      const res = await api("/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      })

      if (!res.ok) {
        let message = "حدث خطأ أثناء إعادة تعيين كلمة المرور"
        try {
          const data = await res.json()
          if (data?.message && typeof data.message === "string") {
            message = data.message
          }
        } catch {
          // ignore parse error
        }
        setError(message)
        setLoading(false)
        return
      }

      setStep("success")
    } catch {
      setError("حدث خطأ أثناء الاتصال بالخادم")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-auth noise-overlay relative flex min-h-screen items-center justify-center px-4">
      <div className="relative z-10 w-full max-w-md">
        <Card className="border-border bg-card">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-foreground">إعادة تعيين كلمة المرور</CardTitle>
            <CardDescription>قم بإدخال كلمة المرور الجديدة لحسابك</CardDescription>
          </CardHeader>
          <CardContent>
            {step === "form" ? (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="********"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      setErrors(prev => ({ ...prev, newPassword: "" }))
                    }}
                    required
                    dir="ltr"
                    className="text-left"
                  />
                  {errors.newPassword && (
                    <p className="text-red-400 text-xs mt-1 text-right">{errors.newPassword}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="********"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setErrors(prev => ({ ...prev, confirmPassword: "" }))
                    }}
                    required
                    dir="ltr"
                    className="text-left"
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1 text-right">{errors.confirmPassword}</p>
                  )}
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  إعادة تعيين كلمة المرور
                </Button>
              </form>
            ) : (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-500">تم تغيير كلمة المرور بنجاح ✓</p>
                <Button asChild className="w-full">
                  <Link href="/login">تسجيل الدخول</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}

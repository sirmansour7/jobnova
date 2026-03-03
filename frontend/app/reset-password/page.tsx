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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newPassword.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين")
      return
    }

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
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="********"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    dir="ltr"
                    className="text-left"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="********"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    dir="ltr"
                    className="text-left"
                  />
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}

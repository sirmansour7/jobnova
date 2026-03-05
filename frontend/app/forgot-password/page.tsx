"use client"

import { useState } from "react"
import Link from "next/link"
import { Logo } from "@/components/shared/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, MailCheck } from "lucide-react"
import { apiJson } from "@/src/lib/api"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await apiJson("/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ، يرجى المحاولة لاحقاً"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-auth noise-overlay relative flex min-h-screen items-center justify-center px-4">
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="large" />
        </div>
        <Card className="border-border bg-card">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-foreground">نسيت كلمة المرور؟</CardTitle>
            <CardDescription>أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين</CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <MailCheck className="h-12 w-12 text-primary" />
                <p className="text-sm font-medium text-foreground">تم إرسال رابط إعادة التعيين!</p>
                <p className="text-xs text-muted-foreground">تحقق من بريدك الإلكتروني واتبع التعليمات</p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">العودة لتسجيل الدخول</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    dir="ltr"
                    className="text-left"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  إرسال رابط إعادة التعيين
                </Button>
                <div className="text-center">
                  <Link href="/login" className="text-sm text-primary hover:underline">
                    العودة لتسجيل الدخول
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

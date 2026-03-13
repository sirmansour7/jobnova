"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { MailCheck, Loader2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/src/lib/api"

function VerifyEmailSentContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!countdown) return
    const id = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [countdown])

  const handleResend = async () => {
    if (!email || loading || countdown > 0) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await api("/v1/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message = (data as { message?: string | string[] }).message ?? "حدث خطأ أثناء إعادة إرسال البريد الإلكتروني"
        setError(Array.isArray(message) ? message[0] : message)
        return
      }
      setSuccess((data as { message?: string }).message ?? "تم إرسال البريد الإلكتروني بنجاح ✔")
      setCountdown(60)
    } catch {
      setError("خطأ في الاتصال بالخادم. تأكد من اتصالك بالإنترنت.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-auth noise-overlay relative flex min-h-screen items-center justify-center px-4">
      <div className="relative z-10 w-full max-w-md">
        <Card className="border-border bg-card text-center">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">تحقق من بريدك الإلكتروني</CardTitle>
            <CardDescription>لقد أرسلنا رابط التفعيل إلى بريدك الإلكتروني</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-3">
              <MailCheck className="h-12 w-12 text-primary" />
              <p className="text-sm text-muted-foreground">
                أرسلنا رابط تأكيد إلى بريدك الإلكتروني. يرجى فتح الرسالة والضغط على رابط التفعيل.
              </p>
            </div>
            {email && (
              <div className="space-y-2">
                <Button type="button" className="w-full" disabled={loading || countdown > 0} onClick={handleResend}>
                  {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  {countdown > 0 ? `إعادة الإرسال بعد ${countdown}s` : "إعادة إرسال بريد التفعيل"}
                </Button>
                {success && <p className="text-xs text-emerald-500">{success}</p>}
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>
            )}
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">العودة لتسجيل الدخول</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function VerifyEmailSentPage() {
  return (
    <Suspense>
      <VerifyEmailSentContent />
    </Suspense>
  )
}

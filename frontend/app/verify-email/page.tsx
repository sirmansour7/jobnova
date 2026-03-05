"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/src/lib/api"

type Status = "idle" | "loading" | "success" | "error"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status>("idle")

  useEffect(() => {
    const verify = async () => {
      const token = searchParams.get("token")
      if (!token) {
        setStatus("error")
        return
      }
      setStatus("loading")
      try {
        const res = await api("/v1/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token }),
        })
        if (!res.ok) { setStatus("error"); return }
        setStatus("success")
      } catch {
        setStatus("error")
      }
    }
    void verify()
  }, [searchParams])

  return (
    <div className="bg-gradient-auth noise-overlay relative flex min-h-screen items-center justify-center px-4">
      <div className="relative z-10 w-full max-w-md">
        <Card className="border-border bg-card text-center">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">تأكيد البريد الإلكتروني</CardTitle>
            <CardDescription>نقوم الآن بالتحقق من رابط التفعيل الخاص بك</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {(status === "loading" || status === "idle") && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">جاري التحقق من بريدك الإلكتروني...</p>
              </div>
            )}
            {status === "success" && (
              <div className="flex flex-col items-center gap-4">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-500">تم التحقق من بريدك الإلكتروني بنجاح ✓</p>
                <Button asChild className="w-full">
                  <Link href="/login">تسجيل الدخول</Link>
                </Button>
              </div>
            )}
            {status === "error" && (
              <div className="flex flex-col items-center gap-4">
                <XCircle className="h-12 w-12 text-destructive" />
                <p className="text-sm font-medium text-destructive">الرابط غير صالح أو منتهي الصلاحية</p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/">العودة للرئيسية</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}

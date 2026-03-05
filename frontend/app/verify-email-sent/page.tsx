"use client"

import Link from "next/link"
import { MailCheck } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function VerifyEmailSentPage() {
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
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">العودة لتسجيل الدخول</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


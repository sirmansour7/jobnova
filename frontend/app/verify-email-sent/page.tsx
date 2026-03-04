import Link from "next/link"
import { MailCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function VerifyEmailSentPage() {
  return (
    <div className="bg-gradient-auth noise-overlay relative flex min-h-screen items-center justify-center px-4">
      <div className="relative z-10 w-full max-w-md">
        <Card className="border-border bg-card text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <MailCheck className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-xl text-foreground">تحقق من بريدك الإلكتروني</CardTitle>
            <CardDescription>
              تم إرسال رسالة تأكيد إلى بريدك الإلكتروني
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              يرجى التحقق من بريدك الإلكتروني والضغط على رابط التفعيل لتفعيل حسابك
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">العودة لتسجيل الدخول</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

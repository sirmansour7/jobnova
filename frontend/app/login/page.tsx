"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/src/context/auth-context"
import { Logo } from "@/components/shared/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { api } from "@/src/lib/api"

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      await api("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
    } catch {
      // Ignore network errors for now; auth-context will still handle local auth logic
    }

    const result = await login(email, password)
    if (!result.success) {
      setError(result.error ?? "حدث خطأ")
    }
    setLoading(false)
  }

  return (
    <div className="bg-gradient-auth noise-overlay relative flex min-h-screen items-center justify-center px-4">
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="large" />
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-foreground">تسجيل الدخول</CardTitle>
            <CardDescription>ادخل بياناتك للوصول إلى حسابك</CardDescription>
          </CardHeader>
          <CardContent>
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
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    dir="ltr"
                    className="pe-10 text-left"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="shadow-blue-glow w-full" disabled={loading}>
                {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                تسجيل الدخول
              </Button>
            </form>

            <div className="mt-6 space-y-3 rounded-lg border border-border bg-secondary/50 p-4">
              <p className="text-center text-xs font-medium text-muted-foreground">حسابات تجريبية</p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>باحث عن عمل:</span>
                  <code className="rounded bg-secondary px-2 py-0.5 text-foreground" dir="ltr">ahmed@example.com</code>
                </div>
                <div className="flex items-center justify-between">
                  <span>مسؤول توظيف:</span>
                  <code className="rounded bg-secondary px-2 py-0.5 text-foreground" dir="ltr">sara@fawry.com</code>
                </div>
                <div className="flex items-center justify-between">
                  <span>مدير النظام:</span>
                  <code className="rounded bg-secondary px-2 py-0.5 text-foreground" dir="ltr">admin@jobnova.com</code>
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground">كلمة المرور: أي شيء</p>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              ليس لديك حساب؟{" "}
              <Link href="/register" className="text-primary hover:underline">
                سجل الآن
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

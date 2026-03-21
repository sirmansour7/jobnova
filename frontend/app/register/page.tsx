"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Logo } from "@/components/shared/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { api, API_URL } from "@/src/lib/api"

type UserRole = "candidate" | "hr" | "admin"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>("candidate")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await api("/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ fullName: name, email, password, role }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = (data as { message?: string | string[] }).message
        setError(Array.isArray(msg) ? msg[0] : msg ?? "حدث خطأ أثناء إنشاء الحساب")
        setLoading(false)
        return
      }

      const data = (await res.json().catch(() => ({}))) as { warning?: string }
      if (typeof data?.warning === "string" && data.warning.trim()) {
        toast.warning(data.warning.trim())
      }

      router.push(`/verify-email-sent?email=${encodeURIComponent(email)}`)
    } catch {
      setError("خطأ في الاتصال بالخادم. تأكد من اتصالك بالإنترنت.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-auth noise-overlay relative flex min-h-screen items-center justify-center px-4 py-8">
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="large" />
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-foreground">إنشاء حساب جديد</CardTitle>
            <CardDescription>أنشئ حسابك وابدأ رحلتك المهنية</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم الكامل</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="محمد أحمد"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
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

              <div className="space-y-3">
                <Label>نوع الحساب</Label>
                <RadioGroup
                  value={role}
                  onValueChange={(val) => setRole(val as UserRole)}
                  className="grid grid-cols-2 gap-3"
                >
                  <label
                    htmlFor="candidate"
                    className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-sm transition-colors ${
                      role === "candidate" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <RadioGroupItem value="candidate" id="candidate" className="sr-only" />
                    باحث عن عمل
                  </label>
                  <label
                    htmlFor="hr"
                    className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-sm transition-colors ${
                      role === "hr" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <RadioGroupItem value="hr" id="hr" className="sr-only" />
                    مسؤول توظيف
                  </label>
                </RadioGroup>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="shadow-blue-glow w-full" disabled={loading}>
                {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                إنشاء الحساب
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">أو</span>
              </div>
            </div>

            <a
              href={`${API_URL}/v1/auth/google`}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              التسجيل بـ Google
            </a>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              لديك حساب بالفعل؟{" "}
              <Link href="/login" className="text-primary hover:underline">
                سجل دخول
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

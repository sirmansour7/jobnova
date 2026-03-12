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
import { api } from "@/src/lib/api"

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

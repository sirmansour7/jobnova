"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { apiJson } from "@/src/lib/api"

export default function CreateOrgPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [industry, setIndustry] = useState("")
  const [website, setWebsite] = useState("")
  const [location, setLocation] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("اسم الشركة مطلوب")
      return
    }
    setSubmitting(true)
    try {
      await apiJson("/v1/orgs", {
        method: "POST",
        body: JSON.stringify({
          name: trimmedName,
          ...(description.trim() && { description: description.trim() }),
          ...(industry.trim() && { industry: industry.trim() }),
          ...(website.trim() && { website: website.trim() }),
          ...(location.trim() && { location: location.trim() }),
        }),
      })
      router.push("/hr/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ، جرّب لاحقًا")
    } finally {
      setSubmitting(false)
    }
  }

  const allowedRoles = useMemo(() => ["hr"] as const, [])

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="mx-auto max-w-xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">إنشاء الشركة</h1>
            <p className="text-muted-foreground">أدخل بيانات شركتك لبدء نشر الوظائف</p>
          </div>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">ملف الشركة</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" dir="rtl">
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
                    اسم الشركة <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: شركة التقنية المتقدمة"
                    className="w-full"
                    maxLength={100}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-foreground">
                    وصف الشركة
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="نبذة قصيرة عن الشركة ونشاطها..."
                    rows={4}
                    maxLength={500}
                    disabled={submitting}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{description.length}/500</p>
                </div>

                <div>
                  <label htmlFor="industry" className="mb-1.5 block text-sm font-medium text-foreground">
                    المجال
                  </label>
                  <Input
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="مثال: تكنولوجيا المعلومات"
                    className="w-full"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label htmlFor="website" className="mb-1.5 block text-sm font-medium text-foreground">
                    الموقع الإلكتروني
                  </label>
                  <Input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label htmlFor="location" className="mb-1.5 block text-sm font-medium text-foreground">
                    الموقع الجغرافي
                  </label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="مثال: القاهرة، مصر"
                    className="w-full"
                    disabled={submitting}
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" disabled={submitting}>
                  {submitting ? "جاري الحفظ..." : "إنشاء الشركة"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

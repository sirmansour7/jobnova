"use client"

import { useState, useEffect, useCallback } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bookmark } from "lucide-react"
import Link from "next/link"
import { apiJson } from "@/src/lib/api"

interface SavedJobEntry {
  id: string
  jobId: string
  createdAt: string
  job: {
    id: string
    title: string
    partnerName: string | null
    governorate: string | null
    city: string | null
    jobType: string | null
    salaryMin: number | null
    salaryMax: number | null
    currency: string | null
    category: string | null
    organization?: { id: string; name: string } | null
  }
}

export default function SavedJobsPage() {
  const [savedJobs, setSavedJobs] = useState<SavedJobEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSaved = useCallback(() => {
    setLoading(true)
    setError(null)
    apiJson<SavedJobEntry[]>("/v1/saved-jobs")
      .then((list) => setSavedJobs(Array.isArray(list) ? list : []))
      .catch((err) => setError(err instanceof Error ? err.message : "فشل التحميل"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchSaved()
  }, [fetchSaved])

  const handleUnsave = useCallback(
    async (jobId: string) => {
      try {
        await apiJson<{ saved: boolean }>(`/v1/saved-jobs/${jobId}`, { method: "POST" })
        setSavedJobs((prev) => prev.filter((s) => s.jobId !== jobId))
      } catch {
        // keep list unchanged on error
      }
    },
    []
  )

  const allowedRoles = ["candidate"] as const

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">الوظائف المحفوظة</h1>
            <p className="text-muted-foreground">
              {loading ? "جاري التحميل..." : error ?? `لديك ${savedJobs.length} وظيفة محفوظة`}
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">جاري التحميل...</p>
          ) : error ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-lg font-medium text-destructive">{error}</p>
              </CardContent>
            </Card>
          ) : savedJobs.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bookmark className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium text-foreground">لم تقم بحفظ أي وظيفة بعد</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <Link href="/jobs" className="text-primary hover:underline">تصفح الوظائف</Link> واحفظ ما يهمك
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {savedJobs.map((entry) => {
                const job = entry.job
                const location = [job.city, job.governorate].filter(Boolean).join("، ") || "—"
                const salary =
                  job.salaryMin != null && job.salaryMax != null
                    ? `${job.salaryMin.toLocaleString("en-US")} - ${job.salaryMax.toLocaleString("en-US")} ${job.currency ?? "جنيه"}`
                    : null
                return (
                  <Card key={entry.id} className="border-border bg-card overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-primary font-bold text-sm">
                            {(job.organization?.name ?? job.partnerName ?? "JN").slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0" dir="rtl">
                            <Link
                              href={`/jobs/${job.id}`}
                              className="font-semibold text-foreground text-base truncate block hover:underline"
                            >
                              {job.title}
                            </Link>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {job.organization?.name ?? job.partnerName ?? "—"} · {location}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {job.category && (
                                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary font-medium">
                                  {job.category}
                                </span>
                              )}
                              {job.jobType && (
                                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                                  {job.jobType}
                                </span>
                              )}
                            </div>
                            {salary && (
                              <p className="text-xs text-green-500 font-medium mt-1.5" dir="ltr">
                                {salary}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleUnsave(job.id)}
                          >
                            إلغاء الحفظ
                          </Button>
                          <Button variant="default" size="sm" asChild>
                            <Link href={`/jobs/${job.id}`}>عرض</Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

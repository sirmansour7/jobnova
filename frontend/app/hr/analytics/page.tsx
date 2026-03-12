"use client"

import { useEffect, useMemo, useState } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { apiJson } from "@/src/lib/api"
import { toast } from "sonner"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts"

type ApplicationsByStatus = { status: string; count: number }
type TopJob = { title: string; applicationCount: number }
type ApplicationsOverTime = { date: string; count: number }

interface HrAnalyticsResponse {
  totalJobs: number
  activeJobs: number
  totalApplications: number
  applicationsByStatus: ApplicationsByStatus[]
  topJobs: TopJob[]
  applicationsOverTime: ApplicationsOverTime[]
}

const STATUS_LABEL_AR: Record<string, string> = {
  APPLIED: "قيد المراجعة",
  SHORTLISTED: "مقبول مبدئيًا",
  REJECTED: "مرفوض",
  HIRED: "مقبول",
}

const COLORS: string[] = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

function formatDateLabel(iso: string) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString("ar-EG", { month: "numeric", day: "numeric" })
  } catch {
    return iso
  }
}

export default function HrAnalyticsPage() {
  const allowedRoles = useMemo(() => ["hr"] as const, [])
  const [data, setData] = useState<HrAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await apiJson<HrAnalyticsResponse>("/v1/hr/analytics")
        if (cancelled) return
        setData(res)
      } catch (err) {
        if (cancelled) return
        const msg =
          err instanceof Error ? err.message : "فشل تحميل لوحة تحليلات الشركة"
        setError(msg)
        toast.error(msg)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              تحليلات الشركة
            </h1>
            <p className="text-muted-foreground">
              نظرة عامة على أداء وظائفك وطلبات المرشحين
            </p>
          </div>

          {loading && !data ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-border bg-card">
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-24 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}

          {data && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border-border bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">إجمالي الوظائف</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">
                      {data.totalJobs}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">الوظائف النشطة</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">
                      {data.activeJobs}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">
                      {data.totalApplications}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-foreground">
                      الطلبات حسب الحالة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[320px]">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={data.applicationsByStatus.map((row, idx) => ({
                          name: STATUS_LABEL_AR[row.status] ?? row.status,
                          count: row.count,
                          fill: COLORS[idx % COLORS.length],
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tickLine={false} />
                        <YAxis allowDecimals={false} />
                        <Tooltip
                          formatter={(v: any) => [`${v}`, "عدد الطلبات"]}
                          labelFormatter={(l) => `الحالة: ${l}`}
                        />
                        <Legend />
                        <Bar dataKey="count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-foreground">
                      الطلبات خلال آخر ٣٠ يومًا
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[320px]">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={data.applicationsOverTime.map((row) => ({
                          ...row,
                          label: formatDateLabel(row.date),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tickLine={false} />
                        <YAxis allowDecimals={false} />
                        <Tooltip
                          formatter={(v: any) => [`${v}`, "عدد الطلبات"]}
                          labelFormatter={(l) => `اليوم: ${l}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="hsl(var(--chart-2))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    أكثر الوظائف طلبًا
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.topJobs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      لا توجد بيانات متاحة بعد.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.topJobs.map((job, idx) => (
                        <div
                          key={`${job.title}-${idx}`}
                          className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-3 py-2"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {job.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {job.applicationCount} طلب
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}


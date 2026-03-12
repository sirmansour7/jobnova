"use client"

import { useEffect, useMemo, useState } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
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
  PieChart,
  Pie,
  LineChart,
  Line,
  CartesianGrid,
  Cell,
} from "recharts"

type ApplicationsByStatus = { status: string; count: number }
type JobsByCategory = { category: string; count: number }
type TopOrg = { name: string; jobCount: number; applicationCount: number }
type ApplicationsOverTime = { date: string; count: number }

interface AdminAnalyticsResponse {
  totalOrgs: number
  totalJobs: number
  totalCandidates: number
  totalApplications: number
  applicationsByStatus: ApplicationsByStatus[]
  jobsByCategory: JobsByCategory[]
  topOrgs: TopOrg[]
  applicationsOverTime: ApplicationsOverTime[]
}

const STATUS_LABEL_AR: Record<string, string> = {
  APPLIED: "قيد المراجعة",
  SHORTLISTED: "مقبول مبدئيًا",
  REJECTED: "مرفوض",
  HIRED: "مقبول",
}

const STATUS_COLORS: string[] = [
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

export default function AdminAnalyticsPage() {
  const allowedRoles = useMemo(() => ["admin"] as const, [])
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await apiJson<AdminAnalyticsResponse>("/v1/admin/analytics")
        if (cancelled) return
        setData(res)
      } catch (err) {
        if (cancelled) return
        const msg =
          err instanceof Error ? err.message : "فشل تحميل لوحة التحليلات"
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
            <h1 className="text-2xl font-bold text-foreground">لوحة تحليلات المنصة</h1>
            <p className="text-muted-foreground">
              نظرة عامة على أداء JobNova عبر الشركات والوظائف والمرشحين
            </p>
          </div>

          {loading && !data ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border-border bg-card">
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-20 mb-2" />
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
              {/* Stat cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">إجمالي الشركات</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">
                      {data.totalOrgs}
                    </p>
                  </CardContent>
                </Card>
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
                    <p className="text-sm text-muted-foreground">إجمالي المرشحين</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">
                      {data.totalCandidates}
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

              {/* Charts */}
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
                          fill: STATUS_COLORS[idx % STATUS_COLORS.length],
                        }))}
                        layout="horizontal"
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
                      الوظائف حسب الفئة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[320px]">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={data.jobsByCategory}
                          dataKey="count"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={(entry) => entry.category}
                        >
                          {data.jobsByCategory.map((_, idx) => (
                            <Cell
                              key={`cell-${idx}`}
                              fill={STATUS_COLORS[idx % STATUS_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: any) => [`${v}`, "عدد الوظائف"]}
                          labelFormatter={(l) => `الفئة: ${l}`}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

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
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    أكثر الشركات نشاطًا
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.topOrgs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      لا توجد بيانات متاحة بعد.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.topOrgs.map((org) => (
                        <div
                          key={org.name}
                          className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-3 py-2"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {org.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {org.jobCount} وظيفة • {org.applicationCount} طلب
                            </span>
                          </div>
                          <Badge variant="outline" className="border-primary/20 text-primary">
                            نشاط مرتفع
                          </Badge>
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


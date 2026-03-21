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
  PieChart,
  Pie,
  Cell,
} from "recharts"

type ApplicationsByStatus = { status: string; count: number }
type TopJob = { title: string; applicationCount: number }
type ApplicationsOverTime = { date: string; count: number }
type HireFunnelItem = { stage: string; count: number }
type TopSkillItem = { skill: string; count: number }
type ApplicationsByCategory = { category: string; count: number }

interface HrAnalyticsResponse {
  totalJobs: number
  activeJobs: number
  totalApplications: number
  applicationsByStatus: ApplicationsByStatus[]
  topJobs: TopJob[]
  applicationsOverTime: ApplicationsOverTime[]
  hireFunnel: HireFunnelItem[]
  topApplicantSkills: TopSkillItem[]
  applicationsByCategory: ApplicationsByCategory[]
  avgDaysToHire: number
  hireRate: number
}

const STATUS_LABEL_AR: Record<string, string> = {
  APPLIED: "قيد المراجعة",
  SHORTLISTED: "مقبول مبدئيًا",
  REJECTED: "مرفوض",
  HIRED: "مقبول",
}

const FUNNEL_LABEL_AR: Record<string, string> = {
  APPLIED: "تقديم",
  SHORTLISTED: "قائمة مختصرة",
  HIRED: "توظيف",
}

const CATEGORY_LABEL_AR: Record<string, string> = {
  TECHNOLOGY: "تكنولوجيا",
  MARKETING: "تسويق",
  FINANCE: "مالية",
  HEALTHCARE: "صحة",
  EDUCATION: "تعليم",
  ENGINEERING: "هندسة",
  SALES: "مبيعات",
  DESIGN: "تصميم",
  OPERATIONS: "عمليات",
  LEGAL: "قانون",
  HR: "موارد بشرية",
  CUSTOMER_SERVICE: "خدمة عملاء",
  OTHER: "أخرى",
}

const COLORS: string[] = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
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
            <div className="grid gap-4 sm:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
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
              {/* ── Metric Cards ── */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                <Card className="border-border bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">نسبة التوظيف</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">
                      {data.hireRate}%
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">متوسط أيام التوظيف</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">
                      {data.avgDaysToHire} يوم
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* ── Charts Row 1 ── */}
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
                          formatter={(v: number) => [`${v}`, "عدد الطلبات"]}
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
                          formatter={(v: number) => [`${v}`, "عدد الطلبات"]}
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

              {/* ── Charts Row 2 ── */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Hire Funnel */}
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-foreground">
                      قمع التوظيف
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[320px]">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        layout="vertical"
                        data={(data.hireFunnel ?? []).map((row) => ({
                          name: FUNNEL_LABEL_AR[row.stage] ?? row.stage,
                          count: row.count,
                        }))}
                        margin={{ left: 20, right: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tickLine={false} width={90} />
                        <Tooltip
                          formatter={(v: number) => [`${v}`, "عدد المرشحين"]}
                        />
                        <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Applications by Category */}
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-foreground">
                      الطلبات حسب التصنيف
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[320px] flex items-center justify-center">
                    {(data.applicationsByCategory ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">لا توجد بيانات</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={(data.applicationsByCategory ?? []).map((row) => ({
                              name: CATEGORY_LABEL_AR[row.category] ?? row.category,
                              value: row.count,
                            }))}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            dataKey="value"
                            label={({ name, percent }) =>
                              `${name} (${Math.round((percent ?? 0) * 100)}%)`
                            }
                          >
                            {(data.applicationsByCategory ?? []).map((_, idx) => (
                              <Cell
                                key={idx}
                                fill={COLORS[idx % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v: number) => [`${v}`, "عدد الطلبات"]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* ── Charts Row 3 ── */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Top Applicant Skills */}
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-foreground">
                      أبرز مهارات المرشحين
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[320px]">
                    {(data.topApplicantSkills ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground pt-4">لا توجد بيانات</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={(data.topApplicantSkills ?? []).map((row) => ({
                            name: row.skill,
                            count: row.count,
                          }))}
                          margin={{ bottom: 40 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            tickLine={false}
                            angle={-35}
                            textAnchor="end"
                            interval={0}
                          />
                          <YAxis allowDecimals={false} />
                          <Tooltip
                            formatter={(v: number) => [`${v}`, "عدد المرشحين"]}
                            labelFormatter={(l) => `المهارة: ${l}`}
                          />
                          <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Top Jobs */}
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
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

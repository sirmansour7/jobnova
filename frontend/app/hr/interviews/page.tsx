"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiJson } from "@/src/lib/api"
import { INTERVIEW_STATUS_LABEL } from "@/src/constants/interview-labels"

interface InterviewSummary {
  recommendation?: string | null
  summaryTextArabic?: string | null
}

interface HrInterviewItem {
  id: string
  status: string
  startedAt: string
  completedAt?: string | null
  hrDecision?: string | null
  job: { id: string; title: string; organization?: { name?: string } }
  candidate: { id: string; fullName: string; email: string }
  summary?: InterviewSummary | null
}

interface HrInterviewsResponse {
  items: HrInterviewItem[]
}

function formatDate(date: string | undefined): string {
  if (!date) return "—"
  try {
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("ar-EG")
  } catch {
    return "—"
  }
}

export default function HrInterviewsPage() {
  const [items, setItems] = useState<HrInterviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const allowedRoles = useMemo(() => ["hr", "admin"] as const, [])

  useEffect(() => {
    let cancelled = false
    setError(null)
    apiJson<HrInterviewsResponse>("/v1/hr/interviews")
      .then((data) => {
        if (!cancelled) setItems(data.items ?? [])
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "حدث خطأ")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={allowedRoles}>
        <DashboardLayout>
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-6" dir="rtl">
          <div>
            <h1 className="text-2xl font-bold text-foreground">مقابلات التوظيف</h1>
            <p className="text-muted-foreground">عرض ومراجعة مقابلات المرشحين</p>
          </div>

          {error && (
            <Card className="border-destructive/30">
              <CardContent className="pt-6">
                <p className="text-destructive text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-start">المرشح</TableHead>
                    <TableHead className="text-start">الوظيفة</TableHead>
                    <TableHead className="text-start">الحالة</TableHead>
                    <TableHead className="text-start">التوصية</TableHead>
                    <TableHead className="text-start">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 && !error && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        لا توجد مقابلات حتى الآن
                      </TableCell>
                    </TableRow>
                  )}
                  {items.map((session) => (
                    <TableRow key={session.id} className="border-border">
                      <TableCell className="font-medium text-foreground">
                        {session.candidate?.fullName ?? "—"}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {session.job?.title ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {INTERVIEW_STATUS_LABEL[session.status] ?? session.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {session.summary?.recommendation ?? session.summary?.summaryTextArabic ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/hr/interviews/${session.id}`}>فتح</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

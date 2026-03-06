"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { apiJson } from "@/src/lib/api"
import { INTERVIEW_STATUS_LABEL, HR_DECISION_LABEL } from "@/src/constants/interview-labels"

interface InterviewMessage {
  id: string
  role: string
  content: string
  createdAt: string
}

interface InterviewSummary {
  yearsExperience?: string | null
  availability?: string | null
  salaryExpectation?: string | null
  recommendation?: string | null
  summaryTextArabic?: string | null
}

interface HrInterviewDetail {
  id: string
  status: string
  startedAt: string
  completedAt?: string | null
  hrDecision?: string | null
  job: { id: string; title: string; organization?: { name?: string } }
  candidate: { id: string; fullName: string; email: string }
  messages: InterviewMessage[]
  summary?: InterviewSummary | null
}

export default function HrInterviewDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id
  const [session, setSession] = useState<HrInterviewDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [decisionLoading, setDecisionLoading] = useState(false)
  const [decisionError, setDecisionError] = useState<string | null>(null)
  const allowedRoles = useMemo(() => ["hr", "admin"] as const, [])

  const fetchSession = useMemo(() => {
    if (!id) return () => Promise.resolve(null)
    return () => {
      setError(null)
      return apiJson<HrInterviewDetail>(`/v1/hr/interviews/${id}`)
        .then(setSession)
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "حدث خطأ")
        })
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchSession().finally(() => setLoading(false))
  }, [id, fetchSession])

  const handleDecision = async (decision: string) => {
    if (!id) return
    setDecisionError(null)
    setDecisionLoading(true)
    try {
      await apiJson(`/v1/hr/interviews/${id}/decision`, {
        method: "PATCH",
        body: JSON.stringify({ decision }),
      })
      const updated = await apiJson<HrInterviewDetail>(`/v1/hr/interviews/${id}`)
      setSession(updated)
    } catch (err: unknown) {
      setDecisionError(err instanceof Error ? err.message : "حدث خطأ")
    } finally {
      setDecisionLoading(false)
    }
  }

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

  if (error || !session) {
    return (
      <ProtectedRoute allowedRoles={allowedRoles}>
        <DashboardLayout>
          <div className="space-y-4" dir="rtl">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/hr/interviews">← رجوع للمقابلات</Link>
            </Button>
            <Card className="border-destructive/30">
              <CardContent className="pt-6">
                <p className="text-destructive text-sm">{error ?? "الجلسة غير موجودة"}</p>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  const summary = session.summary
  const messages = session.messages ?? []

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-6" dir="rtl">
          <div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/hr/interviews">← رجوع للمقابلات</Link>
            </Button>
            <h1 className="text-2xl font-bold text-foreground mt-2">تفاصيل المقابلة</h1>
            <Badge variant="outline" className="mt-2">
              {INTERVIEW_STATUS_LABEL[session.status] ?? session.status}
            </Badge>
          </div>

          {/* Candidate & Job */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base">المرشح والوظيفة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">المرشح:</span> {session.candidate?.fullName ?? "—"}</p>
              <p><span className="text-muted-foreground">البريد:</span> <span dir="ltr">{session.candidate?.email ?? "—"}</span></p>
              <p><span className="text-muted-foreground">الوظيفة:</span> {session.job?.title ?? "—"}</p>
              {session.job?.organization?.name && (
                <p><span className="text-muted-foreground">الشركة:</span> {session.job.organization.name}</p>
              )}
            </CardContent>
          </Card>

          {/* Transcript */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base">نص المحادثة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {messages.length === 0 && (
                  <p className="text-muted-foreground text-sm">لا توجد رسائل</p>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-lg px-4 py-2.5 text-sm ${
                      msg.role === "bot"
                        ? "bg-muted text-foreground mr-0 ml-8"
                        : "bg-primary/10 text-foreground ml-0 mr-8"
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          {(summary?.summaryTextArabic ?? summary?.recommendation ?? summary?.yearsExperience ?? summary?.availability ?? summary?.salaryExpectation) && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">الملخص</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {summary.summaryTextArabic && <p className="text-foreground">{summary.summaryTextArabic}</p>}
                {summary.recommendation && <p><span className="text-muted-foreground">التوصية:</span> {summary.recommendation}</p>}
                {summary.yearsExperience != null && <p><span className="text-muted-foreground">سنوات الخبرة:</span> {summary.yearsExperience}</p>}
                {summary.availability != null && <p><span className="text-muted-foreground">الإتاحة:</span> {summary.availability}</p>}
                {summary.salaryExpectation != null && <p><span className="text-muted-foreground">الراتب المتوقع:</span> {summary.salaryExpectation}</p>}
              </CardContent>
            </Card>
          )}

          {/* Decision */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base">القرار</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {session.hrDecision && (
                <p className="text-sm text-muted-foreground">
                  القرار الحالي: {HR_DECISION_LABEL[session.hrDecision] ?? session.hrDecision}
                </p>
              )}
              {decisionError && <p className="text-destructive text-sm">{decisionError}</p>}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleDecision("shortlist")}
                  disabled={decisionLoading}
                >
                  مقبول مبدئياً
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDecision("reject")}
                  disabled={decisionLoading}
                >
                  رفض
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDecision("needs review")}
                  disabled={decisionLoading}
                >
                  يحتاج مراجعة
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

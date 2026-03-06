"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { apiJson } from "@/src/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ProtectedRoute } from "@/components/shared/protected-route"

interface ApplicationDetail {
  id: string
  status: string
  job: { title: string; partnerName?: string; organization?: { name: string } }
}

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

interface InterviewSessionResponse {
  id: string
  applicationId: string
  jobId: string
  status: string
  currentStep: number
  startedAt: string
  completedAt?: string | null
  messages: InterviewMessage[]
  summary?: InterviewSummary | null
}

export default function InterviewPage() {
  const { applicationId } = useParams<{ applicationId: string }>()
  const router = useRouter()
  const allowedRoles = useMemo(() => ["candidate"] as const, [])

  const [application, setApplication] = useState<ApplicationDetail | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>("active")
  const [messages, setMessages] = useState<InterviewMessage[]>([])
  const [summary, setSummary] = useState<InterviewSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answerInput, setAnswerInput] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const isCompleted = status === "completed"

  const loadApplication = useCallback(() => {
    if (!applicationId) return Promise.resolve(null)
    return apiJson<ApplicationDetail>(`/v1/applications/${applicationId}`)
      .then((app) => {
        setApplication(app)
        return app
      })
      .catch(() => {
        router.push("/candidate/applications")
        return null
      })
  }, [applicationId, router])

  const startInterview = useCallback(() => {
    if (!applicationId) return Promise.resolve(null)
    return apiJson<InterviewSessionResponse>("/v1/interviews/start", {
      method: "POST",
      body: JSON.stringify({ applicationId }),
    }).then((data) => {
      setSessionId(data.id)
      setStatus(data.status)
      setMessages(data.messages ?? [])
      setSummary(data.summary ?? null)
      return data
    })
  }, [applicationId])

  useEffect(() => {
    if (!applicationId) return
    setLoading(true)
    setError(null)
    loadApplication()
      .then(() => startInterview())
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "حدث خطأ"
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [applicationId, loadApplication, startInterview])

  const handleSendAnswer = async () => {
    const content = answerInput.trim()
    if (!content || !sessionId || submitting || isCompleted) return
    setSubmitting(true)
    setError(null)
    try {
      const data = await apiJson<InterviewSessionResponse>(
        `/v1/interviews/${sessionId}/answer`,
        {
          method: "POST",
          body: JSON.stringify({ content }),
        }
      )
      setMessages(data.messages ?? [])
      setStatus(data.status)
      if (data.summary) setSummary(data.summary)
      setAnswerInput("")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ، حاول مرة أخرى"
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error && !sessionId) {
    return (
      <ProtectedRoute allowedRoles={allowedRoles}>
        <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={() => router.push("/candidate/applications")}
              className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
            >
              ← رجوع
            </button>
            <Card className="border-destructive/30">
              <CardContent className="pt-6">
                <p className="text-destructive text-sm">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push("/candidate/applications")}
                >
                  عرض طلباتي
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (isCompleted) {
    return (
      <ProtectedRoute allowedRoles={allowedRoles}>
        <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={() => router.push("/candidate/applications")}
              className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
            >
              ← رجوع
            </button>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-foreground">تم إرسال إجاباتك بنجاح</h2>
            {summary && (
              <p className="text-muted-foreground text-sm mt-2">
                تم تجهيز ملخص مبدئي ليطلع عليه فريق التوظيف
              </p>
            )}
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => router.push("/candidate/applications")}>
                عرض طلباتي
              </Button>
              <Button onClick={() => router.push("/jobs")}>تصفح وظائف أخرى</Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6">
            <button
              onClick={() => router.push("/candidate/applications")}
              className="text-sm text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1"
            >
              ← رجوع
            </button>
            <h1 className="text-xl font-bold text-foreground">المقابلة السريعة</h1>
            {application && (
              <p className="text-sm text-muted-foreground mt-1">
                {application.job.title} — {application.job.organization?.name ?? application.job.partnerName}
              </p>
            )}
          </div>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base text-foreground">المحادثة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">جاري تحميل الأسئلة...</p>
              )}
              <div className="space-y-3">
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

              {error && (
                <p className="text-destructive text-sm">{error}</p>
              )}

              {!isCompleted && (
                <div className="flex gap-2 pt-2">
                  <Input
                    type="text"
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendAnswer()
                      }
                    }}
                    placeholder="اكتب إجابتك..."
                    disabled={submitting}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendAnswer}
                    disabled={!answerInput.trim() || submitting}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        جاري الإرسال...
                      </span>
                    ) : (
                      "إرسال"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}

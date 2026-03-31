"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { apiJson, API_URL } from "@/src/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { Paperclip, Loader2, CheckCircle2, XCircle } from "lucide-react"

const MAX_PDF_MB = 5
const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024

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

  // ── CV Upload state ─────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle")
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)

  const isCompleted = status === "completed"

  // ── Streaming answer handler ─────────────────────────────────────────────
  const handleSendAnswer = useCallback(async () => {
    const content = answerInput.trim()
    if (!content || !sessionId || submitting || isCompleted) return

    setSubmitting(true)
    setError(null)
    setAnswerInput("")

    // Optimistically add user message to chat immediately
    const tempUserId = `tmp-user-${Date.now()}`
    const tempBotId  = `tmp-bot-${Date.now()}`

    setMessages((prev) => [
      ...prev,
      { id: tempUserId, role: "candidate", content, createdAt: new Date().toISOString() },
      { id: tempBotId,  role: "assistant",  content: "",    createdAt: new Date().toISOString() },
    ])

    try {
      const token =
        typeof document !== "undefined"
          ? document.cookie
              .split("; ")
              .find((r) => r.startsWith("jobnova_token="))
              ?.split("=")[1] ?? null
          : null

      const res = await fetch(`${API_URL}/v1/interviews/${sessionId}/answer/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content }),
      })

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(body.message ?? `HTTP ${res.status}`)
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buf     = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += decoder.decode(value, { stream: true })
        const lines = buf.split("\n")
        buf = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          let evt: { type: string; content?: string; status?: string; step?: number; messageId?: string; message?: string }
          try { evt = JSON.parse(raw) as typeof evt } catch { continue }

          if (evt.type === "token" && evt.content) {
            // Append streamed token to the placeholder bot message
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempBotId ? { ...m, content: m.content + evt.content! } : m
              )
            )
          } else if (evt.type === "done") {
            // Replace temp IDs with real IDs from DB
            if (evt.messageId) {
              setMessages((prev) =>
                prev.map((m) => (m.id === tempBotId ? { ...m, id: evt.messageId! } : m))
              )
            }
            if (evt.status === "completed") setStatus("completed")
          } else if (evt.type === "error") {
            throw new Error(evt.message ?? "Stream error")
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ، حاول مرة أخرى"
      setError(msg)
      // Remove optimistic messages on failure so user can retry
      setMessages((prev) => prev.filter((m) => m.id !== tempUserId && m.id !== tempBotId))
      setAnswerInput(content) // Restore answer so user doesn't lose it
    } finally {
      setSubmitting(false)
    }
  }, [answerInput, sessionId, submitting, isCompleted])

  const handleCvUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !applicationId) return

      // Reset input so the same file can be re-selected after an error
      e.target.value = ""

      // Client-side validation
      if (file.type !== "application/pdf") {
        setUploadError("يُسمح بملفات PDF فقط")
        setUploadState("error")
        return
      }
      if (file.size > MAX_PDF_BYTES) {
        setUploadError(`الحد الأقصى لحجم الملف هو ${MAX_PDF_MB} ميجابايت`)
        setUploadState("error")
        return
      }

      setUploadState("uploading")
      setUploadError(null)

      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("applicationId", applicationId)

        // Use fetch directly — apiJson sets Content-Type: application/json
        // which conflicts with multipart/form-data
        const token =
          typeof document !== "undefined"
            ? document.cookie
                .split("; ")
                .find((r) => r.startsWith("jobnova_token="))
                ?.split("=")[1]
            : null

        const res = await fetch(`${API_URL}/v1/cv/upload-pdf`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        })

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { message?: string }
          throw new Error(body.message ?? `HTTP ${res.status}`)
        }

        const data = (await res.json()) as { cvUrl: string }
        setUploadedUrl(data.cvUrl)
        setUploadState("success")

        // Notify interviewer via chat message
        if (sessionId) {
          await apiJson<InterviewSessionResponse>(`/v1/interviews/${sessionId}/answer`, {
            method: "POST",
            body: JSON.stringify({ content: "📎 تم رفع السيرة الذاتية (PDF)" }),
          }).then((d) => {
            setMessages(d.messages ?? [])
            setStatus(d.status)
          }).catch(() => {
            // Non-fatal — upload already succeeded
          })
        }
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : "فشل رفع الملف")
        setUploadState("error")
      }
    },
    [applicationId, sessionId]
  )

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

  // handleSendAnswer is defined above (streaming version)

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
                      msg.role === "assistant"
                        ? "bg-muted text-foreground mr-0 ml-8"
                        : "bg-primary/10 text-foreground ml-0 mr-8"
                    }`}
                  >
                    {/* Typing indicator for empty streaming bot message */}
                    {msg.role === "assistant" && msg.content === "" ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                      </span>
                    ) : (
                      msg.content
                    )}
                  </div>
                ))}
              </div>

              {error && (
                <p className="text-destructive text-sm">{error}</p>
              )}

              {/* CV Upload feedback */}
              {uploadState === "success" && uploadedUrl && (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>تم رفع السيرة الذاتية بنجاح —&nbsp;</span>
                  <a
                    href={uploadedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    تحميل
                  </a>
                </div>
              )}
              {uploadState === "error" && uploadError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4 shrink-0" />
                  {uploadError}
                </div>
              )}

              {!isCompleted && (
                <div className="flex gap-2 pt-2">
                  {/* Hidden PDF file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleCvUpload}
                  />

                  {/* Attach CV button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    disabled={uploadState === "uploading" || isCompleted}
                    onClick={() => {
                      setUploadState("idle")
                      setUploadError(null)
                      fileInputRef.current?.click()
                    }}
                    title="رفع سيرة ذاتية (PDF)"
                    aria-label="رفع سيرة ذاتية"
                  >
                    {uploadState === "uploading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </Button>

                  <Input
                    type="text"
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        void handleSendAnswer()
                      }
                    }}
                    placeholder="اكتب إجابتك..."
                    disabled={submitting}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => void handleSendAnswer()}
                    disabled={!answerInput.trim() || submitting}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        يكتب...
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

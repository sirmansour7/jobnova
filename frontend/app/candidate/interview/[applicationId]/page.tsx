"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { apiJson } from "@/src/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ProtectedRoute } from "@/components/shared/protected-route"

interface ApplicationDetail {
  id: string
  status: string
  job: { title: string; partnerName?: string; organization?: { name: string } }
}

interface ScreeningAnswers {
  roleTitle: string
  yearsExperience: string
  topSkills: string
  linkedin: string
  portfolio: string
  expectedSalaryMin: string
  expectedSalaryMax: string
  availabilityDate: string
  workPreference: "remote" | "onsite" | "hybrid" | ""
  notes: string
}

const INITIAL_ANSWERS: ScreeningAnswers = {
  roleTitle: "",
  yearsExperience: "",
  topSkills: "",
  linkedin: "",
  portfolio: "",
  expectedSalaryMin: "",
  expectedSalaryMax: "",
  availabilityDate: "",
  workPreference: "",
  notes: "",
}

const STEPS = [
  { id: 1, title: "المعلومات الأساسية", fields: ["roleTitle", "yearsExperience", "topSkills"] },
  { id: 2, title: "الروابط المهنية", fields: ["linkedin", "portfolio"] },
  { id: 3, title: "التوقعات", fields: ["expectedSalaryMin", "expectedSalaryMax", "availabilityDate", "workPreference"] },
  { id: 4, title: "ملاحظات إضافية", fields: ["notes"] },
  { id: 5, title: "ملخص المقابلة", fields: [] },
]

const FIELD_LABELS: Record<string, string> = {
  roleTitle: "المسمى الوظيفي المطلوب",
  yearsExperience: "سنوات الخبرة",
  topSkills: "أهم 3 مهارات (مفصولة بفاصلة)",
  linkedin: "رابط LinkedIn",
  portfolio: "رابط Portfolio أو GitHub",
  expectedSalaryMin: "الراتب المتوقع (الحد الأدنى بالجنيه)",
  expectedSalaryMax: "الراتب المتوقع (الحد الأقصى بالجنيه)",
  availabilityDate: "تاريخ الإتاحة للعمل",
  workPreference: "تفضيل بيئة العمل",
  notes: "ملاحظات إضافية أو رسالة للمسؤول",
}

export default function InterviewPage() {
  const { applicationId } = useParams<{ applicationId: string }>()
  const router = useRouter()
  const allowedRoles = useMemo(() => ["candidate"] as const, [])

  const [application, setApplication] = useState<ApplicationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<ScreeningAnswers>(INITIAL_ANSWERS)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!applicationId) return
    apiJson<ApplicationDetail>(`/v1/applications/${applicationId}`)
      .then(setApplication)
      .catch(() => router.push("/candidate/applications"))
      .finally(() => setLoading(false))
  }, [applicationId, router])


  const handleSubmit = async () => {
    if (!applicationId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await apiJson(`/v1/applications/${applicationId}/screening`, {
        method: "PATCH",
        body: JSON.stringify({ screeningAnswers: answers }),
      })
      setSubmitted(true)
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
        ? (err as { message: string }).message
        : "حدث خطأ، حاول مرة أخرى"
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const update = (field: keyof ScreeningAnswers, value: string) =>
    setAnswers(prev => ({ ...prev, [field]: value }))

  const currentStep = STEPS[step]
  const isLastStep = step === STEPS.length - 1
  const progress = Math.round(((step) / (STEPS.length - 1)) * 100)

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )

  if (submitted) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4" dir="rtl">
      <div className="text-5xl">🎉</div>
      <h2 className="text-xl font-bold text-foreground">تم إرسال بيانات المقابلة!</h2>
      <p className="text-muted-foreground text-sm text-center max-w-sm">
        تم إرسال إجاباتك بنجاح لمسؤول التوظيف. سيتم التواصل معك قريباً.
      </p>
      <div className="flex gap-3 mt-2">
        <Button
          variant="outline"
          onClick={() => router.push("/candidate/applications")}
        >
          عرض طلباتي
        </Button>
        <Button onClick={() => router.push("/jobs")}>
          تصفح وظائف أخرى
        </Button>
      </div>
    </div>
  )

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
        <div className="mx-auto max-w-2xl">

          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => step > 0 ? setStep(s => s - 1) : router.push("/candidate/applications")}
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


          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>{currentStep.title}</span>
              <span>{step + 1} / {STEPS.length}</span>
            </div>
            <div className="h-2 rounded-full bg-secondary">
              <div
                className="h-2 rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Step content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{currentStep.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Summary step */}
              {isLastStep ? (
                <div className="space-y-3">
                  {Object.entries(answers).map(([key, value]) => value ? (
                    <div key={key} className="flex flex-col gap-0.5 border-b border-border pb-2">
                      <span className="text-xs text-muted-foreground">{FIELD_LABELS[key]}</span>
                      <span className="text-sm font-medium text-foreground">{value}</span>
                    </div>
                  ) : null)}
                  <Button
                    className="w-full mt-4"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        جاري الإرسال...
                      </span>
                    ) : "✓ إرسال المقابلة"}
                  </Button>
                  {submitError && (
                    <p className="text-destructive text-sm text-center mt-2">{submitError}</p>
                  )}
                </div>
              ) : (
                <>
                  {currentStep.fields.map(field => (
                    <div key={field} className="space-y-1.5">
                      <Label htmlFor={field}>{FIELD_LABELS[field]}</Label>
                      {field === "workPreference" ? (
                        <div className="flex gap-2 flex-wrap">
                          {[
                            { value: "remote", label: "عن بُعد" },
                            { value: "onsite", label: "حضوري" },
                            { value: "hybrid", label: "هجين" },
                          ].map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => update("workPreference", opt.value as ScreeningAnswers["workPreference"])}
                              className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                                answers.workPreference === opt.value
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-muted-foreground hover:border-primary/50"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      ) : field === "notes" ? (
                        <textarea
                          id={field}
                          value={answers[field as keyof ScreeningAnswers]}
                          onChange={e => update(field as keyof ScreeningAnswers, e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                          placeholder="اكتب ملاحظاتك هنا..."
                        />
                      ) : (
                        <Input
                          id={field}
                          type={field.includes("Salary") ? "number" : field === "availabilityDate" ? "date" : "text"}
                          value={answers[field as keyof ScreeningAnswers]}
                          onChange={e => update(field as keyof ScreeningAnswers, e.target.value)}
                          placeholder={FIELD_LABELS[field]}
                        />
                      )}
                    </div>
                  ))}
                  <Button
                    className="w-full mt-2"
                    onClick={() => setStep(s => s + 1)}
                  >
                    التالي ←
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </ProtectedRoute>
  )
}

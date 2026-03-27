"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, ChevronRight, ChevronLeft, Check, Download, Printer } from "lucide-react"
import { ModernTechTemplate } from "@/components/cv/templates/ModernTechTemplate"
import { MinimalATSTemplate } from "@/components/cv/templates/MinimalATSTemplate"
import { CreativeTemplate } from "@/components/cv/templates/CreativeTemplate"
import { getMyCv, saveMyCv, EMPTY_CV } from "@/src/services/cv.service"
import type { CvData, CvExperience, CvEducation } from "@/src/services/cv.service"
import { apiJson, API_URL } from "@/src/lib/api"
import { getCookie } from "@/src/lib/cookies"

interface CvAnalysisResult {
  language: 'ar' | 'en' | 'mixed'
  overallScore: number
  roleFitScore: number
  summary: string
  strengths: string[]
  improvements: string[]
  ats: {
    missingKeywords: string[]
    formatIssues: string[]
    lengthAssessment: 'short' | 'ok' | 'long'
  }
  roleMatch: {
    targetRoleTitle: string
    matchedKeywords: string[]
    missingKeywords: string[]
    suggestions: string[]
  }
}

const STEPS = [
  { id: 0, label: "المعلومات الأساسية" },
  { id: 1, label: "الملخص والمهارات" },
  { id: 2, label: "الخبرة العملية" },
  { id: 3, label: "التعليم" },
  { id: 4, label: "معاينة وحفظ" },
]

const EMPTY_EXP: CvExperience = { title: "", company: "", from: "", to: "", description: "" }
const EMPTY_EDU: CvEducation = { degree: "", institution: "", year: "" }

function ScoreCircle({ score, label, color = "text-primary" }: { score: number; label: string; color?: string }) {
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-20 w-20">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-secondary" />
          <circle
            cx="36" cy="36" r={radius} fill="none" stroke="currentColor" strokeWidth="6"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" className={color}
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground">
          {score}
        </span>
      </div>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  )
}

export default function CVBuilderPage() {
  const allowedRoles = useMemo(() => ["candidate"] as const, [])
  const [step, setStep] = useState(0)
  const [cv, setCv] = useState<CvData>(EMPTY_CV)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [newSkill, setNewSkill] = useState("")
  const [targetRoleTitle, setTargetRoleTitle] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<CvAnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [template, setTemplate] = useState<"modern" | "ats" | "creative">("modern")
  const [pdfTemplate, setPdfTemplate] = useState<"modern" | "classic" | "ats">("modern")
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  // Load existing CV
  useEffect(() => {
    getMyCv().then(data => {
      if (data) setCv(data)
      setLoading(false)
    })
  }, [])

  const update = useCallback(<K extends keyof CvData>(field: K, value: CvData[K]) => {
    setCv(prev => ({ ...prev, [field]: value }))
  }, [])

  // Skills
  const addSkill = () => {
    const s = newSkill.trim()
    if (s && !cv.skills.includes(s) && cv.skills.length < 15) {
      update("skills", [...cv.skills, s])
      setNewSkill("")
    }
  }
  const removeSkill = (s: string) => update("skills", cv.skills.filter(x => x !== s))

  // Experience
  const addExp = () => update("experience", [...cv.experience, { ...EMPTY_EXP }])
  const updateExp = (i: number, field: keyof CvExperience, val: string) => {
    const next = cv.experience.map((e, idx) => idx === i ? { ...e, [field]: val } : e)
    update("experience", next)
  }
  const removeExp = (i: number) => update("experience", cv.experience.filter((_, idx) => idx !== i))

  // Education
  const addEdu = () => update("education", [...cv.education, { ...EMPTY_EDU }])
  const updateEdu = (i: number, field: keyof CvEducation, val: string) => {
    const next = cv.education.map((e, idx) => idx === i ? { ...e, [field]: val } : e)
    update("education", next)
  }
  const removeEdu = (i: number) => update("education", cv.education.filter((_, idx) => idx !== i))

  // Save
  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await saveMyCv(cv)
      setSavedAt(new Date())
    } catch {
      setSaveError("فشل الحفظ، حاول مرة أخرى")
    } finally {
      setSaving(false)
    }
  }

  // PDF export — open new window with CV HTML (inline styles) and trigger print
  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1200')
    if (!printWindow) return
    const cvContent = document.getElementById('cv-preview-content')?.innerHTML ?? ''
    printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>السيرة الذاتية - ${cv.fullName || 'CV'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: white; }
    @page { size: A4 portrait; margin: 0; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  ${cvContent}
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 500); }
  <\/script>
</body>
</html>`)
    printWindow.document.close()
  }

  const handleDownloadPdf = async () => {
    setExportingPdf(true)
    setExportError(null)
    try {
      const token = getCookie("jobnova_token")
      const res = await fetch(`${API_URL}/v1/cv/export/pdf?template=${pdfTemplate}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg = (body as { message?: string }).message ?? `HTTP ${res.status}`
        throw new Error(msg)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `cv-${pdfTemplate}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : "فشل تصدير PDF، حاول مرة أخرى"
      setExportError(message)
    } finally {
      setExportingPdf(false)
    }
  }

  const handleAnalyze = async () => {
    if (!targetRoleTitle.trim()) {
      setAnalysisError("الرجاء إدخال المسمى الوظيفي المستهدف")
      return
    }
    setAnalyzing(true)
    setAnalysisError(null)
    setAnalysisResult(null)
    try {
      const result = await apiJson<CvAnalysisResult>("/v1/cv/me/analyze", {
        method: "POST",
        body: JSON.stringify({ targetRoleTitle }),
      })
      setAnalysisResult(result)
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
        ? (err as { message: string }).message
        : "فشل التحليل، تأكد من حفظ السيرة الذاتية أولاً"
      setAnalysisError(message)
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="mx-auto max-w-5xl" dir="rtl">

          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">بناء السيرة الذاتية</h1>
              <p className="text-sm text-muted-foreground">أنشئ سيرتك الذاتية واستخدمها في التقديم</p>
            </div>
            {savedAt && (
              <span className="text-xs text-muted-foreground">
                آخر حفظ: {savedAt.toLocaleTimeString("ar-EG")}
              </span>
            )}
          </div>

          {/* Stepper */}
          <div className="mb-6 flex items-center gap-1 overflow-x-auto pb-2">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setStep(i)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                    ? "bg-primary/20 text-primary"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {i < step && <Check className="h-3 w-3" />}
                {s.label}
              </button>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Form */}
            <div className="space-y-4">

              {/* Step 0 — Basic Info */}
              {step === 0 && (
                <Card>
                  <CardHeader><CardTitle>المعلومات الأساسية</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>الاسم الكامل *</Label>
                        <Input value={cv.fullName} onChange={e => update("fullName", e.target.value)} placeholder="أحمد محمد" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>المسمى الوظيفي</Label>
                        <Input value={cv.title} onChange={e => update("title", e.target.value)} placeholder="مطور واجهات أمامية" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>البريد الإلكتروني *</Label>
                        <Input value={cv.email} onChange={e => update("email", e.target.value)} dir="ltr" placeholder="email@example.com" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>رقم الهاتف</Label>
                        <Input value={cv.phone} onChange={e => update("phone", e.target.value)} dir="ltr" placeholder="01012345678" />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>الموقع</Label>
                        <Input value={cv.location} onChange={e => update("location", e.target.value)} placeholder="القاهرة، مصر" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 1 — Summary + Skills */}
              {step === 1 && (
                <Card>
                  <CardHeader><CardTitle>الملخص والمهارات</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <Label>الملخص المهني</Label>
                        <span className={`text-xs ${cv.summary.length < 50 ? "text-destructive" : "text-muted-foreground"}`}>
                          {cv.summary.length} / 50 حرف كحد أدنى
                        </span>
                      </div>
                      <Textarea
                        value={cv.summary}
                        onChange={e => update("summary", e.target.value)}
                        rows={4}
                        placeholder="اكتب نبذة مختصرة عن نفسك ومهاراتك وطموحاتك المهنية..."
                      />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label>المهارات ({cv.skills.length}/15)</Label>
                      <div className="flex flex-wrap gap-2 min-h-[40px]">
                        {cv.skills.map(s => (
                          <Badge key={s} variant="secondary" className="gap-1 py-1">
                            {s}
                            <button onClick={() => removeSkill(s)} className="mr-1 hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="أضف مهارة... (Enter للإضافة)"
                          value={newSkill}
                          onChange={e => setNewSkill(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())}
                          disabled={cv.skills.length >= 15}
                        />
                        <Button variant="outline" size="icon" onClick={addSkill} disabled={cv.skills.length >= 15}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2 — Experience */}
              {step === 2 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>الخبرة العملية</CardTitle>
                    <Button variant="outline" size="sm" onClick={addExp}>
                      <Plus className="ml-1 h-4 w-4" /> إضافة
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cv.experience.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-4">لا توجد خبرات بعد. اضغط إضافة.</p>
                    )}
                    {cv.experience.map((exp, i) => (
                      <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">{exp.title || `خبرة ${i + 1}`}</span>
                          <button onClick={() => removeExp(i)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1"><Label className="text-xs">المسمى الوظيفي</Label><Input value={exp.title} onChange={e => updateExp(i, "title", e.target.value)} placeholder="مطور واجهات أمامية" /></div>
                          <div className="space-y-1"><Label className="text-xs">اسم الشركة</Label><Input value={exp.company} onChange={e => updateExp(i, "company", e.target.value)} placeholder="شركة تقنية" /></div>
                          <div className="space-y-1"><Label className="text-xs">من (سنة)</Label><Input value={exp.from} onChange={e => updateExp(i, "from", e.target.value)} placeholder="2022" /></div>
                          <div className="space-y-1"><Label className="text-xs">إلى (سنة أو حتى الآن)</Label><Input value={exp.to} onChange={e => updateExp(i, "to", e.target.value)} placeholder="2024 أو حتى الآن" /></div>
                        </div>
                        <div className="space-y-1"><Label className="text-xs">الوصف</Label><Textarea value={exp.description} onChange={e => updateExp(i, "description", e.target.value)} rows={2} placeholder="اكتب وصفاً مختصراً لمهامك..." /></div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Step 3 — Education */}
              {step === 3 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>التعليم</CardTitle>
                    <Button variant="outline" size="sm" onClick={addEdu}>
                      <Plus className="ml-1 h-4 w-4" /> إضافة
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cv.education.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-4">لا توجد مؤهلات بعد. اضغط إضافة.</p>
                    )}
                    {cv.education.map((edu, i) => (
                      <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">{edu.degree || `مؤهل ${i + 1}`}</span>
                          <button onClick={() => removeEdu(i)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1"><Label className="text-xs">الدرجة العلمية</Label><Input value={edu.degree} onChange={e => updateEdu(i, "degree", e.target.value)} placeholder="بكالوريوس هندسة" /></div>
                          <div className="space-y-1"><Label className="text-xs">المؤسسة التعليمية</Label><Input value={edu.institution} onChange={e => updateEdu(i, "institution", e.target.value)} placeholder="جامعة القاهرة" /></div>
                          <div className="space-y-1 sm:col-span-2"><Label className="text-xs">سنة التخرج</Label><Input value={edu.year} onChange={e => updateEdu(i, "year", e.target.value)} placeholder="2024" /></div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Step 4 — Review + Save */}
              {step === 4 && (
                <Card>
                  <CardHeader><CardTitle>حفظ السيرة الذاتية</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">راجع معاينة السيرة الذاتية على اليمين ثم احفظها.</p>
                    {saveError && <p className="text-sm text-destructive">{saveError}</p>}
                    <div className="flex gap-3">
                      <Button className="flex-1" onClick={handleSave} disabled={saving}>
                        {saving ? (
                          <span className="flex items-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            جاري الحفظ...
                          </span>
                        ) : savedAt ? "✓ تم الحفظ — حفظ مجدداً" : "حفظ السيرة الذاتية"}
                      </Button>
                      <Button variant="outline" onClick={handleExportPdf}>
                        <Download className="ml-2 h-4 w-4" />
                        تصدير PDF
                      </Button>
                    </div>

                    {/* PDF Export Section */}
                    <div className="mt-6 space-y-4">
                      <div className="border-t border-border pt-4">
                        <h3 className="font-semibold text-foreground mb-3">تصدير السيرة الذاتية</h3>
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            {([
                              { id: "modern" as const, label: "عصري", desc: "تصميم حديث بألوان زرقاء" },
                              { id: "classic" as const, label: "كلاسيكي", desc: "تصميم تقليدي احترافي" },
                              { id: "ats" as const, label: "متوافق مع ATS", desc: "تصميم نصي للقراءة الآلية" },
                            ]).map(t => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setPdfTemplate(t.id)}
                                className={`rounded-xl border p-3 text-right transition-colors ${
                                  pdfTemplate === t.id
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border bg-card text-muted-foreground hover:border-primary/50"
                                }`}
                              >
                                <div className="text-xs font-semibold">{t.label}</div>
                                <div className="text-[10px] mt-0.5 leading-tight">{t.desc}</div>
                              </button>
                            ))}
                          </div>
                          {exportError && <p className="text-sm text-destructive">{exportError}</p>}
                          <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={handleDownloadPdf}
                            disabled={exportingPdf}
                          >
                            {exportingPdf ? (
                              <span className="flex items-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                جاري التصدير...
                              </span>
                            ) : (
                              <>
                                <Download className="h-4 w-4" />
                                تحميل PDF
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Analysis Section */}
                    <div className="mt-6 space-y-4">
                      <div className="border-t border-border pt-4">
                        <h3 className="font-semibold text-foreground mb-3">تحليل السيرة الذاتية</h3>
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label>المسمى الوظيفي المستهدف</Label>
                            <div className="flex gap-2">
                              <Input
                                value={targetRoleTitle}
                                onChange={e => setTargetRoleTitle(e.target.value)}
                                placeholder="مثال: مطور واجهات أمامية، Data Analyst..."
                                onKeyDown={e => e.key === "Enter" && handleAnalyze()}
                              />
                              <Button
                                variant="outline"
                                onClick={handleAnalyze}
                                disabled={analyzing}
                                className="shrink-0"
                              >
                                {analyzing ? (
                                  <span className="flex items-center gap-1.5">
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                    جاري التحليل...
                                  </span>
                                ) : "🔍 حلّل"}
                              </Button>
                            </div>
                          </div>

                          {analysisError && (
                            <p className="text-sm text-destructive">{analysisError}</p>
                          )}

                          {analysisResult && (
                            <div className="space-y-4 rounded-xl border border-border bg-card/50 p-4">

                              {/* Scores */}
                              <div className="flex justify-around">
                                <ScoreCircle
                                  score={analysisResult.overallScore}
                                  label="النتيجة الإجمالية"
                                  color={analysisResult.overallScore >= 70 ? "text-green-500" : analysisResult.overallScore >= 50 ? "text-yellow-500" : "text-destructive"}
                                />
                                <ScoreCircle
                                  score={analysisResult.roleFitScore}
                                  label="تطابق الدور"
                                  color={analysisResult.roleFitScore >= 70 ? "text-green-500" : analysisResult.roleFitScore >= 40 ? "text-yellow-500" : "text-destructive"}
                                />
                              </div>

                              {/* Summary */}
                              <p className="text-sm text-muted-foreground text-center border-b border-border pb-3">
                                {analysisResult.summary}
                              </p>

                              {/* Strengths */}
                              {(analysisResult.strengths?.length ?? 0) > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-green-500 mb-2">✓ نقاط القوة</h4>
                                  <ul className="space-y-1">
                                    {analysisResult.strengths.map((s, i) => (
                                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500 mt-1.5" />
                                        {s}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Improvements */}
                              {(analysisResult.improvements?.length ?? 0) > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-yellow-500 mb-2">⚡ تحتاج تحسين</h4>
                                  <ul className="space-y-1">
                                    {analysisResult.improvements.map((s, i) => (
                                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-500 mt-1.5" />
                                        {s}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Missing keywords — clickable chips to add to skills */}
                              {(analysisResult.roleMatch?.missingKeywords?.length ?? 0) > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-primary mb-2">
                                    🎯 مهارات ناقصة للدور المستهدف
                                  </h4>
                                  <p className="text-xs text-muted-foreground mb-2">اضغط لإضافتها لمهاراتك:</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {analysisResult.roleMatch.missingKeywords.map((kw) => (
                                      <button
                                        key={kw}
                                        type="button"
                                        onClick={() => {
                                          if (!cv.skills.includes(kw) && cv.skills.length < 15) {
                                            update("skills", [...cv.skills, kw])
                                          }
                                        }}
                                        disabled={cv.skills.includes(kw) || cv.skills.length >= 15}
                                        className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                                          cv.skills.includes(kw)
                                            ? "border-green-500/30 bg-green-500/10 text-green-500 cursor-default"
                                            : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 cursor-pointer"
                                        }`}
                                      >
                                        {cv.skills.includes(kw) ? "✓ " : "+ "}{kw}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* ATS */}
                              {analysisResult.ats.formatIssues.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">📋 ملاحظات ATS</h4>
                                  <ul className="space-y-1">
                                    {analysisResult.ats.formatIssues.map((issue, i) => (
                                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                        <span className="shrink-0">•</span>{issue}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Language badge */}
                              <div className="flex justify-end">
                                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                                  لغة السيرة: {analysisResult.language === 'ar' ? 'عربي' : analysisResult.language === 'en' ? 'إنجليزي' : 'مختلطة'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
                  <ChevronRight className="ml-1 h-4 w-4" /> السابق
                </Button>
                <Button onClick={() => setStep(s => s + 1)} disabled={step === STEPS.length - 1}>
                  التالي <ChevronLeft className="mr-1 h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Live Preview */}
            <div className="hidden lg:block">
              <div className="sticky top-4 space-y-3">
                {/* Template switcher */}
                <div className="flex gap-2 justify-end">
                  {[
                    { id: "modern", label: "Modern Tech" },
                    { id: "ats", label: "Minimal ATS" },
                    { id: "creative", label: "Creative" },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTemplate(t.id as "modern" | "ats" | "creative")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        template === t.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Print button */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPdf}
                    className="gap-2 text-xs"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    تصدير PDF / طباعة
                  </Button>
                </div>

                {/* CV Preview — scaled for screen display; id used for PDF export HTML */}
                <div className="rounded-xl overflow-hidden shadow-lg border border-border"
                     style={{ transform: "scale(0.75)", transformOrigin: "top right", width: "133%", marginLeft: "-33%" }}>
                  <div id="cv-preview-content" className="print:hidden">
                    {template === "modern" && <ModernTechTemplate cv={cv} />}
                    {template === "ats" && <MinimalATSTemplate cv={cv} />}
                    {template === "creative" && <CreativeTemplate cv={cv} />}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { io, Socket } from "socket.io-client"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { apiJson, API_URL } from "@/src/lib/api"
import { getCookie } from "@/src/lib/cookies"
import {
  Brain,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Target,
  Copy,
  Check,
  RefreshCw,
  Briefcase,
  BookOpen,
  Star,
  ChevronRight,
  Loader2,
  BarChart3,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface CvIntelligenceResult {
  structuredData: {
    skills: string[]
    yearsOfExperience: number | null
    specialization: string | null
    seniority: "junior" | "mid" | "senior" | null
    location: string | null
  }
  gapAnalysis: {
    missingSkills: string[]
    missingExperience: string
    improvements: string[]
    marketDemandSkills: string[]
  }
  careerRecommendations: Array<{
    jobId: string
    jobTitle: string
    company: string
    matchScore: number
    recommendedSkills: string[]
    reason: string
  }>
  improvedCv: {
    professionalSummary: string
    optimizedSkills: string[]
    achievementTips: string[]
    fullText: string
  }
  marketSkillAnalytics?: {
    topSkills: Array<{ skill: string; alreadyHas: boolean }>
  }
  analyzedAt: string
}

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    : score >= 60 ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
    : score >= 40 ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
    : "bg-red-500/20 text-red-400 border-red-500/30"

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", color)}>
      <Star className="h-3 w-3" />
      {score}%
    </span>
  )
}

// ─── Match bar ────────────────────────────────────────────────────────────────

function MatchBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-emerald-500"
    : score >= 60 ? "bg-blue-500"
    : score >= 40 ? "bg-amber-500"
    : "bg-red-500"

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-white/10">
        <div className={cn("h-1.5 rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-muted-foreground">{score}%</span>
    </div>
  )
}

// ─── Seniority label ──────────────────────────────────────────────────────────

const SENIORITY_AR: Record<string, string> = {
  junior: "مبتدئ",
  mid: "متوسط",
  senior: "خبير",
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CvIntelligencePage() {
  const [data, setData] = useState<CvIntelligenceResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [liveStatus, setLiveStatus] = useState<"analyzing" | "updated" | "error" | null>(null)

  // ── Load stored result on mount ─────────────────────────────────────────────
  const loadStored = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiJson<CvIntelligenceResult | null>("/v1/cv/me/intelligence")
      setData(res ?? null)
    } catch {
      setError("تعذّر تحميل نتائج التحليل. يرجى المحاولة مجدداً.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStored()
  }, [loadStored])

  // ── WebSocket connection ────────────────────────────────────────────────────
  useEffect(() => {
    const token = getCookie("jobnova_token")
    if (!token) return

    const socketUrl = new URL(API_URL).origin
    const socket: Socket = io(socketUrl + "/cv", {
      transports: ["websocket"],
      auth: { token },
    })

    socket.on("cv:intelligence:ready", (result: CvIntelligenceResult) => {
      setData(result)
      setLiveStatus("updated")
      setRunning(false)
      setTimeout(() => setLiveStatus(null), 4000)
    })

    socket.on("cv:analysis:progress", ({ status }: { status: string }) => {
      if (status === "analyzing") setLiveStatus("analyzing")
      if (status === "done") setLiveStatus("updated")
      if (status === "error") setLiveStatus("error")
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  // ── Run full analysis ───────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    try {
      setRunning(true)
      setError(null)
      const result = await apiJson<CvIntelligenceResult>("/v1/cv/intelligence", { method: "POST" })
      setData(result)
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "حدث خطأ أثناء التحليل. يرجى المحاولة لاحقاً."
      setError(msg)
    } finally {
      setRunning(false)
    }
  }

  // ── Copy full CV text ───────────────────────────────────────────────────────
  const handleCopy = async () => {
    if (!data?.improvedCv.fullText) return
    await navigator.clipboard.writeText(data.improvedCv.fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6" dir="rtl">

        {/* Live status banner */}
        {liveStatus === "analyzing" && (
          <div className="flex animate-pulse items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-400">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            جاري تحليل سيرتك الذاتية بالذكاء الاصطناعي...
          </div>
        )}
        {liveStatus === "updated" && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            تم تحديث تحليلك للتو!
          </div>
        )}
        {liveStatus === "error" && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            حدث خطأ أثناء التحليل، يرجى المحاولة يدوياً
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Brain className="h-6 w-6 text-primary" />
              ذكاء السيرة الذاتية
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              تحليل شامل بالذكاء الاصطناعي: ملفك الوظيفي، الفجوات، توصيات الوظائف، وسيرة ذاتية محسّنة
            </p>
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={running}
            className="shrink-0 gap-2"
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري التحليل...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {data ? "إعادة التحليل" : "ابدأ التحليل"}
              </>
            )}
          </Button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        )}

        {/* Running indicator */}
        {running && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div>
                <p className="font-semibold text-foreground">جاري التحليل الذكي...</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  يتم الآن تحليل سيرتك الذاتية مقارنةً بالوظائف المتاحة. هذا قد يستغرق 10–20 ثانية.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!loading && !running && !data && !error && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <Brain className="h-16 w-16 text-muted-foreground/30" />
              <div>
                <p className="text-lg font-semibold text-foreground">لا يوجد تحليل حتى الآن</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  اضغط على "ابدأ التحليل" لتحصل على تقرير كامل عن سيرتك الذاتية وأفضل الوظائف المناسبة لك
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                ملاحظة: تأكد من رفع ملف PDF أو إنشاء سيرتك الذاتية أولاً من{" "}
                <Link href="/candidate/cv-builder" className="text-primary hover:underline">
                  منشئ السيرة الذاتية
                </Link>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {!loading && !running && data && (
          <div className="space-y-6">

            {/* Last analyzed */}
            <p className="text-xs text-muted-foreground">
              آخر تحليل: {new Date(data.analyzedAt).toLocaleString("ar-EG")}
            </p>

            {/* ── Row 1: Structured Profile + Gap Analysis ── */}
            <div className="grid gap-4 lg:grid-cols-2">

              {/* Structured Profile */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4 text-primary" />
                    ملفك الوظيفي
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.structuredData.specialization && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">التخصص</span>
                      <span className="font-medium text-foreground">{data.structuredData.specialization}</span>
                    </div>
                  )}
                  {data.structuredData.seniority && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">المستوى</span>
                      <Badge variant="outline" className="font-medium">
                        {SENIORITY_AR[data.structuredData.seniority] ?? data.structuredData.seniority}
                      </Badge>
                    </div>
                  )}
                  {data.structuredData.yearsOfExperience !== null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">سنوات الخبرة</span>
                      <span className="font-medium text-foreground">
                        {data.structuredData.yearsOfExperience} سنة
                      </span>
                    </div>
                  )}
                  {data.structuredData.location && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">الموقع</span>
                      <span className="font-medium text-foreground">{data.structuredData.location}</span>
                    </div>
                  )}
                  {data.structuredData.skills.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">المهارات المستخرجة</p>
                      <div className="flex flex-wrap gap-1.5">
                        {data.structuredData.skills.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gap Analysis */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    تحليل الفجوات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.gapAnalysis.missingSkills.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-red-400">مهارات مطلوبة في الوظائف غير موجودة لديك</p>
                      <div className="flex flex-wrap gap-1.5">
                        {data.gapAnalysis.missingSkills.map((s) => (
                          <Badge
                            key={s}
                            variant="outline"
                            className="border-red-500/30 bg-red-500/10 text-red-400 text-xs"
                          >
                            <XCircle className="ml-1 h-3 w-3" />
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.gapAnalysis.missingExperience && (
                    <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3">
                      <p className="text-xs text-amber-400">{data.gapAnalysis.missingExperience}</p>
                    </div>
                  )}
                  {data.gapAnalysis.improvements.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-blue-400">تحسينات مقترحة</p>
                      <ul className="space-y-1">
                        {data.gapAnalysis.improvements.map((imp, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-blue-500" />
                            {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Market Demand Skills ── */}
            {data.gapAnalysis.marketDemandSkills.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    أكثر المهارات طلباً في السوق
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {data.gapAnalysis.marketDemandSkills.map((s, i) => {
                      const isOwned = data.structuredData.skills.includes(s.toLowerCase())
                      return (
                        <span
                          key={s}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium",
                            i < 3 ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400" : "border-white/10 bg-white/5 text-muted-foreground",
                            isOwned && "opacity-50"
                          )}
                        >
                          {isOwned && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                          {s}
                        </span>
                      )
                    })}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    المهارات الشفافة موجودة لديك بالفعل ✓
                  </p>
                </CardContent>
              </Card>
            )}

            {/* ── Market Skill Analytics Card ── */}
            {data.marketSkillAnalytics && data.marketSkillAnalytics.topSkills.length > 0 && (() => {
              const topSkills = data.marketSkillAnalytics!.topSkills
              const ownedSkills = topSkills.filter((s) => s.alreadyHas)
              const missingSkills = topSkills.filter((s) => !s.alreadyHas)
              return (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      تحليل سوق المهارات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Two sections side by side */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {/* Owned skills */}
                      <div>
                        <p className="text-xs font-medium text-emerald-400 mb-2">مهارات لديك مطلوبة في السوق ✓</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ownedSkills.length === 0 ? (
                            <span className="text-xs text-muted-foreground">لا توجد مهارات مطابقة</span>
                          ) : (
                            ownedSkills.map((s) => (
                              <Badge
                                key={s.skill}
                                variant="outline"
                                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs"
                              >
                                <CheckCircle2 className="ml-1 h-3 w-3" />
                                {s.skill}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                      {/* Missing skills */}
                      <div>
                        <p className="text-xs font-medium text-red-400 mb-2">مهارات ناقصة عالية الطلب ✗</p>
                        <div className="flex flex-wrap gap-1.5">
                          {missingSkills.length === 0 ? (
                            <span className="text-xs text-muted-foreground">ممتاز! لديك كل المهارات المطلوبة</span>
                          ) : (
                            missingSkills.map((s, i) => (
                              <Badge
                                key={s.skill}
                                variant="outline"
                                className={cn(
                                  "border-red-500/30 bg-red-500/10 text-red-400 text-xs",
                                  i < 3 && "animate-pulse"
                                )}
                              >
                                <XCircle className="ml-1 h-3 w-3" />
                                {s.skill}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Demand ranking bars */}
                    <div className="mt-4 space-y-1.5">
                      {topSkills.map((s, i) => (
                        <div key={s.skill} className="flex items-center gap-2">
                          <span className="w-32 text-xs truncate text-muted-foreground">{s.skill}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-white/10">
                            <div
                              className={cn(
                                "h-1.5 rounded-full transition-all",
                                s.alreadyHas ? "bg-emerald-500" : "bg-amber-500"
                              )}
                              style={{ width: `${Math.max(20, 100 - i * 8)}%` }}
                            />
                          </div>
                          {s.alreadyHas ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })()}

            {/* ── Career Recommendations ── */}
            {data.careerRecommendations.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Briefcase className="h-4 w-4 text-primary" />
                    أفضل الوظائف المناسبة لك
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.careerRecommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/8"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-primary">#{i + 1}</span>
                            {rec.jobId ? (
                              <Link
                                href={`/jobs/${rec.jobId}`}
                                className="font-semibold text-foreground hover:text-primary hover:underline"
                              >
                                {rec.jobTitle}
                              </Link>
                            ) : (
                              <span className="font-semibold text-foreground">{rec.jobTitle}</span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{rec.company}</p>
                        </div>
                        <ScoreBadge score={rec.matchScore} />
                      </div>

                      <MatchBar score={rec.matchScore} />

                      {rec.reason && (
                        <p className="mt-2 text-xs text-muted-foreground">{rec.reason}</p>
                      )}

                      {rec.recommendedSkills.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {rec.recommendedSkills.map((s) => (
                            <Badge
                              key={s}
                              variant="outline"
                              className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs"
                            >
                              <BookOpen className="ml-1 h-3 w-3" />
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* ── Improved CV ── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-primary" />
                    سيرتك الذاتية المحسّنة
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        تم النسخ
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        نسخ النص
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Professional Summary */}
                {data.improvedCv.professionalSummary && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-primary">ملخص احترافي</p>
                    <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm leading-relaxed text-foreground">
                      {data.improvedCv.professionalSummary}
                    </p>
                  </div>
                )}

                {/* Optimized Skills */}
                {data.improvedCv.optimizedSkills.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-emerald-400">مهارات محسّنة لـ ATS</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.improvedCv.optimizedSkills.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">
                          <CheckCircle2 className="ml-1 h-3 w-3 text-emerald-500" />
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Achievement Tips */}
                {data.improvedCv.achievementTips.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-blue-400">نصائح لتحسين الإنجازات</p>
                    <ul className="space-y-1.5">
                      {data.improvedCv.achievementTips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                            {i + 1}
                          </span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Full CV Text */}
                {data.improvedCv.fullText && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground">نص السيرة الذاتية الكامل (جاهز للنسخ)</p>
                    <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-white/10 bg-black/20 p-4 text-xs text-muted-foreground leading-relaxed">
                      {data.improvedCv.fullText}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Re-analyze CTA */}
            <div className="flex justify-center pb-4">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={handleAnalyze}
                disabled={running}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", running && "animate-spin")} />
                إعادة التحليل بناءً على آخر تحديث
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

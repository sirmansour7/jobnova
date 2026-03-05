"use client"
import { useEffect, useState } from "react"
import { apiJson } from "@/src/lib/api"
import type { JobMatchResult } from "@/src/types/job-match"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/src/lib/utils"

function ScoreRing({ score, level }: { score: number; level: string }) {
  const color = level === 'excellent' ? '#22c55e'
    : level === 'good' ? '#3b82f6'
    : level === 'fair' ? '#f59e0b'
    : '#ef4444'

  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="88" height="88" className="-rotate-90">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="currentColor"
          strokeWidth="6" className="text-muted/30" />
        <circle cx="44" cy="44" r={radius} fill="none" stroke={color}
          strokeWidth="6" strokeDasharray={circumference}
          strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute text-center">
        <p className="text-xl font-bold leading-none">{score}%</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          تطابق
        </p>
      </div>
    </div>
  )
}

export function JobMatchPanel({ jobId }: { jobId: string }) {
  const [result, setResult] = useState<JobMatchResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    apiJson<JobMatchResult>(`/v1/jobs/${jobId}/match`)
      .then(setResult)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [jobId])

  if (loading) return (
    <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
      <div className="h-4 w-32 bg-muted rounded mb-3" />
      <div className="h-20 bg-muted rounded" />
    </div>
  )

  if (error || !result) return null

  const levelLabel = {
    excellent: 'ممتاز',
    good: 'جيد',
    fair: 'متوسط',
    low: 'منخفض',
  }[result.level]

  const levelColor = {
    excellent: 'bg-green-500/10 text-green-500 border-green-500/20',
    good: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    fair: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    low: 'bg-red-500/10 text-red-500 border-red-500/20',
  }[result.level]

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-sm">مدى تطابق سيرتك الذاتية</h3>
        <Badge variant="outline" className={cn("text-xs font-medium", levelColor)}>
          {levelLabel}
        </Badge>
      </div>

      {/* Score + recommendation */}
      <div className="flex items-center gap-4">
        <ScoreRing score={result.matchScore} level={result.level} />
        <p className="text-xs text-muted-foreground leading-6 flex-1">
          {result.recommendation}
        </p>
      </div>

      {/* Matched skills */}
      {result.matchedSkills.length > 0 && (
        <div>
          <p className="text-xs font-medium text-green-500 mb-2">✓ مهارات متطابقة</p>
          <div className="flex flex-wrap gap-1.5">
            {result.matchedSkills.map(s => (
              <span key={s} className="rounded-full bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 text-xs text-green-600 dark:text-green-400">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing skills */}
      {result.missingSkills.length > 0 && (
        <div>
          <p className="text-xs font-medium text-yellow-500 mb-2">⚡ مهارات ناقصة</p>
          <div className="flex flex-wrap gap-1.5">
            {result.missingSkills.map(s => (
              <span key={s} className="rounded-full bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-0.5 text-xs text-yellow-600 dark:text-yellow-400">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <a href="/candidate/cv-builder"
        className="block text-center text-xs text-primary hover:underline mt-1">
        تحسين سيرتك الذاتية 
      </a>
    </div>
  )
}

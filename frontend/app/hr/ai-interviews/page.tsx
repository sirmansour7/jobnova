"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Bot, ChevronLeft } from "lucide-react"
import { apiJson } from "@/src/lib/api"
import { INTERVIEW_STATUS_LABEL } from "@/src/constants/interview-labels"
import { toast } from "sonner"

interface AiInterviewSession {
  id: string
  status: string
  startedAt: string
  completedAt?: string | null
  hrDecision?: string | null
  job: { id: string; title: string; organization?: { name?: string } }
  candidate: { id: string; fullName: string; email: string }
  summary?: {
    recommendation?: string | null
    summaryTextArabic?: string | null
  } | null
}

const STATUS_BADGE: Record<string, string> = {
  active:    "bg-blue-500/10 text-blue-400 border-blue-400/30",
  completed: "bg-green-500/10 text-green-400 border-green-400/30",
  reviewed:  "bg-purple-500/10 text-purple-400 border-purple-400/30",
}

const DECISION_BADGE: Record<string, string> = {
  shortlist:      "bg-green-500/10 text-green-400 border-green-400/30",
  reject:         "bg-red-500/10 text-red-400 border-red-400/30",
  "needs review": "bg-yellow-500/10 text-yellow-400 border-yellow-400/30",
}

const DECISION_LABEL: Record<string, string> = {
  shortlist:      "مقبول مبدئياً",
  reject:         "مرفوض",
  "needs review": "يحتاج مراجعة",
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString("ar-EG") + " • " + d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
  } catch {
    return iso
  }
}

export default function AiInterviewsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<AiInterviewSession[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const allowedRoles = useMemo(() => ["hr", "admin"] as const, [])

  useEffect(() => {
    setLoading(true)
    apiJson<{ items: AiInterviewSession[] }>("/v1/hr/interviews")
      .then((res) => setSessions(res?.items ?? []))
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "فشل تحميل المقابلات")
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!search) return sessions
    const q = search.toLowerCase()
    return sessions.filter(
      (s) =>
        s.candidate?.fullName?.toLowerCase().includes(q) ||
        s.candidate?.email?.toLowerCase().includes(q) ||
        s.job?.title?.toLowerCase().includes(q),
    )
  }, [sessions, search])

  const stats = useMemo(() => ({
    total:     sessions.length,
    completed: sessions.filter((s) => s.status === "completed" || s.status === "reviewed").length,
    pending:   sessions.filter((s) => s.status === "active").length,
  }), [sessions])

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-6" dir="rtl">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              المقابلات الذكية
            </h1>
            <p className="text-muted-foreground mt-1">
              جلسات المقابلة التي أجراها الذكاء الاصطناعي مع المرشحين
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "إجمالي الجلسات", value: stats.total, color: "text-foreground" },
              { label: "مكتملة", value: stats.completed, color: "text-green-400" },
              { label: "جارية", value: stats.pending, color: "text-blue-400" },
            ].map((stat) => (
              <Card key={stat.label} className="border-border bg-card">
                <CardContent className="pt-4 pb-4 text-center">
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search */}
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ابحث بالاسم أو البريد أو الوظيفة..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pe-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Sessions list */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-border bg-card">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-56" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="py-16 text-center text-muted-foreground">
                {search ? "لا توجد نتائج مطابقة للبحث" : "لا توجد جلسات مقابلة ذكية بعد"}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((session) => (
                <Card
                  key={session.id}
                  className="border-border bg-card hover:border-primary/40 transition-colors cursor-pointer"
                  onClick={() => router.push(`/hr/interviews/${session.id}`)}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                          {getInitials(session.candidate?.fullName ?? "?")}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground truncate">
                            {session.candidate?.fullName ?? "—"}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-xs ${STATUS_BADGE[session.status] ?? ""}`}
                          >
                            {INTERVIEW_STATUS_LABEL[session.status] ?? session.status}
                          </Badge>
                          {session.hrDecision && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${DECISION_BADGE[session.hrDecision] ?? ""}`}
                            >
                              {DECISION_LABEL[session.hrDecision] ?? session.hrDecision}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {session.job?.title ?? "—"}
                          {session.job?.organization?.name && ` — ${session.job.organization.name}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(session.startedAt)}
                        </p>
                      </div>

                      <Button variant="ghost" size="icon" className="shrink-0">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </div>

                    {session.summary?.summaryTextArabic && (
                      <p className="text-xs text-muted-foreground mt-3 pr-14 line-clamp-2">
                        {session.summary.summaryTextArabic}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

"use client"

import { useMemo, useState } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useHrPipeline } from "@/src/hooks/useHrPipeline"

const STAGE_COLOR: Record<string, string> = {
  APPLIED: "border-chart-4",
  SHORTLISTED: "border-chart-2",
  HIRED: "border-chart-3",
  REJECTED: "border-destructive",
}

function getInitials(fullName: string | undefined): string {
  if (!fullName?.trim()) return "?"
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function PipelinePage() {
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(undefined)
  const { jobs, stages, loading, error, moveCandidate } = useHrPipeline(selectedJobId)
  const allowedRoles = useMemo(() => ["hr"] as const, [])

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">مراحل التوظيف</h1>
            <p className="text-muted-foreground">تتبع المرشحين عبر مراحل التوظيف المختلفة</p>
          </div>

          {jobs.length > 0 && (
            <div className="flex items-center gap-3">
              <Select value={selectedJobId ?? ""} onValueChange={setSelectedJobId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="اختر وظيفة لعرض المرشحين" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {loading && <p className="text-muted-foreground">جاري التحميل...</p>}
          {error && <p className="text-destructive">{error}</p>}

          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4" style={{ minWidth: "900px" }}>
              {stages.map((stage) => (
                <div key={stage.id} className="w-64 shrink-0">
                  <Card className={`border-border bg-card border-t-2 ${STAGE_COLOR[stage.id] ?? "border-border"}`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-sm text-foreground">
                        {stage.label}
                        <Badge variant="secondary" className="text-xs">{stage.candidates.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {!selectedJobId ? (
                        <div className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                          اختر وظيفة أولاً
                        </div>
                      ) : stage.candidates.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                          لا يوجد مرشحون
                        </div>
                      ) : (
                        stage.candidates.map((candidate) => (
                          <div key={candidate.id} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                {getInitials(candidate.candidate?.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {candidate.candidate?.fullName ?? "مرشح"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate" dir="ltr">
                                {candidate.candidate?.email ?? ""}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

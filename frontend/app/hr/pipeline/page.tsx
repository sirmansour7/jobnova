"use client"

import { useMemo, useState } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  closestCenter,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useHrPipeline, type PipelineStage } from "@/src/hooks/useHrPipeline"
import type { JobApplication, ApplicationStatus } from "@/src/services/applications.service"

const STAGE_IDS: ApplicationStatus[] = ["APPLIED", "SHORTLISTED", "HIRED", "REJECTED"]

const STAGE_COLOR: Record<string, string> = {
  APPLIED: "border-chart-4",
  SHORTLISTED: "border-chart-2",
  HIRED: "border-chart-3",
  REJECTED: "border-destructive",
}

type CvExperience = {
  title?: string
  company?: string
  from?: string
  to?: string
  description?: string
}

type CvEducation = {
  degree?: string
  institution?: string
  year?: string
}

type CvDataLike = {
  fullName?: string
  email?: string
  phone?: string
  summary?: string
  skills?: string[]
  experience?: CvExperience[]
  education?: CvEducation[]
}

function getInitials(fullName: string | undefined): string {
  if (!fullName?.trim()) return "?"
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getCvData(app: JobApplication): CvDataLike | null {
  const raw = app.candidate?.cv?.data
  if (!raw || typeof raw !== "object") return null
  return raw as CvDataLike
}

function CandidateCard({
  app,
  withHover,
  onOpenCv,
}: {
  app: JobApplication
  withHover?: boolean
  onOpenCv?: () => void
}) {
  const name = app.candidate?.fullName ?? "مرشح"
  const email = app.candidate?.email ?? ""
  const createdAt = app.createdAt
  const dateLabel = (() => {
    try {
      const d = new Date(createdAt)
      if (Number.isNaN(d.getTime())) return "-"
      return d.toLocaleDateString("ar-EG")
    } catch {
      return "-"
    }
  })()

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border border-border bg-secondary/30 p-3 ${
        withHover ? "cursor-grab hover:bg-secondary/50" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/20 text-primary text-xs">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate" dir="ltr">
            {email}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>تاريخ التقديم: {dateLabel}</span>
        {onOpenCv && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onOpenCv}
          >
            السيرة الذاتية
          </Button>
        )}
      </div>
    </div>
  )
}

function DraggableCard({
  candidate,
  onOpenCv,
}: {
  candidate: JobApplication
  onOpenCv: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: candidate.id,
  })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={isDragging ? "opacity-50" : ""}
    >
      <CandidateCard app={candidate} withHover onOpenCv={onOpenCv} />
    </div>
  )
}

function DroppableColumn({
  stage,
  children,
}: {
  stage: PipelineStage
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  return (
    <div
      ref={setNodeRef}
      className={`w-72 shrink-0 transition-shadow ${
        isOver ? "ring-2 ring-primary rounded-lg" : ""
      }`}
    >
      <Card
        className={`border-border bg-card border-t-2 ${
          STAGE_COLOR[stage.id] ?? "border-border"
        }`}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm text-foreground">
            {stage.label}
            <Badge variant="secondary" className="text-xs">
              {stage.candidates.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 min-h-[140px]">
          {children}
        </CardContent>
      </Card>
    </div>
  )
}

export default function PipelinePage() {
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>()
  const { jobs, stages, loading, error, moveCandidate } = useHrPipeline(selectedJobId)
  const allowedRoles = useMemo(() => ["hr"] as const, [])

  const [activeId, setActiveId] = useState<string | null>(null)
  const [cvSheetOpen, setCvSheetOpen] = useState(false)
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null)

  const flatCandidates = stages.flatMap((s) => s.candidates)
  const activeCandidate = activeId
    ? flatCandidates.find((c) => c.id === activeId) ?? null
    : null

  const totalCount = flatCandidates.length
  const countsByStage = useMemo(
    () =>
      stages.reduce<Record<ApplicationStatus, number>>((acc, s) => {
        acc[s.id] = s.candidates.length
        return acc
      }, { APPLIED: 0, SHORTLISTED: 0, HIRED: 0, REJECTED: 0 }),
    [stages],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return
    const applicationId = active.id as string
    const overId = String(over.id)
    if (!STAGE_IDS.includes(overId as ApplicationStatus)) return
    const newStatus = overId as ApplicationStatus
    const currentApp = flatCandidates.find((c) => c.id === applicationId)
    if (!currentApp || currentApp.status === newStatus) return
    moveCandidate(applicationId, newStatus)
  }

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">مراحل التوظيف</h1>
            <p className="text-muted-foreground">
              تتبع المرشحين عبر مراحل التوظيف المختلفة
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Select
                  value={selectedJobId ?? ""}
                  onValueChange={(val) => setSelectedJobId(val || undefined)}
                >
                  <SelectTrigger className="w-72">
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
            </div>

            {/* Stats bar */}
            {selectedJobId && (
              <Card className="border-border bg-card">
                <CardContent className="flex flex-wrap gap-4 p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">الإجمالي:</span>
                    <span className="font-semibold text-foreground">{totalCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-chart-4" />
                    <span className="text-muted-foreground">تقدم حديث:</span>
                    <span className="font-semibold text-foreground">
                      {countsByStage.APPLIED}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-chart-2" />
                    <span className="text-muted-foreground">مقبول مبدئيًا:</span>
                    <span className="font-semibold text-foreground">
                      {countsByStage.SHORTLISTED}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-chart-3" />
                    <span className="text-muted-foreground">مقبول:</span>
                    <span className="font-semibold text-foreground">
                      {countsByStage.HIRED}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-destructive" />
                    <span className="text-muted-foreground">مرفوض:</span>
                    <span className="font-semibold text-foreground">
                      {countsByStage.REJECTED}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {loading && (
            <p className="text-muted-foreground text-center">
              جاري تحميل المرشحين...
            </p>
          )}
          {error && <p className="text-destructive text-center">{error}</p>}

          {!selectedJobId && !loading && (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border">
              <p className="text-sm text-muted-foreground">
                اختر وظيفة لعرض مراحل التوظيف
              </p>
            </div>
          )}

          {selectedJobId && (
            <ScrollArea className="w-full">
              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                onDragStart={(event) => setActiveId(String(event.active.id))}
              >
                <div className="flex gap-4 pb-4" style={{ minWidth: "960px" }}>
                  {stages.map((stage) => (
                    <DroppableColumn key={stage.id} stage={stage}>
                      {stage.candidates.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                          لا يوجد مرشحون
                        </div>
                      ) : (
                        stage.candidates.map((candidate) => (
                          <DraggableCard
                            key={candidate.id}
                            candidate={candidate}
                            onOpenCv={() => {
                              setSelectedApp(candidate)
                              setCvSheetOpen(true)
                            }}
                          />
                        ))
                      )}
                    </DroppableColumn>
                  ))}
                </div>

                <DragOverlay>
                  {activeCandidate ? (
                    <CandidateCard app={activeCandidate} />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </ScrollArea>
          )}

          {/* CV Sheet */}
          <Sheet open={cvSheetOpen} onOpenChange={setCvSheetOpen}>
            <SheetContent
              side="left"
              className="w-full sm:max-w-lg overflow-y-auto"
              dir="rtl"
            >
              <SheetHeader>
                <SheetTitle>السيرة الذاتية</SheetTitle>
              </SheetHeader>
              {selectedApp &&
                (() => {
                  const cvData = getCvData(selectedApp)
                  const c = selectedApp.candidate
                  const name = c?.fullName ?? (cvData?.fullName ?? "مرشح")
                  const email = c?.email ?? cvData?.email ?? ""
                  const phone =
                    c?.candidateProfile?.phone ?? cvData?.phone ?? ""

                  if (!cvData) {
                    return (
                      <p className="text-muted-foreground py-6 text-center">
                        لم يقم المرشح بإضافة سيرة ذاتية بعد
                      </p>
                    )
                  }

                  const summary = cvData.summary ?? ""
                  const skills = cvData.skills ?? []
                  const experience = cvData.experience ?? []
                  const education = cvData.education ?? []

                  return (
                    <div className="space-y-6 pt-4">
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-foreground">
                          المعلومات الشخصية
                        </h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>
                            <span className="text-foreground">الاسم:</span>{" "}
                            {name}
                          </li>
                          <li dir="ltr" className="text-left">
                            <span className="text-foreground">البريد:</span>{" "}
                            {email}
                          </li>
                          {phone && (
                            <li dir="ltr" className="text-left">
                              <span className="text-foreground">الهاتف:</span>{" "}
                              {phone}
                            </li>
                          )}
                        </ul>
                      </div>

                      {summary && (
                        <div>
                          <h4 className="mb-2 text-sm font-semibold text-foreground">
                            الملخص
                          </h4>
                          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                            {summary}
                          </p>
                        </div>
                      )}

                      {experience.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-sm font-semibold text-foreground">
                            الخبرات
                          </h4>
                          <ul className="space-y-3 border-r-2 border-border pr-3 text-sm">
                            {experience.map((exp, i) => (
                              <li
                                key={i}
                                className="border-b border-border pb-2 last:border-0"
                              >
                                <p className="font-medium text-foreground">
                                  {exp.title ?? "—"}{" "}
                                  {exp.company && `@ ${exp.company}`}
                                </p>
                                {(exp.from || exp.to) && (
                                  <p className="text-xs text-muted-foreground">
                                    {exp.from ?? "—"} – {exp.to ?? "—"}
                                  </p>
                                )}
                                {exp.description && (
                                  <p className="mt-1 text-muted-foreground">
                                    {exp.description}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {education.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-sm font-semibold text-foreground">
                            التعليم
                          </h4>
                          <ul className="space-y-2 text-sm">
                            {education.map((edu, i) => (
                              <li
                                key={i}
                                className="border-b border-border pb-2 last:border-0"
                              >
                                <p className="font-medium text-foreground">
                                  {edu.degree ?? "—"} –{" "}
                                  {edu.institution ?? "—"}
                                </p>
                                {edu.year && (
                                  <p className="text-xs text-muted-foreground">
                                    {edu.year}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {skills.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-sm font-semibold text-foreground">
                            المهارات
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {skills.map((s, i) => (
                              <span
                                key={i}
                                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
            </SheetContent>
          </Sheet>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Search, FileText, ChevronLeft, ChevronRight } from "lucide-react"
import { apiJson } from "@/src/lib/api"
import {
  STATUS_COLOR,
  STATUS_LABEL,
  type ApplicationStatus,
  type JobApplication,
} from "@/src/services/applications.service"
import { toast } from "sonner"

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

type ApplicationWithJob = JobApplication & {
  job?: { title?: string }
}

function formatDate(date: string | Date | undefined): string {
  if (!date) return "-"
  try {
    const d = typeof date === "string" ? new Date(date) : date
    if (Number.isNaN(d.getTime())) return "-"
    return d.toLocaleDateString("ar-EG")
  } catch {
    return "-"
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getCvData(app: JobApplication): CvDataLike | null {
  const raw = app.candidate?.cv?.data
  if (!raw || typeof raw !== "object") return null
  return raw as CvDataLike
}

function getStatusLabel(status: ApplicationStatus): string {
  return STATUS_LABEL[status] ?? "قيد المراجعة"
}

export default function ApplicantsPage() {
  const [applications, setApplications] = useState<ApplicationWithJob[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | ApplicationStatus>("all")
  const [page, setPage] = useState(1)
  const [cvSheetOpen, setCvSheetOpen] = useState(false)
  const [selectedApp, setSelectedApp] = useState<ApplicationWithJob | null>(null)
  const LIMIT = 15
  const router = useRouter()

  useEffect(() => {
    const fetchApplicants = async () => {
      setLoading(true)
      try {
        const jobsRes = await apiJson<any>(
          "/v1/jobs?limit=100",
        )
        const jobsList = Array.isArray(jobsRes)
          ? jobsRes
          : jobsRes?.items ?? jobsRes?.data ?? []

        const jobResults = await Promise.all(
          jobsList.map(async (job: any) => {
            const appsRes = await apiJson<any>(
              `/v1/applications/job/${job.id}?limit=100`,
            )
            const list = Array.isArray(appsRes)
              ? appsRes
              : appsRes?.items ?? appsRes?.applications ?? appsRes?.data ?? []
            if (!Array.isArray(list)) return []
            return list.map(
              (app: any): ApplicationWithJob => ({
                id: app.id,
                status: app.status ?? "APPLIED",
                createdAt: app.createdAt,
                candidate: app.candidate,
                job: app.job ? { title: app.job.title } : { title: job.title },
              }),
            )
          }),
        )

        const flat: ApplicationWithJob[] = jobResults.flat()
        flat.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        setApplications(flat)
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "فشل تحميل المتقدمين"
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    }

    void fetchApplicants()
  }, [])

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      const name = app.candidate?.fullName ?? "مرشح"
      const email = app.candidate?.email ?? ""
      const matchesSearch =
        !search ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        email.toLowerCase().includes(search.toLowerCase())
      const label = getStatusLabel(app.status)
      const matchesStatus =
        statusFilter === "all" || app.status === statusFilter
      return matchesSearch && matchesStatus && label
    })
  }, [applications, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / LIMIT))
  const paginated = useMemo(
    () => filtered.slice((page - 1) * LIMIT, page * LIMIT),
    [filtered, page],
  )

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  const handleStatusUpdate = async (
    app: ApplicationWithJob,
    nextStatus: ApplicationStatus,
  ) => {
    if (nextStatus === app.status) return
    const prevStatus = app.status
    setApplications((prev) =>
      prev.map((a) =>
        a.id === app.id ? { ...a, status: nextStatus } : a,
      ),
    )
    try {
      const res = await apiJson(`/v1/applications/${app.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      })
      if ((res as any)?.status && (res as any).status !== nextStatus) {
        // backend might echo full entity; we ignore and keep optimistic
      }
      toast.success("تم تحديث حالة الطلب")
    } catch (err) {
      setApplications((prev) =>
        prev.map((a) =>
          a.id === app.id ? { ...a, status: prevStatus } : a,
        ),
      )
      const msg =
        err instanceof Error ? err.message : "فشل تحديث حالة الطلب"
      toast.error(msg)
    }
  }

  const allowedRoles = useMemo(() => ["hr"] as const, [])

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">المتقدمون</h1>
            <p className="text-muted-foreground">
              إدارة ومراجعة طلبات المرشحين عبر جميع الوظائف
            </p>
          </div>

          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="ابحث بالاسم أو البريد الإلكتروني..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pe-10"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(val) =>
                    setStatusFilter(val as "all" | ApplicationStatus)
                  }
                >
                  <SelectTrigger className="w-full sm:w-52">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="APPLIED">قيد المراجعة</SelectItem>
                    <SelectItem value="SHORTLISTED">مقبول مبدئيًا</SelectItem>
                    <SelectItem value="REJECTED">مرفوض</SelectItem>
                    <SelectItem value="HIRED">مقبول</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-start">المرشح</TableHead>
                    <TableHead className="text-start">الوظيفة</TableHead>
                    <TableHead className="text-start">الحالة</TableHead>
                    <TableHead className="text-start">تاريخ التقديم</TableHead>
                    <TableHead className="text-start">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}>
                          <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : paginated.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-muted-foreground"
                      >
                        لا توجد طلبات مطابقة للبحث الحالي
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((app) => {
                      const name = app.candidate?.fullName ?? "مرشح"
                      const email = app.candidate?.email ?? ""
                      const label = getStatusLabel(app.status)
                      const jobTitle = app.job?.title ?? ""
                      return (
                        <TableRow key={app.id} className="border-border">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                  {getInitials(name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">
                                  {name}
                                </p>
                                <p
                                  className="text-xs text-muted-foreground"
                                  dir="ltr"
                                >
                                  {email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-foreground">
                            {jobTitle}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={app.status}
                              onValueChange={(val) =>
                                handleStatusUpdate(
                                  app,
                                  val as ApplicationStatus,
                                )
                              }
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(
                                  ["APPLIED", "SHORTLISTED", "REJECTED", "HIRED"] as ApplicationStatus[]
                                ).map((st) => (
                                  <SelectItem key={st} value={st}>
                                    {getStatusLabel(st)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Badge
                              variant="outline"
                              className={`mt-1 ${STATUS_COLOR[label] ?? ""}`}
                            >
                              {label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(app.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedApp(app)
                                setCvSheetOpen(true)
                              }}
                            >
                              <FileText className="ml-2 h-4 w-4" />
                              عرض السيرة الذاتية
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    صفحة {page} من {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronRight className="ml-1 h-4 w-4" />
                      السابق
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      التالي
                      <ChevronLeft className="mr-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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
                  const name = c?.fullName ?? cvData?.fullName ?? "مرشح"
                  const email = c?.email ?? cvData?.email ?? ""
                  const phone =
                    c?.candidateProfile?.phone ?? cvData?.phone ?? ""

                  if (!cvData) {
                    return (
                      <p className="py-6 text-center text-muted-foreground">
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

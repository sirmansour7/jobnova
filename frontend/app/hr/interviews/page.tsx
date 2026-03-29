"use client"

import { useEffect, useState, useMemo } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { apiJson } from "@/src/lib/api"
import { toast } from "sonner"

type InterviewStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED"
type InterviewType = "ONLINE" | "IN_PERSON" | "PHONE"

interface ScheduledInterview {
  id: string
  scheduledAt: string
  durationMins: number
  type: string
  location?: string | null
  notes?: string | null
  status: string
  application: {
    id: string
    status: string
    candidate: { id: string; fullName: string; email: string }
    job: { id: string; title: string }
  }
}

interface JobOption {
  id: string
  title: string
}

interface ApplicationOption {
  id: string
  status: string
  candidate: { id: string; fullName: string; email: string }
  job: { id: string; title: string }
}

const STATUS_LABEL: Record<InterviewStatus, string> = {
  SCHEDULED: "مجدول",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
}

const STATUS_BADGE: Record<InterviewStatus, string> = {
  SCHEDULED: "bg-chart-2/10 text-chart-2 border-chart-2/40",
  COMPLETED: "bg-chart-3/10 text-chart-3 border-chart-3/40",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/40",
}

const TYPE_LABEL: Record<InterviewType, string> = {
  ONLINE: "أونلاين",
  IN_PERSON: "حضوري",
  PHONE: "هاتفي",
}

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    const date = d.toLocaleDateString("ar-EG")
    const time = d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
    return `${date} • ${time}`
  } catch {
    return iso
  }
}

function normalizeInterviews(data: unknown): ScheduledInterview[] {
  if (Array.isArray(data)) return data as ScheduledInterview[]
  const obj = data as { items?: ScheduledInterview[] }
  return obj?.items ?? []
}

export default function HrInterviewsPage() {
  const [interviews, setInterviews] = useState<ScheduledInterview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingInterview, setEditingInterview] = useState<ScheduledInterview | null>(null)
  const [jobs, setJobs] = useState<JobOption[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [candidates, setCandidates] = useState<ApplicationOption[]>([])
  const [selectedJobId, setSelectedJobId] = useState("")
  const [selectedApplicationId, setSelectedApplicationId] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [durationMins, setDurationMins] = useState(60)
  const [type, setType] = useState<InterviewType>("ONLINE")
  const [location, setLocation] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const allowedRoles = useMemo(() => ["hr"] as const, [])

  const fetchInterviews = () => {
    setLoading(true)
    setError(null)
    apiJson<unknown>("/v1/hr/interviews/schedule")
      .then((data) => setInterviews(normalizeInterviews(data)))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "حدث خطأ"
        setError(msg)
        toast.error(msg)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchInterviews()
  }, [])

  useEffect(() => {
    setJobsLoading(true)
    apiJson<{ items: JobOption[]; total: number } | JobOption[]>("/v1/hr/jobs?limit=100&includeInactive=true")
      .then((res) => {
        const items: JobOption[] = Array.isArray(res) ? res : (res?.items ?? [])
        setJobs(items.map((j) => ({ id: j.id, title: j.title })))
      })
      .catch(() => setJobs([]))
      .finally(() => setJobsLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedJobId) {
      setCandidates([])
      setSelectedApplicationId("")
      return
    }
    apiJson<unknown>(`/v1/applications/job/${selectedJobId}?limit=100`)
      .then((data) => {
        const list = Array.isArray(data) ? data : (data as { items?: ApplicationOption[] }).items ?? []
        const apps = (list as ApplicationOption[]).filter(
          (a) => a.status === "APPLIED" || a.status === "SHORTLISTED"
        )
        setCandidates(apps)
        setSelectedApplicationId((prev) => {
          const keep = apps.some((a) => a.id === prev)
          return keep ? prev : ""
        })
      })
      .catch(() => setCandidates([]))
  }, [selectedJobId])

  const resetDialog = () => {
    setDialogOpen(false)
    setEditingInterview(null)
    setSelectedJobId("")
    setSelectedApplicationId("")
    setScheduledAt("")
    setDurationMins(60)
    setType("ONLINE")
    setLocation("")
    setNotes("")
  }

  const openCreate = () => {
    resetDialog()
    setDialogOpen(true)
  }

  const openEdit = (int: ScheduledInterview) => {
    setEditingInterview(int)
    setSelectedJobId(int.application?.job?.id ?? "")
    setSelectedApplicationId(int.application?.id ?? "")
    const d = int.scheduledAt ? new Date(int.scheduledAt) : null
    setScheduledAt(d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 16) : "")
    setDurationMins(int.durationMins ?? 60)
    setType((int.type as InterviewType) || "online")
    setLocation(int.location ?? "")
    setNotes(int.notes ?? "")
    setDialogOpen(true)
  }

  const handleSubmit = () => {
    if (!selectedApplicationId) {
      toast.error("اختر المرشح")
      return
    }
    const at = scheduledAt ? new Date(scheduledAt).toISOString() : null
    if (!at || Number.isNaN(new Date(scheduledAt).getTime())) {
      toast.error("أدخل التاريخ والوقت")
      return
    }
    setSubmitting(true)
    const body = {
      applicationId: selectedApplicationId,
      scheduledAt: at,
      durationMins: durationMins || 60,
      type,
      location: location || undefined,
      notes: notes || undefined,
    }
    if (editingInterview) {
      apiJson<ScheduledInterview>(`/v1/hr/interviews/schedule/${editingInterview.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })
        .then((updated) => {
          setInterviews((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
          toast.success("تم تحديث المقابلة")
          resetDialog()
        })
        .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "حدث خطأ"))
        .finally(() => setSubmitting(false))
    } else {
      apiJson<ScheduledInterview>("/v1/hr/interviews/schedule", {
        method: "POST",
        body: JSON.stringify(body),
      })
        .then((created) => {
          setInterviews((prev) => [created, ...prev])
          toast.success("تم جدولة المقابلة")
          resetDialog()
        })
        .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "حدث خطأ"))
        .finally(() => setSubmitting(false))
    }
  }

  const handleDelete = (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المقابلة؟")) return
    apiJson(`/v1/hr/interviews/schedule/${id}`, { method: "DELETE" })
      .then(() => {
        setInterviews((prev) => prev.filter((i) => i.id !== id))
        toast.success("تم حذف المقابلة")
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "حدث خطأ"))
  }

  const handleStatusChange = (id: string, status: InterviewStatus) => {
    apiJson<ScheduledInterview>(`/v1/hr/interviews/schedule/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    })
      .then((updated) => {
        setInterviews((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
        toast.success("تم تحديث الحالة")
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "حدث خطأ"))
  }

  const sortedInterviews = useMemo(
    () => [...interviews].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
    [interviews]
  )

  if (loading && interviews.length === 0) {
    return (
      <ProtectedRoute allowedRoles={allowedRoles}>
        <DashboardLayout>
          <div className="space-y-6" dir="rtl">
            <div className="flex justify-between items-center">
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-6" dir="rtl">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">مقابلات التوظيف</h1>
              <p className="text-muted-foreground">جدولة وعرض مقابلات المرشحين</p>
            </div>
            <Button onClick={openCreate}>جدولة مقابلة</Button>
          </div>

          {error && (
            <Card className="border-destructive/30">
              <CardContent className="pt-6">
                <p className="text-destructive text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          {sortedInterviews.length === 0 && !error && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                لا توجد مقابلات مجدولة بعد
              </CardContent>
            </Card>
          )}

          {sortedInterviews.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedInterviews.map((int) => (
                <Card key={int.id} className="flex flex-col">
                  <CardContent className="pt-6 flex-1 flex flex-col gap-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {int.application?.candidate?.fullName ?? "—"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {int.application?.candidate?.email ?? "—"}
                      </p>
                    </div>
                    <p className="text-sm text-foreground">{int.application?.job?.title ?? "—"}</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(int.scheduledAt)}</p>
                    <p className="text-xs text-muted-foreground">{int.durationMins ?? 60} دقيقة</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {TYPE_LABEL[int.type as InterviewType] ?? int.type}
                      </Badge>
                      <Badge variant="outline" className={STATUS_BADGE[int.status as InterviewStatus] ?? ""}>
                        {STATUS_LABEL[int.status as InterviewStatus] ?? int.status}
                      </Badge>
                    </div>
                    {int.location && (
                      <p className="text-xs text-muted-foreground break-all">{int.location}</p>
                    )}
                    {int.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{int.notes}</p>
                    )}
                    <div className="mt-auto pt-2 flex flex-wrap gap-2 items-center">
                      <Select
                        value={int.status}
                        onValueChange={(v) => handleStatusChange(int.id, v as InterviewStatus)}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_LABEL) as InterviewStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>
                              {STATUS_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => openEdit(int)}>
                        تعديل
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(int.id)}>
                        حذف
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-md" dir="rtl">
              <DialogHeader>
                <DialogTitle>{editingInterview ? "تعديل المقابلة" : "جدولة مقابلة"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">الوظيفة</label>
                  <Select
                    value={selectedJobId}
                    onValueChange={setSelectedJobId}
                    disabled={jobsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          jobsLoading
                            ? "جاري تحميل الوظائف..."
                            : jobs.length === 0
                              ? "لا توجد وظائف متاحة"
                              : "اختر الوظيفة"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {jobsLoading ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground text-center">
                          جاري التحميل...
                        </div>
                      ) : jobs.length === 0 ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground text-center">
                          لا توجد وظائف متاحة
                        </div>
                      ) : (
                        jobs.map((j) => (
                          <SelectItem key={j.id} value={j.id}>
                            {j.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">المرشح</label>
                  <Select
                    value={selectedApplicationId}
                    onValueChange={setSelectedApplicationId}
                    disabled={!selectedJobId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المرشح" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.candidate?.fullName ?? a.candidate?.email ?? a.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">التاريخ والوقت</label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">المدة (دقيقة)</label>
                  <Input
                    type="number"
                    min={15}
                    max={240}
                    value={durationMins || ""}
                    onChange={(e) => setDurationMins(Number(e.target.value) || 60)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">النوع</label>
                  <Select value={type} onValueChange={(v) => setType(v as InterviewType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONLINE">{TYPE_LABEL.ONLINE}</SelectItem>
                      <SelectItem value="IN_PERSON">{TYPE_LABEL.IN_PERSON}</SelectItem>
                      <SelectItem value="PHONE">{TYPE_LABEL.PHONE}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">الموقع / الرابط</label>
                  <Input
                    placeholder="رابط الاجتماع أو العنوان"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">ملاحظات</label>
                  <Textarea
                    placeholder="ملاحظات اختيارية"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetDialog}>
                  إلغاء
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {editingInterview ? "حفظ التعديلات" : "جدولة"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

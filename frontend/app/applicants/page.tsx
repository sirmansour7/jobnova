"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/src/context/auth-context"
import { api } from "@/src/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

const PRIVILEGED_USER_ID = "cmnb1ujku000lns0c21p805vz"

type AppStatus = "APPLIED" | "SHORTLISTED" | "REJECTED" | "HIRED"

interface Applicant {
  id: string
  status: AppStatus
  createdAt: string
  candidate: { id: string; fullName: string; email: string }
  job: { id: string; title: string; organization: { name: string } }
  cv: { id: string; data: unknown } | null
}

const STATUS_LABELS: Record<AppStatus, string> = {
  APPLIED: "قيد المراجعة",
  SHORTLISTED: "مقبول مبدئيًا",
  REJECTED: "مرفوض",
  HIRED: "مقبول",
}

const STATUS_VARIANTS: Record<AppStatus, "default" | "secondary" | "destructive" | "outline"> = {
  APPLIED: "secondary",
  SHORTLISTED: "default",
  REJECTED: "destructive",
  HIRED: "default",
}

export default function ApplicantsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<AppStatus | "ALL">("ALL")
  const [updating, setUpdating] = useState<string | null>(null)

  // Redirect if not privileged
  useEffect(() => {
    if (!isLoading && user?.id !== PRIVILEGED_USER_ID) {
      router.replace("/")
    }
  }, [user, isLoading, router])

  const fetchApplicants = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api("/v1/applications/applicants")
      if (!res.ok) throw new Error("Failed to fetch applicants")
      const data = await res.json()
      setApplicants(data.items ?? [])
    } catch {
      setError("حدث خطأ أثناء تحميل البيانات")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.id === PRIVILEGED_USER_ID) {
      fetchApplicants()
    }
  }, [user, fetchApplicants])

  const updateStatus = async (appId: string, status: AppStatus) => {
    setUpdating(appId)
    try {
      const res = await api(`/v1/applications/applicants/${appId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      setApplicants((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status } : a))
      )
    } catch {
      setError("فشل تحديث الحالة")
    } finally {
      setUpdating(null)
    }
  }

  const filtered = statusFilter === "ALL"
    ? applicants
    : applicants.filter((a) => a.status === statusFilter)

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    )
  }

  if (user?.id !== PRIVILEGED_USER_ID) return null

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة المتقدمين</h1>
        <div className="flex items-center gap-3">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as AppStatus | "ALL")}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="تصفية بالحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">الكل</SelectItem>
              <SelectItem value="APPLIED">قيد المراجعة</SelectItem>
              <SelectItem value="SHORTLISTED">مقبول مبدئيًا</SelectItem>
              <SelectItem value="HIRED">مقبول</SelectItem>
              <SelectItem value="REJECTED">مرفوض</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchApplicants}>تحديث</Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المتقدم</TableHead>
              <TableHead>البريد الإلكتروني</TableHead>
              <TableHead>الوظيفة</TableHead>
              <TableHead>الشركة</TableHead>
              <TableHead>السيرة الذاتية</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  لا يوجد متقدمون
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.candidate.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{app.candidate.email}</TableCell>
                  <TableCell>{app.job.title}</TableCell>
                  <TableCell>{app.job.organization.name}</TableCell>
                  <TableCell>
                    {app.cv ? (
                      <a
                        href={`/uploads/${app.cv.id}.pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        عرض CV
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[app.status]}>
                      {STATUS_LABELS[app.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={updating === app.id || app.status === "HIRED"}
                        onClick={() => updateStatus(app.id, "HIRED")}
                      >
                        قبول
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={updating === app.id || app.status === "REJECTED"}
                        onClick={() => updateStatus(app.id, "REJECTED")}
                      >
                        رفض
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        إجمالي: {filtered.length} متقدم
      </p>
    </div>
  )
}

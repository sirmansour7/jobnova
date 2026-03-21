"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowRight, Loader2, Users } from "lucide-react"
import { apiJson } from "@/src/lib/api"
import { toast } from "sonner"

// Types
interface CompareEntry {
  applicationId: string
  status: string
  createdAt: string
  job: { id: string; title: string }
  candidate: { id: string; fullName: string; email: string }
  skills: string[]
  yearsOfExperience: number | null
  seniority: string | null
  education: Array<{ degree?: string; institution?: string; year?: string }>
  professionalSummary: string
  matchScore: number | null
}

const STATUS_LABEL: Record<string, string> = {
  APPLIED: "قيد المراجعة",
  SHORTLISTED: "مقبول مبدئيًا",
  REJECTED: "مرفوض",
  HIRED: "مقبول",
}

const SENIORITY_LABEL: Record<string, string> = {
  junior: "مبتدئ",
  mid: "متوسط",
  senior: "خبير",
}

function CompareContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [data, setData] = useState<CompareEntry[]>([])
  const [loading, setLoading] = useState(true)

  const ids = searchParams.get("ids") ?? ""

  useEffect(() => {
    if (!ids) {
      router.replace("/hr/applicants")
      return
    }
    setLoading(true)
    apiJson<CompareEntry[]>(`/v1/hr/compare?ids=${ids}`)
      .then(setData)
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "فشل تحميل بيانات المقارنة")
        router.replace("/hr/applicants")
      })
      .finally(() => setLoading(false))
  }, [ids, router])

  const handleSelect = async (applicationId: string) => {
    try {
      await apiJson(`/v1/applications/${applicationId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "SHORTLISTED" }),
      })
      toast.success("تم اختيار المرشح وقبوله مبدئيًا")
      router.replace("/hr/applicants")
    } catch {
      toast.error("فشل تحديث حالة الطلب")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowRight className="ml-1 h-4 w-4" />
          رجوع
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            مقارنة المرشحين
          </h1>
          <p className="text-muted-foreground">مقارنة تفصيلية بين المرشحين المختارين</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : data.length < 2 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            لا توجد بيانات كافية للمقارنة
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <Table dir="rtl">
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="w-40 font-bold text-foreground bg-secondary/20">
                    المعيار
                  </TableHead>
                  {data.map((entry) => (
                    <TableHead key={entry.applicationId} className="text-center">
                      <div className="flex flex-col items-center gap-1 py-2">
                        <span className="font-semibold text-foreground">
                          {entry.candidate.fullName}
                        </span>
                        <span className="text-xs text-muted-foreground" dir="ltr">
                          {entry.candidate.email}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {STATUS_LABEL[entry.status] ?? entry.status}
                        </Badge>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Job */}
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground bg-secondary/10">
                    الوظيفة
                  </TableCell>
                  {data.map((e) => (
                    <TableCell key={e.applicationId} className="text-center text-sm">
                      {e.job.title}
                    </TableCell>
                  ))}
                </TableRow>
                {/* Experience */}
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground bg-secondary/10">
                    سنوات الخبرة
                  </TableCell>
                  {data.map((e) => (
                    <TableCell key={e.applicationId} className="text-center">
                      {e.yearsOfExperience != null
                        ? `${e.yearsOfExperience} سنة`
                        : "—"}
                      {e.seniority && (
                        <span className="mr-1 text-xs text-muted-foreground">
                          ({SENIORITY_LABEL[e.seniority] ?? e.seniority})
                        </span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
                {/* Skills */}
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground bg-secondary/10">
                    المهارات
                  </TableCell>
                  {data.map((e) => (
                    <TableCell key={e.applicationId} className="text-center">
                      <div className="flex flex-wrap justify-center gap-1 max-w-xs mx-auto">
                        {e.skills.slice(0, 8).map((s, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                          >
                            {s}
                          </span>
                        ))}
                        {e.skills.length > 8 && (
                          <span className="text-xs text-muted-foreground">
                            +{e.skills.length - 8}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
                {/* Education */}
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground bg-secondary/10">
                    التعليم
                  </TableCell>
                  {data.map((e) => (
                    <TableCell
                      key={e.applicationId}
                      className="text-center text-sm"
                    >
                      {e.education.length > 0
                        ? e.education.slice(0, 2).map((edu, i) => (
                            <div key={i}>
                              {edu.degree ?? "—"} — {edu.institution ?? "—"}{" "}
                              {edu.year ? `(${edu.year})` : ""}
                            </div>
                          ))
                        : "—"}
                    </TableCell>
                  ))}
                </TableRow>
                {/* Summary */}
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground bg-secondary/10">
                    الملخص
                  </TableCell>
                  {data.map((e) => (
                    <TableCell
                      key={e.applicationId}
                      className="text-xs text-muted-foreground max-w-xs"
                    >
                      {e.professionalSummary
                        ? e.professionalSummary.slice(0, 150) +
                          (e.professionalSummary.length > 150 ? "..." : "")
                        : "—"}
                    </TableCell>
                  ))}
                </TableRow>
                {/* Application Date */}
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground bg-secondary/10">
                    تاريخ التقديم
                  </TableCell>
                  {data.map((e) => (
                    <TableCell
                      key={e.applicationId}
                      className="text-center text-sm"
                    >
                      {new Date(e.createdAt).toLocaleDateString("ar-EG")}
                    </TableCell>
                  ))}
                </TableRow>
                {/* Action */}
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground bg-secondary/10">
                    الإجراء
                  </TableCell>
                  {data.map((e) => (
                    <TableCell key={e.applicationId} className="text-center">
                      <Button
                        size="sm"
                        variant={
                          e.status === "SHORTLISTED" ? "secondary" : "default"
                        }
                        disabled={
                          e.status === "HIRED" || e.status === "REJECTED"
                        }
                        onClick={() => handleSelect(e.applicationId)}
                      >
                        اختر هذا المرشح
                      </Button>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function ComparePage() {
  const allowedRoles = useMemo(() => ["hr"] as const, [])

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
        >
          <CompareContent />
        </Suspense>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

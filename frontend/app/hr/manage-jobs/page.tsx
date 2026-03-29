"use client"

import { useEffect, useState, useMemo } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Edit, Pause, Trash2, Eye } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "@/src/lib/api"
import { getHrJobs } from "@/src/services/jobs.service"

type HRJob = {
  id: string
  title: string
  location: string
  type: string
  experience: string
  applicants: number
  isActive: boolean
  postedAt: string
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

export default function ManageJobsPage() {
  const [hrJobs, setHrJobs] = useState<HRJob[]>([])
  const router = useRouter()

  useEffect(() => {
    getHrJobs({ limit: 100, includeInactive: true })
      .then((jobs) => {
        setHrJobs(
          jobs.map(
            (job): HRJob => ({
              id: job.id,
              title: job.title,
              location: "غير محدد",
              type: (job.category as string) || "غير محدد",
              experience: "غير محدد",
              applicants: job._count?.applications ?? 0,
              isActive: job.isActive ?? true,
              postedAt: formatDate(job.createdAt),
            }),
          ),
        )
      })
      .catch(() => {
        // ignore network errors silently
      })
  }, [])

  const handleDelete = async (jobId: string) => {
    const confirmed = window.confirm("هل أنت متأكد من حذف هذه الوظيفة؟")
    if (!confirmed) return

    try {
      const res = await api(`/v1/jobs/${jobId}`, {
        method: "DELETE",
      })

      if (res.status === 401) {
        router.push("/login")
        return
      }
      if (!res.ok) return

      setHrJobs((prev) => prev.filter((job) => job.id !== jobId))
    } catch {
      // ignore
    }
  }

  const allowedRoles = useMemo(() => ["hr"] as const, [])

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">إدارة الوظائف</h1>
              <p className="text-muted-foreground">{hrJobs.length} وظيفة منشورة</p>
            </div>
            <Button asChild>
              <Link href="/hr/create-job">نشر وظيفة جديدة</Link>
            </Button>
          </div>

          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-start">الوظيفة</TableHead>
                    <TableHead className="text-start">النوع</TableHead>
                    <TableHead className="text-start">الخبرة</TableHead>
                    <TableHead className="text-start">المتقدمون</TableHead>
                    <TableHead className="text-start">الحالة</TableHead>
                    <TableHead className="text-start">تاريخ النشر</TableHead>
                    <TableHead className="text-start">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hrJobs.map((job) => (
                    <TableRow key={job.id} className="border-border">
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{job.title}</p>
                          <p className="text-xs text-muted-foreground">{job.location}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="border-border">{job.type}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{job.experience}</TableCell>
                      <TableCell className="text-foreground font-medium">{job.applicants}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={job.isActive ? "border-chart-3/20 text-chart-3" : "border-destructive/20 text-destructive"}>
                          {job.isActive ? "نشطة" : "متوقفة"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{job.postedAt}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem><Eye className="ml-2 h-4 w-4" /> عرض</DropdownMenuItem>
                            <DropdownMenuItem><Edit className="ml-2 h-4 w-4" /> تعديل</DropdownMenuItem>
                            <DropdownMenuItem><Pause className="ml-2 h-4 w-4" /> إيقاف</DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(job.id)}
                            >
                              <Trash2 className="ml-2 h-4 w-4" /> حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

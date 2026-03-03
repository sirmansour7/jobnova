"use client"

import { useEffect, useState } from "react"
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

const API_URL = process.env.NEXT_PUBLIC_API_URL

function getAuthToken(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/jobnova_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

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
    const fetchJobs = async () => {
      const token = getAuthToken()
      if (!token) {
        router.push("/login")
        return
      }
      if (!API_URL) return

      try {
        const headers: HeadersInit = {
          Authorization: `Bearer ${token}`,
        }

        const orgRes = await fetch(`${API_URL}/v1/orgs/my`, {
          headers,
        })

        if (orgRes.status === 401) {
          router.push("/login")
          return
        }
        if (!orgRes.ok) return

        const orgs = await orgRes.json()
        const firstOrg = Array.isArray(orgs) && orgs.length > 0 ? orgs[0] : null
        const orgId =
          firstOrg?.organization?.id ?? firstOrg?.organizationId ?? firstOrg?.id

        if (!orgId) return

        const jobsRes = await fetch(`${API_URL}/v1/jobs`, {
          headers,
        })

        if (jobsRes.status === 401) {
          router.push("/login")
          return
        }
        if (!jobsRes.ok) return

        const jobsData = await jobsRes.json()
        const orgJobs = Array.isArray(jobsData)
          ? jobsData.filter((job: any) => job.organization?.id === orgId)
          : []

        setHrJobs(
          orgJobs.map(
            (job: any): HRJob => ({
              id: job.id,
              title: job.title,
              location:
                [job.governorate, job.city].filter(Boolean).join(" - ") ||
                "غير محدد",
              type: job.category || "غير محدد",
              experience: "غير محدد",
              applicants: job._count?.applications ?? 0,
              isActive: job.isActive ?? true,
              postedAt: formatDate(job.createdAt),
            }),
          ),
        )
      } catch {
        // ignore
      }
    }

    fetchJobs()
  }, [router])

  const handleDelete = async (jobId: string) => {
    const token = getAuthToken()
    if (!token) {
      router.push("/login")
      return
    }
    if (!API_URL) return

    const confirmed = window.confirm("هل أنت متأكد من حذف هذه الوظيفة؟")
    if (!confirmed) return

    try {
      const res = await fetch(`${API_URL}/v1/jobs/${jobId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  return (
    <ProtectedRoute allowedRoles={["hr"]}>
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

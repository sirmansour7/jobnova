"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Briefcase, Users, FileText, TrendingUp } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL

function getAuthToken(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/jobnova_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

type DashboardJob = {
  id: string
  title: string
  applicants: number
  type: string
  isActive: boolean
}

type DashboardApplicant = {
  id: string
  name: string
  job: string
  status: string
  avatar: string
}

const statusColors: Record<string, string> = {
  "قيد المراجعة": "bg-chart-4/10 text-chart-4 border-chart-4/20",
  "مقبول مبدئيًا": "bg-chart-2/10 text-chart-2 border-chart-2/20",
  "مقابلة": "bg-primary/10 text-primary border-primary/20",
  "مرفوض": "bg-destructive/10 text-destructive border-destructive/20",
  "مقبول": "bg-chart-3/10 text-chart-3 border-chart-3/20",
}

const statusLabelByEnum: Record<string, string> = {
  APPLIED: "قيد المراجعة",
  SHORTLISTED: "مقبول مبدئيًا",
  REJECTED: "مرفوض",
  HIRED: "مقبول",
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function HRDashboard() {
  const [hrJobs, setHrJobs] = useState<DashboardJob[]>([])
  const [recentApplicants, setRecentApplicants] = useState<DashboardApplicant[]>([])
  const [orgName, setOrgName] = useState<string | null>(null)
  const [jobsCount, setJobsCount] = useState(0)
  const [totalApplicants, setTotalApplicants] = useState(0)
  const [interviewsThisWeek, setInterviewsThisWeek] = useState(0)
  const [acceptanceRate, setAcceptanceRate] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!API_URL) return

      const token = getAuthToken()
      if (!token) {
        router.push("/login")
        return
      }

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
        const organization =
          firstOrg?.organization ?? firstOrg ?? null

        if (organization?.name) setOrgName(organization.name as string)
        const orgId = organization?.id as string | undefined
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

        const mappedJobs: DashboardJob[] = orgJobs.map((job: any) => ({
          id: job.id as string,
          title: job.title as string,
          applicants: job._count?.applications ?? 0,
          type: job.category || "غير محدد",
          isActive: job.isActive ?? true,
        }))

        setHrJobs(mappedJobs)
        setJobsCount(mappedJobs.length)

        let applicationsTotalFromCounts = orgJobs.reduce(
          (sum: number, j: any) => sum + (j._count?.applications ?? 0),
          0,
        )

        let applicationsTotalFromApps = 0
        let shortlistedThisWeek = 0
        let hiredCount = 0
        const collectedApplicants: DashboardApplicant[] = []

        for (const job of orgJobs) {
          const appsRes = await fetch(`${API_URL}/v1/applications/job/${job.id}`, {
            headers,
          })

          if (appsRes.status === 401) {
            router.push("/login")
            return
          }
          if (!appsRes.ok) continue

          const apps = await appsRes.json()
          if (!Array.isArray(apps)) continue

          applicationsTotalFromApps += apps.length

          for (const app of apps) {
            const statusEnum: string = app.status ?? "APPLIED"
            const createdAt: string | Date | undefined = app.createdAt
            const createdDate =
              typeof createdAt === "string" ? new Date(createdAt) : createdAt

            if (createdDate instanceof Date && !Number.isNaN(createdDate.getTime())) {
              const now = new Date()
              const diffMs = now.getTime() - createdDate.getTime()
              const diffDays = diffMs / (1000 * 60 * 60 * 24)
              if (diffDays <= 7 && statusEnum === "SHORTLISTED") {
                shortlistedThisWeek += 1
              }
            }

            if (statusEnum === "HIRED") {
              hiredCount += 1
            }

            collectedApplicants.push({
              id: app.id as string,
              name: app.candidate?.fullName ?? "مرشح",
              job: job.title as string,
              status: statusLabelByEnum[statusEnum] ?? "قيد المراجعة",
              avatar: getInitials(app.candidate?.fullName ?? "مرشح"),
            })
          }
        }

        const totalApps =
          applicationsTotalFromCounts || applicationsTotalFromApps

        setTotalApplicants(totalApps)
        setInterviewsThisWeek(shortlistedThisWeek)

        const rate =
          totalApps > 0 ? Math.round((hiredCount / totalApps) * 100) : 0
        setAcceptanceRate(rate)

        collectedApplicants.sort((a, b) =>
          a.name.localeCompare(b.name, "ar"),
        )
        setRecentApplicants(collectedApplicants.slice(0, 4))
      } catch {
        // ignore
      }
    }

    fetchDashboardData()
  }, [router])

  const statCards = [
    {
      label: "الوظائف المنشورة",
      value: String(jobsCount),
      icon: <Briefcase className="h-5 w-5" />,
      color: "text-primary",
    },
    {
      label: "إجمالي المتقدمين",
      value: String(totalApplicants),
      icon: <Users className="h-5 w-5" />,
      color: "text-chart-3",
    },
    {
      label: "المقابلات هذا الأسبوع",
      value: String(interviewsThisWeek),
      icon: <FileText className="h-5 w-5" />,
      color: "text-chart-2",
    },
    {
      label: "معدل القبول",
      value: `${acceptanceRate}%`,
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-chart-4",
    },
  ]

  return (
    <ProtectedRoute allowedRoles={["hr"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">لوحة تحكم التوظيف</h1>
            <p className="text-muted-foreground">
              مرحبًا، سارة. إليك ملخص نشاطات التوظيف{orgName ? ` في ${orgName}` : ""}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card key={stat.label} className="border-border bg-card">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-secondary ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Active Jobs */}
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground">الوظائف النشطة</CardTitle>
                <Link href="/hr/manage-jobs" className="text-sm text-primary hover:underline">عرض الكل</Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {hrJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{job.title}</p>
                      <p className="text-xs text-muted-foreground">{job.applicants} متقدم - {job.type}</p>
                    </div>
                    <Badge variant="outline" className={job.isActive ? "border-chart-3/20 text-chart-3" : "border-destructive/20 text-destructive"}>
                      {job.isActive ? "نشطة" : "متوقفة"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Applicants */}
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground">آخر المتقدمين</CardTitle>
                <Link href="/hr/applicants" className="text-sm text-primary hover:underline">عرض الكل</Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentApplicants.map((applicant, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {applicant.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{applicant.name}</p>
                        <p className="text-xs text-muted-foreground">{applicant.job}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={statusColors[applicant.status]}>{applicant.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

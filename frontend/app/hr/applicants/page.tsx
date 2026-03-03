"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Mail, Eye } from "lucide-react"
import { useRouter } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL

function getAuthToken(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/jobnova_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

type ApplicantRow = {
  id: string
  name: string
  email: string
  avatar: string
  job: string
  status: string
  appliedAt: string
  experience: string
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

const statusEnumByLabel: Record<string, string> = {
  "قيد المراجعة": "APPLIED",
  "مقبول مبدئيًا": "SHORTLISTED",
  "مقابلة": "SHORTLISTED",
  "مرفوض": "REJECTED",
  "مقبول": "HIRED",
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

export default function ApplicantsPage() {
  const [allApplicants, setAllApplicants] = useState<ApplicantRow[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const router = useRouter()

  useEffect(() => {
    const fetchApplicants = async () => {
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

        const collected: ApplicantRow[] = []

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

          for (const app of apps) {
            const candidate = app.candidate ?? {}
            const name: string = candidate.fullName ?? "مرشح"
            const email: string = candidate.email ?? ""
            const statusEnum: string = app.status ?? "APPLIED"

            collected.push({
              id: app.id as string,
              name,
              email,
              avatar: getInitials(name),
              job: job.title as string,
              status: statusLabelByEnum[statusEnum] ?? "قيد المراجعة",
              appliedAt: formatDate(app.createdAt),
              experience: "",
            })
          }
        }

        setAllApplicants(collected)
      } catch {
        // ignore
      }
    }

    fetchApplicants()
  }, [router])

  const handleStatusChange = async (applicationId: string, currentLabel: string) => {
    if (!API_URL) return

    const token = getAuthToken()
    if (!token) {
      router.push("/login")
      return
    }

    const currentEnum = statusEnumByLabel[currentLabel] ?? "APPLIED"
    const input = window.prompt(
      "أدخل الحالة الجديدة (APPLIED, SHORTLISTED, REJECTED, HIRED):",
      currentEnum,
    )
    if (!input) return

    const next = input.toUpperCase().trim()
    if (!["APPLIED", "SHORTLISTED", "REJECTED", "HIRED"].includes(next)) return

    try {
      const res = await fetch(`${API_URL}/v1/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: next }),
      })

      if (res.status === 401) {
        router.push("/login")
        return
      }
      if (!res.ok) return

      const updated = await res.json()
      const newLabel =
        statusLabelByEnum[updated.status as string] ?? currentLabel

      setAllApplicants((prev) =>
        prev.map((a) =>
          a.id === applicationId ? { ...a, status: newLabel } : a,
        ),
      )
    } catch {
      // ignore
    }
  }

  const filtered = allApplicants.filter((a) => {
    const matchSearch = search === "" || a.name.includes(search) || a.email.includes(search)
    const matchStatus = statusFilter === "all" || a.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <ProtectedRoute allowedRoles={["hr"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">المتقدمون</h1>
            <p className="text-muted-foreground">إدارة ومراجعة طلبات المرشحين</p>
          </div>

          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="ابحث بالاسم أو البريد..." value={search} onChange={(e) => setSearch(e.target.value)} className="pe-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="الحالة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="قيد المراجعة">قيد المراجعة</SelectItem>
                    <SelectItem value="مقبول مبدئيًا">مقبول مبدئيًا</SelectItem>
                    <SelectItem value="مقابلة">مقابلة</SelectItem>
                    <SelectItem value="مرفوض">مرفوض</SelectItem>
                    <SelectItem value="مقبول">مقبول</SelectItem>
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
                    <TableHead className="text-start">الخبرة</TableHead>
                    <TableHead className="text-start">الحالة</TableHead>
                    <TableHead className="text-start">تاريخ التقديم</TableHead>
                    <TableHead className="text-start">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((applicant) => (
                    <TableRow key={applicant.id} className="border-border">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">{applicant.avatar}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{applicant.name}</p>
                            <p className="text-xs text-muted-foreground" dir="ltr">{applicant.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{applicant.job}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{applicant.experience}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusColors[applicant.status]}
                          onClick={() => handleStatusChange(applicant.id, applicant.status)}
                        >
                          {applicant.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{applicant.appliedAt}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon"><Mail className="h-4 w-4" /></Button>
                        </div>
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

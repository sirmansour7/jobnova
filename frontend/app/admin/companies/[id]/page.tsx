"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowRight, Building2, MapPin, Users, Briefcase, Globe, Calendar } from "lucide-react"
import { apiJson } from "@/src/lib/api"

interface OrgDetail {
  id: string
  name: string
  slug: string
  description?: string
  industry?: string
  location?: string
  size?: string
  website?: string
  createdAt: string
  _count: { jobs: number; memberships: number }
}

interface OrgJob {
  id: string
  title: string
  category?: string
  jobType?: string
  isActive: boolean
  createdAt: string
  organization?: { id: string }
  _count?: { applications: number }
}

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [org, setOrg] = useState<OrgDetail | null>(null)
  const [jobs, setJobs] = useState<OrgJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    async function load() {
      setLoading(true)
      try {
        const [orgData, jobsData] = await Promise.all([
          apiJson<OrgDetail>(`/v1/admin/orgs/${id}`),
          apiJson<{ items: OrgJob[] }>(`/v1/admin/jobs?limit=100`),
        ])
        setOrg(orgData)
        setJobs((jobsData.items ?? []).filter((j: OrgJob) => j.organization?.id === id))
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  function formatDate(iso: string) {
    try { return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) }
    catch { return iso }
  }

  const allowedRoles = useMemo(() => ["admin"] as const, [])

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={allowedRoles}>
        <DashboardLayout>
          <div className="flex items-center justify-center py-20 text-muted-foreground">جاري التحميل...</div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (!org) {
    return (
      <ProtectedRoute allowedRoles={allowedRoles}>
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
            <p>لم يتم العثور على الشركة</p>
            <Button variant="outline" onClick={() => router.push("/admin/companies")}>العودة</Button>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/admin/companies")}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                  {org.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
                <p className="text-muted-foreground font-mono text-sm" dir="ltr">{org.slug}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Briefcase, label: "الوظائف", value: org._count.jobs },
              { icon: Users, label: "الأعضاء", value: org._count.memberships },
            ].map(({ icon: Icon, label, value }) => (
              <Card key={label} className="border-border bg-card">
                <CardContent className="flex items-center gap-3 p-4">
                  <Icon className="h-8 w-8 text-primary/60" />
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="border-border bg-card">
              <CardContent className="flex items-center gap-3 p-4">
                <Building2 className="h-8 w-8 text-primary/60" />
                <div>
                  <p className="text-sm text-muted-foreground">القطاع</p>
                  <p className="text-sm font-semibold text-foreground">{org.industry ?? "—"}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="flex items-center gap-3 p-4">
                <Calendar className="h-8 w-8 text-primary/60" />
                <div>
                  <p className="text-sm text-muted-foreground">تأسست</p>
                  <p className="text-sm font-semibold text-foreground">{formatDate(org.createdAt)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-base">معلومات الشركة</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {org.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">الوصف</p>
                    <p className="text-sm text-foreground">{org.description}</p>
                  </div>
                )}
                {org.location && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {org.location}
                  </div>
                )}
                {org.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" dir="ltr">
                      {org.website}
                    </a>
                  </div>
                )}
                {org.size && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">حجم الشركة</p>
                    <Badge variant="outline">{org.size} موظف</Badge>
                  </div>
                )}
                {!org.description && !org.location && !org.website && !org.size && (
                  <p className="text-sm text-muted-foreground">لا توجد معلومات إضافية</p>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">وظائف الشركة ({jobs.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-start">الوظيفة</TableHead>
                        <TableHead className="text-start">التخصص</TableHead>
                        <TableHead className="text-start">المتقدمون</TableHead>
                        <TableHead className="text-start">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">لا توجد وظائف</TableCell>
                        </TableRow>
                      ) : (
                        jobs.map((job) => (
                          <TableRow key={job.id} className="border-border">
                            <TableCell className="font-medium text-foreground">{job.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{job.category ?? "—"}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-foreground">{job._count?.applications ?? 0}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={job.isActive ? "border-green-500/30 text-green-500 text-xs" : "border-destructive/30 text-destructive text-xs"}>
                                {job.isActive ? "نشطة" : "متوقفة"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

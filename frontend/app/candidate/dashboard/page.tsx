"use client"

import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Briefcase, FileText, MessageSquare, Eye } from "lucide-react"
import { applications } from "@/src/data/applications"
import { jobs } from "@/src/data/jobs"
import Link from "next/link"

const statCards = [
  { label: "الطلبات المرسلة", value: "4", icon: <FileText className="h-5 w-5" />, color: "text-primary" },
  { label: "المقابلات", value: "1", icon: <MessageSquare className="h-5 w-5" />, color: "text-chart-3" },
  { label: "الوظائف المحفوظة", value: "7", icon: <Briefcase className="h-5 w-5" />, color: "text-chart-2" },
  { label: "مرات الاطلاع", value: "23", icon: <Eye className="h-5 w-5" />, color: "text-chart-4" },
]

const statusColors: Record<string, string> = {
  "قيد المراجعة": "bg-chart-4/10 text-chart-4 border-chart-4/20",
  "مقبول مبدئيًا": "bg-chart-2/10 text-chart-2 border-chart-2/20",
  "مقابلة": "bg-primary/10 text-primary border-primary/20",
  "مرفوض": "bg-destructive/10 text-destructive border-destructive/20",
  "مقبول": "bg-chart-3/10 text-chart-3 border-chart-3/20",
}

export default function CandidateDashboard() {
  const recentJobs = jobs.slice(0, 3)

  return (
    <ProtectedRoute allowedRoles={["candidate"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">مرحبًا، أحمد</h1>
            <p className="text-muted-foreground">إليك ملخص نشاطك على JobNova</p>
          </div>

          {/* Stats */}
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
            {/* Recent Applications */}
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground">آخر الطلبات</CardTitle>
                <Link href="/candidate/applications" className="text-sm text-primary hover:underline">عرض الكل</Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {applications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {app.companyLogo}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{app.jobTitle}</p>
                        <p className="text-xs text-muted-foreground">{app.companyName}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={statusColors[app.status]}>
                      {app.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recommended Jobs */}
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground">وظائف مقترحة</CardTitle>
                <Link href="/jobs" className="text-sm text-primary hover:underline">عرض الكل</Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentJobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="block rounded-lg border border-border bg-secondary/30 p-3 transition-colors hover:border-primary/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                          {job.companyLogo}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{job.title}</p>
                          <p className="text-xs text-muted-foreground">{job.companyName} - {job.location}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-primary/20 text-primary">{job.type}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{job.salaryMin.toLocaleString()} - {job.salaryMax.toLocaleString()} {job.currency}</span>
                      <span>{job.experience}</span>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

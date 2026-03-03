"use client"

import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { applications, applicationStatuses } from "@/src/data/applications"
import Link from "next/link"

const statusColors: Record<string, string> = {
  "قيد المراجعة": "bg-chart-4/10 text-chart-4 border-chart-4/20",
  "مقبول مبدئيًا": "bg-chart-2/10 text-chart-2 border-chart-2/20",
  "مقابلة": "bg-primary/10 text-primary border-primary/20",
  "مرفوض": "bg-destructive/10 text-destructive border-destructive/20",
  "مقبول": "bg-chart-3/10 text-chart-3 border-chart-3/20",
}

export default function ApplicationsPage() {
  return (
    <ProtectedRoute allowedRoles={["candidate"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">طلباتي</h1>
            <p className="text-muted-foreground">تتبع حالة طلباتك الوظيفية</p>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="all">الكل ({applications.length})</TabsTrigger>
              {applicationStatuses.map((status) => (
                <TabsTrigger key={status} value={status}>
                  {status} ({applications.filter((a) => a.status === status).length})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="mt-4 space-y-3">
              {applications.map((app) => (
                <ApplicationCard key={app.id} app={app} />
              ))}
            </TabsContent>

            {applicationStatuses.map((status) => (
              <TabsContent key={status} value={status} className="mt-4 space-y-3">
                {applications.filter((a) => a.status === status).length === 0 ? (
                  <Card className="border-border bg-card">
                    <CardContent className="flex flex-col items-center py-12">
                      <p className="text-muted-foreground">لا توجد طلبات بهذه الحالة</p>
                    </CardContent>
                  </Card>
                ) : (
                  applications.filter((a) => a.status === status).map((app) => (
                    <ApplicationCard key={app.id} app={app} />
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

function ApplicationCard({ app }: { app: typeof applications[0] }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
              {app.companyLogo}
            </div>
            <div>
              <Link href={`/jobs/${app.jobId}`} className="font-medium text-foreground hover:text-primary">
                {app.jobTitle}
              </Link>
              <p className="text-sm text-muted-foreground">{app.companyName}</p>
              <p className="text-xs text-muted-foreground">تقدمت في {app.appliedAt}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={statusColors[app.status]}>{app.status}</Badge>
          </div>
        </div>
        {app.notes && (
          <p className="mt-3 rounded-lg bg-secondary/50 p-2 text-sm text-muted-foreground">{app.notes}</p>
        )}
      </CardContent>
    </Card>
  )
}

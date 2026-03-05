"use client"

import { useMemo } from "react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMyApplications } from "@/src/hooks/useMyApplications"
import { STATUS_LABEL, ALL_STATUS_LABELS } from "@/src/services/applications.service"
import type { MyApplication } from "@/src/services/applications.service"
import Link from "next/link"

const statusColors: Record<string, string> = {
  "قيد المراجعة": "bg-chart-4/10 text-chart-4 border-chart-4/20",
  "مقبول مبدئيًا": "bg-chart-2/10 text-chart-2 border-chart-2/20",
  "مقابلة": "bg-primary/10 text-primary border-primary/20",
  "مرفوض": "bg-destructive/10 text-destructive border-destructive/20",
  "مقبول": "bg-chart-3/10 text-chart-3 border-chart-3/20",
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })
  } catch {
    return iso
  }
}

export default function ApplicationsPage() {
  const { applications, loading, error } = useMyApplications()

  const applicationStatuses = ALL_STATUS_LABELS

  const allowedRoles = useMemo(() => ["candidate"] as const, [])

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">طلباتي</h1>
            <p className="text-muted-foreground">تتبع حالة طلباتك الوظيفية</p>
          </div>

          {loading ? (
            <p className="text-muted-foreground">جاري التحميل...</p>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="all">الكل ({applications.length})</TabsTrigger>
              {applicationStatuses.map((status) => (
                <TabsTrigger key={status} value={status}>
                  {status} ({applications.filter((a) => STATUS_LABEL[a.status] === status).length})
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
                {applications.filter((a) => STATUS_LABEL[a.status] === status).length === 0 ? (
                  <Card className="border-border bg-card">
                    <CardContent className="flex flex-col items-center py-12">
                      <p className="text-muted-foreground">لا توجد طلبات بهذه الحالة</p>
                    </CardContent>
                  </Card>
                ) : (
                  applications.filter((a) => STATUS_LABEL[a.status] === status).map((app) => (
                    <ApplicationCard key={app.id} app={app} />
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

function ApplicationCard({ app }: { app: MyApplication }) {
  const companyName = app.job.organization?.name ?? app.job.partnerName ?? "—"
  const companyLogo = companyName.slice(0, 2).toUpperCase()
  const statusLabel = STATUS_LABEL[app.status]
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
              {companyLogo}
            </div>
            <div>
              <Link href={`/jobs/${app.job.id}`} className="font-medium text-foreground hover:text-primary">
                {app.job.title}
              </Link>
              <p className="text-sm text-muted-foreground">{companyName}</p>
              <p className="text-xs text-muted-foreground">تقدمت في {formatDate(app.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {app.status !== "REJECTED" && (
              <Link
                href={`/candidate/interview/${app.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <span>🎯</span> ابدأ المقابلة السريعة
              </Link>
            )}
            <Badge variant="outline" className={statusColors[statusLabel] ?? ""}>{statusLabel}</Badge>
          </div>
        </div>
        {app.notes && (
          <p className="mt-3 rounded-lg bg-secondary/50 p-2 text-sm text-muted-foreground">{app.notes}</p>
        )}
      </CardContent>
    </Card>
  )
}

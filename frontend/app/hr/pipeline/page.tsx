"use client"

import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

const stages = [
  {
    name: "قيد المراجعة",
    color: "border-chart-4",
    candidates: [
      { name: "فاطمة حسن", job: "متدرب تسويق رقمي", avatar: "FH" },
      { name: "كريم وليد", job: "متدرب تسويق رقمي", avatar: "KW" },
    ],
  },
  {
    name: "مقبول مبدئيًا",
    color: "border-chart-2",
    candidates: [
      { name: "محمود علي", job: "مطور واجهات أمامية", avatar: "MA" },
    ],
  },
  {
    name: "مقابلة",
    color: "border-primary",
    candidates: [
      { name: "أحمد محمد", job: "مطور واجهات أمامية", avatar: "AM" },
      { name: "سلمى إبراهيم", job: "مطور واجهات أمامية", avatar: "SI" },
    ],
  },
  {
    name: "مقبول",
    color: "border-chart-3",
    candidates: [],
  },
  {
    name: "مرفوض",
    color: "border-destructive",
    candidates: [
      { name: "نور الدين أحمد", job: "متدرب تسويق رقمي", avatar: "ND" },
    ],
  },
]

export default function PipelinePage() {
  return (
    <ProtectedRoute allowedRoles={["hr"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">مراحل التوظيف</h1>
            <p className="text-muted-foreground">تتبع المرشحين عبر مراحل التوظيف المختلفة</p>
          </div>

          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4" style={{ minWidth: "900px" }}>
              {stages.map((stage) => (
                <div key={stage.name} className="w-64 shrink-0">
                  <Card className={`border-border bg-card border-t-2 ${stage.color}`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-sm text-foreground">
                        {stage.name}
                        <Badge variant="secondary" className="text-xs">{stage.candidates.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {stage.candidates.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                          لا يوجد مرشحون
                        </div>
                      ) : (
                        stage.candidates.map((candidate, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">{candidate.avatar}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{candidate.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{candidate.job}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

"use client"

import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2 } from "lucide-react"
import { jobTypes, experienceLevels, jobCategories } from "@/src/data/jobs"
import { governorates } from "@/src/data/governorates"
import { useState } from "react"
import { useRouter } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL

function getAuthToken(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/jobnova_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export default function CreateJobPage() {
  const [skills, setSkills] = useState<string[]>([])
  const [newSkill, setNewSkill] = useState("")
  const [requirements, setRequirements] = useState<string[]>([])
  const [newReq, setNewReq] = useState("")
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [governorateValue, setGovernorateValue] = useState("")
  const [city] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const router = useRouter()

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()])
      setNewSkill("")
    }
  }

  const addReq = () => {
    if (newReq.trim()) {
      setRequirements([...requirements, newReq.trim()])
      setNewReq("")
    }
  }

  const handlePublish = async () => {
    if (!API_URL) return

    const token = getAuthToken()
    if (!token) {
      router.push("/login")
      return
    }

    if (!title.trim()) return

    setIsSubmitting(true)
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

      if (!organization?.id) return

      const body = {
        organizationId: organization.id as string,
        title: title.trim(),
        partnerName: organization.name as string,
        description: description.trim() || undefined,
        governorate: governorateValue || undefined,
        city: city || undefined,
        category: category || undefined,
      }

      const res = await fetch(`${API_URL}/v1/jobs`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (res.status === 401) {
        router.push("/login")
        return
      }
      if (!res.ok) return

      router.push("/hr/manage-jobs")
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={["hr"]}>
      <DashboardLayout>
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">نشر وظيفة جديدة</h1>
            <p className="text-muted-foreground">أنشئ إعلان وظيفي جديد لجذب أفضل المرشحين</p>
          </div>

          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-foreground">تفاصيل الوظيفة</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>عنوان الوظيفة</Label>
                <Input
                  placeholder="مثال: مطور واجهات أمامية"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>التخصص</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="اختر التخصص" /></SelectTrigger>
                    <SelectContent>
                      {jobCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>نوع العمل</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="اختر نوع العمل" /></SelectTrigger>
                    <SelectContent>
                      {jobTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>مستوى الخبرة</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="اختر المستوى" /></SelectTrigger>
                    <SelectContent>
                      {experienceLevels.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>المحافظة</Label>
                  <Select
                    value={governorateValue}
                    onValueChange={setGovernorateValue}
                  >
                    <SelectTrigger><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                    <SelectContent>
                      {governorates.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>الحد الأدنى للراتب (جنيه مصري)</Label>
                  <Input type="number" placeholder="مثال: 10000" dir="ltr" className="text-left" />
                </div>
                <div className="space-y-2">
                  <Label>الحد الأقصى للراتب (جنيه مصري)</Label>
                  <Input type="number" placeholder="مثال: 18000" dir="ltr" className="text-left" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>وصف الوظيفة</Label>
                <Textarea
                  placeholder="اكتب وصفًا تفصيليًا للوظيفة..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>آخر موعد للتقديم</Label>
                <Input type="date" dir="ltr" className="text-left" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-foreground">المتطلبات</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {requirements.length > 0 && (
                <ul className="space-y-2">
                  {requirements.map((req, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm text-foreground">
                      {req}
                      <button onClick={() => setRequirements(requirements.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Input placeholder="أضف متطلب..." value={newReq} onChange={(e) => setNewReq(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addReq())} />
                <Button variant="outline" size="icon" onClick={addReq}><Plus className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-foreground">المهارات المطلوبة</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1 py-1">
                      {skill}
                      <button onClick={() => setSkills(skills.filter((s) => s !== skill))} className="mr-1 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input placeholder="أضف مهارة..." value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())} />
                <Button variant="outline" size="icon" onClick={addSkill}><Plus className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline">حفظ كمسودة</Button>
            <Button onClick={handlePublish} disabled={isSubmitting}>نشر الوظيفة</Button>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

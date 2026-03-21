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
import { Plus, Trash2, Loader2 } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { api, apiJson } from "@/src/lib/api"
import { toast } from "sonner"

// ── Enum-mapped option lists ─────────────────────────────────────────────────
// Values MUST match Prisma JobType enum exactly so ValidationPipe passes.
const JOB_TYPES: { value: string; label: string }[] = [
  { value: "FULL_TIME",        label: "دوام كامل" },
  { value: "PART_TIME",        label: "دوام جزئي" },
  { value: "INTERNSHIP",       label: "تدريب" },
  { value: "FREELANCE",        label: "عمل حر" },
  { value: "REMOTE",           label: "عن بعد" },
  { value: "CONTRACT",         label: "عقد / مشروع" },
]

// Values MUST match Prisma JobCategory enum exactly.
const JOB_CATEGORIES: { value: string; label: string }[] = [
  { value: "TECHNOLOGY",       label: "تكنولوجيا المعلومات" },
  { value: "FINANCE",          label: "المالية والمحاسبة" },
  { value: "MARKETING",        label: "التسويق" },
  { value: "SALES",            label: "المبيعات" },
  { value: "HR",               label: "الموارد البشرية" },
  { value: "ENGINEERING",      label: "الهندسة" },
  { value: "CUSTOMER_SERVICE", label: "خدمة العملاء" },
  { value: "HEALTHCARE",       label: "الصحة والطب" },
  { value: "EDUCATION",        label: "التعليم" },
  { value: "LEGAL",            label: "القانون" },
  { value: "OPERATIONS",       label: "الإدارة والعمليات" },
  { value: "DESIGN",           label: "التصميم" },
  { value: "OTHER",            label: "أخرى" },
]

const EXPERIENCE_LEVELS: { value: number; label: string }[] = [
  { value: 0, label: "حديث تخرج" },
  { value: 1, label: "1-3 سنوات" },
  { value: 3, label: "3-5 سنوات" },
  { value: 5, label: "5+ سنوات" },
]

export default function CreateJobPage() {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [title,            setTitle]            = useState("")
  const [category,         setCategory]         = useState("")
  const [jobType,          setJobType]          = useState("")
  const [minExperience,    setMinExperience]    = useState<string>("")
  const [governorateValue, setGovernorateValue] = useState("")   // stores name
  const [description,      setDescription]      = useState("")
  const [salaryMin,        setSalaryMin]        = useState("")   // Bug 4 fixed: wired
  const [salaryMax,        setSalaryMax]        = useState("")   // Bug 4 fixed: wired
  const [currency,         setCurrency]         = useState("EGP")
  const [expiresAt,        setExpiresAt]        = useState("")
  const [skills,           setSkills]           = useState<string[]>([])
  const [newSkill,         setNewSkill]         = useState("")
  const [requirements,     setRequirements]     = useState<string[]>([])
  const [newReq,           setNewReq]           = useState("")

  const [governorates,     setGovernorates]     = useState<{ id: string; name: string }[]>([])
  const [isSubmitting,     setIsSubmitting]     = useState(false)
  const [isDrafting,       setIsDrafting]       = useState(false)

  const router = useRouter()

  useEffect(() => {
    apiJson<{ items: { id: string; name: string }[] }>("/v1/governorates?limit=100")
      .then((res) => setGovernorates(res.items))
      .catch(() => {})
  }, [])

  // ── Skill / requirement helpers ─────────────────────────────────────────────
  const addSkill = () => {
    const s = newSkill.trim()
    if (s && !skills.includes(s)) {
      setSkills([...skills, s])
      setNewSkill("")
    }
  }

  const addReq = () => {
    const r = newReq.trim()
    if (r) {
      setRequirements([...requirements, r])
      setNewReq("")
    }
  }

  // ── Shared submission logic ──────────────────────────────────────────────────
  const submitJob = async (isActive: boolean) => {
    if (!title.trim()) {
      toast.error("يرجى إدخال عنوان الوظيفة")
      return
    }

    const setter = isActive ? setIsSubmitting : setIsDrafting
    setter(true)

    try {
      // 1. Fetch HR's organisation
      const orgRes = await api("/v1/orgs/my")
      if (orgRes.status === 401) { router.push("/login"); return }
      if (!orgRes.ok) {
        toast.error("فشل تحميل بيانات الشركة")
        return
      }

      const orgs = await orgRes.json() as unknown[]
      const firstOrg = Array.isArray(orgs) && orgs.length > 0 ? orgs[0] : null
      const organization = (firstOrg as { organization?: { id: string; name: string }; id?: string; name?: string } | null)
        ?.organization ?? (firstOrg as { id?: string; name?: string } | null) ?? null

      if (!organization?.id) {
        toast.error("لا توجد شركة مرتبطة بهذا الحساب")
        return
      }

      // 2. Build body — Bug 5 fixed: skills included; Bug 1+2 fixed: enum values
      const body: Record<string, unknown> = {
        organizationId: organization.id,
        title:          title.trim(),
        partnerName:    organization.name ?? title.trim(),
        isActive,                                          // Bug 6+7 fixed
        ...(description.trim()   && { description:   description.trim() }),
        ...(governorateValue     && { governorate:   governorateValue }),    // Bug 3 fixed: name
        ...(category             && { category }),                           // Bug 1 fixed: enum
        ...(jobType              && { jobType }),                            // Bug 2 fixed: enum
        ...(skills.length > 0    && { skills }),                            // Bug 5 fixed
        ...(minExperience !== "" && { minExperience: parseInt(minExperience, 10) }),
        ...(salaryMin !== ""     && { salaryMin:     parseInt(salaryMin,  10) }),  // Bug 4 fixed
        ...(salaryMax !== ""     && { salaryMax:     parseInt(salaryMax,  10) }),  // Bug 4 fixed
        currency: currency || "EGP",
        ...(expiresAt            && { expiresAt }),
      }

      // 3. POST /v1/jobs
      const res = await api("/v1/jobs", {
        method: "POST",
        body:   JSON.stringify(body),
      })

      if (res.status === 401) { router.push("/login"); return }

      if (!res.ok) {
        // Surface the validation error so the user knows what went wrong
        const errBody = await res.json().catch(() => ({})) as { message?: string | string[] }
        const msg = Array.isArray(errBody.message)
          ? errBody.message[0]
          : errBody.message ?? `خطأ ${res.status}`
        toast.error(msg)
        return
      }

      toast.success(isActive ? "تم نشر الوظيفة بنجاح ✓" : "تم حفظ المسودة بنجاح ✓")
      router.push("/hr/manage-jobs")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع")
    } finally {
      setter(false)
    }
  }

  const handlePublish = () => submitJob(true)   // Bug 6 fixed: dedicated handlers
  const handleDraft   = () => submitJob(false)  // Bug 6 fixed: was missing entirely

  const allowedRoles = useMemo(() => ["hr"] as const, [])

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">نشر وظيفة جديدة</h1>
            <p className="text-muted-foreground">أنشئ إعلان وظيفي جديد لجذب أفضل المرشحين</p>
          </div>

          {/* ── Job details ─────────────────────────────────────────────────── */}
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-foreground">تفاصيل الوظيفة</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>عنوان الوظيفة <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="مثال: مطور واجهات أمامية"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Category — Bug 1 fixed: sends enum value */}
                <div className="space-y-2">
                  <Label>التخصص</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="اختر التخصص" /></SelectTrigger>
                    <SelectContent>
                      {JOB_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Job type — Bug 2 fixed: sends enum value */}
                <div className="space-y-2">
                  <Label>نوع العمل</Label>
                  <Select value={jobType} onValueChange={setJobType}>
                    <SelectTrigger><SelectValue placeholder="اختر نوع العمل" /></SelectTrigger>
                    <SelectContent>
                      {JOB_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Experience */}
                <div className="space-y-2">
                  <Label>مستوى الخبرة</Label>
                  <Select
                    value={minExperience}
                    onValueChange={setMinExperience}
                  >
                    <SelectTrigger><SelectValue placeholder="اختر المستوى" /></SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_LEVELS.map((e) => (
                        <SelectItem key={e.value} value={String(e.value)}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Governorate — Bug 3 fixed: value=g.name (backend expects name) */}
                <div className="space-y-2">
                  <Label>المحافظة</Label>
                  <Select value={governorateValue} onValueChange={setGovernorateValue}>
                    <SelectTrigger><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                    <SelectContent>
                      {governorates.map((g) => (
                        <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Salary — Bug 4 fixed: wired to state with value + onChange */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>الحد الأدنى للراتب (جنيه مصري)</Label>
                  <Input
                    type="number"
                    placeholder="مثال: 10000"
                    dir="ltr"
                    className="text-left"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>الحد الأقصى للراتب (جنيه مصري)</Label>
                  <Input
                    type="number"
                    placeholder="مثال: 18000"
                    dir="ltr"
                    className="text-left"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                  />
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
                <Input
                  type="date"
                  dir="ltr"
                  className="text-left"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Requirements ───────────────────────────────────────────────── */}
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-foreground">المتطلبات</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {requirements.length > 0 && (
                <ul className="space-y-2">
                  {requirements.map((req, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm text-foreground">
                      {req}
                      <button
                        onClick={() => setRequirements(requirements.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="أضف متطلب..."
                  value={newReq}
                  onChange={(e) => setNewReq(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addReq())}
                />
                <Button variant="outline" size="icon" onClick={addReq}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Skills — Bug 5 fixed: state was not sent, now included in body */}
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-foreground">المهارات المطلوبة</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1 py-1">
                      {skill}
                      <button
                        onClick={() => setSkills(skills.filter((s) => s !== skill))}
                        className="mr-1 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="أضف مهارة..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                />
                <Button variant="outline" size="icon" onClick={addSkill}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Action buttons — Bug 6 fixed: draft handler wired ──────────── */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleDraft}
              disabled={isDrafting || isSubmitting}
            >
              {isDrafting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حفظ كمسودة
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isSubmitting || isDrafting}
            >
              {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              نشر الوظيفة
            </Button>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

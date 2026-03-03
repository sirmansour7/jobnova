"use client"

import { ProtectedRoute } from "@/components/shared/protected-route"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2 } from "lucide-react"
import { useState } from "react"

const initialSkills = ["React", "TypeScript", "Next.js", "Tailwind CSS", "Git"]
const initialExperience = [
  { title: "مطور واجهات أمامية", company: "شركة تقنية", from: "2024", to: "2026", description: "تطوير واجهات المستخدم باستخدام React و Next.js" },
]
const initialEducation = [
  { degree: "بكالوريوس هندسة حاسبات", institution: "جامعة القاهرة", year: "2024" },
]

export default function CVBuilderPage() {
  const [skills, setSkills] = useState<string[]>(initialSkills)
  const [newSkill, setNewSkill] = useState("")
  const [experience] = useState(initialExperience)
  const [education] = useState(initialEducation)

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()])
      setNewSkill("")
    }
  }

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill))
  }

  return (
    <ProtectedRoute allowedRoles={["candidate"]}>
      <DashboardLayout>
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">بناء السيرة الذاتية</h1>
            <p className="text-muted-foreground">أنشئ سيرتك الذاتية واستخدمها في التقديم على الوظائف</p>
          </div>

          {/* Personal Info */}
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-foreground">المعلومات الشخصية</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input defaultValue="أحمد محمد" />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input defaultValue="ahmed@example.com" dir="ltr" className="text-left" />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <Input defaultValue="01012345678" dir="ltr" className="text-left" />
                </div>
                <div className="space-y-2">
                  <Label>الموقع</Label>
                  <Input defaultValue="القاهرة، مصر" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>نبذة مختصرة</Label>
                <Textarea
                  defaultValue="مطور واجهات أمامية بخبرة سنتين في بناء تطبيقات الويب باستخدام React و Next.js. أبحث عن فرصة عمل في شركة تقنية رائدة."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-foreground">المهارات</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1 py-1">
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="mr-1 hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
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

          {/* Experience */}
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground">الخبرة العملية</CardTitle>
              <Button variant="outline" size="sm"><Plus className="ml-2 h-4 w-4" /> إضافة</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {experience.map((exp, i) => (
                <div key={i} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{exp.title}</p>
                      <p className="text-sm text-muted-foreground">{exp.company}</p>
                      <p className="text-xs text-muted-foreground">{exp.from} - {exp.to}</p>
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <p className="text-sm text-muted-foreground">{exp.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Education */}
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground">التعليم</CardTitle>
              <Button variant="outline" size="sm"><Plus className="ml-2 h-4 w-4" /> إضافة</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {education.map((edu, i) => (
                <div key={i} className="rounded-lg border border-border p-4">
                  <p className="font-medium text-foreground">{edu.degree}</p>
                  <p className="text-sm text-muted-foreground">{edu.institution}</p>
                  <p className="text-xs text-muted-foreground">{edu.year}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button size="lg">حفظ السيرة الذاتية</Button>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

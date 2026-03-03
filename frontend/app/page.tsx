"use client"

import Link from "next/link"
import { Logo } from "@/components/shared/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Briefcase,
  Search,
  Building2,
  Users,
  Shield,
  ArrowLeft,
  Star,
  Zap,
  Globe,
} from "lucide-react"

const features = [
  {
    icon: <Search className="h-6 w-6" />,
    title: "بحث ذكي",
    description: "ابحث في آلاف الوظائف بفلاتر متقدمة حسب المحافظة والتخصص والخبرة",
  },
  {
    icon: <Building2 className="h-6 w-6" />,
    title: "شركات موثوقة",
    description: "تقدم على وظائف في كبرى الشركات المصرية الموثوقة والمعتمدة",
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "تقديم سريع",
    description: "قدم على الوظائف بنقرة واحدة مع سيرتك الذاتية المحفوظة",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "خصوصية تامة",
    description: "بياناتك محمية بأعلى معايير الأمان والخصوصية",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "لوحة تحكم HR",
    description: "أدوات متكاملة لمسؤولي التوظيف لإدارة عمليات التوظيف بكفاءة",
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "تغطية شاملة",
    description: "وظائف في جميع محافظات مصر من الإسكندرية إلى أسوان",
  },
]

const stats = [
  { value: "12,000+", label: "وظيفة متاحة" },
  { value: "3,500+", label: "شركة مسجلة" },
  { value: "180,000+", label: "باحث عن عمل" },
  { value: "27", label: "محافظة" },
]

export default function LandingPage() {
  return (
    <div className="bg-gradient-page noise-overlay relative min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-[#0B1220]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo size="large" />
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">تسجيل الدخول</Link>
            </Button>
            <Button asChild>
              <Link href="/register">إنشاء حساب</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-hero relative overflow-hidden">
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
              <Star className="h-4 w-4" />
              <span>المنصة الأولى للتوظيف في مصر</span>
            </div>
            <h1 className="glow-blue mb-6 text-4xl font-bold leading-tight tracking-tight text-foreground lg:text-6xl text-balance">
              اعثر على وظيفة أحلامك في مصر
            </h1>
            <p className="mb-10 text-lg leading-relaxed text-muted-foreground lg:text-xl text-pretty">
              منصة JobNova تربط الباحثين عن عمل بأفضل الشركات المصرية. سجل الآن واكتشف آلاف الفرص الوظيفية في جميع المحافظات.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild className="shadow-blue-glow text-base">
                <Link href="/register">
                  ابدأ الآن مجانًا
                  <ArrowLeft className="mr-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="border-border text-base">
                <Link href="/login">
                  <Briefcase className="ml-2 h-4 w-4" />
                  أنا مسؤول توظيف
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 border-y border-border bg-card/40 backdrop-blur-sm">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-primary lg:text-4xl">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">لماذا JobNova؟</h2>
          <p className="text-muted-foreground">كل ما تحتاجه للعثور على الوظيفة المناسبة أو الموظف المثالي</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-border bg-card transition-colors hover:border-primary/30">
              <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">جاهز تبدأ رحلتك المهنية؟</h2>
          <p className="mb-8 text-muted-foreground">انضم لأكثر من 180 ألف باحث عن عمل في مصر</p>
          <Button size="lg" asChild className="shadow-blue-glow">
            <Link href="/register">سجل مجانًا الآن</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-[#080E1A]">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <Logo />
            <p className="text-sm text-muted-foreground">
              {"© 2026 JobNova. جميع الحقوق محفوظة."}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

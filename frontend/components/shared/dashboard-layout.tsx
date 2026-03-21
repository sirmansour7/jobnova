"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/src/context/auth-context"
import { Logo } from "@/components/shared/logo"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  Briefcase,
  Bookmark,
  FileText,
  MessageSquare,
  Settings,
  Building2,
  Users,
  PlusCircle,
  GitBranch,
  MapPin,
  ShieldCheck,
  LogOut,
  Menu,
  Brain,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { NotificationBell } from "@/components/shared/notification-bell"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const candidateNav: NavItem[] = [
  { label: "لوحة التحكم", href: "/candidate/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "الوظائف", href: "/jobs", icon: <Briefcase className="h-4 w-4" /> },
  { label: "الوظائف المحفوظة", href: "/candidate/saved-jobs", icon: <Bookmark className="h-4 w-4" /> },
  { label: "طلباتي", href: "/candidate/applications", icon: <FileText className="h-4 w-4" /> },
  { label: "السيرة الذاتية", href: "/candidate/cv-builder", icon: <FileText className="h-4 w-4" /> },
  { label: "ذكاء السيرة الذاتية", href: "/candidate/cv-intelligence", icon: <Brain className="h-4 w-4" /> },
  { label: "الرسائل", href: "/candidate/messages", icon: <MessageSquare className="h-4 w-4" /> },
  { label: "الإعدادات", href: "/candidate/settings", icon: <Settings className="h-4 w-4" /> },
]

const hrNav: NavItem[] = [
  { label: "لوحة التحكم", href: "/hr/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "الشركة", href: "/hr/company", icon: <Building2 className="h-4 w-4" /> },
  { label: "نشر وظيفة", href: "/hr/create-job", icon: <PlusCircle className="h-4 w-4" /> },
  { label: "إدارة الوظائف", href: "/hr/manage-jobs", icon: <Briefcase className="h-4 w-4" /> },
  { label: "المتقدمون", href: "/hr/applicants", icon: <Users className="h-4 w-4" /> },
  { label: "مقابلات التوظيف", href: "/hr/interviews", icon: <MessageSquare className="h-4 w-4" /> },
  { label: "مراحل التوظيف", href: "/hr/pipeline", icon: <GitBranch className="h-4 w-4" /> },
  { label: "الرسائل", href: "/hr/messages", icon: <MessageSquare className="h-4 w-4" /> },
]

const adminNav: NavItem[] = [
  { label: "لوحة التحكم", href: "/admin/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "المستخدمون", href: "/admin/users", icon: <Users className="h-4 w-4" /> },
  { label: "المحافظات", href: "/admin/governorates", icon: <MapPin className="h-4 w-4" /> },
  { label: "الشركات", href: "/admin/companies", icon: <Building2 className="h-4 w-4" /> },
  { label: "مراجعة الوظائف", href: "/admin/moderate-jobs", icon: <ShieldCheck className="h-4 w-4" /> },
]

function getNavItems(role: string): NavItem[] {
  if (role === "candidate") return candidateNav
  if (role === "hr") return hrNav
  if (role === "admin") return adminNav
  return []
}

function SidebarContent({
  navItems,
  pathname,
  onClose,
  onLogout,
}: {
  navItems: NavItem[]
  pathname: string
  onClose: () => void
  onLogout: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              pathname === item.href
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>
      </div>
    </div>
  )
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  const navItems = getNavItems(user.role)

  const roleLabels: Record<string, string> = {
    candidate: "باحث عن عمل",
    hr: "مسؤول توظيف",
    admin: "مدير النظام",
  }

  const sidebarProps = {
    navItems,
    pathname,
    onClose: () => setOpen(false),
    onLogout: logout,
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-e border-border bg-[#080E1A] lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <SidebarContent {...sidebarProps} />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-[#0B1220]/80 px-4 backdrop-blur-md lg:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 p-0">
                <SidebarContent {...sidebarProps} />
              </SheetContent>
            </Sheet>
            <h2 className="text-sm font-medium text-muted-foreground">
              {navItems.find((item) => item.href === pathname)?.label ?? ""}
            </h2>
          </div>

          <div className="flex items-center gap-2">
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-secondary">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">{user.avatar}</AvatarFallback>
                </Avatar>
                <div className="hidden text-start md:block">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{roleLabels[user.role]}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem asChild>
                <Link href={user.role === "candidate" ? "/candidate/settings" : "#"}>
                  <Settings className="ml-2 h-4 w-4" />
                  الإعدادات
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="ml-2 h-4 w-4" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}

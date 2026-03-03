import Link from "next/link"
import { Briefcase } from "lucide-react"

export function Logo({ size = "default" }: { size?: "default" | "large" }) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <div className={`flex items-center justify-center rounded-lg bg-primary ${size === "large" ? "h-10 w-10" : "h-8 w-8"}`}>
        <Briefcase className={`text-primary-foreground ${size === "large" ? "h-6 w-6" : "h-4 w-4"}`} />
      </div>
      <span className={`font-bold text-foreground ${size === "large" ? "text-2xl" : "text-xl"}`}>
        JobNova
      </span>
    </Link>
  )
}

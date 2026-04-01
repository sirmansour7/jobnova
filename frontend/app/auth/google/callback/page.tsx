"use client"

import dynamicImport from "next/dynamic"
import { Loader2 } from "lucide-react"

const GoogleCallbackClient = dynamicImport(
  () => import("./GoogleCallbackClient"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
)

export default function GoogleCallbackPage() {
  return <GoogleCallbackClient />
}

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import GoogleCallbackClient from "./GoogleCallbackClient"

export const dynamic = "force-dynamic"

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <GoogleCallbackClient />
    </Suspense>
  )
}

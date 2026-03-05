import { Suspense } from "react"
import JobsClient from "./jobs-client"

export const revalidate = 60

export default function JobsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">جاري التحميل...</div>
      </div>
    }>
      <JobsClient />
    </Suspense>
  )
}

"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-lg font-medium text-destructive">حدث خطأ غير متوقع</p>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-lg bg-primary px-6 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        حاول مجدداً
      </button>
    </div>
  )
}

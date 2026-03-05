"use client"

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-destructive">حدث خطأ أثناء تحميل الوظيفة</p>
      <button
        onClick={reset}
        className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        حاول مجدداً
      </button>
    </div>
  )
}

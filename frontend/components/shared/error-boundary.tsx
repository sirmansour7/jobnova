"use client"

import { Component, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6"
            dir="rtl"
          >
            <p className="text-sm font-medium text-destructive">
              حدث خطأ، يرجى تحديث الصفحة
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground hover:bg-muted"
            >
              حاول مرة أخرى
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}

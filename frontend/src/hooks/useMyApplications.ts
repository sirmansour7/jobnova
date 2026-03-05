"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getMyApplications,
  getJobApplications,
  updateApplicationStatus,
  type MyApplication,
  type JobApplication,
  type ApplicationStatus,
  type PaginatedApplications,
} from "@/src/services/applications.service"

export function useMyApplications() {
  const [applications, setApplications] = useState<MyApplication[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [page, setPage]                 = useState(1)
  const [totalPages, setTotalPages]     = useState(1)
  const [total, setTotal]               = useState(0)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getMyApplications(page, 20)
      setApplications(data.items)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل الطلبات")
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { void fetch() }, [fetch])

  return { applications, loading, error, page, setPage, totalPages, total, refetch: fetch }
}

export function useJobApplications(jobId: string) {
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!jobId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getJobApplications(jobId)
      setApplications(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل المتقدمين")
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => { void fetch() }, [fetch])

  const changeStatus = useCallback(async (id: string, status: ApplicationStatus) => {
    await updateApplicationStatus(id, status)
    await fetch()
  }, [fetch])

  return { applications, loading, error, changeStatus, refetch: fetch }
}


"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getJobsPaginated,
  getJobById,
  type JobListItem,
  type JobDetail,
  type JobFilters,
} from "@/src/services/jobs.service"

export function useJobs(filters: JobFilters = {}) {
  const [jobs, setJobs]             = useState<JobListItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal]           = useState(0)

  const filtersKey = JSON.stringify({ ...filters, page })

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getJobsPaginated({ ...filters, page })
      setJobs(data.items)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل الوظائف")
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  useEffect(() => { void fetch() }, [fetch])

  return { jobs, loading, error, refetch: fetch, page, setPage, totalPages, total }
}

export function useJobDetail(id: string) {
  const [job, setJob]         = useState<JobDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      setError(null)
      try {
        const data = await getJobById(id)
        setJob(data)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "فشل تحميل تفاصيل الوظيفة")
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id])

  return { job, loading, error }
}


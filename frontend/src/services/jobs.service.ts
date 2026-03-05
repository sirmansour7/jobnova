"use client"

import { useState, useEffect, useCallback } from "react"
import { apiJson } from "@/src/lib/api"

export interface JobListItem {
  id: string
  title: string
  partnerName: string
  description?: string
  governorate?: string
  city?: string
  category?: string
  jobType?: string
  isActive: boolean
  createdAt: string
  organization?: { id: string; name: string }
  _count?: { applications: number }
  salaryMin?: number
  salaryMax?: number
}

export interface JobDetail extends JobListItem {
  requirements?: string[]
  skills?: string[]
  deadline?: string
}

export interface JobsResponse {
  items: JobListItem[]
  total: number
  page: number
  totalPages: number
}

export interface JobFilters {
  category?: string
  governorate?: string
  search?: string
  page?: number
  limit?: number
}

export async function getJobsPaginated(filters: JobFilters = {}): Promise<JobsResponse> {
  const params = new URLSearchParams()
  if (filters.category)    params.set("category",    filters.category)
  if (filters.governorate) params.set("governorate", filters.governorate)
  if (filters.search)      params.set("search",       filters.search)
  if (filters.page)        params.set("page",        String(filters.page))
  if (filters.limit)       params.set("limit",       String(filters.limit))
  const qs = params.toString()
  return apiJson<JobsResponse>(`/v1/jobs${qs ? `?${qs}` : ""}`)
}

export async function getJobs(filters: JobFilters = {}): Promise<JobListItem[]> {
  const result = await getJobsPaginated(filters)
  return result.items
}

export async function getJobById(id: string): Promise<JobDetail> {
  return apiJson<JobDetail>(`/v1/jobs/${id}`)
}

export function useJobs(filters: JobFilters = {}) {
  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPageState] = useState(filters.page ?? 1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getJobsPaginated(filters)
      setJobs(result.items)
      setTotal(result.total)
      setPageState(result.page)
      setTotalPages(result.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل الوظائف")
    } finally {
      setLoading(false)
    }
  }, [filters.category, filters.governorate, filters.search, filters.page, filters.limit])

  useEffect(() => {
    void fetch()
  }, [fetch])

  return { jobs, total, page, totalPages, loading, error, refetch: fetch }
}


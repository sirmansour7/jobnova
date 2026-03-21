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
  skills?: string[]
  minExperience?: number
  isActive: boolean
  createdAt: string
  organization?: { id: string; name: string }
  _count?: { applications: number }
  salaryMin?: number
  salaryMax?: number
  /** CV match score 0–100 (present only for authenticated candidates) */
  matchScore?: number
  /** True when matchScore >= 50 (present only for authenticated candidates) */
  isRecommended?: boolean
  /** Job skills matched by the candidate's CV */
  matchedSkills?: string[]
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
  category?:      string
  jobType?:       string
  governorate?:   string
  search?:        string
  /** Show jobs requiring AT MOST this many years of experience */
  maxExperience?: number
  page?:          number
  limit?:         number
}

/** Raw shape returned by the API before location fields are flattened */
interface RawJobItem extends Omit<JobListItem, "governorate" | "city"> {
  governorateRel?: { name: string } | null
  cityRel?:        { name: string } | null
}

interface RawJobsResponse {
  items:      RawJobItem[]
  total:      number
  page:       number
  totalPages: number
}

export async function getJobsPaginated(filters: JobFilters = {}): Promise<JobsResponse> {
  const params = new URLSearchParams()
  if (filters.category)                    params.set("category",      filters.category)
  if (filters.jobType)                     params.set("jobType",       filters.jobType)
  if (filters.governorate)                 params.set("governorate",   filters.governorate)
  if (filters.search)                      params.set("search",        filters.search)
  if (filters.maxExperience !== undefined) params.set("maxExperience", String(filters.maxExperience))
  if (filters.page)                        params.set("page",          String(filters.page))
  if (filters.limit)                       params.set("limit",         String(filters.limit))
  const qs = params.toString()
  const raw = await apiJson<RawJobsResponse>(`/v1/jobs${qs ? `?${qs}` : ""}`)
  // Flatten relational location objects into the flat strings JobListItem expects.
  return {
    ...raw,
    items: raw.items.map(({ governorateRel, cityRel, ...item }) => ({
      ...item,
      governorate: governorateRel?.name ?? undefined,
      city:        cityRel?.name        ?? undefined,
    })),
  }
}

export async function getJobs(filters: JobFilters = {}): Promise<JobListItem[]> {
  const result = await getJobsPaginated(filters)
  return result.items
}

/** HR-scoped: returns only jobs belonging to the logged-in HR user's organization */
export async function getHrJobsPaginated(filters: JobFilters = {}): Promise<JobsResponse> {
  const params = new URLSearchParams()
  if (filters.search)  params.set("search", filters.search)
  if (filters.page)    params.set("page",   String(filters.page))
  if (filters.limit)   params.set("limit",  String(filters.limit))
  const qs = params.toString()
  return apiJson<JobsResponse>(`/v1/hr/jobs${qs ? `?${qs}` : ""}`)
}

/** HR-scoped: returns flat array of jobs for the logged-in HR user's organization */
export async function getHrJobs(filters: JobFilters = {}): Promise<JobListItem[]> {
  const result = await getHrJobsPaginated(filters)
  return result.items ?? []
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
  }, [filters.category, filters.jobType, filters.governorate, filters.search, filters.maxExperience, filters.page, filters.limit])

  useEffect(() => {
    void fetch()
  }, [fetch])

  return { jobs, total, page, totalPages, loading, error, refetch: fetch }
}


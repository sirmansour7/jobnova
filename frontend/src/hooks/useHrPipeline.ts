"use client"

import { useState, useEffect, useCallback } from "react"
import { apiJson } from "@/src/lib/api"
import {
  getJobApplications,
  updateApplicationStatus,
  type JobApplication,
  type ApplicationStatus,
} from "@/src/services/applications.service"
import { type JobListItem } from "@/src/services/jobs.service"

export interface PipelineStage {
  id: ApplicationStatus
  label: string
  candidates: JobApplication[]
}

const STAGES: { id: ApplicationStatus; label: string }[] = [
  { id: "APPLIED",     label: "تقدم حديث" },
  { id: "SHORTLISTED", label: "مقبول مبدئيًا" },
  { id: "HIRED",       label: "مقبول" },
  { id: "REJECTED",    label: "مرفوض" },
]

export function useHrPipeline(jobId?: string) {
  const [jobs, setJobs]     = useState<JobListItem[]>([])
  const [stages, setStages] = useState<PipelineStage[]>(
    STAGES.map((s) => ({ ...s, candidates: [] }))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // Load HR's jobs on mount
  useEffect(() => {
    apiJson<JobListItem[] | { items: JobListItem[] }>("/v1/jobs")
      .then((res) => setJobs(Array.isArray(res) ? res : res.items ?? []))
      .catch(() => setJobs([]))
  }, [])

  // Load applications when jobId changes
  const loadApplications = useCallback(async () => {
    if (!jobId) {
      setStages(STAGES.map((s) => ({ ...s, candidates: [] })))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const applications = await getJobApplications(jobId)
      setStages(
        STAGES.map((s) => ({
          ...s,
          candidates: applications.filter((a) => a.status === s.id),
        }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل المتقدمين")
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => { void loadApplications() }, [loadApplications])

  const moveCandidate = useCallback(
    async (applicationId: string, newStatus: ApplicationStatus) => {
      await updateApplicationStatus(applicationId, newStatus)
      await loadApplications()
    },
    [loadApplications]
  )

  return { jobs, stages, loading, error, moveCandidate }
}


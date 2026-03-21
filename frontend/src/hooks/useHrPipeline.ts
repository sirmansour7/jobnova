"use client"

import { useState, useEffect, useCallback } from "react"
import { apiJson } from "@/src/lib/api"
import {
  getJobApplications,
  updateApplicationStatus,
  type JobApplication,
  type ApplicationStatus,
} from "@/src/services/applications.service"
import { getHrJobs, type JobListItem } from "@/src/services/jobs.service"

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
  const [jobs, setJobs]         = useState<JobListItem[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [stages, setStages]     = useState<PipelineStage[]>(
    STAGES.map((s) => ({ ...s, candidates: [] }))
  )
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Load HR's scoped jobs on mount
  useEffect(() => {
    setJobsLoading(true)
    getHrJobs({ limit: 100 })
      .then((items) => setJobs(items))
      .catch(() => setJobs([]))
      .finally(() => setJobsLoading(false))
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
      const prevStages = stages.map((s) => ({ ...s, candidates: [...s.candidates] }))
      setStages((current) => {
        const fromStage = current.find((s) => s.candidates.some((c) => c.id === applicationId))
        const toStage = current.find((s) => s.id === newStatus)
        if (!fromStage || !toStage || fromStage.id === toStage.id) return current
        const app = fromStage.candidates.find((c) => c.id === applicationId)
        if (!app) return current
        return current.map((s) => {
          if (s.id === fromStage.id)
            return { ...s, candidates: s.candidates.filter((c) => c.id !== applicationId) }
          if (s.id === toStage.id)
            return { ...s, candidates: [...s.candidates, { ...app, status: newStatus }] }
          return s
        })
      })
      try {
        await updateApplicationStatus(applicationId, newStatus)
      } catch (err) {
        setStages(prevStages)
        setError(err instanceof Error ? err.message : "فشل تحديث الحالة")
      }
    },
    [stages]
  )

  return { jobs, jobsLoading, stages, loading, error, moveCandidate }
}


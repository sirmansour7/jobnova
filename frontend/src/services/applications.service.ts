import { apiJson } from "@/src/lib/api"

export type ApplicationStatus = "APPLIED" | "SHORTLISTED" | "REJECTED" | "HIRED"

export interface MyApplication {
  id: string
  status: ApplicationStatus
  createdAt: string
  notes?: string
  job: {
    id: string
    title: string
    partnerName: string
    organization?: { name: string }
  }
}

export interface JobApplication {
  id: string
  status: ApplicationStatus
  createdAt: string
  candidate: {
    id: string
    fullName: string
    email: string
  }
}

export interface PaginatedApplications {
  items: MyApplication[]
  total: number
  page: number
  totalPages: number
}

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  APPLIED:     "قيد المراجعة",
  SHORTLISTED: "مقبول مبدئيًا",
  REJECTED:    "مرفوض",
  HIRED:       "مقبول",
}

export const STATUS_COLOR: Record<string, string> = {
  "قيد المراجعة":  "bg-chart-4/10 text-chart-4 border-chart-4/20",
  "مقبول مبدئيًا": "bg-chart-2/10 text-chart-2 border-chart-2/20",
  "مرفوض":         "bg-destructive/10 text-destructive border-destructive/20",
  "مقبول":         "bg-chart-3/10 text-chart-3 border-chart-3/20",
}

export const ALL_STATUS_LABELS = Object.values(STATUS_LABEL)

export async function getMyApplications(page = 1, limit = 20): Promise<PaginatedApplications> {
  const result = await apiJson<MyApplication[] | PaginatedApplications>(
    `/v1/applications/my?page=${page}&limit=${limit}`
  )
  if (Array.isArray(result)) {
    return { items: result, total: result.length, page: 1, totalPages: 1 }
  }
  return result
}

export async function getJobApplications(jobId: string): Promise<JobApplication[]> {
  const result = await apiJson<JobApplication[] | { items: JobApplication[] }>(
    `/v1/applications/job/${jobId}`
  )
  if (Array.isArray(result)) return result
  return result.items ?? []
}

export async function applyToJob(jobId: string): Promise<void> {
  await apiJson("/v1/applications", {
    method: "POST",
    body: JSON.stringify({ jobId }),
  })
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
): Promise<void> {
  await apiJson(`/v1/applications/${applicationId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
}


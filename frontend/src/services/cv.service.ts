import { apiJson } from "@/src/lib/api"

export interface CvExperience {
  title: string
  company: string
  from: string
  to: string
  description: string
}

export interface CvEducation {
  degree: string
  institution: string
  year: string
}

export interface CvData {
  fullName: string
  email: string
  phone: string
  location: string
  title: string
  summary: string
  skills: string[]
  experience: CvExperience[]
  education: CvEducation[]
}

export const EMPTY_CV: CvData = {
  fullName: "", email: "", phone: "", location: "",
  title: "", summary: "", skills: [],
  experience: [], education: [],
}

export const getMyCv = () =>
  apiJson<{ data: CvData }>("/v1/cv/me")
    .then(res => (res?.data ?? null) as CvData | null)
    .catch(() => null)

export const saveMyCv = (cvData: CvData) =>
  apiJson("/v1/cv/me", {
    method: "PUT",
    body: JSON.stringify({ contentJson: cvData }),
  })

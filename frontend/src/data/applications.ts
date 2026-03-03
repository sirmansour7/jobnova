export type ApplicationStatus = "قيد المراجعة" | "مقبول مبدئيًا" | "مقابلة" | "مرفوض" | "مقبول"

export interface Application {
  id: string
  jobId: string
  jobTitle: string
  companyName: string
  companyLogo: string
  candidateName: string
  candidateEmail: string
  status: ApplicationStatus
  appliedAt: string
  notes: string
}

export const applications: Application[] = [
  {
    id: "1",
    jobId: "1",
    jobTitle: "مطور واجهات أمامية",
    companyName: "فوري",
    companyLogo: "FW",
    candidateName: "أحمد محمد",
    candidateEmail: "ahmed@example.com",
    status: "مقابلة",
    appliedAt: "2026-02-21",
    notes: "تم تحديد موعد المقابلة يوم الأحد",
  },
  {
    id: "2",
    jobId: "7",
    jobTitle: "مطور تطبيقات موبايل",
    companyName: "إنستاباي",
    companyLogo: "IP",
    candidateName: "أحمد محمد",
    candidateEmail: "ahmed@example.com",
    status: "قيد المراجعة",
    appliedAt: "2026-02-22",
    notes: "",
  },
  {
    id: "3",
    jobId: "5",
    jobTitle: "مهندس مدني",
    companyName: "مجموعة طلعت مصطفى",
    companyLogo: "TMG",
    candidateName: "أحمد محمد",
    candidateEmail: "ahmed@example.com",
    status: "مرفوض",
    appliedAt: "2026-02-16",
    notes: "لا تتطابق الخبرة المطلوبة",
  },
  {
    id: "4",
    jobId: "12",
    jobTitle: "مطور خلفية (Backend)",
    companyName: "إنستاباي",
    companyLogo: "IP",
    candidateName: "أحمد محمد",
    candidateEmail: "ahmed@example.com",
    status: "مقبول مبدئيًا",
    appliedAt: "2026-02-18",
    notes: "تم اجتياز الفلترة الأولية",
  },
]

export const applicationStatuses: ApplicationStatus[] = [
  "قيد المراجعة",
  "مقبول مبدئيًا",
  "مقابلة",
  "مرفوض",
  "مقبول",
]

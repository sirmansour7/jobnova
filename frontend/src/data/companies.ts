export interface Company {
  id: string
  name: string
  logo: string
  industry: string
  location: string
  size: string
  description: string
  website: string
  founded: string
  jobCount: number
}

export const companies: Company[] = [
  {
    id: "1",
    name: "فودافون مصر",
    logo: "VF",
    industry: "اتصالات",
    location: "القاهرة، مصر",
    size: "5000+ موظف",
    description: "شركة اتصالات رائدة في السوق المصري تقدم خدمات الهاتف المحمول والإنترنت.",
    website: "vodafone.com.eg",
    founded: "1998",
    jobCount: 12,
  },
  {
    id: "2",
    name: "البنك التجاري الدولي",
    logo: "CIB",
    industry: "بنوك ومالية",
    location: "القاهرة، مصر",
    size: "7000+ موظف",
    description: "أكبر بنك خاص في مصر يقدم خدمات مصرفية متكاملة للأفراد والشركات.",
    website: "cibeg.com",
    founded: "1975",
    jobCount: 8,
  },
  {
    id: "3",
    name: "أورانج مصر",
    logo: "OR",
    industry: "اتصالات",
    location: "القاهرة، مصر",
    size: "4000+ موظف",
    description: "مزود خدمات اتصالات متكاملة في السوق المصري.",
    website: "orange.eg",
    founded: "1998",
    jobCount: 6,
  },
  {
    id: "4",
    name: "مجموعة طلعت مصطفى",
    logo: "TMG",
    industry: "عقارات",
    location: "القاهرة الجديدة، مصر",
    size: "3000+ موظف",
    description: "واحدة من أكبر شركات التطوير العقاري في مصر والشرق الأوسط.",
    website: "talmostafa.com",
    founded: "2007",
    jobCount: 15,
  },
  {
    id: "5",
    name: "شركة سيدي كرير للبتروكيماويات",
    logo: "SIDPEC",
    industry: "بتروكيماويات",
    location: "الإسكندرية، مصر",
    size: "1500+ موظف",
    description: "شركة رائدة في صناعة البتروكيماويات في مصر.",
    website: "sidpec.com",
    founded: "1997",
    jobCount: 4,
  },
  {
    id: "6",
    name: "فوري",
    logo: "FW",
    industry: "تكنولوجيا مالية",
    location: "القاهرة، مصر",
    size: "2500+ موظف",
    description: "منصة الدفع الإلكتروني الرائدة في مصر.",
    website: "fawry.com",
    founded: "2008",
    jobCount: 10,
  },
  {
    id: "7",
    name: "المصرية للاتصالات",
    logo: "WE",
    industry: "اتصالات",
    location: "القاهرة، مصر",
    size: "6000+ موظف",
    description: "أكبر مزود لخدمات الاتصالات الثابتة والإنترنت في مصر.",
    website: "te.eg",
    founded: "1998",
    jobCount: 9,
  },
  {
    id: "8",
    name: "إنستاباي",
    logo: "IP",
    industry: "تكنولوجيا مالية",
    location: "القاهرة الجديدة، مصر",
    size: "500+ موظف",
    description: "منصة تحويل أموال فورية بين البنوك المصرية.",
    website: "instapay.eg",
    founded: "2022",
    jobCount: 7,
  },
]

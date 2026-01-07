export interface Job {
  id: string
  title: string
  company: string
  location: string
  plz: string
  workload: string // z.B. "80 – 100%"
  contractType: string // z.B. "Festanstellung"
  postedDate: string // z.B. "Vor 3 Wochen"
  description: string
  requirements: string[]
  benefits: string[]
  salary?: string
  link?: string
}

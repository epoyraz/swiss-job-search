"use client"

import { Job } from "@/types/job"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  MapPin, 
  Calendar, 
  Briefcase, 
  Building2, 
  DollarSign,
  CheckCircle2,
  Star
} from "lucide-react"
import { useTranslations } from "next-intl"

interface JobDetailProps {
  job: Job
}

export function JobDetail({ job }: JobDetailProps) {
  const t = useTranslations("JobDetail")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span className="text-lg">{job.company}</span>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {job.postedDate}
          </Badge>
        </div>
      </div>

      {/* Quick Info */}
      <Card className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-1" />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Standort</p>
              <p className="font-semibold">{job.location}</p>
              <p className="text-sm text-muted-foreground">PLZ {job.plz}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-primary mt-1" />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Pensum</p>
              <p className="font-semibold">{job.workload}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Briefcase className="h-5 w-5 text-primary mt-1" />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Vertragsart</p>
              <p className="font-semibold">{job.contractType}</p>
            </div>
          </div>

          {job.salary && (
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-primary mt-1" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Gehalt</p>
                <p className="font-semibold">{job.salary}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button size="lg" className="flex-1">
          Jetzt bewerben
        </Button>
        <Button size="lg" variant="outline">
          <Star className="h-5 w-5" />
        </Button>
      </div>

      <Separator />

      {/* Description */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Stellenbeschreibung</h2>
        <p className="text-muted-foreground leading-relaxed">{job.description}</p>
      </div>

      <Separator />

      {/* Requirements */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Anforderungen</h2>
        <ul className="space-y-2">
          {job.requirements.map((req, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{req}</span>
            </li>
          ))}
        </ul>
      </div>

      <Separator />

      {/* Benefits */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Was wir bieten</h2>
        <ul className="space-y-2">
          {job.benefits.map((benefit, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{benefit}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom Actions */}
      <div className="pt-4">
        <Button size="lg" className="w-full">
          Jetzt bewerben
        </Button>
      </div>
    </div>
  )
}

"use client"

import { Job } from "@/types/job"
import { Card } from "@/components/ui/card"
import { MapPin, Calendar, Briefcase, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

interface JobCardProps {
  job: Job
  isActive: boolean
  onClick: () => void
}

export function JobCard({ job, isActive, onClick }: JobCardProps) {
  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md",
        isActive && "border-primary bg-accent/50"
      )}
      onClick={onClick}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-muted-foreground">{job.postedDate}</p>
        </div>

        <h3 className="font-semibold text-base leading-tight">{job.title}</h3>

        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-muted-foreground text-xs">Arbeitsort:</p>
              <p className="font-medium">{job.location}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-muted-foreground text-xs">Pensum:</p>
              <p className="font-medium">{job.workload}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-muted-foreground text-xs">Vertragsart:</p>
              <p className="font-medium">{job.contractType}</p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground truncate">{job.company}</p>
        </div>
      </div>
    </Card>
  )
}

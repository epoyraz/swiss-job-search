import { Job } from "@/types/job"

interface JobDetailProps {
  job: Job
}

export function JobDetail({ job }: JobDetailProps) {
  if (!job.link) {
    return <p className="text-muted-foreground">Kein Link zur Ausschreibung vorhanden.</p>
  }

  return (
    <div className="h-full w-full">
      <iframe
        title={`Ausschreibung ${job.title}`}
        src={job.link}
        className="h-full w-full rounded-md border"
        loading="lazy"
      />
    </div>
  )
}

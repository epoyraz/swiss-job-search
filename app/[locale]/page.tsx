"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LocationSearchWidget } from "@/components/location-search-widget"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { useQueryStates, parseAsString, parseAsInteger } from "nuqs"
import { Loader2 } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { JobCard } from "@/components/job-card"
import { JobDetail } from "@/components/job-detail"
import { dummyJobs } from "@/data/dummy-jobs"
import { Job } from "@/types/job"

interface SearchResult {
  plz: string
  city: string
  longitude: number
  latitude: number
}

interface RadiusSearchResponse {
  plz: string
  radiusKm: number
  count: number
  results: SearchResult[]
}

export default function Home() {
  const t = useTranslations("home")
  const locale = useLocale()
  
  const [urlParams, setUrlParams] = useQueryStates({
    job: parseAsString,
    plz: parseAsString,
    radius: parseAsInteger,
    jobid: parseAsString,
  })

  const [jobTitle, setJobTitle] = useState(urlParams.job || "")
  const [searchData, setSearchData] = useState<{
    location: string
    radiusKm: number
    coordinates?: { lat: number; lng: number }
  } | null>(null)
  
  // Standardwert für Radius
  const defaultRadius = 25

  const [searchResults, setSearchResults] = useState<RadiusSearchResponse | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hasInitialSearchRun, setHasInitialSearchRun] = useState(false)
  
  // State für Job-Anzeige
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [jobStats, setJobStats] = useState<{ jobCount: number; companyCount: number } | null>(null)

  const applyJobSelection = (jobs: Job[]) => {
    setFilteredJobs(jobs)

    if (urlParams.jobid) {
      const jobToSelect = jobs.find((j) => j.id === urlParams.jobid)
      if (jobToSelect) {
        setSelectedJob(jobToSelect)
        return
      }
    }

    if (jobs.length > 0) {
      setSelectedJob(jobs[0])
      setUrlParams({ jobid: jobs[0].id })
    } else {
      setSelectedJob(null)
      setUrlParams({ jobid: null })
    }
  }

  const readJson = async <T,>(response: Response): Promise<T> => {
    const text = await response.text()
    if (!text) {
      throw new Error(t("errors.genericError"))
    }
    return JSON.parse(text) as T
  }

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/jobs-stats")
        const payload = await readJson<{ error?: string } | { jobCount: number; companyCount: number }>(response)
        if (!response.ok) {
          throw new Error((payload as { error?: string }).error || t("errors.genericError"))
        }
        setJobStats(payload as { jobCount: number; companyCount: number })
      } catch (error) {
        console.error("Failed to load job stats:", error)
      }
    }

    fetchStats()
  }, [])

  const fetchJobsByProfession = async (profession: string, location?: string | null) => {
    setIsSearching(true)
    setSearchError(null)
    setSearchResults(null)
    setHasSearched(true)

    try {
      const response = await fetch(
        `/api/jobs?profession=${encodeURIComponent(profession)}`
      )

      const payload = await readJson<{ error?: string } | Job[]>(response)
      if (!response.ok) {
        const errorData = payload as { error?: string }
        throw new Error(errorData.error || t("errors.searchFailed"))
      }

      const jobs = payload as Job[]

      let filtered = jobs
      if (location) {
        const city = location.replace(/^\d{4}\s*/, "").trim()
        if (city) {
          const cityLower = city.toLowerCase()
          filtered = jobs.filter((job) => job.location.toLowerCase().includes(cityLower))
        }
      }

      applyJobSelection(filtered)
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : t("errors.genericError"))
      applyJobSelection([])
    } finally {
      setIsSearching(false)
    }
  }

  // Handler to select a job and update URL
  const handleJobSelect = (job: Job) => {
    setSelectedJob(job)
    setUrlParams({ jobid: job.id })
  }

  const performSearch = async (plz: string, radiusKm: number, profession?: string) => {
    setIsSearching(true)
    setSearchError(null)
    setSearchResults(null)
    setHasSearched(true)

    try {
      const response = await fetch(
        `/api/radius-search?plz=${encodeURIComponent(plz)}&radius=${radiusKm}`
      )

      const payload = await readJson<{ error?: string } | RadiusSearchResponse>(response)
      if (!response.ok) {
        const errorData = payload as { error?: string }
        throw new Error(errorData.error || t("errors.searchFailed"))
      }

      const results = payload as RadiusSearchResponse
      setSearchResults(results)
      
      const plzs = Array.from(new Set([plz, ...results.results.map((r) => r.plz)]))
      const jobsResponse = await fetch(
        `/api/jobs?plzs=${encodeURIComponent(plzs.join(","))}${
          profession ? `&profession=${encodeURIComponent(profession)}` : ""
        }`
      )

      const jobsPayload = await readJson<{ error?: string } | Job[]>(jobsResponse)
      if (!jobsResponse.ok) {
        const errorData = jobsPayload as { error?: string }
        throw new Error(errorData.error || t("errors.searchFailed"))
      }

      const jobs = jobsPayload as Job[]
      applyJobSelection(jobs)
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : t("errors.genericError"))
      applyJobSelection([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearch = async (data: { 
    location: string
    radiusKm: number
    coordinates?: { lat: number; lng: number }
  }) => {
    // Wenn keine Location angegeben ist, zeige alle Jobs
    if (!data.location) {
      // Update URL parameters (nur job, keine plz)
      await setUrlParams({
        job: jobTitle || null,
        plz: null,
        radius: null,
      })
      
      // Zeige alle Jobs ohne PLZ-Filter
      setSearchResults(null)
      setSearchError(null)
      setSearchData(null)
      setHasSearched(true)
      if (jobTitle) {
        await fetchJobsByProfession(jobTitle)
      } else {
        applyJobSelection(dummyJobs)
      }
      return
    }

    // Extrahiere PLZ aus dem location string (Format: "PLZ Stadt" oder nur "PLZ")
    const plzMatch = data.location.match(/^\d{4}/)
    if (!plzMatch) {
      setSearchError(t("errors.selectLocation"))
      return
    }

    const plz = plzMatch[0]

    // Update URL parameters
    await setUrlParams({
      job: jobTitle || null,
      plz,
      radius: data.radiusKm,
    })

    // Perform search
    await performSearch(plz, data.radiusKm, jobTitle || undefined)
  }

  // Load search from URL parameters on mount
  useEffect(() => {
    if (!hasInitialSearchRun) {
      if (urlParams.plz) {
        setHasInitialSearchRun(true)
        
        // Set the location field to show the PLZ
        setSearchData({
          location: urlParams.plz,
          radiusKm: urlParams.radius || defaultRadius,
        })
        
        // Perform the search
        performSearch(urlParams.plz, urlParams.radius || defaultRadius, urlParams.job || undefined)
      } else if (urlParams.job) {
        // Nur Job-Titel, keine PLZ - zeige alle Jobs
        setHasInitialSearchRun(true)
        setHasSearched(true)
        fetchJobsByProfession(urlParams.job)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlParams.plz, urlParams.radius, urlParams.job, urlParams.jobid])

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 pt-12 sm:p-12">
      <div className="w-full max-w-7xl space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex-1" />
          <div className="flex-1 text-center">
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t("title")}</h1>
            {jobStats && (
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                {t("subtitle", {
                  jobs: jobStats.jobCount.toLocaleString(locale),
                  companies: jobStats.companyCount.toLocaleString(locale),
                })}
              </p>
            )}
          </div>
          <div className="flex flex-1 justify-end">
            <LanguageSwitcher />
          </div>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <LocationSearchWidget
              jobTitle={jobTitle}
              onJobTitleChange={setJobTitle}
              defaultLocation={urlParams.plz || ""}
              defaultRadius={urlParams.radius || defaultRadius}
              onChange={(data) => {
                setSearchData(data)
                // Clear previous results when input changes
                setSearchResults(null)
                setSearchError(null)
              }}
              onClear={() => {
                setSearchData(null)
                setSearchResults(null)
                setSearchError(null)
                setFilteredJobs([])
                setSelectedJob(null)
                setHasSearched(false)
                // Clear URL params
                setUrlParams({ job: jobTitle || null, plz: null, radius: null, jobid: null })
              }}
              onSearch={handleSearch}
            />

            {searchData && !searchResults && !isSearching && (
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {jobTitle && (
                    <>
                      <span className="text-muted-foreground">{t("searchInfo.job")}</span>
                      <Badge variant="default">{jobTitle}</Badge>
                      <span className="text-muted-foreground">•</span>
                    </>
                  )}
                  <span className="text-muted-foreground">{t("searchInfo.location")}</span>
                  <Badge variant="secondary">{searchData.location}</Badge>
                  <span className="text-muted-foreground">•</span>
                  <Badge variant="outline">{t("searchInfo.radiusKm", { radius: searchData.radiusKm })}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading State */}
        {isSearching && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">{t("search.loading")}</span>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {searchError && (
          <Card className="border-destructive">
            <CardContent className="py-6">
              <p className="text-center text-destructive">{searchError}</p>
            </CardContent>
          </Card>
        )}

        {/* Job Results */}
        {hasSearched && filteredJobs.length > 0 && (
          <div className="flex flex-col gap-4">
            {/* Debug: Anzahl der Jobs */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {filteredJobs.length} {filteredJobs.length === 1 ? "Stelle" : "Stellen"} gefunden
                </CardTitle>
              </CardHeader>
            </Card>

            <div className="flex gap-6 h-[calc(100vh-280px)] min-h-[720px]">
              {/* Left Column - Job List (20%) */}
              <div className="w-[350px] shrink-0">
                <Card className="h-full flex flex-col">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">
                      Stellenliste
                    </CardTitle>
                    {searchResults && (
                      <CardDescription className="text-xs">
                        Im Umkreis von {searchResults.radiusKm} km
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 overflow-auto p-0">
                    <div className="space-y-3 px-6 pb-6">
                      {filteredJobs.map((job) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          isActive={selectedJob?.id === job.id}
                          onClick={() => handleJobSelect(job)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Job Detail (80%) */}
              <div className="flex-1 min-w-0">
                <Card className="h-full">
                  <CardContent className="p-0 h-full overflow-hidden">
                    <div className="p-6 h-full">
                      {selectedJob ? (
                        <JobDetail job={selectedJob} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          Wähle eine Stelle aus der Liste
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* No Results */}
        {hasSearched && filteredJobs.length === 0 && !isSearching && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Keine Stellen im ausgewählten Umkreis gefunden.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

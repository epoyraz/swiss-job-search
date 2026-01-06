"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LocationSearchWidget } from "@/components/location-search-widget"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { useQueryStates, parseAsString, parseAsInteger } from "nuqs"
import { Loader2, MapPin } from "lucide-react"
import { useTranslations } from "next-intl"
import { JobCard } from "@/components/job-card"
import { JobDetail } from "@/components/job-detail"
import { dummyJobs } from "@/data/dummy-jobs"
import { Job } from "@/types/job"
import { ScrollArea } from "@/components/ui/scroll-area"

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
  
  const [urlParams, setUrlParams] = useQueryStates({
    job: parseAsString,
    plz: parseAsString,
    radius: parseAsInteger,
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

  const performSearch = async (plz: string, radiusKm: number) => {
    setIsSearching(true)
    setSearchError(null)
    setSearchResults(null)
    setHasSearched(true)

    try {
      const response = await fetch(
        `/api/radius-search?plz=${encodeURIComponent(plz)}&radius=${radiusKm}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t("errors.searchFailed"))
      }

      const results = await response.json() as RadiusSearchResponse
      setSearchResults(results)
      
      // Filtere Jobs basierend auf den gefundenen PLZ
      const plzSet = new Set(results.results.map((r) => r.plz))
      const jobsInRadius = dummyJobs.filter(job => plzSet.has(job.plz))
      
      setFilteredJobs(jobsInRadius)
      if (jobsInRadius.length > 0) {
        setSelectedJob(jobsInRadius[0])
      } else {
        setSelectedJob(null)
      }
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : t("errors.genericError"))
      setFilteredJobs([])
      setSelectedJob(null)
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
      setFilteredJobs(dummyJobs)
      setSelectedJob(dummyJobs.length > 0 ? dummyJobs[0] : null)
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
    await performSearch(plz, data.radiusKm)
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
        performSearch(urlParams.plz, urlParams.radius || defaultRadius)
      } else if (urlParams.job) {
        // Nur Job-Titel, keine PLZ - zeige alle Jobs
        setHasInitialSearchRun(true)
        setHasSearched(true)
        setFilteredJobs(dummyJobs)
        setSelectedJob(dummyJobs.length > 0 ? dummyJobs[0] : null)
      }
    }
  }, [urlParams.plz, urlParams.radius, urlParams.job, hasInitialSearchRun])

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 pt-12 sm:p-12">
      <div className="w-full max-w-7xl space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex-1" />
          <h1 className="flex-1 text-balance text-center text-4xl font-bold tracking-tight sm:text-5xl">{t("title")}</h1>
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
                // Clear URL params
                setUrlParams({ job: jobTitle || null, plz: null, radius: null })
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
          <div className="flex gap-6 h-[calc(100vh-400px)] min-h-[600px]">
            {/* Left Column - Job List (20%) */}
            <div className="w-[300px] shrink-0">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">
                    {filteredJobs.length} {filteredJobs.length === 1 ? "Stelle" : "Stellen"}
                  </CardTitle>
                  {searchResults && (
                    <CardDescription className="text-xs">
                      Im Umkreis von {searchResults.radiusKm} km
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full px-6 pb-6">
                    <div className="space-y-3">
                      {filteredJobs.map((job) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          isActive={selectedJob?.id === job.id}
                          onClick={() => setSelectedJob(job)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Job Detail (80%) */}
            <div className="flex-1 min-w-0">
              <Card className="h-full">
                <CardContent className="p-0 h-full">
                  <ScrollArea className="h-full p-6">
                    {selectedJob ? (
                      <JobDetail job={selectedJob} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Wähle eine Stelle aus der Liste
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
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

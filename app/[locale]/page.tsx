"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LocationSearchWidget } from "@/components/location-search-widget"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { useQueryStates, parseAsString, parseAsInteger } from "nuqs"
import { Loader2, MapPin } from "lucide-react"
import { useTranslations } from "next-intl"

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
    radius: parseAsInteger.withDefault(25),
  })

  const [jobTitle, setJobTitle] = useState(urlParams.job || "")
  const [searchData, setSearchData] = useState<{
    location: string
    radiusKm: number
    coordinates?: { lat: number; lng: number }
  } | null>(null)

  const [searchResults, setSearchResults] = useState<RadiusSearchResponse | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hasInitialSearchRun, setHasInitialSearchRun] = useState(false)

  const performSearch = async (plz: string, radiusKm: number) => {
    setIsSearching(true)
    setSearchError(null)
    setSearchResults(null)

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
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : t("errors.genericError"))
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearch = async (data: { 
    location: string
    radiusKm: number
    coordinates?: { lat: number; lng: number }
  }) => {
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
    if (!hasInitialSearchRun && urlParams.plz) {
      setHasInitialSearchRun(true)
      
      // Set the location field to show the PLZ
      setSearchData({
        location: urlParams.plz,
        radiusKm: urlParams.radius,
      })
      
      // Perform the search
      performSearch(urlParams.plz, urlParams.radius)
    }
  }, [urlParams.plz, urlParams.radius, hasInitialSearchRun])

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 pt-12 sm:p-12">
      <div className="w-full max-w-5xl space-y-8">
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
              defaultRadius={urlParams.radius}
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
                setUrlParams({ job: jobTitle || null, plz: null, radius: 25 })
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

        {/* Results */}
        {searchResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t("results.title")}
              </CardTitle>
              <CardDescription>
                {t("results.count", { 
                  count: searchResults.count, 
                  radius: searchResults.radiusKm, 
                  plz: searchResults.plz 
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {searchResults.results.map((result, index) => (
                  <div
                    key={`${result.plz}-${result.city}-${index}`}
                    className={`rounded-lg border p-3 text-sm transition-colors hover:bg-accent ${
                      result.plz === searchResults.plz 
                        ? "border-primary bg-primary/5" 
                        : "border-border"
                    }`}
                  >
                    <div className="font-mono font-semibold">{result.plz}</div>
                    <div className="truncate text-xs text-muted-foreground" title={result.city}>
                      {result.city}
                    </div>
                  </div>
                ))}
              </div>

              {searchResults.count > 0 && (
                <div className="mt-6 rounded-lg bg-muted/50 p-4">
                  <h4 className="mb-2 text-sm font-medium">{t("results.summary")}</h4>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {jobTitle && (
                      <>
                        <span>{t("results.job")} <strong className="text-foreground">{jobTitle}</strong></span>
                        <span>•</span>
                      </>
                    )}
                    <span>{t("results.center")} <strong className="text-foreground">{searchResults.plz}</strong></span>
                    <span>•</span>
                    <span>{t("results.radiusLabel")} <strong className="text-foreground">{searchResults.radiusKm} km</strong></span>
                    <span>•</span>
                    <span>{t("results.found")} <strong className="text-foreground">{t("results.plzCount", { count: searchResults.count })}</strong></span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LocationSearchWidget } from "@/components/location-search-widget"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { useQueryStates, parseAsString, parseAsInteger } from "nuqs"
import { Loader2, MapPin } from "lucide-react"

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
  const [urlParams, setUrlParams] = useQueryStates({
    plz: parseAsString,
    radius: parseAsInteger.withDefault(25),
    job: parseAsString,
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
        throw new Error(errorData.error || "Suche fehlgeschlagen")
      }

      const results = await response.json() as RadiusSearchResponse
      setSearchResults(results)
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten")
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
      setSearchError("Bitte wähle einen Ort aus den Vorschlägen aus.")
      return
    }

    const plz = plzMatch[0]

    // Update URL parameters
    await setUrlParams({
      plz,
      radius: data.radiusKm,
      job: jobTitle || null,
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
        <div className="text-center">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">Jobbörse</h1>
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
                setUrlParams({ plz: null, radius: 25, job: jobTitle || null })
              }}
              onSearch={handleSearch}
            />

            {searchData && !searchResults && !isSearching && (
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {jobTitle && (
                    <>
                      <span className="text-muted-foreground">Job:</span>
                      <Badge variant="default">{jobTitle}</Badge>
                      <span className="text-muted-foreground">•</span>
                    </>
                  )}
                  <span className="text-muted-foreground">Ort:</span>
                  <Badge variant="secondary">{searchData.location}</Badge>
                  <span className="text-muted-foreground">•</span>
                  <Badge variant="outline">{searchData.radiusKm} km Umkreis</Badge>
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
              <span className="ml-3 text-muted-foreground">Suche läuft...</span>
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
                Suchergebnis
              </CardTitle>
              <CardDescription>
                <span className="font-medium text-foreground">{searchResults.count}</span> Postleitzahlen 
                im Umkreis von <span className="font-medium text-foreground">{searchResults.radiusKm} km</span> um 
                PLZ <span className="font-medium text-foreground">{searchResults.plz}</span>
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
                  <h4 className="mb-2 text-sm font-medium">Zusammenfassung</h4>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {jobTitle && (
                      <>
                        <span>Beruf: <strong className="text-foreground">{jobTitle}</strong></span>
                        <span>•</span>
                      </>
                    )}
                    <span>Zentrum: <strong className="text-foreground">{searchResults.plz}</strong></span>
                    <span>•</span>
                    <span>Radius: <strong className="text-foreground">{searchResults.radiusKm} km</strong></span>
                    <span>•</span>
                    <span>Gefunden: <strong className="text-foreground">{searchResults.count} PLZ</strong></span>
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

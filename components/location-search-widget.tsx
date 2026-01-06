"use client"

import * as React from "react"
import { MapPin, X, Search, Loader2, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const RADIUS_OPTIONS = [5, 10, 25, 50, 100]

interface Location {
  zip: string
  city: string
  longitude: number
  latitude: number
}

interface LocationSearchWidgetProps {
  onChange?: (data: { location: string; radiusKm: number; coordinates?: { lat: number; lng: number } }) => void
  onClear?: () => void
  onSearch?: (data: { location: string; radiusKm: number; coordinates?: { lat: number; lng: number } }) => void
  jobTitle?: string
  onJobTitleChange?: (value: string) => void
  defaultLocation?: string
  defaultRadius?: number
  className?: string
}

// Helper function to highlight matching text
const highlightMatch = (text: string, query: string) => {
  if (!query) return text

  const index = text.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1) return text

  const before = text.slice(0, index)
  const match = text.slice(index, index + query.length)
  const after = text.slice(index + query.length)

  return (
    <>
      {before}
      <span className="font-bold">{match}</span>
      {after}
    </>
  )
}

export function LocationSearchWidget({
  onChange,
  onClear,
  onSearch,
  jobTitle = "",
  onJobTitleChange,
  defaultLocation = "",
  defaultRadius = 25,
  className,
}: LocationSearchWidgetProps) {
  const [location, setLocation] = React.useState(defaultLocation)
  const [radiusKm, setRadiusKm] = React.useState(defaultRadius)
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [suggestions, setSuggestions] = React.useState<Location[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedCoordinates, setSelectedCoordinates] = React.useState<{ lat: number; lng: number } | undefined>()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  // Update location when defaultLocation changes (e.g., from URL params)
  React.useEffect(() => {
    if (defaultLocation && defaultLocation !== location) {
      setLocation(defaultLocation)
    }
  }, [defaultLocation])

  // Debounced API call
  React.useEffect(() => {
    if (!location || location.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Abbrechen des vorherigen Requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      abortControllerRef.current = new AbortController()

      try {
        const response = await fetch(
          `/api/locations?q=${encodeURIComponent(location)}&limit=15`,
          { signal: abortControllerRef.current.signal }
        )

        if (response.ok) {
          const data = await response.json()
          setSuggestions(data)
          setShowSuggestions(data.length > 0)
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to fetch locations:", error)
        }
      } finally {
        setIsLoading(false)
      }
    }, 150) // 150ms debounce

    return () => {
      clearTimeout(timeoutId)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [location])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Callback aufrufen, wenn location oder radiusKm sich ändern
  React.useEffect(() => {
    if (location && onChange) {
      onChange({
        location,
        radiusKm,
        coordinates: selectedCoordinates,
      })
    }
  }, [location, radiusKm, selectedCoordinates])

  const handleSelectSuggestion = (loc: Location) => {
    setLocation(`${loc.zip} ${loc.city}`)
    setSelectedCoordinates({ lat: loc.latitude, lng: loc.longitude })
    setShowSuggestions(false)
    inputRef.current?.blur()
  }

  // Clear-Handler
  const handleClear = () => {
    setLocation("")
    setSelectedCoordinates(undefined)
    setSuggestions([])
    setShowSuggestions(false)
    onClear?.()
  }

  // Search button handler
  const handleSearch = () => {
    if (location && onSearch) {
      onSearch({
        location,
        radiusKm,
        coordinates: selectedCoordinates,
      })
    }
  }

  return (
    <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-end", className)}>
      {/* Berufsbezeichnung Input */}
      <div className="flex-1 space-y-2">
        <Label htmlFor="job-title" className="text-sm font-medium">
          Berufsbezeichnung
        </Label>
        <div className="relative">
          <Briefcase className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 opacity-50" />
          <Input
            id="job-title"
            type="text"
            placeholder="z.B. Softwareentwickler..."
            value={jobTitle}
            onChange={(e) => onJobTitleChange?.(e.target.value)}
            className="h-12 pl-10 text-base"
          />
        </div>
      </div>

      {/* Ort Input */}
      <div className="flex-1 space-y-2">
        <Label htmlFor="location-input" className="text-sm font-medium">
          Ort (PLZ oder Stadt)
        </Label>
        <div className="relative">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 opacity-50" />
            <Input
              ref={inputRef}
              id="location-input"
              type="text"
              placeholder="Stadt oder PLZ eingeben..."
              value={location}
              onChange={(e) => {
                setLocation(e.target.value)
                setSelectedCoordinates(undefined)
              }}
              onFocus={() => location && suggestions.length > 0 && setShowSuggestions(true)}
              className="h-12 pl-10 pr-10 text-base"
              autoComplete="off"
            />
            {isLoading ? (
              <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin opacity-50" />
            ) : location ? (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                onClick={handleClear}
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Löschen</span>
              </Button>
            ) : null}
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
            >
              {suggestions.map((loc, index) => (
                <button
                  key={`${loc.zip}-${loc.city}-${index}`}
                  type="button"
                  onClick={() => handleSelectSuggestion(loc)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                >
                  <span className="font-mono text-muted-foreground">{highlightMatch(loc.zip, location)}</span>
                  <span>{highlightMatch(loc.city, location)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Umkreis Select */}
      <div className="w-full space-y-2 lg:w-44">
        <Label htmlFor="radius-select" className="text-sm font-medium">
          Umkreis
        </Label>
        <Select value={radiusKm.toString()} onValueChange={(value) => setRadiusKm(Number(value))}>
          <SelectTrigger id="radius-select" className="h-12 text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RADIUS_OPTIONS.map((radius) => (
              <SelectItem key={radius} value={radius.toString()}>
                {radius} km
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium opacity-0 lg:block">Action</Label>
        <Button onClick={handleSearch} disabled={!location} className="h-12 w-full text-base lg:w-auto">
          <Search className="mr-2 h-5 w-5" />
          Suchen
        </Button>
      </div>
    </div>
  )
}

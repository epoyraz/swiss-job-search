"use client"

import { useLocale } from "next-intl"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Globe } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { locales, localeNames, type Locale } from "@/i18n"

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const switchLanguage = (newLocale: Locale) => {
    // Remove the current locale from the pathname
    const pathnameWithoutLocale = pathname.replace(`/${locale}`, "") || "/"
    
    // Add the new locale if it's not the default
    const newPath = newLocale === "de" 
      ? pathnameWithoutLocale 
      : `/${newLocale}${pathnameWithoutLocale}`
    
    // Preserve query parameters
    const search = searchParams.toString()
    const fullPath = search ? `${newPath}?${search}` : newPath
    
    router.push(fullPath)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-10 w-10">
          <Globe className="h-5 w-5" />
          <span className="sr-only">Sprache wechseln</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => switchLanguage(loc)}
            className={locale === loc ? "bg-accent" : ""}
          >
            {localeNames[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

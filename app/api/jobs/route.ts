import { NextRequest, NextResponse } from "next/server"
import Database from "better-sqlite3"
import path from "path"

interface JobRow {
  id: string | null
  publizierungdatum: string | null
  title: string | null
  arbeitsort: string | null
  plz: string | null
  stadt: string | null
  land: string | null
  pensum_min: number | null
  pensum_max: number | null
  vertragsart: string | null
  company: string | null
  link: string | null
  profession: string | null
}

let db: Database.Database | null = null

function getDatabase() {
  if (!db) {
    const dbPath = path.join(process.cwd(), "postleitzahlen.db")
    db = new Database(dbPath, { readonly: true })
  }
  return db
}

function formatWorkload(min: number | null, max: number | null) {
  if (min && max) {
    return `${min} - ${max}%`
  }
  if (min) {
    return `${min}%`
  }
  if (max) {
    return `${max}%`
  }
  return "Keine Angabe"
}

function formatPostedDate(value: string | null) {
  if (!value) return "Unbekannt"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const profession = searchParams.get("profession")?.trim()
  const plzParam = searchParams.get("plz")?.trim()
  const plzsParam = searchParams.get("plzs")?.trim()
  const limit = Math.min(Number(searchParams.get("limit") || "200"), 500)

  if (!profession && !plzParam && !plzsParam) {
    return NextResponse.json({ error: "profession or plz parameter required" }, { status: 400 })
  }

  try {
    const database = getDatabase()
    const conditions: string[] = []
    const values: Array<string | number> = []
    const jobsById = new Map<string, JobRow>()

    if (profession) {
      conditions.push("profession LIKE ?")
      values.push(`%${profession}%`)
    }

    const plzs = plzsParam
      ? plzsParam.split(",").map((p) => p.trim()).filter(Boolean)
      : plzParam
        ? [plzParam]
        : []

    const baseQuery = `
      SELECT
        id,
        publizierungdatum,
        "Titel" as title,
        "Arbeitsort" as arbeitsort,
        plz,
        stadt,
        land,
        pensum_min,
        pensum_max,
        "Vertragsart" as vertragsart,
        "name der firma" as company,
        "link zur ausschreibung" as link,
        profession
      FROM jobs
    `

    const runQuery = (extraConditions: string[], extraValues: Array<string | number>) => {
      const whereClause = [...conditions, ...extraConditions]
      const stmt = database.prepare(`
        ${baseQuery}
        WHERE ${whereClause.join(" AND ")}
        ORDER BY publizierungdatum DESC
        LIMIT ?
      `)
      const rows = stmt.all(...values, ...extraValues, limit) as JobRow[]
      for (const row of rows) {
        const key = row.id || `${row.title}-${row.company}-${row.publizierungdatum}`
        if (!jobsById.has(key)) {
          jobsById.set(key, row)
        }
      }
    }

    if (plzs.length > 0) {
      const chunkSize = 400
      for (let i = 0; i < plzs.length; i += chunkSize) {
        const chunk = plzs.slice(i, i + chunkSize)
        const plzConditions = chunk.map(() => "plz LIKE ?")
        const extraConditions = [`(${plzConditions.join(" OR ")})`]
        const extraValues = chunk.map((plz) => `%${plz}%`)
        runQuery(extraConditions, extraValues)
      }
    } else {
      runQuery([], [])
    }

    const rows = Array.from(jobsById.values()).slice(0, limit)
    const jobs = rows.map((row) => {
      const title = row.title || row.profession || "Unbekannte Stelle"
      const location =
        row.arbeitsort ||
        [row.stadt, row.land].filter(Boolean).join(", ") ||
        "Unbekannt"
      const postedDate = formatPostedDate(row.publizierungdatum)
      const contractType = row.vertragsart || "Keine Angabe"
      const company = row.company || "Unbekannt"
      const workload = formatWorkload(row.pensum_min, row.pensum_max)
      const description = row.link
        ? "Details findest du in der Ausschreibung."
        : "Keine Beschreibung verfuegbar."

      return {
        id: row.id || `${title}-${company}-${postedDate}`,
        title,
        company,
        location,
        plz: row.plz || "",
        workload,
        contractType,
        postedDate,
        description,
        requirements: row.link ? ["Siehe Ausschreibung."] : [],
        benefits: [],
        link: row.link || undefined,
      }
    })

    return NextResponse.json(jobs)
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to load jobs" }, { status: 500 })
  }
}

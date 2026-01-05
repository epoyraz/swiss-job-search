import { NextRequest, NextResponse } from "next/server"
import Database from "better-sqlite3"
import path from "path"

interface LocationRow {
  gemeindename: string
  plz: string
  longitude: number
  latitude: number
}

// Singleton-Pattern für die Datenbank-Verbindung
let db: Database.Database | null = null

function getDatabase() {
  if (!db) {
    const dbPath = path.join(process.cwd(), "postleitzahlen.db")
    db = new Database(dbPath, { readonly: true })
  }
  return db
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")?.trim() || ""
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50)

  if (query.length < 1) {
    return NextResponse.json([])
  }

  try {
    const database = getDatabase()
    
    // Suche nach PLZ oder Gemeindename
    // Gruppiere nach PLZ + Gemeinde um Duplikate zu vermeiden
    const stmt = database.prepare(`
      SELECT DISTINCT gemeindename, plz, 
             AVG(longitude) as longitude, 
             AVG(latitude) as latitude
      FROM postleitzahlen 
      WHERE plz LIKE ? OR gemeindename LIKE ?
      GROUP BY plz, gemeindename
      ORDER BY 
        CASE 
          WHEN plz = ? THEN 0
          WHEN plz LIKE ? THEN 1
          WHEN gemeindename LIKE ? THEN 2
          ELSE 3
        END,
        plz ASC
      LIMIT ?
    `)

    const results = stmt.all(
      `${query}%`,           // PLZ beginnt mit
      `%${query}%`,          // Gemeinde enthält
      query,                 // Exakte PLZ-Übereinstimmung
      `${query}%`,           // PLZ beginnt mit (für Sortierung)
      `${query}%`,           // Gemeinde beginnt mit (für Sortierung)
      limit
    ) as LocationRow[]

    const locations = results.map((row) => ({
      city: row.gemeindename,
      zip: row.plz,
      longitude: row.longitude,
      latitude: row.latitude,
    }))

    return NextResponse.json(locations)
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json(
      { error: "Failed to search locations" },
      { status: 500 }
    )
  }
}

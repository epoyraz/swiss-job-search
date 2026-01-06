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

// Funktion zum Normalisieren von Umlauten und Sonderzeichen
function normalizeString(str: string): string {
  return str
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/Ä/g, "A")
    .replace(/Ö/g, "O")
    .replace(/Ü/g, "U")
    .replace(/ß/g, "ss")
    .replace(/é/g, "e")
    .replace(/è/g, "e")
    .replace(/ê/g, "e")
    .replace(/à/g, "a")
    .replace(/â/g, "a")
    .replace(/ô/g, "o")
    .replace(/û/g, "u")
    .replace(/ç/g, "c")
    .replace(/É/g, "E")
    .replace(/È/g, "E")
    .replace(/Ê/g, "E")
    .replace(/À/g, "A")
    .replace(/Â/g, "A")
    .replace(/Ô/g, "O")
    .replace(/Û/g, "U")
    .replace(/Ç/g, "C")
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
    
    // Normalisiere die Suchanfrage für bessere Treffer
    const normalizedQuery = normalizeString(query)
    
    // Suche nach PLZ oder Gemeindename (mit und ohne Umlaute/Sonderzeichen)
    // Gruppiere nach PLZ + Gemeinde um Duplikate zu vermeiden
    const stmt = database.prepare(`
      WITH normalized AS (
        SELECT 
          gemeindename,
          plz,
          AVG(longitude) as longitude,
          AVG(latitude) as latitude,
          REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
              gemeindename, 
              'ä', 'a'), 'ö', 'o'), 'ü', 'u'), 'Ä', 'A'), 'Ö', 'O'), 'Ü', 'U'),
              'é', 'e'), 'è', 'e'), 'ê', 'e'), 'à', 'a'), 'ç', 'c'), 'û', 'u') as normalized_name
        FROM postleitzahlen
        GROUP BY plz, gemeindename
      )
      SELECT gemeindename, plz, longitude, latitude
      FROM normalized
      WHERE plz LIKE ? 
         OR gemeindename LIKE ?
         OR normalized_name LIKE ?
      ORDER BY 
        CASE 
          WHEN plz = ? THEN 0
          WHEN plz LIKE ? THEN 1
          WHEN gemeindename LIKE ? THEN 2
          WHEN normalized_name LIKE ? THEN 3
          ELSE 4
        END,
        plz ASC
      LIMIT ?
    `)

    const results = stmt.all(
      `${query}%`,                 // PLZ beginnt mit
      `%${query}%`,                // Gemeinde enthält (original)
      `%${normalizedQuery}%`,      // Gemeinde enthält (normalisiert)
      query,                       // Exakte PLZ-Übereinstimmung
      `${query}%`,                 // PLZ beginnt mit (für Sortierung)
      `${query}%`,                 // Gemeinde beginnt mit (für Sortierung)
      `${normalizedQuery}%`,       // Gemeinde normalisiert beginnt mit (für Sortierung)
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

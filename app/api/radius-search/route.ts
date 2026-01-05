import { NextRequest, NextResponse } from "next/server"
import Database from "better-sqlite3"
import path from "path"

interface RadiusRow {
  target_plzs: string
}

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
  const plz = searchParams.get("plz")?.trim()
  const radiusKm = parseInt(searchParams.get("radius") || "25")

  if (!plz) {
    return NextResponse.json({ error: "PLZ parameter required" }, { status: 400 })
  }

  // Validiere Radius
  const validRadii = [5, 10, 25, 50, 100]
  if (!validRadii.includes(radiusKm)) {
    return NextResponse.json(
      { error: `Invalid radius. Valid values: ${validRadii.join(", ")}` },
      { status: 400 }
    )
  }

  try {
    const database = getDatabase()

    // Hole die vorberechneten PLZ im Radius
    const radiusStmt = database.prepare(`
      SELECT target_plzs FROM plz_radius 
      WHERE source_plz = ? AND radius_km = ?
    `)
    const radiusResult = radiusStmt.get(plz, radiusKm) as RadiusRow | undefined

    if (!radiusResult) {
      return NextResponse.json({ 
        error: "PLZ not found",
        plz,
        radiusKm,
        results: []
      }, { status: 404 })
    }

    // Parse die PLZ-Liste
    const targetPlzs = radiusResult.target_plzs 
      ? radiusResult.target_plzs.split(",").filter(Boolean)
      : []

    // Füge die Quell-PLZ hinzu (ist immer im eigenen Radius)
    const allPlzs = [plz, ...targetPlzs]

    // Hole die Details zu allen PLZ
    if (allPlzs.length === 0) {
      return NextResponse.json({
        plz,
        radiusKm,
        count: 0,
        results: []
      })
    }

    // Baue Query für alle PLZ
    const placeholders = allPlzs.map(() => "?").join(",")
    const detailsStmt = database.prepare(`
      SELECT DISTINCT gemeindename, plz, 
             AVG(longitude) as longitude, 
             AVG(latitude) as latitude
      FROM postleitzahlen 
      WHERE plz IN (${placeholders})
      GROUP BY plz, gemeindename
      ORDER BY plz ASC
    `)
    
    const results = detailsStmt.all(...allPlzs) as LocationRow[]

    return NextResponse.json({
      plz,
      radiusKm,
      count: results.length,
      results: results.map(r => ({
        plz: r.plz,
        city: r.gemeindename,
        longitude: r.longitude,
        latitude: r.latitude
      }))
    })

  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json(
      { error: "Failed to search radius" },
      { status: 500 }
    )
  }
}

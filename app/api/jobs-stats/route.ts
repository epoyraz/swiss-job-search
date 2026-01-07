import { NextResponse } from "next/server"
import Database from "better-sqlite3"
import path from "path"

interface StatsRow {
  job_count: number
  company_count: number
}

let db: Database.Database | null = null

function getDatabase() {
  if (!db) {
    const dbPath = path.join(process.cwd(), "postleitzahlen.db")
    db = new Database(dbPath, { readonly: true })
  }
  return db
}

export async function GET() {
  try {
    const database = getDatabase()
    const row = database.prepare(`
      SELECT
        COUNT(*) as job_count,
        COUNT(DISTINCT "name der firma") as company_count
      FROM jobs
      WHERE "name der firma" IS NOT NULL AND TRIM("name der firma") != ''
    `).get() as StatsRow

    return NextResponse.json({
      jobCount: row.job_count || 0,
      companyCount: row.company_count || 0,
    })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 })
  }
}

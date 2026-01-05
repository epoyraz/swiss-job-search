# Swiss Job Search

Eine moderne Web-Applikation zur Jobsuche in der Schweiz mit intelligenter Postleitzahlen-basierter Radius-Suche.

## 🎯 Features

- **Berufsbezeichnung Eingabe**: Suche nach spezifischen Jobtiteln
- **PLZ/Stadt Autocomplete**: Intelligente Vorschläge aus 3.190 Schweizer Postleitzahlen
- **Radius-Suche**: Vorberechnete Umkreissuche (5, 10, 25, 50, 100 km)
- **Schnelle Performance**: SQLite-basierte Datenbank mit optimierten Lookups
- **Moderne UI**: Gebaut mit Next.js, React und Tailwind CSS

## 🚀 Tech Stack

- **Framework**: Next.js 16 mit Turbopack
- **Runtime**: Bun
- **UI**: React 19, Tailwind CSS, shadcn/ui
- **Datenbank**: SQLite mit better-sqlite3
- **Geolocation**: Haversine-Distanzberechnung

## 📊 Datenbank

Die Anwendung nutzt offizielle Schweizer Postleitzahlen-Daten:

- **5.712** Einträge mit Gemeindename, PLZ und Koordinaten
- **3.190** einzigartige Postleitzahlen
- Vorberechnete Radius-Daten für schnelle Suchen:
  - 5 km: ~9 PLZ durchschnittlich
  - 10 km: ~34 PLZ durchschnittlich
  - 25 km: ~174 PLZ durchschnittlich
  - 50 km: ~549 PLZ durchschnittlich
  - 100 km: ~1.466 PLZ durchschnittlich

## 🛠️ Installation

```bash
# Dependencies installieren
bun install

# Entwicklungsserver starten
bun dev
```

Die Anwendung läuft auf [http://localhost:3000](http://localhost:3000)

## 📁 Projektstruktur

```
├── app/
│   ├── api/
│   │   ├── locations/       # PLZ Autocomplete API
│   │   └── radius-search/   # Radius-Suche API
│   └── page.tsx             # Hauptseite
├── components/
│   ├── location-search-widget.tsx  # Suchformular
│   └── ui/                  # shadcn/ui Komponenten
├── postleitzahlen.db        # SQLite Datenbank
└── package.json
```

## 🗄️ Datenbank Schema

### Tabelle: `postleitzahlen`
| Spalte        | Typ    | Beschreibung          |
|---------------|--------|-----------------------|
| id            | INTEGER| Primary Key           |
| gemeindename  | TEXT   | Name der Gemeinde     |
| plz           | TEXT   | Postleitzahl (4-stellig) |
| longitude     | REAL   | Längengrad            |
| latitude      | REAL   | Breitengrad           |

### Tabelle: `plz_radius`
| Spalte        | Typ    | Beschreibung          |
|---------------|--------|-----------------------|
| id            | INTEGER| Primary Key           |
| source_plz    | TEXT   | Ausgangs-PLZ          |
| radius_km     | INTEGER| Radius in km          |
| target_plzs   | TEXT   | Komma-separierte PLZ-Liste |

## 🌐 API Endpoints

### `/api/locations?q={query}&limit={limit}`
Autocomplete-Suche nach PLZ oder Gemeindename

**Response:**
```json
[
  {
    "zip": "8001",
    "city": "Zürich",
    "longitude": 8.542453659086647,
    "latitude": 47.372299638914726
  }
]
```

### `/api/radius-search?plz={plz}&radius={km}`
Radius-Suche um eine Postleitzahl

**Response:**
```json
{
  "plz": "8001",
  "radiusKm": 10,
  "count": 82,
  "results": [...]
}
```

## 📝 Lizenz

MIT

## 👤 Autor

Erstellt mit ❤️ für die Schweizer Jobsuche

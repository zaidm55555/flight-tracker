# FlightPulse

Flight price tracker with a React SPA frontend, Flask API backend, and MongoDB storage. Scrapes Google Flights via Playwright every 4 hours (GitHub Actions cron). PWA-enabled with price history charts.

## Live

**[flight-tracker-0yjb.onrender.com](https://flight-tracker-0yjb.onrender.com)**

## Stack

- **Frontend**: React 18 + Vite + React Router + Chart.js (PWA)
- **Backend**: Flask (Python) — pure JSON API
- **Database**: MongoDB Atlas (`flight_db`)
- **Scraper**: Playwright + BeautifulSoup (Google Flights)
- **Deploy**: Render (web service) + GitHub Actions (scraper cron)

## Project Structure

```
flight_scraper.py    # Google Flights scraper (Playwright)
webapp.py            # Flask API server (serves SPA from frontend/dist/)
init_routes.py       # Seed tracked_routes collection
requirements.txt     # Python dependencies
render.yaml          # Render deploy config
frontend/
├── src/             # React app source
│   ├── pages/       # Home, SearchResults, AddRoute, ManageRoutes
│   ├── components/  # AirportAutocomplete, PriceChart, Spinner
│   └── api.js       # API client
├── public/          # Static assets (manifest, icons, sw, airports.json)
├── dist/            # Built output (served by Flask in production)
└── vite.config.js
```

## Local Development

```bash
# Backend
python3 webapp.py              # Flask on :5000

# Frontend (separate terminal, hot reload)
cd frontend && npm run dev     # Vite on :3000 (proxies /api to :5000)
```

## Scraper

```bash
python3 flight_scraper.py --from AMD --to BLR --date 2026-08-11 --save-db

# Scrape all active routes
python3 flight_scraper.py --all --save-db
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/routes` | List all tracked routes |
| POST | `/api/routes` | Add a new route |
| DELETE | `/api/routes/<id>` | Delete a route |
| POST | `/api/routes/<id>/toggle` | Pause/resume a route |
| GET | `/search?from=X&to=Y&date=Z` | Search flights (JSON) |
| GET | `/api/history?flight_id=X&from=Y&to=Z` | Price history for a flight |
| GET | `/api/stats` | Global stats |

## Deployment

Pushes to `main` auto-deploy on Render. The scraper runs every 4 hours via GitHub Actions (`.github/workflows/scrape.yml`).

# Flight Price Scraper — Agent Handoff Document

> **Purpose**: This document gives an AI agent full context to continue development on this project without any prior conversation history.

---

## Project Overview

A Python CLI script that scrapes **live one-way flight prices and details** for any route and date using a Playwright-controlled Chromium browser pointed at Google Flights. Results are printed to terminal and exported as JSON and CSV files. Optional MongoDB saving is supported.

---

## Project Location

```
/Users/zaidbhimala/Desktop/flight price/
```

---

## File Structure

```
flight price/
├── flight_scraper.py        # Main script — only file to edit
├── requirements.txt         # Python dependencies
├── atlas-credentials.env    # MongoDB URI (gitignored, do not expose)
├── README.md                # User-facing usage documentation
├── AGENT_README.md          # This file
└── .venv/                   # Python virtual environment (do not modify)
```

---

## Tech Stack

| Component | Technology |
|---|---|
| Language | Python 3 |
| Browser Automation | Playwright (Chromium, headless) |
| HTML Parsing | BeautifulSoup4 + lxml |
| Data Source | Google Flights (google.com/travel/flights) |
| Output | Terminal table (tabulate), JSON, CSV |
| Optional DB | MongoDB Atlas (pymongo) |
| Env Secrets | python-dotenv (atlas-credentials.env) |

---

## Environment Setup

The virtual environment is already created at `.venv/`. To activate and run:

```bash
cd "/Users/zaidbhimala/Desktop/flight price"
source .venv/bin/activate
python3 flight_scraper.py --from BDQ --to BLR --date 2026-08-11
```

To reinstall dependencies from scratch:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

---

## How the Scraper Works

1. **URL Construction** — Builds a Google Flights natural-language search URL:
   ```
   https://www.google.com/travel/flights?q=One+way+flights+from+BDQ+to+BLR+on+2026-08-11&curr=INR&hl=en
   ```

2. **Playwright Scraping** — Launches headless Chromium, navigates to the URL, waits for `<li>` elements to attach, scrolls slightly, then queries all `<li>` elements.

3. **Flight Card Detection** — Each `<li>` is checked for the presence of:
   - A time pattern (`\d{1,2}:\d{2} AM/PM`)
   - A price pattern (`₹/$/€/£ followed by digits`)
   If both match, it's treated as a flight card.

4. **Parsing** (`parse_flight_card`) — Uses regex on inner text to extract:
   - Price (formatted string + numeric int)
   - Departure & arrival times (first two distinct time matches)
   - Duration (X hr Y min)
   - Stops (Nonstop / 1 stop / 2 stops)
   - Layover info (city + duration if connecting)
   - Airline (matched against a hardcoded list of known airlines)
   - Flight number (IATA code pattern XX 1234)

5. **Deduplication** — Flights are deduplicated by a key of `airline_deptime_arrtime_price`.

6. **Output** — Displayed as a table, and saved to timestamped `.json` and `.csv` files.

---

## CLI Arguments

```bash
python3 flight_scraper.py \
  --from BDQ \          # Origin IATA airport code (required)
  --to BLR \            # Destination IATA airport code (required)
  --date 2026-08-11 \   # Travel date YYYY-MM-DD (required)
  --flight "IndiGo" \   # Optional: filter by airline or flight number
  --currency INR \      # Optional: currency (default INR)
  --output all \        # Optional: console | json | csv | all (default all)
  --save-db \           # Optional: save results to MongoDB Atlas
  --headed              # Optional: show browser window (debug mode)
```

---

## Output Data Schema

Each flight record (in JSON/CSV) has these fields:

```json
{
  "origin": "BDQ",
  "destination": "BLR",
  "date": "2026-08-11",
  "airline": "IndiGo",
  "flight_number": "N/A",
  "departure_time": "6:20 PM",
  "arrival_time": "8:35 PM",
  "duration": "2 hr 15 min",
  "stops": "Nonstop",
  "layover": "Direct",
  "price_formatted": "₹8,400",
  "price_numeric": 8400,
  "scraped_at": "2026-07-27T17:41:00Z",
  "raw_summary": "<first 150 chars of card text for debugging>"
}
```

Output files are named: `flights_{ORIGIN}_{DEST}_{DATE}_{TIMESTAMP}.json / .csv`

---

## MongoDB Integration

- Connection URI is loaded from `atlas-credentials.env` via `python-dotenv`
- Database: `flight_db`, Collection: `flight_prices`
- Only active when `--save-db` flag is passed
- The `.env` file key is `MONGODB_URI`

---

## Known Limitations & Issues

| Issue | Details |
|---|---|
| **Flight number often N/A** | Google Flights doesn't always show IATA codes in list item text; would need to click into each card |
| **Dynamic results** | Google Flights is JavaScript-heavy; the script waits 4s after load + scroll to trigger lazy loading |
| **Anti-bot risk** | Google may return consent walls or CAPTCHAs; the script handles basic consent modals but not full CAPTCHAs |
| **Skyscanner removed** | Skyscanner was attempted but always hit Akamai/PerimeterX bot protection — all Skyscanner code has been removed |
| **Prices can vary** | Google Flights shows "typical" prices; actual booking prices may differ slightly |
| **Overnight flights** | Arrival times past midnight show correctly but the date is not incremented in the data |

---

## Suggested Next Improvements

1. **Flight number extraction** — Click into each flight card to get the actual IATA flight number (e.g. 6E 2345)
2. **Round-trip support** — Add `--return-date` flag to scrape return flights
3. **Price history / tracking** — Run on a schedule and save to MongoDB to track price changes over time
4. **Multiple dates** — Add `--date-range` to scan several consecutive days
5. **Email/Slack alerts** — Alert when price drops below a threshold
6. **Layover city details** — Currently shows "Connecting Flight" fallback; improve regex to reliably extract layover city
7. **Web UI / dashboard** — A simple Flask or FastAPI web app to query and visualize results
8. **Proxy rotation** — To avoid Google rate-limiting on repeated runs

---

## Running a Quick Test

```bash
source .venv/bin/activate
python3 flight_scraper.py --from BOM --to DEL --date 2026-09-01
```

Expected: 4–10 flights printed as a table, plus two output files created in the project directory.

---

## Important Notes for Agent

- **Do NOT edit** `.venv/`, `atlas-credentials.env`, or `AGENT_README.md` unless specifically asked.
- **The only file that needs editing** for feature changes is `flight_scraper.py`.
- Always **activate the venv** before running: `source .venv/bin/activate`
- The scraper targets `<li>` elements — if Google Flights changes its DOM structure, the selector logic in `scrape()` (around line 167–179 of `flight_scraper.py`) will need updating.
- Use `--headed` flag to visually debug what the browser sees.

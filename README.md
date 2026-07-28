# Skyscanner Flight Price & Details Scraper

A Python script to scrape live flight prices and detailed flight information exclusively from **Skyscanner** using **Playwright**.

## Features

- **100% Skyscanner Dedicated**: Extracts real-time flight details directly from Skyscanner (`https://www.skyscanner.co.in/`).
- **Extracted Flight Information**:
  - Airline Name
  - Flight Number
  - Departure & Arrival Times
  - Total Duration
  - Nonstop vs. Connecting & Layover Info
  - Ticket Price & Currency Symbol
- **Filter Specific Flight**: Filter by flight number or airline name (e.g. `--flight "IndiGo"`).
- **Multiple Output Options**:
  - Formatted ASCII table in CLI.
  - Export to `.json` file (`skyscanner_flights_*.json`).
  - Export to `.csv` file (`skyscanner_flights_*.csv`).
  - Optional saving to **MongoDB** (using `atlas-credentials.env`).

---

## Setup & Installation

```bash
# Activate virtual environment
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Install Playwright Chromium browser
playwright install chromium
```

---

## Usage Instructions

```bash
# Run Skyscanner scraper for Ahmedabad (AMD) to Bangalore (BLR) on August 12, 2026
python3 flight_scraper.py --from AMD --to BLR --date 2026-08-12
```

### 💡 Bypassing Skyscanner Akamai Bot Protection
Skyscanner uses Akamai Bot Detection against automated headless browsers. To view Skyscanner results in a visible browser window, run with the `--headed` flag:

```bash
python3 flight_scraper.py --from AMD --to BLR --date 2026-08-12 --headed
```

---

## Command Line Arguments Reference

| Argument | Short | Description | Example |
| :--- | :--- | :--- | :--- |
| `--from` | `-f` | Origin airport code or city | `AMD`, `BLR`, `BOM` |
| `--to` | `-t` | Destination airport code or city | `BLR`, `DEL`, `LAX` |
| `--date` | `-d` | Travel date (`YYYY-MM-DD`) | `2026-08-12` |
| `--flight` | `-fl` | (Optional) Specific flight number or airline filter | `6E 5322` or `IndiGo` |
| `--output` | `-o` | Output format (`console`, `json`, `csv`, `all`) | `all` (Default: `all`) |
| `--save-db` | - | Save results to MongoDB database | `--save-db` |
| `--headed` | - | Run browser in visible window mode | `--headed` |

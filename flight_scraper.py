#!/usr/bin/env python3
"""
Flight Price & Details Scraper
Scrapes live flight prices and detailed information for any route on a specified date.
Uses fuzzy flight IDs so the same flight is tracked across scrapes even if times shift slightly.
"""

import sys
import os
import re
import json
import csv
import hashlib
import argparse
from datetime import datetime
from bs4 import BeautifulSoup
from dotenv import load_dotenv

try:
    import pymongo
    HAS_PYMONGO = True
except ImportError:
    HAS_PYMONGO = False

try:
    from tabulate import tabulate
    HAS_TABULATE = True
except ImportError:
    HAS_TABULATE = False

load_dotenv("atlas-credentials.env")


class FlightScraper:
    def __init__(self, headless=True, timeout=35000):
        self.headless = headless
        self.timeout = timeout

    def build_search_url(self, origin, destination, date_str, currency="INR"):
        formatted_origin = origin.strip().upper()
        formatted_dest = destination.strip().upper()
        query = f"One way flights from {formatted_origin} to {formatted_dest} on {date_str}"
        return f"https://www.google.com/travel/flights?q={query.replace(' ', '%20')}&curr={currency.upper()}&hl=en"

    def parse_flight_card(self, card_html, origin, destination, travel_date):
        soup = BeautifulSoup(card_html, 'html.parser')
        card_text = soup.get_text(separator=' | ')

        # Price extraction
        price_match = re.search(r'([$₹€£]\s*[\d,]+)', card_text)
        price_str = price_match.group(1) if price_match else "N/A"

        numeric_price = None
        if price_str != "N/A":
            digits = re.sub(r'[^\d]', '', price_str)
            if digits:
                numeric_price = int(digits)

        # Departure & Arrival times
        time_matches = re.findall(r'\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\b', card_text)
        distinct_times = []
        for t in time_matches:
            if not distinct_times or t != distinct_times[-1]:
                distinct_times.append(t)

        dep_time = distinct_times[0] if len(distinct_times) > 0 else "N/A"
        arr_time = distinct_times[1] if len(distinct_times) > 1 else "N/A"

        # Duration
        duration_match = re.search(r'(\d+\s*hr(?:\s*\d+\s*min)?|\d+\s*h(?:\s*\d+\s*m)?)', card_text, re.IGNORECASE)
        duration = duration_match.group(1).strip() if duration_match else "N/A"

        # Stops
        stops_match = re.search(r'(Nonstop|\d+\s*stop[s]?)', card_text, re.IGNORECASE)
        stops = stops_match.group(1).strip() if stops_match else "N/A"

        # Layover
        layover = "Direct"
        if stops.lower() != "nonstop" and stops != "N/A":
            layover_match = re.search(r'(\d+\s*hr\s*\d+\s*min\s+in\s+[^|]+)', card_text, re.IGNORECASE)
            layover = layover_match.group(1).strip() if layover_match else "Connecting Flight"

        # Airline detection
        known_airlines = [
            "IndiGo", "Air India", "Vistara", "Akasa Air", "SpiceJet", "Air India Express",
            "Emirates", "Qatar Airways", "Etihad", "Delta", "United", "American",
            "British Airways", "Lufthansa", "Air France", "KLM", "Singapore Airlines",
            "Cathay Pacific", "Turkish Airlines", "Swiss", "Japan Airlines", "ANA",
            "Qantas", "Virgin Atlantic", "Gulf Air", "Oman Air", "Saudi", "Flydubai"
        ]
        detected_airline = "Unknown Airline"
        for airline in known_airlines:
            if re.search(r'\b' + re.escape(airline) + r'\b', card_text, re.IGNORECASE):
                detected_airline = airline
                break

        if detected_airline == "Unknown Airline":
            parts = [p.strip() for p in card_text.split('|') if p.strip()]
            for p in parts:
                if not re.search(r'[\d$₹€£]', p) and p.lower() not in ['nonstop', 'round trip', 'one way', 'select flight']:
                    if 2 < len(p) < 30:
                        detected_airline = p
                        break

        flight_code_match = re.search(r'\b([A-Z0-9]{2}\s*\d{3,4})\b', card_text)
        flight_number = flight_code_match.group(1) if flight_code_match else "N/A"

        return {
            "origin": origin.strip().upper(),
            "destination": destination.strip().upper(),
            "date": travel_date,
            "airline": detected_airline,
            "flight_number": flight_number,
            "departure_time": dep_time,
            "arrival_time": arr_time,
            "duration": duration,
            "stops": stops,
            "layover": layover,
            "price_formatted": price_str,
            "price_numeric": numeric_price,
            "scraped_at": datetime.utcnow().isoformat() + "Z",
            "raw_summary": card_text[:150]
        }

    def scrape(self, origin, destination, travel_date, flight_filter=None, currency="INR", click_cards=True):
        from playwright.sync_api import sync_playwright

        url = self.build_search_url(origin, destination, travel_date, currency)
        print(f"[+] Launching browser...")
        print(f"[+] Navigating to: {url}")

        flights_list = []

        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=self.headless,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-blink-features=AutomationControlled",
                    "--lang=en-US,en"
                ]
            )
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 900},
                locale="en-US"
            )
            page = context.new_page()

            try:
                page.goto(url, wait_until="domcontentloaded", timeout=self.timeout)

                # Dismiss consent modal if present
                try:
                    btn = page.query_selector('button:has-text("Reject all"), button:has-text("I agree"), button:has-text("Accept all")')
                    if btn:
                        btn.click()
                        page.wait_for_timeout(1000)
                except Exception:
                    pass

                page.wait_for_selector('li', state='attached', timeout=15000)
                page.wait_for_timeout(4000)
                page.evaluate("window.scrollBy(0, 1000)")
                page.wait_for_timeout(1500)

                all_lis = page.query_selector_all('li')
                print(f"[+] Scanning {len(all_lis)} candidate elements...")

                card_elements = []
                for el in all_lis:
                    try:
                        txt = el.inner_text().strip()
                        if re.search(r'\d{1,2}:\d{2}\s*(?:AM|PM)', txt, re.IGNORECASE) and re.search(r'[$₹€£]\s*[\d,]+', txt):
                            card_html = el.inner_html()
                            flight_data = self.parse_flight_card(card_html, origin, destination, travel_date)
                            if flight_data["price_formatted"] != "N/A" or flight_data["departure_time"] != "N/A":
                                flights_list.append(flight_data)
                                card_elements.append(el)
                    except Exception:
                        continue

                if click_cards and card_elements:
                    print(f"[+] Skipping card clicking (Google Flights does not expose IATA flight numbers).")

            except Exception as e:
                print(f"[!] Error during scraping: {e}")
            finally:
                browser.close()

        # Deduplicate within this scrape (exact match)
        unique_flights = []
        seen_keys = set()
        for f in flights_list:
            key = f"{f['airline']}_{f['departure_time']}_{f['arrival_time']}_{f['price_formatted']}"
            if key not in seen_keys:
                seen_keys.add(key)
                unique_flights.append(f)

        # Assign stable fuzzy flight IDs to all flights
        for f in unique_flights:
            f["flight_id"] = generate_flight_id(
                f["airline"], f["departure_time"], f["arrival_time"], f["stops"]
            )

        # Filter by airline / flight number if requested
        if flight_filter:
            ff_lower = flight_filter.strip().lower()
            filtered = [
                f for f in unique_flights
                if ff_lower in f["airline"].lower()
                or ff_lower in f["flight_number"].lower()
                or ff_lower.replace(" ", "") in f["flight_number"].lower().replace(" ", "")
                or ff_lower in f["raw_summary"].lower()
            ]
            print(f"[+] Filter '{flight_filter}': {len(filtered)} match(es) from {len(unique_flights)} total.")
            return filtered

        return unique_flights


def parse_time_to_minutes(t):
    """Convert '8:30 AM' -> minutes since midnight (510)."""
    m = re.match(r'(\d{1,2}):(\d{2})\s*(AM|PM)', t, re.IGNORECASE)
    if not m:
        return None
    h, mi, ampm = int(m.group(1)), int(m.group(2)), m.group(3).upper()
    if ampm == 'PM' and h != 12:
        h += 12
    elif ampm == 'AM' and h == 12:
        h = 0
    return h * 60 + mi


def duration_to_minutes(dur):
    """Convert '2 hr 35 min' -> 155."""
    hr = re.search(r'(\d+)\s*hr', dur)
    mn = re.search(r'(\d+)\s*min', dur)
    return (int(hr.group(1)) * 60 if hr else 0) + (int(mn.group(1)) if mn else 0)


def stops_to_int(stops):
    if 'nonstop' in stops.lower():
        return 0
    m = re.search(r'(\d+)', stops)
    return int(m.group(1)) if m else 1


def generate_flight_id(airline, dep_time, arr_time, stops):
    """Generate a stable flight ID using fuzzy matching.

    Times are rounded to 15-min buckets so minor schedule shifts
    still map to the same flight. Duration is intentionally excluded
    because Google Flights returns inconsistent durations for the same
    flight across scrapes, but arrival time is stable enough to
    distinguish different flights with the same departure time.
    """
    def round_to_bucket(val, bucket=15):
        return round(val / bucket) * bucket

    norm_airline = re.sub(r'\s+', '', airline.strip().lower())

    dep_min = parse_time_to_minutes(dep_time)
    dep_bucket = round_to_bucket(dep_min, 15) if dep_min is not None else dep_time

    arr_min = parse_time_to_minutes(arr_time)
    arr_bucket = round_to_bucket(arr_min, 15) if arr_min is not None else "??"

    stops_n = stops_to_int(stops)

    raw = f"{norm_airline}|{dep_bucket}|{arr_bucket}|{stops_n}"
    short_hash = hashlib.md5(raw.encode()).hexdigest()[:10]
    return f"{norm_airline}_{dep_bucket}_{arr_bucket}_{stops_n}_{short_hash}"


# ------------------------------------------------------------------
# EXPORTERS & DISPLAY
# ------------------------------------------------------------------

def get_mongo_collection(name="flight_prices"):
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri or not HAS_PYMONGO:
        return None, None
    try:
        client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        return client, client["flight_db"][name]
    except Exception as err:
        print(f"[!] MongoDB connection error: {err}")
        return None, None


def get_active_routes():
    """Fetch all active routes from tracked_routes collection, deduped by route."""
    client, col = get_mongo_collection("tracked_routes")
    if col is None:
        return []
    routes = list(col.find({"status": "active"}).sort("added_at", 1))
    seen = set()
    unique = []
    for r in routes:
        key = (r["origin"], r["destination"], r["date"])
        if key not in seen:
            seen.add(key)
            unique.append(r)
    if unique:
        print(f"[+] Loaded {len(unique)} unique active route(s) to scrape (from {len(routes)} tracker(s)):")
        for r in unique:
            print(f"    {r['origin']} → {r['destination']} on {r['date']}")
    else:
        print("[!] No active routes found in tracked_routes.")
    client.close()
    return unique


def scrape_all_routes(currency="INR", click_cards=True, output="console"):
    """Scrape all active routes and save results to MongoDB."""
    routes = get_active_routes()
    if not routes:
        return

    scraper = FlightScraper()
    total_flights = 0

    for route in routes:
        origin = route["origin"]
        dest = route["destination"]
        date = route["date"]
        route_id = f"{origin}_{dest}_{date}"

        print(f"\n{'='*50}")
        print(f" Scraping {origin} → {dest} on {date}")
        print(f"{'='*50}")

        flights = scraper.scrape(
            origin=origin, destination=dest, travel_date=date,
            currency=currency, click_cards=click_cards
        )

        print(f"\n[+] Extracted {len(flights)} flights")

        # Add route_id to each flight
        for f in flights:
            f["route_id"] = route_id

        display_terminal_table(flights)
        total_flights += len(flights)

        if flights and output == "console":
            pass

        # Save to MongoDB
        save_to_mongodb(flights)

        # Update route tracking metadata for every tracker of this route
        update_route_metadata(route, len(flights))

    print(f"\n[+] Scraped {len(routes)} route(s), {total_flights} total flight records.")


def update_route_metadata(route, record_count):
    """Update last_scraped_at and increment scrape_count for all active trackers of a route."""
    client, col = get_mongo_collection("tracked_routes")
    if col is None:
        return
    try:
        col.update_many(
            {"origin": route["origin"], "destination": route["destination"],
             "date": route["date"], "status": "active"},
            {"$set": {"last_scraped_at": datetime.utcnow().isoformat() + "Z"},
             "$inc": {"scrape_count": 1}}
        )
    except Exception as err:
        print(f"[!] Failed to update route metadata: {err}")
    finally:
        client.close()


def save_to_mongodb(flights_data):
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri or not HAS_PYMONGO:
        print("[!] MongoDB URI not found or pymongo not installed. Skipping.")
        return False
    try:
        client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        collection = client["flight_db"]["flight_prices"]
        if isinstance(flights_data, list) and flights_data:
            for f in flights_data:
                if "route_id" not in f:
                    f["route_id"] = f"{f['origin']}_{f['destination']}_{f['date']}"
            result = collection.insert_many(flights_data)
            print(f"[+] Inserted {len(result.inserted_ids)} records into MongoDB.")
            return True
    except Exception as err:
        print(f"[!] MongoDB error: {err}")
    return False


def display_terminal_table(flights):
    if not flights:
        print("\n[!] No flights found matching the criteria.")
        return

    table_data = [
        [
            idx,
            f["airline"],
            f["flight_number"],
            f"{f['departure_time']} → {f['arrival_time']}",
            f["duration"],
            f["stops"],
            f["price_formatted"]
        ]
        for idx, f in enumerate(flights, 1)
    ]
    headers = ["#", "Airline", "Flight No.", "Times (Dep → Arr)", "Duration", "Stops", "Price"]

    if HAS_TABULATE:
        print("\n" + tabulate(table_data, headers=headers, tablefmt="fancy_grid"))
    else:
        print("\n" + "="*80)
        print(f"{'#':<3} | {'Airline':<18} | {'Flight No':<10} | {'Times':<20} | {'Duration':<10} | {'Stops':<8} | {'Price'}")
        print("="*80)
        for row in table_data:
            print(f"{row[0]:<3} | {row[1]:<18} | {row[2]:<10} | {row[3]:<20} | {row[4]:<10} | {row[5]:<8} | {row[6]}")
        print("="*80)


def export_json(flights, filename):
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(flights, f, indent=2, ensure_ascii=False)
    print(f"[+] Exported {len(flights)} flight(s) to: {filename}")


def export_csv(flights, filename):
    if not flights:
        return
    fieldnames = [
        "origin", "destination", "date", "airline", "flight_number",
        "departure_time", "arrival_time", "duration", "stops", "layover",
        "price_formatted", "price_numeric", "scraped_at"
    ]
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(flights)
    print(f"[+] Exported {len(flights)} flight(s) to: {filename}")


def main():
    parser = argparse.ArgumentParser(description="Scrape one-way flight prices and details for a route and date.")
    parser.add_argument("-f", "--from", dest="origin", help="Origin airport code (e.g. BDQ, BOM, JFK)")
    parser.add_argument("-t", "--to", dest="destination", help="Destination airport code (e.g. BLR, DEL, LHR)")
    parser.add_argument("-d", "--date", dest="date", help="Travel date in YYYY-MM-DD format")
    parser.add_argument("--all", action="store_true", help="Scrape all active routes from tracked_routes collection")
    parser.add_argument("-fl", "--flight", dest="flight", default=None, help="Filter by airline or flight number (e.g. IndiGo, 6E 5322)")
    parser.add_argument("-c", "--currency", dest="currency", default="INR", help="Currency code (default: INR)")
    parser.add_argument("-o", "--output", dest="output", choices=["console", "json", "csv", "all"], default="console", help="Output format (default: console)")
    parser.add_argument("--save-db", action="store_true", help="Save results to MongoDB")
    parser.add_argument("--headed", action="store_true", help="Run browser in visible mode")
    parser.add_argument("--no-click", action="store_true", help="Skip clicking cards for flight numbers (faster)")

    args = parser.parse_args()

    if args.all:
        scrape_all_routes(currency=args.currency, click_cards=not args.no_click, output=args.output)
        return

    if not all([args.origin, args.destination, args.date]):
        parser.error("--from, --to, and --date are required unless --all is used")

    try:
        datetime.strptime(args.date, "%Y-%m-%d")
    except ValueError:
        print("[!] Invalid date format. Use YYYY-MM-DD (e.g. 2026-08-11).")
        sys.exit(1)

    print(f"==================================================")
    print(f" FLIGHT PRICE & DETAILS SCRAPER")
    print(f" Route   : {args.origin.upper()} ➔ {args.destination.upper()}")
    print(f" Date    : {args.date}")
    print(f" Currency: {args.currency.upper()}")
    if args.flight:
        print(f" Filter  : {args.flight}")
    print(f"==================================================")

    scraper = FlightScraper(headless=not args.headed)
    flights = scraper.scrape(
        origin=args.origin,
        destination=args.destination,
        travel_date=args.date,
        flight_filter=args.flight,
        currency=args.currency,
        click_cards=not args.no_click
    )

    print(f"\n[+] Total flights extracted: {len(flights)}")
    display_terminal_table(flights)

    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    route = f"{args.origin.upper()}_{args.destination.upper()}_{args.date}"

    if args.output in ["json", "all"]:
        export_json(flights, f"flights_{route}_{timestamp_str}.json")

    if args.output in ["csv", "all"]:
        export_csv(flights, f"flights_{route}_{timestamp_str}.csv")

    if args.save_db:
        save_to_mongodb(flights)

    print("\n[+] Done!")


if __name__ == "__main__":
    main()

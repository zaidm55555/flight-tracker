#!/usr/bin/env python3
"""
ixigo Flight Price & Details Scraper

Scrapes live flight prices and detailed information for any route on a specified
date using ixigo's internal search/stream API (captured via Playwright, since the
endpoint requires a real browser session for authorization).

Unlike the Google Flights scraper, this reliably returns EVERY flight for the
route/date in a single request — the stream payload contains one entry per flight
(e.g. 44 for BDQ → BLR on 2026-08-11), so validation is simple:
    len(flights) == expected_count
"""

import sys
import re
import json
import csv
import hashlib
import argparse
from datetime import datetime

try:
    from tabulate import tabulate
    HAS_TABULATE = True
except ImportError:
    HAS_TABULATE = False


class IxigoScraper:
    def __init__(self, headless=True, timeout=60000):
        self.headless = headless
        self.timeout = timeout
        self.browser = None

    def build_search_url(self, origin, destination, date_str):
        """Build the ixigo search results URL.

        date_str must be 'YYYY-MM-DD'; ixigo expects 'DDMMYYYY'.
        """
        orig = origin.strip().upper()
        dest = destination.strip().upper()
        dd = datetime.strptime(date_str, "%Y-%m-%d")
        ixigo_date = dd.strftime("%d%m%Y")
        return (
            f"https://www.ixigo.com/search/result/flight?"
            f"from={orig}&to={dest}&date={ixigo_date}&adults=1&children=0&infants=0"
            f"&class=e&source=Search+Form&utm_source=chatgpt.com"
        )

    @staticmethod
    def extract_stream_payloads(body_text):
        """Extract JSON payloads from an SSE body.

        ixigo's stream sends one `data:{...}` event per response, but a body can
        occasionally bundle multiple events. Parse each and return the payload
        with the most flightFare entries (the complete search result).
        """
        candidates = []
        for chunk in re.split(r'\n\n(?=data:)', body_text):
            chunk = chunk.strip()
            if not chunk.startswith("data:"):
                continue
            json_text = chunk[len("data:"):].strip()
            try:
                payload = json.loads(json_text)
                candidates.append(payload)
            except (json.JSONDecodeError, ValueError):
                continue
        if not candidates:
            return None

        def fare_count(payload):
            try:
                return sum(
                    len(journey.get("flightFare") or [])
                    for journey in (payload.get("data") or {}).get("flightJourneys") or []
                )
            except Exception:
                return 0

        return max(candidates, key=fare_count)

    def parse_stream_payload(self, payload, origin, destination, travel_date):
        """Convert the ixigo search/stream JSON payload into flight records.

        Expected shape:
            {"data": {"flightJourneys": [{"flightFare": [ ... ]}]}}
        One flightFare entry == one flight (44 for BDQ → BLR).
        """
        flights = []
        data = payload.get("data") or {}
        for journey in data.get("flightJourneys") or []:
            for fare in journey.get("flightFare") or []:
                flight = self.parse_fare_entry(fare, origin, destination, travel_date)
                if flight is not None:
                    flights.append(flight)
        return flights

    def parse_fare_entry(self, fare, origin, destination, travel_date):
        try:
            fd = fare["flightDetails"][0]
            display_fare = fare["fares"][0]["fareDetails"]["displayFare"]
        except (KeyError, IndexError, TypeError):
            return None

        airline = (fd.get("airlineCode") or "").strip() or (fd.get("headerTextWeb") or "").strip()
        flight_numbers = (fd.get("subHeaderTextWeb") or "").strip()
        if not flight_numbers:
            flight_numbers = (fd.get("headerTextWeb") or "").strip()

        dep_time = fd.get("departureTime") or "N/A"
        arr_time = fd.get("arrivalTime") or "N/A"
        stop_count = fd.get("stop", 0)

        duration = "N/A"
        dur_obj = fd.get("duration") or {}
        if dur_obj.get("text"):
            duration = dur_obj["text"]
        elif dur_obj.get("time"):
            h = dur_obj["time"] // 60
            m = dur_obj["time"] % 60
            duration = f"{h}h {m}m" if h else f"{m}m"

        stop_text = "Nonstop" if stop_count == 0 else f"{stop_count} stop" + ("s" if stop_count > 1 else "")

        layover = "Direct"
        if stop_count > 0:
            layover_parts = []
            for lo in fd.get("layover") or []:
                loc = lo.get("location", "")
                dur = lo.get("duration", "")
                if loc and dur:
                    layover_parts.append(f"{dur} in {loc}")
            layover = ", ".join(layover_parts) if layover_parts else "Connecting Flight"

        display_fare_str = f"₹{display_fare:,}" if display_fare else "N/A"

        flight_id = generate_flight_id(
            airline, dep_time, arr_time, stop_count
        )

        return {
            "source": "ixigo",
            "origin": origin.strip().upper(),
            "destination": destination.strip().upper(),
            "date": travel_date,
            "airline": airline,
            "flight_number": flight_numbers,
            "departure_time": dep_time,
            "arrival_time": arr_time,
            "duration": duration,
            "stops": stop_text,
            "layover": layover,
            "price_formatted": display_fare_str,
            "price_numeric": display_fare,
            "scraped_at": datetime.utcnow().isoformat() + "Z",
            "flight_id": flight_id,
            "refundable_type": fare.get("refundableType", "N/A"),
            "raw_summary": json.dumps(fd, ensure_ascii=False)[:150],
        }

    def scrape(self, origin, destination, travel_date):
        """Load the ixigo search page, capture the stream API response, parse flights."""
        from playwright.sync_api import sync_playwright

        url = self.build_search_url(origin, destination, travel_date)
        print(f"[+] Launching browser...")
        print(f"[+] Navigating to: {url}")

        payload = None
        stream_body = None
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
                viewport={"width": 1365, "height": 1200},
                locale="en-US"
            )
            page = context.new_page()

            def on_response(resp):
                nonlocal stream_body
                if "flights/v2/search/stream" in resp.url:
                    try:
                        if resp.status == 200 and "text/event-stream" in resp.headers.get("content-type", ""):
                            body = resp.body()
                            print(f"[+] Captured stream API: {len(body)} bytes")
                            stream_body = body.decode("utf-8", errors="replace")
                    except Exception as e:
                        print(f"[!] Stream capture error: {e}")

            page.on("response", on_response)

            try:
                page.goto(url, wait_until="domcontentloaded", timeout=self.timeout)
                # Wait for the stream response to arrive, up to ~30s
                for _ in range(30):
                    if stream_body is not None:
                        break
                    page.wait_for_timeout(1000)
            except Exception as e:
                print(f"[!] Error during navigation: {e}")
            finally:
                browser.close()

        if stream_body is None:
            print("[!] No stream API response captured. ixigo may have blocked the request.")
            return []

        payload = self.extract_stream_payloads(stream_body)
        if payload is None:
            print("[!] Stream response did not contain a parseable data payload.")
            return []

        flights = self.parse_stream_payload(payload, origin, destination, travel_date)
        print(f"[+] Parsed {len(flights)} flight(s) from stream payload.")
        return flights


def generate_flight_id(airline, dep_time, arr_time, stops):
    """Stable flight ID mirroring flight_scraper.generate_flight_id (fuzzy buckets)."""
    norm_airline = "".join(airline.lower().split()) or "unknown"
    raw = f"{norm_airline}|{dep_time}|{arr_time}|{stops}"
    short_hash = hashlib.md5(raw.encode()).hexdigest()[:10]
    return f"{norm_airline}_{dep_time}_{arr_time}_{stops}_{short_hash}"


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
        print("\n" + "=" * 80)
        print(f"{'#':<3} | {'Airline':<18} | {'Flight No':<10} | {'Times':<20} | {'Duration':<10} | {'Stops':<8} | {'Price'}")
        print("=" * 80)
        for row in table_data:
            print(f"{row[0]:<3} | {row[1]:<18} | {row[2]:<10} | {row[3]:<20} | {row[4]:<10} | {row[5]:<8} | {row[6]}")
        print("=" * 80)


def export_json(flights, filename):
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(flights, f, indent=2, ensure_ascii=False)
    print(f"[+] Exported {len(flights)} flight(s) to: {filename}")


def export_csv(flights, filename):
    if not flights:
        return
    fieldnames = [
        "source", "origin", "destination", "date", "airline", "flight_number",
        "departure_time", "arrival_time", "duration", "stops", "layover",
        "price_formatted", "price_numeric", "refundable_type", "scraped_at", "flight_id"
    ]
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(flights)
    print(f"[+] Exported {len(flights)} flight(s) to: {filename}")


def main():
    parser = argparse.ArgumentParser(description="Scrape one-way flight prices and details from ixigo for a route and date.")
    parser.add_argument("-f", "--from", dest="origin", help="Origin airport code (e.g. BDQ, BOM, JFK)")
    parser.add_argument("-t", "--to", dest="destination", help="Destination airport code (e.g. BLR, DEL, LHR)")
    parser.add_argument("-d", "--date", dest="date", help="Travel date in YYYY-MM-DD format")
    parser.add_argument("-c", "--currency", dest="currency", default="INR", help="Currency code (default: INR)")
    parser.add_argument("-o", "--output", dest="output", choices=["console", "json", "csv", "all"], default="console", help="Output format (default: console)")
    parser.add_argument("--headed", action="store_true", help="Run browser in visible mode")

    args = parser.parse_args()

    if not all([args.origin, args.destination, args.date]):
        parser.error("--from, --to, and --date are required")

    try:
        datetime.strptime(args.date, "%Y-%m-%d")
    except ValueError:
        print("[!] Invalid date format. Use YYYY-MM-DD (e.g. 2026-08-11).")
        sys.exit(1)

    print(f"==================================================")
    print(f" IXIGO FLIGHT PRICE & DETAILS SCRAPER")
    print(f" Route   : {args.origin.upper()} ➔ {args.destination.upper()}")
    print(f" Date    : {args.date}")
    print(f"==================================================")

    scraper = IxigoScraper(headless=not args.headed)
    flights = scraper.scrape(
        origin=args.origin,
        destination=args.destination,
        travel_date=args.date
    )

    print(f"\n[+] Total flights extracted: {len(flights)}")
    display_terminal_table(flights)

    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    route = f"{args.origin.upper()}_{args.destination.upper()}_{args.date}"

    if args.output in ["json", "all"]:
        export_json(flights, f"ixigo_flights_{route}_{timestamp_str}.json")

    if args.output in ["csv", "all"]:
        export_csv(flights, f"ixigo_flights_{route}_{timestamp_str}.csv")

    print("\n[+] Done!")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Initialize tracked_routes collection with an initial route."""
from dotenv import load_dotenv
import os, pymongo
from datetime import datetime

load_dotenv("atlas-credentials.env")
uri = os.getenv("MONGODB_URI")
if not uri:
    print("[!] MONGODB_URI not found")
    exit(1)

client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)
routes_col = client["flight_db"]["tracked_routes"]

seed = [
    {"origin": "AMD", "destination": "BLR", "date": "2026-08-11",
     "status": "active", "added_at": datetime.utcnow(),
     "last_scraped_at": None, "scrape_count": 0}
]

for r in seed:
    key = {"origin": r["origin"], "destination": r["destination"], "date": r["date"]}
    existing = routes_col.find_one(key)
    if existing:
        print(f"[~] Route {r['origin']}→{r['destination']} on {r['date']} already exists (status: {existing['status']})")
    else:
        routes_col.insert_one(r)
        print(f"[+] Added route {r['origin']}→{r['destination']} on {r['date']}")

print(f"[+] tracked_routes now has {routes_col.count_documents({})} route(s)")
client.close()

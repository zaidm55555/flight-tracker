from flask import Flask, render_template, request, jsonify, redirect, url_for
from dotenv import load_dotenv
from datetime import date, datetime
import os, pymongo
from bson.objectid import ObjectId

load_dotenv("atlas-credentials.env")
app = Flask(__name__)
client = None
flights_col = None
routes_col = None

try:
    uri = os.getenv("MONGODB_URI")
    if uri:
        client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)
        db = client["flight_db"]
        flights_col = db["flight_prices"]
        routes_col = db["tracked_routes"]
except:
    pass

@app.route("/")
def index():
    routes = list(routes_col.find({"status": "active"}).sort("added_at", -1)) if routes_col is not None else []
    for r in routes:
        r["_id_str"] = str(r["_id"])
        route_id = f"{r['origin']}_{r['destination']}_{r['date']}"
        r["flight_count"] = flights_col.count_documents({"route_id": route_id}) if flights_col is not None else 0
        r["scraped_at_str"] = ""
        if r.get("last_scraped_at"):
            try:
                dt = datetime.fromisoformat(r["last_scraped_at"].replace("Z", "+00:00"))
                r["scraped_at_str"] = dt.strftime("%b %d, %H:%M")
            except:
                r["scraped_at_str"] = str(r["last_scraped_at"])
    total_routes = routes_col.count_documents({}) if routes_col is not None else 0
    total_active = len(routes)
    return render_template("index.html", routes=routes, total_routes=total_routes, total_active=total_active, current_date=date.today().isoformat())

@app.route("/add-route")
def add_route_page():
    return render_template("add.html", current_date=date.today().isoformat())

@app.route("/manage-routes")
def manage_routes_page():
    routes = list(routes_col.find().sort("added_at", -1)) if routes_col is not None else []
    for r in routes:
        r["_id_str"] = str(r["_id"])
        route_id = f"{r['origin']}_{r['destination']}_{r['date']}"
        r["flight_count"] = flights_col.count_documents({"route_id": route_id}) if flights_col is not None else 0
        r["scraped_at_str"] = ""
        if r.get("last_scraped_at"):
            try:
                dt = datetime.fromisoformat(r["last_scraped_at"].replace("Z", "+00:00"))
                r["scraped_at_str"] = dt.strftime("%b %d, %H:%M")
            except:
                r["scraped_at_str"] = str(r["last_scraped_at"])
    return render_template("manage.html", routes=routes)

@app.route("/api/routes", methods=["GET", "POST"])
def api_routes():
    if request.method == "GET":
        routes = list(routes_col.find().sort("added_at", -1)) if routes_col is not None else []
        for r in routes:
            r["_id"] = str(r["_id"])
            r["added_at"] = r.get("added_at", "").isoformat() if isinstance(r.get("added_at"), datetime) else str(r.get("added_at", ""))
        return jsonify(routes)
    if request.method == "POST":
        data = request.get_json()
        origin = data.get("origin", "").upper()
        dest = data.get("destination", "").upper()
        dt = data.get("date", "")
        if not all([origin, dest, dt]):
            return jsonify({"error": "Fill in all fields"}), 400
        try:
            datetime.strptime(dt, "%Y-%m-%d")
        except:
            return jsonify({"error": "Invalid date format"}), 400
        existing = routes_col.find_one({"origin": origin, "destination": dest, "date": dt})
        if existing:
            return jsonify({"error": "Route already tracked"}), 409
        doc = {
            "origin": origin, "destination": dest, "date": dt,
            "status": "active", "added_at": datetime.utcnow().isoformat() + "Z",
            "last_scraped_at": None, "scrape_count": 0
        }
        routes_col.insert_one(doc)
        return jsonify({"ok": True}), 201

@app.route("/api/routes/<route_id>", methods=["DELETE"])
def delete_route(route_id):
    routes_col.delete_one({"_id": ObjectId(route_id)})
    return jsonify({"ok": True})

@app.route("/api/routes/<route_id>/toggle", methods=["POST"])
def toggle_route(route_id):
    route = routes_col.find_one({"_id": ObjectId(route_id)})
    if not route:
        return jsonify({"error": "Not found"}), 404
    new_status = "paused" if route["status"] == "active" else "active"
    routes_col.update_one({"_id": ObjectId(route_id)}, {"$set": {"status": new_status}})
    return jsonify({"ok": True, "status": new_status})

@app.route("/search")
def search():
    o = request.args.get("from","").upper()
    d = request.args.get("to","").upper()
    dt = request.args.get("date","")
    if not all([o,d,dt]):
        return render_template("index.html", error="Fill in all fields", routes=[], total_routes=0, total_active=0, current_date=date.today().isoformat())
    flights = list(flights_col.find({"origin":o,"destination":d,"date":dt},{"_id":0}).sort("price_numeric",1)) if flights_col is not None else []
    seen = set()
    unique = []
    for f in flights:
        fid = f.get("flight_id", "")
        if fid and fid not in seen:
            seen.add(fid)
            unique.append(f)
        elif not fid:
            unique.append(f)
    return render_template("results.html", flights=unique, origin=o, destination=d, date=dt)

@app.route("/api/history")
def history():
    fid = request.args.get("flight_id","")
    o = request.args.get("from","")
    d = request.args.get("to","")
    if not all([fid, o, d]):
        return jsonify([])
    pipe = [
        {"$match":{"flight_id":fid,"origin":o,"destination":d}},
        {"$group":{"_id":"$scraped_at","p":{"$first":"$price_numeric"},"pf":{"$first":"$price_formatted"}}},
        {"$sort":{"_id":1}}
    ]
    data = [{"t":r["_id"],"p":r["p"],"pf":r["pf"]} for r in (flights_col.aggregate(pipe) if flights_col is not None else [])]
    return jsonify(data)

@app.route("/api/stats")
def stats():
    if flights_col is None:
        return jsonify({"total": 0, "routes": 0, "last_scrape": "N/A"})
    total = flights_col.count_documents({})
    route_count = routes_col.count_documents({"status": "active"})
    last = flights_col.find_one(sort=[("scraped_at", -1)])
    last_scrape = last["scraped_at"] if last else "N/A"
    return jsonify({"total": total, "routes": route_count, "last_scrape": last_scrape})

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

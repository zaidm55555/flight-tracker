from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import os, pymongo

load_dotenv("atlas-credentials.env")
app = Flask(__name__)
client = None
collection = None

try:
    uri = os.getenv("MONGODB_URI")
    if uri:
        client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)
        collection = client["flight_db"]["flight_prices"]
except:
    pass

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/search")
def search():
    o = request.args.get("from","").upper()
    d = request.args.get("to","").upper()
    dt = request.args.get("date","")
    if not all([o,d,dt]):
        return render_template("index.html", error="Fill in all fields")
    flights = list(collection.find({"origin":o,"destination":d,"date":dt},{"_id":0}).sort("price_numeric",1)) if collection is not None else []
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
    data = [{"t":r["_id"],"p":r["p"],"pf":r["pf"]} for r in (collection.aggregate(pipe) if collection is not None else [])]
    return jsonify(data)

@app.route("/api/stats")
def stats():
    if collection is None:
        return jsonify({"total": 0, "routes": 0, "last_scrape": "N/A"})
    total = collection.count_documents({})
    routes = len(collection.distinct("date"))
    last = collection.find_one(sort=[("scraped_at", -1)])
    last_scrape = last["scraped_at"] if last else "N/A"
    return jsonify({"total": total, "routes": routes, "last_scrape": last_scrape})

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

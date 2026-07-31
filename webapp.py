from flask import Flask, request, jsonify, send_from_directory, session, redirect, url_for
from dotenv import load_dotenv
from datetime import datetime
import os, pymongo
from bson.objectid import ObjectId
from authlib.integrations.flask_client import OAuth

load_dotenv("atlas-credentials.env")
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret-key-change-me")

oauth = OAuth(app)
if os.getenv("GOOGLE_CLIENT_ID") and os.getenv("GOOGLE_CLIENT_SECRET"):
    oauth.register(
        name="google",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )

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

FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "dist")

@app.route("/login")
def login():
    return oauth.google.authorize_redirect(url_for("callback", _external=True))

@app.route("/callback")
def callback():
    if "error" in request.args or "code" not in request.args:
        return redirect("/")
    try:
        token = oauth.google.authorize_access_token()
    except Exception:
        return redirect("/")
    user = token.get("userinfo")
    session["user"] = {
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "picture": user.get("picture", ""),
    }
    return redirect("/")

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")

@app.route("/api/me")
def me():
    if "user" in session:
        return jsonify(session["user"])
    return jsonify({"error": "Not logged in"}), 401

@app.before_request
def require_login():
    if (request.path.startswith("/api/") and request.path != "/api/me") or request.path == "/search":
        if "user" not in session:
            return jsonify({"error": "Not logged in"}), 401

def user_email():
    return session.get("user", {}).get("email", "")

def route_added_at_str(o, d, dt):
    if routes_col is None:
        return None
    route = routes_col.find_one({"origin": o, "destination": d, "date": dt, "email": user_email()})
    if not route:
        return None
    return normalize_added_at(route.get("added_at"))

def normalize_added_at(added):
    if isinstance(added, datetime):
        return added.isoformat() + "Z"
    added = str(added)
    if not added:
        return None
    if added.endswith("Z") or "T" in added:
        return added
    return added.replace(" ", "T") + "Z"

def add_route_meta(r):
    r["_id"] = str(r["_id"])
    route_id = f"{r['origin']}_{r['destination']}_{r['date']}"
    r["flight_count"] = 0
    if flights_col is not None:
        pipe = [
            {"$match": {"route_id": route_id}},
            {"$group": {"_id": "$flight_id"}}
        ]
        r["flight_count"] = len(list(flights_col.aggregate(pipe)))
    r["scraped_at_str"] = ""
    if r.get("last_scraped_at"):
        try:
            dt = datetime.fromisoformat(r["last_scraped_at"].replace("Z", "+00:00"))
            r["scraped_at_str"] = dt.strftime("%b %d, %H:%M")
        except:
            r["scraped_at_str"] = str(r["last_scraped_at"])
    r["added_at"] = r.get("added_at", "").isoformat() if isinstance(r.get("added_at"), datetime) else str(r.get("added_at", ""))
    return r

@app.route("/api/routes", methods=["GET", "POST", "DELETE"])
def api_routes():
    if request.method == "GET":
        email = user_email()
        routes = list(routes_col.find({"email": email}).sort("added_at", -1)) if routes_col is not None else []
        return jsonify([add_route_meta(r) for r in routes])
    if request.method == "DELETE":
        origin = request.args.get("from", "").upper()
        dest = request.args.get("to", "").upper()
        dt = request.args.get("date", "")
        res = routes_col.delete_one({"origin": origin, "destination": dest, "date": dt, "email": user_email()}) if routes_col is not None else None
        if not res or res.deleted_count == 0:
            return jsonify({"error": "Not found"}), 404
        return jsonify({"ok": True})
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
        email = user_email()
        existing = routes_col.find_one({"origin": origin, "destination": dest, "date": dt, "email": email})
        if existing:
            return jsonify({"error": "Route already tracked"}), 409
        doc = {
            "origin": origin, "destination": dest, "date": dt, "email": email,
            "status": "active", "added_at": datetime.utcnow().isoformat() + "Z",
            "last_scraped_at": None, "scrape_count": 0
        }
        routes_col.insert_one(doc)
        return jsonify({"ok": True}), 201

@app.route("/api/routes/<route_id>", methods=["DELETE"])
def delete_route(route_id):
    res = routes_col.delete_one({"_id": ObjectId(route_id), "email": user_email()})
    if res.deleted_count == 0:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"ok": True})

@app.route("/api/routes/<route_id>/toggle", methods=["POST"])
def toggle_route(route_id):
    route = routes_col.find_one({"_id": ObjectId(route_id), "email": user_email()})
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
        return jsonify({"error": "Fill in all fields"}), 400
    added_at = route_added_at_str(o, d, dt)
    if not added_at:
        return jsonify({"error": "Route not tracked"}), 403
    pipe = [
        {"$match": {"origin": o, "destination": d, "date": dt}},
        {"$sort": {"scraped_at": -1}},
        {"$group": {"_id": "$flight_id", "doc": {"$first": "$$ROOT"}}}
    ]
    flights = [r["doc"] for r in (flights_col.aggregate(pipe) if flights_col is not None else [])]
    for f in flights:
        f.pop("_id", None)
    flights.sort(key=lambda f: f.get("price_numeric", 0))
    return jsonify(flights)

@app.route("/api/history")
def history():
    fid = request.args.get("flight_id","")
    o = request.args.get("from","")
    d = request.args.get("to","")
    dt = request.args.get("date","")
    if not all([fid, o, d]):
        return jsonify([])
    match = {"flight_id": fid, "origin": o, "destination": d}
    pipe = [
        {"$match": match},
        {"$group": {"_id": "$scraped_at", "p": {"$first": "$price_numeric"}, "pf": {"$first": "$price_formatted"}}},
        {"$sort": {"_id": 1}}
    ]
    data = [{"t": r["_id"], "p": r["p"], "pf": r["pf"]} for r in (flights_col.aggregate(pipe) if flights_col is not None else [])]
    return jsonify(data)

@app.route("/api/stats")
def stats():
    if flights_col is None:
        return jsonify({"total": 0, "routes": 0, "last_scrape": "N/A"})
    total = flights_col.count_documents({})
    route_count = routes_col.count_documents({"status": "active", "email": user_email()})
    last = flights_col.find_one(sort=[("scraped_at", -1)])
    last_scrape = last["scraped_at"] if last else "N/A"
    return jsonify({"total": total, "routes": route_count, "last_scrape": last_scrape})

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    if path.startswith("api/"):
        return jsonify({"error": "Not found"}), 404
    if path and os.path.exists(os.path.join(FRONTEND_DIST, path)):
        return send_from_directory(FRONTEND_DIST, path)
    return send_from_directory(FRONTEND_DIST, "index.html")

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import sys
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPTS_DIR = os.path.join(BASE_DIR, "scripts")
sys.path.insert(0, SCRIPTS_DIR)

from policy_engine import run_policy_engine

# MongoDB connection
MONGO_URI = os.getenv("MONGODB_URI")
client = MongoClient(MONGO_URI)
db = client["cloudspend"]
collection = db["scans"]

def save_results(result):
    if result is None:
        print("--- No result to save, skipping ---")
        return
    collection.insert_one(result)
    print(">>> Result saved to MongoDB")

def load_results():
    results = list(collection.find({}, {"_id": 0}))
    return results

def initialize_mock_data():
    """Load mock data if database is empty and LOAD_MOCK_DATA is enabled"""
    load_mock = os.getenv("LOAD_MOCK_DATA", "false").lower() == "true"
    
    if load_mock and collection.count_documents({}) == 0:
        print(">>> Database is empty, loading mock data...")
        try:
            import mock_setup
            mock_setup.generate_mock_data()
            print(">>> Mock data loaded successfully!")
        except Exception as e:
            print(f">>> Error loading mock data: {e}")

def scheduled_job():
    print("\n>>> Scheduler triggered — running policy engine...")
    result = run_policy_engine()
    save_results(result)

@app.route("/api/results", methods=["GET"])
def get_results():
    return jsonify(load_results())

@app.route("/api/latest", methods=["GET"])
def get_latest():
    results = load_results()
    return jsonify(results[-1]) if results else jsonify({"message": "No results yet"})

@app.route("/api/summary", methods=["GET"])
def get_summary():
    results = load_results()
    if not results:
        return jsonify({"message": "No results yet"})
    valid_results = [r for r in results if r and "hourly_saving" in r]
    if not valid_results:
        return jsonify({"message": "No valid results yet"})
    total_saved = sum(r["hourly_saving"] for r in valid_results)
    total_idle = sum(r["idle_count"] for r in valid_results)
    avg_saving = total_saved / len(valid_results)
    return jsonify({
        "total_runs": len(valid_results),
        "total_hourly_saving": round(total_saved, 4),
        "total_idle_detected": total_idle,
        "avg_saving_per_run": round(avg_saving, 4),
        "latest_timestamp": valid_results[-1]["timestamp"]
    })

@app.route("/api/daily", methods=["GET"])
def get_daily():
    results = load_results()
    today = datetime.now().strftime("%Y-%m-%d")
    daily = [r for r in results if r["timestamp"].startswith(today)]
    return jsonify(daily)

@app.route("/api/monthly", methods=["GET"])
def get_monthly():
    results = load_results()
    grouped = {}
    for r in results:
        month = r["timestamp"][:7]
        if month not in grouped:
            grouped[month] = {"period": month, "total_saving": 0, "total_idle": 0, "total_active": 0, "runs": 0}
        grouped[month]["total_saving"] = round(grouped[month]["total_saving"] + r["hourly_saving"], 4)
        grouped[month]["total_idle"] += r["idle_count"]
        grouped[month]["total_active"] += r["active_count"]
        grouped[month]["runs"] += 1
    return jsonify(list(grouped.values()))

@app.route("/api/yearly", methods=["GET"])
def get_yearly():
    results = load_results()
    grouped = {}
    for r in results:
        year = r["timestamp"][:4]
        if year not in grouped:
            grouped[year] = {"period": year, "total_saving": 0, "total_idle": 0, "total_active": 0, "runs": 0}
        grouped[year]["total_saving"] = round(grouped[year]["total_saving"] + r["hourly_saving"], 4)
        grouped[year]["total_idle"] += r["idle_count"]
        grouped[year]["total_active"] += r["active_count"]
        grouped[year]["runs"] += 1
    return jsonify(list(grouped.values()))

if __name__ == "__main__":
    initialize_mock_data()  # Load mock data if enabled and DB is empty
    
    scheduler = BackgroundScheduler()
    scheduler.add_job(scheduled_job, "interval", minutes=5)
    scheduler.start()
    print("--- Scheduler started — policy engine runs every 5 minutes ---")
    print(f"--- Connected to MongoDB: {db.name} ---")
    app.run(debug=False)
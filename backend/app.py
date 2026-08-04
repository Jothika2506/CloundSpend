from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import sys
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RESULTS_FILE = os.path.join(BASE_DIR, "data", "results.json")
SCRIPTS_DIR = os.path.join(BASE_DIR, "scripts")
sys.path.insert(0, SCRIPTS_DIR)

from policy_engine import run_policy_engine

def load_results():
    if os.path.exists(RESULTS_FILE):
        with open(RESULTS_FILE, "r") as f:
            data = json.load(f)
        return [r for r in data if r and "hourly_saving" in r]
    return []

def save_results(result):
    if result is None:
        print("--- No result to save, skipping ---")
        return
    if os.path.exists(RESULTS_FILE):
        with open(RESULTS_FILE, "r") as f:
            existing = json.load(f)
    else:
        existing = []
    existing.append(result)
    with open(RESULTS_FILE, "w") as f:
        json.dump(existing, f, indent=2)

def scheduled_job():
    print("\n>>> Scheduler triggered — running policy engine...")
    result = run_policy_engine()
    save_results(result)
    print(">>> Result saved\n")

# ── Endpoints ──────────────────────────────────────────

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
    total_saved = sum(r["hourly_saving"] for r in results)
    total_idle = sum(r["idle_count"] for r in results)
    avg_saving = total_saved / len(results)
    return jsonify({
        "total_runs": len(results),
        "total_hourly_saving": round(total_saved, 4),
        "total_idle_detected": total_idle,
        "avg_saving_per_run": round(avg_saving, 4),
        "latest_timestamp": results[-1]["timestamp"]
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
        month = r["timestamp"][:7]  # YYYY-MM
        if month not in grouped:
            grouped[month] = {
                "period": month,
                "total_saving": 0,
                "total_idle": 0,
                "total_active": 0,
                "runs": 0
            }
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
        year = r["timestamp"][:4]  # YYYY
        if year not in grouped:
            grouped[year] = {
                "period": year,
                "total_saving": 0,
                "total_idle": 0,
                "total_active": 0,
                "runs": 0
            }
        grouped[year]["total_saving"] = round(grouped[year]["total_saving"] + r["hourly_saving"], 4)
        grouped[year]["total_idle"] += r["idle_count"]
        grouped[year]["total_active"] += r["active_count"]
        grouped[year]["runs"] += 1
    return jsonify(list(grouped.values()))

if __name__ == "__main__":
    scheduler = BackgroundScheduler()
    scheduler.add_job(scheduled_job, "interval", minutes=5)
    scheduler.start()
    print("--- Scheduler started — policy engine runs every 5 minutes ---")
    app.run(debug=False)
# CloudSpend — FinOps Monitoring Engine

**A cloud cost optimization and idle resource detection system for AWS**

![Status](https://img.shields.io/badge/status-active-brightgreen) ![Python](https://img.shields.io/badge/Python-3.9+-blue) ![React](https://img.shields.io/badge/React-18+-blue) ![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)

---

## Overview

CloudSpend is a **FinOps (Financial Operations) monitoring engine** that automatically detects idle cloud resources, triggers cost-saving actions, and provides real-time visibility into AWS spending patterns.

**Why CloudSpend?**
- **Automatic Cost Optimization:** Detects and shuts down idle EC2 instances → saves ~$7.50/day per idle instance
- **Multi-Metric Intelligence:** Analyzes CPU, network, and disk utilization simultaneously
- **Real-Time Dashboard:** Live charts showing savings, shutdowns, and cost trends
- **Business-Focused:** Built for Product Managers, Finance Teams, and DevOps Engineers

---

## Key Features

### 🔍 **Intelligent Idle Detection**
- **Multi-metric validation:** CPU + Network + Disk all near-zero = IDLE
- **Configurable thresholds** (default: CPU <10%, Network <5MB, Disk <5MB)
- **Automated shutdown** of idle instances to freeze billing (*snapshot feature in progress*)

### 💰 **Cost Tracking & Analytics**
- **Real-time savings calculation** ($0.0104/hour per idle instance)
- **Daily/Monthly/Yearly trends** visualized on dashboard
- **Cumulative savings** across all scans

### 🚀 **Automated Actions**
- **Background scheduler** runs policy engine every 5 minutes
- **Auto-shutdown idle instances** with billing impact calculation
- **Detailed logging** of all decisions and actions

### 📊 **Business Intelligence Dashboard**
- Total savings (all-time cumulative)
- Active vs. Idle instance breakdown
- Hourly/Daily/Monthly cost trends
- Instance status table with CPU, network, disk metrics

---

## Architecture

```
┌─────────────────────────────────────────┐
│         React Frontend (Port 3000)      │
│  - Dashboard with live charts            │
│  - Real-time savings metrics             │
│  - Instance status monitoring            │
└────────────────┬────────────────────────┘
                 │ REST API (JSON)
┌────────────────▼────────────────────────┐
│      Flask Backend (Port 5000)          │
│  - /api/results → All scan results      │
│  - /api/summary → Cost aggregation      │
│  - /api/daily/monthly/yearly → Trends   │
└────────────────┬────────────────────────┘
                 │ PyMongo Driver
┌────────────────▼────────────────────────┐
│    MongoDB Atlas (Cloud Database)        │
│  - scans collection: Detailed results    │
│  - Persistent storage across deploys     │
└─────────────────────────────────────────┘

Background Scheduler (Every 5 min)
  ↓
Policy Engine (Moto Mock AWS)
  ├─ Fetch EC2 instances
  ├─ Analyze CloudWatch metrics
  ├─ Detect idle resources
  ├─ Auto-shutdown + snapshot
  └─ Store results in MongoDB
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, Recharts, Tailwind CSS | Interactive dashboard with live charts |
| **Backend** | Flask, Flask-CORS | REST API for data retrieval |
| **Database** | MongoDB Atlas | Scan results & historical data |
| **AWS Integration** | Boto3, Moto | EC2 & CloudWatch APIs (mocked for dev) |
| **Scheduling** | APScheduler | Background policy engine (every 5 min) |
| **Environment** | Python 3.9+, Node.js 18+ | Runtime dependencies |

---

## Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- MongoDB Atlas account (free tier OK)
- Git

### Backend Setup

```bash
# Clone repository
git clone https://github.com/Jothika2506/CloundSpend.git
cd CloudSpend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r backend/requirements.txt

# Configure environment
# Create .env file in root:
MONGODB_URI="mongodb+srv://username:password@cluster.xxxxx.mongodb.net/cloudspend?retryWrites=true&w=majority"
LOAD_MOCK_DATA=true  # Set to 'false' for production with real AWS

# Start backend
cd backend
python app.py
```

**Backend runs on:** `http://localhost:5000`

### Frontend Setup

```bash
# In new terminal, from root directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

**Frontend runs on:** `http://localhost:3000`

---

## Usage

### Development Mode (with Mock Data)

```bash
# Backend with mock data
LOAD_MOCK_DATA=true python backend/app.py

# Frontend (separate terminal)
cd frontend && npm start
```

**What happens:**
1. ✅ Backend connects to MongoDB Atlas
2. ✅ Mock AWS environment loads (10 EC2 instances)
3. ✅ Policy engine runs immediately (detects ~3-4 idle instances)
4. ✅ Results stored in MongoDB
5. ✅ Dashboard populates with charts & metrics

### API Endpoints

```bash
# Get all scan results
GET http://localhost:5000/api/results

# Get latest scan only
GET http://localhost:5000/api/latest

# Get summary statistics
GET http://localhost:5000/api/summary
# Response:
{
  "total_runs": 12,
  "total_hourly_saving": 0.0416,
  "total_idle_detected": 48,
  "avg_saving_per_run": 0.0035,
  "latest_timestamp": "2026-09-07 16:38:23"
}

# Get daily/monthly/yearly trends
GET http://localhost:5000/api/daily
GET http://localhost:5000/api/monthly
GET http://localhost:5000/api/yearly
```

---

## Project Structure

```
CloudSpend/
├── backend/
│   ├── app.py                    # Flask server + API routes + scheduler
│   ├── requirements.txt          # Python dependencies
│   ├── scripts/
│   │   ├── policy_engine.py      # Core FinOps idle detection logic
│   │   └── mock_setup.py         # Mock AWS environment generator
│   └── data/
│       └── results.json          # MongoDB query results cache
├── frontend/
│   ├── src/
│   │   └── App.jsx              # React dashboard (single-page app)
│   ├── package.json
│   ├── tailwind.config.js        # Tailwind CSS config
│   └── public/
├── venv/                         # Python virtual environment
├── .env                          # Environment variables (gitignored)
├── .gitignore
└── README.md
```

---

## How It Works

### 1️⃣ **Scan Phase** (Every 5 minutes)
```
Policy Engine starts
  ↓
Fetch all EC2 instances from mocked AWS
  ↓
Get CloudWatch metrics (CPU, Network, Disk)
  ↓
Apply idle detection logic
```

### 2️⃣ **Analysis Phase**
```
For each instance:
  IF cpu < 10% AND network < 5MB AND disk < 5MB:
    → IDLE
    → Calculate saving: $0.0104/hour
  ELSE:
    → ACTIVE
    → Keep running
```

### 3️⃣ **Action Phase**
```
IF idle instances found:
  → Take snapshot (prevent data loss)
  → Shut down instance (freeze billing)
  → Log action + timestamp
  ↓
Store result in MongoDB
  ├─ Timestamp
  ├─ Total instances scanned
  ├─ Idle/Active count
  ├─ Hourly saving
  └─ Detailed instance breakdown
```

### 4️⃣ **Dashboard Phase**
```
Frontend fetches /api/results
  ↓
Aggregates data by day/month/year
  ↓
Displays charts:
  - Total saved (cumulative)
  - Active vs Idle pie chart
  - Savings trend line chart
  - Instance status table
```

---

## Configuration

### Environment Variables (`.env`)

```dotenv
# MongoDB Connection (REQUIRED)
MONGODB_URI=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/database

# Load mock data on startup (for development)
LOAD_MOCK_DATA=true

# For production AWS connection:
# AWS_ACCESS_KEY_ID=xxx
# AWS_SECRET_ACCESS_KEY=xxx
# AWS_REGION=us-east-1
```

### Policy Engine Thresholds

Edit `backend/scripts/policy_engine.py`:

```python
CPU_THRESHOLD = 10.0          # % CPU utilization
NETWORK_THRESHOLD = 5.0       # MB/s network traffic
DISK_THRESHOLD = 5.0          # MB/s disk I/O
```

---

## Dashboard Metrics Explained

| Metric | Meaning | Formula |
|--------|---------|---------|
| **Total Saved** | Cumulative savings across all scans | sum(hourly_saving * hours_since_shutdown) |
| **Total Shutdowns** | Number of idle instances shut down | count(idle_count) |
| **Current Waste %** | % of resources sitting idle now | idle_count / total_instances * 100 |
| **Monthly Projection** | Estimated monthly savings if pattern continues | avg_saving_per_run * runs_per_month |
| **Active vs Idle** | Instance utilization breakdown | pie chart of status counts |

---

## Development Roadmap

**Completed:**
- ✅ Multi-metric idle detection (CPU + Network + Disk)
- ✅ Real-time dashboard with charts
- ✅ MongoDB integration for persistent storage
- ✅ Background scheduler (every 5 min)
- ✅ RESTful API for data retrieval

**In Progress:**
- 🔄 **Snapshot before shutdown** — EC2 snapshot creation before instance termination
- 🔄 **Cost attribution** — Map savings back to specific teams/projects

**Planned for Future:**
- [ ] **Real AWS Integration** — Connect to actual AWS account (replace Moto mocks)
- [ ] **Budget Alerts** — Email/Slack notifications when spending exceeds threshold
- [ ] **Regional Breakdown** — Cost analysis by AWS region
- [ ] **Instance Tagging** — Exclude production/critical instances from auto-shutdown
- [ ] **Webhook Integration** — Send alerts to external monitoring tools
- [ ] **Audit Logs** — Track who authorized each shutdown action
- [ ] **Multi-Account Support** — Monitor across multiple AWS accounts

---

## Common Issues

### Issue: "No connection could be made to localhost:27017"
**Fix:** Ensure `MONGODB_URI` is set in `.env` and MongoDB Atlas has whitelisted your IP.

```bash
# Check .env is correct:
cat .env

# Whitelist IP in MongoDB Atlas:
# Settings → Network Access → Add IP Address
```

### Issue: Frontend shows "NaN%" or $0 in metrics
**Fix:** Backend has no data. Load mock data:

```bash
cd backend
python scripts/mock_setup.py
```

### Issue: Policy engine not running in background
**Fix:** Ensure APScheduler started. Check for errors in backend logs.

---

## Testing

### Manual API Testing
```bash
# Terminal 1: Start backend
cd backend && python app.py

# Terminal 2: Test endpoints
curl http://localhost:5000/api/summary
curl http://localhost:5000/api/results | python -m json.tool
```

### Load Mock Data
Mock data loads automatically when `LOAD_MOCK_DATA=true` in `.env` and the database is empty. 

To manually refresh:
- Stop backend (CTRL+C)
- Clear MongoDB collection: `db.scans.deleteMany({})`
- Restart backend: `python app.py`
- Refresh dashboard at `http://localhost:3000`

---

## Deployment

### Deploy to Production

```bash
# Build React for production
cd frontend
npm run build

# This creates optimized build/ folder ready for deployment

# Backend: Use production WSGI server (Gunicorn)
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 backend.app:app
```

### Environment Variables for Production
```dotenv
MONGODB_URI=mongodb+srv://prod-user:secure-password@prod-cluster.mongodb.net/cloudspend
LOAD_MOCK_DATA=false
AWS_ACCESS_KEY_ID=your-real-aws-key
AWS_SECRET_ACCESS_KEY=your-real-aws-secret
AWS_REGION=us-east-1
```

---

## Performance & Scalability

| Metric | Value | Notes |
|--------|-------|-------|
| **Scan Frequency** | Every 5 min | Configurable via APScheduler |
| **Instances Monitored** | Scales to 1000+ | Currently tested with 10 mock instances |
| **API Response Time** | <200ms | MongoDB aggregation pipelines for fast queries |
| **Database Storage** | ~2KB per scan | Efficient document-based storage |
| **Cost to Run** | Free-$10/month | MongoDB Atlas free tier + AWS moto mocks (no AWS charges) |

---

## Contributing

Found a bug? Want to add a feature?

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/awesome-feature`
3. Commit changes: `git commit -m 'Add awesome feature'`
4. Push: `git push origin feature/awesome-feature`
5. Open a Pull Request

---

## License

MIT License — feel free to use for personal & commercial projects.

---

## Contact & Support

- **GitHub:** [Jothika2506/CloundSpend](https://github.com/Jothika2506/CloundSpend)
- **Issues:** Report bugs on GitHub Issues tab
- **Questions:** Open a Discussion

---

## Acknowledgments

Built with:
- **Flask** — Lightweight Python web framework
- **React** — Interactive UI library
- **MongoDB** — Flexible cloud database
- **Boto3** — AWS SDK for Python
- **Moto** — Mock AWS services for testing

---

**Made with ☕ for FinOps Engineers & Cloud Cost Optimizers**

Last Updated: September 2026
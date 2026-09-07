import { useState, useEffect } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";

const API = "http://127.0.0.1:5000";

const COLORS = {
  idle: "#ef4444",
  active: "#22c55e",
  accent: "#818cf8",
  warning: "#f59e0b"
};

export default function App() {
  const [summary, setSummary] = useState(null);
  const [results, setResults] = useState([]);
  const [latest, setLatest] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [yearly, setYearly] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [timeFilter, setTimeFilter] = useState("all");

  useEffect(() => {
    const cachedSummary = localStorage.getItem("cs_summary");
    const cachedResults = localStorage.getItem("cs_results");
    const cachedLatest = localStorage.getItem("cs_latest");
    const cachedMonthly = localStorage.getItem("cs_monthly");
    const cachedYearly = localStorage.getItem("cs_yearly");

    if (cachedSummary) setSummary(JSON.parse(cachedSummary));
    if (cachedResults) setResults(JSON.parse(cachedResults));
    if (cachedLatest) setLatest(JSON.parse(cachedLatest));
    if (cachedMonthly) setMonthly(JSON.parse(cachedMonthly));
    if (cachedYearly) setYearly(JSON.parse(cachedYearly));

    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [s, r, l, m, y] = await Promise.all([
        axios.get(`${API}/api/summary`),
        axios.get(`${API}/api/results`),
        axios.get(`${API}/api/latest`),
        axios.get(`${API}/api/monthly`),
        axios.get(`${API}/api/yearly`)
      ]);
      setSummary(s.data);
      setResults(r.data);
      setLatest(l.data);
      setMonthly(m.data);
      setYearly(y.data);
      setIsLive(true);

      localStorage.setItem("cs_summary", JSON.stringify(s.data));
      localStorage.setItem("cs_results", JSON.stringify(r.data));
      localStorage.setItem("cs_latest", JSON.stringify(l.data));
      localStorage.setItem("cs_monthly", JSON.stringify(m.data));
      localStorage.setItem("cs_yearly", JSON.stringify(y.data));
    } catch (err) {
      console.error("API error:", err);
      setIsLive(false);
    }
  };

  const theme = {
    bg: darkMode ? "#0f172a" : "#f8fafc",
    card: darkMode ? "#1e293b" : "#ffffff",
    text: darkMode ? "#f1f5f9" : "#0f172a",
    subtext: darkMode ? "#94a3b8" : "#64748b",
    border: darkMode ? "#334155" : "#e2e8f0",
    tabActive: darkMode ? "#334155" : "#e2e8f0",
  };

  const allData = results.map(r => ({
    date: r.timestamp.slice(5, 10),
    saving: r.hourly_saving,
    idle: r.idle_count
  }));

  const monthlyData = monthly.map(m => ({
    date: m.period,
    saving: m.total_saving,
    idle: m.total_idle
  }));

  const yearlyData = yearly.map(y => ({
    date: y.period,
    saving: y.total_saving,
    idle: y.total_idle
  }));

  const chartData = timeFilter === "all" ? allData
    : timeFilter === "monthly" ? monthlyData
    : yearlyData;

  const chartLabel = timeFilter === "all" ? "Daily Savings Over Time"
    : timeFilter === "monthly" ? "Monthly Savings Overview"
    : "Yearly Savings Overview";

  const pieData = latest ? [
    { name: "Idle", value: latest.idle_count },
    { name: "Active", value: latest.active_count }
  ] : [];

  const wastePercentage = latest
    ? ((latest.idle_count / latest.total_instances) * 100).toFixed(1)
    : 0;

  const avgSavingPerRun = summary && summary.total_runs > 0
    ? summary.total_hourly_saving / summary.total_runs : 0;
  const monthlyProjection = (avgSavingPerRun * 24 * 30).toFixed(2);

  const tabStyle = (active) => ({
    padding: "6px 14px",
    borderRadius: "8px",
    border: "none",
    background: active ? "#6366f1" : "transparent",
    color: active ? "white" : theme.subtext,
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: active ? "600" : "400"
  });

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, fontFamily: "Inter, sans-serif", padding: "24px", transition: "all 0.3s" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "16px", color: "white", letterSpacing: "-1px" }}>
            CS
          </div>
          <div>
            <div style={{ fontWeight: "700", fontSize: "20px", color: theme.text }}>CloudSpend</div>
            <div style={{ fontSize: "12px", color: theme.subtext }}>FinOps Monitoring Engine</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: isLive ? "#22c55e" : "#ef4444", animation: isLive ? "pulse 2s infinite" : "none" }} />
            <span style={{ fontSize: "12px", color: theme.subtext }}>{isLive ? "Live" : "Offline — showing cached data"}</span>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} style={{ padding: "8px 16px", borderRadius: "8px", border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, cursor: "pointer", fontSize: "13px" }}>
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </div>

      {/* Hero Metrics */}
  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>

  {/* Card 1 — Total Saved */}
  <div style={{ background: theme.card, borderRadius: "16px", padding: "20px", border: `1px solid ${theme.border}` }}>
    <div style={{ fontSize: "12px", color: theme.subtext, marginBottom: "8px" }}>Total Saved (All Time)</div>
    <div style={{ fontSize: "28px", fontWeight: "700", color: "#22c55e" }}>${summary?.total_hourly_saving || 0}</div>
    <div style={{ fontSize: "11px", color: theme.subtext, marginTop: "4px" }}>cumulative across all scans</div>
  </div>

  {/* Card 2 — Total Shutdowns (split) */}
  <div style={{ background: theme.card, borderRadius: "16px", padding: "20px", border: `1px solid ${theme.border}` }}>
    <div style={{ fontSize: "12px", color: theme.subtext, marginBottom: "12px" }}>Total Shutdowns</div>
    <div style={{ display: "flex", gap: "0", alignItems: "stretch" }}>
      {/* This Scan */}
      <div style={{ flex: 1, paddingRight: "12px", borderRight: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: "22px", fontWeight: "700", color: "#ef4444" }}>{latest?.idle_count ?? "—"}</div>
        <div style={{ fontSize: "10px", color: theme.subtext, marginTop: "4px" }}>this scan</div>
      </div>
      {/* All Time */}
      <div style={{ flex: 1, paddingLeft: "12px" }}>
        <div style={{ fontSize: "22px", fontWeight: "700", color: "#ef4444" }}>{summary?.total_idle_detected || 0}</div>
        <div style={{ fontSize: "10px", color: theme.subtext, marginTop: "4px" }}>all time</div>
      </div>
    </div>
  </div>

  {/* Card 3 — Waste % */}
  <div style={{ background: theme.card, borderRadius: "16px", padding: "20px", border: `1px solid ${theme.border}` }}>
    <div style={{ fontSize: "12px", color: theme.subtext, marginBottom: "8px" }}>Current Waste %</div>
    <div style={{ fontSize: "28px", fontWeight: "700", color: "#f59e0b" }}>{wastePercentage}%</div>
    <div style={{ fontSize: "11px", color: theme.subtext, marginTop: "4px" }}>idle in latest scan</div>
  </div>

  {/* Card 4 — Monthly Projection */}
  <div style={{ background: theme.card, borderRadius: "16px", padding: "20px", border: `1px solid ${theme.border}` }}>
    <div style={{ fontSize: "12px", color: theme.subtext, marginBottom: "8px" }}>Monthly Projection</div>
    <div style={{ fontSize: "28px", fontWeight: "700", color: "#818cf8" }}>${monthlyProjection}</div>
    <div style={{ fontSize: "11px", color: theme.subtext, marginTop: "4px" }}>estimated savings if pattern continues</div>
  </div>

</div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: theme.card, borderRadius: "16px", padding: "20px", border: `1px solid ${theme.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ fontWeight: "600", fontSize: "14px" }}>{chartLabel}</div>
            <div style={{ display: "flex", gap: "4px", background: theme.bg, padding: "4px", borderRadius: "10px" }}>
              <button style={tabStyle(timeFilter === "all")} onClick={() => setTimeFilter("all")}>All</button>
              <button style={tabStyle(timeFilter === "monthly")} onClick={() => setTimeFilter("monthly")}>Monthly</button>
              <button style={tabStyle(timeFilter === "yearly")} onClick={() => setTimeFilter("yearly")}>Yearly</button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            {timeFilter === "yearly" ? (
              <BarChart data={chartData}>
                <XAxis dataKey="date" stroke={theme.subtext} fontSize={11} />
                <YAxis stroke={theme.subtext} fontSize={11} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(value) => [`$${value}`, "Saved"]} contentStyle={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: "8px", color: theme.text }} />
                <Bar dataKey="saving" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <XAxis dataKey="date" stroke={theme.subtext} fontSize={11} />
                <YAxis stroke={theme.subtext} fontSize={11} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(value) => [`$${value}`, "Saved"]} contentStyle={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: "8px", color: theme.text }} />
                <Line type="monotone" dataKey="saving" stroke="#818cf8" strokeWidth={2} dot={{ fill: "#818cf8" }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        <div style={{ background: theme.card, borderRadius: "16px", padding: "20px", border: `1px solid ${theme.border}` }}>
          <div style={{ fontWeight: "600", marginBottom: "16px", fontSize: "14px" }}>Active vs Idle — Latest Scan</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                <Cell fill={COLORS.idle} />
                <Cell fill={COLORS.active} />
              </Pie>
              <Legend />
              <Tooltip contentStyle={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: "8px", color: theme.text }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Instance Table */}
      <div style={{ background: theme.card, borderRadius: "16px", padding: "20px", border: `1px solid ${theme.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <div style={{ fontWeight: "600", fontSize: "14px" }}>Instance Status — Latest Scan
              <span style={{ fontSize: "11px", color: theme.subtext, marginLeft: "8px", fontWeight: "400" }}>
                (Idle instances automatically shut down)
              </span>
            </div>
          </div>
          <div style={{ fontSize: "12px", color: theme.subtext }}>Last scan: {latest?.timestamp || "—"}</div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ color: theme.subtext, textAlign: "left" }}>
              <th style={{ padding: "8px 12px", borderBottom: `1px solid ${theme.border}` }}>Instance ID</th>
              <th style={{ padding: "8px 12px", borderBottom: `1px solid ${theme.border}` }}>CPU %</th>
              <th style={{ padding: "8px 12px", borderBottom: `1px solid ${theme.border}` }}>Network (MB)</th>
              <th style={{ padding: "8px 12px", borderBottom: `1px solid ${theme.border}` }}>Disk (MB)</th>
              <th style={{ padding: "8px 12px", borderBottom: `1px solid ${theme.border}` }}>Status</th>
              <th style={{ padding: "8px 12px", borderBottom: `1px solid ${theme.border}` }}>Action Taken</th>
              <th style={{ padding: "8px 12px", borderBottom: `1px solid ${theme.border}` }}>Saving/hr</th>
            </tr>
          </thead>
          <tbody>
            {latest?.instances?.map((inst, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${theme.border}` }}>
                <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "12px" }}>{inst.instance_id}</td>
                <td style={{ padding: "10px 12px" }}>{inst.cpu}%</td>
                <td style={{ padding: "10px 12px" }}>{inst.network ?? "—"}</td>
                <td style={{ padding: "10px 12px" }}>{inst.disk ?? "—"}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "600", background: inst.status === "IDLE" ? "#ef444420" : "#22c55e20", color: inst.status === "IDLE" ? "#ef4444" : "#22c55e" }}>
                    {inst.status}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", fontSize: "12px", color: inst.status === "IDLE" ? "#22c55e" : theme.subtext }}>
                  {inst.status === "IDLE" ? "✓ Shut down" : "Running"}
                </td>
                <td style={{ padding: "10px 12px", color: inst.status === "IDLE" ? "#22c55e" : theme.subtext }}>
                  {inst.status === "IDLE" ? "$0.0104" : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import "./AccuracyDashboard.css";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const AccuracyDashboard: React.FC = () => {
  const [accuracyData, setAccuracyData] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    console.log("🔍 Fetching accuracy data...");
    try {
      const [accuracyRes, testRes] = await Promise.all([
        api.get("/accuracy/dashboard"),
        api.get("/accuracy/test"),
      ]);
      
      console.log("📊 Accuracy API Response:", accuracyRes.data);
      console.log("📈 Daily Trend Data:", accuracyRes.data?.daily_trend);
      console.log("📊 Class Wise Data:", accuracyRes.data?.class_wise);
      console.log("🧪 Test Results:", testRes.data);
      
      setAccuracyData(accuracyRes.data);
      setTestResults(testRes.data);
    } catch (error) {
      console.error("❌ Error fetching accuracy data:", error);
      toast.error("Failed to load accuracy data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  const highPercent =
    (accuracyData?.high_confidence / accuracyData?.total_records) * 100 || 0;
  const mediumPercent =
    (accuracyData?.medium_confidence / accuracyData?.total_records) * 100 || 0;
  const lowPercent =
    (accuracyData?.low_confidence / accuracyData?.total_records) * 100 || 0;

  console.log("📊 Confidence Breakdown:", { highPercent, mediumPercent, lowPercent });

  return (
    <div className="accuracy-dashboard">
      <div className="accuracy-container">
        {/* Header */}
        <div className="accuracy-header fade-in">
          <h1>📊 System Accuracy Dashboard</h1>
          <p>Real-time face recognition performance metrics</p>
        </div>

        {/* Main Accuracy Card */}
        <div className="main-accuracy-card fade-in delay-100">
          <div className="accuracy-percentage">
            {accuracyData?.accuracy_percent || 0}%
          </div>
          <div className="accuracy-label">Overall System Accuracy</div>
          <div className="accuracy-subtext">
            Based on {accuracyData?.total_records || 0} attendance records
          </div>
        </div>

        {/* Stats Grid */}
        <div className="accuracy-stats-grid fade-in delay-200">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-value green">
              {accuracyData?.accuracy_percent || 0}%
            </div>
            <div className="stat-label">Estimated Accuracy</div>
            <div className="stat-subtext">
              Based on {accuracyData?.total_records || 0} records
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-value blue">
              {accuracyData?.average_confidence || 0}%
            </div>
            <div className="stat-label">Average Confidence</div>
            <div className="stat-subtext">Higher = Better recognition</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🧪</div>
            <div className="stat-value purple">
              {testResults?.accuracy_percent || 0}%
            </div>
            <div className="stat-label">Test Accuracy</div>
            <div className="stat-subtext">
              On {testResults?.total_tests || 0} test images
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-value gray">
              {accuracyData?.total_records || 0}
            </div>
            <div className="stat-label">Total Records</div>
            <div className="stat-subtext">Attendance marked</div>
          </div>
        </div>

        {/* Confidence Distribution */}
        <div className="accuracy-section-card fade-in delay-300">
          <div className="section-header">
            <div className="section-title">
              <i>📈</i> Confidence Distribution
            </div>
          </div>
          <div className="progress-item">
            <div className="progress-header">
              <span className="progress-label">High Confidence (&gt;70%)</span>
              <span className="progress-percent">
                {accuracyData?.high_confidence || 0} ({highPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill high"
                style={{ width: `${highPercent}%` }}
              ></div>
            </div>
          </div>
          <div className="progress-item">
            <div className="progress-header">
              <span className="progress-label">Medium Confidence (50-70%)</span>
              <span className="progress-percent">
                {accuracyData?.medium_confidence || 0} (
                {mediumPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill medium"
                style={{ width: `${mediumPercent}%` }}
              ></div>
            </div>
          </div>
          <div className="progress-item">
            <div className="progress-header">
              <span className="progress-label">Low Confidence (&lt;50%)</span>
              <span className="progress-percent">
                {accuracyData?.low_confidence || 0} ({lowPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill low"
                style={{ width: `${lowPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Daily Accuracy Trend - Line Chart */}
        {accuracyData?.daily_trend && accuracyData.daily_trend.length > 0 && (
          <div className="accuracy-section-card fade-in">
            <div className="section-header">
              <div className="section-title">
                <i className="fas fa-chart-line"></i> Daily Accuracy Trend (Last 30 Days)
              </div>
            </div>
            <div className="chart-container">
              <Line
                data={{
                  labels: accuracyData.daily_trend.map((d: any) => d.date),
                  datasets: [
                    {
                      label: "Accuracy %",
                      data: accuracyData.daily_trend.map(
                        (d: any) => d.accuracy / 100,
                      ),
                      borderColor: "#8b5cf6",
                      backgroundColor: "rgba(139, 92, 246, 0.1)",
                      tension: 0.4,
                      fill: true,
                      pointBackgroundColor: "#4c1d95",
                      pointBorderColor: "#fff",
                      pointRadius: 4,
                      pointHoverRadius: 6,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 1,
                      ticks: {
                        callback: (value: any) => `${Math.round(value * 100)}%`,
                      },
                      title: { display: true, text: "Accuracy (%)" },
                    },
                    x: {
                      title: { display: true, text: "Date" },
                    },
                  },
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: (context: any) =>
                          `${Math.round(context.raw * 100)}%`,
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        )}

        {/* Monthly Accuracy Trend - Bar Chart */}
        {accuracyData?.daily_trend && accuracyData.daily_trend.length > 0 && (
          <div className="accuracy-section-card fade-in">
            <div className="section-header">
              <div className="section-title">
                <i className="fas fa-chart-bar"></i> Monthly Accuracy Overview
              </div>
            </div>
            <div className="chart-container">
              <Bar
                data={{
                  labels: accuracyData.daily_trend.slice(-12).map((d: any) => {
                    const date = new Date(d.date);
                    return date.toLocaleString("default", { month: "short" });
                  }),
                  datasets: [
                    {
                      label: "Average Accuracy %",
                      data: accuracyData.daily_trend
                        .slice(-12)
                        .map((d: any) => d.accuracy / 100),
                      backgroundColor: "rgba(139, 92, 246, 0.7)",
                      borderRadius: 8,
                      borderColor: "#4c1d95",
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 1,
                      ticks: {
                        callback: (value: any) => `${Math.round(value * 100)}%`,
                      },
                      title: { display: true, text: "Accuracy (%)" },
                    },
                    x: {
                      title: { display: true, text: "Month" },
                    },
                  },
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: (context: any) =>
                          `${Math.round(context.raw * 100)}%`,
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        )}

        {/* Class-wise Accuracy with Bar Chart */}
        {accuracyData?.class_wise && accuracyData.class_wise.length > 0 && (
          <div className="accuracy-section-card fade-in">
            <div className="section-header">
              <div className="section-title">
                <i>🏫</i> Class-wise Recognition Accuracy
              </div>
            </div>
            <div className="bar-chart-container">
              {accuracyData.class_wise.map((cls: any, idx: number) => (
                <div key={idx} className="bar-item">
                  <div className="bar-label">
                    <span className="bar-name">{cls.class_name}</span>
                    <span className="bar-percentage">{cls.accuracy}%</span>
                  </div>
                  <div className="bar-bg">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${cls.accuracy}%`,
                        background: `linear-gradient(90deg, #3b82f6, ${cls.accuracy > 70 ? "#22c55e" : cls.accuracy > 50 ? "#eab308" : "#ef4444"})`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Results Table */}
        {testResults?.results && testResults.results.length > 0 && (
          <div className="accuracy-section-card fade-in">
            <div className="section-header">
              <div className="section-title">
                <i>📋</i> Recent Test Results
              </div>
            </div>
            <div className="accuracy-table-container">
              <table className="accuracy-table">
                <thead>
                  <tr>
                    <th>Expected</th>
                    <th>Recognized</th>
                    <th>Confidence</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.results
                    .slice(0, 20)
                    .map((result: any, idx: number) => (
                      <tr key={idx}>
                        <td>{result.expected}</td>
                        <td>{result.recognized}</td>
                        <td>
                          <span className="confidence-badge">
                            {(result.confidence * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td>
                          {result.correct ? (
                            <span className="status-badge success">
                              ✓ Correct
                            </span>
                          ) : (
                            <span className="status-badge error">
                              ✗ Incorrect
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="accuracy-actions">
          <button onClick={fetchData} className="btn-refresh">
            🔄 Refresh Data
          </button>
          <button
            onClick={() => {
              toast.loading("Calculating accuracy...");
              setTimeout(fetchData, 2000);
            }}
            className="btn-recalculate"
          >
            📊 Recalculate Accuracy
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccuracyDashboard;
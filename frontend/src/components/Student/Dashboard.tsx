import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../../services/auth";
import api from "../../services/api";
import toast from "react-hot-toast";
import "./Dashboard.css";
import { Line, Bar } from 'react-chartjs-2';
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
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AttendanceRecord {
  id: string;
  date: string;
  time: string;
  status: string;
  confidence: number;
}

interface StudentInfo {
  id: string;
  name: string;
  roll_number: string;
  email: string;
  mobile_number: string;
  father_mobile: string;
  photo_url: string;
  class_name: string;
  section: string;
  subject: string;
  enrolled_classes?: any[];
}

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem("studentActiveTab");
    return savedTab || "overview";
  });
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState("");
  const [dailyChartData, setDailyChartData] = useState<any>(null);
  const [monthlyChartData, setMonthlyChartData] = useState<any>(null);
  const [stats, setStats] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    percentage: 0,
  });
  
  // Modal states for clickable cards
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"present" | "absent">("present");
  const [modalDates, setModalDates] = useState<string[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    fetchStudentInfo();
    fetchAttendance();
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem("studentActiveTab", activeTab);
  }, [activeTab]);

  const fetchStudentInfo = async () => {
    try {
      const response = await api.get("/students/my-info");
      setStudentInfo(response.data);
      if (response.data.enrolled_classes) {
        console.log("Enrolled Classes:", response.data.enrolled_classes);
      }
    } catch (error) {
      console.error("Error fetching student info:", error);
      try {
        const fallbackRes = await api.get("/students/profile");
        setStudentInfo(fallbackRes.data);
      } catch (e) {
        console.error("Fallback also failed:", e);
      }
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await api.get("/attendance/my");
      setAttendance(response.data);
      calculateStats(response.data);
      prepareChartData(response.data);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (records: AttendanceRecord[]) => {
    const uniqueDates = [...new Set(records.map((r) => r.date))];
    
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthRecords = records.filter((r) => r.date.startsWith(currentMonth));
    const monthPresent = [...new Set(monthRecords.map((r) => r.date))].length;

    const totalWorkingDays = 30;
    const attendancePercentage = Math.round(
      (monthPresent / totalWorkingDays) * 100,
    );

    setStats({
      totalDays: totalWorkingDays,
      presentDays: monthPresent,
      absentDays: totalWorkingDays - monthPresent,
      percentage: attendancePercentage,
    });
  };

  // Helper functions for clickable cards
  const getPresentDates = () => {
    const presentDates = attendance
      .filter(record => record.status === "present")
      .map(record => record.date);
    return [...new Set(presentDates)];
  };

  const getAbsentDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const allDates = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      allDates.push(dateStr);
    }
    
    const presentDates = getPresentDates();
    return allDates.filter(date => !presentDates.includes(date));
  };

  const handleCardClick = (type: "present" | "absent") => {
    setModalType(type);
    if (type === "present") {
      setModalDates(getPresentDates());
    } else {
      setModalDates(getAbsentDates());
    }
    setShowModal(true);
  };

  const prepareChartData = (records: AttendanceRecord[]) => {
    // Daily chart (last 30 days)
    const last30Days = [];
    const dailyPresent = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleString('default', { weekday: 'short' });
      
      last30Days.push(`${dayName} ${dateStr.substring(5)}`);
      
      const isPresent = records.some(r => r.date === dateStr);
      dailyPresent.push(isPresent ? 1 : 0);
    }
    
    setDailyChartData({
      labels: last30Days,
      datasets: [{
        label: 'Attendance',
        data: dailyPresent,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: dailyPresent.map(v => v === 1 ? '#22c55e' : '#ef4444'),
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    });
    
    // Monthly chart (last 6 months)
    const months = [];
    const monthlyPresent = [];
    const monthlyTotal = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'short' });
      
      months.push(`${monthName} ${date.getFullYear()}`);
      
      const monthRecords = records.filter(r => r.date.startsWith(monthStr));
      const presentCount = [...new Set(monthRecords.map(r => r.date))].length;
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      
      monthlyPresent.push(presentCount);
      monthlyTotal.push(daysInMonth);
    }
    
    setMonthlyChartData({
      labels: months,
      datasets: [
        {
          label: 'Present Days',
          data: monthlyPresent,
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderRadius: 8,
          barPercentage: 0.6
        },
        {
          label: 'Total Days',
          data: monthlyTotal,
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
          borderRadius: 8,
          barPercentage: 0.6
        }
      ]
    });
  };

  const getFilteredAttendance = () => {
    if (!filterMonth) return attendance;
    return attendance.filter((record) => record.date.startsWith(filterMonth));
  };

  const getAvailableMonths = () => {
    const monthsSet = new Set<string>();
    attendance.forEach((record) => {
      const month = record.date.substring(0, 7);
      monthsSet.add(month);
    });

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    if (monthsSet.size === 0) {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      return [
        {
          value: currentMonth,
          label: `${monthNames[now.getMonth()]} ${now.getFullYear()}`,
        },
      ];
    }

    return Array.from(monthsSet)
      .sort()
      .reverse()
      .map((month) => ({
        value: month,
        label: `${monthNames[parseInt(month.split("-")[1]) - 1]} ${month.split("-")[0]}`,
      }));
  };

  const downloadExcel = async () => {
    try {
      toast.loading("Generating Excel...", { id: "excel" });
      const response = await api.get("/reports/student/attendance", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `my_attendance_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Excel downloaded!", { id: "excel" });
    } catch (error) {
      toast.error("Failed to download Excel", { id: "excel" });
    }
  };

  const downloadPDF = async () => {
    try {
      toast.loading("Generating PDF...", { id: "pdf" });
      const response = await api.get("/reports/pdf/student/attendance", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `my_attendance_${new Date().toISOString().split("T")[0]}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded!", { id: "pdf" });
    } catch (error) {
      toast.error("Failed to download PDF", { id: "pdf" });
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filteredAttendance = getFilteredAttendance();
  const availableMonths = getAvailableMonths();

  const getMonthName = (dateStr: string) => {
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const month = parseInt(dateStr.split("-")[1]) - 1;
    return monthNames[month];
  };

  const groupedByMonth: { [key: string]: AttendanceRecord[] } = {};
  filteredAttendance.forEach((record) => {
    const month = record.date.substring(0, 7);
    if (!groupedByMonth[month]) {
      groupedByMonth[month] = [];
    }
    groupedByMonth[month].push(record);
  });

  const getUserInitial = () => {
    if (user?.full_name) return user.full_name.charAt(0).toUpperCase();
    if (user?.username) return user.username.charAt(0).toUpperCase();
    return "S";
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "attendance", label: "Attendance", icon: "📅" },
    { id: "profile", label: "Profile", icon: "👤" },
  ];

  const getPhotoUrl = () => {
    if (studentInfo?.photo_url) {
      return `http://localhost:8000${studentInfo.photo_url}`;
    }
    return undefined;
  };

  return (
    <div className="student-dashboard">
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <span>SA</span>
            </div>
            <div className="sidebar-logo-text">
              <h2>SmartAttend</h2>
              <p>Student Portal</p>
            </div>
          </div>
        </div>
        <div className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
            >
              <i>{item.icon}</i>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{getUserInitial()}</div>
            <div className="user-details">
              <h4>{user?.full_name || user?.username}</h4>
              <p>Student</p>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <i className="fa-solid fa-door-open"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="top-bar">
          <div className="page-title">
            <h1>Welcome, {studentInfo?.name?.split(" ")[0] || "Student"}!</h1>
            <p>Track your attendance and academic progress</p>
          </div>
        </div>

        {activeTab === "overview" && (
          <>
            {studentInfo && (
              <div className="profile-card">
                <div className="profile-card-inner">
                  <div className="profile-header">
                    <div className="profile-name">
                      <div className="flex items-center gap-4">
                        {getPhotoUrl() && (
                          <img
                            src={getPhotoUrl()}
                            alt={studentInfo.name}
                            className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        )}
                        <div>
                          <h2>{studentInfo.name}</h2>
                          <div className="profile-badges">
                            <div className="profile-badge">
                              <i className="fa-solid fa-id-card"></i>
                              {studentInfo.roll_number}
                            </div>
                            <div className="profile-badge">
                              <i className="fa-solid fa-book"></i>
                              {studentInfo.class_name} - {studentInfo.section}
                            </div>
                            <div className="profile-badge">
                              <i className="fa-solid fa-graduation-cap"></i>
                              {studentInfo.subject}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="profile-contact">
                      <div>
                        <i className="fa-solid fa-envelope"></i>
                        Student Email: {studentInfo.email}
                      </div>
                      <div>
                        <i className="fa-solid fa-phone"></i>
                        Student Mobile: {studentInfo.mobile_number}
                      </div>
                      <div>
                        <i className="fa-solid fa-user-friends"></i>
                        Student Father: {studentInfo.father_mobile || "Not provided"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {studentInfo?.enrolled_classes && studentInfo.enrolled_classes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  📚 My Enrolled Classes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {studentInfo.enrolled_classes.map((cls: any, idx: number) => (
                    <div key={idx} className="border border-green-200 rounded-lg p-3 bg-green-50">
                      <p className="font-medium text-green-800">
                        {cls.class_name} - {cls.section}
                      </p>
                      <p className="text-sm text-gray-600">
                        {cls.course_name || cls.subject}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Teacher: {cls.teacher_name || "Not assigned"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fa-solid fa-calendar-days"></i>
                </div>
                <div className="stat-value">{stats.totalDays}</div>
                <div className="stat-label">Total Working Days</div>
              </div>
              
              <div 
                className="stat-card cursor-pointer hover:scale-105 transition-transform" 
                onClick={() => handleCardClick("present")}
              >
                <div className="stat-icon">
                  <i className="fa-solid fa-check-circle"></i>
                </div>
                <div className="stat-value">{stats.presentDays}</div>
                <div className="stat-label">Days Present</div>
                <div className="text-xs text-green-600 mt-1">Click to view</div>
              </div>
              
              <div 
                className="stat-card cursor-pointer hover:scale-105 transition-transform" 
                onClick={() => handleCardClick("absent")}
              >
                <div className="stat-icon">
                  <i className="fa-solid fa-calendar-xmark"></i>
                </div>
                <div className="stat-value">{stats.absentDays}</div>
                <div className="stat-label">Days Absent</div>
                <div className="text-xs text-red-600 mt-1">Click to view</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fa-solid fa-chart-bar"></i>
                </div>
                <div className="stat-value">{stats.percentage}%</div>
                <div className="stat-label">Attendance Percentage</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-chart-line"></i>
                Daily Attendance (Last 30 Days)
              </h3>
              <div className="h-80">
                {dailyChartData ? (
                  <Line 
                    data={dailyChartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 1,
                          ticks: {
                            stepSize: 1,
                            callback: (value) => value === 1 ? 'Present' : 'Absent'
                          }
                        }
                      },
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: (context) => context.raw === 1 ? '✅ Present' : '❌ Absent'
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    Loading chart...
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-chart-bar"></i>
                Monthly Attendance Overview (Last 6 Months)
              </h3>
              <div className="h-96">
                {monthlyChartData ? (
                  <Bar 
                    data={monthlyChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Number of Days'
                          }
                        }
                      },
                      plugins: {
                        legend: {
                          position: 'top'
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => `${context.dataset.label}: ${context.raw} days`
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    Loading chart...
                  </div>
                )}
              </div>
            </div>

            <div className="progress-section">
              <div className="progress-header">
                <h3>
                  <i className="fa-solid fa-chart-line"></i>
                  Attendance Progress -{" "}
                  {new Date().toLocaleString("default", { month: "long" })} {new Date().getFullYear()}
                </h3>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-label">
                  <span>Progress</span>
                  <span>{stats.percentage}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${stats.percentage >= 75 ? "high" : stats.percentage >= 60 ? "medium" : "low"}`}
                    style={{ width: `${stats.percentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="progress-message">
                {stats.percentage >= 75
                  ? "✅ Excellent! Keep it up!"
                  : stats.percentage >= 60
                    ? "⚠️ Good, but you can do better!"
                    : "❌ Your attendance needs improvement!"}
              </div>
            </div>

            <div className="section-header">
              <h2>Recent Attendance</h2>
            </div>
            <div className="attendance-table-container">
              <div className="table-header">
                <h3>Recent Attendance Records</h3>
              </div>
              {attendance.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <i className="fa-solid fa-inbox"></i>
                  </div>
                  <p>No attendance records found.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.slice(0, 5).map((record, idx) => (
                      <tr key={idx}>
                        <td>{record.date}</td>
                        <td>{record.time}</td>
                        <td>
                          <span className="status-badge">
                            <i className="fa-solid fa-check"></i>
                            Present
                          </span>
                        </td>
                        <td>
                          <span className="confidence-badge">
                            {Math.round(record.confidence * 100)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {activeTab === "attendance" && (
          <div className="attendance-table-container">
            <div className="table-header">
              <h3>My Attendance Records</h3>
              <div className="table-actions">
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                >
                  <option value="">All Months</option>
                  {availableMonths.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <button className="excel-btn" onClick={downloadExcel}>
                  <i className="fa-solid fa-file-excel"></i>
                  Excel
                </button>
                <button className="pdf-btn" onClick={downloadPDF}>
                  <i className="fa-solid fa-file-pdf"></i>
                  PDF
                </button>
              </div>
            </div>
            {loading ? (
              <div className="empty-state">
                <div className="spinner"></div>
                <p>Loading...</p>
              </div>
            ) : filteredAttendance.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <i className="fa-solid fa-inbox"></i>
                </div>
                <p>No attendance records found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Month</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedByMonth).map(([month, records]) => (
                      <React.Fragment key={month}>
                        <tr className="bg-gray-50">
                          <td colSpan={5} className="font-semibold text-green-700 py-2 px-4">
                            <i className="fa-solid fa-calendar-days"></i>
                            {getMonthName(month)} {month.split("-")[0]}
                          </td>
                        </tr>
                        {records.map((record, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-4">{record.date}</td>
                            <td className="py-2 px-4 text-gray-600">
                              {getMonthName(record.date)}
                            </td>
                            <td className="py-2 px-4 text-gray-600">
                              {record.time}
                            </td>
                            <td className="py-2 px-4">
                              <span className="status-badge">
                                <i className="fa-solid fa-check"></i>
                                Present
                              </span>
                            </td>
                            <td className="py-2 px-4">
                              <span className="confidence-badge">
                                {Math.round(record.confidence * 100)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "profile" && studentInfo && (
          <div className="attendance-table-container">
            <div className="table-header">
              <h3>My Profile</h3>
            </div>
            <div style={{ padding: "24px" }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex justify-center">
                  {getPhotoUrl() ? (
                    <img
                      src={getPhotoUrl()}
                      alt={studentInfo.name}
                      className="w-40 h-40 rounded-full object-cover border-4 border-green-500 shadow-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://via.placeholder.com/150?text=No+Photo";
                      }}
                    />
                  ) : (
                    <div className="w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center border-4 border-green-500">
                      <span className="text-4xl text-gray-500">
                        <i className="fa-solid fa-camera"></i>
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">
                    Personal Information
                  </h4>
                  <div className="space-y-2">
                    <div><strong>Full Name:</strong> {studentInfo.name}</div>
                    <div><strong>Roll Number:</strong> {studentInfo.roll_number}</div>
                    <div><strong>Email:</strong> {studentInfo.email}</div>
                    <div><strong>Mobile Number:</strong> {studentInfo.mobile_number}</div>
                    <div><strong>Father's Mobile:</strong> {studentInfo.father_mobile || "Not provided"}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">
                    Academic Information
                  </h4>
                  <div className="space-y-2">
                    <div><strong>Class:</strong> {studentInfo.class_name}</div>
                    <div><strong>Section:</strong> {studentInfo.section}</div>
                    <div><strong>Subject:</strong> {studentInfo.subject}</div>
                    {studentInfo.enrolled_classes && studentInfo.enrolled_classes.length > 0 && (
                      <div>
                        <strong>Enrolled Classes:</strong>{" "}
                        {studentInfo.enrolled_classes.map((c) => `${c.class_name} (${c.section})`).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 max-h-96 overflow-auto" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold">
                {modalType === "present" ? "✅ Present Days" : "❌ Absent Days"}
              </h3>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              {modalDates.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No {modalType} days found</p>
              ) : (
                <div className="space-y-2">
                  {modalDates.map((date, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                      <span className="font-medium">{date}</span>
                      <span className={`text-sm ${modalType === "present" ? "text-green-600" : "text-red-600"}`}>
                        {modalType === "present" ? "✓ Present" : "✗ Absent"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
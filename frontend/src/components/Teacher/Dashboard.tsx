import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../../services/auth";
import api from "../../services/api";
import toast from "react-hot-toast";
import "./Dashboard.css";
import SearchBar from "../Common/SearchBar";

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem("teacherActiveTab");
    return savedTab || "dashboard";
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [classAttendance, setClassAttendance] = useState<any>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("idle");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  let recognitionInterval: ReturnType<typeof setTimeout> | null = null;

  // Add Class Form
  const [showAddClassForm, setShowAddClassForm] = useState(false);
  const [classFormData, setClassFormData] = useState({
    class_name: "",
    section: "",
    subject: "",
  });
  const [loading, setLoading] = useState(false);

  // Add Student Form
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [studentFormData, setStudentFormData] = useState({
    name: "",
    email: "",
    roll_number: "",
    university_roll_no: "",
    class_id: "",
    mobile_number: "",
    father_mobile: "",
  });
  const [studentPhoto, setStudentPhoto] = useState<File | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);

  // Edit Class State
  const [editingClass, setEditingClass] = useState<any>(null);
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [editClassData, setEditClassData] = useState({
    class_name: "",
    section: "",
    subject: "",
  });

  // Edit Student State
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editStudentData, setEditStudentData] = useState({
    name: "",
    email: "",
    roll_number: "",
    university_roll_no: "",
    class_id: "",
    mobile_number: "",
    father_mobile: "",
  });
  const [editStudentPhoto, setEditStudentPhoto] = useState<File | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    averageAttendance: 0,
    totalClasses: 0,
  });

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    // Debug: Check user role
    console.log("Logged in user:", user);
    console.log("User role:", user?.role);

    setIsLoading(false);
    fetchClasses();
    fetchTodayAttendance();
    fetchTotalStudents();
    fetchAverageAttendance();
  }, [navigate]);

  useEffect(() => {
    if (classes.length > 0) {
      fetchTotalStudents();
    }
  }, [classes]);

  useEffect(() => {
    localStorage.setItem("teacherActiveTab", activeTab);
  }, [activeTab]);

  const fetchClasses = async () => {
    try {
      const response = await api.get("/classes");
      setClasses(response.data);
      setStats((prev) => ({ ...prev, totalClasses: response.data.length }));
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const response = await api.get("/attendance/today");
      setTodayAttendance(response.data);
      setStats((prev) => ({ ...prev, presentToday: response.data.length }));
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };

  const fetchClassAttendance = async (classId: string) => {
    try {
      const response = await api.get(`/attendance/class/${classId}/today`);
      setClassAttendance(response.data);
      setShowAttendanceModal(true);
    } catch (error) {
      toast.error("Failed to fetch class attendance");
    }
  };

  const fetchTotalStudents = async () => {
    try {
      const classesRes = await api.get("/classes");
      let total = 0;
      for (const cls of classesRes.data) {
        try {
          const studentsRes = await api.get(`/students/class/${cls.id}`);
          total += studentsRes.data.length;
        } catch (err) {
          console.error(`Error fetching students for class ${cls.id}`);
        }
      }
      setStats((prev) => ({ ...prev, totalStudents: total }));
    } catch (error) {
      console.error("Error calculating total students:", error);
      setStats((prev) => ({ ...prev, totalStudents: 0 }));
    }
  };

  const fetchAverageAttendance = async () => {
    try {
      const response = await api.get("/attendance/average");
      let avg = response.data.average || 0;
      if (avg > 100) avg = 100;
      setStats((prev) => ({ ...prev, averageAttendance: avg }));
    } catch (error) {
      console.error("Error fetching average attendance:", error);
      setStats((prev) => ({ ...prev, averageAttendance: 0 }));
    }
  };

  const fetchStudents = async (classId: string) => {
    try {
      const response = await api.get(`/students/class/${classId}`);
      setStudents(response.data);
      setActiveTab("students");
    } catch (error) {
      toast.error("Failed to fetch students");
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !classFormData.class_name ||
      !classFormData.section ||
      !classFormData.subject
    ) {
      toast.error("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      await api.post("/classes", classFormData);
      toast.success("Class added successfully!");
      setClassFormData({ class_name: "", section: "", subject: "" });
      setShowAddClassForm(false);
      fetchClasses();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to add class");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentPhoto) {
      toast.error("Please select a photo");
      return;
    }
    if (!studentFormData.class_id) {
      toast.error("Please select a class");
      return;
    }
    setStudentLoading(true);
    const formData = new FormData();
    formData.append("name", studentFormData.name);
    formData.append("email", studentFormData.email);
    formData.append("roll_number", studentFormData.roll_number);
    formData.append("university_roll_no", studentFormData.university_roll_no);
    formData.append("class_id", studentFormData.class_id);
    formData.append("mobile_number", studentFormData.mobile_number);
    formData.append("father_mobile", studentFormData.father_mobile);
    formData.append("photo", studentPhoto);
    try {
      const response = await api.post("/students", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(
        `Student added! Password: ${response.data.default_password}`,
      );
      setStudentFormData({
        name: "",
        email: "",
        roll_number: "",
        university_roll_no: "",
        class_id: "",
        mobile_number: "",
        father_mobile: "",
      });
      setStudentPhoto(null);
      setShowAddStudentForm(false);
      fetchTotalStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to add student");
    } finally {
      setStudentLoading(false);
    }
  };

  const openEditClassModal = (cls: any) => {
    setEditingClass(cls);
    setEditClassData({
      class_name: cls.class_name,
      section: cls.section,
      subject: cls.subject,
    });
    setShowEditClassModal(true);
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/classes/${editingClass.id}`, editClassData);
      toast.success("Class updated successfully!");
      setShowEditClassModal(false);
      fetchClasses();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to update class");
    } finally {
      setLoading(false);
    }
  };

  const openEditStudentModal = (student: any) => {
    setEditingStudent(student);
    setEditStudentData({
      name: student.name,
      email: student.email,
      roll_number: student.roll_number,
      university_roll_no: student.university_roll_no || "",
      class_id: student.class_id,
      mobile_number: student.mobile_number,
      father_mobile: student.father_mobile,
    });
    setEditStudentPhoto(null);
    setShowEditStudentModal(true);
  };

const handleUpdateStudent = async (e: React.FormEvent) => {
  e.preventDefault();
  setStudentLoading(true);

  try {
    let response;
    
    // ✅ Agar photo selected hai toh FormData use karo
    if (editStudentPhoto) {
      const formData = new FormData();
      formData.append("name", editStudentData.name);
      formData.append("email", editStudentData.email);
      formData.append("roll_number", editStudentData.roll_number);
      formData.append("university_roll_no", editStudentData.university_roll_no || "");
      formData.append("class_id", editStudentData.class_id);
      formData.append("mobile_number", editStudentData.mobile_number || "");
      formData.append("father_mobile", editStudentData.father_mobile || "");
      formData.append("photo", editStudentPhoto);
      
      response = await api.put(`/students/${editingStudent.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } else {
      // ✅ Bina photo ke JSON
      const updateData = {
        name: editStudentData.name,
        email: editStudentData.email,
        roll_number: editStudentData.roll_number,
        university_roll_no: editStudentData.university_roll_no || "",
        class_id: editStudentData.class_id,
        mobile_number: editStudentData.mobile_number || "",
        father_mobile: editStudentData.father_mobile || "",
      };
      
      response = await api.put(`/students/${editingStudent.id}`, updateData);
    }

    toast.success("Student updated successfully!");
    setShowEditStudentModal(false);
    setEditStudentPhoto(null); // ✅ Reset photo after update
    
    if (activeTab === "students") {
      fetchStudents(editingStudent.class_id);
    }
    fetchTotalStudents();
    
  } catch (error: any) {
    toast.error(error.response?.data?.detail || "Failed to update student");
  } finally {
    setStudentLoading(false);
  }
};

  const deleteClass = async (classId: string) => {
    if (confirm("Are you sure? This will delete the class and all students!")) {
      try {
        await api.delete(`/classes/${classId}`);
        toast.success("Class deleted");
        fetchClasses();
        fetchTotalStudents();
      } catch (error) {
        toast.error("Failed to delete class");
      }
    }
  };

  const deleteStudent = async (studentId: string) => {
    if (confirm("Are you sure you want to delete this student?")) {
      try {
        await api.delete(`/students/${studentId}`);
        toast.success("Student deleted");
        if (activeTab === "students") {
          fetchStudents(students[0]?.class_id);
        }
        fetchTotalStudents();
      } catch (error) {
        toast.error("Failed to delete student");
      }
    }
  };

  const downloadExcel = async () => {
    try {
      toast.loading("Generating Excel...");
      const response = await api.get("/reports/teacher/attendance", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `attendance_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
      link.click();
      link.remove();
      toast.dismiss();
      toast.success("Excel downloaded!");
    } catch (error) {
      toast.error("Failed to download Excel");
    }
  };

  const downloadPDF = async () => {
    try {
      toast.loading("Generating PDF...");
      const response = await api.get("/reports/pdf/teacher/attendance", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `attendance_${new Date().toISOString().split("T")[0]}.pdf`,
      );
      link.click();
      link.remove();
      toast.dismiss();
      toast.success("PDF downloaded!");
    } catch (error) {
      toast.error("Failed to download PDF");
    }
  };

  // Export Attendance to Excel
  const exportAttendanceToExcel = (attendanceData: any) => {
    try {
      // Create CSV data
      const headers = [
        "Roll No",
        "Student Name",
        "Status",
        "Time",
        "Confidence",
      ];
      const rows = attendanceData.students.map((s: any) => [
        s.roll_number,
        s.student_name,
        s.status === "present" ? "Present" : "Absent",
        s.time || "-",
        s.confidence ? `${Math.round(s.confidence * 100)}%` : "-",
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.join(","))
        .join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${attendanceData.class_name}_attendance_${attendanceData.date}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Excel report downloaded!");
    } catch (error) {
      toast.error("Failed to download Excel report");
    }
  };

  // Export Attendance to PDF
  const exportAttendanceToPDF = async (attendanceData: any) => {
    try {
      toast.loading("Generating PDF...", { id: "pdf" });

      // Create HTML content for PDF
      const presentCount = attendanceData.students.filter(
        (s: any) => s.status === "present",
      ).length;
      const absentCount = attendanceData.students.filter(
        (s: any) => s.status === "absent",
      ).length;

      let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Attendance Report - ${attendanceData.class_name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #4c1d95; text-align: center; }
          .header { text-align: center; margin-bottom: 30px; }
          .class-info { background: #f3f4f6; padding: 15px; border-radius: 10px; margin-bottom: 20px; }
          .stats { display: flex; justify-content: space-around; margin-bottom: 30px; }
          .stat-card { background: #e0e7ff; padding: 15px; border-radius: 10px; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #4c1d95; color: white; }
          .present { color: green; font-weight: bold; }
          .absent { color: red; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SmartAttend - Attendance Report</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
        <div class="class-info">
          <h3>Class: ${attendanceData.class_name}</h3>
          <p>Date: ${attendanceData.date}</p>
        </div>
        <div class="stats">
          <div class="stat-card"><h3>Total Students</h3><p>${attendanceData.total_students}</p></div>
          <div class="stat-card"><h3>Present</h3><p style="color: green;">${presentCount}</p></div>
          <div class="stat-card"><h3>Absent</h3><p style="color: red;">${absentCount}</p></div>
          <div class="stat-card"><h3>Attendance %</h3><p>${((presentCount / attendanceData.total_students) * 100).toFixed(1)}%</p></div>
        </div>
        <table>
          <thead><tr><th>Roll No</th><th>Student Name</th><th>Status</th><th>Time</th></tr></thead>
          <tbody>
            ${attendanceData.students
              .map(
                (s: any) => `
              <tr>
                <td>${s.roll_number}</td>
                <td>${s.student_name}</td>
                <td class="${s.status}">${s.status === "present" ? "✓ Present" : "✗ Absent"}</td>
                <td>${s.time || "-"}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
        <div class="footer">
          <p>This is a system-generated report from SmartAttend Attendance System</p>
        </div>
      </body>
      </html>
    `;

      // Use html2pdf if available, otherwise fallback to print
      const win = window.open("", "_blank");
      win?.document.write(htmlContent);
      win?.document.close();
      win?.print();

      toast.dismiss("pdf");
      toast.success("PDF generated! Use browser print to save as PDF");
    } catch (error) {
      toast.dismiss("pdf");
      toast.error("Failed to generate PDF");
    }
  };

  const startCamera = async () => {
    if (!selectedClassId && activeTab === "classAttendance") {
      toast.error("Please select a class first");
      return;
    }

    setShowCamera(true);
    setCameraStatus("loading");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraStatus("active");
        startFaceRecognition();
      }
    } catch (error) {
      toast.error("Could not access camera");
      setCameraStatus("idle");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
    setCameraStatus("idle");
    if (recognitionInterval) {
      clearInterval(recognitionInterval);
      recognitionInterval = null;
    }
  };

  let markedToday: string[] = [];

  const startFaceRecognition = () => {
    if (recognitionInterval) clearInterval(recognitionInterval);
    markedToday = [];

    // ✅ Get class ID from state
    let currentClassId = selectedClassId;

    // ✅ Agar class ID nahi hai to error dikhao
    if (!currentClassId) {
      toast.error("Please select a class first");
      stopCamera();
      return;
    }

    console.log("✅ Using Class ID:", currentClassId);
    console.log("✅ Active Tab:", activeTab);

    recognitionInterval = setInterval(async () => {
      if (
        canvasRef.current &&
        videoRef.current &&
        videoRef.current.videoWidth > 0
      ) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          async (blob) => {
            if (blob) {
              const formData = new FormData();
              formData.append("file", blob, "frame.jpg");
              formData.append("class_id", currentClassId);

              console.log("📤 Sending class_id:", currentClassId);

              try {
                const response = await api.post(
                  "/attendance/recognize-with-class",
                  formData,
                  {
                    headers: { "Content-Type": "multipart/form-data" },
                  },
                );

                console.log("📥 Response:", response.data);

                if (
                  response.data.recognized &&
                  !markedToday.includes(response.data.name)
                ) {
                  markedToday.push(response.data.name);
                  const className =
                    classes.find((c) => c.id === currentClassId)?.class_name ||
                    "class";
                  toast.success(
                    `✅ ${response.data.name} marked present for ${className}!`,
                  );
                  fetchTodayAttendance();
                  fetchAverageAttendance();
                } else if (response.data.already_marked) {
                  // Silent - already marked
                  console.log("Already marked:", response.data.name);
                } else if (response.data.not_in_class) {
                  toast.error(`${response.data.name} is not in this class!`);
                } else if (!response.data.recognized) {
                  console.log("Face not recognized");
                }
              } catch (error) {
                console.error("❌ API Error:", error);
                toast.error("Failed to mark attendance");
              }
            }
          },
          "image/jpeg",
          0.5,
        );
      }
    }, 3000);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getUserInitial = () => {
    if (user?.full_name) return user.full_name.charAt(0).toUpperCase();
    if (user?.username) return user.username.charAt(0).toUpperCase();
    return "T";
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "classes", label: "My Classes", icon: "📚" },
    { id: "attendance", label: "Attendance", icon: "📅" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <span>SA</span>
            </div>
            <div className="sidebar-logo-text">
              <h2>SmartAttend</h2>
              <p>Teacher Portal</p>
            </div>
          </div>
        </div>
        <div className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setShowAddClassForm(false);
                setShowAddStudentForm(false);
              }}
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
              <p>Teacher</p>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <i>🚪</i>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="top-bar">
          <div className="page-title">
            <h1>
              Welcome back, {user?.full_name?.split(" ")[0] || "Teacher"}!
            </h1>
            <p>Here's what's happening with your classes today.</p>
          </div>
          <div className="header-actions">
            <SearchBar />
            <button
              className="header-btn"
              onClick={() => setShowAddClassForm(!showAddClassForm)}
            >
              <i>➕</i> Add Class
            </button>
            <button className="header-btn camera-btn" onClick={startCamera}>
              <i>📸</i> Take Attendance
            </button>
          </div>
        </div>

        {/* Dashboard View - Stats Cards */}
        {activeTab === "dashboard" && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-title">Total Students</span>
                  <div className="stat-icon">
                    {/* 👥 */}
                    <i className="fa-solid fa-users"></i>
                  </div>
                </div>
                <div className="stat-value">{stats.totalStudents}</div>
                <div className="stat-change">Enrolled across all classes</div>
              </div>
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-title">Present Today</span>
                  <div className="stat-icon">
                    {/* ✅ */}
                    <i className="fa-solid fa-check-circle"></i>
                  </div>
                </div>
                <div className="stat-value">{stats.presentToday}</div>
                <div className="stat-change">
                  out of {stats.totalStudents} students
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-title">Average Attendance</span>
                  <div className="stat-icon">
                    {/* 📊 */}
                    <i className="fa-solid fa-chart-bar"></i>
                  </div>
                </div>
                <div className="stat-value">{stats.averageAttendance}%</div>
                <div className="stat-change">This month</div>
              </div>
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-title">Total Classes</span>
                  <div className="stat-icon">
                    {/* 📚 */}
                    <i className="fa-solid fa-book"></i>
                  </div>
                </div>
                <div className="stat-value">{stats.totalClasses}</div>
                <div className="stat-change">Active classes</div>
              </div>
            </div>

            <div className="section-header">
              <h2>My Classes</h2>
              <a
                onClick={() => {
                  setActiveTab("classes");
                  setShowAddClassForm(false);
                }}
              >
                View All →
              </a>
            </div>
            <div className="classes-grid">
              {classes.slice(0, 3).map((cls) => (
                <div key={cls.id} className="class-card">
                  <div className="class-header">
                    <div className="class-icon">
                      <i className="fa-solid fa-book"></i>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => openEditClassModal(cls)}
                        className="edit-btn"
                        title="Edit Class"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteClass(cls.id)}
                        className="class-delete"
                        title="Delete Class"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <h3 className="class-title">{cls.class_name}</h3>
                  <div className="class-details">
                    <div className="class-detail">
                      📌 Section: {cls.section}
                    </div>
                    <div className="class-detail">
                      📖 Subject: {cls.subject}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginTop: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() => fetchStudents(cls.id)}
                      className="class-btn"
                      style={{ flex: 1 }}
                    >
                      View Students →
                    </button>
                    <button
                      onClick={() => {
                        setSelectedClassId(cls.id);
                        setActiveTab("classAttendance");
                        fetchStudents(cls.id);
                      }}
                      className="class-btn"
                      style={{ flex: 1, background: "#10b981", color: "white" }}
                    >
                      <i className="fa-solid fa-calendar-check"></i> Take
                      Attendance
                    </button>
                    <button
                      onClick={() => fetchClassAttendance(cls.id)}
                      className="class-btn"
                      style={{ flex: 1, background: "#3b82f6", color: "white" }}
                    >
                      <i className="fa-solid fa-chart-simple"></i> View
                      Attendance
                    </button>
                    <button
                      onClick={() => {
                        setStudentFormData({
                          ...studentFormData,
                          class_id: cls.id,
                        });
                        setShowAddStudentForm(true);
                      }}
                      className="class-btn"
                      style={{ flex: 1, background: "#10b981", color: "white" }}
                    >
                      <i className="fa-solid fa-graduation-cap"></i> Add Student
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="section-header">
              <h2>Today's Attendance</h2>
              <a onClick={() => setActiveTab("attendance")}>View All →</a>
            </div>
            <div className="attendance-table-container">
              <div className="table-header">
                <h3>Recent Attendance Records</h3>
                <div className="table-actions">
                  <button className="excel-btn" onClick={downloadExcel}>
                    <i className="fa-solid fa-file-excel"></i> Excel
                  </button>
                  <button className="pdf-btn" onClick={downloadPDF}>
                    📄 PDF
                  </button>
                </div>
              </div>
              {todayAttendance.length === 0 ? (
                <div className="empty-state">No attendance recorded today.</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Time</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayAttendance.slice(0, 5).map((record: any) => (
                      <tr key={record.id}>
                        <td className="px-4 py-2">{record.student_name}</td>
                        <td className="px-4 py-2">{record.time}</td>
                        <td className="px-4 py-2">
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

        {/* Classes View */}
        {activeTab === "classes" && (
          <div className="attendance-table-container">
            <div className="table-header">
              <h3>All Classes</h3>
              <button
                className="excel-btn"
                onClick={() => setShowAddClassForm(true)}
              >
                ➕ Add New Class
              </button>
            </div>
            <div className="classes-grid" style={{ padding: "20px" }}>
              {classes.map((cls) => (
                <div key={cls.id} className="class-card">
                  <div className="class-header">
                    <div className="class-icon">
                      <i className="fa-solid fa-book"></i>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => openEditClassModal(cls)}
                        className="edit-btn"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteClass(cls.id)}
                        className="class-delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <h3 className="class-title">{cls.class_name}</h3>
                  <div className="class-details">
                    <div className="class-detail">
                      📌 Section: {cls.section}
                    </div>
                    <div className="class-detail">
                      📖 Subject: {cls.subject}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginTop: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() => fetchStudents(cls.id)}
                      className="class-btn"
                      style={{ flex: 1 }}
                    >
                      View Students →
                    </button>
                    <button
                      onClick={() => {
                        setSelectedClassId(cls.id);
                        setActiveTab("classAttendance");
                        fetchStudents(cls.id);
                      }}
                      className="class-btn"
                      style={{ flex: 1, background: "#10b981", color: "white" }}
                    >
                      <i className="fa-solid fa-calendar-check"></i> Take
                      Attendance
                    </button>
                    <button
                      onClick={() => fetchClassAttendance(cls.id)}
                      className="class-btn"
                      style={{ flex: 1, background: "#3b82f6", color: "white" }}
                    >
                      <i className="fa-solid fa-chart-simple"></i> View
                      Attendance
                    </button>
                    <button
                      onClick={() => {
                        setStudentFormData({
                          ...studentFormData,
                          class_id: cls.id,
                        });
                        setShowAddStudentForm(true);
                      }}
                      className="class-btn"
                      style={{ flex: 1, background: "#10b981", color: "white" }}
                    >
                      <i className="fa-solid fa-graduation-cap"></i> Add Student
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Students View */}
        {activeTab === "students" && (
          <div className="attendance-table-container">
            <div className="table-header">
              <h3>Students</h3>
              <button
                className="excel-btn"
                onClick={() => setActiveTab("classes")}
              >
                ← Back to Classes
              </button>
            </div>
            {students.length === 0 ? (
              <div className="empty-state">No students in this class yet.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td className="px-4 py-2">{student.roll_number}</td>
                      <td className="px-4 py-2">{student.name}</td>
                      <td className="px-4 py-2">{student.email}</td>
                      <td className="px-4 py-2">{student.mobile_number}</td>
                      <td className="px-4 py-2">
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => openEditStudentModal(student)}
                            className="edit-btn"
                          >
                            ✏️
                          </button>
                          {/* <button onClick={() => deleteClass(cls.id)} className="class-delete">🗑️</button> */}
                          <button
                            onClick={() => deleteStudent(student.id)}
                            className="class-delete"
                          >
                            {" "}
                            🗑️{" "}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Attendance View */}
        {activeTab === "attendance" && (
          <div className="attendance-table-container">
            <div className="table-header">
              <h3>Today's Attendance</h3>
              <div className="table-actions">
                <button className="excel-btn" onClick={downloadExcel}>
                  <i className="fa-solid fa-file-excel"></i> Excel
                </button>
                <button className="pdf-btn" onClick={downloadPDF}>
                  📄 PDF
                </button>
                <button className="header-btn camera-btn" onClick={startCamera}>
                  <i className="fa-solid fa-camera"></i> Take Attendance
                </button>
              </div>
            </div>
            {todayAttendance.length === 0 ? (
              <div className="empty-state">No attendance recorded today.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Time</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAttendance.map((record: any) => (
                    <tr key={record.id}>
                      <td className="px-4 py-2">{record.student_name}</td>
                      <td className="px-4 py-2">{record.time}</td>
                      <td className="px-4 py-2">
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
        )}

        {/* Class Attendance Tab */}
        {activeTab === "classAttendance" && (
          <div className="attendance-table-container">
            <div className="table-header class-attendance-header">
              <h3 className="class-attendance-title">
                Take Attendance for{" "}
                {classes.find((c) => c.id === selectedClassId)?.class_name ||
                  "Selected Class"}
                <span className="class-attendance-subject">
                  ({classes.find((c) => c.id === selectedClassId)?.subject})
                </span>
              </h3>
              <div className="class-attendance-actions">
                <button className="excel-btn" onClick={startCamera}>
                  📸 Start Camera
                </button>
                <button
                  className="pdf-btn"
                  onClick={() => setActiveTab("classes")}
                >
                  ← Change Class
                </button>
              </div>
            </div>
            <div className="class-attendance-container">
              <div className="class-attendance-camera-section">
                <div className="class-attendance-camera-icon">📸</div>
                <h3 className="class-attendance-camera-title">
                  Face Recognition Attendance
                </h3>
                <p className="class-attendance-camera-text">
                  Click "Start Camera" above to mark attendance for{" "}
                  <strong>
                    {classes.find((c) => c.id === selectedClassId)?.class_name}
                  </strong>{" "}
                  using face recognition
                </p>
                <button
                  onClick={startCamera}
                  className="class-attendance-camera-btn"
                >
                  🎥 Start Camera Now
                </button>
              </div>
              {students.length > 0 && (
                <div className="class-attendance-students-section">
                  <h4 className="class-attendance-students-title">
                    Students enrolled in this class ({students.length})
                  </h4>
                  <div className="class-attendance-students-grid">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="class-attendance-student-item"
                      >
                        <span className="class-attendance-student-name">
                          {student.name}
                        </span>
                        <span className="class-attendance-student-roll">
                          Roll: {student.roll_number}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Attendance Modal */}
      {showAttendanceModal && classAttendance && (
        <div
          className="modal-overlay"
          onClick={() => setShowAttendanceModal(false)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: "800px", maxHeight: "80vh", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                📊 {classAttendance.class_name} - {classAttendance.date}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => exportAttendanceToExcel(classAttendance)}
                  className="excel-btn"
                >
                  📊 Excel
                </button>
                <button
                  onClick={() => exportAttendanceToPDF(classAttendance)}
                  className="pdf-btn"
                >
                  📄 PDF
                </button>
                {/* <button
                  onClick={() => setShowAttendanceModal(false)}
                  className="close-modal"
                >
                  ✕
                </button> */}
              </div>
            </div>

            <div className="modal-body">
              <div
                className="stats-grid"
                style={{
                  marginBottom: "20px",
                  gridTemplateColumns: "repeat(3, 1fr)",
                }}
              >
                <div
                  className="stat-card"
                  style={{ textAlign: "center", padding: "15px" }}
                >
                  <div className="stat-value">
                    {classAttendance.total_students}
                  </div>
                  <div className="stat-label">Total Students</div>
                </div>
                <div
                  className="stat-card"
                  style={{
                    textAlign: "center",
                    padding: "15px",
                    background: "#dbeafe",
                  }}
                >
                  <div className="stat-value text-green-600">
                    {classAttendance.present_count}
                  </div>
                  <div className="stat-label">Present</div>
                </div>
                <div
                  className="stat-card"
                  style={{
                    textAlign: "center",
                    padding: "15px",
                    background: "#fee2e2",
                  }}
                >
                  <div className="stat-value text-red-600">
                    {classAttendance.absent_count}
                  </div>
                  <div className="stat-label">Absent</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Roll No</th>
                      <th className="px-4 py-2 text-left">Student Name</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classAttendance.students.map((student: any) => (
                      <tr key={student.student_id} className="border-t">
                        <td className="px-4 py-2">{student.roll_number}</td>
                        <td className="px-4 py-2">{student.student_name}</td>
                        <td className="px-4 py-2">
                          {student.status === "present" ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✅ Present
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              ❌ Absent
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-500">
                          {student.time || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="close-modal-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Class Form Modal */}
      {showAddClassForm && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddClassForm(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Class</h3>
              <button
                onClick={() => setShowAddClassForm(false)}
                className="close-modal"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddClass}>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Class Name *"
                  value={classFormData.class_name}
                  onChange={(e) =>
                    setClassFormData({
                      ...classFormData,
                      class_name: e.target.value,
                    })
                  }
                  required
                />
                <input
                  type="text"
                  placeholder="Section *"
                  value={classFormData.section}
                  onChange={(e) =>
                    setClassFormData({
                      ...classFormData,
                      section: e.target.value,
                    })
                  }
                  required
                />
                <input
                  type="text"
                  placeholder="Subject *"
                  value={classFormData.subject}
                  onChange={(e) =>
                    setClassFormData({
                      ...classFormData,
                      subject: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? "Adding..." : "➕ Create Class"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Form Modal */}
      {showAddStudentForm && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddStudentForm(false)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: "600px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                Add New Student to{" "}
                {classes.find((c) => c.id === studentFormData.class_id)
                  ?.class_name || "Class"}
              </h3>
              <button
                onClick={() => setShowAddStudentForm(false)}
                className="close-modal"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddStudent}>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={studentFormData.name}
                  onChange={(e) =>
                    setStudentFormData({
                      ...studentFormData,
                      name: e.target.value,
                    })
                  }
                  required
                />
                <input
                  type="email"
                  placeholder="Email *"
                  value={studentFormData.email}
                  onChange={(e) =>
                    setStudentFormData({
                      ...studentFormData,
                      email: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Roll Number *"
                  value={studentFormData.roll_number}
                  onChange={(e) =>
                    setStudentFormData({
                      ...studentFormData,
                      roll_number: e.target.value,
                    })
                  }
                  required
                />
                <input
                  type="text"
                  placeholder="University Roll No"
                  value={studentFormData.university_roll_no}
                  onChange={(e) =>
                    setStudentFormData({
                      ...studentFormData,
                      university_roll_no: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-row">
                <input
                  type="tel"
                  placeholder="Mobile Number"
                  value={studentFormData.mobile_number}
                  onChange={(e) =>
                    setStudentFormData({
                      ...studentFormData,
                      mobile_number: e.target.value,
                    })
                  }
                />
                <input
                  type="tel"
                  placeholder="Father's Mobile"
                  value={studentFormData.father_mobile}
                  onChange={(e) =>
                    setStudentFormData({
                      ...studentFormData,
                      father_mobile: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-row">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setStudentPhoto(e.target.files?.[0] || null)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={studentLoading}
                className="submit-btn"
              >
                {studentLoading ? "Adding..." : "👨‍🎓 Add Student to Class"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div className="camera-modal-overlay">
          <div className="camera-modal">
            <div className="camera-modal-header">
              <h3>📸 Face Recognition Attendance</h3>
              <button onClick={stopCamera} className="close-modal">
                ✕
              </button>
            </div>
            <div className="video-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="camera-video"
                style={{ transform: "scaleX(-1)" }}
              />
              <canvas ref={canvasRef} style={{ display: "none" }} />
              {cameraStatus === "loading" && (
                <div className="camera-loading">
                  <div className="spinner"></div>
                  <p>Starting camera...</p>
                </div>
              )}
            </div>
            <div className="camera-modal-footer">
              <p>
                Look at the camera. System will automatically mark your
                attendance.
              </p>
              <button onClick={stopCamera} className="stop-camera-btn">
                Stop Camera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {showEditClassModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowEditClassModal(false)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: "500px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Edit Class</h3>
              <button
                onClick={() => setShowEditClassModal(false)}
                className="close-modal"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateClass}>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Class Name"
                  value={editClassData.class_name}
                  onChange={(e) =>
                    setEditClassData({
                      ...editClassData,
                      class_name: e.target.value,
                    })
                  }
                  required
                />
                <input
                  type="text"
                  placeholder="Section"
                  value={editClassData.section}
                  onChange={(e) =>
                    setEditClassData({
                      ...editClassData,
                      section: e.target.value,
                    })
                  }
                  required
                />
                <input
                  type="text"
                  placeholder="Subject"
                  value={editClassData.subject}
                  onChange={(e) =>
                    setEditClassData({
                      ...editClassData,
                      subject: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? "Updating..." : "Update Class"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditStudentModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowEditStudentModal(false)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: "600px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Edit Student</h3>
              <button
                onClick={() => setShowEditStudentModal(false)}
                className="close-modal"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateStudent}>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={editStudentData.name}
                  onChange={(e) =>
                    setEditStudentData({
                      ...editStudentData,
                      name: e.target.value,
                    })
                  }
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={editStudentData.email}
                  onChange={(e) =>
                    setEditStudentData({
                      ...editStudentData,
                      email: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Roll Number"
                  value={editStudentData.roll_number}
                  onChange={(e) =>
                    setEditStudentData({
                      ...editStudentData,
                      roll_number: e.target.value,
                    })
                  }
                  required
                />
                <input
                  type="text"
                  placeholder="University Roll No"
                  value={editStudentData.university_roll_no}
                  onChange={(e) =>
                    setEditStudentData({
                      ...editStudentData,
                      university_roll_no: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-row">
                <select
                  value={editStudentData.class_id}
                  onChange={(e) =>
                    setEditStudentData({
                      ...editStudentData,
                      class_id: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name} - {cls.section}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder="Mobile Number"
                  value={editStudentData.mobile_number}
                  onChange={(e) =>
                    setEditStudentData({
                      ...editStudentData,
                      mobile_number: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-row">
                <input
                  type="tel"
                  placeholder="Father's Mobile"
                  value={editStudentData.father_mobile}
                  onChange={(e) =>
                    setEditStudentData({
                      ...editStudentData,
                      father_mobile: e.target.value,
                    })
                  }
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setEditStudentPhoto(e.target.files?.[0] || null)
                  }
                />
              </div>
              <button
                type="submit"
                disabled={studentLoading}
                className="submit-btn"
              >
                {studentLoading ? "Updating..." : "Update Student"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;

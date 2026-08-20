import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../../services/auth";
import api from "../../services/api";
import toast from "react-hot-toast";
import "./Dashboard.css";
import SearchBar from "../Common/SearchBar";
import html2pdf from "html2pdf.js";

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem("adminActiveTab");
    return savedTab || "overview";
  });

  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total_users: 0,
    total_teachers: 0,
    total_students: 0,
    total_classes: 0,
  });

  const [showAddTeacherForm, setShowAddTeacherForm] = useState(false);
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [showAddClassForm, setShowAddClassForm] = useState(false);

  const [teacherFormData, setTeacherFormData] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
  });
  const [teacherLoading, setTeacherLoading] = useState(false);

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

  const [classFormData, setClassFormData] = useState({
    class_name: "",
    section: "",
    subject: "",
  });
  const [classLoading, setClassLoading] = useState(false);

  const [showMoveStudentModal, setShowMoveStudentModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [moveLoading, setMoveLoading] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const [classAttendance, setClassAttendance] = useState<any>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editType, setEditType] = useState("");
  const [editData, setEditData] = useState({
    full_name: "",
    email: "",
    username: "",
    class_name: "",
    section: "",
    subject: "",
    roll_number: "",
    class_id: "",
    mobile_number: "",
    father_mobile: "",
    university_roll_no: "",
  });
  const [loading, setLoading] = useState(false);

  const [showBulkManualModal, setShowBulkManualModal] = useState(false);
  const [selectedStudentsForBulk, setSelectedStudentsForBulk] = useState<
    string[]
  >([]);
  const [bulkAttendanceStatus, setBulkAttendanceStatus] = useState("present");

  const [showManualAttendanceModal, setShowManualAttendanceModal] =
    useState(false);
  const [manualAttendanceData, setManualAttendanceData] = useState({
    student_id: "",
    status: "present",
  });
  const [classStudents, setClassStudents] = useState<any[]>([]);

  const [todayAttendanceData, setTodayAttendanceData] = useState<any[]>([]);
  const [showTodayAttendanceModal, setShowTodayAttendanceModal] =
    useState(false);

  // ========== INITIAL LOAD ==========
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    initialLoad();
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem("adminActiveTab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    const fetchTodaySummary = async () => {
      try {
        const response = await api.get("/attendance/today");
        setTodayAttendanceData(response.data);
      } catch (error) {
        console.error("Error fetching today summary:", error);
      }
    };
    fetchTodaySummary();
  }, []);

  // ========== FETCH FUNCTIONS ==========
  const fetchStats = async () => {
    try {
      const response = await api.get("/admin/stats");
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await api.get("/admin/teachers");
      setTeachers(response.data);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      setTeachers([]);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get("/admin/students");
      console.log(
        "✅ Students with user_id:",
        response.data.map((s: any) => ({
          id: s.id,
          name: s.name,
          user_id: s.user_id,
          email: s.email,
        })),
      );
      setStudents(response.data);
    } catch (error) {
      console.error("Error fetching students:", error);
      setStudents([]);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get("/admin/classes");
      console.log("✅ Total classes from API:", response.data.length);
      console.log(
        "✅ Classes list:",
        response.data.map((c: any) => c.class_name),
      );
      setClasses(response.data);
    } catch (error) {
      console.error("Error fetching classes:", error);
      setClasses([]);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await api.get("/admin/users");
      console.log(
        "✅ All Users with id:",
        response.data.map((u: any) => ({
          id: u.id,
          username: u.username,
          role: u.role,
          user_id: u.user_id,
        })),
      );
      setAllUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      setAllUsers([]);
    }
  };

  const fetchClassStudents = async (classId: string) => {
    try {
      const response = await api.get(`/students/class/${classId}`);
      setClassStudents(response.data);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to fetch students");
    }
  };

  const refreshTodaySummary = async () => {
    try {
      const response = await api.get("/attendance/today");
      setTodayAttendanceData(response.data);
    } catch (error) {
      console.error("Error refreshing summary:", error);
    }
  };

  // ========== INITIAL LOAD FUNCTION ==========
  const initialLoad = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchStats(),
      fetchTeachers(),
      fetchStudents(),
      fetchClasses(),
      fetchAllUsers(),
    ]);
    setIsLoading(false);
  };

  // ========== REFRESH FUNCTIONS (No loading state) ==========
  const refreshStudentsOnly = async () => {
    await fetchStudents();
  };

  const refreshTeachersOnly = async () => {
    await fetchTeachers();
  };

  const refreshClassesOnly = async () => {
    await fetchClasses();
  };

  const refreshStatsOnly = async () => {
    await fetchStats();
  };

  const refreshUsersOnly = async () => {
    await fetchAllUsers();
  };

  // ========== HANDLERS ==========
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherLoading(true);
    try {
      await api.post("/admin/teachers", teacherFormData);
      toast.success("Teacher added successfully!");
      setTeacherFormData({
        username: "",
        email: "",
        password: "",
        full_name: "",
      });
      setShowAddTeacherForm(false);
      await refreshTeachersOnly();
      await refreshStatsOnly();
      await refreshUsersOnly();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to add teacher");
    } finally {
      setTeacherLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentPhoto) {
      toast.error("Please select a photo");
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
      await refreshStudentsOnly();
      await refreshStatsOnly();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to add student");
    } finally {
      setStudentLoading(false);
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
    setClassLoading(true);
    try {
      await api.post("/classes", classFormData);
      toast.success("Class added successfully!");
      setClassFormData({ class_name: "", section: "", subject: "" });
      setShowAddClassForm(false);
      await refreshClassesOnly();
      await refreshStatsOnly();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to add class");
    } finally {
      setClassLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editType === "teacher") {
        await api.put(`/admin/users/${editingItem.id}`, {
          full_name: editData.full_name,
          email: editData.email,
          username: editData.username,
        });
        toast.success("Teacher updated successfully");
        await refreshTeachersOnly();
        await refreshUsersOnly();
      } else if (editType === "class") {
        await api.put(`/classes/${editingItem.id}`, {
          class_name: editData.class_name,
          section: editData.section,
          subject: editData.subject,
        });
        toast.success("Class updated successfully");
        await refreshClassesOnly();
      } else if (editType === "student") {
        const studentId = editingItem.id; // students collection _id
        const userId = editingItem.user_id; // users collection _id

        const updateData = {
          name: editData.full_name,
          email: editData.email,
          roll_number: editData.roll_number || editingItem.roll_number,
          university_roll_no: editData.university_roll_no || "",
          class_id: editData.class_id || editingItem.class_id || "",
          mobile_number: editData.mobile_number || "",
          father_mobile: editData.father_mobile || "",
          photo_url: editingItem.photo_url || "",
        };

        // ✅ student _id se update karo (24 char ObjectId)
        if (studentId && studentId.length === 24) {
          await api.put(`/students/${studentId}`, updateData);
        } else if (userId) {
          // fallback — user_id se update
          await api.put(`/students/by-user/${userId}`, updateData);
        } else {
          toast.error("Student ID not found");
          return;
        }
        toast.success("Student updated successfully");
        await refreshStudentsOnly();
        await refreshUsersOnly();
      }
      setShowEditModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: string, type: string) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

    try {
      if (type === "student") {
        // ✅ Database se delete
        const response = await api.delete(`/students/${id}`);
        console.log("Delete response:", response.data);
        toast.success("Student deleted successfully from database");
        await refreshStudentsOnly();
        await refreshStatsOnly();
        await refreshUsersOnly();
      } else if (type === "teacher") {
        await api.delete(`/admin/users/${id}`);
        toast.success("Teacher deleted successfully");
        await refreshTeachersOnly();
        await refreshStatsOnly();
        await refreshUsersOnly();
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.response?.data?.detail || "Delete failed");
    }
  };

  const deleteClass = async (id: string) => {
    if (confirm("Are you sure you want to delete this class?")) {
      try {
        await api.delete(`/classes/${id}`);
        toast.success("Class deleted successfully");
        await refreshClassesOnly();
        await refreshStatsOnly();
      } catch (error) {
        toast.error("Delete failed");
      }
    }
  };

  const handleMoveStudents = async () => {
    if (!selectedClassId) {
      toast.error("Please select a class");
      return;
    }
    setMoveLoading(true);
    try {
      await api.post("/admin/students/move-bulk", {
        student_ids: selectedStudentIds,
        new_class_id: selectedClassId,
      });
      toast.success(`${selectedStudentIds.length} students moved successfully`);
      setShowMoveStudentModal(false);
      setSelectedStudentIds([]);
      await refreshStudentsOnly();
      await refreshStatsOnly();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Move failed");
    } finally {
      setMoveLoading(false);
    }
  };

  const handleManualAttendanceSubmit = async () => {
    if (!manualAttendanceData.student_id) {
      toast.error("Please select a student");
      return;
    }

    try {
      const response = await api.post("/attendance/manual", {
        student_id: manualAttendanceData.student_id,
        class_id: selectedClassId,
        status: manualAttendanceData.status,
      });

      if (response.data.success) {
        toast.success("Attendance marked manually");
        setShowManualAttendanceModal(false);
        await refreshTodaySummary();
      } else {
        toast.error(response.data.message || "Failed to mark attendance");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to mark attendance");
    }
  };

  const handleBulkManualAttendance = async () => {
    if (selectedStudentsForBulk.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    try {
      await api.post("/attendance/manual-bulk", {
        student_ids: selectedStudentsForBulk,
        class_id: selectedClassId,
        status: bulkAttendanceStatus,
      });
      toast.success(
        `${selectedStudentsForBulk.length} students marked ${bulkAttendanceStatus}`,
      );
      setShowBulkManualModal(false);
      setSelectedStudentsForBulk([]);
      await refreshTodaySummary();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to mark attendance");
    }
  };

  const fetchClassAttendance = async (classId: string) => {
    try {
      const response = await api.get(`/attendance/class/${classId}/today`);
      setClassAttendance(response.data);
      setShowAttendanceModal(true);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to fetch class attendance");
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const response = await api.get("/attendance/today");
      setTodayAttendanceData(response.data);
      setShowTodayAttendanceModal(true);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to fetch today's attendance");
    }
  };

  const openManualAttendanceModal = async (classId: string) => {
    setSelectedClassId(classId);
    await fetchClassStudents(classId);
    setManualAttendanceData({ student_id: "", status: "present" });
    setShowManualAttendanceModal(true);
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const selectAllStudents = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  const openMoveStudentModal = () => {
    if (selectedStudentIds.length === 0) {
      toast.error("Please select at least one student");
      return;
    }
    setShowMoveStudentModal(true);
  };

  const toggleBulkStudentSelection = (studentId: string) => {
    setSelectedStudentsForBulk((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const selectAllForBulk = () => {
    if (selectedStudentsForBulk.length === classStudents.length) {
      setSelectedStudentsForBulk([]);
    } else {
      setSelectedStudentsForBulk(classStudents.map((s) => s.id));
    }
  };

  const openEditModal = (item: any, type: string) => {
    setEditType(type);
    setEditingItem(item);

    if (type === "teacher") {
      setEditData({
        full_name: item.full_name || "",
        email: item.email || "",
        username: item.username || "",
        class_name: "",
        section: "",
        subject: "",
        roll_number: "",
        class_id: "",
        mobile_number: "",
        father_mobile: "",
        university_roll_no: "",
      });
    } else if (type === "class") {
      setEditData({
        full_name: "",
        email: "",
        username: "",
        class_name: item.class_name || "",
        section: item.section || "",
        subject: item.subject || "",
        roll_number: "",
        class_id: "",
        mobile_number: "",
        father_mobile: "",
        university_roll_no: "",
      });
    } else if (type === "student") {
      if (!item.user_id) {
        toast.error("Student user_id missing - cannot edit");
        return;
      }
      setEditData({
        full_name: item.name || "",
        email: item.email || "",
        username: item.roll_number || "",
        class_name: "",
        section: "",
        subject: "",
        roll_number: item.roll_number || "",
        class_id: item.class_id || "",
        mobile_number: item.mobile_number || "",
        father_mobile: item.father_mobile || "",
        university_roll_no: item.university_roll_no || "",
      });
    }

    setShowEditModal(true);
  };

  const exportAttendanceToExcel = (attendanceData: any) => {
    const headers = ["Roll No", "Student Name", "Status", "Time"];
    const rows = attendanceData.students.map((s: any) => [
      s.roll_number,
      s.student_name,
      s.status === "present" ? "Present" : "Absent",
      s.time || "-",
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${attendanceData.class_name}_attendance.csv`,
    );
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Excel downloaded!");
  };

  const exportAttendanceToPDF = (attendanceData: any) => {
    try {
      toast.loading("Generating PDF...", { id: "pdf" });

      const presentCount = attendanceData.students.filter(
        (s: any) => s.status === "present",
      ).length;
      const absentCount = attendanceData.students.filter(
        (s: any) => s.status === "absent",
      ).length;

      const element = document.createElement("div");
      element.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #4c1d95; text-align: center;">SmartAttend - Attendance Report</h1>
          <p style="text-align: center;">Generated on: ${new Date().toLocaleString()}</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 10px; margin: 20px 0;">
            <h3>Class: ${attendanceData.class_name}</h3>
            <p>Date: ${attendanceData.date}</p>
          </div>
          <div style="display: flex; justify-content: space-around; margin: 20px 0;">
            <div style="background: #e0e7ff; padding: 15px; border-radius: 10px; text-align: center;">
              <h3>Total Students</h3><p style="font-size: 24px; font-weight: bold;">${attendanceData.total_students}</p>
            </div>
            <div style="background: #d1fae5; padding: 15px; border-radius: 10px; text-align: center;">
              <h3>Present</h3><p style="font-size: 24px; font-weight: bold; color: green;">${presentCount}</p>
            </div>
            <div style="background: #fee2e2; padding: 15px; border-radius: 10px; text-align: center;">
              <h3>Absent</h3><p style="font-size: 24px; font-weight: bold; color: red;">${absentCount}</p>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead><tr style="background: #4c1d95; color: white;"><th style="padding: 10px; border: 1px solid #ddd;">Roll No</th><th style="padding: 10px; border: 1px solid #ddd;">Student Name</th><th style="padding: 10px; border: 1px solid #ddd;">Status</th><th style="padding: 10px; border: 1px solid #ddd;">Time</th></tr></thead>
            <tbody>
              ${attendanceData.students
                .map(
                  (s: any) => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${s.roll_number}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${s.student_name}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; color: ${s.status === "present" ? "green" : "red"};">${s.status === "present" ? "✓ Present" : "✗ Absent"}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${s.time || "-"}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">System-generated report from SmartAttend</p>
        </div>
      `;

      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
        filename: `${attendanceData.class_name}_attendance_${attendanceData.date}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: {
          unit: "in" as const,
          format: "a4" as const,
          orientation: "portrait" as const,
        },
      };

      html2pdf().set(opt).from(element).save();
      toast.success("PDF downloaded!", { id: "pdf" });
    } catch (error) {
      toast.error("Failed to generate PDF", { id: "pdf" });
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getUserInitial = () => {
    if (user?.full_name) return user.full_name.charAt(0).toUpperCase();
    if (user?.username) return user.username.charAt(0).toUpperCase();
    return "A";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading admin dashboard...</p>
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
              <p>Admin Portal</p>
            </div>
          </div>
        </div>
        <div className="sidebar-nav">
          <button
            onClick={() => setActiveTab("overview")}
            className={`nav-item ${activeTab === "overview" ? "active" : ""}`}
          >
            <i className="fas fa-tachometer-alt"></i>
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`nav-item ${activeTab === "users" ? "active" : ""}`}
          >
            <i className="fas fa-users"></i>
            <span>All Users</span>
          </button>
          <button
            onClick={() => setActiveTab("teachers")}
            className={`nav-item ${activeTab === "teachers" ? "active" : ""}`}
          >
            <i className="fas fa-chalkboard-user"></i>
            <span>Teachers</span>
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`nav-item ${activeTab === "students" ? "active" : ""}`}
          >
            <i className="fas fa-user-graduate"></i>
            <span>Students</span>
          </button>
          <button
            onClick={() => setActiveTab("classes")}
            className={`nav-item ${activeTab === "classes" ? "active" : ""}`}
          >
            <i className="fas fa-book"></i>
            <span>Classes</span>
          </button>
        </div>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{getUserInitial()}</div>
            <div className="user-details">
              <h4>{user?.full_name || user?.username}</h4>
              <p>Administrator</p>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="top-bar">
          <div className="page-title">
            <h1>Admin Dashboard</h1>
            <p>Manage your institution from one place</p>
          </div>
          <div className="top-bar-buttons">
            <SearchBar />
            <button
              onClick={() => setShowAddTeacherForm(!showAddTeacherForm)}
              className="action-btn btn-teacher"
            >
              <i className="fas fa-plus"></i> Add Teacher
            </button>
            <button
              onClick={() => setShowAddStudentForm(!showAddStudentForm)}
              className="action-btn btn-student"
            >
              <i className="fas fa-plus"></i> Add Student
            </button>
            <button
              onClick={() => setShowAddClassForm(!showAddClassForm)}
              className="action-btn btn-class"
            >
              <i className="fas fa-plus"></i> Add Class
            </button>
            <button
              onClick={() => navigate("/admin/accuracy")}
              className="action-btn btn-accuracy"
            >
              <i className="fas fa-chart-line"></i> Accuracy Dashboard
            </button>
          </div>
        </div>

        {/* Add Teacher Form */}
        {showAddTeacherForm && (
          <div className="form-card">
            <div className="form-header">
              <h3>Add New Teacher</h3>
              <button
                className="close-btn"
                onClick={() => setShowAddTeacherForm(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="form-body">
              <form onSubmit={handleAddTeacher}>
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={teacherFormData.full_name}
                    onChange={(e) =>
                      setTeacherFormData({
                        ...teacherFormData,
                        full_name: e.target.value,
                      })
                    }
                    required
                  />
                  <input
                    type="text"
                    placeholder="Username"
                    value={teacherFormData.username}
                    onChange={(e) =>
                      setTeacherFormData({
                        ...teacherFormData,
                        username: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="form-row">
                  <input
                    type="email"
                    placeholder="Email"
                    value={teacherFormData.email}
                    onChange={(e) =>
                      setTeacherFormData({
                        ...teacherFormData,
                        email: e.target.value,
                      })
                    }
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={teacherFormData.password}
                    onChange={(e) =>
                      setTeacherFormData({
                        ...teacherFormData,
                        password: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={teacherLoading}
                  className="submit-btn"
                >
                  {teacherLoading ? (
                    "Adding..."
                  ) : (
                    <>
                      <i className="fas fa-chalkboard-user"></i> Add Teacher
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Add Student Form */}
        {showAddStudentForm && (
          <div className="form-card">
            <div className="form-header">
              <h3>Add New Student</h3>
              <button
                className="close-btn"
                onClick={() => setShowAddStudentForm(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="form-body">
              <form onSubmit={handleAddStudent}>
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Full Name"
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
                    placeholder="Email"
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
                    placeholder="Roll Number"
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
                  <select
                    value={studentFormData.class_id}
                    onChange={(e) =>
                      setStudentFormData({
                        ...studentFormData,
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
                    value={studentFormData.mobile_number}
                    onChange={(e) =>
                      setStudentFormData({
                        ...studentFormData,
                        mobile_number: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-row">
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
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setStudentPhoto(e.target.files?.[0] || null)
                    }
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={studentLoading}
                  className="submit-btn"
                >
                  {studentLoading ? (
                    "Adding..."
                  ) : (
                    <>
                      <i className="fas fa-user-graduate"></i> Add Student
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Add Class Form */}
        {showAddClassForm && (
          <div className="form-card">
            <div className="form-header">
              <h3>Add New Class</h3>
              <button
                className="close-btn"
                onClick={() => setShowAddClassForm(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="form-body">
              <form onSubmit={handleAddClass}>
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Class Name"
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
                    placeholder="Section"
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
                    placeholder="Subject"
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
                <button
                  type="submit"
                  disabled={classLoading}
                  className="submit-btn"
                >
                  {classLoading ? (
                    "Adding..."
                  ) : (
                    <>
                      <i className="fas fa-plus"></i> Create Class
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            <div className="stats-grid">
              <div className="stat-card" onClick={() => setActiveTab("users")}>
                <div className="stat-header">
                  <span className="stat-title">Total Users</span>
                  <div className="stat-icon">
                    <i className="fas fa-users"></i>
                  </div>
                </div>
                <div className="stat-value">{stats.total_users}</div>
                <div className="stat-change">Click to view all users →</div>
              </div>
              <div
                className="stat-card"
                onClick={() => setActiveTab("teachers")}
              >
                <div className="stat-header">
                  <span className="stat-title">Teachers</span>
                  <div className="stat-icon">
                    <i className="fas fa-chalkboard-user"></i>
                  </div>
                </div>
                <div className="stat-value">{stats.total_teachers}</div>
                <div className="stat-change">Click to view all teachers →</div>
              </div>
              <div
                className="stat-card"
                onClick={() => setActiveTab("students")}
              >
                <div className="stat-header">
                  <span className="stat-title">Students</span>
                  <div className="stat-icon">
                    <i className="fas fa-user-graduate"></i>
                  </div>
                </div>
                <div className="stat-value">{stats.total_students}</div>
                <div className="stat-change">Click to view all students →</div>
              </div>
              <div
                className="stat-card"
                onClick={() => setActiveTab("classes")}
              >
                <div className="stat-header">
                  <span className="stat-title">Classes</span>
                  <div className="stat-icon">
                    <i className="fas fa-book"></i>
                  </div>
                </div>
                <div className="stat-value">{stats.total_classes}</div>
                <div className="stat-change">Click to view all classes →</div>
              </div>
            </div>

            <div className="section-header">
              <h2>All Classes</h2>
              <button
                onClick={() => setActiveTab("classes")}
                className="view-all-btn"
              >
                View All <i className="fas fa-arrow-right"></i>
              </button>
            </div>
            <div className="classes-grid">
              {classes.slice(0, 6).map((cls) => (
                <div key={cls.id} className="class-card">
                  <div className="class-header">
                    <div className="class-icon">
                      <i className="fas fa-book-open"></i>
                    </div>
                  </div>
                  <h3 className="class-title">{cls.class_name}</h3>
                  <div className="class-details">
                    <div className="class-detail">
                      <i className="fas fa-tag"></i> Section: {cls.section}
                    </div>
                    <div className="class-detail">
                      <i className="fas fa-graduation-cap"></i> Subject:{" "}
                      {cls.subject}
                    </div>
                    <div className="class-detail">
                      <i className="fas fa-chalkboard-user"></i> Teacher:{" "}
                      {cls.teacher_name}
                    </div>
                  </div>
                  <div className="class-buttons">
                    <button
                      onClick={() => {
                        setStudentFormData({
                          ...studentFormData,
                          class_id: cls.id,
                        });
                        setShowAddStudentForm(true);
                      }}
                      className="class-btn class-btn-secondary"
                    >
                      <i className="fas fa-user-plus"></i> Add Student
                    </button>

                    <button
                      onClick={() => fetchClassAttendance(cls.id)}
                      className="class-btn class-btn-primary"
                    >
                      <i className="fas fa-calendar-check"></i> View Attendance
                    </button>

                    <button
                      onClick={() => openManualAttendanceModal(cls.id)}
                      className="class-btn class-btn-warning"
                    >
                      <i className="fas fa-pen-alt"></i> Manual
                    </button>
                    <button
                      onClick={() => {
                        setSelectedClassId(cls.id);
                        fetchClassStudents(cls.id);
                        setSelectedStudentsForBulk([]);
                        setShowBulkManualModal(true);
                      }}
                      className="class-btn class-btn-success"
                    >
                      <i className="fas fa-check-double"></i> Bulk Manual
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="section-header">
              <h2>Recent Attendance Records</h2>
              <button onClick={fetchTodayAttendance} className="view-all-btn">
                View Today's Attendance <i className="fas fa-arrow-right"></i>
              </button>
            </div>
            <div className="attendance-table-container">
              <div className="table-header">
                <h3>
                  <i className="fas fa-calendar-day"></i> Today's Attendance
                  Summary
                </h3>
              </div>
              {todayAttendanceData.length === 0 ? (
                <div className="empty-state">
                  <i
                    className="fas fa-calendar-day"
                    style={{ fontSize: "48px", opacity: 0.5 }}
                  ></i>
                  <p>No attendance records for today</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Roll Number</th>
                        <th>Class</th>
                        <th>Time</th>
                        <th>Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayAttendanceData
                        .slice(0, 5)
                        .map((record: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-4 py-2">
                              {record.student_name || record.name || "-"}
                            </td>
                            <td className="px-4 py-2">
                              {record.roll_number || "-"}
                            </td>
                            <td className="px-4 py-2">
                              {record.class_name || "-"}
                            </td>
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
                  <br />
                  {todayAttendanceData.length > 5 && (
                    <div className="text-center mt-4">
                      <button
                        onClick={fetchTodayAttendance}
                        className="view-all-btn"
                      >
                        View All ({todayAttendanceData.length}){" "}
                        <i className="fas fa-arrow-right"></i>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* All Users Tab */}
        {activeTab === "users" && (
          <div className="attendance-table-container">
            <div className="table-header">
              <h3>
                <i className="fas fa-users"></i> All Users
              </h3>
              <div className="table-actions">
                <button
                  onClick={() => {
                    if (selectedStudentIds.length === 0) {
                      toast.error("Please select at least one student");
                      return;
                    }
                    setShowMoveStudentModal(true);
                  }}
                  className="move-btn-top"
                  disabled={selectedStudentIds.length === 0}
                >
                  <i className="fas fa-arrow-right"></i> Move Selected (
                  {selectedStudentIds.length})
                </button>
              </div>
            </div>
            {allUsers.length === 0 ? (
              <div className="empty-state">No users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="checkbox-col">
                        <input
                          type="checkbox"
                          checked={
                            allUsers.filter((u) => u.role === "student")
                              .length > 0 &&
                            selectedStudentIds.length ===
                              allUsers.filter((u) => u.role === "student")
                                .length
                          }
                          onChange={(e) => {
                            const studentUsers = allUsers.filter(
                              (u) => u.role === "student",
                            );
                            if (e.target.checked) {
                              const ids: string[] = [];
                              studentUsers.forEach((u) => {
                                const student = students.find(
                                  (s) =>
                                    s.user_id === u.id ||
                                    s.email === u.email ||
                                    s.roll_number === u.username ||
                                    s.name === u.full_name,
                                );
                                if (student) ids.push(student.id);
                              });
                              setSelectedStudentIds(ids);
                              toast.success(`${ids.length} students selected`);
                            } else {
                              setSelectedStudentIds([]);
                              toast.success("All students deselected");
                            }
                          }}
                        />
                      </th>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((user) => {
                      const isStudent = user.role === "student";
                      const student = students.find(
                        (s) =>
                          s.user_id === user.id ||
                          s.email === user.email ||
                          s.roll_number === user.username ||
                          s.name === user.full_name,
                      );
                      const studentId = student ? student.id : null;
                      const sid = user.student_id || user.id;
                      const isSelected = selectedStudentIds.includes(sid);

                      return (
                        <tr key={user.id}>
                          <td className="checkbox-col">
                            {isStudent ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  // ✅ student_id ho to use karo, warna user.id use karo
                                  const sid = user.student_id || user.id;
                                  if (e.target.checked) {
                                    setSelectedStudentIds((prev) => [
                                      ...prev,
                                      sid,
                                    ]);
                                  } else {
                                    setSelectedStudentIds((prev) =>
                                      prev.filter((id) => id !== sid),
                                    );
                                  }
                                }}
                              />
                            ) : (
                              <span>-</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {user.full_name || user.username}
                          </td>
                          <td className="px-4 py-2">{user.username}</td>
                          <td className="px-4 py-2">{user.email}</td>
                          <td className="px-4 py-2">
                            {user.role === "admin" ? (
                              <>
                                <i className="fas fa-crown"></i> Admin
                              </>
                            ) : user.role === "teacher" ? (
                              <>
                                <i className="fas fa-chalkboard-user"></i>{" "}
                                Teacher
                              </>
                            ) : (
                              <>
                                <i className="fas fa-user-graduate"></i> Student
                              </>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {isStudent ? (
                              student && student.class_name ? (
                                <span className="user-status-enrolled">
                                  <i className="fas fa-check-circle"></i>{" "}
                                  {student.class_name}
                                </span>
                              ) : (
                                <span className="user-status-not-enrolled">
                                  <i className="fas fa-times-circle"></i> Not
                                  Enrolled
                                </span>
                              )
                            ) : (
                              <span className="user-status-other">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <div className="action-buttons">
                              {user.role === "admin" ? (
                                <span
                                  className="user-status-other"
                                  style={{ fontSize: "12px" }}
                                >
                                  <i className="fas fa-lock"></i> Protected
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      if (user.role === "teacher") {
                                        openEditModal(user, "teacher");
                                      } else if (user.role === "student") {
                                        const studentData = {
                                          id: studentId || user.id,
                                          user_id: user.id,
                                          name: user.full_name || user.username,
                                          email: user.email,
                                          roll_number: user.username,
                                          class_id: student?.class_id || "",
                                          mobile_number:
                                            student?.mobile_number || "",
                                          father_mobile:
                                            student?.father_mobile || "",
                                          photo_url: student?.photo_url || "",
                                          university_roll_no:
                                            student?.university_roll_no || "",
                                        };
                                        openEditModal(studentData, "student");
                                      }
                                    }}
                                    className="edit-btn"
                                    title="Edit User"
                                  >
                                    <i className="fas fa-edit"></i>
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (user.role === "teacher") {
                                        deleteItem(user.id, "teacher");
                                      } else if (user.role === "student") {
                                        deleteItem(
                                          studentId || user.id,
                                          "student",
                                        );
                                      }
                                    }}
                                    className="delete-btn"
                                    title="Delete User"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Teachers Tab */}
        {activeTab === "teachers" && (
          <div className="attendance-table-container">
            <div className="table-header">
              <h3>
                <i className="fas fa-chalkboard-user"></i> All Teachers
              </h3>
            </div>
            {teachers.length === 0 ? (
              <div className="empty-state">No teachers found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Assigned Classes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((teacher) => (
                      <tr key={teacher.id}>
                        <td className="px-4 py-2">{teacher.full_name}</td>
                        <td className="px-4 py-2">{teacher.username}</td>
                        <td className="px-4 py-2">{teacher.email}</td>
                        <td className="px-4 py-2">
                          {teacher.classes
                            ?.map((c: any) => `${c.name} (${c.section})`)
                            .join(", ") || "No classes"}
                        </td>
                        <td className="px-4 py-2">
                          <div className="action-buttons">
                            <button
                              onClick={() => openEditModal(teacher, "teacher")}
                              className="edit-btn"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              onClick={() => deleteItem(teacher.id, "teacher")}
                              className="delete-btn"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Students Tab */}
        {activeTab === "students" && (
          <div className="attendance-table-container">
            <div className="table-header">
              <h3>
                <i className="fas fa-user-graduate"></i> All Students
              </h3>
              <div className="table-actions">
                <button onClick={selectAllStudents} className="select-all-btn">
                  {selectedStudentIds.length === students.length &&
                  students.length > 0
                    ? "Deselect All"
                    : "Select All"}
                </button>
                <button
                  onClick={openMoveStudentModal}
                  className="move-btn"
                  disabled={selectedStudentIds.length === 0}
                >
                  Move Selected ({selectedStudentIds.length})
                </button>
              </div>
            </div>
            {students.length === 0 ? (
              <div className="empty-state">No students found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="checkbox-col">
                        <input
                          type="checkbox"
                          checked={
                            selectedStudentIds.length === students.length &&
                            students.length > 0
                          }
                          onChange={selectAllStudents}
                        />
                      </th>
                      <th>Name</th>
                      <th>Roll Number</th>
                      <th>Email</th>
                      <th>Mobile</th>
                      <th>Class</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td className="checkbox-col">
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(student.id)}
                            onChange={() => toggleStudentSelection(student.id)}
                          />
                        </td>
                        <td className="px-4 py-2">{student.name}</td>
                        <td className="px-4 py-2">{student.roll_number}</td>
                        <td className="px-4 py-2">{student.email}</td>
                        <td className="px-4 py-2">{student.mobile_number}</td>
                        <td className="px-4 py-2">{student.class_name}</td>
                        <td className="px-4 py-2">
                          <div className="action-buttons">
                            <button
                              onClick={() => openEditModal(student, "student")}
                              className="edit-btn"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              onClick={() => deleteItem(student.id, "student")}
                              className="delete-btn"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {/* Classes Tab */}
        {activeTab === "classes" && (
          <>
            <div className="section-header">
              <h2>
                <i className="fas fa-book"></i> All Classes
              </h2>
              <button
                onClick={() => setShowAddClassForm(true)}
                className="view-all-btn"
              >
                <i className="fas fa-plus"></i> Add New Class
              </button>
            </div>
            {classes.length === 0 ? (
              <div className="empty-state">No classes found.</div>
            ) : (
              <div className="classes-grid">
                {classes.map((cls) => (
                  <div key={cls.id} className="class-card">
                    <div className="class-header">
                      <div className="class-icon">
                        <i className="fas fa-book-open"></i>
                      </div>
                      <div className="action-buttons">
                        <button
                          onClick={() => openEditModal(cls, "class")}
                          className="edit-btn"
                          title="Edit Class"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Are you sure you want to delete class "${cls.class_name}"?`,
                              )
                            ) {
                              deleteClass(cls.id);
                            }
                          }}
                          className="delete-btn"
                          title="Delete Class"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                    <h3 className="class-title">{cls.class_name}</h3>
                    <div className="class-details">
                      <div className="class-detail">
                        <i className="fas fa-tag"></i> Section: {cls.section}
                      </div>
                      <div className="class-detail">
                        <i className="fas fa-graduation-cap"></i> Subject:{" "}
                        {cls.subject}
                      </div>
                      <div className="class-detail">
                        <i className="fas fa-chalkboard-user"></i> Teacher:{" "}
                        {cls.teacher_name}
                      </div>
                    </div>
                    <div className="class-buttons">
                      <button
                        onClick={() => {
                          setStudentFormData({
                            ...studentFormData,
                            class_id: cls.id,
                          });
                          setShowAddStudentForm(true);
                        }}
                        className="class-btn class-btn-secondary"
                      >
                        <i className="fas fa-user-plus"></i> Add Student
                      </button>
                      <button
                        onClick={() => fetchClassAttendance(cls.id)}
                        className="class-btn class-btn-primary"
                      >
                        <i className="fas fa-calendar-check"></i> View
                        Attendance
                      </button>
                      <button
                        onClick={() => openManualAttendanceModal(cls.id)}
                        className="class-btn class-btn-warning"
                      >
                        <i className="fas fa-pen-alt"></i> Manual
                      </button>
                      <button
                        onClick={() => {
                          setSelectedClassId(cls.id);
                          fetchClassStudents(cls.id);
                          setSelectedStudentsForBulk([]);
                          setShowBulkManualModal(true);
                        }}
                        className="class-btn class-btn-success"
                      >
                        <i className="fas fa-check-double"></i> Bulk Manual
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Move Student Modal */}
      {showMoveStudentModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowMoveStudentModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Move {selectedStudentIds.length} Students</h3>
              <button
                onClick={() => setShowMoveStudentModal(false)}
                className="close-modal"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>
                <i className="fas fa-users"></i>{" "}
                <strong>Selected Students:</strong> {selectedStudentIds.length}
              </p>
              <div className="form-row">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  <option value="">Select New Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name} - {cls.section} ({cls.subject})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={handleMoveStudents}
                disabled={moveLoading}
                className="submit-btn"
              >
                {moveLoading ? (
                  "Moving..."
                ) : (
                  <>
                    <i className="fas fa-arrow-right"></i> Move Students
                  </>
                )}
              </button>
              <button
                onClick={() => setShowMoveStudentModal(false)}
                className="close-modal-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && classAttendance && (
        <div
          className="modal-overlay"
          onClick={() => setShowAttendanceModal(false)}
        >
          <div
            className="modal-content modal-large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                <i className="fas fa-calendar-check"></i>{" "}
                {classAttendance.class_name} - {classAttendance.date}
              </h3>
              <div className="table-actions">
                <button
                  onClick={() => exportAttendanceToExcel(classAttendance)}
                  className="excel-btn"
                >
                  <i className="fas fa-file-excel"></i> Excel
                </button>
                <button
                  onClick={() => exportAttendanceToPDF(classAttendance)}
                  className="pdf-btn"
                >
                  <i className="fas fa-file-pdf"></i> PDF
                </button>
                <button
                  onClick={() => setShowAttendanceModal(false)}
                  className="close-modal"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <div className="modal-body">
              <div className="stats-grid stats-grid-small">
                <div className="stat-card stat-card-center">
                  <div className="stat-value">
                    {classAttendance.total_students}
                  </div>
                  <div className="stat-label">Total Students</div>
                </div>
                <div className="stat-card stat-card-center stat-card-present">
                  <div className="stat-value text-green-600">
                    {classAttendance.present_count}
                  </div>
                  <div className="stat-label">Present</div>
                </div>
                <div className="stat-card stat-card-center stat-card-absent">
                  <div className="stat-value text-red-600">
                    {classAttendance.absent_count}
                  </div>
                  <div className="stat-label">Absent</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>Roll No</th>
                      <th>Student Name</th>
                      <th>Status</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classAttendance.students?.map((student: any) => (
                      <tr key={student.student_id}>
                        <td className="px-4 py-2">{student.roll_number}</td>
                        <td className="px-4 py-2">{student.student_name}</td>
                        <td className="px-4 py-2">
                          {student.status === "present" ? (
                            <span className="text-green-600">
                              <i className="fas fa-check-circle"></i> Present
                            </span>
                          ) : (
                            <span className="text-red-600">
                              <i className="fas fa-times-circle"></i> Absent
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

      {/* Today's Attendance Modal */}
      {showTodayAttendanceModal && todayAttendanceData && (
        <div
          className="modal-overlay"
          onClick={() => setShowTodayAttendanceModal(false)}
        >
          <div
            className="modal-content modal-large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                <i className="fas fa-calendar-day"></i> Today's Attendance -{" "}
                {new Date().toISOString().split("T")[0]}
              </h3>
              <button
                onClick={() => setShowTodayAttendanceModal(false)}
                className="close-modal"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="stats-grid stats-grid-small">
                <div className="stat-card stat-card-center">
                  <div className="stat-value">
                    {todayAttendanceData.length || 0}
                  </div>
                  <div className="stat-label">Total Present Today</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Roll Number</th>
                      <th>Class</th>
                      <th>Time</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayAttendanceData.map((record: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">{record.student_name}</td>
                        <td className="px-4 py-2">
                          {record.roll_number || "-"}
                        </td>
                        <td className="px-4 py-2">
                          {record.class_name || "-"}
                        </td>
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
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowTodayAttendanceModal(false)}
                className="close-modal-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Attendance Modal */}
      {showManualAttendanceModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowManualAttendanceModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-pen-alt"></i> Manual Attendance
              </h3>
              <button
                onClick={() => setShowManualAttendanceModal(false)}
                className="close-modal"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <select
                  value={manualAttendanceData.student_id}
                  onChange={(e) =>
                    setManualAttendanceData({
                      ...manualAttendanceData,
                      student_id: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select Student</option>
                  {classStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} (Roll: {student.roll_number})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <select
                  value={manualAttendanceData.status}
                  onChange={(e) =>
                    setManualAttendanceData({
                      ...manualAttendanceData,
                      status: e.target.value,
                    })
                  }
                >
                  <option value="present">
                    <i className="fas fa-check-circle"></i> Present
                  </option>
                  <option value="absent">
                    <i className="fas fa-times-circle"></i> Absent
                  </option>
                  <option value="late">
                    <i className="fas fa-clock"></i> Late
                  </option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={handleManualAttendanceSubmit}
                className="submit-btn"
              >
                <i className="fas fa-save"></i> Mark Attendance
              </button>
              <button
                onClick={() => setShowManualAttendanceModal(false)}
                className="close-modal-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-edit"></i> Edit{" "}
                {editType === "teacher"
                  ? "Teacher"
                  : editType === "class"
                    ? "Class"
                    : "Student"}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="close-modal"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              {editType === "teacher" ? (
                <>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={editData.full_name}
                      onChange={(e) =>
                        setEditData({ ...editData, full_name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="email"
                      placeholder="Email"
                      value={editData.email}
                      onChange={(e) =>
                        setEditData({ ...editData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Username"
                      value={editData.username}
                      onChange={(e) =>
                        setEditData({ ...editData, username: e.target.value })
                      }
                      required
                    />
                  </div>
                </>
              ) : editType === "class" ? (
                <>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Class Name"
                      value={editData.class_name}
                      onChange={(e) =>
                        setEditData({ ...editData, class_name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Section"
                      value={editData.section}
                      onChange={(e) =>
                        setEditData({ ...editData, section: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Subject"
                      value={editData.subject}
                      onChange={(e) =>
                        setEditData({ ...editData, subject: e.target.value })
                      }
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={editData.full_name}
                      onChange={(e) =>
                        setEditData({ ...editData, full_name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="email"
                      placeholder="Email"
                      value={editData.email}
                      onChange={(e) =>
                        setEditData({ ...editData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Roll Number"
                      value={editData.roll_number}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          roll_number: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </>
              )}
              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? (
                  "Updating..."
                ) : (
                  <>
                    <i className="fas fa-save"></i> Update
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Manual Attendance Modal */}
      {showBulkManualModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowBulkManualModal(false)}
        >
          <div
            className="modal-content modal-large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                <i className="fas fa-check-double"></i> Bulk Manual Attendance
              </h3>
              <button
                onClick={() => setShowBulkManualModal(false)}
                className="close-modal"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <select
                  value={bulkAttendanceStatus}
                  onChange={(e) => setBulkAttendanceStatus(e.target.value)}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                  }}
                >
                  <option value="present">✅ Present</option>
                  <option value="absent">❌ Absent</option>
                  <option value="late">⏰ Late</option>
                </select>
                <button onClick={selectAllForBulk} className="select-all-btn">
                  {selectedStudentsForBulk.length === classStudents.length &&
                  classStudents.length > 0
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>
              <div
                className="overflow-x-auto"
                style={{
                  maxHeight: "400px",
                  overflowY: "auto",
                  marginTop: "20px",
                }}
              >
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="checkbox-col" style={{ width: "50px" }}>
                        <input
                          type="checkbox"
                          checked={
                            selectedStudentsForBulk.length ===
                              classStudents.length && classStudents.length > 0
                          }
                          onChange={selectAllForBulk}
                        />
                      </th>
                      <th>Student Name</th>
                      <th>Roll Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((student) => (
                      <tr key={student.id}>
                        <td
                          className="checkbox-col"
                          style={{ textAlign: "center" }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudentsForBulk.includes(
                              student.id,
                            )}
                            onChange={() =>
                              toggleBulkStudentSelection(student.id)
                            }
                          />
                        </td>
                        <td style={{ padding: "8px" }}>{student.name}</td>
                        <td style={{ padding: "8px" }}>
                          {student.roll_number}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={handleBulkManualAttendance}
                className="submit-btn"
              >
                <i className="fas fa-save"></i> Mark{" "}
                {selectedStudentsForBulk.length} Students
              </button>
              <button
                onClick={() => setShowBulkManualModal(false)}
                className="close-modal-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

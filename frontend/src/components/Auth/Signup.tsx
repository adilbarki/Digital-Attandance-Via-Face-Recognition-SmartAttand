import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signup } from "../../services/auth";
import toast from "react-hot-toast";
import "./Signup.css";

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
    full_name: "",
    student_id: "",
    teacher_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name) newErrors.full_name = "Full name is required";
    if (!formData.username) newErrors.username = "Username is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Invalid email format";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    if (formData.role === "student" && !formData.student_id)
      newErrors.student_id = "Student ID is required";
    if (formData.role === "teacher" && !formData.teacher_id)
      newErrors.teacher_id = "Teacher ID is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      const { confirmPassword, ...signupData } = formData;
      const signupPayload = {
        username: signupData.username,
        email: signupData.email,
        password: signupData.password,
        role: signupData.role as "admin" | "teacher" | "student",
        full_name: signupData.full_name,
        ...(signupData.role === "student"
          ? { student_id: signupData.student_id }
          : {}),
        ...(signupData.role === "teacher"
          ? { teacher_id: signupData.teacher_id }
          : {}),
      } as any;

      await signup(signupPayload);
      toast.success("Account created successfully! Please login.");
      navigate("/login");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-fixed-content">
          {/* Logo - Fixed at top */}
          <div className="text-center">
            <div className="signup-logo">
              <span>SA</span>
            </div>
            <h1 className="signup-title">Create Account</h1>
            <p className="signup-subtitle">Join SmartAttend today</p>
          </div>

          {/* Role Tabs */}
          <div className="role-tabs">
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  role: "admin",
                  student_id: "",
                  teacher_id: "",
                })
              }
              className={`role-tab ${formData.role === "admin" ? "active" : ""}`}
            >
              <i className="fa-solid fa-crown"></i> Admin
            </button>
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  role: "teacher",
                  student_id: "",
                  teacher_id: "",
                })
              }
              className={`role-tab ${formData.role === "teacher" ? "active" : ""}`}
            >
              <i className="fa-solid fa-chalkboard-user"></i> Teacher
            </button>
            <button
              type="button"
              onClick={() =>
                setFormData({ ...formData, role: "student", teacher_id: "" })
              }
              className={`role-tab ${formData.role === "student" ? "active" : ""}`}
            >
              <i className="fa-solid fa-graduation-cap"></i> Student
            </button>
          </div>

          {/* Scrollable Form Area */}
          <div className="signup-scroll-area">
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Full Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    onBlur={validateForm}
                    className={`form-input ${errors.full_name ? "error" : ""}`}
                    placeholder="Your Full Name"
                  />
                  {errors.full_name && (
                    <div className="error-message">{errors.full_name}</div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Username <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    onBlur={validateForm}
                    className={`form-input ${errors.username ? "error" : ""}`}
                    placeholder="username"
                  />
                  {errors.username && (
                    <div className="error-message">{errors.username}</div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Email Address <span className="required">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  onBlur={validateForm}
                  className={`form-input ${errors.email ? "error" : ""}`}
                  placeholder="your@email.com"
                />
                {errors.email && (
                  <div className="error-message">{errors.email}</div>
                )}
              </div>

              {/* 👇 LINES 130-145 KE BEECH MEIN - Teacher ID Field (Sirf teacher role ke liye show karo) 👇 */}
              {formData.role === "teacher" && (
                <div className="form-group">
                  <label className="form-label">
                    Teacher ID <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.teacher_id}
                    onChange={(e) =>
                      setFormData({ ...formData, teacher_id: e.target.value })
                    }
                    // className="form-input"
                    className={`form-input ${errors.teacher_id ? "error" : ""}`}
                    placeholder="e.g., TCH-2024-001"
                    required
                  />
                </div>
              )}

              {formData.role === "student" && (
                <div className="form-group">
                  <label className="form-label">
                    Student ID / Roll Number <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.student_id}
                    onChange={(e) =>
                      setFormData({ ...formData, student_id: e.target.value })
                    }
                    onBlur={validateForm}
                    className={`form-input ${errors.student_id ? "error" : ""}`}
                    placeholder="e.g., CS-2024-001"
                  />
                  {errors.student_id && (
                    <div className="error-message">{errors.student_id}</div>
                  )}
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Password <span className="required">*</span>
                  </label>
                  <div className="input-wrapper">
                    <i className="fas fa-lock input-icon"></i>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      onBlur={validateForm}
                      className={`form-input ${errors.password ? "error" : ""}`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="password-toggle"
                    >
                      <i
                        className={
                          showPassword ? "fas fa-eye-slash" : "fas fa-eye"
                        }
                      ></i>
                    </button>
                  </div>
                  {errors.password && (
                    <div className="error-message">{errors.password}</div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Confirm Password <span className="required">*</span>
                  </label>
                  <div className="input-wrapper">
                    <i className="fas fa-lock input-icon"></i>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      onBlur={validateForm}
                      className={`form-input ${errors.confirmPassword ? "error" : ""}`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="password-toggle"
                    >
                      <i
                        className={
                          showConfirmPassword
                            ? "fas fa-eye-slash"
                            : "fas fa-eye"
                        }
                      ></i>
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <div className="error-message">
                      {errors.confirmPassword}
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" disabled={loading} className="signup-btn">
                {loading ? (
                  <>
                    <span className="spinner"></span> Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="login-section">
            <p>
              Already have an account? <Link to="/login">Sign In Instead</Link>
            </p>
            <br />
            <p>© 2026 SmartAttend — All rights reserved</p>      
          </div>
          {/* <div className="footer">
            
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default Signup;

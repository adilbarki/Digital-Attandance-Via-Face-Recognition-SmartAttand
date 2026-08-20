import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../../services/auth';
import toast from 'react-hot-toast';
import './Login.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'student',
    remember_me: false
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Check for saved email on load
  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail, remember_me: true }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await login({ 
        email: formData.email, 
        password: formData.password,
        remember_me: formData.remember_me
      });
      
      // Save email if remember me is checked
      if (formData.remember_me) {
        localStorage.setItem('savedEmail', formData.email);
      } else {
        localStorage.removeItem('savedEmail');
      }
      
      toast.success(`Welcome back, ${response.full_name}!`);
      
      if (response.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (response.role === 'teacher') {
        navigate('/teacher/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo */}
        <div className="text-center">
          <div className="login-logo"><span>SA</span></div>
          <h1 className="login-title">SmartAttend</h1>
          <p className="login-subtitle">Login to SmartAttend</p>
        </div>

        {/* Role Tabs */}
        <div className="role-tabs">
          <button 
            type="button" 
            onClick={() => setFormData({ ...formData, role: 'admin' })} 
            className={`role-tab ${formData.role === 'admin' ? 'active' : ''}`}
          >
            {/* 👑 */}
            <i className="fa-solid fa-crown"></i>
             Admin
          </button>
          <button 
            type="button" 
            onClick={() => setFormData({ ...formData, role: 'teacher' })} 
            className={`role-tab ${formData.role === 'teacher' ? 'active' : ''}`}
          >
            {/* 👨‍🏫 */}
            <i className="fa-solid fa-chalkboard-user"></i>
            Teacher
          </button>
          <button 
            type="button" 
            onClick={() => setFormData({ ...formData, role: 'student' })} 
            className={`role-tab ${formData.role === 'student' ? 'active' : ''}`}
          >
            <i className="fa-solid fa-graduation-cap"></i>  Student
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className={`input-wrapper ${focusedField === 'email' ? 'focused' : ''}`}>
              <i className="fas fa-envelope input-icon"></i>
              <input
                type="email"
                value={formData.email}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="form-input"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className={`input-wrapper ${focusedField === 'password' ? 'focused' : ''}`}>
              <i className="fas fa-lock input-icon"></i>
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="form-input"
                placeholder="••••••••"
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="password-toggle"
              >
                <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
              </button>
            </div>
          </div>

          <div className="remember-forgot">
            <label className="checkbox-wrapper">
              <input
                type="checkbox"
                checked={formData.remember_me}
                onChange={(e) => setFormData({ ...formData, remember_me: e.target.checked })}
              />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
          </div>

          <button type="submit" disabled={loading} className="signin-btn">
            {loading ? <><span className="spinner"></span> Signing in...</> : 'Sign In'}
          </button>
        </form>

        <div className="signup-link-container">
          <p>Don't have an account? <Link to="/signup">Create Account</Link></p>
          {/* <br /> */}
          <p>© 2026 SmartAttend — All rights reserved</p>
        </div>

        {/* <div className="footer">
          <p>© 2026 SmartAttend — All rights reserved</p>
        </div> */}
      </div>
    </div>
  );
};

export default Login;
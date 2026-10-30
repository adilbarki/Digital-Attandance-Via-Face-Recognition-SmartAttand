import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';
import TeacherDashboard from './components/Teacher/Dashboard';
import StudentDashboard from './components/Student/Dashboard';
import AdminDashboard from './components/Admin/Dashboard';
import Homepage from './components/Home/Homepage';
import PrivacyPolicy from './components/Home/PrivacyPolicy';
import TermsOfService from './components/Home/TermsOfService';
import CookiePolicy from './components/Home/CookiePolicy';
import { getCurrentUser } from './services/auth';
import AccuracyDashboard from './components/Admin/AccuracyDashboard';

// Protected Route wrapper
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactElement; allowedRoles?: string[] }) => {
  const token = localStorage.getItem('token');
  const user = getCurrentUser();
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <div style={{ minHeight: '100vh', width: '100%', overflow: 'visible', background: '#FFFFFF' }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Homepage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* ✅ Legal Pages */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          
          {/* Protected Routes */}
          <Route path="/teacher/dashboard" element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherDashboard />
            </ProtectedRoute>
          } />
          <Route path="/student/dashboard" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/accuracy" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AccuracyDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
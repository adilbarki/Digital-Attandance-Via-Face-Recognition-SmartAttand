import React from 'react';
import { Link } from 'react-router-dom';
import './LegalPages.css';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="legal-page">
      <nav className="legal-navbar">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            <div className="logo-icon">SA</div>
            <span className="logo-text">SmartAttend</span>
          </Link>
          <Link to="/" className="btn-back">← Back to Home</Link>
        </div>
      </nav>
      
      <div className="legal-container">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last Updated: January 2026</p>
        
        <section>
          <h2>1. Information We Collect</h2>
          <p>SmartAttend collects the following information for attendance management:</p>
          <ul>
            <li>Student name, email, roll number, and contact details</li>
            <li>Facial images for face recognition</li>
            <li>Attendance records (date, time, class)</li>
            <li>User account credentials (encrypted)</li>
          </ul>
        </section>
        
        <section>
          <h2>2. How We Use Your Information</h2>
          <p>We use collected information solely for:</p>
          <ul>
            <li>Automated attendance marking via face recognition</li>
            <li>Generating attendance reports for teachers and administrators</li>
            <li>Communication between institution, teachers, and students</li>
            <li>System security and authentication</li>
          </ul>
        </section>
        
        <section>
          <h2>3. Data Storage & Security</h2>
          <p>Your data is stored on secure MongoDB Atlas servers. We use:</p>
          <ul>
            <li>Encrypted passwords (bcrypt hashing)</li>
            <li>JWT-based authentication</li>
            <li>Cloudinary for secure image storage</li>
            <li>SSL encryption for all data transmission</li>
          </ul>
        </section>
        
        <section>
          <h2>4. Face Data Usage</h2>
          <p>Face images are used exclusively for attendance recognition. We do not:</p>
          <ul>
            <li>Sell face data to third parties</li>
            <li>Use face data for advertising</li>
            <li>Share face data without consent</li>
          </ul>
        </section>
        
        <section>
          <h2>5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Request data deletion</li>
            <li>Opt-out of face recognition (manual attendance available)</li>
            <li>Correct inaccurate information</li>
          </ul>
        </section>
        
        <section>
          <h2>6. Contact Us</h2>
          <p>For privacy concerns, contact us at:</p>
          <p><strong>Email:</strong> adilbarki111@gmail.com</p>
          <p><strong>Phone:</strong> +92 313 7651005</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
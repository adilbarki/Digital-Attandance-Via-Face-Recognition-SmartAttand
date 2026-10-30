import React from 'react';
import { Link } from 'react-router-dom';
import './LegalPages.css';

const TermsOfService: React.FC = () => {
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
        <h1>Terms of Service</h1>
        <p className="last-updated">Last Updated: January 2026</p>
        
        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>By using SmartAttend, you agree to these terms. If you disagree, please do not use our service.</p>
        </section>
        
        <section>
          <h2>2. User Accounts</h2>
          <p>You are responsible for:</p>
          <ul>
            <li>Maintaining password confidentiality</li>
            <li>All activities under your account</li>
            <li>Providing accurate information</li>
            <li>Notifying us of unauthorized access</li>
          </ul>
        </section>
        
        <section>
          <h2>3. Acceptable Use</h2>
          <p>You agree NOT to:</p>
          <ul>
            <li>Attempt to bypass face recognition</li>
            <li>Mark proxy attendance</li>
            <li>Share login credentials</li>
            <li>Upload false information</li>
            <li>Reverse engineer the system</li>
          </ul>
        </section>
        
        <section>
          <h2>4. Attendance Policy</h2>
          <p>SmartAttend is a tool for attendance tracking. Final attendance decisions remain with the institution. Technical issues may require manual attendance.</p>
        </section>
        
        <section>
          <h2>5. Service Availability</h2>
          <p>We strive for 99% uptime but do not guarantee uninterrupted service. Scheduled maintenance may cause temporary downtime.</p>
        </section>
        
        <section>
          <h2>6. Termination</h2>
          <p>We reserve the right to terminate accounts violating these terms. Institutions may also terminate access at their discretion.</p>
        </section>
        
        <section>
          <h2>7. Limitation of Liability</h2>
          <p>SmartAttend is provided "as is". We are not liable for:</p>
          <ul>
            <li>Attendance disputes</li>
            <li>Data loss due to technical issues</li>
            <li>Indirect damages</li>
          </ul>
        </section>
        
        <section>
          <h2>8. Contact</h2>
          <p><strong>Email:</strong> adilbarki111@gmail.com</p>
          <p><strong>Phone:</strong> +92 313 7651005</p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;
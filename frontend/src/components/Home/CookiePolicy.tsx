import React from 'react';
import { Link } from 'react-router-dom';
import './LegalPages.css';

const CookiePolicy: React.FC = () => {
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
        <h1>Cookie Policy</h1>
        <p className="last-updated">Last Updated: January 2026</p>
        
        <section>
          <h2>1. What Are Cookies?</h2>
          <p>Cookies are small text files stored on your device when you visit SmartAttend. They help us remember your preferences and improve your experience.</p>
        </section>
        
        <section>
          <h2>2. Types of Cookies We Use</h2>
          
          <h3>Essential Cookies</h3>
          <ul>
            <li><strong>auth_token:</strong> Stores your JWT token for authentication</li>
            <li><strong>user_data:</strong> Stores your user information (name, role)</li>
            <li><strong>session:</strong> Maintains your login session</li>
          </ul>
          
          <h3>Performance Cookies</h3>
          <ul>
            <li><strong>lastSection:</strong> Remembers your last visited section on homepage</li>
          </ul>
          
          <h3>Preference Cookies</h3>
          <ul>
            <li><strong>adminActiveTab:</strong> Stores your last active tab in admin dashboard</li>
            <li><strong>teacherActiveTab:</strong> Stores your last active tab in teacher dashboard</li>
            <li><strong>studentActiveTab:</strong> Stores your last active tab in student dashboard</li>
          </ul>
        </section>
        
        <section>
          <h2>3. Why We Use Cookies</h2>
          <ul>
            <li>Keep you logged in securely</li>
            <li>Remember your preferences</li>
            <li>Improve dashboard navigation</li>
            <li>Enhance user experience</li>
          </ul>
        </section>
        
        <section>
          <h2>4. Managing Cookies</h2>
          <p>You can control cookies through your browser settings. Note that disabling essential cookies will prevent you from logging in.</p>
          <p><strong>Browser Settings:</strong></p>
          <ul>
            <li>Chrome: Settings → Privacy → Cookies</li>
            <li>Firefox: Preferences → Privacy → Cookies</li>
            <li>Edge: Settings → Cookies and site permissions</li>
          </ul>
        </section>
        
        <section>
          <h2>5. Third-Party Cookies</h2>
          <p>We do not use third-party advertising cookies. Only functional cookies for authentication and preferences are used.</p>
        </section>
        
        <section>
          <h2>6. Contact</h2>
          <p><strong>Email:</strong> adilbarki111@gmail.com</p>
          <p><strong>Phone:</strong> +92 313 7651005</p>
        </section>
      </div>
    </div>
  );
};

export default CookiePolicy;
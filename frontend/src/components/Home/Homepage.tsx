import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Homepage.css';

const Homepage: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close menu when clicking a link
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    // Save current section on scroll
    const handleScroll = () => {
      const sections = [
        "home",
        "features",
        "how-it-works",
        "pricing",
        "testimonials",
        "faq",
        "about",
        "contact",
      ];
      let currentSection = "home";

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom >= 100) {
            currentSection = section;
            break;
          }
        }
      }
      localStorage.setItem("lastSection", currentSection);
    };

    window.addEventListener("scroll", handleScroll);

    // Restore last section on refresh
    const lastSection = localStorage.getItem("lastSection");
    if (lastSection && lastSection !== "home") {
      const element = document.getElementById(lastSection);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

 

  return (
    <div className="homepage" style={{ overflowY: "auto", height: "auto" }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <div className="logo-icon">SA</div>
            <span className="logo-text">SmartAttend</span>
          </div>
          {isMobile && (
            <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
              <span></span><span></span><span></span>
            </button>
          )}
          <ul className={`nav-menu ${isMobile && menuOpen ? "open" : ""}`}>
            <li>
              <a href="#home" onClick={closeMenu}>Home</a>
            </li>
            <li>
              <a href="#features" onClick={closeMenu}>Features</a>
            </li>
            <li>
              <a href="#how-it-works" onClick={closeMenu}>How It Works</a>
            </li>
            <li>
              <a href="#about" onClick={closeMenu}>About</a>
            </li>
            <li>
              <a href="#pricing" onClick={closeMenu}>Pricing</a>
            </li>
            <li>
              <a href="#testimonials" onClick={closeMenu}>Testimonials</a>
            </li>
            <li>
              <a href="#faq" onClick={closeMenu}>FAQ</a>
            </li>
            <li>
              <a href="#contact" onClick={closeMenu}>Contact</a>
            </li>
          </ul>
          <div className="nav-buttons">
            <Link to="/login" className="btn-login">
              Login
            </Link>
            <Link to="/signup" className="btn-signup">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Page 1: Hero Section */}
      <section id="home" className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Digital Attendance via{" "}
              <span className="highlight">Face Recognition</span>
            </h1>
            <p className="hero-subtitle">
              Modern, secure, and contactless attendance management system for
              educational institutions. Say goodbye to manual registers and
              proxy attendance.
            </p>
            <div className="hero-buttons">
              <Link to="/signup" className="btn-primary">
                Get Started
              </Link>
              <Link to="/login" className="btn-secondary">
                Login
              </Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-number">500+</span>
                <span className="hero-stat-label">Institutions</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-number">50K+</span>
                <span className="hero-stat-label">Students</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-number">99.5%</span>
                <span className="hero-stat-label">Accuracy</span>
              </div>
            </div>
          </div>
          <div className="hero-image">
            <div className="hero-card">
              <div className="face-icon">👤</div>
              <div className="face-recognition-demo">
                <div className="camera-frame">
                  <div className="face-scan"></div>
                </div>
                <p className="demo-text">Face Detected: Adil_Nawaz</p>
                <p className="demo-subtext">Confidence: 98.5%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Page 2: Features Section */}
      <section id="features" className="features">
        <div className="container">
          <h2 className="section-title">Powerful Features</h2>
          <p className="section-subtitle">
            Everything you need for modern attendance management
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📸</div>
              <h3>Face Recognition</h3>
              <p>
                Advanced AI-powered face recognition for accurate and fast
                attendance marking.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Real-time Reports</h3>
              <p>
                Generate Excel and PDF reports with detailed attendance
                analytics.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Multi-role Support</h3>
              <p>
                Separate dashboards for Admin, Teachers, and Students with
                role-based access.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">☁️</div>
              <h3>Cloud Based</h3>
              <p>
                Secure cloud storage with MongoDB Atlas, accessible from
                anywhere.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Responsive Design</h3>
              <p>
                Fully responsive interface that works on desktop, tablet, and
                mobile.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure Authentication</h3>
              <p>JWT-based authentication with role-based access control.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Page 3: How It Works + Pricing */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">
            Simple three-step process for attendance marking
          </p>

          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-icon">📷</div>
              <h3>Capture Face</h3>
              <p>Student looks at the camera for face detection</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-icon">🔍</div>
              <h3>AI Recognition</h3>
              <p>System matches face with registered data</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-icon">✅</div>
              <h3>Mark Attendance</h3>
              <p>Attendance automatically recorded in database</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing">
        <div className="container">
          <h2 className="section-title">Simple Pricing</h2>
          <p className="section-subtitle">
            Choose the perfect plan for your institution
          </p>

          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-header">
                <h3>Basic</h3>
                <div className="pricing-price">Free</div>
                <p>For small classes</p>
              </div>
              <ul className="pricing-features">
                <li>✅ Up to 50 Students</li>
                <li>✅ Basic Face Recognition</li>
                <li>✅ Manual Attendance</li>
                <li>✅ Email Support</li>
                <li>❌ Advanced Reports</li>
                <li>❌ API Access</li>
              </ul>
              <Link to="/signup" className="pricing-btn">
                Get Started
              </Link>
            </div>

            <div className="pricing-card popular">
              <div className="popular-badge">Most Popular</div>
              <div className="pricing-header">
                <h3>Pro</h3>
                <div className="pricing-price">
                  $49<span>/month</span>
                </div>
                <p>For medium institutions</p>
              </div>
              <ul className="pricing-features">
                <li>✅ Up to 500 Students</li>
                <li>✅ Advanced Face Recognition</li>
                <li>✅ Auto Attendance</li>
                <li>✅ Priority Support</li>
                <li>✅ Advanced Reports</li>
                <li>✅ API Access</li>
              </ul>
              <Link to="/signup" className="pricing-btn">
                Get Started
              </Link>
            </div>

            <div className="pricing-card">
              <div className="pricing-header">
                <h3>Enterprise</h3>
                <div className="pricing-price">Custom</div>
                <p>For large organizations</p>
              </div>
              <ul className="pricing-features">
                <li>✅ Unlimited Students</li>
                <li>✅ Custom AI Model</li>
                <li>✅ 24/7 Support</li>
                <li>✅ Dedicated Account Manager</li>
                <li>✅ Custom Integration</li>
                <li>✅ SLA Guarantee</li>
              </ul>
              <Link to="/contact" className="pricing-btn">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Page 4: Testimonials + FAQ + About + Contact */}
      <section id="testimonials" className="testimonials">
        <div className="container">
          <h2 className="section-title">What Our Users Say</h2>
          <p className="section-subtitle">
            Trusted by educational institutions worldwide
          </p>

          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-icon">👨‍🏫</div>
              <p className="testimonial-text">
                "SmartAttend has revolutionized our attendance system. Time
                saved is now used for teaching!"
              </p>
              <h4>Dr. Ahmed Raza</h4>
              <p className="testimonial-role">
                Principal, Karachi Grammar School
              </p>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-icon">👩‍🎓</div>
              <p className="testimonial-text">
                "No more proxy attendance. The face recognition is fast and
                accurate."
              </p>
              <h4>Sarah Khan</h4>
              <p className="testimonial-role">Student, LUMS</p>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-icon">👨‍💻</div>
              <p className="testimonial-text">
                "The reports feature is excellent. Easy to export and share with
                parents."
              </p>
              <h4>Usman Chaudhry</h4>
              <p className="testimonial-role">IT Director, Beaconhouse</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq">
        <div className="container">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">Got questions? We've got answers</p>

          <div className="faq-grid">
            <div className="faq-item">
              <h3>Is face recognition accurate in low light?</h3>
              <p>Yes, our AI model works in both bright and low light.</p>
            </div>
            <div className="faq-item">
              <h3>Can students mark attendance from mobile?</h3>
              <p>Yes, fully responsive on all devices.</p>
            </div>
            <div className="faq-item">
              <h3>How secure is my data?</h3>
              <p>Encrypted with MongoDB Atlas enterprise security.</p>
            </div>
            <div className="faq-item">
              <h3>Can I export attendance reports?</h3>
              <p>Yes, Excel, PDF, and CSV formats available.</p>
            </div>
            <div className="faq-item">
              <h3>What happens if internet disconnects?</h3>
              <p>Offline mode stores data locally, syncs when online.</p>
            </div>
            <div className="faq-item">
              <h3>Is there a free trial?</h3>
              <p>Yes, 14-day free trial with all features.</p>
            </div>
            <div className="faq-item">
              <h3>Can I add multiple admins?</h3>
              <p>Yes, role-based access for multiple admins.</p>
            </div>
            <div className="faq-item">
              <h3>How long does face recognition take?</h3>
              <p>Less than 1 second per face.</p>
            </div>
            <div className="faq-item">
              <h3>Can students see their own attendance?</h3>
              <p>Yes, student dashboard shows personal attendance.</p>
            </div>
            <div className="faq-item">
              <h3>Is WhatsApp notification available?</h3>
              <p>Coming soon - SMS/WhatsApp alerts for parents.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about">
        <div className="container">
          <h2 className="section-title">About SmartAttend</h2>
          <div className="about-content">
            <div className="about-text">
              <p>
                SmartAttend is a cutting-edge attendance management system that
                leverages face recognition technology to automate and streamline
                the attendance process for educational institutions.
              </p>
              <p>
                Built with modern technologies including React, TypeScript,
                FastAPI, and MongoDB, SmartAttend offers a secure, efficient,
                and user-friendly solution for teachers, students, and
                administrators.
              </p>
              <div className="tech-stack">
                <span className="tech-badge">React</span>
                <span className="tech-badge">TypeScript</span>
                <span className="tech-badge">FastAPI</span>
                <span className="tech-badge">MongoDB</span>
                <span className="tech-badge">OpenCV</span>
                <span className="tech-badge">Face Recognition</span>
              </div>
            </div>
            <div className="about-card">
              <div className="developer">
                <div className="dev-icon">👨‍💻</div>
                <h4>Developed By</h4>
                <p>Adil Nawaz Khan & Muhammad Uzair</p>
                <p className="dev-sub">BSCS Final Year Project</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact">
        <div className="container">
          <h2 className="section-title">Get In Touch</h2>
          <p className="section-subtitle">
            Have questions? We'd love to hear from you.
          </p>

          <div className="contact-grid">
            <div className="contact-info">
              <div className="contact-item">
                <div className="contact-icon">
                  {/* 📧 */}
                  <i className="fa-solid fa-envelope"></i>
                </div>
                <div>
                  <h4>Email</h4>
                  <p>adilbarki111@gmail.com</p>
                  {/* <p>support@smartattend.com</p> */}
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon">
                  {/* 📞 */}
                  <i className="fa-solid fa-phone"></i>
                </div>
                <div>
                  <h4>Phone</h4>
                  <p>+92 313 7651005</p>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon">
                  {/* 📍 */}
                  <i className="fa-solid fa-map-marker-alt"></i>
                </div>
                <div>
                  <h4>Address</h4>
                  <p>Peshawer, Pakistan</p>
                </div>
              </div>
            </div>
            <form className="contact-form">
              <input
                type="text"
                placeholder="Your Name"
                className="form-input"
              />
              <input
                type="email"
                placeholder="Your Email"
                className="form-input"
              />
              <textarea
                rows={4}
                placeholder="Your Message"
                className="form-input"
              ></textarea>
              <button type="submit" className="btn-primary">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Get Started?</h2>
            <p>
              Join thousands of institutions using SmartAttend for attendance
              management
            </p>
            <div className="cta-buttons">
              <Link to="/signup" className="btn-cta">
                Sign Up Now
              </Link>
              <Link to="/login" className="btn-cta-secondary">
                Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container "> 
          <div className="footer-content">
            <div className="footer-section">
              <h3>SmartAttend</h3>
              <p>Digital Attendance via  Face Recognition</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li>
                  <a href="#home">Home</a>
                </li>
                <li>
                  <a href="#features">Features</a>
                </li>
                <li>
                  <a href="#how-it-works">How It Works</a>
                </li>
                <li>
                  <a href="#pricing">Pricing</a>
                </li>
                <li>
                  <a href="#contact">Contact</a>
                </li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Legal</h4>
              <ul>
                <li>
                  <a href="#">Privacy Policy</a>
                </li>
                <li>
                  <a href="#">Terms of Service</a>
                </li>
                <li>
                  <a href="#">Cookie Policy</a>
                </li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Follow Us</h4>
              <div className="social-links">
                <a
                  href="https://www.facebook.com/share/1D4H61sPyS/"
                  aria-label="Facebook"
                >
                  <i className="fab fa-facebook-f"></i>
                </a>
                <a href="https://wa.me/923137651005" aria-label="WhatsApp">
                  {" "}
                  <i className="fab fa-whatsapp"></i>
                </a>
                <a
                  href="https://www.linkedin.com/in/adil-nawaz-khan-15475b2b4"
                  aria-label="LinkedIn"
                >
                  <i className="fab fa-linkedin-in"></i>
                </a>
                <a href="https://github.com/adilbarki" aria-label="GitHub">
                  <i className="fab fa-github"></i>
                </a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>
              &copy; 2026 SmartAttend. All rights reserved. | Digital Attendance
              via Face Recognition
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;

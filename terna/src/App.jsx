// import React from 'react'
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import { Link } from "react-router-dom";
import { useLanguage } from "./LanguageContext";

// SOS button lazy-loaded — not needed for first paint
const SOSButton = lazy(() => import("./components/SOSButton"));

const CountUp = ({ end, duration = 2000, trigger }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!trigger) return;

    setCount(0); // Reset count
    let startTime;
    let animationFrame;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, trigger]);

  return <span>{count.toLocaleString()}+</span>;
};

const App = () => {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const statsRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          } else {
            setIsVisible(false);
          }
        });
      },
      { threshold: 0.3 }, // Trigger when 30% of the section is visible
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => {
      if (statsRef.current) {
        observer.unobserve(statsRef.current);
      }
    };
  }, []);

  return (
    <div>
      <Navbar />

      <section className="hero">
        <div className="hero-content">
          <h2 className="hero-title">{t("heroTitle")}</h2>
          <div className="hero-buttons">
            <Link to="/doctors">
              <button className="btn btn-primary">{t("viewDoctors")}</button>
            </Link>
            <Link to="/medicines">
              <button className="btn btn-primary">{t("viewMedicines")}</button>
            </Link>
            <Link to="/ask-ai">
              <button className="btn btn-secondary">{t("askAI")}</button>
            </Link>
          </div>
        </div>
        <div className="hero-image">
          <img
            src="/hero-doctors.png"
            alt="Healthcare professionals"
            loading="lazy"
            decoding="async"
            fetchpriority="low"
            width="500"
            height="400"
          />
        </div>
      </section>

      <section className="stats-section" ref={statsRef}>
        <div className="stats-container">
          <div className="stat-box">
            <h3>{t("usersRegistered")}</h3>
            <p className="stat-number">
              <CountUp end={1250} trigger={isVisible} />
            </p>
          </div>
          <div className="stat-box">
            <h3>{t("symptomChecks")}</h3>
            <p className="stat-number">
              <CountUp end={3450} trigger={isVisible} />
            </p>
          </div>
          <div className="stat-box">
            <h3>{t("sosTriggered")}</h3>
            <p className="stat-number">
              <CountUp end={127} trigger={isVisible} />
            </p>
          </div>
        </div>
      </section>

      <section className="about-section" id="about">
        <div className="about-container">
          <h2 className="about-title">{t("aboutTitle")}</h2>
          <div className="about-content">
            <p>{t("aboutText1")}</p>
            <p>{t("aboutText2")}</p>
          </div>
          <div className="about-features">
            <div className="feature-card">
              <div className="feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
                </svg>
              </div>
              <h4>{t("voiceEnabled")}</h4>
              <p>{t("voiceEnabledDesc")}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <path d="M12 18h.01" />
                </svg>
              </div>
              <h4>{t("lowInternet")}</h4>
              <p>{t("lowInternetDesc")}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                  <path d="M12 3v6m-2-2l2-2 2 2" />
                </svg>
              </div>
              <h4>{t("emergencySupport")}</h4>
              <p>{t("emergencySupportDesc")}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                  <path d="M22 12h-4m2-2v4" />
                </svg>
              </div>
              <h4>{t("healthcareGuidance")}</h4>
              <p>{t("healthcareGuidanceDesc")}</p>
            </div>
          </div>
          <div className="about-disclaimer">
            <svg
              className="disclaimer-icon disclaimer-icon-left"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="disclaimer-text">
              <strong>{t("important")}</strong> {t("aboutDisclaimer")}
            </span>
            <svg
              className="disclaimer-icon disclaimer-icon-right"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">{t("howItWorks")}</h2>
          <p className="section-subtitle">{t("howItWorksDesc")}</p>
          <div className="steps-container">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <circle cx="12" cy="16" r="3" opacity="0.5" />
                </svg>
              </div>
              <h3>{t("step1Title")}</h3>
              <p>{t("step1Desc")}</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>{t("step2Title")}</h3>
              <p>{t("step2Desc")}</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect
                    x="4"
                    y="4"
                    width="16"
                    height="16"
                    rx="8"
                    opacity="0.3"
                  />
                  <rect x="8" y="8" width="8" height="8" rx="4" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              </div>
              <h3>{t("step3Title")}</h3>
              <p>{t("step3Desc")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="why-choose">
        <div className="container">
          <h2 className="section-title">{t("whyChooseUs")}</h2>
          <p className="section-subtitle">{t("whyChooseDesc")}</p>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="2" />
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                </svg>
              </div>
              <h3>{t("benefit1Title")}</h3>
              <p>{t("benefit1Desc")}</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <circle cx="12" cy="16" r="2" fill="currentColor" />
                </svg>
              </div>
              <h3>{t("benefit2Title")}</h3>
              <p>{t("benefit2Desc")}</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>{t("benefit3Title")}</h3>
              <p>{t("benefit3Desc")}</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="6" y1="3" x2="6" y2="15" />
                  <circle cx="18" cy="6" r="3" />
                  <circle cx="6" cy="18" r="3" />
                  <path d="M18 9a9 9 0 0 1-9 9" />
                </svg>
              </div>
              <h3>{t("benefit4Title")}</h3>
              <p>{t("benefit4Desc")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="common-issues">
        <div className="container">
          <h2 className="section-title">{t("commonIssues")}</h2>
          <p className="section-subtitle">{t("commonIssuesDesc")}</p>
          <div className="issues-grid">
            <div className="issue-tag">{t("issue1")}</div>
            <div className="issue-tag">{t("issue2")}</div>
            <div className="issue-tag">{t("issue3")}</div>
            <div className="issue-tag">{t("issue4")}</div>
            <div className="issue-tag">{t("issue5")}</div>
            <div className="issue-tag">{t("issue6")}</div>
            <div className="issue-tag">{t("issue7")}</div>
            <div className="issue-tag">{t("issue8")}</div>
            <div className="issue-tag highlight">{t("issue9")}</div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-container">
          <h2 className="cta-title">{t("getStarted")}</h2>
          <p className="cta-desc">{t("getStartedDesc")}</p>
          <Link to="/ask-ai">
            <button className="cta-button">{t("startNow")}</button>
          </Link>
        </div>
      </section>

      <Suspense fallback={null}>
        <SOSButton />
      </Suspense>
    </div>
  );
};

export default App;

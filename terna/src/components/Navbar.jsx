import { useState, useEffect } from "react";
import "./Navbar.css";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../LanguageContext";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // ── Dynamically load Firebase AFTER first paint ─────────────
  useEffect(() => {
    let unsubscribe = () => {};

    // Use dynamic import so Firebase is NOT in the initial bundle
    import("../firebase").then(({ auth }) => {
      import("firebase/auth").then(({ onAuthStateChanged }) => {
        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setIsAdmin(!!currentUser?.email?.includes("admin"));
        });
      });
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      const { auth } = await import("../firebase");
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  const handleAboutClick = () => {
    if (location.pathname === "/") {
      const aboutSection = document.getElementById("about");
      if (aboutSection) {
        aboutSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      navigate("/");
      setTimeout(() => {
        const aboutSection = document.getElementById("about");
        if (aboutSection) {
          aboutSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  };

  return (
    <nav className="navbar">
      <Link to="/" style={{ textDecoration: "none" }}>
        <h1>GramHealth</h1>
      </Link>
      <div className="navbar-center">
        <Link to="/" className="nav-link">
          {t("home")}
        </Link>
        <button className="nav-link" onClick={handleAboutClick}>
          {t("about")}
        </button>
        {isAdmin ? (
          <>
            <Link to="/admin-store" className="nav-link">
              {t("store")}
            </Link>
          </>
        ) : (
          <>
            <Link to="/cart" className="nav-link">
              {t("cart")}
            </Link>
            <Link to="/my-orders" className="nav-link">
              {t("myOrders")}
            </Link>
          </>
        )}
        {user ? (
          <button onClick={handleLogout} className="nav-link nav-link-btn">
            {t("logout")}
          </button>
        ) : (
          <Link to="/login" className="nav-link nav-link-btn">
            {t("login")}
          </Link>
        )}
      </div>
      <div className="navbar-right">
        <select
          value={language}
          onChange={handleLanguageChange}
          className="language-selector"
        >
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
          <option value="mr">मराठी</option>
        </select>
        {user && (
          <span className="user-greeting">
            {t("hi")}, {user.displayName || user.email?.split("@")[0]}
          </span>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

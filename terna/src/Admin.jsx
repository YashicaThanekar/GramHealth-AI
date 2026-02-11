import Navbar from "./components/Navbar";
import { Link } from "react-router-dom";
import "./Admin.css";

const Admin = () => {
  return (
    <div>
      <Navbar />
      {/* <div className="admin-content">
        <h2>Admin Panel</h2>
      </div> */}

      <section className="hero">
        <div className="hero-content">
          <h2 className="hero-title">
            A Voice-Enabled Smart Rural Healthcare Assistant for Emergency and
            Preventive Care
          </h2>
          <div className="hero-buttons">
            <Link to="/doctors">
              <button className="btn btn-primary">View Doctors</button>
            </Link>
            <Link to="/medicines">
              <button className="btn btn-secondary">Medicines</button>
            </Link>
          </div>
        </div>
        <div className="hero-image">
          <img
            src="/hero-doctors.png"
            alt="Healthcare professionals"
            loading="lazy"
            fetchpriority="low"
          />
        </div>
      </section>
    </div>
  );
};

export default Admin;

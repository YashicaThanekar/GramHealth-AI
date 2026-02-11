import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Toast from "./components/Toast";
import "./AddDoctor.css";
import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

const AddDoctor = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    specialization: "",
    experience: "",
    contact: "",
    email: "",
    location: "",
    // profilePic: null, // removed
    address: "",
  });

  // const [uploading, setUploading] = useState(false); // removed

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "doctors"), {
        name: formData.name,
        specialization: formData.specialization,
        experience: formData.experience,
        contact: formData.contact,
        email: formData.email,
        location: formData.location,
        address: formData.address,
        createdAt: new Date(),
      });
      setToast({ message: "Doctor added successfully!", type: "success" });
      setTimeout(() => {
        navigate("/doctors");
      }, 1500);
    } catch (error) {
      console.error("Error adding doctor:", error);
      setToast({
        message: "Error adding doctor. Please try again.",
        type: "error",
      });
    }
  };

  return (
    <div>
      <Navbar />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="add-doctor-container">
        <div className="add-doctor-box">
          <h2>Add New Doctor</h2>
          <form className="add-doctor-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Doctor Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter doctor's full name"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="specialization">Specialization</label>
              <input
                type="text"
                id="specialization"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                placeholder="e.g., Cardiologist, Pediatrician"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="experience">Experience (in years)</label>
              <input
                type="number"
                id="experience"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                placeholder="Years of experience"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="contact">Contact Number</label>
              <input
                type="tel"
                id="contact"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                placeholder="10-digit phone number"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="doctor@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="City/Hospital name"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="address">Address</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Full address"
                required
              />
            </div>
            <button type="submit" className="submit-btn">
              Add Doctor
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddDoctor;

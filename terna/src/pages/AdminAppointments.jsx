import { useEffect, useState } from "react";
import {
  collection,
  query,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import Toast from "../components/Toast";
import Navbar from "../components/Navbar";
import "./AdminAppointments.css";

const AdminAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState("All");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "appointments"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appointmentsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAppointments(appointmentsData);
    });
    return () => unsubscribe();
  }, []);

  const handleConfirm = async (appointmentId) => {
    try {
      const appointmentRef = doc(db, "appointments", appointmentId);
      await updateDoc(appointmentRef, {
        status: "Confirmed",
      });
      setToast({ message: "Appointment confirmed!", type: "success" });
    } catch (error) {
      console.error("Error confirming appointment:", error);
      setToast({ message: "Failed to confirm appointment", type: "error" });
    }
  };

  const handleReject = async (appointmentId) => {
    try {
      const appointmentRef = doc(db, "appointments", appointmentId);
      await updateDoc(appointmentRef, {
        status: "Rejected",
      });
      setToast({ message: "Appointment rejected", type: "error" });
    } catch (error) {
      console.error("Error rejecting appointment:", error);
      setToast({ message: "Failed to reject appointment", type: "error" });
    }
  };

  const handleDelete = async (appointmentId) => {
    try {
      await deleteDoc(doc(db, "appointments", appointmentId));
      setToast({ message: "Appointment deleted", type: "info" });
    } catch (error) {
      console.error("Error deleting appointment:", error);
      setToast({ message: "Failed to delete appointment", type: "error" });
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (filter === "All") return true;
    return apt.status === filter;
  });

  return (
    <>
      <Navbar />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="admin-appointments">
        <h1>Appointment Management</h1>
        <div className="filter-section">
          <button
            className={filter === "All" ? "active" : ""}
            onClick={() => setFilter("All")}
          >
            All ({appointments.length})
          </button>
          <button
            className={filter === "Pending" ? "active" : ""}
            onClick={() => setFilter("Pending")}
          >
            Pending ({appointments.filter((a) => a.status === "Pending").length}
            )
          </button>
          <button
            className={filter === "Confirmed" ? "active" : ""}
            onClick={() => setFilter("Confirmed")}
          >
            Confirmed (
            {appointments.filter((a) => a.status === "Confirmed").length})
          </button>
          <button
            className={filter === "Rejected" ? "active" : ""}
            onClick={() => setFilter("Rejected")}
          >
            Rejected (
            {appointments.filter((a) => a.status === "Rejected").length})
          </button>
        </div>

        <div className="appointments-container">
          {filteredAppointments.length === 0 ? (
            <p className="no-appointments">No appointments found</p>
          ) : (
            filteredAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className={`appointment-card ${appointment.status.toLowerCase()}`}
              >
                <div className="appointment-header">
                  <h3>{appointment.doctorName}</h3>
                  <span
                    className={`status-badge ${appointment.status.toLowerCase()}`}
                  >
                    {appointment.status}
                  </span>
                </div>
                <div className="appointment-details">
                  <p>
                    <strong>Patient:</strong> {appointment.userEmail}
                  </p>
                  <p>
                    <strong>Specialty:</strong> {appointment.specialty}
                  </p>
                  <p>
                    <strong>Date:</strong>{" "}
                    {appointment.appointmentDate
                      ? new Date(
                          appointment.appointmentDate,
                        ).toLocaleDateString()
                      : "N/A"}
                  </p>
                  <p>
                    <strong>Time:</strong>{" "}
                    {appointment.appointmentDate
                      ? new Date(
                          appointment.appointmentDate,
                        ).toLocaleTimeString()
                      : "N/A"}
                  </p>
                  <p>
                    <strong>Contact:</strong> {appointment.doctorContact}
                  </p>
                  <p>
                    <strong>Location:</strong> {appointment.doctorLocation}
                  </p>
                  <p className="booked-at">
                    <strong>Booked at:</strong>{" "}
                    {appointment.bookedAt
                      ? new Date(appointment.bookedAt.toDate()).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
                <div className="appointment-actions">
                  {appointment.status === "Pending" && (
                    <>
                      <button
                        className="confirm-btn"
                        onClick={() => handleConfirm(appointment.id)}
                      >
                        Confirm
                      </button>
                      <button
                        className="reject-btn"
                        onClick={() => handleReject(appointment.id)}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(appointment.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default AdminAppointments;

// This file has been removed as per user request.
import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Navbar from "./Navbar";
import SOSButton from "./SOSButton";
import Toast from "./Toast";
import ConfirmDialog from "./ConfirmDialog";
import "./BookedAppointments.css";

const BookedAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    appointmentId: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchAppointments(currentUser.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchAppointments = async (userId) => {
    try {
      const q = query(
        collection(db, "appointments"),
        where("userId", "==", userId),
      );
      const querySnapshot = await getDocs(q);
      const appointmentsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAppointments(appointmentsList);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      showToast("Failed to load appointments", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
  };

  const handleCancelAppointment = (appointmentId) => {
    setConfirmDialog({ show: true, appointmentId });
  };

  const confirmCancelAppointment = async () => {
    try {
      await deleteDoc(doc(db, "appointments", confirmDialog.appointmentId));
      setAppointments(
        appointments.filter((apt) => apt.id !== confirmDialog.appointmentId),
      );
      showToast("Appointment cancelled successfully", "success");
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      showToast("Failed to cancel appointment", "error");
    } finally {
      setConfirmDialog({ show: false, appointmentId: null });
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "status-confirmed";
      case "pending":
        return "status-pending";
      case "completed":
        return "status-completed";
      default:
        return "status-pending";
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="appointments-loading">
          <div className="loader"></div>
          <p>Loading your appointments...</p>
        </div>
        <SOSButton />
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <Navbar />
        <div className="appointments-empty">
          <h2>Please login to view your appointments</h2>
        </div>
        <SOSButton />
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="appointments-container">
        <h1 className="appointments-title">My Appointments</h1>

        {appointments.length === 0 ? (
          <div className="appointments-empty">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="80"
              height="80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <h2>No Appointments Yet</h2>
            <p>You haven't booked any appointments</p>
          </div>
        ) : (
          <div className="appointments-grid">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="appointment-card">
                <div className="appointment-header">
                  <h3>{appointment.doctorName || "Dr. Unknown"}</h3>
                  <span
                    className={`appointment-status ${getStatusClass(appointment.status)}`}
                  >
                    {appointment.status || "Pending"}
                  </span>
                </div>

                <div className="appointment-details">
                  <div className="detail-row">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>{formatDate(appointment.appointmentDate)}</span>
                  </div>

                  <div className="detail-row">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{formatTime(appointment.appointmentDate)}</span>
                  </div>

                  {appointment.specialty && (
                    <div className="detail-row">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                      <span>{appointment.specialty}</span>
                    </div>
                  )}

                  {appointment.reason && (
                    <div className="appointment-reason">
                      <strong>Reason:</strong> {appointment.reason}
                    </div>
                  )}
                </div>

                {appointment.status?.toLowerCase() !== "completed" && (
                  <button
                    className="cancel-btn"
                    onClick={() => handleCancelAppointment(appointment.id)}
                  >
                    Cancel Appointment
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <SOSButton />

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: "", type: "" })}
        />
      )}

      {confirmDialog.show && (
        <ConfirmDialog
          message="Are you sure you want to cancel this appointment?"
          onConfirm={confirmCancelAppointment}
          onCancel={() =>
            setConfirmDialog({ show: false, appointmentId: null })
          }
        />
      )}
    </div>
  );
};

export default BookedAppointments;

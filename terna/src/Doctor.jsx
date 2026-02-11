import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import SOSButton from "./components/SOSButton";
import SkeletonCards from "./components/SkeletonCards";
import { Link } from "react-router-dom";
import Toast from "./components/Toast";
import ConfirmDialog from "./components/ConfirmDialog";
import { useLanguage } from "./LanguageContext";
import "./Doctor.css";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

const Doctor = () => {
  const { t } = useLanguage();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [editModal, setEditModal] = useState({
    open: false,
    doctor: null,
    form: {},
  });

  // Helper function to translate specialization
  const translateSpecialization = (spec) => {
    if (!spec) return "";
    const key = `spec_${spec.toLowerCase().replace(/\s+/g, "_").replace(/[&]/g, "")}`;
    const translated = t(key);
    // If translation key doesn't exist, return original
    return translated === key ? spec : translated;
  };

  // Helper function to translate day names in availability string
  const translateAvailability = (availability) => {
    if (!availability) return "";
    let translated = availability;
    const dayMappings = {
      'Monday': t('monday'),
      'Tuesday': t('tuesday'),
      'Wednesday': t('wednesday'),
      'Thursday': t('thursday'),
      'Friday': t('friday'),
      'Saturday': t('saturday'),
      'Sunday': t('sunday')
    };
    
    Object.keys(dayMappings).forEach(day => {
      translated = translated.replace(new RegExp(day, 'g'), dayMappings[day]);
    });
    
    return translated;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // TODO: Implement proper admin check (e.g., check user role from database)
      // For now, you can check if email contains 'admin' or matches specific admin emails
      if (user) {
        setIsLoggedIn(true);
        if (user.email && user.email.includes("admin")) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "doctors"));
        const doctorsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setDoctors(doctorsData);
      } catch (error) {
        console.error("Error fetching doctors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  const handleDelete = (doctorId, doctorName) => {
    setConfirmDialog({
      message: `${t("confirmRemoveDoctor")} ${doctorName}?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await deleteDoc(doc(db, "doctors", doctorId));
          setDoctors(doctors.filter((doctor) => doctor.id !== doctorId));
          setToast({
            message: t("doctorRemoved"),
            type: "success",
          });
        } catch (error) {
          console.error("Error deleting doctor:", error);
          setToast({
            message: t("errorRemovingDoctor"),
            type: "error",
          });
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  // Removed book appointment handler. Only Contact and Locate buttons are shown for users.

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
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
      <div className="doctors-page">
        {loading ? (
          <SkeletonCards count={6} title />
        ) : (
          <div className="doctors-grid">
            {doctors.map((doctor) => (
              <div key={doctor.id} className="doctor-card">
                {isAdmin && (
                  <button
                    className="edit-doctor-btn"
                    title="Edit Doctor"
                    onClick={() =>
                      setEditModal({ open: true, doctor, form: { ...doctor } })
                    }
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      zIndex: 2,
                    }}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#1ab6b3"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                )}
                <div className="doctor-info">
                  <h3>{doctor.name}</h3>
                  <p className="specialization">{translateSpecialization(doctor.specialization)}</p>
                  {doctor.availability && (
                    <p className="availability">
                      <strong>{t("availability")}:</strong> {translateAvailability(doctor.availability)}
                    </p>
                  )}
                  <div className="doctor-details">
                    {doctor.profilePic && (
                      <div className="doctor-pic-container">
                        <img
                          src={doctor.profilePic}
                          alt={doctor.name + " profile"}
                          className="doctor-profile-pic"
                        />
                      </div>
                    )}
                    {/* profilePic removed */}
                    <p>
                      <strong>{t("experience")}:</strong> {doctor.experience} {t("years")}
                    </p>
                    <p>
                      <strong>{t("location")}:</strong> {doctor.location}
                    </p>
                    {doctor.address && (
                      <p>
                        <strong>{t("address")}:</strong> {doctor.address}
                      </p>
                    )}
                    <p>
                      <strong>{t("contact")}:</strong> {doctor.contact}
                    </p>
                    <p>
                      <strong>{t("email")}:</strong> {doctor.email}
                    </p>
                  </div>
                  {isAdmin ? (
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(doctor.id, doctor.name)}
                    >
                      {t("removeDoctor")}
                    </button>
                  ) : (
                    <div className="doctor-action-btns">
                      <a
                        href={isLoggedIn ? `tel:${doctor.contact}` : "#"}
                        className="contact-btn site-btn"
                        onClick={(e) => {
                          if (!isLoggedIn) {
                            e.preventDefault();
                            setToast({
                              message: t("loginToContact"),
                              type: "error",
                            });
                          }
                        }}
                      >
                        {t("contactBtn")}
                      </a>
                      <a
                        href={
                          isLoggedIn
                            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(doctor.location)}`
                            : "#"
                        }
                        className="locate-btn site-btn"
                        target={isLoggedIn ? "_blank" : undefined}
                        rel={isLoggedIn ? "noopener noreferrer" : undefined}
                        onClick={(e) => {
                          if (!isLoggedIn) {
                            e.preventDefault();
                            setToast({
                              message: t("loginToLocate"),
                              type: "error",
                            });
                          }
                        }}
                      >
                        {t("locateBtn")}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {isAdmin && (
          <Link to="/add-doctor" className="floating-add-btn">
            <span>+</span>
          </Link>
        )}
        {!isAdmin && isLoggedIn && <SOSButton />}
      </div>

      {/* Edit Doctor Modal - Rendered at root level */}
      {editModal.open && (
        <div
          className="modal-overlay"
          onClick={() => setEditModal({ open: false, doctor: null, form: {} })}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() =>
                setEditModal({ open: false, doctor: null, form: {} })
              }
            >
              &times;
            </button>
            <h3>{t("editDoctor")}</h3>
            <form
              className="edit-doctor-form"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const docRef = doc(db, "doctors", editModal.doctor.id);
                  const availability = `${editModal.form.availDayFrom || ""} to ${editModal.form.availDayTo || ""}, ${editModal.form.availTimeFrom || ""} to ${editModal.form.availTimeTo || ""}`;
                  await updateDoc(docRef, {
                    name: editModal.form.name,
                    specialization: editModal.form.specialization,
                    experience: editModal.form.experience,
                    contact: editModal.form.contact,
                    email: editModal.form.email,
                    location: editModal.form.location,
                    address: editModal.form.address,
                    availability,
                  });
                  setDoctors(
                    doctors.map((d) =>
                      d.id === editModal.doctor.id
                        ? { ...d, ...editModal.form, availability }
                        : d,
                    ),
                  );
                  setToast({
                    message: t("doctorUpdated"),
                    type: "success",
                  });
                  setEditModal({
                    open: false,
                    doctor: null,
                    form: {},
                  });
                } catch (error) {
                  setToast({
                    message: t("errorUpdatingDoctor"),
                    type: "error",
                  });
                }
              }}
            >
              <div className="edit-form-group">
                <label>{t("name")}:</label>
                <input
                  type="text"
                  value={editModal.form.name || ""}
                  onChange={(e) =>
                    setEditModal((m) => ({
                      ...m,
                      form: { ...m.form, name: e.target.value },
                    }))
                  }
                  required
                />
              </div>

              <div className="edit-form-group">
                <label>{t("specialization")}:</label>
                <input
                  type="text"
                  value={editModal.form.specialization || ""}
                  onChange={(e) =>
                    setEditModal((m) => ({
                      ...m,
                      form: {
                        ...m.form,
                        specialization: e.target.value,
                      },
                    }))
                  }
                  required
                />
              </div>

              <div className="edit-form-group">
                <label>{t("experience")}:</label>
                <input
                  type="number"
                  value={editModal.form.experience || ""}
                  onChange={(e) =>
                    setEditModal((m) => ({
                      ...m,
                      form: { ...m.form, experience: e.target.value },
                    }))
                  }
                  required
                />
              </div>

              <div className="edit-form-group">
                <label>{t("contact")}:</label>
                <input
                  type="tel"
                  value={editModal.form.contact || ""}
                  onChange={(e) =>
                    setEditModal((m) => ({
                      ...m,
                      form: { ...m.form, contact: e.target.value },
                    }))
                  }
                  required
                />
              </div>

              <div className="edit-form-group">
                <label>{t("email")}:</label>
                <input
                  type="email"
                  value={editModal.form.email || ""}
                  onChange={(e) =>
                    setEditModal((m) => ({
                      ...m,
                      form: { ...m.form, email: e.target.value },
                    }))
                  }
                  required
                />
              </div>

              <div className="edit-form-group">
                <label>{t("location")}:</label>
                <input
                  type="text"
                  value={editModal.form.location || ""}
                  onChange={(e) =>
                    setEditModal((m) => ({
                      ...m,
                      form: { ...m.form, location: e.target.value },
                    }))
                  }
                  required
                />
              </div>

              <div className="edit-form-group">
                <label>{t("address")}:</label>
                <textarea
                  value={editModal.form.address || ""}
                  onChange={(e) =>
                    setEditModal((m) => ({
                      ...m,
                      form: { ...m.form, address: e.target.value },
                    }))
                  }
                  required
                  rows="3"
                />
              </div>

              <div className="edit-form-group">
                <label>{t("availabilityTimings")}:</label>
                <div className="availability-controls">
                  <select
                    name="availDayFrom"
                    value={editModal.form.availDayFrom || ""}
                    onChange={(e) =>
                      setEditModal((m) => ({
                        ...m,
                        form: { ...m.form, availDayFrom: e.target.value },
                      }))
                    }
                    required
                  >
                    <option value="">{t("fromDay")}</option>
                    <option value="Monday">{t("monday")}</option>
                    <option value="Tuesday">{t("tuesday")}</option>
                    <option value="Wednesday">{t("wednesday")}</option>
                    <option value="Thursday">{t("thursday")}</option>
                    <option value="Friday">{t("friday")}</option>
                    <option value="Saturday">{t("saturday")}</option>
                    <option value="Sunday">{t("sunday")}</option>
                  </select>
                  <select
                    name="availDayTo"
                    value={editModal.form.availDayTo || ""}
                    onChange={(e) =>
                      setEditModal((m) => ({
                        ...m,
                        form: { ...m.form, availDayTo: e.target.value },
                      }))
                    }
                    required
                  >
                    <option value="">{t("toDay")}</option>
                    <option value="Monday">{t("monday")}</option>
                    <option value="Tuesday">{t("tuesday")}</option>
                    <option value="Wednesday">{t("wednesday")}</option>
                    <option value="Thursday">{t("thursday")}</option>
                    <option value="Friday">{t("friday")}</option>
                    <option value="Saturday">{t("saturday")}</option>
                    <option value="Sunday">{t("sunday")}</option>
                  </select>
                  <select
                    name="availTimeFrom"
                    value={editModal.form.availTimeFrom || ""}
                    onChange={(e) =>
                      setEditModal((m) => ({
                        ...m,
                        form: { ...m.form, availTimeFrom: e.target.value },
                      }))
                    }
                    required
                  >
                    <option value="">{t("fromTime")}</option>
                    <option value="06:00">6:00 AM</option>
                    <option value="07:00">7:00 AM</option>
                    <option value="08:00">8:00 AM</option>
                    <option value="09:00">9:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="13:00">1:00 PM</option>
                    <option value="14:00">2:00 PM</option>
                    <option value="15:00">3:00 PM</option>
                    <option value="16:00">4:00 PM</option>
                    <option value="17:00">5:00 PM</option>
                    <option value="18:00">6:00 PM</option>
                    <option value="19:00">7:00 PM</option>
                    <option value="20:00">8:00 PM</option>
                    <option value="21:00">9:00 PM</option>
                  </select>
                  <select
                    name="availTimeTo"
                    value={editModal.form.availTimeTo || ""}
                    onChange={(e) =>
                      setEditModal((m) => ({
                        ...m,
                        form: { ...m.form, availTimeTo: e.target.value },
                      }))
                    }
                    required
                  >
                    <option value="">{t("toTime")}</option>
                    <option value="06:00">6:00 AM</option>
                    <option value="07:00">7:00 AM</option>
                    <option value="08:00">8:00 AM</option>
                    <option value="09:00">9:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="13:00">1:00 PM</option>
                    <option value="14:00">2:00 PM</option>
                    <option value="15:00">3:00 PM</option>
                    <option value="16:00">4:00 PM</option>
                    <option value="17:00">5:00 PM</option>
                    <option value="18:00">6:00 PM</option>
                    <option value="19:00">7:00 PM</option>
                    <option value="20:00">8:00 PM</option>
                    <option value="21:00">9:00 PM</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="modal-save-btn">
                {t("saveChanges")}
              </button>
            </form>
          </div>
        </div>
      )}

      <footer>
        <p>© 2024 Doctor App. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Doctor;

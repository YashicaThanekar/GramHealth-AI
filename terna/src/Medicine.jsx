import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import SkeletonCards from "./components/SkeletonCards";
import { Link } from "react-router-dom";
import Toast from "./components/Toast";
import ConfirmDialog from "./components/ConfirmDialog";
import { useCart } from "./CartContext";
import { useLanguage } from "./LanguageContext";
import "./Medicine.css";
import { db, auth } from "./firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const Medicine = () => {
  const { t } = useLanguage();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const { addToCart } = useCart();

  // Helper function to translate category
  const translateCategory = (category) => {
    if (!category) return "";
    const key = `cat_${category.toLowerCase().replace(/\s+/g, "_").replace(/[&]/g, "")}`;
    const translated = t(key);
    // If translation key doesn't exist, return original
    return translated === key ? category : translated;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (user.email?.includes("admin")) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "medicines"));
        const medicinesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMedicines(medicinesData);
      } catch (error) {
        console.error("Error fetching medicines:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMedicines();
  }, []);

  const handleDelete = (medicineId, medicineName) => {
    setConfirmDialog({
      message: `${t("confirmRemoveMedicine")} ${medicineName}?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await deleteDoc(doc(db, "medicines", medicineId));
          setMedicines(
            medicines.filter((medicine) => medicine.id !== medicineId),
          );
          setToast({
            message: t("medicineRemoved"),
            type: "success",
          });
        } catch (error) {
          console.error("Error deleting medicine:", error);
          setToast({
            message: t("errorRemovingMedicine"),
            type: "error",
          });
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleBuyMedicine = (medicine) => {
    addToCart(medicine);
    setToast({
      message: `${medicine.name} ${t("addedToCart")}`,
      type: "success",
    });
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
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
      <div className="medicines-page">
        <div className="medicines-header">
          <h2>{t("availableMedicines")}</h2>
        </div>

        {loading ? (
          <SkeletonCards count={6} title />
        ) : medicines.length === 0 ? (
          <div className="no-medicines">
            <p>{t("noMedicinesAvailable")}</p>
            {isAdmin && <p>{t("addMedicinePrompt")}</p>}
          </div>
        ) : (
          <div className="medicines-grid">
            {medicines.map((medicine) => (
              <div key={medicine.id} className="medicine-card">
                <div className="medicine-info">
                  <h3>{medicine.name}</h3>
                  <p className="category">{translateCategory(medicine.category)}</p>
                  <div className="medicine-details">
                    <p>
                      <strong>{t("manufacturer")}:</strong> {medicine.manufacturer}
                    </p>
                    <p>
                      <strong>{t("price")}:</strong> ₹{medicine.price}
                    </p>
                    <p>
                      <strong>{t("stock")}:</strong> {medicine.stock} {t("units")}
                    </p>
                    {medicine.description && (
                      <p>
                        <strong>{t("description")}:</strong> {medicine.description}
                      </p>
                    )}
                  </div>
                  {isAdmin ? (
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(medicine.id, medicine.name)}
                    >
                      {t("removeMedicine")}
                    </button>
                  ) : (
                    <button
                      className="buy-btn"
                      onClick={() => handleBuyMedicine(medicine)}
                    >
                      {t("buyMedicine")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {isAdmin && (
          <Link to="/add-medicine" className="floating-add-btn">
            <span>+</span>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Medicine;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Toast from "./components/Toast";
import "./AddMedicine.css";
import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

const AddMedicine = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    manufacturer: "",
    price: "",
    stock: "",
    description: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "medicines"), {
        name: formData.name,
        category: formData.category,
        manufacturer: formData.manufacturer,
        price: formData.price,
        stock: formData.stock,
        description: formData.description,
        createdAt: new Date(),
      });
      setToast({ message: "Medicine added successfully!", type: "success" });
      setTimeout(() => {
        navigate("/medicines");
      }, 1500);
    } catch (error) {
      console.error("Error adding medicine:", error);
      setToast({
        message: "Error adding medicine. Please try again.",
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
      <div className="add-medicine-container">
        <div className="add-medicine-box">
          <h2>Add New Medicine</h2>
          <form className="add-medicine-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Medicine Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter medicine name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category</label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="e.g., Antibiotic, Painkiller, Vitamin"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="manufacturer">Manufacturer</label>
              <input
                type="text"
                id="manufacturer"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                placeholder="Enter manufacturer name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="price">Price (₹)</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="Enter price"
                required
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="stock">Stock Quantity</label>
              <input
                type="number"
                id="stock"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                placeholder="Enter stock quantity"
                required
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description (Optional)</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter medicine description, usage instructions, etc."
                rows="4"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-submit">
                Add Medicine
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => navigate("/medicines")}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddMedicine;

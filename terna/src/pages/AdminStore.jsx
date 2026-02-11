import { useEffect, useState } from "react";
import {
  collection,
  query,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import Toast from "../components/Toast";
import Navbar from "../components/Navbar";
import "./AdminStore.css";

const AdminStore = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("All");
  const [toast, setToast] = useState(null);
  const [editingNotes, setEditingNotes] = useState({});

  useEffect(() => {
    const q = query(collection(db, "orders"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrders(ordersData);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: new Date(),
      });
      setToast({
        message: `Order status updated to ${newStatus}`,
        type: "success",
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      setToast({ message: "Failed to update order status", type: "error" });
    }
  };

  const handleUpdateNotes = async (orderId) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        adminNotes: editingNotes[orderId] || "",
        updatedAt: new Date(),
      });
      setToast({
        message: "Admin notes updated successfully",
        type: "success",
      });
      setEditingNotes({ ...editingNotes, [orderId]: undefined });
    } catch (error) {
      console.error("Error updating admin notes:", error);
      setToast({ message: "Failed to update admin notes", type: "error" });
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === "All") return true;
    return order.status === filter;
  });

  const getTotalAmount = (items) => {
    return items.reduce((total, item) => {
      const price = parseFloat(item.price.replace("₹", ""));
      return total + price * item.quantity;
    }, 0);
  };

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
      <div className="admin-store">
        <h1>Order Management</h1>
        <div className="filter-section">
          <button
            className={filter === "All" ? "active" : ""}
            onClick={() => setFilter("All")}
          >
            All Orders ({orders.length})
          </button>
          <button
            className={filter === "Approved" ? "active" : ""}
            onClick={() => setFilter("Approved")}
          >
            Approved ({orders.filter((o) => o.status === "Approved").length})
          </button>
          <button
            className={filter === "On the Way" ? "active" : ""}
            onClick={() => setFilter("On the Way")}
          >
            On the Way ({orders.filter((o) => o.status === "On the Way").length}
            )
          </button>
          <button
            className={filter === "Delivered" ? "active" : ""}
            onClick={() => setFilter("Delivered")}
          >
            Delivered ({orders.filter((o) => o.status === "Delivered").length})
          </button>
        </div>

        <div className="orders-container">
          {filteredOrders.length === 0 ? (
            <p className="no-orders">No orders found</p>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                className={`order-card ${order.status.toLowerCase()}`}
              >
                <div className="order-header">
                  <div>
                    <h3>Order #{order.id.slice(0, 8)}</h3>
                    <p className="customer-email">{order.userEmail}</p>
                  </div>
                  <span
                    className={`status-badge ${order.status.toLowerCase()}`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="order-items">
                  <h4>Items:</h4>
                  {order.items.map((item, index) => (
                    <div key={index} className="order-item">
                      <div className="item-info">
                        <span className="item-name">{item.name}</span>
                        <span className="item-quantity">x{item.quantity}</span>
                      </div>
                      <span className="item-price">{item.price}</span>
                    </div>
                  ))}
                </div>

                <div className="order-total">
                  <strong>
                    Total: ₹{getTotalAmount(order.items).toFixed(2)}
                  </strong>
                </div>

                <div className="order-details">
                  <p>
                    <strong>Ordered at:</strong>{" "}
                    {order.createdAt
                      ? new Date(order.createdAt.toDate()).toLocaleString()
                      : order.orderedAt
                        ? new Date(order.orderedAt.toDate()).toLocaleString()
                        : "N/A"}
                  </p>
                </div>

                <div className="order-actions">
                  <select
                    value={order.status}
                    onChange={(e) =>
                      handleUpdateStatus(order.id, e.target.value)
                    }
                    className="status-select"
                  >
                    <option value="Approved">Approved</option>
                    <option value="On the Way">On the Way</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>

                <div className="admin-notes-section">
                  <label htmlFor={`notes-${order.id}`}>
                    <strong>Admin Notes:</strong>
                  </label>
                  <textarea
                    id={`notes-${order.id}`}
                    value={
                      editingNotes[order.id] !== undefined
                        ? editingNotes[order.id]
                        : order.adminNotes || ""
                    }
                    onChange={(e) =>
                      setEditingNotes({
                        ...editingNotes,
                        [order.id]: e.target.value,
                      })
                    }
                    placeholder="Add notes for the customer..."
                    rows="2"
                    className="admin-notes-textarea"
                  />
                  <button
                    onClick={() => handleUpdateNotes(order.id)}
                    className="save-notes-btn"
                    disabled={editingNotes[order.id] === undefined}
                  >
                    Save Notes
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

export default AdminStore;

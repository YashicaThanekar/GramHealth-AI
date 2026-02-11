import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import { db, auth } from "./firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import "./MyOrders.css";

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      try {
        const ordersRef = collection(db, "orders");
        // Query without orderBy to avoid needing Firestore index
        const q = query(ordersRef, where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const ordersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Sort manually in JavaScript
        ordersData.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime - aTime;
        });
        setOrders(ordersData);
        setError(null);
      } catch (error) {
        console.error("Error fetching orders:", error);
        setError("Failed to load orders. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "status-approved";
      case "on the way":
        return "status-on-the-way";
      case "delivered":
        return "status-delivered";
      default:
        return "status-approved";
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <Navbar />
      <div className="my-orders-page">
        <div className="orders-container">
          <h2>My Orders</h2>
          {error && <div className="error-message">{error}</div>}
          {loading ? (
            <div className="loading-spinner">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="no-orders">
              <p>You haven't placed any orders yet.</p>
              <button
                onClick={() => navigate("/medicines")}
                className="browse-btn"
              >
                Browse Medicines
              </button>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map((order) => (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <div className="order-id">
                      <strong>Order ID:</strong> {order.id.slice(0, 8)}...
                    </div>
                    <div
                      className={`order-status ${getStatusClass(order.status)}`}
                    >
                      {order.status || "Pending"}
                    </div>
                  </div>
                  <div className="order-details">
                    <p className="order-date">
                      <strong>Placed on:</strong> {formatDate(order.createdAt)}
                    </p>
                    {order.items && order.items.length > 0 && (
                      <div className="order-items">
                        <strong>Items:</strong>
                        <ul>
                          {order.items.map((item, index) => (
                            <li key={index}>
                              {item.name} - ₹{item.price} x {item.quantity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="order-total">
                      <strong>Total Amount:</strong> ₹{order.totalAmount || 0}
                    </p>
                    {order.deliveryAddress && (
                      <p className="order-address">
                        <strong>Delivery Address:</strong>{" "}
                        {order.deliveryAddress}
                      </p>
                    )}
                    {order.adminNotes && (
                      <p className="admin-notes">
                        <strong>Admin Notes:</strong> {order.adminNotes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyOrders;

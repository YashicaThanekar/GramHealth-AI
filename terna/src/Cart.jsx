import React, { useState } from "react";
import Navbar from "./components/Navbar";
import Toast from "./components/Toast";
import { useCart } from "./CartContext";
import { Link } from "react-router-dom";
import { auth, db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import "./Cart.css";

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, clearCart, getCartTotal } =
    useCart();
  const [toast, setToast] = useState(null);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      setToast({ message: "Your cart is empty!", type: "error" });
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setToast({ message: "Please login to checkout!", type: "error" });
      return;
    }

    try {
      await addDoc(collection(db, "orders"), {
        userId: user.uid,
        userEmail: user.email,
        items: cartItems,
        totalAmount: getCartTotal() + 50,
        status: "Approved",
        createdAt: serverTimestamp(),
      });

      setToast({
        message: "Order placed successfully!",
        type: "success",
      });
      clearCart();
    } catch (error) {
      console.error("Error placing order:", error);
      setToast({
        message: "Failed to place order. Please try again.",
        type: "error",
      });
    }
  };

  const handleClearCart = () => {
    clearCart();
    setToast({ message: "Cart cleared successfully!", type: "success" });
  };

  const handleRemoveItem = (medicineName) => {
    setToast({
      message: `${medicineName} removed from cart!`,
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
      <div className="cart-page">
        <div className="cart-header">
          <h2>Shopping Cart</h2>
          {cartItems.length > 0 && (
            <button className="clear-cart-btn" onClick={handleClearCart}>
              Clear Cart
            </button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="empty-cart">
            <div className="empty-cart-icon">🛒</div>
            <h3>Your cart is empty</h3>
            <p>Browse our medicines and add items to your cart</p>
            <Link to="/medicines" className="browse-btn">
              Browse Medicines
            </Link>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-items">
              {cartItems.map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-info">
                    <h3>{item.name}</h3>
                    <p className="cart-item-category">{item.category}</p>
                    <p className="cart-item-manufacturer">
                      {item.manufacturer}
                    </p>
                  </div>
                  <div className="cart-item-actions">
                    <div className="quantity-controls">
                      <button
                        className="quantity-btn"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                      >
                        −
                      </button>
                      <span className="quantity">{item.quantity}</span>
                      <button
                        className="quantity-btn"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                    <div className="cart-item-price">
                      ₹{(parseFloat(item.price) * item.quantity).toFixed(2)}
                    </div>
                    <button
                      className="remove-btn"
                      onClick={() => {
                        removeFromCart(item.id);
                        handleRemoveItem(item.name);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <h3>Order Summary</h3>
              <div className="summary-row">
                <span>Subtotal ({cartItems.length} items):</span>
                <span>₹{getCartTotal().toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Delivery Fee:</span>
                <span>₹50.00</span>
              </div>
              <div className="summary-row total">
                <span>Total:</span>
                <span>₹{(getCartTotal() + 50).toFixed(2)}</span>
              </div>
              <button className="checkout-btn" onClick={handleCheckout}>
                Proceed to Checkout
              </button>
              <Link to="/medicines" className="continue-shopping">
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;

import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./LanguageContext.jsx";
import { CartProvider } from "./CartContext.jsx";
import "./index.css";

// ── Eagerly loaded (critical path – renders instantly) ──────────
import App from "./App.jsx";
import PageLoader from "./components/PageLoader.jsx";

// ── Lazy loaded (code-split per route) ──────────────────────────
const Login = lazy(() => import("./Login.jsx"));
const Signup = lazy(() => import("./Signup.jsx"));
const Admin = lazy(() => import("./Admin.jsx"));
const Doctor = lazy(() => import("./Doctor.jsx"));
const Medicine = lazy(() => import("./Medicine.jsx"));
const Cart = lazy(() => import("./Cart.jsx"));
const MyOrders = lazy(() => import("./MyOrders.jsx"));
const AskAI = lazy(() => import("./AskAI.jsx"));
const AddDoctor = lazy(() => import("./AddDoctor.jsx"));
const AddMedicine = lazy(() => import("./AddMedicine.jsx"));
const BookedAppointments = lazy(
  () => import("./components/BookedAppointments.jsx"),
);
const AdminAppointments = lazy(() => import("./pages/AdminAppointments.jsx"));
const AdminStore = lazy(() => import("./pages/AdminStore.jsx"));
const AdminRoute = lazy(() => import("./AdminRoute.jsx"));

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LanguageProvider>
      <CartProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <Admin />
                  </AdminRoute>
                }
              />
              <Route path="/doctors" element={<Doctor />} />
              <Route path="/medicines" element={<Medicine />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/my-orders" element={<MyOrders />} />
              <Route path="/my-appointments" element={<BookedAppointments />} />
              <Route
                path="/admin-appointments"
                element={
                  <AdminRoute>
                    <AdminAppointments />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin-store"
                element={
                  <AdminRoute>
                    <AdminStore />
                  </AdminRoute>
                }
              />
              <Route path="/ask-ai" element={<AskAI />} />
              <Route
                path="/add-doctor"
                element={
                  <AdminRoute>
                    <AddDoctor />
                  </AdminRoute>
                }
              />
              <Route
                path="/add-medicine"
                element={
                  <AdminRoute>
                    <AddMedicine />
                  </AdminRoute>
                }
              />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </CartProvider>
    </LanguageProvider>
  </StrictMode>,
);

// Register service worker for offline caching and better 3G performance
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Silently fail - service worker is optional
    });
  });
}

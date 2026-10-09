import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';
import AIChatbot from './components/common/AIChatbot';

// Pages - Public
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import NearbyShops from './pages/NearbyShops';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';

// Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Farmer
import FarmerDashboard from './pages/farmer/Dashboard';
import FarmerOrders from './pages/farmer/Orders';
import FarmerOrderDetail from './pages/farmer/OrderDetail';
import Cart from './pages/farmer/Cart';
import Checkout from './pages/farmer/Checkout';
import Wishlist from './pages/farmer/Wishlist';
import UPIPayment from './pages/farmer/UPIPayment';
import RazorpayPayment from './pages/farmer/RazorpayPayment';
import OrderSuccess from './pages/farmer/OrderSuccess';
import PaymentFailed from './pages/farmer/PaymentFailed';

// Seller
import SellerDashboard from './pages/seller/Dashboard';
import SellerProducts from './pages/seller/Products';
import ProductForm from './pages/seller/ProductForm';
import SellerOrders from './pages/seller/Orders';
import SellerOrderDetail from './pages/seller/OrderDetail';
import PaymentSettings from './pages/seller/PaymentSettings';
import ShopProfile from './pages/seller/ShopProfile';

// Admin
import AdminDashboard from './pages/admin/Dashboard';

// Delivery
import DeliveryDashboard from './pages/delivery/Dashboard';

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: '10px', fontSize: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
        }}
      />
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/nearby-shops" element={<NearbyShops />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Authenticated - Any role */}
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            {/* Farmer */}
            <Route path="/farmer/dashboard" element={<ProtectedRoute allowedRoles={['farmer']}><FarmerDashboard /></ProtectedRoute>} />
            <Route path="/farmer/orders" element={<ProtectedRoute allowedRoles={['farmer']}><FarmerOrders /></ProtectedRoute>} />
            <Route path="/farmer/orders/:id" element={<ProtectedRoute allowedRoles={['farmer']}><FarmerOrderDetail /></ProtectedRoute>} />
            <Route path="/farmer/cart" element={<ProtectedRoute allowedRoles={['farmer']}><Cart /></ProtectedRoute>} />
            <Route path="/farmer/checkout" element={<ProtectedRoute allowedRoles={['farmer']}><Checkout /></ProtectedRoute>} />
            <Route path="/farmer/wishlist" element={<ProtectedRoute allowedRoles={['farmer']}><Wishlist /></ProtectedRoute>} />
            <Route path="/farmer/payment/upi/:paymentId" element={<ProtectedRoute allowedRoles={['farmer']}><UPIPayment /></ProtectedRoute>} />
            <Route path="/farmer/payment/razorpay/:paymentId" element={<ProtectedRoute allowedRoles={['farmer']}><RazorpayPayment /></ProtectedRoute>} />
            <Route path="/farmer/order-success/:orderId" element={<ProtectedRoute allowedRoles={['farmer']}><OrderSuccess /></ProtectedRoute>} />
            <Route path="/farmer/payment-failed/:paymentId" element={<ProtectedRoute allowedRoles={['farmer']}><PaymentFailed /></ProtectedRoute>} />

            {/* Seller */}
            <Route path="/seller/dashboard" element={<ProtectedRoute allowedRoles={['seller']}><SellerDashboard /></ProtectedRoute>} />
            <Route path="/seller/products" element={<ProtectedRoute allowedRoles={['seller']}><SellerProducts /></ProtectedRoute>} />
            <Route path="/seller/products/add" element={<ProtectedRoute allowedRoles={['seller']}><ProductForm /></ProtectedRoute>} />
            <Route path="/seller/products/edit/:id" element={<ProtectedRoute allowedRoles={['seller']}><ProductForm /></ProtectedRoute>} />
            <Route path="/seller/orders" element={<ProtectedRoute allowedRoles={['seller']}><SellerOrders /></ProtectedRoute>} />
            <Route path="/seller/orders/:id" element={<ProtectedRoute allowedRoles={['seller']}><SellerOrderDetail /></ProtectedRoute>} />
            <Route path="/seller/payment-settings" element={<ProtectedRoute allowedRoles={['seller']}><PaymentSettings /></ProtectedRoute>} />
            <Route path="/seller/shop-profile" element={<ProtectedRoute allowedRoles={['seller']}><ShopProfile /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />

            {/* Delivery */}
            <Route path="/delivery/dashboard" element={<ProtectedRoute allowedRoles={['delivery']}><DeliveryDashboard /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>

      {/* AI Chatbot - visible on all pages */}
      <AIChatbot />
    </>
  );
}

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import Home from './pages/Home/Home';
import Shop from './pages/Shop/Shop';
import ProductDetail from './pages/ProductDetail/ProductDetail';
import About from './pages/About/About';
import Contact from './pages/Contact/Contact';
import Checkout from './pages/Checkout/Checkout';
import Policies from './pages/Policies/Policies';
import NotFound from './pages/NotFound';

// Admin pages
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminProducts from './pages/Admin/AdminProducts';
import AdminOrders from './pages/Admin/AdminOrders';

function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Routes>
          {/* Storefront Routes */}
          <Route element={<MainLayout />}>
            <Route path="/"              element={<Home />} />
            <Route path="/shop"          element={<Shop />} />
            <Route path="/collections"   element={<Shop />} />
            <Route path="/products/:id"  element={<ProductDetail />} />
            <Route path="/about"         element={<About />} />
            <Route path="/contact"       element={<Contact />} />
            <Route path="/checkout"      element={<Checkout />} />
            <Route path="/policies"        element={<Policies />} />
            <Route path="/return-policy"   element={<Policies />} />
            <Route path="/privacy-policy"  element={<Policies />} />
            <Route path="/shipping-policy" element={<Policies />} />
            <Route path="*"              element={<NotFound />} />
          </Route>

          {/* Luxury Admin Suite Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
          </Route>
        </Routes>
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home/Home';
import Shop from './pages/Shop/Shop';
import ProductDetail from './pages/ProductDetail/ProductDetail';
import About from './pages/About/About';
import Contact from './pages/Contact/Contact';
import Checkout from './pages/Checkout/Checkout';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/"              element={<Home />} />
            <Route path="/shop"          element={<Shop />} />
            <Route path="/collections"   element={<Shop />} />
            <Route path="/products/:id"  element={<ProductDetail />} />
            <Route path="/about"         element={<About />} />
            <Route path="/contact"       element={<Contact />} />
            <Route path="/checkout"      element={<Checkout />} />
            <Route path="*"              element={<NotFound />} />
          </Route>
        </Routes>
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;

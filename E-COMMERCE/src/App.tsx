import { useState, useEffect } from 'react';
import { supabase, type Product } from './lib/supabase';
import { useAuth } from './contexts/AuthContext';
import { useCart } from './contexts/CartContext';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import Cart from './components/Cart';
import AuthModal from './components/AuthModal';
import CheckoutModal from './components/CheckoutModal';

function App() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const handleAddToCart = async (product: Product) => {
    try {
      await addToCart(product);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleCheckout = () => {
    setCartOpen(false);
    setCheckoutModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onCartClick={() => setCartOpen(true)} onAuthClick={() => setAuthModalOpen(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Products</h2>
          <p className="text-gray-600">Discover our latest collection of premium tech products</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </main>

      <Cart isOpen={cartOpen} onClose={() => setCartOpen(false)} onCheckout={handleCheckout} />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <CheckoutModal isOpen={checkoutModalOpen} onClose={() => setCheckoutModalOpen(false)} />
    </div>
  );
}

export default App;

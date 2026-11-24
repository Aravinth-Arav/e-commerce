import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, type Product, type CartItem } from '../lib/supabase';
import { useAuth } from './AuthContext';

type LocalCartItem = {
  id: string;
  product_id: string;
  quantity: number;
  products: Product;
};

type CartContextType = {
  cartItems: (CartItem & { products: Product })[] | LocalCartItem[];
  loading: boolean;
  addToCart: (product: Product) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  cartTotal: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);
const LOCAL_CART_KEY = 'guest_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<(CartItem & { products: Product })[] | LocalCartItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadCart();
    } else {
      loadLocalCart();
    }
  }, [user]);

  const loadCart = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('cart_items')
      .select('*, products(*)')
      .eq('user_id', user.id);

    if (!error && data) {
      setCartItems(data as (CartItem & { products: Product })[]);
    }
    setLoading(false);
  };

  const loadLocalCart = () => {
    try {
      const stored = localStorage.getItem(LOCAL_CART_KEY);
      if (stored) {
        setCartItems(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading local cart:', err);
    }
  };

  const saveLocalCart = (items: LocalCartItem[]) => {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
  };

  const addToCart = async (product: Product) => {
    if (user) {
      const existingItem = (cartItems as any[]).find(item => item.product_id === product.id);

      if (existingItem) {
        await updateQuantity(existingItem.id, existingItem.quantity + 1);
      } else {
        const { error } = await supabase
          .from('cart_items')
          .insert({ user_id: user.id, product_id: product.id, quantity: 1 });

        if (error) throw error;
        await loadCart();
      }
    } else {
      const items = cartItems as LocalCartItem[];
      const existingItem = items.find(item => item.product_id === product.id);

      let updatedItems: LocalCartItem[];
      if (existingItem) {
        existingItem.quantity += 1;
        updatedItems = [...items];
      } else {
        const newItem: LocalCartItem = {
          id: `local_${Date.now()}`,
          product_id: product.id,
          quantity: 1,
          products: product,
        };
        updatedItems = [...items, newItem];
      }
      setCartItems(updatedItems);
      saveLocalCart(updatedItems);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(itemId);
      return;
    }

    if (user) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId);

      if (error) throw error;
      await loadCart();
    } else {
      const items = cartItems as LocalCartItem[];
      const item = items.find(i => i.id === itemId);
      if (item) {
        item.quantity = quantity;
        setCartItems([...items]);
        saveLocalCart(items);
      }
    }
  };

  const removeFromCart = async (itemId: string) => {
    if (user) {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      await loadCart();
    } else {
      const items = (cartItems as LocalCartItem[]).filter(i => i.id !== itemId);
      setCartItems(items);
      saveLocalCart(items);
    }
  };

  const clearCart = async () => {
    if (user) {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setCartItems([]);
    } else {
      setCartItems([]);
      localStorage.removeItem(LOCAL_CART_KEY);
    }
  };

  const cartTotal = cartItems.reduce(
    (total, item) => total + (item.products?.price || 0) * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        loading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

"use client";

import type React from 'react';
import { createContext, useState, useEffect, useMemo, useCallback, useContext } from 'react';
import type { Product, User, CartItem } from '@/lib/types';
import { mockUser as defaultMockUser } from '@/data/user';
import { initialProducts } from '@/data/products';
import { useRouter } from 'next/navigation';
import { toast } from "@/hooks/use-toast";


interface AppContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  products: Product[];
  getCartTotal: () => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products] = useState<Product[]>(initialProducts); // products are static for now
  const router = useRouter();

  useEffect(() => {
    // Check for saved auth state (e.g., from a previous session)
    const savedAuth = localStorage.getItem('dodiAuth');
    if (savedAuth) {
      const authData = JSON.parse(savedAuth);
      if (authData.isAuthenticated && authData.user) {
        setIsAuthenticated(true);
        setUser(authData.user);
      }
    }

    // Load cart from localStorage
    const storedCart = localStorage.getItem('dodiCart');
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, []);

  useEffect(() => {
    // Persist cart to localStorage
     localStorage.setItem('dodiCart', JSON.stringify(cart));
  }, [cart]);
  
  useEffect(() => {
    // Persist auth state to localStorage
    if (isAuthenticated && user) {
      localStorage.setItem('dodiAuth', JSON.stringify({ isAuthenticated, user }));
    } else {
      localStorage.removeItem('dodiAuth');
    }
  }, [isAuthenticated, user]);

  const login = useCallback(async (email: string, pass: string) => {
    if (email === defaultMockUser.email && pass === "password") { // Simple mock credentials
      setIsAuthenticated(true);
      setUser(defaultMockUser);
      toast({ title: "Login Successful", description: `Welcome back, ${defaultMockUser.name}!` });
      return true;
    }
    toast({ title: "Login Failed", description: "Invalid email or password.", variant: "destructive" });
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    setCart([]); 
    localStorage.removeItem('dodiCart');
    localStorage.removeItem('dodiAuth');
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push('/'); // Redirect to home or login page
  }, [router]);

  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) } // Respect stock
            : item
        );
      }
      return [...prevCart, { product, quantity: Math.min(quantity, product.stock) }];
    });
    toast({ title: "Item Added", description: `${product.name} added to cart.` });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prevCart) => prevCart.filter(item => item.product.id !== productId));
    toast({ title: "Item Removed", description: "Item removed from cart." });
  }, []);

  const updateCartQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prevCart) =>
      prevCart.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(0, Math.min(quantity, item.product.stock)) } // Min 0, respect stock
          : item
      ).filter(item => item.quantity > 0) // Remove if quantity becomes 0
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    toast({ title: "Cart Cleared", description: "Your cart has been emptied." });
  }, []);

  const getCartTotal = useCallback(() => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  }, [cart]);

  const contextValue = useMemo(() => ({
    isAuthenticated,
    user,
    login,
    logout,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    products,
    getCartTotal,
  }), [isAuthenticated, user, login, logout, cart, addToCart, removeFromCart, updateCartQuantity, clearCart, products, getCartTotal]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

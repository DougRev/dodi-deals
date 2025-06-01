
"use client";

import type React from 'react';
import { createContext, useState, useEffect, useMemo, useCallback, useContext } from 'react';
import type { Product, User, CartItem, Store, Deal } from '@/lib/types';
import { mockUser as defaultMockUser } from '@/data/user';
import { initialProducts as allInitialProducts } from '@/data/products';
import { initialStores } from '@/data/stores';
import { dailyDeals as allInitialDeals } from '@/data/deals';
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
  products: Product[]; // Filtered by selectedStore
  deals: Deal[]; // Filtered by selectedStore
  getCartTotal: () => number;
  stores: Store[];
  selectedStore: Store | null;
  selectStore: (storeId: string | null) => void;
  isStoreSelectorOpen: boolean;
  setStoreSelectorOpen: (isOpen: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DODI_AUTH_KEY = 'dodiAuth';
const DODI_CART_KEY_PREFIX = 'dodiCart_'; // Prefix for store-specific cart
const DODI_SELECTED_STORE_KEY = 'dodiSelectedStoreId';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [stores] = useState<Store[]>(initialStores);
  const [selectedStore, setSelectedStoreState] = useState<Store | null>(null);
  const [isStoreSelectorOpen, setStoreSelectorOpen] = useState(false);

  const router = useRouter();

  // Load initial state from localStorage
  useEffect(() => {
    const savedAuth = localStorage.getItem(DODI_AUTH_KEY);
    if (savedAuth) {
      const authData = JSON.parse(savedAuth);
      if (authData.isAuthenticated && authData.user) {
        setIsAuthenticated(true);
        setUser(authData.user);
      }
    }

    const savedStoreId = localStorage.getItem(DODI_SELECTED_STORE_KEY);
    if (savedStoreId) {
      const store = stores.find(s => s.id === savedStoreId);
      if (store) {
        setSelectedStoreState(store);
      } else {
        setStoreSelectorOpen(true); // Invalid store ID, prompt selection
      }
    } else {
      setStoreSelectorOpen(true); // No store selected, prompt selection
    }
  }, [stores]); // Added stores to dependency array

  // Load cart when selectedStore changes
  useEffect(() => {
    if (selectedStore) {
      const cartKey = `${DODI_CART_KEY_PREFIX}${selectedStore.id}`;
      const storedCart = localStorage.getItem(cartKey);
      if (storedCart) {
        setCart(JSON.parse(storedCart));
      } else {
        setCart([]); // Clear cart if no cart for this store
      }
      setStoreSelectorOpen(false); // Close dialog once store is set
    } else {
       setCart([]); // Clear cart if no store selected
    }
  }, [selectedStore]);

  // Persist cart to localStorage (store-specific)
  useEffect(() => {
    if (selectedStore) {
      const cartKey = `${DODI_CART_KEY_PREFIX}${selectedStore.id}`;
      localStorage.setItem(cartKey, JSON.stringify(cart));
    }
  }, [cart, selectedStore]);
  
  // Persist auth state
  useEffect(() => {
    if (isAuthenticated && user) {
      localStorage.setItem(DODI_AUTH_KEY, JSON.stringify({ isAuthenticated, user }));
    } else {
      localStorage.removeItem(DODI_AUTH_KEY);
    }
  }, [isAuthenticated, user]);

  const selectStore = useCallback((storeId: string | null) => {
    if (storeId) {
      const store = stores.find(s => s.id === storeId);
      if (store) {
        if (selectedStore?.id !== store.id) { // If store changes
          setCart([]); // Clear cart for the new store
          toast({ title: "Store Changed", description: `Switched to ${store.name}. Cart has been cleared.` });
        }
        setSelectedStoreState(store);
        localStorage.setItem(DODI_SELECTED_STORE_KEY, store.id);
        setStoreSelectorOpen(false);
      }
    } else { // Deselecting store (should ideally not happen after initial selection from UI)
      setSelectedStoreState(null);
      localStorage.removeItem(DODI_SELECTED_STORE_KEY);
      setCart([]);
      setStoreSelectorOpen(true); // Re-open selector if store is deselected
    }
  }, [stores, selectedStore]);

  const login = useCallback(async (email: string, pass: string) => {
    if (email === defaultMockUser.email && pass === "password") {
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
    // Cart is tied to selectedStore, so it persists unless store changes or user logs out from a different store context.
    // For simplicity, we clear the current store's cart on logout.
    // If a global cart was desired across stores (unlikely for physical pickup), this logic would differ.
    setCart([]); 
    if (selectedStore) {
        const cartKey = `${DODI_CART_KEY_PREFIX}${selectedStore.id}`;
        localStorage.removeItem(cartKey);
    }
    localStorage.removeItem(DODI_AUTH_KEY);
    // Don't remove selected store on logout, user might want to browse same store logged out
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push('/'); 
  }, [router, selectedStore]);

  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    if (!selectedStore) {
      toast({ title: "No Store Selected", description: "Please select a store before adding to cart.", variant: "destructive" });
      setStoreSelectorOpen(true);
      return;
    }
    if (product.storeId !== selectedStore.id) {
      toast({ title: "Wrong Store", description: "This product is not available at the selected store.", variant: "destructive" });
      return;
    }
    setCart((prevCart) => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) }
            : item
        );
      }
      return [...prevCart, { product, quantity: Math.min(quantity, product.stock) }];
    });
    toast({ title: "Item Added", description: `${product.name} added to cart.` });
  }, [selectedStore]);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prevCart) => prevCart.filter(item => item.product.id !== productId));
    toast({ title: "Item Removed", description: "Item removed from cart." });
  }, []);

  const updateCartQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prevCart) =>
      prevCart.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(0, Math.min(quantity, item.product.stock)) }
          : item
      ).filter(item => item.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    toast({ title: "Cart Cleared", description: "Your cart has been emptied." });
  }, []);

  const getCartTotal = useCallback(() => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  }, [cart]);

  const products = useMemo(() => {
    if (!selectedStore) return [];
    return allInitialProducts.filter(p => p.storeId === selectedStore.id);
  }, [selectedStore]);

  const deals = useMemo(() => {
    if (!selectedStore) return [];
    return allInitialDeals.filter(d => d.storeId === selectedStore.id);
  }, [selectedStore]);

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
    deals,
    getCartTotal,
    stores,
    selectedStore,
    selectStore,
    isStoreSelectorOpen,
    setStoreSelectorOpen,
  }), [
    isAuthenticated, user, login, logout, cart, addToCart, removeFromCart, 
    updateCartQuantity, clearCart, products, deals, getCartTotal, stores, 
    selectedStore, selectStore, isStoreSelectorOpen, setStoreSelectorOpen
  ]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

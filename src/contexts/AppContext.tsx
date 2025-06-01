
"use client";

import type React from 'react';
import { createContext, useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from "@/hooks/use-toast";
import { auth } from '@/lib/firebase'; // Import Firebase auth
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, type User as FirebaseUser } from 'firebase/auth';

import type { Product, User, CartItem, Store, Deal } from '@/lib/types';
// Remove mockUser import as Firebase will handle user state
// import { mockUser as defaultMockUser } from '@/data/user'; 
import { initialProducts as allInitialProducts } from '@/data/products';
import { initialStores } from '@/data/stores';
import { dailyDeals as allInitialDeals } from '@/data/deals';

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
  deals: Deal[];
  getCartTotal: () => number;
  stores: Store[];
  selectedStore: Store | null;
  selectStore: (storeId: string | null) => void;
  isStoreSelectorOpen: boolean;
  setStoreSelectorOpen: (isOpen: boolean) => void;
  loadingAuth: boolean; // To indicate auth state is being determined
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Removed DODI_AUTH_KEY as Firebase handles auth persistence
const DODI_CART_KEY_PREFIX = 'dodiCart_';
const DODI_SELECTED_STORE_KEY = 'dodiSelectedStoreId';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingAuth, setLoadingAuth] = useState(true); // Start loading auth state

  const [stores] = useState<Store[]>(initialStores);
  const [selectedStore, setSelectedStoreState] = useState<Store | null>(null);
  const [isStoreSelectorOpen, setStoreSelectorOpen] = useState(false);

  const router = useRouter();

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setIsAuthenticated(true);
        // Create a basic User object. Name and points would ideally come from Firestore.
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Dodi User', // Use email part or default
          points: 0, // Placeholder: Points would come from Firestore
        });
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
      setLoadingAuth(false); // Auth state determined
    });
    return () => unsubscribe(); // Cleanup subscription
  }, []);

  // Load selected store from localStorage
  useEffect(() => {
    const savedStoreId = localStorage.getItem(DODI_SELECTED_STORE_KEY);
    if (savedStoreId) {
      const store = stores.find(s => s.id === savedStoreId);
      if (store) {
        setSelectedStoreState(store);
      } else {
        setStoreSelectorOpen(true);
      }
    } else {
      setStoreSelectorOpen(true);
    }
  }, [stores]);

  // Load cart when selectedStore changes
  useEffect(() => {
    if (selectedStore) {
      const cartKey = `${DODI_CART_KEY_PREFIX}${selectedStore.id}`;
      const storedCart = localStorage.getItem(cartKey);
      if (storedCart) {
        setCart(JSON.parse(storedCart));
      } else {
        setCart([]);
      }
      setStoreSelectorOpen(false);
    } else {
       setCart([]);
    }
  }, [selectedStore]);

  // Persist cart to localStorage
  useEffect(() => {
    if (selectedStore) {
      const cartKey = `${DODI_CART_KEY_PREFIX}${selectedStore.id}`;
      localStorage.setItem(cartKey, JSON.stringify(cart));
    }
  }, [cart, selectedStore]);
  
  const selectStore = useCallback((storeId: string | null) => {
    if (storeId) {
      const store = stores.find(s => s.id === storeId);
      if (store) {
        if (selectedStore?.id !== store.id) {
          setCart([]);
          toast({ title: "Store Changed", description: `Switched to ${store.name}. Cart has been cleared.` });
        }
        setSelectedStoreState(store);
        localStorage.setItem(DODI_SELECTED_STORE_KEY, store.id);
        setStoreSelectorOpen(false);
      }
    } else {
      setSelectedStoreState(null);
      localStorage.removeItem(DODI_SELECTED_STORE_KEY);
      setCart([]);
      setStoreSelectorOpen(true);
    }
  }, [stores, selectedStore]);

  const login = useCallback(async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle setting user state
      toast({ title: "Login Successful", description: "Welcome back!" });
      return true;
    } catch (error: any) {
      console.error("Firebase login error:", error);
      toast({ title: "Login Failed", description: error.message || "Invalid email or password.", variant: "destructive" });
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle clearing user state
      // Cart clearing logic remains the same
      setCart([]); 
      if (selectedStore) {
          const cartKey = `${DODI_CART_KEY_PREFIX}${selectedStore.id}`;
          localStorage.removeItem(cartKey);
      }
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/'); 
    } catch (error: any) {
      console.error("Firebase logout error:", error);
      toast({ title: "Logout Failed", description: error.message || "Could not log out.", variant: "destructive" });
    }
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
    loadingAuth,
  }), [
    isAuthenticated, user, login, logout, cart, addToCart, removeFromCart, 
    updateCartQuantity, clearCart, products, deals, getCartTotal, stores, 
    selectedStore, selectStore, isStoreSelectorOpen, setStoreSelectorOpen, loadingAuth
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


"use client";

import type React from 'react';
import { createContext, useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from "@/hooks/use-toast";
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, type User as FirebaseUser, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot, getDocs } from 'firebase/firestore';

import type { Product, User, CartItem, Store, Deal } from '@/lib/types';
import { initialStores as initialStoresSeedData } from '@/data/stores';
import { dailyDeals as allInitialDealsSeed } from '@/data/deals';
import { seedInitialData } from '@/lib/firestoreService';


interface AppContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (email: string, pass: string, name?: string) => Promise<boolean>;
  logout: () => void;
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  products: Product[];
  allProducts: Product[];
  deals: Deal[];
  getCartTotal: () => number;
  stores: Store[];
  selectedStore: Store | null;
  selectStore: (storeId: string | null) => void;
  isStoreSelectorOpen: boolean;
  setStoreSelectorOpen: (isOpen: boolean) => void;
  loadingAuth: boolean;
  loadingStores: boolean;
  loadingProducts: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DODI_CART_KEY_PREFIX = 'dodiCart_';
const DODI_SELECTED_STORE_KEY = 'dodiSelectedStoreId';
const ADMIN_EMAIL = 'admin@test.com';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [stores, setStores] = useState<Store[]>(initialStoresSeedData); // Initialize with hardcoded seed data
  const [loadingStores, setLoadingStores] = useState(true);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [selectedStore, setSelectedStoreState] = useState<Store | null>(() => {
    if (typeof window === 'undefined') return null;
    const savedStoreId = localStorage.getItem(DODI_SELECTED_STORE_KEY);
    if (savedStoreId) {
      return initialStoresSeedData.find(s => s.id === savedStoreId) || null;
    }
    return null;
  });
  const [isStoreSelectorOpen, setStoreSelectorOpen] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const doSeed = async () => {
      if (db) { // Ensure db is initialized
        const storesColCheck = collection(db, 'stores');
        const productsColCheck = collection(db, 'products');
        const storesSnapshot = await getDocs(storesColCheck);
        const productsSnapshot = await getDocs(productsColCheck);
        if (storesSnapshot.empty || productsSnapshot.empty) {
          await seedInitialData();
        }
      }
    };
    doSeed();
  }, []);

  // Fetch stores from Firestore
  useEffect(() => {
    setLoadingStores(true);
    const storesCol = collection(db, 'stores');
    const unsubscribe = onSnapshot(storesCol, (snapshot) => {
      const firestoreStores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
      let storesToUse = initialStoresSeedData; // Fallback to seed data

      if (firestoreStores.length > 0) {
        storesToUse = firestoreStores; // Firestore is source of truth if available
        setStores(firestoreStores);
      } else if (snapshot.empty && !snapshot.metadata.hasPendingWrites) {
        // Firestore is confirmed empty, continue using initialStoresSeedData (already set in useState)
        setStores(initialStoresSeedData); // Explicitly set to seed data if FS is empty
      }
      // If firestoreStores is empty, `stores` state remains `initialStoresSeedData` or is reset to it.

      const savedStoreId = localStorage.getItem(DODI_SELECTED_STORE_KEY);
      let storeToSelect: Store | null = null;

      // Try to maintain current selection if valid, else try saved, else null
      if (selectedStore && storesToUse.some(s => s.id === selectedStore.id)) {
        storeToSelect = selectedStore;
      } else if (savedStoreId) {
        storeToSelect = storesToUse.find(s => s.id === savedStoreId) || null;
      }

      if (storeToSelect) {
        setSelectedStoreState(storeToSelect);
        if (storeToSelect.id !== localStorage.getItem(DODI_SELECTED_STORE_KEY)) {
             localStorage.setItem(DODI_SELECTED_STORE_KEY, storeToSelect.id);
        }
        setStoreSelectorOpen(false);
      } else if (storesToUse.length > 0) { // Stores available, but none selected/valid
        setSelectedStoreState(null);
        localStorage.removeItem(DODI_SELECTED_STORE_KEY);
        setStoreSelectorOpen(true);
      } else { // No stores available at all (neither FS nor seed)
        setStores([]); // Ensure stores state is empty if seed data was also empty
        setSelectedStoreState(null);
        localStorage.removeItem(DODI_SELECTED_STORE_KEY);
        setStoreSelectorOpen(true);
      }
      setLoadingStores(false);
    }, (error) => {
      console.error("Error fetching stores: ", error);
      toast({ title: "Error", description: "Could not load store information.", variant: "destructive" });
      // On error, `stores` state remains `initialStoresSeedData` (from useState).
      // Re-evaluate selectedStore based on `initialStoresSeedData`.
      const savedStoreId = localStorage.getItem(DODI_SELECTED_STORE_KEY);
      let storeToSelectOnError: Store | null = null;
       if (selectedStore && initialStoresSeedData.some(s => s.id === selectedStore.id)) {
          storeToSelectOnError = selectedStore;
      } else if (savedStoreId) {
          storeToSelectOnError = initialStoresSeedData.find(s => s.id === savedStoreId) || null;
      }

      if (storeToSelectOnError) {
          setSelectedStoreState(storeToSelectOnError);
          setStoreSelectorOpen(false);
      } else if (initialStoresSeedData.length > 0) {
          setSelectedStoreState(null);
          setStoreSelectorOpen(true);
      } else { // No fallback stores available
          setSelectedStoreState(null);
          setStoreSelectorOpen(true);
      }
      setLoadingStores(false);
    });
    return () => unsubscribe();
  }, []); // Runs once on mount


  // Fetch all products from Firestore
  useEffect(() => {
    setLoadingProducts(true);
    const productsCol = collection(db, 'products');
    const unsubscribe = onSnapshot(productsCol, (snapshot) => {
      const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setAllProducts(fetchedProducts);
      setLoadingProducts(false);
    }, (error) => {
      console.error("Error fetching products: ", error);
      toast({ title: "Error", description: "Could not load product information.", variant: "destructive" });
      setLoadingProducts(false);
    });
    return () => unsubscribe();
  }, []);


  const createUserProfile = async (firebaseUser: FirebaseUser, name?: string) => {
    const userRef = doc(db, "users", firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    const isInitialAdmin = firebaseUser.email === ADMIN_EMAIL;

    if (!userSnap.exists()) {
      const displayName = name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Dodi User';
      try {
        await setDoc(userRef, {
          email: firebaseUser.email,
          name: displayName,
          points: 0,
          isAdmin: isInitialAdmin, 
          createdAt: new Date().toISOString(),
        });
        if (name && firebaseUser.displayName !== name) {
            await updateProfile(firebaseUser, { displayName: name });
        }
        return {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: displayName,
          points: 0,
          avatarUrl: firebaseUser.photoURL || undefined,
          isAdmin: isInitialAdmin,
        };
      } catch (error) {
        console.error("Error creating user profile in Firestore: ", error);
        return null;
      }
    } else {
      const existingData = userSnap.data() as User; // Cast to User
      let userProfileData: User = { // Ensure type compatibility
          ...existingData, 
          id: firebaseUser.uid, 
          email: firebaseUser.email || existingData.email, // Prefer Firebase email
          name: firebaseUser.displayName || existingData.name, // Prefer Firebase display name
          avatarUrl: firebaseUser.photoURL || existingData.avatarUrl,
          isAdmin: existingData.isAdmin // Keep existing isAdmin unless logic below changes it
      };

      if (isInitialAdmin && !existingData.isAdmin) {
        try {
          await updateDoc(userRef, { isAdmin: true });
          userProfileData.isAdmin = true; 
        } catch (error) {
          console.error("Error updating admin status: ", error);
        }
      }
      return userProfileData;
    }
  };

  useEffect(() => {
    setLoadingAuth(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          const userProfile = await createUserProfile(firebaseUser, firebaseUser.displayName || undefined);
          if (userProfile) {
            setUser(userProfile);
            setIsAuthenticated(true);
          } else {
            setUser(null);
            setIsAuthenticated(false);
            await firebaseSignOut(auth); 
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Error during auth state change or profile handling:", error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoadingAuth(false);
      }
    });
    return () => unsubscribe();
  }, []);


  useEffect(() => {
    if (selectedStore) {
      const cartKey = `${DODI_CART_KEY_PREFIX}${selectedStore.id}`;
      const storedCart = localStorage.getItem(cartKey);
      if (storedCart) {
        try {
          setCart(JSON.parse(storedCart));
        } catch (e) {
          setCart([]);
          localStorage.removeItem(cartKey);
        }
      } else {
        setCart([]);
      }
    } else {
       setCart([]);
    }
  }, [selectedStore]);

  useEffect(() => {
    if (selectedStore && cart.length > 0) { 
      const cartKey = `${DODI_CART_KEY_PREFIX}${selectedStore.id}`;
      localStorage.setItem(cartKey, JSON.stringify(cart));
    } else if (selectedStore && cart.length === 0) { 
      const cartKey = `${DODI_CART_KEY_PREFIX}${selectedStore.id}`;
      localStorage.removeItem(cartKey);
    }
  }, [cart, selectedStore]);
  
  const selectStore = useCallback((storeId: string | null) => {
    if (storeId) {
      const store = stores.find(s => s.id === storeId); // `stores` could be initialSeedData or from Firestore
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
  }, [stores, selectedStore]); // `stores` dependency is important here

  const login = useCallback(async (email: string, pass: string) => {
    setLoadingAuth(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      toast({ title: "Login Successful", description: "Welcome back!" });
      return true;
    } catch (error: any) {
      console.error("Firebase login error:", error);
      toast({ title: "Login Failed", description: error.message || "Invalid email or password.", variant: "destructive" });
      return false; // setLoadingAuth(false) is handled by onAuthStateChanged or finally block of onAuthStateChanged
    } finally {
       // setLoadingAuth(false); // Let onAuthStateChanged handle this to avoid race conditions
    }
  }, []);

  const register = useCallback(async (email: string, pass: string, name?: string) => {
    setLoadingAuth(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      // createUserProfile will be called by onAuthStateChanged, which also sets displayName if name is provided
      // We can explicitly update the profile here if `name` is provided to ensure it's set before onAuthStateChanged might run with old data
      if (name) {
        await updateProfile(userCredential.user, { displayName: name });
      }
      toast({ title: "Registration Successful", description: "Welcome to Dodi Deals!" });
      return true;
    } catch (error: any) {
      console.error("Firebase registration error:", error);
      let errorMessage = "Could not create account. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password should be at least 6 characters.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({ title: "Registration Failed", description: errorMessage, variant: "destructive" });
      return false;
    } finally {
      // setLoadingAuth(false); // Let onAuthStateChanged handle this
    }
  }, []);

  const logout = useCallback(async () => {
    setLoadingAuth(true);
    try {
      await firebaseSignOut(auth);
      setCart([]); 
      if (selectedStore) {
          const cartKey = `${DODI_CART_KEY_PREFIX}${selectedStore.id}`;
          localStorage.removeItem(cartKey);
      }
      // No need to manually set selectedStore to null or open dialog on logout,
      // existing logic in store fetching useEffect should handle it based on available stores.
      // However, if we want to force re-selection:
      // setSelectedStoreState(null);
      // localStorage.removeItem(DODI_SELECTED_STORE_KEY);
      // setStoreSelectorOpen(true); 
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/'); 
    } catch (error: any) {
      console.error("Firebase logout error:", error);
      toast({ title: "Logout Failed", description: error.message || "Could not log out.", variant: "destructive" });
    } finally {
      // setLoadingAuth(false) handled by onAuthStateChanged
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
    if (!selectedStore || loadingProducts) return [];
    return allProducts.filter(p => p.storeId === selectedStore.id);
  }, [selectedStore, allProducts, loadingProducts]);

  const deals = useMemo(() => {
    if (!selectedStore || loadingProducts || allProducts.length === 0) return []; 
    return allInitialDealsSeed.filter(d => {
        const productExistsInStore = allProducts.some(p => p.id === d.product.id && p.storeId === selectedStore.id);
        return productExistsInStore && d.storeId === selectedStore.id; 
    });
  }, [selectedStore, allProducts, loadingProducts]);


  const contextValue = useMemo(() => ({
    isAuthenticated,
    user,
    login,
    register,
    logout,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    products,
    allProducts,
    deals,
    getCartTotal,
    stores, // This will be the initially hardcoded, then Firestore-updated list
    selectedStore,
    selectStore,
    isStoreSelectorOpen,
    setStoreSelectorOpen,
    loadingAuth,
    loadingStores,
    loadingProducts,
  }), [
    isAuthenticated, user, login, register, logout, cart, addToCart, removeFromCart, 
    updateCartQuantity, clearCart, products, allProducts, deals, getCartTotal, stores, 
    selectedStore, selectStore, isStoreSelectorOpen, setStoreSelectorOpen, 
    loadingAuth, loadingStores, loadingProducts
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

    
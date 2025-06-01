
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
  
  const [stores, setStores] = useState<Store[]>(initialStoresSeedData);
  const [loadingStores, setLoadingStores] = useState(true); 
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [selectedStore, setSelectedStoreState] = useState<Store | null>(null);
  const [isStoreSelectorOpen, setStoreSelectorOpen] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const doSeed = async () => {
      if (db) {
        const storesColCheck = collection(db, 'stores');
        const productsColCheck = collection(db, 'products');
        const storesSnapshot = await getDocs(storesColCheck);
        const productsSnapshot = await getDocs(productsColCheck);
        if (storesSnapshot.empty || productsSnapshot.empty) {
          console.log("Attempting to seed initial data as collections seem empty or partially empty...");
          await seedInitialData();
        } else {
          console.log("Stores and Products collections are not empty. Skipping seed.");
        }
      }
    };
    doSeed().catch(err => console.error("Error during initial data seed:", err));
  }, []);

  useEffect(() => {
    setLoadingStores(true); 
    const storesCol = collection(db, 'stores');
    const unsubscribe = onSnapshot(storesCol, (snapshot) => {
      let currentStoresList = initialStoresSeedData; 

      if (!snapshot.empty) {
        const firestoreStores = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Store));
        if (firestoreStores.length > 0) {
          currentStoresList = firestoreStores;
          setStores(firestoreStores); 
        }
      } else if (snapshot.empty && !snapshot.metadata.hasPendingWrites) {
        setStores(initialStoresSeedData);
      }
      
      if (typeof window !== 'undefined') { // Ensure localStorage is accessed only on client
        const savedStoreId = localStorage.getItem(DODI_SELECTED_STORE_KEY);
        let storeToSelectFinally: Store | null = null;

        if (savedStoreId) {
          storeToSelectFinally = currentStoresList.find(s => s.id === savedStoreId) || null;
        }
        
        setSelectedStoreState(storeToSelectFinally); 

        if (!storeToSelectFinally && currentStoresList.length > 0) {
          localStorage.removeItem(DODI_SELECTED_STORE_KEY);
          setStoreSelectorOpen(true); 
        } else if (!storeToSelectFinally && currentStoresList.length === 0) {
          setStores([]); 
          localStorage.removeItem(DODI_SELECTED_STORE_KEY);
          setStoreSelectorOpen(true); 
        } else if (storeToSelectFinally) {
          setStoreSelectorOpen(false);
        }
      }
      setLoadingStores(false); 
    }, (error) => {
      console.error("Error fetching stores: ", error);
      toast({ title: "Error", description: "Could not load store information.", variant: "destructive" });
      
      if (typeof window !== 'undefined') {
        const savedStoreId = localStorage.getItem(DODI_SELECTED_STORE_KEY);
        let storeToSelectOnError: Store | null = null;
        if (savedStoreId) {
            storeToSelectOnError = initialStoresSeedData.find(s => s.id === savedStoreId) || null;
        }
        setSelectedStoreState(storeToSelectOnError); 
      }
      setStores(initialStoresSeedData); 
      
      if (typeof window !== 'undefined' && !selectedStore && initialStoresSeedData.length > 0) {
          setStoreSelectorOpen(true);
      } else if (typeof window !== 'undefined' && selectedStore) {
          setStoreSelectorOpen(false);
      } else if (typeof window !== 'undefined') { 
          setStoreSelectorOpen(true);
      }
      setLoadingStores(false);
    });

    return () => unsubscribe();
  }, []); // Removed selectedStore from deps to avoid re-runs that might interfere with dialog


  useEffect(() => {
    setLoadingProducts(true);
    const productsCol = collection(db, 'products');
    const unsubscribe = onSnapshot(productsCol, (snapshot) => {
      const fetchedProducts = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Product));
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
    let userSnap;
    try {
        userSnap = await getDoc(userRef);
    } catch (error) {
        console.error(`Error fetching user profile for ${firebaseUser.uid}:`, error);
        toast({ title: "Profile Error", description: "Could not load user profile.", variant: "destructive" });
        return null;
    }

    const isTheAdminEmail = firebaseUser.email === ADMIN_EMAIL;
    let finalIsAdminValue = false;
    const displayName = name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Dodi User';

    if (!userSnap.exists()) {
      console.log(`[AuthContext] Creating new user profile for ${firebaseUser.email}. Email matches ADMIN_EMAIL: ${isTheAdminEmail}`);
      finalIsAdminValue = isTheAdminEmail;
      try {
        await setDoc(userRef, {
          email: firebaseUser.email,
          name: displayName,
          points: 0,
          isAdmin: finalIsAdminValue,
          createdAt: new Date().toISOString(),
        });
        console.log(`[AuthContext] New user profile CREATED for ${firebaseUser.email} with isAdmin: ${finalIsAdminValue}`);
        if (firebaseUser.displayName !== displayName) {
            await updateProfile(firebaseUser, { displayName: displayName });
        }
      } catch (error) {
        console.error(`[AuthContext] Error CREATING Firestore profile for ${firebaseUser.email}:`, error);
        toast({ title: "Profile Creation Failed", description: "Could not save user profile.", variant: "destructive" });
        return null; // Critical error, profile not saved
      }
    } else {
      const existingData = userSnap.data() as User;
      finalIsAdminValue = existingData.isAdmin || false; // Use existing value, default to false if undefined
      console.log(`[AuthContext] Existing user profile found for ${firebaseUser.email}. Current DB isAdmin: ${existingData.isAdmin}. Email matches ADMIN_EMAIL: ${isTheAdminEmail}`);

      if (isTheAdminEmail && !existingData.isAdmin) {
        console.warn(`[AuthContext] Admin email ${firebaseUser.email} logged in, but Firestore isAdmin is ${existingData.isAdmin}. Attempting to correct.`);
        try {
          await updateDoc(userRef, { isAdmin: true });
          finalIsAdminValue = true; // Update local value after successful DB update
          console.log(`[AuthContext] Successfully UPDATED isAdmin to true for ${firebaseUser.email} in Firestore.`);
        } catch (error: any) {
          console.error(`[AuthContext] CRITICAL: Failed to UPDATE isAdmin status for admin email ${firebaseUser.email}. Error: ${error.message}`);
          console.error("[AuthContext] This usually means security rules are preventing self-elevation of admin status OR a general Firestore error. The user will NOT have admin privileges from this session if update failed, local isAdmin will reflect DB state.");
          // Keep finalIsAdminValue reflecting the (failed to update) database state.
          finalIsAdminValue = existingData.isAdmin || false; // Re-affirm based on DB as update failed
          toast({ title: "Admin Status Update Failed", description: "Could not update admin status in the database.", variant: "destructive" });
        }
      }
       // Ensure local displayName is consistent with Firebase Auth profile if available
      if (firebaseUser.displayName && existingData.name !== firebaseUser.displayName) {
        try {
            await updateDoc(userRef, { name: firebaseUser.displayName });
             console.log(`[AuthContext] Updated Firestore name for ${firebaseUser.email} to match Auth profile.`);
        } catch (error) {
            console.error(`[AuthContext] Failed to update Firestore name for ${firebaseUser.email}:`, error);
        }
      }
    }
    
    const profileToReturn: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: displayName, // Use a consistent displayName
      points: userSnap.exists() ? (userSnap.data() as User).points : 0,
      avatarUrl: firebaseUser.photoURL || (userSnap.exists() ? (userSnap.data() as User).avatarUrl : undefined),
      isAdmin: finalIsAdminValue,
    };
    console.log(`[AuthContext] Final user profile data for ${firebaseUser.email}: `, profileToReturn);
    return profileToReturn;
  };


  useEffect(() => {
    setLoadingAuth(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          console.log("[AuthContext] onAuthStateChanged: User is LOGGED IN", firebaseUser.email);
          const userProfile = await createUserProfile(firebaseUser, firebaseUser.displayName || undefined);
          if (userProfile) {
            setUser(userProfile);
            setIsAuthenticated(true);
             console.log("[AuthContext] User profile processed. isAdmin:", userProfile.isAdmin);
          } else {
            console.warn("[AuthContext] onAuthStateChanged: User profile could not be created/fetched. Logging out.");
            setUser(null);
            setIsAuthenticated(false);
            await firebaseSignOut(auth); 
          }
        } else {
          console.log("[AuthContext] onAuthStateChanged: User is LOGGED OUT");
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("[AuthContext] Error during auth state change or profile handling:", error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoadingAuth(false);
         console.log("[AuthContext] onAuthStateChanged: loadingAuth set to false");
      }
    });
    return () => unsubscribe();
  }, []);


  useEffect(() => {
    if (typeof window !== 'undefined' && selectedStore) {
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
    } else if (typeof window !== 'undefined' && !selectedStore) {
       setCart([]);
    }
  }, [selectedStore]);

  useEffect(() => {
    if (typeof window !== 'undefined' && selectedStore && cart.length > 0) { 
      const cartKey = `${DODI_CART_KEY_PREFIX}${selectedStore.id}`;
      localStorage.setItem(cartKey, JSON.stringify(cart));
    } else if (typeof window !== 'undefined' && selectedStore && cart.length === 0) { 
      const cartKey = `${DODI_CART_KEY_PREFIX}${selectedStore.id}`;
      localStorage.removeItem(cartKey);
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
        if (typeof window !== 'undefined') localStorage.setItem(DODI_SELECTED_STORE_KEY, store.id);
        setStoreSelectorOpen(false);
      }
    } else {
      setSelectedStoreState(null);
      if (typeof window !== 'undefined') localStorage.removeItem(DODI_SELECTED_STORE_KEY);
      setCart([]);
      setStoreSelectorOpen(true);
    }
  }, [stores, selectedStore]); 

  const login = useCallback(async (email: string, pass: string) => {
    setLoadingAuth(true); // Keep this to manage login button state if needed
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      toast({ title: "Login Successful", description: "Welcome back!" });
      return true;
    } catch (error: any) {
      console.error("Firebase login error:", error);
      toast({ title: "Login Failed", description: error.message || "Invalid email or password.", variant: "destructive" });
      setLoadingAuth(false); // Explicitly set loading false on error for login page
      return false; 
    } 
    // setLoadingAuth(false) will be handled by onAuthStateChanged on success
  }, []);

  const register = useCallback(async (email: string, pass: string, name?: string) => {
    setLoadingAuth(true); // Keep this
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      // User profile creation (including isAdmin) is now handled by onAuthStateChanged calling createUserProfile
      if (name && userCredential.user.displayName !== name) { // Update Firebase Auth profile name if provided
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
      setLoadingAuth(false); // Explicitly set loading false on error for register page
      return false;
    }
     // setLoadingAuth(false) will be handled by onAuthStateChanged on success
  }, []);

  const logout = useCallback(async () => {
    // setLoadingAuth(true) will be handled by onAuthStateChanged
    try {
      await firebaseSignOut(auth);
      setCart([]); 
      if (typeof window !== 'undefined' && selectedStore) {
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
    stores, 
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

    
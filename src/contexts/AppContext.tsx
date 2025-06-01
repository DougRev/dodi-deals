
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
  const [loadingStores, setLoadingStores] = useState(true); // Start as true
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Initialize selectedStore to null for SSR compatibility.
  // It will be populated by the useEffect hook on the client.
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
          await seedInitialData();
        }
      }
    };
    doSeed();
  }, []);

  // Fetch stores from Firestore and determine initial selected store (client-side)
  useEffect(() => {
    setLoadingStores(true); // Ensure loading state is true when this effect starts
    const storesCol = collection(db, 'stores');
    const unsubscribe = onSnapshot(storesCol, (snapshot) => {
      let currentStoresList = initialStoresSeedData; // Start with seed as fallback

      if (!snapshot.empty) {
        const firestoreStores = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Store));
        if (firestoreStores.length > 0) {
          currentStoresList = firestoreStores;
          setStores(firestoreStores); // Update state with Firestore stores
        }
      } else if (snapshot.empty && !snapshot.metadata.hasPendingWrites) {
        // Firestore is confirmed empty, ensure stores state is the seed data
        setStores(initialStoresSeedData);
      }
      // If snapshot is empty but hasPendingWrites, it might be seeding, currentStoresList (seed data) will be used for now.

      // ---- Client-side only logic for selected store, AFTER stores list is determined ----
      const savedStoreId = localStorage.getItem(DODI_SELECTED_STORE_KEY);
      let storeToSelectFinally: Store | null = null;

      if (savedStoreId) {
        storeToSelectFinally = currentStoresList.find(s => s.id === savedStoreId) || null;
      }
      
      setSelectedStoreState(storeToSelectFinally); // Set selected store (could be null)

      if (!storeToSelectFinally && currentStoresList.length > 0) {
        localStorage.removeItem(DODI_SELECTED_STORE_KEY);
        setStoreSelectorOpen(true); // Prompt user to select
      } else if (!storeToSelectFinally && currentStoresList.length === 0) {
        setStores([]); 
        localStorage.removeItem(DODI_SELECTED_STORE_KEY);
        setStoreSelectorOpen(true); 
      } else if (storeToSelectFinally) {
        setStoreSelectorOpen(false);
      }
      // ---- End client-side only logic ----

      setLoadingStores(false); // Stores are loaded (or fallback determined)
    }, (error) => {
      console.error("Error fetching stores: ", error);
      toast({ title: "Error", description: "Could not load store information.", variant: "destructive" });
      
      // On error, attempt to use localStorage with initial seed data
      const savedStoreId = localStorage.getItem(DODI_SELECTED_STORE_KEY);
      let storeToSelectOnError: Store | null = null;
      if (savedStoreId) {
          storeToSelectOnError = initialStoresSeedData.find(s => s.id === savedStoreId) || null;
      }
      
      setSelectedStoreState(storeToSelectOnError); // May be null
      setStores(initialStoresSeedData); // Fallback to seed data for the stores list
      
      if (!storeToSelectOnError && initialStoresSeedData.length > 0) {
          setStoreSelectorOpen(true);
      } else if (storeToSelectOnError) {
          setStoreSelectorOpen(false);
      } else { 
          setStoreSelectorOpen(true);
      }
      setLoadingStores(false);
    });

    return () => unsubscribe();
  }, []);


  // Fetch all products from Firestore
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
      const existingData = userSnap.data() as User; 
      let userProfileData: User = { 
          ...existingData, 
          id: firebaseUser.uid, 
          email: firebaseUser.email || existingData.email, 
          name: firebaseUser.displayName || existingData.name, 
          avatarUrl: firebaseUser.photoURL || existingData.avatarUrl,
          isAdmin: existingData.isAdmin 
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
    setLoadingAuth(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      toast({ title: "Login Successful", description: "Welcome back!" });
      return true;
    } catch (error: any) {
      console.error("Firebase login error:", error);
      toast({ title: "Login Failed", description: error.message || "Invalid email or password.", variant: "destructive" });
      return false; 
    } finally {
       // setLoadingAuth(false); // Handled by onAuthStateChanged
    }
  }, []);

  const register = useCallback(async (email: string, pass: string, name?: string) => {
    setLoadingAuth(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
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
      // setLoadingAuth(false); // Handled by onAuthStateChanged
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


"use client";

import type React from 'react';
import { createContext, useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from "@/hooks/use-toast";
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, type User as FirebaseUser, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot, getDocs } from 'firebase/firestore';

import type { Product, User, CartItem, Store, Deal, ResolvedProduct, StoreAvailability, DayOfWeek, ProductCategory, CustomDealRule } from '@/lib/types';
import { daysOfWeek } from '@/lib/types'; // Import daysOfWeek
import { initialStores as initialStoresSeedData } from '@/data/stores';
// import { dailyDeals as allInitialDealsSeed } from '@/data/deals'; // No longer using static deals seed
import { seedInitialData } from '@/lib/firestoreService';


interface AppContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (email: string, pass: string, name?: string) => Promise<boolean>;
  logout: () => void;
  cart: CartItem[];
  addToCart: (product: ResolvedProduct, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  products: ResolvedProduct[];
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
      setLoadingStores(false); 
    }, (error) => {
      console.error("Error fetching stores: ", error);
      toast({ title: "Error", description: "Could not load store information.", variant: "destructive" });
      
      const savedStoreId = localStorage.getItem(DODI_SELECTED_STORE_KEY);
      let storeToSelectOnError: Store | null = null;
      if (savedStoreId) {
          storeToSelectOnError = initialStoresSeedData.find(s => s.id === savedStoreId) || null;
      }
      setSelectedStoreState(storeToSelectOnError); 
      setStores(initialStoresSeedData); 
      
      if (!selectedStore && initialStoresSeedData.length > 0) {
          setStoreSelectorOpen(true);
      } else if (selectedStore) {
          setStoreSelectorOpen(false);
      } else { 
          setStoreSelectorOpen(true);
      }
      setLoadingStores(false);
    });

    return () => unsubscribe();
  }, []);


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
        console.error(`[AuthContext] Error fetching user profile for ${firebaseUser.uid}:`, error);
        toast({ title: "Profile Error", description: "Could not load user profile.", variant: "destructive" });
        return null;
    }

    const isTheAdminEmail = firebaseUser.email === ADMIN_EMAIL;
    let finalIsAdminValue = false;
    const displayName = name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Dodi User';

    if (!userSnap.exists()) {
      finalIsAdminValue = isTheAdminEmail;
      try {
        await setDoc(userRef, {
          email: firebaseUser.email,
          name: displayName,
          points: 0,
          isAdmin: finalIsAdminValue,
          createdAt: new Date().toISOString(),
        });
        if (firebaseUser.displayName !== displayName) {
            await updateProfile(firebaseUser, { displayName: displayName });
        }
      } catch (error: any) {
        console.error(`[AuthContext] Error CREATING Firestore profile for ${firebaseUser.email}: ${error.message}`, error);
        toast({ title: "Profile Creation Failed", description: "Could not save user profile.", variant: "destructive" });
        finalIsAdminValue = false; 
      }
    } else {
      const existingData = userSnap.data() as User;
      finalIsAdminValue = existingData.isAdmin === true; 
      
      if (isTheAdminEmail && !finalIsAdminValue) {
        try {
          await updateDoc(userRef, { isAdmin: true });
          finalIsAdminValue = true; 
        } catch (error: any) {
          console.error(`[AuthContext] CRITICAL: Failed to UPDATE isAdmin status for admin email ${firebaseUser.email}. Error: ${error.message}.`);
          toast({ title: "Admin Status Update Failed", description: "Could not update admin status in the database. Manually verify Firestore data for this user.", variant: "destructive" });
        }
      }
      if (firebaseUser.displayName && existingData.name !== firebaseUser.displayName) {
        try {
            await updateDoc(userRef, { name: firebaseUser.displayName });
        } catch (error) {
            console.error(`[AuthContext] Failed to update Firestore name for ${firebaseUser.email}:`, error);
        }
      }
    }
    
    const profileToReturn: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: displayName,
      points: userSnap.exists() && userSnap.data().points !== undefined ? userSnap.data().points : 0,
      avatarUrl: firebaseUser.photoURL || (userSnap.exists() ? (userSnap.data() as User).avatarUrl : undefined),
      isAdmin: finalIsAdminValue,
    };
    return profileToReturn;
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
        console.error("[AuthContext] Error during auth state change or profile handling:", error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoadingAuth(false);
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } else if (!selectedStore) {
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
      setLoadingAuth(false); 
      return false; 
    } 
  }, []);

  const register = useCallback(async (email: string, pass: string, name?: string) => {
    setLoadingAuth(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      if (name && userCredential.user.displayName !== name) {
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
      setLoadingAuth(false);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
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
    } 
  }, [router, selectedStore]);

  const addToCart = useCallback((product: ResolvedProduct, quantity: number = 1) => {
    if (!selectedStore) {
      toast({ title: "No Store Selected", description: "Please select a store before adding to cart.", variant: "destructive" });
      setStoreSelectorOpen(true);
      return;
    }
    // The product passed to addToCart should already have its price set correctly (deal price or regular price).
    // The CartItem stores this resolved product directly.
    setCart((prevCart) => {
      const existingItem = prevCart.find(item => item.product.id === product.id && item.product.storeId === product.storeId);
      if (existingItem) {
        return prevCart.map(item =>
          (item.product.id === product.id && item.product.storeId === product.storeId)
            ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) } // Use stock from passed product
            : item
        );
      }
      return [...prevCart, { product, quantity: Math.min(quantity, product.stock) }]; // Use stock from passed product
    });
    toast({ title: "Item Added", description: `${product.name} added to cart.` });
  }, [selectedStore]);

  const removeFromCart = useCallback((originalProductId: string) => {
    setCart((prevCart) => prevCart.filter(item => item.product.id !== originalProductId));
    toast({ title: "Item Removed", description: "Item removed from cart." });
  }, []);

  const updateCartQuantity = useCallback((originalProductId: string, quantity: number) => {
    setCart((prevCart) =>
      prevCart.map(item =>
        item.product.id === originalProductId
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
    // Cart items store ResolvedProduct with the price it was added at (deal or regular)
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  }, [cart]);

  const products: ResolvedProduct[] = useMemo(() => {
    if (!selectedStore || loadingProducts || allProducts.length === 0) return [];
    
    const resolved: ResolvedProduct[] = [];
    allProducts.forEach(p => {
      if (!p.availability) return; // Guard against undefined availability
      const availabilityForStore = p.availability.find(avail => avail.storeId === selectedStore.id);
      if (availabilityForStore) {
        resolved.push({
          id: p.id,
          name: p.name,
          description: p.description,
          brand: p.brand,
          category: p.category,
          dataAiHint: p.dataAiHint,
          storeId: selectedStore.id,
          price: availabilityForStore.price,
          stock: availabilityForStore.stock,
          imageUrl: availabilityForStore.storeSpecificImageUrl || p.baseImageUrl,
        });
      }
    });
    return resolved;
  }, [selectedStore, allProducts, loadingProducts]);

  const deals: Deal[] = useMemo(() => {
    // Initial checks for necessary data
    if (!selectedStore || loadingProducts || products.length === 0) {
      return [];
    }
    // Explicitly check if dailyDeals is a valid array and not empty
    if (!selectedStore.dailyDeals || !Array.isArray(selectedStore.dailyDeals) || selectedStore.dailyDeals.length === 0) {
      return [];
    }
  
    const today = new Date();
    const currentDayOfWeek = daysOfWeek[today.getDay() === 0 ? 6 : today.getDay() - 1]; // Sunday is 0 -> 6 (Sunday), Monday is 1 -> 0 (Monday)
    
    let activeRule: CustomDealRule | undefined = undefined;
    
    // Find the first active rule for today
    for (const rule of selectedStore.dailyDeals) {
      // Ensure rule itself and its properties are valid before checking
      if (rule && Array.isArray(rule.selectedDays) && typeof rule.category === 'string' && typeof rule.discountPercentage === 'number') {
        if (rule.selectedDays.includes(currentDayOfWeek) && rule.discountPercentage > 0) {
          activeRule = rule;
          break; // Use the first matching rule
        }
      }
    }
  
    if (!activeRule) {
      return []; // No active custom deal rule for today
    }
  
    // Ensure activeRule has the category and discountPercentage
    const categoryOnDealToday = activeRule.category;
    const discountPercentageToday = activeRule.discountPercentage;

    if (!categoryOnDealToday || discountPercentageToday <= 0) {
        // This case should ideally be caught by the loop's conditions, but as a safeguard
        return [];
    }
  
    const generatedDeals: Deal[] = [];
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
  
    products.forEach(resolvedProduct => {
      if (resolvedProduct.category === categoryOnDealToday && resolvedProduct.stock > 0) {
        const originalPrice = resolvedProduct.price;
        const dealPrice = parseFloat((originalPrice * (1 - discountPercentageToday / 100)).toFixed(2));
  
        generatedDeals.push({
          // Use a combination of product id, day, and potentially rule category/discount for a more unique deal id
          // The original `activeRule.id` was a temporary UI key and is not saved.
          id: `${resolvedProduct.id}-deal-${currentDayOfWeek}-${categoryOnDealToday}-${discountPercentageToday}`, 
          product: resolvedProduct, 
          dealPrice: dealPrice,
          originalPrice: originalPrice,
          discountPercentage: discountPercentageToday,
          expiresAt: endOfToday.toISOString(),
          title: `${currentDayOfWeek}'s ${categoryOnDealToday} Deal!`,
          description: `${discountPercentageToday}% off all ${categoryOnDealToday} products today! Includes ${resolvedProduct.name}.`,
          storeId: selectedStore.id,
          categoryOnDeal: categoryOnDealToday,
        });
      }
    });
  
    return generatedDeals;
  }, [selectedStore, products, loadingProducts]);


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

    


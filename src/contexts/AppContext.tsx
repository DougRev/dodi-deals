
"use client";

import type React from 'react';
import { createContext, useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from "@/hooks/use-toast";
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, type User as FirebaseUser, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot, getDocs } from 'firebase/firestore';

import type { Product, User, CartItem, Store, Deal, ResolvedProduct, CustomDealRule, ProductCategory } from '@/lib/types';
import { daysOfWeek } from '@/lib/types';
import { initialStores as initialStoresSeedData } from '@/data/stores';
import { seedInitialData, updateUserAvatar as updateUserAvatarInFirestore, updateUserNameInFirestore } from '@/lib/firestoreService';


interface AppContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (email: string, pass: string, name?: string) => Promise<boolean>;
  logout: () => void;
  updateUserAvatar: (newAvatarUrl: string) => Promise<boolean>;
  updateUserProfileDetails: (newName: string) => Promise<boolean>;
  cart: CartItem[];
  addToCart: (product: ResolvedProduct, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  getCartItemQuantity: (productId: string) => number;
  getTotalCartItems: () => number;
  clearCart: () => void;
  products: ResolvedProduct[];
  allProducts: Product[];
  deals: Deal[];
  getCartTotal: () => number;
  getCartTotalSavings: () => number;
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

      const savedStoreId = typeof window !== 'undefined' ? localStorage.getItem(DODI_SELECTED_STORE_KEY) : null;
      let storeToSelectFinally: Store | null = null;

      if (savedStoreId) {
        storeToSelectFinally = currentStoresList.find(s => s.id === savedStoreId) || null;
      }

      const currentSelectedStoreIdBeforeUpdate = selectedStore ? selectedStore.id : null;

      if (storeToSelectFinally) {
        if (currentSelectedStoreIdBeforeUpdate !== storeToSelectFinally.id) {
          setSelectedStoreState(storeToSelectFinally);
        }
        setStoreSelectorOpen(false);
      } else {
        if (typeof window !== 'undefined') localStorage.removeItem(DODI_SELECTED_STORE_KEY);

        if (!currentSelectedStoreIdBeforeUpdate) {
          if (currentStoresList.length > 0) {
            setStoreSelectorOpen(true);
          } else {
            setStoreSelectorOpen(true);
          }
        }
      }
      setLoadingStores(false);
    }, (error) => {
      console.error("Error fetching stores: ", error);
      toast({ title: "Error", description: "Could not load store information.", variant: "destructive" });

      const savedStoreId = typeof window !== 'undefined' ? localStorage.getItem(DODI_SELECTED_STORE_KEY) : null;
      let storeToSelectOnError: Store | null = null;
      if (savedStoreId) {
          storeToSelectOnError = initialStoresSeedData.find(s => s.id === savedStoreId) || null;
      }
      setSelectedStoreState(storeToSelectOnError);
      setStores(initialStoresSeedData);

      const isAnyStoreSelectedAfterErrorHandling = !!(selectedStore || storeToSelectOnError);

      if (!isAnyStoreSelectedAfterErrorHandling && initialStoresSeedData.length > 0) {
          setStoreSelectorOpen(true);
      } else if (isAnyStoreSelectedAfterErrorHandling) {
          setStoreSelectorOpen(false);
      } else {
          setStoreSelectorOpen(true);
      }
      setLoadingStores(false);
    });

    return () => unsubscribe();
  }, [selectedStore]);


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
    const displayName = name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Dodi User';
    const determinedAvatarUrl = firebaseUser.photoURL || (userSnap.exists() ? (userSnap.data() as User).avatarUrl : undefined);

    const profileDataToSet: {
        email: string | null;
        name: string;
        points: number;
        isAdmin: boolean;
        createdAt: string;
        avatarUrl?: string; // Make avatarUrl optional here for type safety
      } = {
        email: firebaseUser.email,
        name: displayName,
        points: userSnap.exists() && userSnap.data().points !== undefined ? userSnap.data().points : 0,
        isAdmin: isTheAdminEmail || (userSnap.exists() ? (userSnap.data() as User).isAdmin === true : false),
        createdAt: userSnap.exists() ? (userSnap.data() as User).createdAt : new Date().toISOString(),
      };
      
    if (determinedAvatarUrl) {
        profileDataToSet.avatarUrl = determinedAvatarUrl;
    }


    if (!userSnap.exists()) {
      try {
        // For new users, only include avatarUrl if it's defined
        const dataToSetForNewUser: any = { ...profileDataToSet };
        if (dataToSetForNewUser.avatarUrl === undefined) {
          delete dataToSetForNewUser.avatarUrl; // Remove avatarUrl if undefined for setDoc
        }
        await setDoc(userRef, dataToSetForNewUser);

        if (firebaseUser.displayName !== displayName || (determinedAvatarUrl && firebaseUser.photoURL !== determinedAvatarUrl)) {
            await updateProfile(firebaseUser, { displayName: displayName, photoURL: determinedAvatarUrl });
        }
      } catch (error: any) {
        console.error(`[AuthContext] Error CREATING Firestore profile for ${firebaseUser.email}: ${error.message}`, error);
        toast({ title: "Profile Creation Failed", description: "Could not save user profile.", variant: "destructive" });
        profileDataToSet.isAdmin = false; // Ensure isAdmin is false if creation failed
      }
    } else {
      // Existing user: update logic
      const existingData = userSnap.data() as User;
      const updates: Partial<User> = {};
      if (isTheAdminEmail && !existingData.isAdmin) {
        updates.isAdmin = true;
      }
      if (displayName && existingData.name !== displayName) {
        updates.name = displayName;
      }
      if (determinedAvatarUrl && existingData.avatarUrl !== determinedAvatarUrl) {
         updates.avatarUrl = determinedAvatarUrl;
      } else if (!determinedAvatarUrl && existingData.avatarUrl) {
         updates.avatarUrl = undefined; // Explicitly set to undefined if clearing
      }

      if (Object.keys(updates).length > 0) {
        try {
            const dataToUpdateForExistingUser: any = { ...updates };
            // If avatarUrl is explicitly undefined in updates, it might be intended to remove it
            // However, Firestore update with undefined usually ignores the field.
            // For actual removal, admin.firestore.FieldValue.delete() would be used.
            // For simplicity here, we'll pass undefined, which means it won't be touched unless it's a new valid URL.
            if ('avatarUrl' in dataToUpdateForExistingUser && dataToUpdateForExistingUser.avatarUrl === undefined) {
                // If you want to remove the field, you'd do:
                // dataToUpdateForExistingUser.avatarUrl = admin.firestore.FieldValue.delete();
                // But that requires admin SDK context here, which we don't have client-side.
                // So, if avatarUrl is undefined, we might just not send it to updateDoc.
                // Or, for this case, let's assume if it's undefined in updates, we try to update the auth profile if needed,
                // and rely on previous logic to have updated the Firestore if it was a valid URL.
            }

            await updateDoc(userRef, dataToUpdateForExistingUser);
            if (updates.name && firebaseUser.displayName !== updates.name) await updateProfile(firebaseUser, { displayName: updates.name });
            if (updates.avatarUrl && firebaseUser.photoURL !== updates.avatarUrl) await updateProfile(firebaseUser, { photoURL: updates.avatarUrl });
        } catch (error: any) {
             console.error(`[AuthContext] Failed to update Firestore profile for ${firebaseUser.email}:`, error);
        }
      }
    }

    const profileToReturn: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: profileDataToSet.name,
      points: profileDataToSet.points,
      avatarUrl: profileDataToSet.avatarUrl, // This will be undefined if not set
      isAdmin: profileDataToSet.isAdmin,
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
            if (typeof window !== 'undefined') await firebaseSignOut(auth);
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
  }, []);


  useEffect(() => {
    if (selectedStore) {
      const cartKey = `${DODI_CART_KEY_PREFIX}${selectedStore.id}`;
      const storedCart = typeof window !== 'undefined' ? localStorage.getItem(cartKey) : null;
      if (storedCart) {
        try {
          setCart(JSON.parse(storedCart));
        } catch (e) {
          setCart([]);
          if (typeof window !== 'undefined') localStorage.removeItem(cartKey);
        }
      } else {
        setCart([]);
      }
    } else if (!selectedStore) {
       setCart([]);
    }
  }, [selectedStore]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedStore && cart.length > 0) {
        const cartKey = `${DODI_CART_KEY_PREFIX}${selectedStore.id}`;
        localStorage.setItem(cartKey, JSON.stringify(cart));
      } else if (selectedStore && cart.length === 0) {
        const cartKey = `${DODI_CART_KEY_PREFIX}${selectedStore.id}`;
        localStorage.removeItem(cartKey);
      }
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
  }, [stores, selectedStore, setCart, setSelectedStoreState, setStoreSelectorOpen]);

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
  }, [toast]);

  const register = useCallback(async (email: string, pass: string, name?: string) => {
    setLoadingAuth(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      if (name && userCredential.user.displayName !== name) {
        await updateProfile(userCredential.user, { displayName: name });
      }
      // createUserProfile will be called by onAuthStateChanged, no need to explicitly call here.
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
  }, [toast]);

  const updateUserAvatar = useCallback(async (newAvatarUrl: string) => {
    if (!auth.currentUser || !user) {
      toast({ title: "Not Authenticated", description: "You must be logged in to update your avatar.", variant: "destructive" });
      return false;
    }
    setLoadingAuth(true);
    try {
      await updateProfile(auth.currentUser, { photoURL: newAvatarUrl });
      await updateUserAvatarInFirestore(auth.currentUser.uid, newAvatarUrl);
      setUser(prevUser => prevUser ? { ...prevUser, avatarUrl: newAvatarUrl } : null);
      toast({ title: "Avatar Updated", description: "Your profile picture has been changed." });
      setLoadingAuth(false);
      return true;
    } catch (error: any) {
      console.error("Error updating avatar:", error);
      toast({ title: "Avatar Update Failed", description: error.message || "Could not update avatar.", variant: "destructive" });
      setLoadingAuth(false);
      return false;
    }
  }, [user, toast, setUser, setLoadingAuth]);

  const updateUserProfileDetails = useCallback(async (newName: string): Promise<boolean> => {
    if (!auth.currentUser || !user) {
      toast({ title: "Not Authenticated", description: "You must be logged in to update your profile.", variant: "destructive" });
      return false;
    }
    if (!newName || !newName.trim()) {
      toast({ title: "Invalid Name", description: "Name cannot be empty.", variant: "destructive" });
      return false;
    }

    setLoadingAuth(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, { displayName: newName });

      // Update Firestore profile using the server action
      await updateUserNameInFirestore(auth.currentUser.uid, newName);

      // Update local context state
      setUser(prevUser => prevUser ? { ...prevUser, name: newName } : null);

      toast({ title: "Profile Updated", description: "Your name has been successfully updated." });
      setLoadingAuth(false);
      return true;
    } catch (error: any) {
      console.error("Error updating profile details:", error);
      toast({ title: "Profile Update Failed", description: error.message || "Could not update your profile.", variant: "destructive" });
      setLoadingAuth(false);
      return false;
    }
  }, [user, toast, setUser, setLoadingAuth]);


  const logout = useCallback(async () => {
    setLoadingAuth(true);
    try {
      if (typeof window !== 'undefined') {
        await firebaseSignOut(auth);
        setUser(null);
        setIsAuthenticated(false);
        setCart([]);
        setSelectedStoreState(null);
        localStorage.removeItem(DODI_SELECTED_STORE_KEY);
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(DODI_CART_KEY_PREFIX)) {
            localStorage.removeItem(key);
          }
        });
        router.push('/');
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
      }
    } catch (error: any) {
      console.error("Firebase logout error:", error);
      if (typeof window !== 'undefined') {
        toast({ title: "Logout Failed", description: error.message || "Could not log out.", variant: "destructive" });
      }
    } finally {
        setLoadingAuth(false);
    }
  }, [router, toast, setCart, setSelectedStoreState, setUser, setIsAuthenticated, setLoadingAuth]);


  const addToCart = useCallback((product: ResolvedProduct, quantity: number = 1) => {
    if (!selectedStore) {
      toast({ title: "No Store Selected", description: "Please select a store before adding to cart.", variant: "destructive" });
      setStoreSelectorOpen(true);
      return;
    }
    setCart((prevCart) => {
      const existingItem = prevCart.find(item => item.product.id === product.id && item.product.storeId === product.storeId);
      if (existingItem) {
        return prevCart.map(item =>
          (item.product.id === product.id && item.product.storeId === product.storeId)
            ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) }
            : item
        );
      }
      return [...prevCart, { product, quantity: Math.min(quantity, product.stock) }];
    });
    toast({ title: "Item Added", description: `${product.name} added to cart.` });
  }, [selectedStore, toast, setCart, setStoreSelectorOpen]);

  const removeFromCart = useCallback((originalProductId: string) => {
    setCart((prevCart) => prevCart.filter(item => item.product.id !== originalProductId));
    toast({ title: "Item Removed", description: "Item removed from cart." });
  }, [toast, setCart]);

  const updateCartQuantity = useCallback((originalProductId: string, quantity: number) => {
    setCart((prevCart) =>
      prevCart.map(item =>
        item.product.id === originalProductId
          ? { ...item, quantity: Math.max(0, Math.min(quantity, item.product.stock)) }
          : item
      ).filter(item => item.quantity > 0)
    );
  }, [setCart]);

  const getCartItemQuantity = useCallback((productId: string): number => {
    if (!selectedStore) return 0;
    const item = cart.find(i => i.product.id === productId && i.product.storeId === selectedStore.id);
    return item ? item.quantity : 0;
  }, [cart, selectedStore]);

  const getTotalCartItems = useCallback(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  const clearCart = useCallback(() => {
    setCart([]);
    toast({ title: "Cart Cleared", description: "Your cart has been emptied." });
  }, [toast, setCart]);

  const getCartTotal = useCallback(() => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  }, [cart]);

  const getCartTotalSavings = useCallback(() => {
    return cart.reduce((totalSavings, item) => {
      if (item.product.originalPrice && item.product.originalPrice > item.product.price) {
        totalSavings += (item.product.originalPrice - item.product.price) * item.quantity;
      }
      return totalSavings;
    }, 0);
  }, [cart]);

  const products = useMemo(() => {
    if (!selectedStore || loadingProducts || allProducts.length === 0) return [];

    const today = new Date();
    const currentDayOfWeek = daysOfWeek[today.getDay() === 0 ? 6 : today.getDay() - 1];
    let activeRule: CustomDealRule | undefined = undefined;
    if (selectedStore.dailyDeals && selectedStore.dailyDeals.length > 0) {
        for (const rule of selectedStore.dailyDeals) {
            if (rule && Array.isArray(rule.selectedDays) && rule.selectedDays.includes(currentDayOfWeek) &&
                typeof rule.category === 'string' && typeof rule.discountPercentage === 'number' && rule.discountPercentage > 0) {
                activeRule = rule;
                break;
            }
        }
    }

    const resolved: ResolvedProduct[] = [];
    allProducts.forEach(p => {
      if (!p.availability) return;
      const availabilityForStore = p.availability.find(avail => avail.storeId === selectedStore.id);
      if (availabilityForStore) {
        let currentImageUrl = p.baseImageUrl;
        if (availabilityForStore.storeSpecificImageUrl && availabilityForStore.storeSpecificImageUrl.trim() !== '') {
          currentImageUrl = availabilityForStore.storeSpecificImageUrl;
        } else if (p.baseImageUrl && p.baseImageUrl.trim() !== '' && !p.baseImageUrl.startsWith('https://placehold.co')) {
          currentImageUrl = p.baseImageUrl;
        } else {
          const categoryPath = p.category && typeof p.category === 'string' ? p.category.toLowerCase().replace(/\s+/g, '-') : 'default';
          currentImageUrl = `/images/categories/${categoryPath}.png`;
        }

        let effectivePrice = availabilityForStore.price;
        let originalPriceValue = availabilityForStore.price;
        let isProductOnDeal = false;

        if (activeRule && p.category === activeRule.category) {
          isProductOnDeal = true;
          effectivePrice = parseFloat((originalPriceValue * (1 - activeRule.discountPercentage / 100)).toFixed(2));
        }

        resolved.push({
          id: p.id,
          name: p.name,
          description: p.description,
          brand: p.brand,
          category: p.category,
          dataAiHint: p.dataAiHint,
          isFeatured: p.isFeatured || false, // Carry over isFeatured
          storeId: selectedStore.id,
          price: effectivePrice,
          originalPrice: isProductOnDeal ? originalPriceValue : undefined, // Set originalPrice only if on deal
          stock: availabilityForStore.stock,
          imageUrl: currentImageUrl,
        });
      }
    });
    return resolved;
  }, [selectedStore, allProducts, loadingProducts]);


  const deals: Deal[] = useMemo(() => {
    if (!selectedStore || loadingProducts || products.length === 0 || !selectedStore.dailyDeals || selectedStore.dailyDeals.length === 0) {
      return [];
    }

    const today = new Date();
    const currentDayOfWeek = daysOfWeek[today.getDay() === 0 ? 6 : today.getDay() - 1];
    let activeRule: CustomDealRule | undefined = undefined;

    for (const rule of selectedStore.dailyDeals) {
      if (rule && Array.isArray(rule.selectedDays) && rule.selectedDays.includes(currentDayOfWeek) &&
          typeof rule.category === 'string' && typeof rule.discountPercentage === 'number' && rule.discountPercentage > 0) {
        activeRule = rule;
        break;
      }
    }

    if (!activeRule) {
      return [];
    }

    const categoryOnDealToday = activeRule.category as ProductCategory;
    const discountPercentageToday = activeRule.discountPercentage;
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    // Filter from the already resolved 'products' list which now contain deal pricing.
    return products
      .filter(p => p.category === categoryOnDealToday && p.originalPrice && p.price < p.originalPrice && p.stock > 0)
      .map(dealProduct => ({
        id: `${dealProduct.id}-deal-${currentDayOfWeek}-${categoryOnDealToday}-${discountPercentageToday}`,
        product: dealProduct, // This product already has deal price in .price and original in .originalPrice
        discountPercentage: discountPercentageToday,
        expiresAt: endOfToday.toISOString(),
        title: `${currentDayOfWeek}'s ${categoryOnDealToday} Deal!`,
        description: `${discountPercentageToday}% off all ${categoryOnDealToday} products today! Includes ${dealProduct.name}.`,
        storeId: selectedStore.id,
        categoryOnDeal: categoryOnDealToday,
      }));
  }, [selectedStore, products, loadingProducts]);


  const contextValue = useMemo(() => ({
    isAuthenticated,
    user,
    login,
    register,
    logout,
    updateUserAvatar,
    updateUserProfileDetails,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    getCartItemQuantity,
    getTotalCartItems,
    clearCart,
    products,
    allProducts,
    deals,
    getCartTotal,
    getCartTotalSavings,
    stores,
    selectedStore,
    selectStore,
    isStoreSelectorOpen,
    setStoreSelectorOpen,
    loadingAuth,
    loadingStores,
    loadingProducts,
  }), [
    isAuthenticated, user, login, register, logout, updateUserAvatar, updateUserProfileDetails, cart, addToCart, removeFromCart,
    updateCartQuantity, getCartItemQuantity, getTotalCartItems, clearCart, products, allProducts, deals, getCartTotal, getCartTotalSavings, stores,
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


"use client";

import type React from 'react';
import { createContext, useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from "@/hooks/use-toast";
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, type User as FirebaseUser, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot, getDocs } from 'firebase/firestore';

import type { Product, User, CartItem, Store, Deal, ResolvedProduct, CustomDealRule, ProductCategory, RedemptionOption, Order, OrderItem, OrderStatus, StoreRole, FlowerWeight } from '@/lib/types';
import { daysOfWeek, REDEMPTION_OPTIONS, flowerWeights as allFlowerWeightsConst } from '@/lib/types'; // Renamed import for clarity
import { initialStores as initialStoresSeedData } from '@/data/stores';
// Removed unused import: import { initialProducts as initialProductsSeedData } from '@/data/products';
import { seedInitialData, updateUserAvatar as updateUserAvatarInFirestore, updateUserNameInFirestore, createOrderInFirestore, getUserOrders, updateOrderStatus as updateOrderStatusInFirestore } from '@/lib/firestoreService';


interface AppContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (email: string, pass: string, name?: string) => Promise<boolean>;
  logout: () => void;
  updateUserAvatar: (newAvatarUrl: string) => Promise<boolean>;
  updateUserProfileDetails: (newName: string) => Promise<boolean>;
  cart: CartItem[];
  addToCart: (product: ResolvedProduct, quantity?: number, selectedWeight?: FlowerWeight) => void;
  removeFromCart: (productId: string, selectedWeight?: FlowerWeight) => void;
  updateCartQuantity: (productId: string, quantity: number, selectedWeight?: FlowerWeight) => void;
  getCartItemQuantity: (productId: string, selectedWeight?: FlowerWeight) => number;
  getTotalCartItems: () => number;
  clearCart: () => void;
  products: ResolvedProduct[];
  allProducts: Product[];
  deals: Deal[];
  getCartSubtotal: () => number; // Renamed from getCartTotal to avoid confusion with final total
  getCartTotal: () => number; // This will be the final total after discounts
  getCartTotalSavings: () => number;
  getPotentialPointsForCart: () => number;
  stores: Store[];
  selectedStore: Store | null;
  selectStore: (storeId: string | null) => void;
  isStoreSelectorOpen: boolean;
  setStoreSelectorOpen: (isOpen: boolean) => void;
  loadingAuth: boolean;
  loadingStores: boolean;
  loadingProducts: boolean;
  redemptionOptions: RedemptionOption[];
  appliedRedemption: RedemptionOption | null;
  applyRedemption: (option: RedemptionOption) => void;
  removeRedemption: () => void;
  finalizeOrder: () => Promise<void>;
  userOrders: Order[];
  loadingUserOrders: boolean;
  fetchUserOrders: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DODI_CART_KEY_PREFIX = 'dodiCart_';
const DODI_SELECTED_STORE_KEY = 'dodiSelectedStoreId';
const ADMIN_EMAIL = 'admin@test.com';
const MINIMUM_PURCHASE_AMOUNT = 15;


export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [stores, setStores] = useState<Store[]>(initialStoresSeedData);
  const [loadingStores, setLoadingStores] = useState(true);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [_selectedStore, _setSelectedStoreState] = useState<Store | null>(null); // Internal state for selectedStore
  const [isStoreSelectorOpen, setStoreSelectorOpen] = useState(false);

  const [appliedRedemption, setAppliedRedemption] = useState<RedemptionOption | null>(null);

  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loadingUserOrders, setLoadingUserOrders] = useState<boolean>(true); 

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
      let currentStoresListFromSnapshot = initialStoresSeedData;

      if (!snapshot.empty) {
        const firestoreStores = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Store));
        if (firestoreStores.length > 0) {
          currentStoresListFromSnapshot = firestoreStores;
        }
      }
      setStores(currentStoresListFromSnapshot);

      const savedStoreId = typeof window !== 'undefined' ? localStorage.getItem(DODI_SELECTED_STORE_KEY) : null;
      let storeToSelectInitially: Store | null = null;

      if (savedStoreId) {
        storeToSelectInitially = currentStoresListFromSnapshot.find(s => s.id === savedStoreId) || null;
      }
      
      if (_selectedStore) {
        const currentSelectedStoreStillValid = currentStoresListFromSnapshot.some(s => s.id === _selectedStore.id);
        if (!currentSelectedStoreStillValid) {
          _setSelectedStoreState(null); 
          if (typeof window !== 'undefined') localStorage.removeItem(DODI_SELECTED_STORE_KEY);
           if (currentStoresListFromSnapshot.length > 0) setStoreSelectorOpen(true);
        }
      } else if (storeToSelectInitially) {
         _setSelectedStoreState(storeToSelectInitially);
         setStoreSelectorOpen(false);
      } else {
        if (typeof window !== 'undefined') localStorage.removeItem(DODI_SELECTED_STORE_KEY);
        if (currentStoresListFromSnapshot.length > 0) {
          setStoreSelectorOpen(true); 
        }
      }

      setLoadingStores(false);
    }, (error) => {
      console.error("Error fetching stores: ", error);
      toast({ title: "Error", description: "Could not load store information.", variant: "destructive" });

      setStores(initialStoresSeedData); 
      const savedStoreIdOnError = typeof window !== 'undefined' ? localStorage.getItem(DODI_SELECTED_STORE_KEY) : null;
      let storeToSelectOnError: Store | null = null;
      if (savedStoreIdOnError) {
          storeToSelectOnError = initialStoresSeedData.find(s => s.id === savedStoreIdOnError) || null;
      }
      _setSelectedStoreState(storeToSelectOnError);

      if (!storeToSelectOnError && initialStoresSeedData.length > 0) {
          setStoreSelectorOpen(true);
      } else if (storeToSelectOnError) {
          setStoreSelectorOpen(false);
      }
      setLoadingStores(false);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const fetchUserOrders = useCallback(async () => {
    if (!user || !isAuthenticated) {
      setUserOrders([]);
      setLoadingUserOrders(false);
      return;
    }
  
    setLoadingUserOrders(true);
    try {
      const orders = await getUserOrders(user.id);
      setUserOrders(orders);
    } catch (error) {
      console.error("Error fetching user orders:", error);
      toast({ title: "Error", description: "Could not load your order history.", variant: "destructive" });
      setUserOrders([]);
    } finally {
      setLoadingUserOrders(false);
    }
  }, [user, isAuthenticated]);


  useEffect(() => {
    const currentUserId = user?.id;
    if (isAuthenticated && currentUserId) {
      fetchUserOrders();
    } else {
      setUserOrders([]);
      setLoadingUserOrders(false); 
    }
  }, [isAuthenticated, user?.id, fetchUserOrders]);


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
    const existingData = userSnap.exists() ? userSnap.data() as User : null;

    const determinedAssignedStoreId = existingData?.assignedStoreId || null;
    const determinedStoreRole = existingData?.storeRole || null;

    const profileDataToSet: {
        email: string | null;
        name: string;
        points: number;
        isAdmin: boolean;
        createdAt: string;
        avatarUrl?: string;
        assignedStoreId?: string | null;
        storeRole?: StoreRole | null;
        noShowStrikes: number;
        isBanned: boolean;
      } = {
        email: firebaseUser.email,
        name: displayName,
        points: existingData?.points ?? 0,
        isAdmin: isTheAdminEmail || (existingData?.isAdmin === true),
        createdAt: existingData?.createdAt || new Date().toISOString(),
        assignedStoreId: determinedAssignedStoreId,
        storeRole: (isTheAdminEmail || (existingData?.isAdmin === true)) ? null : determinedStoreRole,
        noShowStrikes: existingData?.noShowStrikes ?? 0,
        isBanned: existingData?.isBanned ?? false,
      };

    if (determinedAvatarUrl) {
        profileDataToSet.avatarUrl = determinedAvatarUrl;
    }
    if (profileDataToSet.isAdmin) {
        profileDataToSet.assignedStoreId = null;
        profileDataToSet.storeRole = null;
    }


    if (!userSnap.exists()) {
      try {
        const dataToSetForNewUser: any = { ...profileDataToSet };
        if (dataToSetForNewUser.avatarUrl === undefined) delete dataToSetForNewUser.avatarUrl;
        if (!dataToSetForNewUser.isAdmin) {
            dataToSetForNewUser.assignedStoreId = dataToSetForNewUser.assignedStoreId || null;
            dataToSetForNewUser.storeRole = dataToSetForNewUser.storeRole || null;
        }

        await setDoc(userRef, dataToSetForNewUser);

        if (firebaseUser.displayName !== displayName || (determinedAvatarUrl && firebaseUser.photoURL !== determinedAvatarUrl)) {
            await updateProfile(firebaseUser, { displayName: displayName, photoURL: determinedAvatarUrl });
        }
      } catch (error: any) {
        console.error(`[AuthContext] Error CREATING Firestore profile for ${firebaseUser.email}: ${error.message}`, error);
        toast({ title: "Profile Creation Failed", description: "Could not save user profile.", variant: "destructive" });
        profileDataToSet.isAdmin = false;
        profileDataToSet.assignedStoreId = null;
        profileDataToSet.storeRole = null;
      }
    } else {
      const updates: Partial<User> = {};
      if (isTheAdminEmail && !existingData?.isAdmin) {
        updates.isAdmin = true;
        updates.assignedStoreId = null;
        updates.storeRole = null;
      }
      if (displayName && existingData?.name !== displayName) {
        updates.name = displayName;
      }
      if (determinedAvatarUrl && existingData?.avatarUrl !== determinedAvatarUrl) {
         updates.avatarUrl = determinedAvatarUrl;
      } else if (!determinedAvatarUrl && existingData?.avatarUrl) {
         updates.avatarUrl = undefined;
      }
      if (existingData.noShowStrikes === undefined) updates.noShowStrikes = 0;
      if (existingData.isBanned === undefined) updates.isBanned = false;


      if (Object.keys(updates).length > 0) {
        try {
            await updateDoc(userRef, updates);
            if (updates.name && firebaseUser.displayName !== updates.name) await updateProfile(firebaseUser, { displayName: updates.name });
            if (updates.avatarUrl && firebaseUser.photoURL !== updates.avatarUrl) await updateProfile(firebaseUser, { photoURL: updates.avatarUrl });
        } catch (error: any) {
             console.error(`[AuthContext] Failed to update Firestore profile for ${firebaseUser.email}:`, error);
        }
      }
        if (profileDataToSet.isAdmin) {
            profileDataToSet.assignedStoreId = null;
            profileDataToSet.storeRole = null;
        } else {
            profileDataToSet.assignedStoreId = existingData?.assignedStoreId || null;
            profileDataToSet.storeRole = existingData?.storeRole || null;
        }
    }

    const profileToReturn: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: profileDataToSet.name,
      points: profileDataToSet.points,
      avatarUrl: profileDataToSet.avatarUrl,
      isAdmin: profileDataToSet.isAdmin,
      assignedStoreId: profileDataToSet.assignedStoreId,
      storeRole: profileDataToSet.storeRole,
      noShowStrikes: profileDataToSet.noShowStrikes,
      isBanned: profileDataToSet.isBanned,
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
            if (userProfile.isBanned) {
              toast({ title: "Account Suspended", description: "This account has been suspended due to repeated no-shows.", variant: "destructive", duration: Infinity });
              await firebaseSignOut(auth); // Log them out immediately if banned
            }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (_selectedStore) {
      const cartKey = `${DODI_CART_KEY_PREFIX}${_selectedStore.id}`;
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
      setAppliedRedemption(null);
    } else if (!_selectedStore) {
       setCart([]);
       setAppliedRedemption(null);
    }
  }, [_selectedStore]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (_selectedStore && cart.length > 0) {
        const cartKey = `${DODI_CART_KEY_PREFIX}${_selectedStore.id}`;
        localStorage.setItem(cartKey, JSON.stringify(cart));
      } else if (_selectedStore && cart.length === 0) {
        const cartKey = `${DODI_CART_KEY_PREFIX}${_selectedStore.id}`;
        localStorage.removeItem(cartKey);
      }
    }
  }, [cart, _selectedStore]);

  const selectStore = useCallback((storeId: string | null) => {
    if (storeId) {
      const store = stores.find(s => s.id === storeId);
      if (store) {
        if (_selectedStore?.id !== store.id) {
          setCart([]);
          setAppliedRedemption(null);
          toast({ title: "Store Changed", description: `Switched to ${store.name}. Cart has been cleared.` });
        }
        _setSelectedStoreState(store);
        if (typeof window !== 'undefined') localStorage.setItem(DODI_SELECTED_STORE_KEY, store.id);
        setStoreSelectorOpen(false);
      }
    } else {
      _setSelectedStoreState(null);
      if (typeof window !== 'undefined') localStorage.removeItem(DODI_SELECTED_STORE_KEY);
      setCart([]);
      setAppliedRedemption(null);
      setStoreSelectorOpen(true);
    }
  }, [stores, _selectedStore]);

  const login = useCallback(async (email: string, pass: string) => {
    setLoadingAuth(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      // Profile check (including isBanned) is now handled by onAuthStateChanged
      // No need to explicitly call createUserProfile here after signIn.
      // If createUserProfile inside onAuthStateChanged detects banned, it will toast and sign out.
      if (userCredential.user) {
        // onAuthStateChanged will update the user state and isAuthenticated.
        // We can check the temporarily fetched profile here if needed for immediate feedback,
        // but the main check is in onAuthStateChanged.
        const tempProfile = await createUserProfile(userCredential.user);
        if (tempProfile?.isBanned) {
           // This is a fallback, onAuthStateChanged should handle the primary logout.
           toast({ title: "Account Suspended", description: "This account has been suspended.", variant: "destructive", duration: Infinity });
           await firebaseSignOut(auth);
           setLoadingAuth(false);
           return false;
        }
      }
      toast({ title: "Login Successful", description: "Welcome back!" });
      setLoadingAuth(false);
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
      if (name && userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
      }
      // Profile creation and banned check is handled by onAuthStateChanged
      toast({ title: "Registration Successful", description: "Welcome to Dodi Deals!" });
      setLoadingAuth(false);
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

  const updateUserAvatar = useCallback(async (newAvatarUrl: string) => {
    if (!auth.currentUser || !user) {
      toast({ title: "Not Authenticated", description: "You must be logged in to update your avatar.", variant: "destructive" });
      return false;
    }
    try {
      await updateProfile(auth.currentUser, { photoURL: newAvatarUrl });
      await updateUserAvatarInFirestore(auth.currentUser.uid, newAvatarUrl);
      setUser(prevUser => prevUser ? { ...prevUser, avatarUrl: newAvatarUrl } : null);
      toast({ title: "Avatar Updated", description: "Your profile picture has been changed." });
      return true;
    } catch (error: any) {
      console.error("Error updating avatar:", error);
      toast({ title: "Avatar Update Failed", description: error.message || "Could not update avatar.", variant: "destructive" });
      return false;
    }
  }, [user]);

  const updateUserProfileDetails = useCallback(async (newName: string): Promise<boolean> => {
    if (!auth.currentUser || !user) {
      toast({ title: "Not Authenticated", description: "You must be logged in to update your profile.", variant: "destructive" });
      return false;
    }
    if (!newName || !newName.trim()) {
      toast({ title: "Invalid Name", description: "Name cannot be empty.", variant: "destructive" });
      return false;
    }

    try {
      await updateProfile(auth.currentUser, { displayName: newName });
      await updateUserNameInFirestore(auth.currentUser.uid, newName);
      setUser(prevUser => prevUser ? { ...prevUser, name: newName } : null);
      toast({ title: "Profile Updated", description: "Your name has been successfully updated." });
      return true;
    } catch (error: any) {
      console.error("Error updating profile details:", error);
      toast({ title: "Profile Update Failed", description: error.message || "Could not update your profile.", variant: "destructive" });
      return false;
    }
  }, [user]);


  const logout = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        await firebaseSignOut(auth);
        setUser(null);
        setIsAuthenticated(false);
        setCart([]);
        _setSelectedStoreState(null);
        setAppliedRedemption(null);
        setUserOrders([]);
        setLoadingUserOrders(true); 
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
    }
  }, [router]);


  const addToCart = useCallback((product: ResolvedProduct, quantity: number = 1, selectedWeight?: FlowerWeight) => {
    if (!_selectedStore) {
      toast({ title: "No Store Selected", description: "Please select a store before adding to cart.", variant: "destructive" });
      setStoreSelectorOpen(true);
      return;
    }
     if (user?.isBanned) {
      toast({ title: "Account Suspended", description: "Your account is suspended. You cannot place orders.", variant: "destructive" });
      return;
    }
    setCart((prevCart) => {
      const itemIdentifier = product.id + (selectedWeight || '');
      const existingItemIndex = prevCart.findIndex(item => (item.product.id + (item.selectedWeight || '')) === itemIdentifier && item.product.storeId === product.storeId);

      if (existingItemIndex > -1) {
        const updatedCart = [...prevCart];
        const newQuantity = Math.min(updatedCart[existingItemIndex].quantity + quantity, product.stock);
        updatedCart[existingItemIndex] = { ...updatedCart[existingItemIndex], quantity: newQuantity };
        return updatedCart;
      }
      return [...prevCart, { product, quantity: Math.min(quantity, product.stock), selectedWeight }];
    });
    toast({ title: "Item Added", description: `${product.name}${selectedWeight ? ` (${selectedWeight})` : ''} added to cart.` });
  }, [_selectedStore, setStoreSelectorOpen, user?.isBanned]);

  const removeFromCart = useCallback((productId: string, selectedWeight?: FlowerWeight) => {
    const itemIdentifier = productId + (selectedWeight || '');
    setCart((prevCart) => prevCart.filter(item => (item.product.id + (item.selectedWeight || '')) !== itemIdentifier));
    toast({ title: "Item Removed", description: "Item removed from cart." });
  }, []);

  const updateCartQuantity = useCallback((productId: string, quantity: number, selectedWeight?: FlowerWeight) => {
    const itemIdentifier = productId + (selectedWeight || '');
    setCart((prevCart) =>
      prevCart.map(item =>
        (item.product.id + (item.selectedWeight || '')) === itemIdentifier
          ? { ...item, quantity: Math.max(0, Math.min(quantity, item.product.stock)) }
          : item
      ).filter(item => item.quantity > 0)
    );
  }, []);
  
  const getCartItemQuantity = useCallback((productId: string, selectedWeight?: FlowerWeight): number => {
    if (!_selectedStore) return 0;
    const itemIdentifier = productId + (selectedWeight || '');
    const item = cart.find(i => (i.product.id + (i.selectedWeight || '')) === itemIdentifier && i.product.storeId === _selectedStore.id);
    return item ? item.quantity : 0;
  }, [cart, _selectedStore]);


  const getTotalCartItems = useCallback(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  const clearCart = useCallback(() => {
    setCart([]);
    setAppliedRedemption(null);
    toast({ title: "Cart Cleared", description: "Your cart has been emptied." });
  }, []);

  const getCartSubtotal = useCallback(() => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  }, [cart]);

  const getCartTotal = useCallback(() => {
    const subtotal = getCartSubtotal();
    return appliedRedemption ? Math.max(0, subtotal - appliedRedemption.discountAmount) : subtotal;
  }, [getCartSubtotal, appliedRedemption]);

  const getPotentialPointsForCart = useCallback(() => {
    const finalTotalAfterPotentialRedemption = getCartTotal();
    return Math.floor(finalTotalAfterPotentialRedemption * 2); // 2 points per $1
  }, [getCartTotal]);

  const getCartTotalSavings = useCallback(() => {
    let savings = cart.reduce((totalSavings, item) => {
      if (item.product.originalPrice && item.product.originalPrice > item.product.price) {
        totalSavings += (item.product.originalPrice - item.product.price) * item.quantity;
      }
      return totalSavings;
    }, 0);
    if (appliedRedemption) {
      savings += appliedRedemption.discountAmount;
    }
    return savings;
  }, [cart, appliedRedemption]);

  const applyRedemption = useCallback((option: RedemptionOption) => {
    if (!user) {
      toast({ title: "Login Required", description: "Please log in to use points.", variant: "destructive" });
      return;
    }
    if (user.isBanned) {
      toast({ title: "Account Suspended", description: "Your account is suspended. You cannot redeem points.", variant: "destructive" });
      return;
    }
    if (user.points < option.pointsRequired) {
      toast({ title: "Not Enough Points", description: `You need ${option.pointsRequired} points for this reward. You have ${user.points}.`, variant: "destructive" });
      return;
    }
    const subtotal = getCartSubtotal();
    if (subtotal < option.discountAmount) {
      toast({ title: "Cart Total Too Low", description: `Your cart total must be at least $${option.discountAmount.toFixed(2)} to apply this discount.`, variant: "destructive" });
      return;
    }
    setAppliedRedemption(option);
    toast({ title: "Discount Applied", description: `${option.description} applied to your cart.` });
  }, [user, getCartSubtotal]);

  const removeRedemption = useCallback(() => {
    setAppliedRedemption(null);
    toast({ title: "Discount Removed", description: "Points discount has been removed from your cart." });
  }, []);

  const finalizeOrder = useCallback(async () => {
    if (!user || !_selectedStore || cart.length === 0) {
      toast({ title: "Cannot Finalize", description: "User not logged in, no store selected, or cart is empty.", variant: "destructive"});
      return;
    }
    if (user.isBanned) {
      toast({ title: "Account Suspended", description: "Your account is suspended. You cannot place orders.", variant: "destructive" });
      return;
    }

    const currentCartSubtotal = getCartSubtotal();
    if (currentCartSubtotal < MINIMUM_PURCHASE_AMOUNT) {
      toast({
        title: "Minimum Purchase Not Met",
        description: `A minimum purchase of $${MINIMUM_PURCHASE_AMOUNT.toFixed(2)} is required. Your current subtotal is $${currentCartSubtotal.toFixed(2)}.`,
        variant: "destructive"
      });
      return;
    }

    const orderItems: OrderItem[] = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      selectedWeight: item.selectedWeight,
      quantity: item.quantity,
      pricePerItem: item.product.price,
      originalPricePerItem: item.product.originalPrice,
    }));

    const subtotal = orderItems.reduce((sum, item) => sum + (item.pricePerItem * item.quantity), 0);
    const finalTotal = appliedRedemption ? Math.max(0, subtotal - appliedRedemption.discountAmount) : subtotal;
    
    const orderData: Omit<Order, 'id' | 'orderDate' | 'status' | 'pointsEarned'> = {
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      storeId: _selectedStore.id,
      storeName: _selectedStore.name,
      items: orderItems,
      subtotal: subtotal,
      discountApplied: appliedRedemption?.discountAmount,
      pointsRedeemed: appliedRedemption?.pointsRequired,
      finalTotal: finalTotal,
      pickupInstructions: `Please visit ${_selectedStore.name} at ${_selectedStore.address} during open hours. Bring a valid ID for pickup.`,
      userStrikesAtOrderTime: user.noShowStrikes, // Store strikes at order time
    };

    try {
      const { orderId } = await createOrderInFirestore(orderData);
            
      if (user) fetchUserOrders(); 
      toast({ 
        title: "Order Submitted!", 
        description: `Your order (#${orderId.substring(0,6)}...) for pickup at ${_selectedStore.name} has been submitted. Points will be applied by the store upon order completion.`
      });
      clearCart();
      router.push('/profile');
    } catch (error: any) {
      console.error("Error finalizing order:", error);
      toast({ title: "Order Failed", description: error.message || "Could not submit your order. Please try again.", variant: "destructive" });
    }
  }, [user, _selectedStore, cart, appliedRedemption, clearCart, router, fetchUserOrders, getCartSubtotal]);


  const products = useMemo(() => {
    if (!_selectedStore || loadingProducts || allProducts.length === 0) return [];

    const today = new Date();
    const currentDayOfWeek = daysOfWeek[today.getDay() === 0 ? 6 : today.getDay() - 1];
    let activeRule: CustomDealRule | undefined = undefined;
    if (_selectedStore.dailyDeals && _selectedStore.dailyDeals.length > 0) {
        for (const rule of _selectedStore.dailyDeals) {
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
      const availabilityForStore = p.availability.find(avail => avail.storeId === _selectedStore.id);
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

        if (p.category === 'Flower') {
          const totalGramsInStock = availabilityForStore.totalStockInGrams || 0;
          availabilityForStore.weightOptions?.forEach(wo => {
            const gramsForThisWeight = allFlowerWeightsConst.find(fw => fw.weight === wo.weight)?.grams || 0;
            const unitsAvailable = gramsForThisWeight > 0 ? Math.floor(totalGramsInStock / gramsForThisWeight) : 0;
            
            let effectivePrice = wo.price;
            let originalPriceValue = wo.price;
            let isProductOnDeal = false;
            if (activeRule && p.category === activeRule.category) {
              isProductOnDeal = true;
              effectivePrice = parseFloat((originalPriceValue * (1 - activeRule.discountPercentage / 100)).toFixed(2));
            }

            resolved.push({
              id: p.id, // Base product ID
              variantId: `${p.id}-${wo.weight}`, // Unique ID for this weight variant
              name: p.name,
              description: p.description,
              brand: p.brand,
              category: p.category,
              dataAiHint: p.dataAiHint,
              isFeatured: p.isFeatured || false,
              storeId: _selectedStore.id,
              price: effectivePrice,
              originalPrice: isProductOnDeal ? originalPriceValue : undefined,
              stock: unitsAvailable, // Stock is units of this weight
              imageUrl: currentImageUrl,
              selectedWeight: wo.weight, // The specific weight for this resolved product variant
              availableWeights: availabilityForStore.weightOptions, // All options for selection UI
              totalStockInGrams: totalGramsInStock,
            });
          });
        } else {
          let effectivePrice = availabilityForStore.price || 0; // Added fallback for price
          let originalPriceValue = availabilityForStore.price || 0; // Added fallback for price
          let isProductOnDeal = false;

          if (activeRule && p.category === activeRule.category) {
            isProductOnDeal = true;
            effectivePrice = parseFloat((originalPriceValue * (1 - activeRule.discountPercentage / 100)).toFixed(2));
          }

          resolved.push({
            id: p.id,
            variantId: p.id, // For non-flower, variantId is same as id
            name: p.name,
            description: p.description,
            brand: p.brand,
            category: p.category,
            dataAiHint: p.dataAiHint,
            isFeatured: p.isFeatured || false,
            storeId: _selectedStore.id,
            price: effectivePrice,
            originalPrice: isProductOnDeal ? originalPriceValue : undefined,
            stock: availabilityForStore.stock || 0, // Added fallback for stock
            imageUrl: currentImageUrl,
          });
        }
      }
    });
    return resolved;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_selectedStore, allProducts, loadingProducts]);


  const deals: Deal[] = useMemo(() => {
    if (!_selectedStore || loadingProducts || products.length === 0 || !_selectedStore.dailyDeals || _selectedStore.dailyDeals.length === 0) {
      return [];
    }

    const today = new Date();
    const currentDayOfWeek = daysOfWeek[today.getDay() === 0 ? 6 : today.getDay() - 1];
    let activeRule: CustomDealRule | undefined = undefined;

    for (const rule of _selectedStore.dailyDeals) {
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

    return products
      .filter(p => p.category === categoryOnDealToday && p.originalPrice && p.price < p.originalPrice && p.stock > 0)
      .map(dealProduct => ({
        id: `${dealProduct.variantId}-deal-${currentDayOfWeek}-${categoryOnDealToday}-${discountPercentageToday}`,
        product: dealProduct, // dealProduct is already a ResolvedProduct (variant)
        discountPercentage: discountPercentageToday,
        expiresAt: endOfToday.toISOString(),
        title: `${currentDayOfWeek}'s ${categoryOnDealToday} Deal!`,
        description: `${discountPercentageToday}% off all ${categoryOnDealToday} products today! Includes ${dealProduct.name}${dealProduct.selectedWeight ? ` (${dealProduct.selectedWeight})` : ''}.`,
        storeId: _selectedStore.id,
        categoryOnDeal: categoryOnDealToday,
      }));
  }, [_selectedStore, products, loadingProducts]);


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
    getCartSubtotal,
    getCartTotal,
    getCartTotalSavings,
    getPotentialPointsForCart,
    stores,
    selectedStore: _selectedStore, 
    selectStore,
    isStoreSelectorOpen,
    setStoreSelectorOpen,
    loadingAuth,
    loadingStores,
    loadingProducts,
    redemptionOptions: REDEMPTION_OPTIONS,
    appliedRedemption,
    applyRedemption,
    removeRedemption,
    finalizeOrder,
    userOrders,
    loadingUserOrders,
    fetchUserOrders,
  }), [
    isAuthenticated, user, login, register, logout, updateUserAvatar, updateUserProfileDetails, cart, addToCart, removeFromCart,
    updateCartQuantity, getCartItemQuantity, getTotalCartItems, clearCart, products, allProducts, deals, getCartSubtotal, getCartTotal, getCartTotalSavings, getPotentialPointsForCart, stores,
    _selectedStore, selectStore, isStoreSelectorOpen, setStoreSelectorOpen, 
    loadingAuth, loadingStores, loadingProducts, appliedRedemption, applyRedemption, removeRedemption, finalizeOrder,
    userOrders, loadingUserOrders, fetchUserOrders
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


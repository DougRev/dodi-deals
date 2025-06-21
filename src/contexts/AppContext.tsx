
"use client";

import type React from 'react';
import { createContext, useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from "@/hooks/use-toast";
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, type User as FirebaseUser, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot, getDocs } from 'firebase/firestore';

import type { Product, User, CartItem, Store, Deal, ResolvedProduct, CustomDealRule, ProductCategory, RedemptionOption, Order, OrderItem, OrderStatus, StoreRole, FlowerWeight, FlowerWeightPrice, CancellationReason } from '@/lib/types';
import { daysOfWeek, REDEMPTION_OPTIONS, flowerWeights as allFlowerWeightsConst, productCategories, flowerWeightToGrams, SUBCATEGORIES_MAP } from '@/lib/types';
import { initialStores as initialStoresSeedData } from '@/data/stores';
import { seedInitialData, updateUserAvatar as updateUserAvatarInFirestore, updateUserNameInFirestore, createOrderInFirestore, getUserOrders, updateUserFavorites } from '@/lib/firestoreService';


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
  getCartSubtotal: () => number;
  getCartTotal: () => number;
  getCartTotalSavings: () => number;
  getPotentialPointsForCart: () => number;
  stores: Store[]; // All stores, including hidden ones for admins
  displayableStores: Store[]; // Filtered stores for user display
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
  toggleFavoriteProduct: (productId: string) => Promise<void>;
  isProductFavorited: (productId: string) => boolean;
  resolvedFavoriteProducts: ResolvedProduct[];
  cancelMyOrder: (orderId: string) => Promise<boolean>;
  canInstallPWA: boolean;
  promptPWAInstall: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DODI_CART_KEY_PREFIX = 'dodiCart_';
const DODI_SELECTED_STORE_KEY = 'dodiSelectedStoreId';
const ADMIN_EMAIL = 'admin@test.com';
const MINIMUM_PURCHASE_AMOUNT = 15;

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}


export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [stores, setStores] = useState<Store[]>(initialStoresSeedData.map(s => ({...s, isHidden: s.isHidden === undefined ? false : s.isHidden })));
  const [loadingStores, setLoadingStores] = useState(true);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [_selectedStore, _setSelectedStoreState] = useState<Store | null>(null);
  const [isStoreSelectorOpen, setStoreSelectorOpen] = useState(false);

  const [appliedRedemption, setAppliedRedemption] = useState<RedemptionOption | null>(null);

  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loadingUserOrders, setLoadingUserOrders] = useState<boolean>(true);

  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstallPWA, setCanInstallPWA] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => console.log('[AppContext] Service Worker registered with scope:', registration.scope))
        .catch((error) => console.error('[AppContext] Service Worker registration failed:', error));
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
      setCanInstallPWA(true);
      console.log('[AppContext] beforeinstallprompt event captured.');
    };

    const handleAppInstalled = () => {
      setCanInstallPWA(false);
      setDeferredInstallPrompt(null);
      console.log('[AppContext] PWA installed successfully.');
      toast({ title: "App Installed!", description: "Dodi Deals has been added to your home screen." });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptPWAInstall = useCallback(async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the A2HS prompt');
      } else {
        console.log('User dismissed the A2HS prompt');
      }
      // We can only use the deferred prompt once.
      setDeferredInstallPrompt(null);
      setCanInstallPWA(false);
    } else {
      console.warn('[AppContext] promptPWAInstall called but no deferredInstallPrompt available.');
      toast({ title: "Installation Not Available", description: "The app cannot be installed at this moment. Try adding it via browser menu.", variant: "default" });
    }
  }, [deferredInstallPrompt]);

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

  const createUserProfile = useCallback(async (firebaseUser: FirebaseUser, name?: string) => {
    const userRef = doc(db, "users", firebaseUser.uid);
    let userSnap;
    try {
        userSnap = await getDoc(userRef);
    } catch (error) {
        console.error(`[AppContext] Error fetching user profile for ${firebaseUser.uid}:`, error);
        toast({ title: "Profile Error", description: "Could not load user profile.", variant: "destructive" });
        return null;
    }

    const isTheAdminEmail = firebaseUser.email === ADMIN_EMAIL;
    const displayName = name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Dodi User';
    const determinedAvatarUrl = firebaseUser.photoURL || (userSnap.exists() ? (userSnap.data() as User).avatarUrl : undefined);
    const existingData = userSnap.exists() ? userSnap.data() as User : null;

    const determinedAssignedStoreId = existingData?.assignedStoreId || null;
    const determinedStoreRole = existingData?.storeRole || null;

    const profileDataToSet: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        name: displayName,
        points: existingData?.points ?? 0,
        isAdmin: isTheAdminEmail || (existingData?.isAdmin === true),
        createdAt: existingData?.createdAt || new Date().toISOString(),
        avatarUrl: determinedAvatarUrl,
        assignedStoreId: (isTheAdminEmail || (existingData?.isAdmin === true)) ? null : determinedAssignedStoreId,
        storeRole: (isTheAdminEmail || (existingData?.isAdmin === true)) ? null : determinedStoreRole,
        noShowStrikes: existingData?.noShowStrikes ?? 0,
        isBanned: existingData?.isBanned ?? false,
        favoriteProductIds: existingData?.favoriteProductIds || [],
        stripeCustomerId: existingData?.stripeCustomerId || undefined,
      };

    if (!userSnap.exists()) {
      try {
        const dataToSetForNewUser: any = {
            email: profileDataToSet.email,
            name: profileDataToSet.name,
            points: profileDataToSet.points,
            isAdmin: profileDataToSet.isAdmin,
            createdAt: profileDataToSet.createdAt,
            avatarUrl: profileDataToSet.avatarUrl,
            assignedStoreId: profileDataToSet.assignedStoreId,
            storeRole: profileDataToSet.storeRole,
            noShowStrikes: profileDataToSet.noShowStrikes,
            isBanned: profileDataToSet.isBanned,
            favoriteProductIds: profileDataToSet.favoriteProductIds,
        };
         if (dataToSetForNewUser.avatarUrl === undefined) delete dataToSetForNewUser.avatarUrl;

        await setDoc(userRef, dataToSetForNewUser);

        if (firebaseUser.displayName !== displayName || (determinedAvatarUrl && firebaseUser.photoURL !== determinedAvatarUrl)) {
            await updateProfile(firebaseUser, { displayName: displayName, photoURL: determinedAvatarUrl });
        }
      } catch (error: any) {
        console.error(`[AppContext] Error CREATING Firestore profile for ${firebaseUser.email}: ${error.message}`, error);
        toast({ title: "Profile Creation Failed", description: "Could not save user profile.", variant: "destructive" });
        return { ...profileDataToSet, isAdmin: false, assignedStoreId: null, storeRole: null, noShowStrikes: 0, isBanned: false, favoriteProductIds: [] };
      }
    } else {
      const updates: Partial<User> = {};
      if (isTheAdminEmail && !existingData?.isAdmin) {
        updates.isAdmin = true;
        updates.assignedStoreId = null;
        updates.storeRole = null;
        profileDataToSet.isAdmin = true;
        profileDataToSet.assignedStoreId = null;
        profileDataToSet.storeRole = null;
      }
      if (displayName && existingData?.name !== displayName) {
        updates.name = displayName;
        profileDataToSet.name = displayName;
      }
      if (determinedAvatarUrl !== existingData?.avatarUrl) {
         updates.avatarUrl = determinedAvatarUrl;
         profileDataToSet.avatarUrl = determinedAvatarUrl;
      }
      if (existingData.noShowStrikes === undefined) {
        updates.noShowStrikes = 0;
        profileDataToSet.noShowStrikes = 0;
      }
      if (existingData.isBanned === undefined) {
        updates.isBanned = false;
        profileDataToSet.isBanned = false;
      }
      if (existingData.favoriteProductIds === undefined) {
        updates.favoriteProductIds = [];
        profileDataToSet.favoriteProductIds = [];
      }
       if (existingData.stripeCustomerId === undefined) {
        updates.stripeCustomerId = undefined;
        profileDataToSet.stripeCustomerId = undefined;
      }

      if (updates.isAdmin) {
        updates.assignedStoreId = null;
        updates.storeRole = null;
        profileDataToSet.assignedStoreId = null;
        profileDataToSet.storeRole = null;
      }


      if (Object.keys(updates).length > 0) {
        try {
            await updateDoc(userRef, updates);
            if (updates.name && firebaseUser.displayName !== updates.name) await updateProfile(firebaseUser, { displayName: updates.name });
            if (updates.avatarUrl !== undefined && firebaseUser.photoURL !== updates.avatarUrl) await updateProfile(firebaseUser, { photoURL: updates.avatarUrl });
        } catch (error: any) {
             console.error(`[AppContext] Failed to update Firestore profile for ${firebaseUser.email}:`, error);
        }
      }
    }
    return profileDataToSet;
  }, []);

  useEffect(() => {
    setLoadingStores(true);
    const storesCol = collection(db, 'stores');
    const unsubscribe = onSnapshot(storesCol, (snapshot) => {
      let firestoreStores = initialStoresSeedData.map(s => ({ ...s, isHidden: s.isHidden === undefined ? false : s.isHidden }));

      if (!snapshot.empty) {
        const fetchedStores = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data(), isHidden: docSnap.data().isHidden || false } as Store));
        if (fetchedStores.length > 0) {
            firestoreStores = fetchedStores;
        }
      }
      setStores(firestoreStores);

      const savedStoreId = typeof window !== 'undefined' ? localStorage.getItem(DODI_SELECTED_STORE_KEY) : null;
      let storeToSelectInitially: Store | null = null;

      if (savedStoreId) {
        const potentialStore = firestoreStores.find(s => s.id === savedStoreId);
        if (potentialStore) {
          if (!user?.isAdmin && potentialStore.isHidden) {
            // Non-admin trying to access a hidden store
            if (typeof window !== 'undefined') localStorage.removeItem(DODI_SELECTED_STORE_KEY);
            _setSelectedStoreState(null);
            if (firestoreStores.some(s => !s.isHidden)) {
              setStoreSelectorOpen(true);
            }
          } else {
            // Admin can select hidden store, or store is not hidden
            storeToSelectInitially = potentialStore;
          }
        } else {
          // Saved store ID no longer exists
          if (typeof window !== 'undefined') localStorage.removeItem(DODI_SELECTED_STORE_KEY);
          _setSelectedStoreState(null);
           if (firestoreStores.some(s => !s.isHidden)) {
             setStoreSelectorOpen(true);
           }
        }
      } else {
        // No saved store, open selector if there are any visible stores
        _setSelectedStoreState(null);
        if (firestoreStores.some(s => !s.isHidden)) {
          setStoreSelectorOpen(true);
        }
      }

      if (storeToSelectInitially) {
        _setSelectedStoreState(storeToSelectInitially);
        setStoreSelectorOpen(false);
      }

      setLoadingStores(false);
    }, (error) => {
      console.error("Error fetching stores: ", error);
      toast({ title: "Error", description: "Could not load store information.", variant: "destructive" });
      setStores(initialStoresSeedData.map(s => ({...s, isHidden: s.isHidden === undefined ? false : s.isHidden })));
      _setSelectedStoreState(null);
      if (initialStoresSeedData.some(s => !s.isHidden)) {
        setStoreSelectorOpen(true);
      }
      setLoadingStores(false);
    });

    return () => unsubscribe();
  }, [user]); // Re-run if user (and thus admin status) changes


  const displayableStores = useMemo(() => {
    if (user?.isAdmin) {
      return stores; // Admins see all stores
    }
    return stores.filter(store => !store.isHidden);
  }, [stores, user]);


  useEffect(() => {
    setLoadingProducts(true);
    const productsCol = collection(db, 'products');
    const unsubscribe = onSnapshot(productsCol, (snapshot) => {
      const fetchedProducts = snapshot.docs.map(docSnap => {
        const data = docSnap.data() as Omit<Product, 'id'>;
        const validCategory = productCategories.includes(data.category as ProductCategory) ? data.category : productCategories[0];
        return {
            id: docSnap.id,
            ...data,
            category: validCategory,
            subcategory: data.subcategory || undefined,
        } as Product;
    });
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
    if (isAuthenticated && user?.id) {
      fetchUserOrders();
    } else {
      setUserOrders([]);
      if (!loadingAuth) {
        setLoadingUserOrders(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    setLoadingAuth(true);
    let unsubscribeFromUserDoc: (() => void) | null = null;
  
    const unsubscribeFromAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeFromUserDoc) {
        unsubscribeFromUserDoc();
        unsubscribeFromUserDoc = null;
      }
  
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
  
        unsubscribeFromUserDoc = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const userData = {
              id: docSnap.id,
              ...docSnap.data(),
            } as User;
            setUser(userData);
            setIsAuthenticated(true);
            if (userData.isBanned) {
              toast({ title: "Account Suspended", description: "This account has been suspended. Please contact support.", variant: "destructive", duration: 10000 });
            }
          } else {
            console.log(`[AppContext] No user document found for ${firebaseUser.uid}, creating one...`);
            const userProfile = await createUserProfile(firebaseUser, firebaseUser.displayName || undefined);
            if (userProfile) {
              setUser(userProfile);
              setIsAuthenticated(true);
            } else {
              setIsAuthenticated(false);
              setUser(null);
              await firebaseSignOut(auth);
            }
          }
          setLoadingAuth(false);
        }, (error) => {
          console.error("[AppContext] Error listening to user document:", error);
          toast({ title: "Profile Sync Error", description: "Could not sync your profile data.", variant: "destructive" });
          setUser(null);
          setIsAuthenticated(false);
          setLoadingAuth(false);
        });
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setLoadingAuth(false);
      }
    });
  
    return () => {
      unsubscribeFromAuth();
      if (unsubscribeFromUserDoc) {
        unsubscribeFromUserDoc();
      }
    };
  }, [createUserProfile]);

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
        // Non-admin cannot select a hidden store
        if (!user?.isAdmin && store.isHidden) {
            toast({ title: "Store Unavailable", description: "This store is currently not available.", variant: "default" });
            return;
        }

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
  }, [stores, _selectedStore, user?.isAdmin]);

  const login = useCallback(async (email: string, pass: string) => {
    setLoadingAuth(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const userRef = doc(db, "users", userCredential.user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && (userSnap.data() as User).isBanned) {
        toast({ title: "Account Suspended", description: "This account has been suspended and cannot log in.", variant: "destructive", duration: 10000 });
        await firebaseSignOut(auth);
        setLoadingAuth(false);
        return false;
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
      // The onSnapshot listener will handle profile creation in Firestore
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
      // The onSnapshot listener will update the user state automatically
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
       // The onSnapshot listener will update the user state automatically
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


  const addToCart = useCallback((baseProduct: ResolvedProduct, quantity: number = 1, selectedWeightParam?: FlowerWeight) => {
    if (!_selectedStore) {
      toast({ title: "No Store Selected", description: "Please select a store before adding to cart.", variant: "destructive" });
      setStoreSelectorOpen(true);
      return;
    }
    if (user?.isBanned) {
      toast({ title: "Account Suspended", description: "Your account is suspended. You cannot place orders.", variant: "destructive" });
      return;
    }

    let productToAdd: ResolvedProduct = baseProduct;
    let itemIdentifier = baseProduct.variantId;
    let finalSelectedWeight = baseProduct.selectedWeight;

    if (baseProduct.category === 'Flower' && selectedWeightParam) {
      finalSelectedWeight = selectedWeightParam;
      itemIdentifier = `${baseProduct.id}-${finalSelectedWeight}`;

      const weightOption = baseProduct.availableWeights?.find(wo => wo.weight === finalSelectedWeight);
      if (!weightOption) {
        toast({ title: "Error", description: `Selected weight ${finalSelectedWeight} not available for ${baseProduct.name}.`, variant: "destructive" });
        return;
      }

      const gramsForSelectedWeight = flowerWeightToGrams(finalSelectedWeight);
      const stockForSelectedWeight = baseProduct.totalStockInGrams && gramsForSelectedWeight > 0
        ? Math.floor(baseProduct.totalStockInGrams / gramsForSelectedWeight)
        : 0;

      if (quantity > stockForSelectedWeight) {
        toast({ title: "Not Enough Stock", description: `Only ${stockForSelectedWeight} units of ${baseProduct.name} (${finalSelectedWeight}) available.`, variant: "default" });
        quantity = stockForSelectedWeight;
        if (quantity === 0) return;
      }

      let effectivePrice = weightOption.price;
      let originalPrice: number | undefined = weightOption.price;
      let isProductOnDeal = false;
      let isBogoEligibleProduct = false;

      const today = new Date();
      const currentDayName = daysOfWeek[today.getDay() === 0 ? 6 : today.getDay() - 1];

      if (currentDayName === 'Tuesday' && baseProduct.category === 'E-Liquid') {
        isBogoEligibleProduct = true;
      } else if (currentDayName === 'Wednesday' && baseProduct.brand.toLowerCase().startsWith('dodi')) {
        isProductOnDeal = true;
        effectivePrice = parseFloat((originalPrice * (1 - 0.15)).toFixed(2));
      } else if (currentDayName === 'Thursday' && baseProduct.category === 'Drinks') {
        isProductOnDeal = true;
        effectivePrice = parseFloat((originalPrice * (1 - 0.20)).toFixed(2));
      }

      if (!isProductOnDeal && !isBogoEligibleProduct && _selectedStore.dailyDeals && _selectedStore.dailyDeals.length > 0) {
        for (const rule of _selectedStore.dailyDeals) {
          if (rule.selectedDays.includes(currentDayName) && rule.category === baseProduct.category) {
            isProductOnDeal = true;
            effectivePrice = parseFloat((originalPrice * (1 - rule.discountPercentage / 100)).toFixed(2));
            break;
          }
        }
      }

      productToAdd = {
        ...baseProduct,
        variantId: itemIdentifier,
        price: effectivePrice,
        originalPrice: isProductOnDeal ? originalPrice : undefined,
        stock: stockForSelectedWeight,
        selectedWeight: finalSelectedWeight,
        isBogoEligible: isBogoEligibleProduct,
      };
    } else if (baseProduct.category !== 'Flower') {
       if (quantity > baseProduct.stock) {
        toast({ title: "Not Enough Stock", description: `Only ${baseProduct.stock} units of ${baseProduct.name} available.`, variant: "default" });
        quantity = baseProduct.stock;
        if (quantity === 0) return;
      }
    }


    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(item => item.product.variantId === itemIdentifier && item.product.storeId === productToAdd.storeId);

      if (existingItemIndex > -1) {
        const updatedCart = [...prevCart];
        const newQuantity = Math.min(updatedCart[existingItemIndex].quantity + quantity, productToAdd.stock);
        updatedCart[existingItemIndex] = { ...updatedCart[existingItemIndex], quantity: newQuantity, product: productToAdd };
        return updatedCart;
      }
      return [...prevCart, { product: productToAdd, quantity: Math.min(quantity, productToAdd.stock), selectedWeight: finalSelectedWeight }];
    });
    toast({ title: "Item Added", description: `${productToAdd.name}${finalSelectedWeight ? ` (${finalSelectedWeight})` : ''} added to cart.` });
  }, [_selectedStore, user?.isBanned, setStoreSelectorOpen, user]);

  const removeFromCart = useCallback((productId: string, selectedWeight?: FlowerWeight) => {
    const variantIdToRemove = selectedWeight ? `${productId}-${selectedWeight}` : productId;
    setCart((prevCart) => prevCart.filter(item => item.product.variantId !== variantIdToRemove));
    toast({ title: "Item Removed", description: "Item removed from cart." });
  }, []);

  const updateCartQuantity = useCallback((productId: string, quantity: number, selectedWeight?: FlowerWeight) => {
    const variantIdToUpdate = selectedWeight ? `${productId}-${selectedWeight}` : productId;
    setCart((prevCart) =>
      prevCart.map(item =>
        item.product.variantId === variantIdToUpdate
          ? { ...item, quantity: Math.max(0, Math.min(quantity, item.product.stock)) }
          : item
      ).filter(item => item.quantity > 0)
    );
  }, []);

  const getCartItemQuantity = useCallback((productId: string, selectedWeight?: FlowerWeight): number => {
    if (!_selectedStore) return 0;
    const variantIdToFind = selectedWeight ? `${productId}-${selectedWeight}` : productId;
    const item = cart.find(i => i.product.variantId === variantIdToFind && i.product.storeId === _selectedStore.id);
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
    let subtotal = cart.reduce((total, item) => total + item.product.price * item.quantity, 0);

    const today = new Date();
    const currentDayName = daysOfWeek[today.getDay() === 0 ? 6 : today.getDay() - 1];
    if (currentDayName === 'Tuesday') {
        const eLiquidItems = cart.filter(item => item.product.category === 'E-Liquid');
        if (eLiquidItems.length >= 2) {
            const individualELiquidUnits = eLiquidItems.reduce((acc, item) => {
                for (let i = 0; i < item.quantity; i++) {
                    acc.push(item.product);
                }
                return acc;
            }, [] as ResolvedProduct[]);
            individualELiquidUnits.sort((a, b) => a.price - b.price);

            let bogoDiscount = 0;
            for (let i = 0; i < Math.floor(individualELiquidUnits.length / 2); i++) {
                bogoDiscount += individualELiquidUnits[i * 2].price * 0.5;
            }
            subtotal -= bogoDiscount;
        }
    }
    return subtotal;
  }, [cart]);

  const getCartTotal = useCallback(() => {
    const subtotal = getCartSubtotal();
    return appliedRedemption ? Math.max(0, subtotal - appliedRedemption.discountAmount) : subtotal;
  }, [getCartSubtotal, appliedRedemption]);

  const getPotentialPointsForCart = useCallback(() => {
    const finalTotalAfterPotentialRedemption = getCartTotal();
    return Math.floor(finalTotalAfterPotentialRedemption * 1);
  }, [getCartTotal]);

  const getCartTotalSavings = useCallback(() => {
    let savings = 0;
    savings += cart.reduce((totalSavings, item) => {
      if (item.product.originalPrice && item.product.originalPrice > item.product.price) {
        totalSavings += (item.product.originalPrice - item.product.price) * item.quantity;
      }
      return totalSavings;
    }, 0);

    const today = new Date();
    const currentDayName = daysOfWeek[today.getDay() === 0 ? 6 : today.getDay() - 1];
    if (currentDayName === 'Tuesday') {
        const eLiquidItems = cart.filter(item => item.product.category === 'E-Liquid');
        if (eLiquidItems.length >= 2) {
            const individualELiquidUnits = eLiquidItems.reduce((acc, item) => {
                for (let i = 0; i < item.quantity; i++) {
                    acc.push(item.product);
                }
                return acc;
            }, [] as ResolvedProduct[]);
            individualELiquidUnits.sort((a, b) => a.price - b.price);
            for (let i = 0; i < Math.floor(individualELiquidUnits.length / 2); i++) {
                savings += individualELiquidUnits[i * 2].price * 0.5;
            }
        }
    }

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
      toast({ title: "Cart Total Too Low", description: `Your cart total must be at least $${option.discountAmount.toFixed(2)} to apply this discount (after BOGO if applicable).`, variant: "destructive" });
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
      selectedWeight: item.product.selectedWeight,
      quantity: item.quantity,
      pricePerItem: item.product.price,
      originalPricePerItem: item.product.originalPrice,
    }));

    const subtotalBeforeRedemption = getCartSubtotal();
    const finalTotal = appliedRedemption ? Math.max(0, subtotalBeforeRedemption - appliedRedemption.discountAmount) : subtotalBeforeRedemption;

    const pointsCalculated = Math.floor(finalTotal * 1);

    const orderData: Omit<Order, 'id' | 'orderDate' | 'status'> = {
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      storeId: _selectedStore.id,
      storeName: _selectedStore.name,
      items: orderItems,
      subtotal: subtotalBeforeRedemption,
      discountApplied: appliedRedemption?.discountAmount,
      pointsRedeemed: appliedRedemption?.pointsRequired,
      finalTotal: finalTotal,
      pickupInstructions: `Please visit ${_selectedStore.name} at ${_selectedStore.address} during open hours. Bring a valid ID for pickup.`,
      userStrikesAtOrderTime: user.noShowStrikes || 0,
    };

    try {
      const { orderId } = await createOrderInFirestore({ ...orderData, pointsEarned: pointsCalculated });

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
    // If a store is selected but it's hidden and the user is not an admin, treat as no store selected for product resolution
    if (_selectedStore.isHidden && !user?.isAdmin) return [];


    const today = new Date();
    const currentDayName = daysOfWeek[today.getDay() === 0 ? 6 : today.getDay() - 1];

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
          const categoryString = (typeof p.category === 'string' && p.category) ? p.category : 'default';
          const categoryPath = categoryString.toLowerCase().replace(/\s+/g, '-');
          currentImageUrl = `/images/categories/${categoryPath}.png`;
        }

        const baseResolvedInfo: Omit<ResolvedProduct, 'price' | 'stock' | 'variantId' | 'originalPrice' | 'isBogoEligible' | 'availableWeights' | 'totalStockInGrams' | 'selectedWeight'> = {
          id: p.id,
          name: p.name,
          description: p.description,
          brand: p.brand,
          category: p.category,
          subcategory: p.subcategory,
          dataAiHint: p.dataAiHint,
          isFeatured: p.isFeatured || false,
          storeId: _selectedStore.id,
          imageUrl: currentImageUrl,
        };

        if (p.category === 'Flower' && availabilityForStore.weightOptions && availabilityForStore.totalStockInGrams !== undefined && availabilityForStore.totalStockInGrams > 0) {
          const validWeightOptions = availabilityForStore.weightOptions.filter(wo => {
            const grams = flowerWeightToGrams(wo.weight);
            return grams > 0 && (availabilityForStore.totalStockInGrams || 0) >= grams;
          });

          if (validWeightOptions.length > 0) {
            const prices = validWeightOptions.map(wo => wo.price);
            const minPrice = Math.min(...prices);

            const smallestWeightOption = validWeightOptions.reduce((smallest, current) => {
                return flowerWeightToGrams(current.weight) < flowerWeightToGrams(smallest.weight) ? current : smallest;
            }, validWeightOptions[0]);

            const smallestWeightGrams = flowerWeightToGrams(smallestWeightOption.weight);
            const stockForSmallestUnit = smallestWeightGrams > 0 ? Math.floor((availabilityForStore.totalStockInGrams || 0) / smallestWeightGrams) : 0;

            let effectiveMinPrice = minPrice;
            let originalMinPrice: number | undefined = minPrice;
            let isProductOnDeal = false;
            let isBogoEligibleProduct = (currentDayName === 'Tuesday' && p.category === 'E-Liquid');

            if (currentDayName === 'Wednesday' && p.brand.toLowerCase().startsWith('dodi')) {
              isProductOnDeal = true;
              effectiveMinPrice = parseFloat((originalMinPrice * (1 - 0.15)).toFixed(2));
            } else if (currentDayName === 'Thursday' && p.category === 'Drinks') {
              isProductOnDeal = true;
              effectiveMinPrice = parseFloat((originalMinPrice * (1 - 0.20)).toFixed(2));
            }

            if (!isProductOnDeal && !isBogoEligibleProduct && _selectedStore.dailyDeals && _selectedStore.dailyDeals.length > 0) {
              for (const rule of _selectedStore.dailyDeals) {
                if (rule.selectedDays.includes(currentDayName) && rule.category === p.category) {
                  isProductOnDeal = true;
                  effectiveMinPrice = parseFloat((originalMinPrice * (1 - rule.discountPercentage / 100)).toFixed(2));
                  break;
                }
              }
            }

            resolved.push({
              ...baseResolvedInfo,
              variantId: p.id,
              price: effectiveMinPrice,
              originalPrice: isProductOnDeal ? originalMinPrice : undefined,
              stock: stockForSmallestUnit,
              availableWeights: validWeightOptions,
              totalStockInGrams: availabilityForStore.totalStockInGrams,
              isBogoEligible: isBogoEligibleProduct,
              selectedWeight: undefined,
            });
          }
        } else if (p.category !== 'Flower' && availabilityForStore.price !== undefined && availabilityForStore.stock !== undefined) {
            let effectivePrice = availabilityForStore.price;
            let originalPriceValue: number | undefined = availabilityForStore.price;
            let isProductOnDeal = false;
            let isBogoEligibleProduct = (currentDayName === 'Tuesday' && p.category === 'E-Liquid');

            if (currentDayName === 'Wednesday' && p.brand.toLowerCase().startsWith('dodi')) {
                isProductOnDeal = true;
                effectivePrice = parseFloat((originalPriceValue * (1 - 0.15)).toFixed(2));
            } else if (currentDayName === 'Thursday' && p.category === 'Drinks') {
                isProductOnDeal = true;
                effectivePrice = parseFloat((originalPriceValue * (1 - 0.20)).toFixed(2));
            }
             if (!isProductOnDeal && !isBogoEligibleProduct && _selectedStore.dailyDeals && _selectedStore.dailyDeals.length > 0) {
                for (const rule of _selectedStore.dailyDeals) {
                    if (rule.selectedDays.includes(currentDayName) && rule.category === p.category) {
                        isProductOnDeal = true;
                        effectivePrice = parseFloat((originalPriceValue * (1 - rule.discountPercentage / 100)).toFixed(2));
                        break;
                    }
                }
            }

            resolved.push({
                ...baseResolvedInfo,
                variantId: p.id,
                price: effectivePrice,
                originalPrice: isProductOnDeal ? originalPriceValue : undefined,
                stock: availabilityForStore.stock,
                isBogoEligible: isBogoEligibleProduct,
                selectedWeight: undefined,
            });
        }
      }
    });
    return resolved;
  }, [_selectedStore, allProducts, loadingProducts, user?.isAdmin]);


  const deals: Deal[] = useMemo(() => {
    if (!_selectedStore || loadingProducts) {
      return [];
    }
    // If a store is selected but it's hidden and the user is not an admin, show no deals
    if (_selectedStore.isHidden && !user?.isAdmin) return [];

    const today = new Date();
    const currentDayName = daysOfWeek[today.getDay() === 0 ? 6 : today.getDay() - 1];
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const generatedDeals: Deal[] = [];

    if (currentDayName === 'Tuesday') {
      generatedDeals.push({
        id: `deal-${currentDayName}-eliquid-bogo`,
        title: "BOGO 50% Off E-Liquids!",
        description: "Buy one E-Liquid, get a second one 50% off (discount applies to item of equal or lesser value in cart). Applies to all E-Liquid products.",
        categoryOnDeal: 'E-Liquid',
        dealType: 'bogo',
        expiresAt: endOfToday.toISOString(),
        storeId: _selectedStore.id,
        product: undefined,
      });
    }
    if (currentDayName === 'Wednesday') {
      generatedDeals.push({
        id: `deal-${currentDayName}-dodi-brands`,
        title: "15% Off Dodi Brands!",
        description: "Enjoy 15% off all products from Dodi Hemp, Dodi Accessories, Dodi Drinks etc.",
        brandOnDeal: 'Dodi',
        discountPercentage: 15,
        dealType: 'percentage',
        expiresAt: endOfToday.toISOString(),
        storeId: _selectedStore.id,
        product: undefined,
      });
    }
    if (currentDayName === 'Thursday') {
         generatedDeals.push({
            id: `deal-${currentDayName}-drinks`,
            title: "20% Off All Drinks!",
            description: "Quench your thirst with 20% off our Drinks category.",
            categoryOnDeal: 'Drinks',
            discountPercentage: 20,
            dealType: 'percentage',
            expiresAt: endOfToday.toISOString(),
            storeId: _selectedStore.id,
            product: undefined,
        });
    }
     if (_selectedStore.dailyDeals) {
        _selectedStore.dailyDeals.forEach(rule => {
            if (rule.selectedDays.includes(currentDayName)) {
                generatedDeals.push({
                    id: `deal-store-${rule.category}-${rule.discountPercentage}-${_selectedStore.id}`,
                    product: undefined,
                    title: `${rule.discountPercentage}% Off ${rule.category}!`,
                    description: `Store Special: ${rule.discountPercentage}% off all ${rule.category} products today at ${_selectedStore.name}.`,
                    categoryOnDeal: rule.category,
                    discountPercentage: rule.discountPercentage,
                    dealType: 'percentage',
                    expiresAt: endOfToday.toISOString(),
                    storeId: _selectedStore.id,
                });
            }
        });
    }

    const uniqueDealsMap = new Map<string, Deal>();
    for (const deal of generatedDeals) {
        const key = `${deal.dealType}-${deal.categoryOnDeal || 'nonecat'}-${deal.brandOnDeal || 'nonebrand'}-${deal.discountPercentage || 0}-${deal.product?.id || 'general'}`;
        if (!uniqueDealsMap.has(key)) {
            uniqueDealsMap.set(key, deal);
        }
    }
    return Array.from(uniqueDealsMap.values());

  }, [_selectedStore, products, loadingProducts, user?.isAdmin]);

  const toggleFavoriteProduct = useCallback(async (productId: string) => {
    if (!user || !isAuthenticated) {
      toast({ title: "Login Required", description: "Please log in to favorite products.", variant: "destructive" });
      return;
    }

    const currentFavorites = user.favoriteProductIds || [];
    let updatedFavorites: string[];
    let isNowFavorited: boolean;

    if (currentFavorites.includes(productId)) {
      updatedFavorites = currentFavorites.filter(id => id !== productId);
      isNowFavorited = false;
    } else {
      updatedFavorites = [...currentFavorites, productId];
      isNowFavorited = true;
    }

    try {
      await updateUserFavorites(user.id, updatedFavorites);
      setUser(prevUser => prevUser ? { ...prevUser, favoriteProductIds: updatedFavorites } : null);
      toast({ title: isNowFavorited ? "Favorited!" : "Unfavorited", description: isNowFavorited ? "Product added to your favorites." : "Product removed from your favorites."});
    } catch (error: any) {
      console.error("Error toggling favorite:", error);
      toast({ title: "Error", description: error.message || "Could not update favorites.", variant: "destructive" });
    }
  }, [user, isAuthenticated]);

  const isProductFavorited = useCallback((productId: string): boolean => {
    return !!user?.favoriteProductIds?.includes(productId);
  }, [user?.favoriteProductIds]);


  const resolvedFavoriteProducts = useMemo(() => {
    if (!user?.favoriteProductIds || user.favoriteProductIds.length === 0 || !_selectedStore || loadingProducts) {
      return [];
    }
    if (_selectedStore.isHidden && !user?.isAdmin) return [];


    const today = new Date();
    const currentDayName = daysOfWeek[today.getDay() === 0 ? 6 : today.getDay() - 1];

    return allProducts
      .filter(p => user.favoriteProductIds!.includes(p.id))
      .map(p => {
        const availabilityForStore = p.availability.find(avail => avail.storeId === _selectedStore.id);
        if (!availabilityForStore) return null;

        let currentImageUrl = p.baseImageUrl;
         if (availabilityForStore.storeSpecificImageUrl && availabilityForStore.storeSpecificImageUrl.trim() !== '') {
          currentImageUrl = availabilityForStore.storeSpecificImageUrl;
        } else if (p.baseImageUrl && p.baseImageUrl.trim() !== '' && !p.baseImageUrl.startsWith('https://placehold.co')) {
          currentImageUrl = p.baseImageUrl;
        } else {
          const categoryString = (typeof p.category === 'string' && p.category) ? p.category : 'default';
          const categoryPath = categoryString.toLowerCase().replace(/\s+/g, '-');
          currentImageUrl = `/images/categories/${categoryPath}.png`;
        }

        const baseResolvedInfo: Omit<ResolvedProduct, 'price' | 'stock' | 'variantId' | 'originalPrice' | 'isBogoEligible' | 'availableWeights' | 'totalStockInGrams' | 'selectedWeight'> = {
          id: p.id,
          name: p.name,
          description: p.description,
          brand: p.brand,
          category: p.category,
          subcategory: p.subcategory,
          dataAiHint: p.dataAiHint,
          isFeatured: p.isFeatured || false,
          storeId: _selectedStore.id,
          imageUrl: currentImageUrl,
        };

        if (p.category === 'Flower' && availabilityForStore.weightOptions && availabilityForStore.totalStockInGrams !== undefined) {
           const validWeightOptions = availabilityForStore.weightOptions.filter(wo => {
            const grams = flowerWeightToGrams(wo.weight);
            return grams > 0 && (availabilityForStore.totalStockInGrams || 0) >= grams;
          });
          const prices = validWeightOptions.map(wo => wo.price);
          const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

          const smallestWeightOption = validWeightOptions.length > 0 ? validWeightOptions.reduce((smallest, current) => {
              return flowerWeightToGrams(current.weight) < flowerWeightToGrams(smallest.weight) ? current : smallest;
          }, validWeightOptions[0]) : null;

          const smallestWeightGrams = smallestWeightOption ? flowerWeightToGrams(smallestWeightOption.weight) : 0;
          const stockForSmallestUnit = smallestWeightGrams > 0 ? Math.floor((availabilityForStore.totalStockInGrams || 0) / smallestWeightGrams) : 0;

          let effectiveMinPrice = minPrice;
          let originalMinPrice: number | undefined = minPrice;
          let isProductOnDeal = false;
          let isBogoEligibleProduct = (currentDayName === 'Tuesday' && p.category === 'E-Liquid');

          if (currentDayName === 'Wednesday' && p.brand.toLowerCase().startsWith('dodi')) {
            isProductOnDeal = true;
            effectiveMinPrice = parseFloat((originalMinPrice * (1 - 0.15)).toFixed(2));
          } else if (currentDayName === 'Thursday' && p.category === 'Drinks') {
            isProductOnDeal = true;
            effectiveMinPrice = parseFloat((originalMinPrice * (1 - 0.20)).toFixed(2));
          }

          if (!isProductOnDeal && !isBogoEligibleProduct && _selectedStore.dailyDeals && _selectedStore.dailyDeals.length > 0) {
            for (const rule of _selectedStore.dailyDeals) {
              if (rule.selectedDays.includes(currentDayName) && rule.category === p.category) {
                isProductOnDeal = true;
                effectiveMinPrice = parseFloat((originalMinPrice * (1 - rule.discountPercentage / 100)).toFixed(2));
                break;
              }
            }
          }

          return {
            ...baseResolvedInfo,
            variantId: p.id,
            price: effectiveMinPrice,
            originalPrice: isProductOnDeal ? originalMinPrice : undefined,
            stock: stockForSmallestUnit,
            availableWeights: validWeightOptions,
            totalStockInGrams: availabilityForStore.totalStockInGrams,
            isBogoEligible: isBogoEligibleProduct,
          } as ResolvedProduct;

        } else if (p.category !== 'Flower' && availabilityForStore.price !== undefined && availabilityForStore.stock !== undefined) {
           let effectivePrice = availabilityForStore.price;
            let originalPriceValue: number | undefined = availabilityForStore.price;
            let isProductOnDeal = false;
            let isBogoEligibleProduct = (currentDayName === 'Tuesday' && p.category === 'E-Liquid');

            if (currentDayName === 'Wednesday' && p.brand.toLowerCase().startsWith('dodi')) {
                isProductOnDeal = true;
                effectivePrice = parseFloat((originalPriceValue * (1 - 0.15)).toFixed(2));
            } else if (currentDayName === 'Thursday' && p.category === 'Drinks') {
                isProductOnDeal = true;
                effectivePrice = parseFloat((originalPriceValue * (1 - 0.20)).toFixed(2));
            }
             if (!isProductOnDeal && !isBogoEligibleProduct && _selectedStore.dailyDeals && _selectedStore.dailyDeals.length > 0) {
                for (const rule of _selectedStore.dailyDeals) {
                    if (rule.selectedDays.includes(currentDayName) && rule.category === p.category) {
                        isProductOnDeal = true;
                        effectivePrice = parseFloat((originalPriceValue * (1 - rule.discountPercentage / 100)).toFixed(2));
                        break;
                    }
                }
            }
          return {
            ...baseResolvedInfo,
            variantId: p.id,
            price: effectivePrice,
            originalPrice: isProductOnDeal ? originalPriceValue : undefined,
            stock: availabilityForStore.stock,
            isBogoEligible: isBogoEligibleProduct,
          } as ResolvedProduct;
        }
        return null;
      })
      .filter(Boolean) as ResolvedProduct[];
  }, [user?.favoriteProductIds, allProducts, _selectedStore, loadingProducts, user?.isAdmin]);

  const cancelMyOrder = useCallback(async (orderId: string): Promise<boolean> => {
    if (!user || !isAuthenticated) {
      toast({ title: "Not Authenticated", description: "You must be logged in to cancel an order.", variant: "destructive" });
      return false;
    }
    // We will call the backend function to perform cancellation.
    // The server-side logic will check if the user is authorized to cancel.
    try {
      // Assuming a function that handles this securely.
      // await cancelOrderAsUser(orderId, user.id); 
      toast({ title: "Functionality not implemented", description: "Cancelling orders is not yet supported in this version."});
      return false; // Placeholder
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      toast({ title: "Cancellation Failed", description: error.message || "Could not cancel your order.", variant: "destructive" });
      return false;
    }
  }, [user, isAuthenticated]);


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
    displayableStores,
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
    toggleFavoriteProduct,
    isProductFavorited,
    resolvedFavoriteProducts,
    cancelMyOrder,
    canInstallPWA,
    promptPWAInstall,
  }), [
    isAuthenticated, user, login, register, logout, updateUserAvatar, updateUserProfileDetails, cart, addToCart, removeFromCart,
    updateCartQuantity, getCartItemQuantity, getTotalCartItems, clearCart, products, allProducts, deals, getCartSubtotal, getCartTotal, getCartTotalSavings, getPotentialPointsForCart, stores, displayableStores,
    _selectedStore, selectStore, isStoreSelectorOpen, setStoreSelectorOpen,
    loadingAuth, loadingStores, loadingProducts, appliedRedemption, applyRedemption, removeRedemption, finalizeOrder,
    userOrders, loadingUserOrders, fetchUserOrders, toggleFavoriteProduct, isProductFavorited, resolvedFavoriteProducts, cancelMyOrder,
    canInstallPWA, promptPWAInstall
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

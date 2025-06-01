
'use server';

import { collection, getDocs, writeBatch, doc, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { adminDb } from '@/lib/firebaseAdmin'; // Import Admin SDK initialized DB
import type { Store, Product, User } from '@/lib/types';
import { initialStores as initialStoresSeedData } from '@/data/stores';
import { initialProducts as initialProductsSeedData } from '@/data/products';
import type { StoreFormData } from '@/lib/types';

// This function uses Admin SDK, bypassing rules.
export async function seedInitialData() {
  console.log('--- Server Action (Admin SDK): seedInitialData ---');
  try {
    const storesCollection = collection(adminDb, 'stores');
    const storesSnapshot = await getDocs(storesCollection);
    if (storesSnapshot.empty) {
      const batch = writeBatch(adminDb); // Use adminDb
      initialStoresSeedData.forEach(store => {
        const docRef = doc(storesCollection, store.id);
        batch.set(docRef, store);
      });
      await batch.commit();
      console.log('[firestoreService][AdminSDK] Successfully seeded initial stores.');
    } else {
      console.log('[firestoreService][AdminSDK] Stores collection is not empty. Skipping seed.');
    }

    const productsCollection = collection(adminDb, 'products');
    const productsSnapshot = await getDocs(productsCollection);
    if (productsSnapshot.empty) {
      const batch = writeBatch(adminDb); // Use adminDb
      initialProductsSeedData.forEach(product => {
        const docRef = doc(productsCollection, product.id);
        batch.set(docRef, product);
      });
      await batch.commit();
      console.log('[firestoreService][AdminSDK] Successfully seeded initial products.');
    } else {
      console.log('[firestoreService][AdminSDK] Products collection is not empty. Skipping seed.');
    }

  } catch (error) {
    console.error("[firestoreService][AdminSDK] Error seeding initial data:", error);
    throw error; // Re-throw to be caught by the calling client component
  }
}

// Read operations for general app use can continue using client 'db' and respect rules.
// If you need admin-only read operations bypassing rules, create separate functions using adminDb.

// This function uses Admin SDK, bypassing rules.
export async function addStore(storeData: StoreFormData): Promise<string> {
  console.log('--- Server Action (Admin SDK): addStore ---');
  console.log('[firestoreService][AdminSDK][addStore] Attempting to add store:', storeData.name);

  const storesCol = collection(adminDb, 'stores'); // Use adminDb
  const q = query(storesCol, where("name", "==", storeData.name));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const errorMsg = `Store with name "${storeData.name}" already exists.`;
    console.error(`[firestoreService][AdminSDK][addStore] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    const docRef = await addDoc(storesCol, storeData);
    console.log('[firestoreService][AdminSDK][addStore] Store added successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[firestoreService][AdminSDK][addStore] Error during addDoc operation:', error);
    throw error;
  }
}

// This function uses Admin SDK, bypassing rules.
export async function updateStore(storeId: string, storeData: Partial<StoreFormData>): Promise<void> {
  console.log('--- Server Action (Admin SDK): updateStore ---');
  console.log(`[firestoreService][AdminSDK][updateStore] Called for ID: ${storeId} with data:`, JSON.stringify(storeData));
  const storeRef = doc(adminDb, 'stores', storeId); // Use adminDb
  try {
    await updateDoc(storeRef, storeData);
    console.log(`[firestoreService][AdminSDK][updateStore] Store ${storeId} updated successfully.`);
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][updateStore] Error updating store ${storeId}:`, error);
    throw error;
  }
}

// This function uses Admin SDK, bypassing rules.
export async function deleteStore(storeId: string): Promise<void> {
  console.log('--- Server Action (Admin SDK): deleteStore ---');
  console.log(`[firestoreService][AdminSDK][deleteStore] Called for ID: ${storeId}`);
  const storeRef = doc(adminDb, 'stores', storeId); // Use adminDb
  try {
    await deleteDoc(storeRef);
    console.log(`[firestoreService][AdminSDK][deleteStore] Store ${storeId} deleted successfully.`);
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][deleteStore] Error deleting store ${storeId}:`, error);
    throw error;
  }
}

// This function uses Admin SDK, bypassing rules.
export async function addProduct(productData: Omit<Product, 'id'>): Promise<string> {
  console.log('--- Server Action (Admin SDK): addProduct ---');
  console.log('[firestoreService][AdminSDK][addProduct] Called with data:', productData);
  const productsCol = collection(adminDb, 'products'); // Use adminDb
  const docRef = await addDoc(productsCol, productData);
  return docRef.id;
}

// This function uses Admin SDK, bypassing rules.
export async function updateProduct(productId: string, productData: Partial<Product>): Promise<void> {
  console.log('--- Server Action (Admin SDK): updateProduct ---');
  console.log('[firestoreService][AdminSDK][updateProduct] Called with id and data:', productId, productData);
  const productRef = doc(adminDb, 'products', productId); // Use adminDb
  await updateDoc(productRef, productData);
}

// This function uses Admin SDK, bypassing rules.
export async function deleteProduct(productId: string): Promise<void> {
  console.log('--- Server Action (Admin SDK): deleteProduct ---');
  console.log('[firestoreService][AdminSDK][deleteProduct] Called with id:', productId);
  const productRef = doc(adminDb, 'products', productId); // Use adminDb
  await deleteDoc(productRef);
}

// This function uses Admin SDK, bypassing rules.
export async function getAllUsers(): Promise<User[]> {
    console.log('--- Server Action (Admin SDK): getAllUsers ---');
    const usersCol = collection(adminDb, 'users'); // Use adminDb
    const snapshot = await getDocs(usersCol);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as User));
}

// This function uses Admin SDK, bypassing rules.
export async function updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<void> {
    console.log('--- Server Action (Admin SDK): updateUserAdminStatus ---');
    console.log('[firestoreService][AdminSDK][updateUserAdminStatus] Called for userId:', userId, 'isAdmin:', isAdmin);
    const userRef = doc(adminDb, 'users', userId); // Use adminDb
    await updateDoc(userRef, { isAdmin });
}

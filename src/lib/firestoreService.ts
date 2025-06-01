
'use server';

import { collection, getDocs, writeBatch, doc, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
// Use the potentially undefined adminDb and the new adminInitializationError
import { adminDb, adminSDK, adminInitializationError } from '@/lib/firebaseAdmin';
import { auth as clientAuth } from '@/lib/firebase';
import type { Store, Product, User } from '@/lib/types';
import { initialStores as initialStoresSeedData } from '@/data/stores';
import { initialProducts as initialProductsSeedData } from '@/data/products';
import type { StoreFormData } from '@/lib/types';

// Helper function to ensure adminDb is initialized
function ensureAdminDbInitialized(callingFunctionName: string) {
  if (adminInitializationError) {
    const errorMessage = `[firestoreService][${callingFunctionName}] Firebase Admin SDK failed to initialize: ${adminInitializationError.message}. Check server startup logs for errors from 'firebaseAdmin.ts'.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  if (!adminDb) {
    // This case should ideally be covered by adminInitializationError, but acts as a fallback.
    const errorMessage = `[firestoreService][${callingFunctionName}] Firebase Admin SDK (adminDb) is null or undefined. This indicates a critical failure in 'firebaseAdmin.ts' that might not have been caught by adminInitializationError.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

// This function uses Admin SDK, bypassing rules.
export async function seedInitialData() {
  const functionName = 'seedInitialData';
  ensureAdminDbInitialized(functionName); // This will now throw if adminInitializationError is set
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  
  // The following check is problematic if clientAuth.currentUser is not available in server actions
  // For Admin SDK operations, we typically don't rely on clientAuth.currentUser directly in the server action body for auth decisions.
  // The call to a server action should itself be guarded if needed.
  // console.log(`[firestoreService][${functionName}] Server Action clientAuth.currentUser UID: ${clientAuth.currentUser?.uid || 'NOT AVAILABLE in server action (expected for Admin SDK usage)'}`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Seeding initial data if collections are empty.`);

  try {
    // adminDb is asserted as non-null here because ensureAdminDbInitialized would have thrown if it were.
    const storesCollection = collection(adminDb!, 'stores');
    const storesSnapshot = await getDocs(storesCollection);
    if (storesSnapshot.empty) {
      const batch = writeBatch(adminDb!);
      initialStoresSeedData.forEach(store => {
        const docRef = doc(storesCollection, store.id);
        batch.set(docRef, store);
      });
      await batch.commit();
      console.log(`[firestoreService][AdminSDK][${functionName}] Successfully seeded initial stores.`);
    } else {
      console.log(`[firestoreService][AdminSDK][${functionName}] Stores collection is not empty. Skipping seed.`);
    }

    const productsCollection = collection(adminDb!, 'products');
    const productsSnapshot = await getDocs(productsCollection);
    if (productsSnapshot.empty) {
      const batch = writeBatch(adminDb!);
      initialProductsSeedData.forEach(product => {
        const docRef = doc(productsCollection, product.id);
        batch.set(docRef, product);
      });
      await batch.commit();
      console.log(`[firestoreService][AdminSDK][${functionName}] Successfully seeded initial products.`);
    } else {
      console.log(`[firestoreService][AdminSDK][${functionName}] Products collection is not empty. Skipping seed.`);
    }

  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error seeding initial data:`, error);
    throw error; // Re-throw to be caught by the caller if necessary
  }
}

export async function addStore(storeData: StoreFormData): Promise<string> {
  const functionName = 'addStore';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Attempting to add store:`, storeData.name);

  const storesCol = collection(adminDb!, 'stores');
  const q = query(storesCol, where("name", "==", storeData.name));

  try {
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const errorMsg = `Store with name "${storeData.name}" already exists.`;
      console.error(`[firestoreService][AdminSDK][${functionName}] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const docRef = await addDoc(storesCol, storeData);
    console.log(`[firestoreService][AdminSDK][${functionName}] Store added successfully with ID:`, docRef.id);
    return docRef.id;
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error during operation:`, error);
    throw error;
  }
}

export async function updateStore(storeId: string, storeData: Partial<StoreFormData>): Promise<void> {
  const functionName = 'updateStore';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Called for ID: ${storeId} with data:`, JSON.stringify(storeData));

  const storeRef = doc(adminDb!, 'stores', storeId);
  try {
    await updateDoc(storeRef, storeData);
    console.log(`[firestoreService][AdminSDK][${functionName}] Store ${storeId} updated successfully.`);
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error updating store ${storeId}:`, error);
    throw error;
  }
}

export async function deleteStore(storeId: string): Promise<void> {
  const functionName = 'deleteStore';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Called for ID: ${storeId}`);
  
  const storeRef = doc(adminDb!, 'stores', storeId);
  try {
    await deleteDoc(storeRef);
    console.log(`[firestoreService][AdminSDK][${functionName}] Store ${storeId} deleted successfully.`);
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error deleting store ${storeId}:`, error);
    throw error;
  }
}

export async function addProduct(productData: Omit<Product, 'id'>): Promise<string> {
  const functionName = 'addProduct';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Called with data:`, productData);

  const productsCol = collection(adminDb!, 'products');
  try {
    const docRef = await addDoc(productsCol, productData);
    return docRef.id;
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error adding product:`, error);
    throw error;
  }
}

export async function updateProduct(productId: string, productData: Partial<Product>): Promise<void> {
  const functionName = 'updateProduct';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Called with id and data:`, productId, productData);

  const productRef = doc(adminDb!, 'products', productId);
  try {
    await updateDoc(productRef, productData);
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error updating product ${productId}:`, error);
    throw error;
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  const functionName = 'deleteProduct';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Called with id:`, productId);

  const productRef = doc(adminDb!, 'products', productId);
  try {
    await deleteDoc(productRef);
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error deleting product ${productId}:`, error);
    throw error;
  }
}

export async function getAllUsers(): Promise<User[]> {
  const functionName = 'getAllUsers';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);

  const usersCol = collection(adminDb!, 'users');
  try {
    const snapshot = await getDocs(usersCol);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as User));
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error getting all users:`, error);
    throw error;
  }
}

export async function updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<void> {
  const functionName = 'updateUserAdminStatus';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Called for userId:`, userId, 'isAdmin:', isAdmin);

  const userRef = doc(adminDb!, 'users', userId);
  try {
    await updateDoc(userRef, { isAdmin });
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error updating user admin status for ${userId}:`, error);
    throw error;
  }
}

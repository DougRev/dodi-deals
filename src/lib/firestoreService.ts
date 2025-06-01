
'use server';

import { db, auth } from '@/lib/firebase'; // Ensure auth is imported
import { collection, getDocs, writeBatch, doc, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import type { Store, Product, User } from '@/lib/types';
import { initialStores as initialStoresSeedData } from '@/data/stores';
import { initialProducts as initialProductsSeedData } from '@/data/products';
import type { StoreFormData } from '@/lib/types';

export async function seedInitialData() {
  try {
    const storesCollection = collection(db, 'stores');
    const storesSnapshot = await getDocs(storesCollection);
    if (storesSnapshot.empty) {
      const batch = writeBatch(db);
      initialStoresSeedData.forEach(store => {
        const docRef = doc(storesCollection, store.id);
        batch.set(docRef, store);
      });
      await batch.commit();
      console.log('[firestoreService] Successfully seeded initial stores.');
    } else {
      console.log('[firestoreService] Stores collection is not empty. Skipping seed.');
    }

    const productsCollection = collection(db, 'products');
    const productsSnapshot = await getDocs(productsCollection);
    if (productsSnapshot.empty) {
      const batch = writeBatch(db);
      initialProductsSeedData.forEach(product => {
        const docRef = doc(productsCollection, product.id);
        batch.set(docRef, product);
      });
      await batch.commit();
      console.log('[firestoreService] Successfully seeded initial products.');
    } else {
      console.log('[firestoreService] Products collection is not empty. Skipping seed.');
    }

  } catch (error) {
    console.error("[firestoreService] Error seeding initial data:", error);
  }
}


export async function getStores(): Promise<Store[]> {
  const storesCol = collection(db, 'stores');
  const snapshot = await getDocs(storesCol);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Store));
}

export async function addStore(storeData: StoreFormData): Promise<string> {
  console.log('--- Server Action: addStore ---');
  if (auth.currentUser) {
    console.log('[firestoreService][addStore] Server Action auth.currentUser.uid:', auth.currentUser.uid);
    console.log('[firestoreService][addStore] Server Action auth.currentUser.email:', auth.currentUser.email);
  } else {
    console.log('[firestoreService][addStore] Server Action auth.currentUser is NULL.');
  }
  console.log('[firestoreService][addStore] Attempting to add store:', storeData.name);

  const storesCol = collection(db, 'stores');
  const q = query(storesCol, where("name", "==", storeData.name));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const errorMsg = `Store with name "${storeData.name}" already exists.`;
    console.error(`[firestoreService][addStore] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    const docRef = await addDoc(storesCol, storeData);
    console.log('[firestoreService][addStore] Store added successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[firestoreService][addStore] Error during addDoc operation:', error);
    throw error;
  }
}

export async function updateStore(storeId: string, storeData: Partial<StoreFormData>): Promise<void> {
  console.log('--- Server Action: updateStore ---');
   if (auth.currentUser) {
    console.log('[firestoreService][updateStore] Server Action auth.currentUser.uid:', auth.currentUser.uid);
  } else {
    console.log('[firestoreService][updateStore] Server Action auth.currentUser is NULL.');
  }
  console.log(`[firestoreService][updateStore] Called for ID: ${storeId} with data:`, JSON.stringify(storeData));
  const storeRef = doc(db, 'stores', storeId);
  try {
    await updateDoc(storeRef, storeData);
    console.log(`[firestoreService][updateStore] Store ${storeId} updated successfully.`);
  } catch (error) {
    console.error(`[firestoreService][updateStore] Error updating store ${storeId}:`, error);
    throw error;
  }
}

export async function deleteStore(storeId: string): Promise<void> {
  console.log('--- Server Action: deleteStore ---');
  if (auth.currentUser) {
    console.log('[firestoreService][deleteStore] Server Action auth.currentUser.uid:', auth.currentUser.uid);
    console.log('[firestoreService][deleteStore] Server Action auth.currentUser.email:', auth.currentUser.email);
  } else {
    console.log('[firestoreService][deleteStore] Server Action auth.currentUser is NULL.');
  }
  console.log(`[firestoreService][deleteStore] Called for ID: ${storeId}`);
  const storeRef = doc(db, 'stores', storeId);
  try {
    await deleteDoc(storeRef);
    console.log(`[firestoreService][deleteStore] Store ${storeId} deleted successfully.`);
  } catch (error) {
    console.error(`[firestoreService][deleteStore] Error deleting store ${storeId}:`, error);
    throw error;
  }
}


export async function getProductsByStore(storeId: string): Promise<Product[]> {
  console.log('[firestoreService] getProductsByStore called with storeId:', storeId);
  const q = query(collection(db, 'products'), where('storeId', '==', storeId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Product));
}

export async function addProduct(productData: Omit<Product, 'id'>): Promise<string> {
  console.log('--- Server Action: addProduct ---');
  if (auth.currentUser) {
    console.log('[firestoreService][addProduct] Server Action auth.currentUser.uid:', auth.currentUser.uid);
  } else {
    console.log('[firestoreService][addProduct] Server Action auth.currentUser is NULL.');
  }
  console.log('[firestoreService][addProduct] Called with data:', productData);
  const productsCol = collection(db, 'products');
  const docRef = await addDoc(productsCol, productData);
  return docRef.id;
}

export async function updateProduct(productId: string, productData: Partial<Product>): Promise<void> {
  console.log('--- Server Action: updateProduct ---');
  if (auth.currentUser) {
    console.log('[firestoreService][updateProduct] Server Action auth.currentUser.uid:', auth.currentUser.uid);
  } else {
    console.log('[firestoreService][updateProduct] Server Action auth.currentUser is NULL.');
  }
  console.log('[firestoreService][updateProduct] Called with id and data:', productId, productData);
  const productRef = doc(db, 'products', productId);
  await updateDoc(productRef, productData);
}

export async function deleteProduct(productId: string): Promise<void> {
  console.log('--- Server Action: deleteProduct ---');
  if (auth.currentUser) {
    console.log('[firestoreService][deleteProduct] Server Action auth.currentUser.uid:', auth.currentUser.uid);
  } else {
    console.log('[firestoreService][deleteProduct] Server Action auth.currentUser is NULL.');
  }
  console.log('[firestoreService][deleteProduct] Called with id:', productId);
  const productRef = doc(db, 'products', productId);
  await deleteDoc(productRef);
}

export async function getAllUsers(): Promise<User[]> {
    console.log('--- Server Action: getAllUsers ---');
    if (auth.currentUser) {
      console.log('[firestoreService][getAllUsers] Server Action auth.currentUser.uid:', auth.currentUser.uid);
    } else {
      console.log('[firestoreService][getAllUsers] Server Action auth.currentUser is NULL.');
    }
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as User));
}

export async function updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<void> {
    console.log('--- Server Action: updateUserAdminStatus ---');
    if (auth.currentUser) {
      console.log('[firestoreService][updateUserAdminStatus] Server Action auth.currentUser.uid:', auth.currentUser.uid);
    } else {
      console.log('[firestoreService][updateUserAdminStatus] Server Action auth.currentUser is NULL.');
    }
    console.log('[firestoreService][updateUserAdminStatus] Called for userId:', userId, 'isAdmin:', isAdmin);
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { isAdmin });
}

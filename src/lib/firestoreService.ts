
'use server';

import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import type { Store, Product, User } from '@/lib/types';
import { initialStores as initialStoresSeedData } from '@/data/stores';
import { initialProducts as initialProductsSeedData } from '@/data/products';
import type { StoreFormData } from '@/lib/types'; // For addStore/updateStore

export async function seedInitialData() {
  try {
    // Seed Stores
    const storesCollection = collection(db, 'stores');
    const storesSnapshot = await getDocs(storesCollection);
    if (storesSnapshot.empty) {
      const batch = writeBatch(db);
      initialStoresSeedData.forEach(store => {
        const docRef = doc(storesCollection, store.id); // Use predefined ID
        batch.set(docRef, store);
      });
      await batch.commit();
      console.log('Successfully seeded initial stores.');
    } else {
      console.log('Stores collection is not empty. Skipping seed.');
    }

    // Seed Products
    const productsCollection = collection(db, 'products');
    const productsSnapshot = await getDocs(productsCollection);
    if (productsSnapshot.empty) {
      const batch = writeBatch(db);
      initialProductsSeedData.forEach(product => {
        const docRef = doc(productsCollection, product.id); // Use predefined ID
        batch.set(docRef, product);
      });
      await batch.commit();
      console.log('Successfully seeded initial products.');
    } else {
      console.log('Products collection is not empty. Skipping seed.');
    }

  } catch (error) {
    console.error("Error seeding initial data:", error);
    // Depending on the app, you might want to throw the error or handle it gracefully
  }
}


// Store Management Functions
export async function getStores(): Promise<Store[]> {
  const storesCol = collection(db, 'stores');
  const snapshot = await getDocs(storesCol);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
}

export async function addStore(storeData: StoreFormData): Promise<string> {
  const storesCol = collection(db, 'stores');
  // Check if store with same name already exists (optional, good practice)
  const q = query(storesCol, where("name", "==", storeData.name));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    throw new Error(`Store with name "${storeData.name}" already exists.`);
  }
  const docRef = await addDoc(storesCol, storeData);
  return docRef.id;
}

export async function updateStore(storeId: string, storeData: Partial<StoreFormData>): Promise<void> {
  const storeRef = doc(db, 'stores', storeId);
  await updateDoc(storeRef, storeData);
}

export async function deleteStore(storeId: string): Promise<void> {
  const storeRef = doc(db, 'stores', storeId);
  await deleteDoc(storeRef);
}


// Product Management Functions (Placeholders)
export async function getProductsByStore(storeId: string): Promise<Product[]> {
  // Placeholder: Implement Firestore query
  console.log('getProductsByStore called with storeId:', storeId);
  return [];
}

export async function addProduct(productData: Omit<Product, 'id'>): Promise<string> {
  // Placeholder: Implement Firestore add
  console.log('addProduct called with data:', productData);
  const productsCol = collection(db, 'products');
  const docRef = await addDoc(productsCol, productData);
  return docRef.id;
}

export async function updateProduct(productId: string, productData: Partial<Product>): Promise<void> {
  // Placeholder: Implement Firestore update
  console.log('updateProduct called with id and data:', productId, productData);
  const productRef = doc(db, 'products', productId);
  await updateDoc(productRef, productData);
}

export async function deleteProduct(productId: string): Promise<void> {
  // Placeholder: Implement Firestore delete
  console.log('deleteProduct called with id:', productId);
  const productRef = doc(db, 'products', productId);
  await deleteDoc(productRef);
}

// User Management Functions (Placeholders for Admin)
export async function getAllUsers(): Promise<User[]> {
    // Placeholder: Implement Firestore query to get all users (ensure admin-only access via rules)
    console.log('getAllUsers called');
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
}

export async function updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<void> {
    // Placeholder: Implement Firestore update (ensure admin-only access via rules)
    console.log('updateUserAdminStatus called for userId:', userId, 'isAdmin:', isAdmin);
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { isAdmin });
}

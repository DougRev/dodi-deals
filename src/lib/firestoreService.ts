
'use server';

import { adminDb, adminInitializationError } from '@/lib/firebaseAdmin';
import type { Product, User, Order, StoreFormData, StoreRole } from '@/lib/types';
import { initialStores as initialStoresSeedData } from '@/data/stores';
import { initialProducts as initialProductsSeedData } from '@/data/products';

function ensureAdminDbInitialized(callingFunctionName: string) {
  if (adminInitializationError) {
    const errorMessage = `[firestoreService][AdminSDK][${callingFunctionName}] Firebase Admin SDK failed to initialize: ${adminInitializationError.message}. Check server startup logs for errors from 'firebaseAdmin.ts'.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  if (!adminDb) {
    const errorMessage = `[firestoreService][AdminSDK][${callingFunctionName}] Firebase Admin SDK (adminDb) is null or undefined after initialization attempt. This indicates a critical failure in 'firebaseAdmin.ts'. Check server logs.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  if (typeof adminDb.collection !== 'function' || typeof adminDb.doc !== 'function') {
    const errorMessage = `[firestoreService][AdminSDK][${callingFunctionName}] Firebase Admin SDK (adminDb) is defined but appears to be an invalid Firestore instance (missing essential methods like .collection() or .doc()). This suggests a problem with the 'firebase-admin' module or the admin app instance. Check server logs for 'firebaseAdmin.ts' output. AdminDb type: ${typeof adminDb}, AdminDb value: ${String(adminDb).substring(0,100)}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

export async function seedInitialData() {
  const functionName = 'seedInitialData';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Seeding initial data if collections are empty.`);

  try {
    const storesCollectionRef = adminDb!.collection('stores');
    const storesSnapshot = await storesCollectionRef.get();
    if (storesSnapshot.empty) {
      const batch = adminDb!.batch();
      initialStoresSeedData.forEach(store => {
        const docRef = storesCollectionRef.doc(store.id);
        batch.set(docRef, store);
      });
      await batch.commit();
      console.log(`[firestoreService][AdminSDK][${functionName}] Successfully seeded initial stores.`);
    } else {
      console.log(`[firestoreService][AdminSDK][${functionName}] Stores collection is not empty. Skipping seed.`);
    }

    const productsCollectionRef = adminDb!.collection('products');
    const productsSnapshot = await productsCollectionRef.get();
    if (productsSnapshot.empty) {
      const batch = adminDb!.batch();
      initialProductsSeedData.forEach(product => {
        const docRef = productsCollectionRef.doc(product.id);
        batch.set(docRef, product);
      });
      await batch.commit();
      console.log(`[firestoreService][AdminSDK][${functionName}] Successfully seeded initial products.`);
    } else {
      console.log(`[firestoreService][AdminSDK][${functionName}] Products collection is not empty. Skipping seed.`);
    }

  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error seeding initial data:`, error);
    throw error;
  }
}

export async function addStore(storeData: StoreFormData): Promise<string> {
  const functionName = 'addStore';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Attempting to add store:`, storeData.name);

  const storesColRef = adminDb!.collection('stores');
  const q = storesColRef.where("name", "==", storeData.name);

  try {
    const querySnapshot = await q.get();
    if (!querySnapshot.empty) {
      const errorMsg = `Store with name "${storeData.name}" already exists.`;
      console.error(`[firestoreService][AdminSDK][${functionName}] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const docRef = await storesColRef.add(storeData);
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

  const storeRef = adminDb!.collection('stores').doc(storeId);
  try {
    await storeRef.update(storeData);
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
  
  const storeRef = adminDb!.collection('stores').doc(storeId);
  try {
    await storeRef.delete();
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

  const productsColRef = adminDb!.collection('products');
  try {
    const docRef = await productsColRef.add(productData);
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

  const productRef = adminDb!.collection('products').doc(productId);
  try {
    await productRef.update(productData);
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

  const productRef = adminDb!.collection('products').doc(productId);
  try {
    await productRef.delete();
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error deleting product ${productId}:`, error);
    throw error;
  }
}

export async function getAllUsers(): Promise<User[]> {
  const functionName = 'getAllUsers';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);

  const usersColRef = adminDb!.collection('users');
  try {
    const snapshot = await usersColRef.get();
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return { 
        id: docSnap.id, 
        ...data,
        assignedStoreId: data.assignedStoreId || null,
        storeRole: data.storeRole || null, // Ensure storeRole is fetched
      } as User;
    });
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error getting all users:`, error);
    throw error;
  }
}

export async function updateUserConfiguration(
  userId: string,
  updates: {
    isAdmin?: boolean;
    assignedStoreId?: string | null;
    storeRole?: StoreRole | null;
  }
): Promise<void> {
  const functionName = 'updateUserConfiguration';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Called for userId: ${userId} with raw updates:`, JSON.stringify(updates));

  const userRef = adminDb!.collection('users').doc(userId);
  const updatePayload: { [key: string]: any } = {};

  // Determine isAdmin status first
  if (typeof updates.isAdmin === 'boolean') {
    updatePayload.isAdmin = updates.isAdmin;
  }

  // If isAdmin is being set to true, or is already true and not being changed
  const effectiveIsAdmin = updatePayload.isAdmin ?? (await userRef.get().then(doc => doc.exists && (doc.data() as User).isAdmin));

  if (effectiveIsAdmin) {
    updatePayload.assignedStoreId = null;
    updatePayload.storeRole = null;
  } else {
    // Handle assignedStoreId
    if (updates.assignedStoreId !== undefined) {
      updatePayload.assignedStoreId = updates.assignedStoreId;
    }

    // Handle storeRole
    if (updatePayload.assignedStoreId === null) { // If unassigning store (either directly or because isAdmin became true)
      updatePayload.storeRole = null;
    } else if (updates.storeRole !== undefined) { // If storeRole is explicitly provided
        // Only set role if a store is (or will be) assigned
        if (updatePayload.assignedStoreId !== undefined && updatePayload.assignedStoreId !== null) {
             updatePayload.storeRole = updates.storeRole;
        } else if (updatePayload.assignedStoreId === undefined) { // storeId not changing in this update, check current
            const currentDoc = await userRef.get();
            if (currentDoc.exists && (currentDoc.data() as User).assignedStoreId) {
                updatePayload.storeRole = updates.storeRole;
            } else if (updates.storeRole !== null) { // trying to set a role without any store assigned
                 console.warn(`[firestoreService][AdminSDK][${functionName}] User ${userId} has no assigned store. Cannot set storeRole to '${updates.storeRole}'. Role will be set to null.`);
                 updatePayload.storeRole = null;
            } else {
                 updatePayload.storeRole = null; // setting role to null is fine
            }
        }
    } else if (updatePayload.assignedStoreId && updatePayload.storeRole === undefined) {
        // If store is being assigned and no role is specified, default to 'Employee'
        // This can happen if admin picks a store, and we need a default role.
        updatePayload.storeRole = 'Employee';
    }
  }
  
  if (Object.keys(updatePayload).length === 0) {
    console.log(`[firestoreService][AdminSDK][${functionName}] No valid updates to perform for user ${userId}.`);
    return;
  }

  try {
    await userRef.update(updatePayload);
    console.log(`[firestoreService][AdminSDK][${functionName}] User ${userId} configuration updated successfully with:`, updatePayload);
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error updating user configuration for ${userId}:`, error);
    throw error;
  }
}


export async function updateUserNameInFirestore(userId: string, newName: string): Promise<void> {
  const functionName = 'updateUserNameInFirestore';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Updating name for userId: ${userId} to: ${newName}`);

  const userRef = adminDb!.collection('users').doc(userId);
  try {
    await userRef.update({ name: newName });
    console.log(`[firestoreService][AdminSDK][${functionName}] User name updated successfully for ${userId}.`);
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error updating user name for ${userId}:`, error);
    throw error;
  }
}

export async function updateUserAvatar(userId: string, avatarUrl: string): Promise<void> {
  const functionName = 'updateUserAvatar';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Called for userId:`, userId, 'with avatarUrl:', avatarUrl);

  const userRef = adminDb!.collection('users').doc(userId);
  try {
    await userRef.update({ avatarUrl: avatarUrl });
    console.log(`[firestoreService][AdminSDK][${functionName}] User avatar updated successfully for ${userId}.`);
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error updating user avatar for ${userId}:`, error);
    throw error;
  }
}

export async function createOrder(orderData: Omit<Order, 'id' | 'orderDate' | 'status'>): Promise<string> {
  const functionName = 'createOrder';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  const fullOrderData: Omit<Order, 'id'> = {
    ...orderData,
    orderDate: new Date().toISOString(),
    status: "Pending Confirmation",
  };
  console.log(`[firestoreService][AdminSDK][${functionName}] Creating order with data:`, JSON.stringify(fullOrderData));

  const ordersColRef = adminDb!.collection('orders');
  try {
    const docRef = await ordersColRef.add(fullOrderData);
    console.log(`[firestoreService][AdminSDK][${functionName}] Order created successfully with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error creating order:`, error);
    throw error;
  }
}

export async function deductUserPoints(userId: string, pointsToDeduct: number): Promise<void> {
  const functionName = 'deductUserPoints';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Deducting ${pointsToDeduct} points from user ${userId}`);

  const userRef = adminDb!.collection('users').doc(userId);
  try {
    await adminDb!.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error(`User ${userId} not found.`);
      }
      const currentPoints = (userDoc.data() as User).points || 0;
      if (currentPoints < pointsToDeduct) {
        throw new Error(`User ${userId} does not have enough points. Has ${currentPoints}, needs ${pointsToDeduct}.`);
      }
      const newPoints = currentPoints - pointsToDeduct;
      transaction.update(userRef, { points: newPoints });
    });
    console.log(`[firestoreService][AdminSDK][${functionName}] Points deducted successfully for user ${userId}.`);
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error deducting points for user ${userId}:`, error);
    throw error;
  }
}

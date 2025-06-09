
'use server';

import { adminDb, adminInitializationError } from '@/lib/firebaseAdmin';
import type { Product, User, Order, StoreFormData, StoreRole, StoreAvailability, OrderItem, OrderStatus } from '@/lib/types'; // Added OrderItem, OrderStatus
import { initialStores as initialStoresSeedData } from '@/data/stores';
import { initialProducts as initialProductsSeedData } from '@/data/products';

// Type for Firestore Transaction, assuming firebase-admin
import type { FirebaseFirestore } from 'firebase-admin/firestore';


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
        storeRole: data.storeRole || null, 
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

  if (typeof updates.isAdmin === 'boolean') {
    updatePayload.isAdmin = updates.isAdmin;
  }

  const effectiveIsAdmin = updatePayload.isAdmin ?? (await userRef.get().then(doc => doc.exists && (doc.data() as User).isAdmin));

  if (effectiveIsAdmin) {
    updatePayload.assignedStoreId = null;
    updatePayload.storeRole = null;
  } else {
    if (updates.assignedStoreId !== undefined) {
      updatePayload.assignedStoreId = updates.assignedStoreId;
    }

    if (updatePayload.assignedStoreId === null) { 
      updatePayload.storeRole = null;
    } else if (updates.storeRole !== undefined) { 
        if (updatePayload.assignedStoreId !== undefined && updatePayload.assignedStoreId !== null) {
             updatePayload.storeRole = updates.storeRole;
        } else if (updatePayload.assignedStoreId === undefined) { 
            const currentDoc = await userRef.get();
            if (currentDoc.exists && (currentDoc.data() as User).assignedStoreId) {
                updatePayload.storeRole = updates.storeRole;
            } else if (updates.storeRole !== null) { 
                 console.warn(`[firestoreService][AdminSDK][${functionName}] User ${userId} has no assigned store. Cannot set storeRole to '${updates.storeRole}'. Role will be set to null.`);
                 updatePayload.storeRole = null;
            } else {
                 updatePayload.storeRole = null; 
            }
        }
    } else if (updatePayload.assignedStoreId && updatePayload.storeRole === undefined) {
        const currentDoc = await userRef.get();
        if (currentDoc.exists && !(currentDoc.data() as User).storeRole) {
             updatePayload.storeRole = 'Employee';
        }
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

export async function createOrderInFirestore(
  orderData: Omit<Order, 'id' | 'orderDate' | 'status' | 'pointsEarned'>
): Promise<{orderId: string, pointsCalculatedForOrder: number }> {
  const functionName = 'createOrderInFirestore (Transactional)';
  ensureAdminDbInitialized(functionName);

  const pointsCalculated = Math.floor(orderData.finalTotal * 2); // 2 points per $1 on finalTotal

  const fullOrderData: Omit<Order, 'id'> = {
    ...orderData,
    orderDate: new Date().toISOString(),
    status: "Pending Confirmation",
    pointsEarned: pointsCalculated, // Store calculated points on the order
  };
  console.log(`[firestoreService][AdminSDK][${functionName}] Attempting to create order:`, JSON.stringify(fullOrderData));

  const ordersColRef = adminDb!.collection('orders');
  const productsColRef = adminDb!.collection('products');

  try {
    const orderId = await adminDb!.runTransaction(async (transaction) => {
      // 1. Validate stock and prepare product updates
      const productUpdates: { ref: FirebaseFirestore.DocumentReference; newAvailability: StoreAvailability[] }[] = [];

      for (const item of fullOrderData.items) {
        const productRef = productsColRef.doc(item.productId);
        const productDoc = await transaction.get(productRef);

        if (!productDoc.exists) {
          throw new Error(`Product ${item.productName} (ID: ${item.productId}) not found.`);
        }

        const product = productDoc.data() as Product;
        const storeAvailability = product.availability.find(avail => avail.storeId === fullOrderData.storeId);

        if (!storeAvailability) {
          throw new Error(`Product ${item.productName} is not configured for store ${fullOrderData.storeName}.`);
        }

        if (storeAvailability.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productName} at ${fullOrderData.storeName}. Available: ${storeAvailability.stock}, Requested: ${item.quantity}.`);
        }

        const newAvailabilityArray = product.availability.map(avail =>
          avail.storeId === fullOrderData.storeId
            ? { ...avail, stock: avail.stock - item.quantity }
            : avail
        );
        productUpdates.push({ ref: productRef, newAvailability: newAvailabilityArray });
      }

      // 2. Create the order document
      const newOrderRef = ordersColRef.doc(); // Auto-generate ID
      transaction.set(newOrderRef, fullOrderData);

      // 3. Apply product stock updates
      for (const update of productUpdates) {
        transaction.update(update.ref, { availability: update.newAvailability });
      }

      return newOrderRef.id;
    });

    console.log(`[firestoreService][AdminSDK][${functionName}] Order ${orderId} created and stock updated successfully. Points transaction deferred to order completion.`);
    return { orderId, pointsCalculatedForOrder: pointsCalculated };
  } catch (error: any) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Transaction failed:`, error.message, error.stack);
    throw new Error(error.message || `Failed to create order due to an unexpected issue.`);
  }
}


export async function getUserOrders(userId: string): Promise<Order[]> {
  const functionName = 'getUserOrders';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Fetching orders for userId: ${userId}`);

  const ordersColRef = adminDb!.collection('orders');
  try {
    const snapshot = await ordersColRef
      .where('userId', '==', userId)
      .orderBy('orderDate', 'desc')
      .get();

    if (snapshot.empty) {
      console.log(`[firestoreService][AdminSDK][${functionName}] No orders found for user ${userId}.`);
      return [];
    }

    const orders = snapshot.docs.map(docSnap => {
      return { id: docSnap.id, ...docSnap.data() } as Order;
    });
    console.log(`[firestoreService][AdminSDK][${functionName}] Found ${orders.length} orders for user ${userId}.`);
    return orders;
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error fetching orders for user ${userId}:`, error);
    throw error;
  }
}

export async function getStoreOrdersByStatus(storeId: string, statuses: OrderStatus[]): Promise<Order[]> {
  const functionName = 'getStoreOrdersByStatus';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Fetching orders for storeId: ${storeId} with statuses: ${statuses.join(', ')}`);

  const ordersColRef = adminDb!.collection('orders');
  try {
    const snapshot = await ordersColRef
      .where('storeId', '==', storeId)
      .where('status', 'in', statuses)
      .orderBy('orderDate', 'asc')
      .get();

    if (snapshot.empty) {
      console.log(`[firestoreService][AdminSDK][${functionName}] No orders found for store ${storeId} with specified statuses.`);
      return [];
    }

    const orders = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Order));
    console.log(`[firestoreService][AdminSDK][${functionName}] Found ${orders.length} orders.`);
    return orders;
  } catch (error: any) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error fetching store orders by status:`, error);
    if (error.message && error.message.includes("query requires an index")) {
        console.error(`[firestoreService][AdminSDK][${functionName}] Firestore index missing. Please create the following composite index:`);
        console.error(`Collection: orders, Fields: storeId (ASC), status (ASC), orderDate (ASC)`);
    }
    throw error;
  }
}

export async function updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<void> {
  const functionName = 'updateOrderStatus (Transactional)';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Updating status for orderId: ${orderId} to: ${newStatus}`);

  const orderRef = adminDb!.collection('orders').doc(orderId);

  try {
    if (newStatus === "Completed") {
      await adminDb!.runTransaction(async (transaction) => {
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists) throw new Error(`Order ${orderId} not found for completion.`);
        const orderData = orderDoc.data() as Order;

        if (orderData.userId) {
          const userRef = adminDb!.collection('users').doc(orderData.userId);
          const userDoc = await transaction.get(userRef);
          if (userDoc.exists) {
            const userData = userDoc.data() as User;
            const currentPoints = userData.points || 0;
            const pointsEarnedOnOrder = orderData.pointsEarned || 0;
            const pointsRedeemedOnOrder = orderData.pointsRedeemed || 0;

            const finalUserPoints = currentPoints + pointsEarnedOnOrder - pointsRedeemedOnOrder;
            
            transaction.update(userRef, { points: Math.max(0, finalUserPoints) });
            console.log(`[firestoreService][AdminSDK][${functionName}] Points finalized for user ${orderData.userId}. Earned: ${pointsEarnedOnOrder}, Redeemed: ${pointsRedeemedOnOrder}, New Balance: ${Math.max(0, finalUserPoints)}.`);
          } else {
            console.warn(`[firestoreService][AdminSDK][${functionName}] User ${orderData.userId} not found for points update on order ${orderId} completion.`);
          }
        }
        transaction.update(orderRef, { status: newStatus });
        console.log(`[firestoreService][AdminSDK][${functionName}] Order ${orderId} status updated to Completed and points processed.`);
      });
    } else if (newStatus === "Cancelled") {
      await adminDb!.runTransaction(async (transaction) => {
        // --- Phase 1: All Reads ---
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists) throw new Error(`Order ${orderId} not found for cancellation.`);
        const orderData = orderDoc.data() as Order;

        // Collect all product refs and their corresponding items for stock reversal
        const productReadPromises: Promise<FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>>[] = [];
        const productRefsAndItems: { ref: FirebaseFirestore.DocumentReference, item: OrderItem }[] = [];

        for (const item of orderData.items) {
          const productRef = adminDb!.collection('products').doc(item.productId);
          productRefsAndItems.push({ ref: productRef, item });
          productReadPromises.push(transaction.get(productRef));
        }
        
        const productDocSnapshots = await Promise.all(productReadPromises);

        // --- Phase 2: All Writes ---
        for (let i = 0; i < productDocSnapshots.length; i++) {
          const productDocSnapshot = productDocSnapshots[i];
          const { ref: productRef, item } = productRefsAndItems[i];

          if (productDocSnapshot.exists) {
            const product = productDocSnapshot.data() as Product;
            const newAvailabilityArray = product.availability.map(avail =>
              avail.storeId === orderData.storeId
                ? { ...avail, stock: avail.stock + item.quantity } // Add back stock
                : avail
            );
            transaction.update(productRef, { availability: newAvailabilityArray });
            console.log(`[firestoreService][AdminSDK][${functionName}] Stock for product ${item.productId} will be reverted by ${item.quantity} for cancelled order ${orderId}.`);
          } else {
            console.warn(`[firestoreService][AdminSDK][${functionName}] Product ${item.productId} not found during stock revert for cancelled order ${orderId}. Stock not reverted for this item.`);
          }
        }
        
        transaction.update(orderRef, { status: newStatus });
        console.log(`[firestoreService][AdminSDK][${functionName}] Order ${orderId} status will be updated to Cancelled and stock reverted.`);
      });
      console.log(`[firestoreService][AdminSDK][${functionName}] Transaction for cancelling order ${orderId} committed successfully.`);
    } else {
      // For other status changes (e.g., Pending Confirmation -> Preparing)
      await orderRef.update({ status: newStatus });
      console.log(`[firestoreService][AdminSDK][${functionName}] Order ${orderId} status updated to ${newStatus}.`);
    }
  } catch (error: any) {
     console.error(`[firestoreService][AdminSDK][${functionName}] Transaction failed for order ${orderId} to status ${newStatus}:`, error.message, error.stack);
     throw new Error(error.message || `Failed to update order ${orderId} status due to an unexpected issue.`);
  }
}
    

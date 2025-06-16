
'use server';

import { adminDb, adminInitializationError, adminAuth as firebaseAdminAuthModule } from '@/lib/firebaseAdmin';
import type { Product, User, Order, StoreFormData, StoreRole, StoreAvailability, OrderItem, OrderStatus, FlowerWeight, CancellationReason, ProductFormData } from '@/lib/types'; // Added FlowerWeight, CancellationReason
import { initialStores as initialStoresSeedData } from '@/data/stores';
import { initialProducts as initialProductsSeedData } from '@/data/products';
import { flowerWeightToGrams, productCategories } from '@/lib/types';


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

export async function addProductByManager(
  productCoreData: Pick<ProductFormData, 'name' | 'description' | 'brand' | 'category' | 'baseImageUrl' | 'dataAiHint'>,
  managerStoreAvailabilityData: StoreAvailability, 
  managerUserId: string
): Promise<string> {
  const functionName = 'addProductByManager';
  ensureAdminDbInitialized(functionName);
  console.log(`[firestoreService][AdminSDK][${functionName}] Start. Manager: ${managerUserId}, Product Name: ${productCoreData.name}`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Received productCoreData:`, JSON.stringify(productCoreData, null, 2));
  console.log(`[firestoreService][AdminSDK][${functionName}] Received managerStoreAvailabilityData:`, JSON.stringify(managerStoreAvailabilityData, null, 2));


  const managerUserRef = adminDb!.collection('users').doc(managerUserId);
  try {
    const managerDoc = await managerUserRef.get();
    if (!managerDoc.exists) {
      console.error(`[firestoreService][AdminSDK][${functionName}] Error: Manager user ${managerUserId} does not exist.`);
      throw new Error("Manager user performing action does not exist.");
    }
    const managerData = managerDoc.data() as User;
    console.log(`[firestoreService][AdminSDK][${functionName}] Manager data retrieved:`, JSON.stringify(managerData, null, 2));

    if (managerData.storeRole !== 'Manager' || !managerData.assignedStoreId) {
      console.error(`[firestoreService][AdminSDK][${functionName}] Error: User ${managerUserId} is not a manager or not assigned to a store. Role: ${managerData.storeRole}, Store ID: ${managerData.assignedStoreId}`);
      throw new Error("User is not a manager or not assigned to a store.");
    }
    if (managerData.assignedStoreId !== managerStoreAvailabilityData.storeId) {
      console.error(`[firestoreService][AdminSDK][${functionName}] Error: Manager ${managerUserId} attempting to add product to store ${managerStoreAvailabilityData.storeId} but is assigned to ${managerData.assignedStoreId}.`);
      throw new Error("Manager attempting to add product to a store they are not assigned to.");
    }
    console.log(`[firestoreService][AdminSDK][${functionName}] Manager permission checks passed.`);

    // Ensure brand for Flower is Dodi Hemp (already handled by client, but good to double-check or enforce server-side if necessary)
    let finalProductCoreData = { ...productCoreData };
    if (finalProductCoreData.category === 'Flower' && finalProductCoreData.brand !== 'Dodi Hemp') {
        console.warn(`[firestoreService][AdminSDK][${functionName}] Overriding brand to 'Dodi Hemp' for Flower product.`);
        finalProductCoreData.brand = 'Dodi Hemp';
    }
    
    const newProductData: Omit<Product, 'id'> = {
      ...finalProductCoreData,
      isFeatured: false, 
      availability: [managerStoreAvailabilityData], 
    };
    console.log(`[firestoreService][AdminSDK][${functionName}] Final newProductData to be added:`, JSON.stringify(newProductData, null, 2));

    const productsColRef = adminDb!.collection('products');
    const docRef = await productsColRef.add(newProductData);
    console.log(`[firestoreService][AdminSDK][${functionName}] Product added successfully by manager ${managerUserId} with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error: any) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error adding product by manager ${managerUserId} for product ${productCoreData.name}:`, error.message, error.stack);
    throw error; // Re-throw to be caught by client
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
        noShowStrikes: data.noShowStrikes || 0, 
        isBanned: data.isBanned || false,       
      } as User;
    });
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error getting all users:`, error);
    throw error;
  }
}

export async function updateUserConfiguration(
  targetUserId: string,
  updates: {
    isAdmin?: boolean;
    assignedStoreId?: string | null;
    storeRole?: StoreRole | null;
  },
  callingUserId: string 
): Promise<void> {
  const functionName = 'updateUserConfiguration';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Target User: ${targetUserId}, Updates: ${JSON.stringify(updates)}, Caller: ${callingUserId}`);

  const callingUserRef = adminDb!.collection('users').doc(callingUserId);
  const targetUserRef = adminDb!.collection('users').doc(targetUserId);

  const callingUserDoc = await callingUserRef.get();
  if (!callingUserDoc.exists) {
    throw new Error("Calling user performing update does not exist.");
  }
  const callingUserData = callingUserDoc.data() as User;

  const targetUserDoc = await targetUserRef.get();
  if (!targetUserDoc.exists) {
    throw new Error("Target user to be updated does not exist.");
  }
  const targetUserData = targetUserDoc.data() as User;

  const updatePayload: { [key: string]: any } = {};
  let canProceed = false;

  if (callingUserData.isAdmin) {
    canProceed = true;
    if (typeof updates.isAdmin === 'boolean') {
      updatePayload.isAdmin = updates.isAdmin;
      if (updatePayload.isAdmin) { 
        updatePayload.assignedStoreId = null;
        updatePayload.storeRole = null;
      }
    }
    if (!updatePayload.isAdmin) {
      if (updates.assignedStoreId !== undefined) {
        updatePayload.assignedStoreId = updates.assignedStoreId;
      }
      if (updatePayload.assignedStoreId === null) { 
        updatePayload.storeRole = null;
      } else if (updates.storeRole !== undefined) { 
        updatePayload.storeRole = updates.storeRole;
      } else if (updatePayload.assignedStoreId && targetUserData.storeRole === null) { 
        updatePayload.storeRole = 'Employee'; 
      }
    }
  }
  else if (callingUserData.storeRole === 'Manager' && callingUserData.assignedStoreId) {
    if (targetUserData.isAdmin) {
      throw new Error("Managers cannot modify Admin users.");
    }
    if (updates.isAdmin === true) {
      throw new Error("Managers cannot grant Admin status.");
    }
    if (updates.storeRole && updates.storeRole !== 'Employee') {
      throw new Error("Managers can only assign the 'Employee' role.");
    }

    if (updates.assignedStoreId === callingUserData.assignedStoreId && updates.storeRole === 'Employee') {
      if (targetUserData.assignedStoreId === null || targetUserData.assignedStoreId === callingUserData.assignedStoreId) {
        canProceed = true;
        updatePayload.assignedStoreId = callingUserData.assignedStoreId;
        updatePayload.storeRole = 'Employee';
        updatePayload.isAdmin = false; 
      } else {
        throw new Error("Managers can only assign employees to their own store if the user is unassigned or already part of their store.");
      }
    }
    else if (updates.assignedStoreId === null && targetUserData.assignedStoreId === callingUserData.assignedStoreId && targetUserData.storeRole === 'Employee') {
        canProceed = true;
        updatePayload.assignedStoreId = null;
        updatePayload.storeRole = null;
        updatePayload.isAdmin = false;
    }
    else {
      throw new Error("Manager permission denied for this user update operation. Ensure you are assigning an 'Employee' to your own store or removing an existing employee from your store.");
    }
  } else {
    throw new Error("Permission denied. Only Admins or authorized Managers can update user configurations.");
  }

  if (!canProceed || Object.keys(updatePayload).length === 0) {
    console.log(`[firestoreService][AdminSDK][${functionName}] No valid updates to perform for user ${targetUserId} by caller ${callingUserId}. Update payload: ${JSON.stringify(updatePayload)}`);
    return;
  }

  try {
    await targetUserRef.update(updatePayload);
    console.log(`[firestoreService][AdminSDK][${functionName}] User ${targetUserId} configuration updated successfully by ${callingUserId} with:`, updatePayload);
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error updating user configuration for ${targetUserId} by ${callingUserId}:`, error);
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
  orderData: Omit<Order, 'id' | 'orderDate' | 'status'> & { pointsEarned: number }
): Promise<{orderId: string }> {
  const functionName = 'createOrderInFirestore (Transactional)';
  ensureAdminDbInitialized(functionName);

  const fullOrderData: Omit<Order, 'id'> = {
    ...orderData,
    orderDate: new Date().toISOString(),
    status: "Pending Confirmation",
  };
  console.log(`[firestoreService][AdminSDK][${functionName}] Attempting to create order:`, JSON.stringify(fullOrderData));

  const ordersColRef = adminDb!.collection('orders');
  const productsColRef = adminDb!.collection('products');

  try {
    const orderId = await adminDb!.runTransaction(async (transaction) => {
      const productUpdates: { ref: FirebaseFirestore.DocumentReference; newAvailability: StoreAvailability[] }[] = [];

      for (const item of fullOrderData.items) {
        if (!item.productId || typeof item.productId !== 'string' || item.productId.trim() === '') {
          console.error(`[firestoreService][AdminSDK][${functionName}] Transaction Error: Invalid productId found in order items. Product: ${item.productName}, Provided ID: '${item.productId}'`);
          throw new Error(`Invalid product ID ('${item.productId}') for item '${item.productName}' in order.`);
        }
        const productRef = productsColRef.doc(item.productId);
        const productDoc = await transaction.get(productRef);

        if (!productDoc.exists) {
          throw new Error(`Product ${item.productName} (ID: ${item.productId}) not found.`);
        }

        const product = productDoc.data() as Product;
        let storeAvailability = product.availability.find(avail => avail.storeId === fullOrderData.storeId);

        if (!storeAvailability) {
          throw new Error(`Product ${item.productName} is not configured for store ${fullOrderData.storeName}.`);
        }

        if (product.category === 'Flower') {
          if (!item.selectedWeight) {
            throw new Error(`Flower product ${item.productName} in order is missing selected weight.`);
          }
          const orderedGrams = flowerWeightToGrams(item.selectedWeight) * item.quantity;
          if (storeAvailability.totalStockInGrams === undefined || storeAvailability.totalStockInGrams < orderedGrams) {
            throw new Error(`Insufficient stock for ${item.productName} (${item.selectedWeight}). Available grams: ${storeAvailability.totalStockInGrams || 0}, Requested grams: ${orderedGrams}.`);
          }
          const newTotalStockInGrams = (storeAvailability.totalStockInGrams || 0) - orderedGrams;
          storeAvailability = { ...storeAvailability, totalStockInGrams: newTotalStockInGrams };

        } else { 
          if (storeAvailability.stock === undefined || storeAvailability.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${item.productName}. Available: ${storeAvailability.stock || 0}, Requested: ${item.quantity}.`);
          }
          storeAvailability = { ...storeAvailability, stock: (storeAvailability.stock || 0) - item.quantity };
        }

        const newAvailabilityArray = product.availability.map(avail =>
          avail.storeId === fullOrderData.storeId
            ? storeAvailability
            : avail
        );
        productUpdates.push({ ref: productRef, newAvailability: newAvailabilityArray });
      }

      const newOrderRef = ordersColRef.doc();
      transaction.set(newOrderRef, fullOrderData);

      for (const update of productUpdates) {
        transaction.update(update.ref, { availability: update.newAvailability });
      }

      return newOrderRef.id;
    });

    console.log(`[firestoreService][AdminSDK][${functionName}] Order ${orderId} created and stock updated successfully. Points will be processed upon completion.`);
    return { orderId };
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
        console.error(`Collection: orders, Fields: storeId (ASC), status (IN), orderDate (ASC)`);
    }
    throw error;
  }
}

export async function updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    cancellationReason?: CancellationReason,
    cancellationDescription?: string
): Promise<void> {
  const functionName = 'updateOrderStatus (Transactional)';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Updating status for orderId: ${orderId} to: ${newStatus}. Reason: ${cancellationReason}, Desc: ${cancellationDescription}`);

  const orderRef = adminDb!.collection('orders').doc(orderId);
  const usersColRef = adminDb!.collection('users');
  const productsColRef = adminDb!.collection('products');

  try {
    await adminDb!.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) throw new Error(`Order ${orderId} not found.`);
      const orderData = orderDoc.data() as Order;

      let userDocForUpdate: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData> | null = null;
      let productDocsForReversal: Array<{
          snap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>; 
          item: OrderItem;
          productRef: FirebaseFirestore.DocumentReference;
      }> = [];

      if (newStatus === "Cancelled") {
        const productReadPromises = orderData.items.map(async (item) => {
          if (!item.productId || typeof item.productId !== 'string' || item.productId.trim() === '') {
             console.error(`[firestoreService][AdminSDK][${functionName}] Transaction Error during pre-read: Invalid productId in order items. Product: ${item.productName}, ID: '${item.productId}'`);
             throw new Error(`Invalid product ID ('${item.productId}') for item '${item.productName}' in order ${orderId}.`);
          }
          const productRef = productsColRef.doc(item.productId);
          const snap = await transaction.get(productRef); 
           if (!snap) { 
            console.error(`[firestoreService][AdminSDK][${functionName}] Transaction Error during pre-read: transaction.get(productRef) returned falsy for productId: ${item.productId}`);
            throw new Error(`Failed to read product snapshot for ${item.productId} in order ${orderId}.`);
          }
          return { snap, item, productRef }; 
        });
        productDocsForReversal = await Promise.all(productReadPromises);

        if (cancellationReason === "Customer No-Show" && orderData.userId) {
          const userRef = usersColRef.doc(orderData.userId);
          userDocForUpdate = await transaction.get(userRef);
        }
      } else if (newStatus === "Completed") {
        if (orderData.userId) {
            const userRef = usersColRef.doc(orderData.userId);
            userDocForUpdate = await transaction.get(userRef);
        }
      }

      const orderUpdates: Partial<Order> = { status: newStatus };

      if (newStatus === "Completed") {
        if (orderData.userId && userDocForUpdate && userDocForUpdate.exists) {
          const userData = userDocForUpdate.data() as User;
          const currentPoints = userData.points || 0;
          const pointsEarnedOnOrder = orderData.pointsEarned || 0;
          const pointsRedeemedOnOrder = orderData.pointsRedeemed || 0;
          const finalUserPoints = currentPoints + pointsEarnedOnOrder - pointsRedeemedOnOrder;

          transaction.update(usersColRef.doc(orderData.userId), { points: Math.max(0, finalUserPoints) });
          console.log(`[firestoreService][AdminSDK][${functionName}] Points finalized for user ${orderData.userId}. Earned: ${pointsEarnedOnOrder}, Redeemed: ${pointsRedeemedOnOrder}, New Balance: ${Math.max(0, finalUserPoints)}.`);
        } else if (orderData.userId) {
          console.warn(`[firestoreService][AdminSDK][${functionName}] User ${orderData.userId} not found (or userDocForUpdate was null/not existent) for points update on order ${orderId} completion.`);
        }
      } else if (newStatus === "Cancelled") {
        orderUpdates.cancellationReason = cancellationReason;
        orderUpdates.cancellationDescription = cancellationDescription || "";

        for (const productInfo of productDocsForReversal) {
          if (!productInfo || !productInfo.snap) { 
            console.error(`[firestoreService][AdminSDK][${functionName}] Transaction Write Error: productInfo or productInfo.snap is undefined in productDocsForReversal. Item:`, productInfo?.item?.productName);
            throw new Error(`Critical error processing stock reversal: snap missing for product ${productInfo?.item?.productName} in order ${orderId}.`);
          }
          const { snap: productDocSnap, item, productRef: productRefToUpdate } = productInfo; 

          if (productDocSnap.exists) { 
            const product = productDocSnap.data() as Product;
            let storeAvailabilityToUpdate = product.availability.find(avail => avail.storeId === orderData.storeId);
            if (storeAvailabilityToUpdate) {
              if (product.category === 'Flower') {
                if (item.selectedWeight) {
                  const revertedGrams = flowerWeightToGrams(item.selectedWeight) * item.quantity;
                  storeAvailabilityToUpdate = { ...storeAvailabilityToUpdate, totalStockInGrams: (storeAvailabilityToUpdate.totalStockInGrams || 0) + revertedGrams };
                }
              } else {
                storeAvailabilityToUpdate = { ...storeAvailabilityToUpdate, stock: (storeAvailabilityToUpdate.stock || 0) + item.quantity };
              }
              const newAvailabilityArray = product.availability.map(avail =>
                avail.storeId === orderData.storeId ? storeAvailabilityToUpdate : avail
              );
              transaction.update(productRefToUpdate, { availability: newAvailabilityArray });
            }
          } else {
            console.warn(`[firestoreService][AdminSDK][${functionName}] Product ${item.productId} not found during stock revert for cancelled order ${orderId}.`);
          }
        }

        if (cancellationReason === "Customer No-Show" && orderData.userId && userDocForUpdate && userDocForUpdate.exists) {
          const userData = userDocForUpdate.data() as User;
          const currentStrikes = userData.noShowStrikes || 0;
          const newStrikes = currentStrikes + 1;
          const userUpdatesForStrike: Partial<User> = { noShowStrikes: newStrikes };
          if (newStrikes >= 3 && !userData.isBanned) {
            userUpdatesForStrike.isBanned = true;
          }
          transaction.update(usersColRef.doc(orderData.userId), userUpdatesForStrike);
          console.log(`[firestoreService][AdminSDK][${functionName}] User ${orderData.userId} strike count updated to ${newStrikes}. Banned status: ${userUpdatesForStrike.isBanned || userData.isBanned || false}. Reason: ${cancellationReason}`);
        } else if (cancellationReason === "Customer No-Show" && orderData.userId) {
             console.warn(`[firestoreService][AdminSDK][${functionName}] User ${orderData.userId} not found (or userDocForUpdate was null/not existent) for strike update on order ${orderId} cancellation.`);
        }
      }
      
      transaction.update(orderRef, orderUpdates);
    });

    if (newStatus === "Cancelled" && cancellationReason === "Customer No-Show") {
        const orderSnapshot = await orderRef.get();
        if (orderSnapshot.exists) {
            const updatedOrderData = orderSnapshot.data() as Order;
            if (updatedOrderData.userId) {
                 const userSnapshot = await usersColRef.doc(updatedOrderData.userId).get();
                 if (userSnapshot.exists) {
                     const userData = userSnapshot.data() as User;
                     if (userData.isBanned && userData.noShowStrikes >=3 && firebaseAdminAuthModule) {
                        console.log(`[firestoreService][AdminSDK][${functionName}] Attempting to revoke refresh tokens for user ${updatedOrderData.userId} post-transaction.`);
                        try {
                            await firebaseAdminAuthModule.revokeRefreshTokens(updatedOrderData.userId);
                            console.log(`[firestoreService][AdminSDK][${functionName}] Successfully revoked refresh tokens for banned user ${updatedOrderData.userId}.`);
                        } catch (err) {
                            console.error(`[firestoreService][AdminSDK][${functionName}] Failed to revoke refresh tokens for banned user ${updatedOrderData.userId}:`, err);
                        }
                     }
                 }
            }
        }
    }
    console.log(`[firestoreService][AdminSDK][${functionName}] Order ${orderId} status updated to ${newStatus} and related actions (if any) processed.`);
  } catch (error: any) {
     console.error(`[firestoreService][AdminSDK][${functionName}] Transaction failed for order ${orderId} to status ${newStatus}. Original error:`, error);
     console.error(`Original error message: ${error.message}`);
     console.error(`Original error stack: ${error.stack}`);
     throw new Error(error.message || `Failed to update order ${orderId} status due to an unexpected issue.`);
  }
}

export async function updateProductStockForStoreByManager(
  productId: string,
  storeId: string,
  newStockData: { stock?: number; totalStockInGrams?: number }, 
  callingUserId: string 
): Promise<void> {
  const functionName = 'updateProductStockForStoreByManager (Transactional)';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Product: ${productId}, Store: ${storeId}, New Stock: ${JSON.stringify(newStockData)}, Caller: ${callingUserId}`);

  const callingUserRef = adminDb!.collection('users').doc(callingUserId);
  const productRef = adminDb!.collection('products').doc(productId);

  try {
    await adminDb!.runTransaction(async (transaction) => {
      const callingUserDoc = await transaction.get(callingUserRef);
      if (!callingUserDoc.exists) throw new Error("Calling manager user does not exist.");
      const callingUserData = callingUserDoc.data() as User;

      if (callingUserData.storeRole !== 'Manager' || callingUserData.assignedStoreId !== storeId) {
        throw new Error("Permission denied. Caller is not a manager of the target store.");
      }

      const productDoc = await transaction.get(productRef);
      if (!productDoc.exists) throw new Error(`Product with ID ${productId} not found.`);
      const productData = productDoc.data() as Product;

      const currentAvailability = productData.availability.find(avail => avail.storeId === storeId);
      if (!currentAvailability) {
        throw new Error(`Product ${productId} is not configured for store ${storeId}.`);
      }

      const updatedStoreAvailability: StoreAvailability = { ...currentAvailability };

      if (productData.category === 'Flower') {
        if (newStockData.totalStockInGrams === undefined || newStockData.totalStockInGrams < 0) {
          throw new Error("Invalid 'totalStockInGrams' provided for Flower product.");
        }
        updatedStoreAvailability.totalStockInGrams = newStockData.totalStockInGrams;
        delete updatedStoreAvailability.price;
        delete updatedStoreAvailability.stock;
      } else { 
        if (newStockData.stock === undefined || newStockData.stock < 0) {
          throw new Error("Invalid 'stock' provided for non-Flower product.");
        }
        updatedStoreAvailability.stock = newStockData.stock;
        delete updatedStoreAvailability.weightOptions;
        delete updatedStoreAvailability.totalStockInGrams;
      }

      const newFullAvailabilityArray = productData.availability.map(avail =>
        avail.storeId === storeId ? updatedStoreAvailability : avail
      );

      transaction.update(productRef, { availability: newFullAvailabilityArray });
    });
    console.log(`[firestoreService][AdminSDK][${functionName}] Stock for product ${productId} in store ${storeId} updated successfully by manager ${callingUserId}.`);
  } catch (error: any) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Transaction failed for stock update:`, error.message, error.stack);
    throw new Error(error.message || `Failed to update stock for product ${productId} due to an unexpected issue.`);
  }
}


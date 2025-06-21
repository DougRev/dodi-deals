
'use server';

import { adminDb, adminInitializationError } from '@/lib/firebaseAdmin';
import type { Product, User, Order, StoreFormData, StoreRole, StoreAvailability, OrderItem, OrderStatus, FlowerWeight, CancellationReason, ProductFormData, ProductCategory, StoreSalesReport, SalesReportDataItem, GlobalSalesReport, Store } from '@/lib/types';
import { initialStores as initialStoresSeedData } from '@/data/stores';
import { initialProducts as initialProductsSeedData } from '@/data/products';
import { flowerWeightToGrams, productCategories } from '@/lib/types';


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
        noShowStrikes: data.noShowStrikes || 0, 
        isBanned: data.isBanned || false,
        favoriteProductIds: data.favoriteProductIds || [],       
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
  }
): Promise<void> {
  const functionName = 'updateUserConfiguration';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Target User: ${targetUserId}, Updates: ${JSON.stringify(updates)}`);

  const targetUserRef = adminDb!.collection('users').doc(targetUserId);
  const updatePayload: { [key: string]: any } = {};

  if (typeof updates.isAdmin === 'boolean') {
    updatePayload.isAdmin = updates.isAdmin;
    if (updatePayload.isAdmin) {
      updatePayload.assignedStoreId = null;
      updatePayload.storeRole = null;
    }
  }

  if (updates.assignedStoreId !== undefined) {
    updatePayload.assignedStoreId = updates.assignedStoreId;
  }
  
  if (updates.storeRole !== undefined) {
    updatePayload.storeRole = updates.storeRole;
  }
  
  if (updates.assignedStoreId === null) {
      updatePayload.storeRole = null;
  }


  if (Object.keys(updatePayload).length === 0) {
    console.log(`[firestoreService][AdminSDK][${functionName}] No valid updates to perform.`);
    return;
  }

  try {
    await targetUserRef.update(updatePayload);
    console.log(`[firestoreService][AdminSDK][${functionName}] User ${targetUserId} configuration updated successfully with:`, updatePayload);
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error updating user configuration for ${targetUserId}:`, error);
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

export async function updateUserFavorites(userId: string, favoriteProductIds: string[]): Promise<void> {
  const functionName = 'updateUserFavorites';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Updating favorites for userId: ${userId} to:`, favoriteProductIds);

  const userRef = adminDb!.collection('users').doc(userId);
  try {
    await userRef.update({ favoriteProductIds: favoriteProductIds });
    console.log(`[firestoreService][AdminSDK][${functionName}] User favorites updated successfully for ${userId}.`);
  } catch (error) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Error updating user favorites for ${userId}:`, error);
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
      .orderBy('orderDate', 'asc') // Changed to asc for typical dashboard view (oldest active first)
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

export async function updateOrderStatus(orderId: string, newStatus: OrderStatus, cancellationReason?: CancellationReason, cancellationDescription?: string): Promise<void> {
  const functionName = 'updateOrderStatus (Transactional)';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Order: ${orderId}, NewStatus: ${newStatus}, Reason: ${cancellationReason}, Desc: ${cancellationDescription}`);

  const orderRef = adminDb!.collection('orders').doc(orderId);
  const usersColRef = adminDb!.collection('users');

  try {
    await adminDb!.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) {
        throw new Error(`Order ${orderId} not found.`);
      }
      const orderData = orderDoc.data() as Order;

      let userDocForUpdate: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData> | null = null;
      if (orderData.userId) {
        userDocForUpdate = await transaction.get(usersColRef.doc(orderData.userId));
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
        }
      } else if (newStatus === "Cancelled") {
        orderUpdates.cancellationReason = cancellationReason;
        orderUpdates.cancellationDescription = cancellationDescription || "";

        if (cancellationReason === "Customer No-Show" && orderData.userId && userDocForUpdate && userDocForUpdate.exists) {
            const userData = userDocForUpdate.data() as User;
            const currentStrikes = userData.noShowStrikes || 0;
            const newStrikes = currentStrikes + 1;
            const userUpdatesForStrike: Partial<User> = { noShowStrikes: newStrikes };
            if (newStrikes >= 3) {
              userUpdatesForStrike.isBanned = true;
            }
            transaction.update(usersColRef.doc(orderData.userId), userUpdatesForStrike);
        }

        // TODO: Revert stock logic could be added here if needed
      }

      transaction.update(orderRef, orderUpdates);
    });
    console.log(`[firestoreService][AdminSDK][${functionName}] Order ${orderId} status updated to ${newStatus} and related actions processed.`);
  } catch (error: any) {
    console.error(`[firestoreService][AdminSDK][${functionName}] Transaction failed for order ${orderId} to status ${newStatus}:`, error);
    throw new Error(error.message || `Failed to update order ${orderId} status due to an unexpected issue.`);
  }
}

export async function getStoreSalesReport(storeId: string): Promise<StoreSalesReport> {
  const functionName = 'getStoreSalesReport';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Generating report for storeId: ${storeId}`);

  let storeName = 'Unknown Store';
  try {
    const storeDoc = await adminDb!.collection('stores').doc(storeId).get();
    if (storeDoc.exists) {
      storeName = (storeDoc.data() as StoreFormData).name;
    }
  } catch (e) {
    console.warn(`[firestoreService][AdminSDK][${functionName}] Could not fetch store name for ${storeId}:`, e);
  }


  const productsSnapshot = await adminDb!.collection('products').get();
  const productDetailsMap = new Map<string, { name: string, category: ProductCategory }>();
  productsSnapshot.forEach(doc => {
    const data = doc.data() as Product;
    productDetailsMap.set(doc.id, { name: data.name, category: data.category });
  });

  const ordersColRef = adminDb!.collection('orders');
  const completedOrdersSnapshot = await ordersColRef
    .where('storeId', '==', storeId)
    .where('status', '==', 'Completed')
    .get();

  let totalRevenue = 0;
  let totalItemsSold = 0;
  const totalOrdersProcessed = completedOrdersSnapshot.size;

  const productSalesData: Record<string, SalesReportDataItem & { category: ProductCategory }> = {};
  const categorySalesData: Record<string, SalesReportDataItem> = {};

  completedOrdersSnapshot.forEach(doc => {
    const order = doc.data() as Order;
    totalRevenue += order.finalTotal;

    order.items.forEach(item => {
      totalItemsSold += item.quantity;
      const itemRevenue = item.pricePerItem * item.quantity;
      const productInfo = productDetailsMap.get(item.productId);
      const productName = productInfo?.name || item.productName || 'Unknown Product';
      const category = productInfo?.category || 'Unknown' as ProductCategory;

      // Aggregate product sales
      if (!productSalesData[item.productId]) {
        productSalesData[item.productId] = { id: item.productId, name: productName, quantitySold: 0, revenueGenerated: 0, category: category };
      }
      productSalesData[item.productId].quantitySold += item.quantity;
      productSalesData[item.productId].revenueGenerated += itemRevenue;

      // Aggregate category sales
      if (category !== 'Unknown') {
        if (!categorySalesData[category]) {
          categorySalesData[category] = { id: category, name: category, quantitySold: 0, revenueGenerated: 0 };
        }
        categorySalesData[category].quantitySold += item.quantity;
        categorySalesData[category].revenueGenerated += itemRevenue;
      }
    });
  });

  const topSellingProducts = Object.values(productSalesData)
    .sort((a, b) => b.revenueGenerated - a.revenueGenerated) // Sort by revenue
    .slice(0, 10); // Top 10

  const topSellingCategories = Object.values(categorySalesData)
    .sort((a, b) => b.revenueGenerated - a.revenueGenerated) // Sort by revenue
    .slice(0, 5); // Top 5

  const report: StoreSalesReport = {
    storeId,
    storeName,
    totalRevenue,
    totalItemsSold,
    totalOrdersProcessed,
    topSellingProducts,
    topSellingCategories,
    reportGeneratedAt: new Date().toISOString(),
  };

  console.log(`[firestoreService][AdminSDK][${functionName}] Report generated successfully for store ${storeId}. Orders processed: ${totalOrdersProcessed}`);
  return report;
}

export async function getGlobalSalesReport(): Promise<GlobalSalesReport> {
  const functionName = 'getGlobalSalesReport';
  ensureAdminDbInitialized(functionName);
  console.log(`--- Server Action (Admin SDK): ${functionName} ---`);
  console.log(`[firestoreService][AdminSDK][${functionName}] Generating global sales report.`);

  const productsSnapshot = await adminDb!.collection('products').get();
  const productDetailsMap = new Map<string, { name: string, category: ProductCategory }>();
  productsSnapshot.forEach(doc => {
    const data = doc.data() as Product;
    productDetailsMap.set(doc.id, { name: data.name, category: data.category });
  });

  const storesSnapshot = await adminDb!.collection('stores').get();
  const storeDetailsMap = new Map<string, { name: string }>();
  storesSnapshot.forEach(doc => {
    const data = doc.data() as Store;
    storeDetailsMap.set(doc.id, { name: data.name });
  });

  const ordersColRef = adminDb!.collection('orders');
  const completedOrdersSnapshot = await ordersColRef
    .where('status', '==', 'Completed')
    .get();

  let globalTotalRevenue = 0;
  let globalTotalItemsSold = 0;
  const globalTotalOrdersProcessed = completedOrdersSnapshot.size;

  const globalProductSalesData: Record<string, SalesReportDataItem & { category: ProductCategory }> = {};
  const globalCategorySalesData: Record<string, SalesReportDataItem> = {};
  const storePerformanceData: Record<string, SalesReportDataItem & { ordersProcessed: number }> = {};

  completedOrdersSnapshot.forEach(doc => {
    const order = doc.data() as Order;
    globalTotalRevenue += order.finalTotal;

    // Aggregate store performance
    if (!storePerformanceData[order.storeId]) {
      const storeName = storeDetailsMap.get(order.storeId)?.name || order.storeName || 'Unknown Store';
      storePerformanceData[order.storeId] = { id: order.storeId, name: storeName, quantitySold: 0, revenueGenerated: 0, ordersProcessed: 0 };
    }
    storePerformanceData[order.storeId].revenueGenerated += order.finalTotal;
    storePerformanceData[order.storeId].ordersProcessed! += 1;


    order.items.forEach(item => {
      globalTotalItemsSold += item.quantity;
      const itemRevenue = item.pricePerItem * item.quantity;
      const productInfo = productDetailsMap.get(item.productId);
      const productName = productInfo?.name || item.productName || 'Unknown Product';
      const category = productInfo?.category || 'Unknown' as ProductCategory;

      // Aggregate global product sales
      if (!globalProductSalesData[item.productId]) {
        globalProductSalesData[item.productId] = { id: item.productId, name: productName, quantitySold: 0, revenueGenerated: 0, category: category };
      }
      globalProductSalesData[item.productId].quantitySold += item.quantity;
      globalProductSalesData[item.productId].revenueGenerated += itemRevenue;

      // Aggregate global category sales
      if (category !== 'Unknown') {
        if (!globalCategorySalesData[category]) {
          globalCategorySalesData[category] = { id: category, name: category, quantitySold: 0, revenueGenerated: 0 };
        }
        globalCategorySalesData[category].quantitySold += item.quantity;
        globalCategorySalesData[category].revenueGenerated += itemRevenue;
      }
    });
  });

  const globalTopSellingProducts = Object.values(globalProductSalesData)
    .sort((a, b) => b.revenueGenerated - a.revenueGenerated)
    .slice(0, 10);

  const globalTopSellingCategories = Object.values(globalCategorySalesData)
    .sort((a, b) => b.revenueGenerated - a.revenueGenerated)
    .slice(0, 5);
  
  const topPerformingStores = Object.values(storePerformanceData)
    .sort((a,b) => b.revenueGenerated - a.revenueGenerated)
    .slice(0, 5);


  const report: GlobalSalesReport = {
    totalRevenue: globalTotalRevenue,
    totalItemsSold: globalTotalItemsSold,
    totalOrdersProcessed: globalTotalOrdersProcessed,
    globalTopSellingProducts,
    globalTopSellingCategories,
    topPerformingStores,
    reportGeneratedAt: new Date().toISOString(),
  };

  console.log(`[firestoreService][AdminSDK][${functionName}] Global report generated successfully. Total orders processed: ${globalTotalOrdersProcessed}`);
  return report;
}

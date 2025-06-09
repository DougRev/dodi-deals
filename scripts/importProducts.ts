
// scripts/importProducts.ts
import * as dotenv from 'dotenv';
import * as path from 'path';

// Explicitly load .env.local at the very start of the script
const envConfigPath = path.resolve(process.cwd(), '.env.local');
const dotenvResult = dotenv.config({ path: envConfigPath });

if (dotenvResult.error) {
  console.warn(`[importProducts.ts] Warning: Could not load .env.local file from ${envConfigPath}. Error: ${dotenvResult.error.message}`);
  console.warn('[importProducts.ts] Script will rely on globally set environment variables or Application Default Credentials if available.');
} else {
  if (dotenvResult.parsed) {
    console.log(`[importProducts.ts] Successfully loaded .env.local from ${envConfigPath}. Variables loaded: ${Object.keys(dotenvResult.parsed).join(', ')}`);
  } else {
    console.log(`[importProducts.ts] Loaded .env.local from ${envConfigPath}, but it might be empty or only contain comments.`);
  }
}

import admin from 'firebase-admin';
import { productsToImport, type ProductImportEntry } from './productImportData';
import type { Product, StoreAvailability, ProductCategory, FlowerWeightPrice } from '../src/lib/types'; // Adjust path if needed
import { flowerWeights, type FlowerWeight } from '../src/lib/types'; // Import flowerWeights

// --- Configuration ---
const serviceAccount = {
  projectId: process.env.SERVICE_ACCOUNT_PROJECT_ID,
  clientEmail: process.env.SERVICE_ACCOUNT_CLIENT_EMAIL,
  privateKey: process.env.SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// UPDATED: Use your specific store IDs
const ALL_STORE_IDS = [
  "7EQZwdhGKlEmkFueLjNW",
  "22JNWkEJ6HF65R9Wz9lG",
  "9NcyGNHGfgzkx1vuhILV",
  "Te8D2yMpTFo43WfatrM7"
];

const DEFAULT_PRICE = 24.99; // For non-flower products
const DEFAULT_STOCK = 30; // For non-flower products
const DEFAULT_BASE_IMAGE_URL = 'https://placehold.co/600x400.png';

// New defaults for Flower products
const DEFAULT_FLOWER_TOTAL_STOCK_GRAMS = 100; // e.g., 100 grams total stock for flowers
const DEFAULT_FLOWER_PRICES_PER_WEIGHT: Record<FlowerWeight, number> = {
  "3.5g": 35.00,
  "7g": 65.00,
  "14g": 120.00,
  "1oz": 200.00,
};
// --- End Configuration ---


// Initialize Firebase Admin SDK
try {
  if (admin.apps.length === 0) {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log("[importProducts.ts] Initializing Firebase Admin with Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS)...");
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
    } else if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
        console.log("[importProducts.ts] Initializing Firebase Admin with explicit service account environment variables (from .env.local via dotenv)...");
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        });
    } else {
        console.error('[importProducts.ts] Critical Firebase Admin SDK Credential Issue:');
        console.error('  - GOOGLE_APPLICATION_CREDENTIALS was not found in the environment.');
        console.error(`  - SERVICE_ACCOUNT_PROJECT_ID is: ${serviceAccount.projectId ? `"${serviceAccount.projectId}"` : 'MISSING or undefined'}`);
        console.error(`  - SERVICE_ACCOUNT_CLIENT_EMAIL is: ${serviceAccount.clientEmail ? `"${serviceAccount.clientEmail}"` : 'MISSING or undefined'}`);
        console.error(`  - SERVICE_ACCOUNT_PRIVATE_KEY is: ${serviceAccount.privateKey ? 'Present (not empty)' : 'MISSING or undefined'}`);
        throw new Error("Firebase Admin SDK credentials not found or incomplete. Ensure .env.local is correctly populated and readable, or GOOGLE_APPLICATION_CREDENTIALS is set.");
    }
  }
} catch (error: any) {
  console.error("[importProducts.ts] Firebase Admin SDK Initialization Error:", error.message);
  process.exit(1);
}

const db = admin.firestore();

async function importProducts() {
  console.log(`[importProducts.ts] Starting product import for ${productsToImport.length} products...`);
  const productsCollection = db.collection('products');
  let successfulImports = 0;
  let failedImports = 0;

  for (let i = 0; i < productsToImport.length; i++) {
    const entry: ProductImportEntry = productsToImport[i];
    const productId = `dodi_prod_${String(i + 1).padStart(3, '0')}`; // e.g., dodi_prod_001

    // Create availability for all specified stores
    let availability: StoreAvailability[];

    if (entry.category === 'Flower') {
      availability = ALL_STORE_IDS.map(storeId => ({
        storeId: storeId,
        totalStockInGrams: DEFAULT_FLOWER_TOTAL_STOCK_GRAMS,
        weightOptions: flowerWeights.map(fw => ({
          weight: fw,
          price: DEFAULT_FLOWER_PRICES_PER_WEIGHT[fw] || 0, // Default to 0 if a weight is somehow not in our map
        })),
        storeSpecificImageUrl: '', // Can be left empty or set to a specific placeholder if needed
        // price and stock should be undefined for Flower category
      }));
    } else {
      availability = ALL_STORE_IDS.map(storeId => ({
        storeId: storeId,
        price: DEFAULT_PRICE,
        stock: DEFAULT_STOCK,
        storeSpecificImageUrl: '', // Can be left empty or set to a specific placeholder if needed
        // totalStockInGrams and weightOptions should be undefined for non-Flower categories
      }));
    }

    const productData: Product = {
      id: productId, // Firestore will use the doc ID, but good to have for reference
      name: entry.name,
      description: entry.description,
      brand: entry.brand,
      category: entry.category,
      baseImageUrl: DEFAULT_BASE_IMAGE_URL,
      dataAiHint: entry.dataAiHint,
      isFeatured: entry.isFeatured || false,
      availability: availability,
    };

    try {
      const existingProductQuery = await productsCollection.where('name', '==', entry.name).limit(1).get();
      if (!existingProductQuery.empty) {
          console.warn(`[importProducts.ts] Product with name "${entry.name}" already exists. Skipping ID ${productId}.`);
          failedImports++;
          continue;
      }

      await productsCollection.doc(productId).set(productData);
      console.log(`[importProducts.ts] Successfully imported: ${entry.name} (ID: ${productId}) - Available in ${ALL_STORE_IDS.length} stores.`);
      successfulImports++;
    } catch (error) {
      console.error(`[importProducts.ts] Failed to import product: ${entry.name}. Error:`, error);
      failedImports++;
    }
  }

  console.log("\n--- [importProducts.ts] Import Summary ---");
  console.log(`Successfully imported products: ${successfulImports}`);
  console.log(`Failed/Skipped imports: ${failedImports}`);
  console.log("------------------------------------------");
}

importProducts()
  .then(() => {
    console.log("[importProducts.ts] Product import script finished.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[importProducts.ts] Unhandled error in import script:", error);
    process.exit(1);
  });


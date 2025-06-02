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

// For debugging: Log the critical env vars AFTER attempting to load .env.local
// console.log('[importProducts.ts] SERVICE_ACCOUNT_PROJECT_ID (after dotenv):', process.env.SERVICE_ACCOUNT_PROJECT_ID);
// console.log('[importProducts.ts] SERVICE_ACCOUNT_CLIENT_EMAIL (after dotenv):', process.env.SERVICE_ACCOUNT_CLIENT_EMAIL);
// console.log('[importProducts.ts] SERVICE_ACCOUNT_PRIVATE_KEY (after dotenv, present?):', !!process.env.SERVICE_ACCOUNT_PRIVATE_KEY);


import admin from 'firebase-admin';
import { productsToImport, type ProductImportEntry } from './productImportData';
import type { Product, StoreAvailability, ProductCategory } from '../src/lib/types'; // Adjust path if needed

// --- Configuration ---
// Option 1: Path to your service account key JSON file (less preferred now that .env.local is used)
// const serviceAccountPath = "/path/to/your/serviceAccountKey.json";

// Option 2: Environment variables (now loaded from .env.local by dotenv at the top of this script)
const serviceAccount = {
  projectId: process.env.SERVICE_ACCOUNT_PROJECT_ID,
  clientEmail: process.env.SERVICE_ACCOUNT_CLIENT_EMAIL,
  privateKey: process.env.SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

const DEFAULT_STORE_ID = 'store_001'; // e.g., Indianapolis store
const DEFAULT_PRICE = 24.99;
const DEFAULT_STOCK = 30;
const DEFAULT_BASE_IMAGE_URL = 'https://placehold.co/600x400.png';
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

    const availability: StoreAvailability[] = [
      {
        storeId: DEFAULT_STORE_ID,
        price: DEFAULT_PRICE,
        stock: DEFAULT_STOCK,
        storeSpecificImageUrl: '', // Can be left empty or set to a specific placeholder if needed
      },
    ];

    const productData: Product = {
      id: productId, // Firestore will use the doc ID, but good to have for reference
      name: entry.name,
      description: entry.description,
      brand: entry.brand,
      category: entry.category,
      baseImageUrl: DEFAULT_BASE_IMAGE_URL,
      dataAiHint: entry.dataAiHint,
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
      console.log(`[importProducts.ts] Successfully imported: ${entry.name} (ID: ${productId})`);
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

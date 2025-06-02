// scripts/importProducts.ts
// dotenv import and config is removed from here as it's handled by the npm script using node -r

import admin from 'firebase-admin';
import { productsToImport, type ProductImportEntry } from './productImportData';
import type { Product, StoreAvailability, ProductCategory } from '../src/lib/types'; // Adjust path if needed

// --- Configuration ---
// Option 1: Path to your service account key JSON file
// const serviceAccountPath = "/path/to/your/serviceAccountKey.json";

// Option 2: Environment variables (ensure these are set in your script's environment)
// These will now be loaded from .env.local by the preloaded dotenv/config
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
        console.log("Initializing Firebase Admin with Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS)...");
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
    } else if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
        console.log("Initializing Firebase Admin with explicit service account environment variables (from .env.local via dotenv/config)...");
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        });
    } else {
        throw new Error("Firebase Admin SDK credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS or SERVICE_ACCOUNT_PROJECT_ID, SERVICE_ACCOUNT_CLIENT_EMAIL, and SERVICE_ACCOUNT_PRIVATE_KEY environment variables.");
    }
  }
} catch (error: any) {
  console.error("Firebase Admin SDK Initialization Error:", error.message);
  process.exit(1);
}

const db = admin.firestore();

async function importProducts() {
  console.log(`Starting product import for ${productsToImport.length} products...`);
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
      // Check if a product with this name already exists (simple check)
      // For a more robust check, you might query by name AND brand.
      const existingProductQuery = await productsCollection.where('name', '==', entry.name).limit(1).get();
      if (!existingProductQuery.empty) {
          console.warn(`Product with name "${entry.name}" already exists. Skipping ID ${productId}.`);
          // You could choose to update it here if desired
          // const existingDocId = existingProductQuery.docs[0].id;
          // await productsCollection.doc(existingDocId).update(productData);
          // console.log(`Updated existing product: ${entry.name} (ID: ${existingDocId})`);
          failedImports++;
          continue;
      }

      await productsCollection.doc(productId).set(productData);
      console.log(`Successfully imported: ${entry.name} (ID: ${productId})`);
      successfulImports++;
    } catch (error) {
      console.error(`Failed to import product: ${entry.name}. Error:`, error);
      failedImports++;
    }
  }

  console.log("\n--- Import Summary ---");
  console.log(`Successfully imported products: ${successfulImports}`);
  console.log(`Failed/Skipped imports: ${failedImports}`);
  console.log("----------------------");
}

importProducts()
  .then(() => {
    console.log("Product import script finished.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Unhandled error in import script:", error);
    process.exit(1);
  });

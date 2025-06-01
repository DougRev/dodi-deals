
// src/lib/firebaseAdmin.ts
import admin from 'firebase-admin';
import type { App } from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth as AdminAuth } from 'firebase-admin/auth';

interface FirebaseAdminSDKs {
  db: Firestore;
  auth: AdminAuth;
  adminNamespace: typeof admin;
}

let adminSDKsInternal: FirebaseAdminSDKs | null = null;
let adminInitializationErrorInternal: Error | null = null;

// Comments explaining expected environment variables for clarity:
//
// The Firebase Admin SDK requires server-side credentials. This script attempts to initialize it
// by looking for credentials in the following order:
//
// 1. GOOGLE_APPLICATION_CREDENTIALS environment variable: (Recommended for local dev / non-GCP servers)
//    - Set this to the absolute path of your downloaded service account JSON key file.
//    - e.g., GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/serviceAccountKey.json
//
// 2. Explicit Service Account Environment Variables: (Alternative if key file path is tricky)
//    - SERVICE_ACCOUNT_PROJECT_ID: Your Firebase project ID (e.g., "dodi-deals")
//    - SERVICE_ACCOUNT_CLIENT_EMAIL: Your service account email (e.g., "firebase-adminsdk-xxxxx@xxxx.iam.gserviceaccount.com")
//    - SERVICE_ACCOUNT_PRIVATE_KEY: The private key string from your service account JSON file.
//      (Ensure newlines `\n` are correctly preserved or escaped as `\\n` if your env var system requires it.
//       This script handles replacing `\\n` with actual newlines.)
//
// 3. Application Default Credentials (ADC): (Common in Google Cloud environments)
//    - Typically available in Google Cloud environments (Cloud Functions, Cloud Run, App Engine, GKE, configured Cloud Workstations).
//    - The SDK attempts this if the above are not found AND it detects a GCP-like environment (e.g., GOOGLE_CLOUD_PROJECT is set).

function initializeFirebaseAdmin(): FirebaseAdminSDKs {
  console.log('[firebaseAdmin] Attempting to initialize Firebase Admin SDK...');
  let adminAppInstance: App | undefined = undefined; // Changed to allow undefined initially
  let credentialsTypeUsed = "None";

  // Log all relevant environment variables at the start for diagnostics
  console.log('[firebaseAdmin] Environment Variable Check for Admin SDK Initialization:');
  console.log(`  - GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || 'Not set'}`);
  console.log(`  - SERVICE_ACCOUNT_PROJECT_ID: ${process.env.SERVICE_ACCOUNT_PROJECT_ID || 'Not set'}`);
  console.log(`  - SERVICE_ACCOUNT_CLIENT_EMAIL: ${process.env.SERVICE_ACCOUNT_CLIENT_EMAIL || 'Not set'}`);
  const pkPreview = process.env.SERVICE_ACCOUNT_PRIVATE_KEY ? `Present (starts with: "${process.env.SERVICE_ACCOUNT_PRIVATE_KEY.substring(0, 30)}...")` : 'Not set';
  console.log(`  - SERVICE_ACCOUNT_PRIVATE_KEY: ${pkPreview}`);
  console.log(`  - FIREBASE_CONFIG: ${process.env.FIREBASE_CONFIG || 'Not set'}`); // For ADC in some Firebase envs
  console.log(`  - FUNCTIONS_EMULATOR: ${process.env.FUNCTIONS_EMULATOR || 'Not set'}`); // For ADC in emulator
  console.log(`  - K_SERVICE (Cloud Run): ${process.env.K_SERVICE || 'Not set'}`); // For ADC in Cloud Run
  console.log(`  - GOOGLE_CLOUD_PROJECT (GCP Default for ADC): ${process.env.GOOGLE_CLOUD_PROJECT || 'Not set'}`);


  if (admin.apps.length > 0) {
    adminAppInstance = admin.apps[0]!;
    console.log('[firebaseAdmin] Firebase Admin SDK already initialized. Using existing app.');
  } else {
    console.log('[firebaseAdmin] No Firebase Admin app found. Attempting to initialize a new one...');

    const explicitServiceAccountEnv = process.env.SERVICE_ACCOUNT_PROJECT_ID && process.env.SERVICE_ACCOUNT_CLIENT_EMAIL && process.env.SERVICE_ACCOUNT_PRIVATE_KEY;
    const isLikelyADCEnvironment = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_CONFIG || process.env.FUNCTIONS_EMULATOR === 'true' || process.env.K_SERVICE;

    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        credentialsTypeUsed = "GOOGLE_APPLICATION_CREDENTIALS";
        console.log(`[firebaseAdmin] Attempting initialization with ${credentialsTypeUsed}. Path: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
        admin.initializeApp({ credential: admin.credential.applicationDefault() });
      } else if (explicitServiceAccountEnv) {
        credentialsTypeUsed = "Explicit Service Account ENV VARS";
        console.log(`[firebaseAdmin] Attempting initialization with ${credentialsTypeUsed}.`);
        const projectId = process.env.SERVICE_ACCOUNT_PROJECT_ID!;
        const clientEmail = process.env.SERVICE_ACCOUNT_CLIENT_EMAIL!;
        const privateKey = process.env.SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n');
        console.log(`  - Project ID for cert: ${projectId}`);
        console.log(`  - Client Email for cert: ${clientEmail}`);
        console.log(`  - Private Key for cert starts with: "${privateKey.substring(0,30)}..." and ends with "...${privateKey.substring(privateKey.length - 30)}"`);

        if (!projectId || !clientEmail || !privateKey) {
          const missingVars = [
            !projectId && "SERVICE_ACCOUNT_PROJECT_ID",
            !clientEmail && "SERVICE_ACCOUNT_CLIENT_EMAIL",
            !privateKey && "SERVICE_ACCOUNT_PRIVATE_KEY",
          ].filter(Boolean).join(", ");
          const errorMsg = `[firebaseAdmin] ERROR: Attempting '${credentialsTypeUsed}' method, but essential variable(s) are missing or empty: ${missingVars}. Cannot proceed with this method.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
        admin.initializeApp({
          credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        });
      } else if (isLikelyADCEnvironment) {
        credentialsTypeUsed = "Application Default Credentials (ADC)";
        console.log(`[firebaseAdmin] Attempting initialization with ${credentialsTypeUsed} (detected via GOOGLE_CLOUD_PROJECT, FIREBASE_CONFIG, FUNCTIONS_EMULATOR, or K_SERVICE).`);
        admin.initializeApp(); // Relies on ADC
      } else {
        const noMethodAttemptedErrorMsg = `[firebaseAdmin] CRITICAL FAILURE: No Firebase Admin SDK initialization method was suitable.
        - GOOGLE_APPLICATION_CREDENTIALS was not set.
        - SERVICE_ACCOUNT_PROJECT_ID, SERVICE_ACCOUNT_CLIENT_EMAIL, and SERVICE_ACCOUNT_PRIVATE_KEY were not all set or one was empty.
        - Not recognized as a typical Google Cloud ADC environment (e.g., GOOGLE_CLOUD_PROJECT was not set).
        Common Fixes:
        - Local Development: Ensure your .env.local file correctly sets ONE of the above credential methods (e.g., GOOGLE_APPLICATION_CREDENTIALS or the three SERVICE_ACCOUNT_... variables).
        - Deployed Environments: Ensure the runtime service account has permissions and ADC are discoverable.
        Check the 'Environment Variable Check' logs above for the status of variables this script looks for.`;
        console.error(noMethodAttemptedErrorMsg);
        throw new Error(`Firebase Admin SDK failed to initialize: No suitable credential detection method found. Check server logs for environment variable status and setup guides.`);
      }

      if (admin.apps.length > 0) {
        adminAppInstance = admin.apps[0]!;
        console.log(`[firebaseAdmin] Firebase Admin SDK initialized successfully using ${credentialsTypeUsed}. App name: ${adminAppInstance.name}`);
      } else {
        const postAttemptFailureMsg = `[firebaseAdmin] CRITICAL FAILURE: Firebase Admin SDK initialization was attempted with '${credentialsTypeUsed}', but no app instance was created (admin.apps is empty). This usually means the specific initializeApp call itself failed internally (e.g., invalid key format, service account permissions issue). Check for previous errors from Firebase Admin SDK libraries or detailed logs for '${credentialsTypeUsed}'.`;
        console.error(postAttemptFailureMsg);
        throw new Error(`Firebase Admin SDK failed after attempting initialization with ${credentialsTypeUsed}. Check server logs for underlying Firebase errors.`);
      }
    } catch (error: any) {
      if (error.code === 'app/duplicate-app') {
        console.warn(`[firebaseAdmin] Firebase Admin App already initialized (caught duplicate-app error during attempt with ${credentialsTypeUsed}). Using existing app.`);
        if (admin.apps.length > 0) {
          adminAppInstance = admin.apps[0]!;
           console.log(`[firebaseAdmin] Existing app name: ${adminAppInstance.name}`);
        } else {
          // This state should be highly unlikely.
          const criticalErrorMsg = '[firebaseAdmin] Firebase Admin SDK: Caught duplicate-app error, but admin.apps array is empty. This is an inconsistent and critical state.';
          console.error(criticalErrorMsg);
          throw new Error(criticalErrorMsg);
        }
      } else {
        const initErrorMsg = `[firebaseAdmin] Error during Firebase Admin SDK initializeApp call (attempted with ${credentialsTypeUsed}): ${error.message || 'Unknown error during initializeApp'}`;
        console.error(initErrorMsg, error); // Log the full error object
        throw new Error(initErrorMsg); // Re-throw to be caught by the main try-catch
      }
    }
  }

  if (!adminAppInstance) {
    const finalErrorMsg = `[firebaseAdmin] CRITICAL: Firebase Admin SDK app instance (adminAppInstance) is null or undefined after all initialization attempts. This indicates a fundamental failure in the initialization process. Firestore and Auth services will not be available. Review 'Environment Variable Check' logs and prior error messages.`;
    console.error(finalErrorMsg);
    throw new Error(finalErrorMsg);
  }

  console.log(`[firebaseAdmin] Admin App Instance Name: ${adminAppInstance.name}`);
  console.log(`[firebaseAdmin] Admin App Instance Project ID (from app options): ${adminAppInstance.options?.projectId || 'Not available'}`);
  
  let dbInstance: Firestore;
  try {
    dbInstance = admin.firestore(adminAppInstance);
    console.log(`[firebaseAdmin] Firestore instance obtained successfully. Type: ${typeof dbInstance}, Settings: ${dbInstance?.settings ? 'available' : 'not available'}`);
    if (typeof dbInstance.collection !== 'function') {
        console.error('[firebaseAdmin] CRITICAL: dbInstance.collection is NOT a function. The Firestore instance is malformed.');
        throw new Error('[firebaseAdmin] Firestore instance is malformed; .collection is not a function.');
    }
  } catch (dbError: any) {
    console.error(`[firebaseAdmin] CRITICAL ERROR obtaining Firestore instance from adminAppInstance: ${dbError.message}`, dbError);
    throw new Error(`[firebaseAdmin] Failed to obtain Firestore instance from admin app: ${dbError.message}`);
  }

  let authInstance: AdminAuth;
  try {
    authInstance = admin.auth(adminAppInstance);
    console.log(`[firebaseAdmin] Auth instance obtained successfully. Type: ${typeof authInstance}`);
  } catch (authError: any) {
    console.error(`[firebaseAdmin] CRITICAL ERROR obtaining Auth instance from adminAppInstance: ${authError.message}`, authError);
    throw new Error(`[firebaseAdmin] Failed to obtain Auth instance from admin app: ${authError.message}`);
  }

  return {
    db: dbInstance,
    auth: authInstance,
    adminNamespace: admin,
  };
}

// This block ensures initialization is attempted only once.
if (!adminSDKsInternal && !adminInitializationErrorInternal) {
  try {
    adminSDKsInternal = initializeFirebaseAdmin();
  } catch (e) {
    // This catch block is crucial. It catches errors thrown by initializeFirebaseAdmin itself.
    adminInitializationErrorInternal = e as Error;
    console.error(`[firebaseAdmin] Captured FATAL INITIALIZATION ERROR during 'initializeFirebaseAdmin' call: ${adminInitializationErrorInternal.message}. Firestore and Auth services via Admin SDK will be unavailable. Ensure your server environment has valid Firebase Admin credentials.`);
  }
}

export const adminDb: Firestore | undefined = adminSDKsInternal?.db;
export const adminAuth: AdminAuth | undefined = adminSDKsInternal?.auth;
export const adminSDK: typeof admin | undefined = adminSDKsInternal?.adminNamespace;
// This is the error object that firestoreService.ts checks.
// If initializeFirebaseAdmin throws, this will be set.
export const adminInitializationError: Error | null = adminInitializationErrorInternal;

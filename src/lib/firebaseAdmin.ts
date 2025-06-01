
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
// 1. GOOGLE_APPLICATION_CREDENTIALS environment variable:
//    - Set this to the absolute path of your downloaded service account JSON key file.
//    - e.g., GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/serviceAccountKey.json
//
// 2. Explicit Service Account Environment Variables:
//    - SERVICE_ACCOUNT_PROJECT_ID: Your Firebase project ID (e.g., "dodi-deals")
//    - SERVICE_ACCOUNT_CLIENT_EMAIL: Your service account email (e.g., "firebase-adminsdk-xxxxx@xxxx.iam.gserviceaccount.com")
//    - SERVICE_ACCOUNT_PRIVATE_KEY: The private key string from your service account JSON file.
//      (Ensure newlines `\n` are correctly preserved or escaped as `\\n` if your env var system requires it.
//       This script handles replacing `\\n` with actual newlines.)
//
// 3. Application Default Credentials (ADC):
//    - Typically available in Google Cloud environments (Cloud Functions, Cloud Run, App Engine, GKE, configured Cloud Workstations).
//    - The SDK attempts this if the above are not found AND it detects a GCP-like environment (e.g., GOOGLE_CLOUD_PROJECT is set).

function initializeFirebaseAdmin(): FirebaseAdminSDKs {
  console.log('[firebaseAdmin] Attempting to initialize Firebase Admin SDK...');
  let adminAppInstance: App;
  let credentialsTypeUsed = "None";

  // Log all relevant environment variables at the start for diagnostics
  console.log('[firebaseAdmin] Environment Variable Check for Admin SDK Initialization:');
  console.log(`  - GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || 'Not set'}`);
  console.log(`  - SERVICE_ACCOUNT_PROJECT_ID: ${process.env.SERVICE_ACCOUNT_PROJECT_ID || 'Not set'}`);
  console.log(`  - SERVICE_ACCOUNT_CLIENT_EMAIL: ${process.env.SERVICE_ACCOUNT_CLIENT_EMAIL || 'Not set'}`);
  console.log(`  - SERVICE_ACCOUNT_PRIVATE_KEY: ${process.env.SERVICE_ACCOUNT_PRIVATE_KEY ? 'Set (details below)' : 'Not set'}`);
  console.log(`  - FIREBASE_CONFIG: ${process.env.FIREBASE_CONFIG || 'Not set'}`);
  console.log(`  - FUNCTIONS_EMULATOR: ${process.env.FUNCTIONS_EMULATOR || 'Not set'}`);
  console.log(`  - K_SERVICE (Cloud Run): ${process.env.K_SERVICE || 'Not set'}`);
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
        // Log the individual parts to confirm they are being read by process.env
        console.log(`  - SERVICE_ACCOUNT_PROJECT_ID (read by script): ${process.env.SERVICE_ACCOUNT_PROJECT_ID}`);
        console.log(`  - SERVICE_ACCOUNT_CLIENT_EMAIL (read by script): ${process.env.SERVICE_ACCOUNT_CLIENT_EMAIL}`);
        if (process.env.SERVICE_ACCOUNT_PRIVATE_KEY) {
            console.log(`  - SERVICE_ACCOUNT_PRIVATE_KEY (read by script): Present (length: ${process.env.SERVICE_ACCOUNT_PRIVATE_KEY.length}, starts with: "${process.env.SERVICE_ACCOUNT_PRIVATE_KEY.substring(0, 30)}...")`);
        } else {
            // This case should ideally not be hit if explicitServiceAccountEnv is true, but good for robust logging.
            console.error(`  - SERVICE_ACCOUNT_PRIVATE_KEY (read by script): ERROR - Expected but not found!`);
        }

        if (!process.env.SERVICE_ACCOUNT_PROJECT_ID || !process.env.SERVICE_ACCOUNT_CLIENT_EMAIL || !process.env.SERVICE_ACCOUNT_PRIVATE_KEY) {
          const missingVars = [
            !process.env.SERVICE_ACCOUNT_PROJECT_ID && "SERVICE_ACCOUNT_PROJECT_ID",
            !process.env.SERVICE_ACCOUNT_CLIENT_EMAIL && "SERVICE_ACCOUNT_CLIENT_EMAIL",
            !process.env.SERVICE_ACCOUNT_PRIVATE_KEY && "SERVICE_ACCOUNT_PRIVATE_KEY",
          ].filter(Boolean).join(", ");
          console.error(`[firebaseAdmin] ERROR: Attempting 'Explicit Service Account ENV VARS' method, but essential variable(s) are missing: ${missingVars}. Cannot proceed with this method.`);
          // This will cause the script to fall through to the "No method attempted" error if ADC isn't also viable.
        } else {
           admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.SERVICE_ACCOUNT_PROJECT_ID!,
              clientEmail: process.env.SERVICE_ACCOUNT_CLIENT_EMAIL!,
              // The .replace handles cases where \n is literal; if it's already a newline, it does no harm.
              privateKey: process.env.SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n'),
            }),
          });
        }
      } else if (isLikelyADCEnvironment) {
        credentialsTypeUsed = "Application Default Credentials (ADC)";
        console.log(`[firebaseAdmin] Attempting initialization with ${credentialsTypeUsed} (detected via GOOGLE_CLOUD_PROJECT, FIREBASE_CONFIG, FUNCTIONS_EMULATOR, or K_SERVICE).`);
        admin.initializeApp(); // Relies on ADC
      } else {
        const noMethodAttemptedErrorMsg = `[firebaseAdmin] CRITICAL FAILURE: No Firebase Admin SDK initialization method was suitable.
        - GOOGLE_APPLICATION_CREDENTIALS was not set.
        - SERVICE_ACCOUNT_PROJECT_ID, SERVICE_ACCOUNT_CLIENT_EMAIL, and SERVICE_ACCOUNT_PRIVATE_KEY were not all set.
        - Not recognized as a typical Google Cloud ADC environment (e.g., GOOGLE_CLOUD_PROJECT was not set).
        Common Fixes:
        - Local Development: Ensure your .env.local file correctly sets ONE of the above credential methods. The easiest is usually GOOGLE_APPLICATION_CREDENTIALS pointing to your service account key JSON file.
        - Deployed Environments: Ensure the runtime service account has permissions and ADC are discoverable.
        Check the 'Environment Variable Check' logs above for the status of variables this script looks for.`;
        console.error(noMethodAttemptedErrorMsg);
        throw new Error(`Firebase Admin SDK failed to initialize: No suitable credential detection method found. Check server logs for environment variable status and setup guides.`);
      }

      if (admin.apps.length > 0) {
        adminAppInstance = admin.apps[0]!;
        console.log(`[firebaseAdmin] Firebase Admin SDK initialized successfully using ${credentialsTypeUsed}.`);
      } else {
         // This block might be hit if an attempt was made (e.g., explicit vars were set but initializeApp failed for other reasons)
        const postAttemptFailureMsg = `[firebaseAdmin] CRITICAL FAILURE: Firebase Admin SDK initialization was attempted with '${credentialsTypeUsed}', but no app instance was created. This usually means the specific initializeApp call itself failed internally (e.g., invalid key format, service account permissions issue). Check for previous errors from Firebase Admin SDK libraries or detailed logs for '${credentialsTypeUsed}'.`;
        console.error(postAttemptFailureMsg);
        throw new Error(`Firebase Admin SDK failed after attempting initialization with ${credentialsTypeUsed}. Check server logs for underlying Firebase errors.`);
      }
    } catch (error: any) {
      if (error.code === 'app/duplicate-app') {
        console.warn(`[firebaseAdmin] Firebase Admin App already initialized (caught duplicate-app error during attempt with ${credentialsTypeUsed}). Using existing app.`);
        if (admin.apps.length > 0) {
          adminAppInstance = admin.apps[0]!;
        } else {
          console.error('[firebaseAdmin] Firebase Admin SDK: Caught duplicate-app error, but admin.apps array is empty. This is unexpected.');
          throw new Error('Firebase Admin SDK initialization error: Inconsistent state after duplicate-app error (no app found).');
        }
      } else {
        console.error(`[firebaseAdmin] Error during Firebase Admin SDK initializeApp call (attempted with ${credentialsTypeUsed}):`, error);
        throw new Error(`Firebase Admin SDK initialization failed (using ${credentialsTypeUsed}): ${error.message || 'Unknown error during initializeApp'}. Check server logs.`);
      }
    }
  }

  if (!adminAppInstance) {
    const finalErrorMsg = `[firebaseAdmin] CRITICAL: Firebase Admin SDK app instance (adminAppInstance) is null after all initialization attempts. This indicates a fundamental failure in the initialization process. Firestore and Auth services will not be available. Review 'Environment Variable Check' logs and prior error messages.`;
    console.error(finalErrorMsg);
    throw new Error(finalErrorMsg);
  }

  return {
    db: admin.firestore(adminAppInstance),
    auth: admin.auth(adminAppInstance),
    adminNamespace: admin,
  };
}

if (!adminSDKsInternal && !adminInitializationErrorInternal) {
  try {
    adminSDKsInternal = initializeFirebaseAdmin();
  } catch (e) {
    adminInitializationErrorInternal = e as Error;
    console.error(`[firebaseAdmin] Captured FATAL INITIALIZATION ERROR during initial call: ${adminInitializationErrorInternal.message}. Firestore and Auth services via Admin SDK will be unavailable. Ensure your server environment has valid Firebase Admin credentials.`);
  }
}

export const adminDb: Firestore | undefined = adminSDKsInternal?.db;
export const adminAuth: AdminAuth | undefined = adminSDKsInternal?.auth;
export const adminSDK: typeof admin | undefined = adminSDKsInternal?.adminNamespace;
export const adminInitializationError: Error | null = adminInitializationErrorInternal;

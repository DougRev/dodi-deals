
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

function initializeAndGetAdminSDKs(): FirebaseAdminSDKs {
  console.log('[firebaseAdmin] Attempting to initialize Firebase Admin SDK...');
  let adminAppInstance: App;
  let credentialsTypeUsed = "None";

  // Log all relevant environment variables at the start for diagnostics
  console.log('[firebaseAdmin] Environment Variable Check for Admin SDK Initialization:');
  console.log(`  - GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || 'Not set'}`);
  console.log(`  - SERVICE_ACCOUNT_PROJECT_ID: ${process.env.SERVICE_ACCOUNT_PROJECT_ID || 'Not set'}`);
  console.log(`  - SERVICE_ACCOUNT_CLIENT_EMAIL: ${process.env.SERVICE_ACCOUNT_CLIENT_EMAIL || 'Not set'}`);
  console.log(`  - SERVICE_ACCOUNT_PRIVATE_KEY: ${process.env.SERVICE_ACCOUNT_PRIVATE_KEY ? 'Set (value not logged for security)' : 'Not set'}`);
  console.log(`  - FIREBASE_CONFIG: ${process.env.FIREBASE_CONFIG || 'Not set'}`);
  console.log(`  - FUNCTIONS_EMULATOR: ${process.env.FUNCTIONS_EMULATOR || 'Not set'}`);
  console.log(`  - K_SERVICE (Cloud Run): ${process.env.K_SERVICE || 'Not set'}`);
  console.log(`  - GOOGLE_CLOUD_PROJECT (GCP Default): ${process.env.GOOGLE_CLOUD_PROJECT || 'Not set'}`);

  if (admin.apps.length > 0) {
    adminAppInstance = admin.apps[0]!;
    console.log('[firebaseAdmin] Firebase Admin SDK already initialized. Using existing app.');
  } else {
    console.log('[firebaseAdmin] No Firebase Admin app found. Attempting to initialize a new one...');

    const explicitServiceAccountEnv = process.env.SERVICE_ACCOUNT_PROJECT_ID && process.env.SERVICE_ACCOUNT_CLIENT_EMAIL && process.env.SERVICE_ACCOUNT_PRIVATE_KEY;
    const isFirebaseOrGCPlikeEnvironment = process.env.FIREBASE_CONFIG || process.env.FUNCTIONS_EMULATOR === 'true' || process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT;

    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        credentialsTypeUsed = "GOOGLE_APPLICATION_CREDENTIALS";
        console.log(`[firebaseAdmin] Attempting initialization with ${credentialsTypeUsed}. Path: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
        admin.initializeApp({ credential: admin.credential.applicationDefault() });
      } else if (explicitServiceAccountEnv) {
        credentialsTypeUsed = "Explicit Service Account ENV VARS";
        console.log(`[firebaseAdmin] Attempting initialization with ${credentialsTypeUsed}.`);
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.SERVICE_ACCOUNT_PROJECT_ID!,
            clientEmail: process.env.SERVICE_ACCOUNT_CLIENT_EMAIL!,
            privateKey: process.env.SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n'),
          }),
        });
      } else if (isFirebaseOrGCPlikeEnvironment) {
        credentialsTypeUsed = "Default GCP/Firebase Environment Credentials";
        console.log(`[firebaseAdmin] Attempting initialization with ${credentialsTypeUsed} (detected via FIREBASE_CONFIG, FUNCTIONS_EMULATOR, K_SERVICE, or GOOGLE_CLOUD_PROJECT).`);
        admin.initializeApp();
      } else {
        const noMethodAttemptedErrorMsg = `[firebaseAdmin] CRITICAL FAILURE: No Firebase Admin SDK initialization method was attempted.
        None of the expected credential environment variables or indicators were found. Review the 'Environment Variable Check' logs above.
        Common Fixes:
        - Local Development: Ensure GOOGLE_APPLICATION_CREDENTIALS environment variable points to your service account key JSON file.
        - Deployed Environments (e.g., Cloud Run, App Engine, Firebase Hosting for Next.js SSR): Ensure the runtime service account has appropriate IAM permissions and that Application Default Credentials can be discovered.
        - Explicit Variables: If using SERVICE_ACCOUNT_PROJECT_ID, etc., ensure all are correctly set.`;
        console.error(noMethodAttemptedErrorMsg);
        throw new Error(`Firebase Admin SDK failed to initialize: No credential detection method was triggered. Check server logs for environment variable status and setup guides.`);
      }

      if (admin.apps.length > 0) {
        adminAppInstance = admin.apps[0]!;
        console.log(`[firebaseAdmin] Firebase Admin SDK initialized successfully using ${credentialsTypeUsed}.`);
      } else {
        const postAttemptFailureMsg = `[firebaseAdmin] CRITICAL FAILURE: Firebase Admin SDK initialization was attempted with '${credentialsTypeUsed}', but no app instance was created. This usually means the specific initialization call itself failed internally. Check for previous errors from Firebase Admin SDK libraries.`;
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
    const finalErrorMsg = `[firebaseAdmin] CRITICAL: Firebase Admin SDK app instance (adminAppInstance) is null after all initialization attempts. This indicates a fundamental failure in the initialization process. Firestore and Auth services will not be available. Review the 'Environment Variable Check' logs.`;
    console.error(finalErrorMsg);
    throw new Error(finalErrorMsg);
  }

  return {
    db: admin.firestore(adminAppInstance),
    auth: admin.auth(adminAppInstance),
    adminNamespace: admin,
  };
}

try {
  adminSDKsInternal = initializeAndGetAdminSDKs();
} catch (e) {
  adminInitializationErrorInternal = e as Error;
  console.error(`[firebaseAdmin] Captured FATAL INITIALIZATION ERROR: ${adminInitializationErrorInternal.message}. Firestore and Auth services via Admin SDK will be unavailable.`);
}

export const adminDb: Firestore | undefined = adminSDKsInternal?.db;
export const adminAuth: AdminAuth | undefined = adminSDKsInternal?.auth;
export const adminSDK: typeof admin | undefined = adminSDKsInternal?.adminNamespace; // Renamed to avoid conflict with 'admin' import
export const adminInitializationError: Error | null = adminInitializationErrorInternal;

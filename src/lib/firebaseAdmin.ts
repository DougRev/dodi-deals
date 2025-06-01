
// This file should only be imported on the server-side (e.g., in Server Actions or API routes)
import admin from 'firebase-admin';
import type { Firestore, Auth as AdminAuth } from 'firebase-admin/firestore'; // Correct import for Firestore from firebase-admin

// Check if the app is already initialized to prevent errors during hot-reloading
if (!admin.apps.length) {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Used for local development when GOOGLE_APPLICATION_CREDENTIALS is set
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log('[firebaseAdmin] Firebase Admin SDK initialized with application default credentials (likely from GOOGLE_APPLICATION_CREDENTIALS).');
  } else if (process.env.FIREBASE_CONFIG && process.env.NODE_ENV === 'production') {
    // Used in Firebase environments like Cloud Functions or App Hosting (production)
    // where FIREBASE_CONFIG is automatically populated.
     try {
        admin.initializeApp();
        console.log('[firebaseAdmin] Firebase Admin SDK initialized with default credentials (likely Firebase environment).');
    } catch (e: any) {
        if (e.code === 'app/duplicate-app') {
            console.warn('[firebaseAdmin] Firebase Admin App already initialized (default credentials).');
        } else {
            console.error('[firebaseAdmin] Error initializing Firebase Admin SDK with default credentials:', e);
            // Potentially fall back to service account if GOOGLE_APPLICATION_CREDENTIALS was intended but not set
            // For now, we assume GOOGLE_APPLICATION_CREDENTIALS is the primary way for explicit credentials.
             if (process.env.SERVICE_ACCOUNT_PROJECT_ID && process.env.SERVICE_ACCOUNT_CLIENT_EMAIL && process.env.SERVICE_ACCOUNT_PRIVATE_KEY) {
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: process.env.SERVICE_ACCOUNT_PROJECT_ID,
                        clientEmail: process.env.SERVICE_ACCOUNT_CLIENT_EMAIL,
                        privateKey: process.env.SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
                    }),
                });
                console.log('[firebaseAdmin] Firebase Admin SDK initialized using explicit service account environment variables.');
            } else {
                 console.error('[firebaseAdmin] Firebase Admin SDK NOT initialized. No GOOGLE_APPLICATION_CREDENTIALS or suitable default environment detected.');
            }
        }
    }
  } else {
    // Fallback for other environments or if explicit service account env vars are provided
    // Note: Ensure these environment variables are set if you use this method.
    // This is less common for Next.js server actions if GOOGLE_APPLICATION_CREDENTIALS can be used.
    if (process.env.SERVICE_ACCOUNT_PROJECT_ID && process.env.SERVICE_ACCOUNT_CLIENT_EMAIL && process.env.SERVICE_ACCOUNT_PRIVATE_KEY) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.SERVICE_ACCOUNT_PROJECT_ID,
                clientEmail: process.env.SERVICE_ACCOUNT_CLIENT_EMAIL,
                privateKey: process.env.SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
        console.log('[firebaseAdmin] Firebase Admin SDK initialized using explicit service account environment variables.');
    } else {
        console.warn('[firebaseAdmin] Firebase Admin SDK NOT initialized. Set GOOGLE_APPLICATION_CREDENTIALS for local dev or ensure correct server environment.');
    }
  }
} else {
    console.log('[firebaseAdmin] Firebase Admin SDK already initialized.');
}

const adminDb: Firestore = admin.firestore();
const adminAuth: AdminAuth = admin.auth() as any; // Cast needed due to type differences if using older @types/firebase-admin

export { adminDb, adminAuth, admin };

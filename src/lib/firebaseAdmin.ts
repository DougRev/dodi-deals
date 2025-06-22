// src/lib/firebaseAdmin.ts
import admin from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth as AdminAuth } from 'firebase-admin/auth';

if (!admin.apps.length) {
  try {
    // This is the standard way to initialize the admin SDK.
    // It automatically uses GOOGLE_APPLICATION_CREDENTIALS env var for local dev
    // and the attached service account in deployed GCP environments (like Cloud Run).
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log('[firebaseAdmin] Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    // If initialization fails, log the error and re-throw it to prevent the app from starting
    // in a broken state. This is better for debugging than a silent failure.
    console.error('[firebaseAdmin] CRITICAL: Firebase Admin SDK initialization failed.', error);
    throw new Error('Could not initialize Firebase Admin SDK. Check credentials and server logs.');
  }
}

export const adminDb: Firestore = admin.firestore();
export const adminAuth: AdminAuth = admin.auth();
export const adminSDK: typeof admin = admin;

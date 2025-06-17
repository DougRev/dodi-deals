
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore"; // Import Firestore
import { getStorage } from "firebase/storage"; // Import Storage

// Log the values being read from process.env
console.log("[Firebase Setup] Reading Environment Variables (Client-Side Perspective):");
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

// Log the actual values being used, masking the API key for security in logs.
// These logs will appear in the browser console.
if (typeof window !== 'undefined') {
    console.log(`[Firebase Setup] NEXT_PUBLIC_FIREBASE_API_KEY: ${apiKey === undefined ? 'UNDEFINED' : (apiKey === '' ? 'EMPTY_STRING' : `******** (loaded, length: ${apiKey.length})`)}`);
    console.log(`[Firebase Setup] NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${authDomain === undefined ? 'UNDEFINED' : authDomain}`);
    console.log(`[Firebase Setup] NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${projectId === undefined ? 'UNDEFINED' : projectId}`);
    // You can add more logs here for other variables if the issue persists
}

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: authDomain,
  projectId: projectId,
  storageBucket: storageBucket,
  messagingSenderId: messagingSenderId,
  appId: appId
};

// Client-side warnings if critical config values are missing
if (typeof window !== 'undefined') {
  if (!firebaseConfig.apiKey) {
    console.error("[Firebase Setup] FATAL ERROR: Firebase API Key is missing or undefined. Ensure NEXT_PUBLIC_FIREBASE_API_KEY is correctly set in your .env.local file and that you have RESTARTED your Next.js development server.");
  }
  if (!firebaseConfig.authDomain) console.warn("[Firebase Setup] Warning: Firebase Auth Domain (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) is missing or undefined.");
  if (!firebaseConfig.projectId) console.warn("[Firebase Setup] Warning: Firebase Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is missing or undefined.");
}

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage; // Firebase Storage instance

if (!getApps().length) {
  if (firebaseConfig.apiKey && firebaseConfig.projectId) { // Check for API key and Project ID
    try {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      storage = getStorage(app);
      if (typeof window !== 'undefined') {
        console.log("[Firebase Setup] Firebase App initialized successfully on the client.");
      }
    } catch (e: any) {
      console.error("[Firebase Setup] CRITICAL ERROR during Firebase initialization (initializeApp or getAuth/getFirestore/getStorage):", e.message, e);
      // @ts-ignore
      app = undefined; // Ensure app is undefined so dependent services aren't tried
      // @ts-ignore
      auth = undefined;
      // @ts-ignore
      db = undefined;
      // @ts-ignore
      storage = undefined;
      if (typeof window !== 'undefined') {
        alert("Critical Firebase setup error. API Key or other config might be invalid. Check console and .env.local file. Ensure server is restarted after .env.local changes.");
      }
    }
  } else {
    if (typeof window !== 'undefined') {
      console.error("[Firebase Setup] Firebase app NOT initialized because API key or Project ID is missing in the configuration. Check your NEXT_PUBLIC_ environment variables.");
    }
    // Define as undefined to satisfy TypeScript and avoid further errors, but they will not work.
    // @ts-ignore
    app = undefined;
    // @ts-ignore
    auth = undefined;
    // @ts-ignore
    db = undefined;
    // @ts-ignore
    storage = undefined;
  }
} else {
  app = getApps()[0];
  // Services might have been initialized by a previous import, re-get them to be safe.
  try {
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    if (typeof window !== 'undefined') {
         console.log("[Firebase Setup] Using existing Firebase App instance on the client.");
    }
  } catch (e: any) {
     console.error("[Firebase Setup] CRITICAL ERROR getting services from existing Firebase App instance:", e.message, e);
    // @ts-ignore
    auth = undefined;
    // @ts-ignore
    db = undefined;
    // @ts-ignore
    storage = undefined;
  }
}

export { app, auth, db, storage, firebaseConfig };

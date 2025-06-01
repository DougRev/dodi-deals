
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore"; // Import Firestore

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAoFFCt31k-BYlUylepvd3sYPySbuWOLVk",
  authDomain: "dodi-deals.firebaseapp.com",
  projectId: "dodi-deals",
  storageBucket: "dodi-deals.firebasestorage.app",
  messagingSenderId: "791765566766",
  appId: "1:791765566766:web:8f3e3620fe2d07edbe26bf"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app); // Initialize Firestore

export { app, auth, db, firebaseConfig }; // Export db

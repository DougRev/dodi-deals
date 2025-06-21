
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

if (admin.apps.length === 0) {
  admin.initializeApp();
  logger.info("[firebase-admin-init.ts]" +
    "Firebase Admin SDK initialized successfully.");
} else {
  logger.info("[firebase-admin-init.ts]" +
    "Firebase Admin SDK already initialized, using existing app.");
}

export const db = admin.firestore();
export const auth = admin.auth();

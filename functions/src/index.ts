
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK *ONCE*
// Guard ensures initializeApp() runs only if no default app exists.
if (admin.apps.length === 0) {
  admin.initializeApp();
  logger.info("Firebase Admin SDK initialized in functions/src/index.ts");
} else {
  logger.info("Firebase Admin SDK already initialized, using existing app.");
}

// Export the new test function
export * from "./test-function";

// A simple HTTP function for a health check or demo.
export const helloWorld = functions.https.onRequest((request, response) => {
  logger.info("Hello logs from Dodi Deals!", {
    structuredData: true,
  });
  response.send("Hello from Dodi Deals Firebase Functions!");
});

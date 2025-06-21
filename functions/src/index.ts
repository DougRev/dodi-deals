
// This ensures the admin SDK is initialized before any function code runs.
import "./firebase-admin-init";
import * as logger from "firebase-functions/logger";
import {onRequest} from "firebase-functions/v2/httpshttps";

// Export functions from other files to be deployed
export * from "./test-function";
export * from "./stripe-functions";

// A simple HTTP function for a health check or demo, updated to v2.
export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs from Dodi Deals!", {
    structuredData: true,
  });
  response.send("Hello from Dodi Deals Firebase v2 Functions!");
});

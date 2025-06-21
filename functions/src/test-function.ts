// Use v2 onCall handler
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

/**
 * A simple onCall function for testing authentication and invocation.
 * This is now a v2 function.
 */
export const testAuth = onCall({ region: "us-central1" }, (request) => {
  logger.info("[testAuth][v2] Function successfully invoked.");

  // For v2 onCall functions, auth info is in request.auth
  if (!request.auth) {
    logger.warn("[testAuth][v2] Invoked without authentication context.");
    // This is the correct way to throw an error from a v2 onCall function.
    throw new HttpsError(
      "unauthenticated",
      "Authentication required."
    );
  }

  const uid = request.auth.uid;
  logger.info(`[testAuth][v2] Invoked by authenticated user: ${uid}`);

  return {
    status: "success",
    message: `Hello from v2 function, authenticated user ${uid}!`,
  };
});

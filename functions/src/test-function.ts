
import {onCall, HttpsError} from "firebase-functions/v1/https";
import * as logger from "firebase-functions/logger";

/**
 * A simple onCall function for testing authentication and invocation.
 * This is a v1 function.
 */
export const testAuth = onCall({region: "us-central1"}, (request) => {
  logger.info("[testAuth][v1] Function successfully invoked.");

  if (!request.auth) {
    logger.warn("[testAuth][v1] Invoked without authentication context.");
    throw new HttpsError(
      "unauthenticated",
      "Authentication required."
    );
  }

  const uid = request.auth.uid;
  logger.info(`[testAuth][v1] Invoked by authenticated user: ${uid}`);

  return {
    status: "success",
    message: `Hello from v1 function, authenticated user ${uid}!`,
  };
});

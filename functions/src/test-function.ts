
import {onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

/**
 * A simple onCall function for testing authentication and invocation.
 */
export const testAuth = onCall(
  {region: "us-central1"},
  (request) => {
    // Log that the function was invoked successfully.
    logger.info("[testAuth] Function successfully invoked.");

    // Check for authentication context.
    if (!request.auth) {
      logger.warn("[testAuth] Invoked without authentication context.");
      return {status: "error", message: "Authentication required."};
    }

    const uid = request.auth.uid;
    logger.info(`[testAuth] Invoked by authenticated user: ${uid}`);

    // Return a success message with the UID.
    return {
      status: "success",
      message: `Hello, authenticated user ${uid}!`,
    };
  },
);

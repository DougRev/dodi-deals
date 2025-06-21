
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";

/**
 * A simple onCall function for testing authentication and invocation.
 */
export const testAuth = functions
  .region("us-central1")
  .https.onCall((data, context) => {
    logger.info("[testAuth][v1] Function successfully invoked.");

    if (!context.auth) {
      logger.warn("[testAuth][v1] Invoked without authentication context.");
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required."
      );
    }

    const uid = context.auth.uid;
    logger.info(`[testAuth][v1] Invoked by authenticated user: ${uid}`);

    return {
      status: "success",
      message: `Hello from v1 function, authenticated user ${uid}!`,
    };
  });

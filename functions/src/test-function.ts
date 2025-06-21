
import {onCall, HttpsError, type CallableContext} from "firebase-functions/v1/https";
import * as logger from "firebase-functions/logger";

/**
 * A simple onCall function for testing authentication and invocation.
 * This is a v1 function.
 */
export const testAuth = onCall((data: unknown, context: CallableContext) => {
  logger.info("[testAuth][v1] Function successfully invoked.");

  // For v1 onCall functions, authentication info is in context.auth
  if (!context.auth) {
    logger.warn("[testAuth][v1] Invoked without authentication context.");
    throw new HttpsError(
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

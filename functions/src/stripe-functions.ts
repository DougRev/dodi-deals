
import * as admin from "firebase-admin";
import Stripe from "stripe";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

// Secret for Stripe API Key
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

// Global Stripe instance, lazy-initialized
let stripe: Stripe;

/**
 * Lazy-initializes the Stripe SDK instance.
 * Ensures Stripe is initialized only once and with proper error handling.
 * @return {Stripe} The initialized Stripe instance.
 * @throws {Error} If the STRIPE_SECRET_KEY is not configured.
 */
function getStripeInstance(): Stripe {
  // VERY EARLY LOG
  logger.info(
    "[Stripe][getStripeInstance] Function execution STARTED."
  );
  logger.info(
    "--------------------------------------------------"
  );
  if (!stripe) {
    logger.info(
      "[Stripe][getStripeInstance] Stripe instance not found, initializing..."
    );
    const secretValue = stripeSecretKey.value();
    if (!secretValue) {
      const errorMsg = "CRITICAL: STRIPE_SECRET_KEY is not configured or " +
        "accessible. Ensure the secret is set in Firebase Secret Manager " +
        "and the function has permission to access it.";
      logger.error(`[Stripe][getStripeInstance] ${errorMsg}`);
      // Throw a standard error, HttpsError is for client-facing messages
      throw new Error("Stripe configuration error on server.");
    }
    stripe = new Stripe(secretValue, {apiVersion: "2024-06-20"});
    logger.info(
      "[Stripe][getStripeInstance] Stripe SDK initialized successfully."
    );
  } else {
    logger.info(
      "[Stripe][getStripeInstance] Using existing Stripe SDK instance."
    );
  }
  return stripe;
}

/**
 * Creates or retrieves a Stripe Customer for an authenticated Firebase user.
 * @param {object} request - The Firebase onCall request object.
 * @return {Promise<{customerId: string}>} A promise that resolves with the
 *   Stripe Customer ID.
 * @throws {HttpsError} Throws HttpsError on errors.
 */
export const createOrRetrieveStripeCustomer = onCall(
  {
    secrets: [stripeSecretKey],
    region: "us-central1",
    timeoutSeconds: 60,
  },
  async (request) => {
    // VERY EARLY LOG
    const functionName = "[Stripe][createOrRetrieveStripeCustomer]";
    logger.info(`${functionName} Function execution STARTED.`);
    logger.info("--------------------------------------------------");

    if (!request.auth) {
      logger.warn(`${functionName} Unauthenticated request.`);
      throw new HttpsError(
        "unauthenticated",
        "Authentication required. Ensure you are logged in."
      );
    }

    const {uid, token} = request.auth;
    const email = token.email;
    const name = token.name || email || `User ${uid}`;

    logger.info(
      `${functionName} Processing for UID: ${uid}, Email: ${email}, Name: ${name}`
    );

    if (!email) {
      const errorMsg = `User ${uid} missing email; cannot create customer.`;
      logger.error(`${functionName} ${errorMsg}`);
      throw new HttpsError("failed-precondition", errorMsg);
    }

    const userRef = admin.firestore().collection("users").doc(uid);
    let userSnap;

    try {
      logger.info(`${functionName} Retrieving user doc for UID: ${uid}`);
      userSnap = await userRef.get();
      logger.info(
        `${functionName} Firestore user doc retrieved. Exists: ${userSnap.exists}`
      );
    } catch (dbErr) {
      const specificMessage = dbErr instanceof Error ?
        dbErr.message : String(dbErr);
      const logMessage = `Firestore error: ${specificMessage}`;
      logger.error(`${functionName} ${logMessage}`, dbErr);
      throw new HttpsError("internal", "Failed to retrieve user data.");
    }

    if (!userSnap.exists) {
      const errText = `User doc for UID ${uid} not found.`;
      logger.error(`${functionName} ${errText}`);
      throw new HttpsError(
        "not-found",
        "User document not found. Cannot link Stripe customer."
      );
    }

    const userData = userSnap.data();
    logger.info(`${functionName} User data from Firestore:`, userData);

    const existingStripeCustomerId = userData?.stripeCustomerId;

    if (existingStripeCustomerId) {
      const logMsg = "Found existing Stripe Customer ID: " +
        `${existingStripeCustomerId}. Verifying...`;
      logger.info(`${functionName} ${logMsg}`);
      try {
        const stripeInstance = getStripeInstance();
        const customer =
          await stripeInstance.customers.retrieve(existingStripeCustomerId);

        if (customer && !customer.deleted) {
          const verifiedMsg = `Verified Stripe Customer ID ` +
            `${existingStripeCustomerId}. Returning existing ID.`;
          logger.info(`${functionName} ${verifiedMsg}`);
          return {customerId: existingStripeCustomerId};
        }
        logger.warn(
          `${functionName} Stripe Customer ${existingStripeCustomerId} ` +
          "was deleted or invalid. Creating new."
        );
      } catch (verificationError) {
        const errorMsg = verificationError instanceof Error ?
          verificationError.message : String(verificationError);
        logger.warn(
          `${functionName} Error verifying Stripe ID ` +
          `${existingStripeCustomerId}: ${errorMsg}. Creating new.`
        );
      }
    }

    logger.info(
      `${functionName} Creating new Stripe customer for UID: ${uid}.`
    );
    try {
      const stripeInstance = getStripeInstance();
      const customer = await stripeInstance.customers.create({
        email: email,
        name: name,
        metadata: {firebaseUID: uid},
      });

      logger.info(
        `${functionName} Created Stripe Customer ${customer.id} for UID ${uid}.`
      );
      await userRef.set({stripeCustomerId: customer.id}, {merge: true});
      logger.info(
        `${functionName} Updated Firestore for ${uid} with new Stripe ID.`
      );
      logger.info(`${functionName} Function finished successfully.`);
      logger.info("--------------------------------------------------");
      return {customerId: customer.id};
    } catch (stripeErr) {
      const specificMessage = stripeErr instanceof Error ?
        stripeErr.message : String(stripeErr);
      const logMessage = `Stripe API error: ${specificMessage}`;
      logger.error(`${functionName} ${logMessage}`, stripeErr);
      throw new HttpsError("internal", "Stripe customer creation failed.");
    }
  }
);

/**
 * Creates a Stripe SetupIntent for saving card details for future payments.
 * @param {object} request - Firebase onCall request with data.
 * @return {Promise<{clientSecret: string}>} SetupIntent's client secret.
 * @throws {HttpsError} If errors occur.
 */
export const createStripeSetupIntent = onCall(
  {
    secrets: [stripeSecretKey],
    region: "us-central1",
    timeoutSeconds: 60,
  },
  async (request) => {
    // VERY EARLY LOG
    const functionName = "[Stripe][createStripeSetupIntent]";
    logger.info(`${functionName} Function execution STARTED.`);
    logger.info("--------------------------------------------------");

    if (!request.auth) {
      logger.warn(`${functionName} Unauthenticated request.`);
      throw new HttpsError(
        "unauthenticated",
        "Authentication required to create a SetupIntent."
      );
    }

    const {uid} = request.auth;
    const logAuthMsg = `Authenticated user UID: ${uid} requesting SetupIntent.`;
    logger.info(`${functionName} ${logAuthMsg}`);


    const requestData = request.data as { customerId?: unknown };
    const {customerId} = requestData;
    const logReqDataMsg = "Request data for SetupIntent:";
    logger.info(`${functionName} ${logReqDataMsg}`, requestData);


    if (!customerId || typeof customerId !== "string") {
      const errorMsg = `Invalid or missing customerId. Got: ${customerId}`;
      logger.error(`${functionName} ${errorMsg}`);
      throw new HttpsError(
        "invalid-argument",
        "Stripe customerId must be provided as a string."
      );
    }

    logger.info(`${functionName} Creating SetupIntent for Customer: ${customerId}.`);
    try {
      const stripeInstance = getStripeInstance();
      const setupIntent = await stripeInstance.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        usage: "off_session",
      });

      const createdMsg = `Created SetupIntent ${setupIntent.id} for ` +
        `customer ${customerId}.`;
      logger.info(`${functionName} ${createdMsg}`);

      if (!setupIntent.client_secret) {
        const errorMsg = `SetupIntent ${setupIntent.id} missing client_secret.`;
        logger.error(`${functionName} ${errorMsg}`);
        throw new HttpsError(
          "internal",
          "Failed to obtain client_secret for SetupIntent."
        );
      }

      const returnMsg = `Returning client_secret for SetupIntent ${setupIntent.id}.`;
      logger.info(`${functionName} ${returnMsg}`);
      logger.info(`${functionName} Function finished successfully.`);
      logger.info("--------------------------------------------------");
      return {clientSecret: setupIntent.client_secret};
    } catch (stripeErr) {
      const specificMessage = stripeErr instanceof Error ?
        stripeErr.message : String(stripeErr);
      const logMessage = "Stripe API error creating SetupIntent for " +
        `customer ${customerId}: ${specificMessage}`;
      logger.error(`${functionName} ${logMessage}`, stripeErr);
      throw new HttpsError("internal", "Stripe SetupIntent creation failed.");
    }
  }
);

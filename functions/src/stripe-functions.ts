
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
      const errorMsg = "[Stripe][getStripeInstance] CRITICAL: " +
        "STRIPE_SECRET_KEY is not configured or accessible. Ensure the " +
        "secret is set in Firebase Secret Manager and the function has " +
        "permission to access it.";
      logger.error(errorMsg);
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
    cors: true, // Explicitly enable CORS
  },
  async (request) => {
    // VERY EARLY LOG
    logger.info(
      "[Stripe][createOrRetrieveStripeCustomer] Function execution STARTED."
    );
    logger.info(
      "--------------------------------------------------"
    );

    if (!request.auth) {
      logger.warn(
        "[Stripe][createOrRetrieveStripeCustomer] Unauthenticated request."
      );
      throw new HttpsError(
        "unauthenticated",
        "Authentication required. Ensure you are logged in."
      );
    }

    const {uid, token} = request.auth;
    const email = token.email;
    const name = token.name || email || `User ${uid}`;

    logger.info(
      `[Stripe][createOrRetrieveStripeCustomer] Processing for UID: ${uid}, ` +
      `Email: ${email}, Name: ${name}`
    );

    if (!email) {
      logger.error(
        `[Stripe][createOrRetrieveStripeCustomer] User ${uid} missing email.`
      );
      throw new HttpsError(
        "failed-precondition",
        "Authenticated user missing email; cannot create Stripe customer."
      );
    }

    const userRef = admin.firestore().collection("users").doc(uid);
    let userSnap;

    try {
      logger.info(
        "[Stripe][createOrRetrieveStripeCustomer] Retrieving user doc " +
        `for UID: ${uid}`
      );
      userSnap = await userRef.get();
      logger.info(
        "[Stripe][createOrRetrieveStripeCustomer] Firestore user doc " +
        `retrieved. Exists: ${userSnap.exists}`
      );
    } catch (dbErr) {
      const specificMessage = dbErr instanceof Error ?
        dbErr.message : String(dbErr);
      const logMessage =
        "[Stripe][createOrRetrieveStripeCustomer] Firestore error: " +
        specificMessage;
      logger.error(logMessage, dbErr);
      throw new HttpsError("internal", "Failed to retrieve user data.");
    }

    if (!userSnap.exists) {
      const errText =
        `[Stripe][createOrRetrieveStripeCustomer] User doc for UID ${uid} ` +
        "not found.";
      logger.error(errText);
      throw new HttpsError(
        "not-found",
        "User document not found. Cannot link Stripe customer."
      );
    }

    const userData = userSnap.data();
    logger.info(
      "[Stripe][createOrRetrieveStripeCustomer] User data from Firestore:",
      userData
    );

    const existingStripeCustomerId = userData?.stripeCustomerId;

    if (existingStripeCustomerId) {
      logger.info(
        "[Stripe][createOrRetrieveStripeCustomer] Found existing Stripe " +
        `Customer ID: ${existingStripeCustomerId}. Verifying...`
      );
      try {
        const stripeInstance = getStripeInstance();
        logger.info(
          "[Stripe][createOrRetrieveStripeCustomer] Retrieving customer " +
          `${existingStripeCustomerId} from Stripe.`
        );
        const customer =
          await stripeInstance.customers.retrieve(existingStripeCustomerId);

        if (customer && !customer.deleted) {
          logger.info(
            "[Stripe][createOrRetrieveStripeCustomer] Verified Stripe " +
            `Customer ID ${existingStripeCustomerId}. Returning existing ID.`
          );
          return {customerId: existingStripeCustomerId};
        }
        logger.warn(
          "[Stripe][createOrRetrieveStripeCustomer] Stripe Customer " +
          `${existingStripeCustomerId} was deleted or invalid. Creating new.`
        );
      } catch (verificationError) {
        const errorMsg = verificationError instanceof Error ?
          verificationError.message : String(verificationError);
        logger.warn(
          "[Stripe][createOrRetrieveStripeCustomer] Error verifying " +
          `Stripe ID ${existingStripeCustomerId}: ${errorMsg}. Creating new.`
        );
      }
    }

    logger.info(
      "[Stripe][createOrRetrieveStripeCustomer] Creating new Stripe " +
      `customer for UID: ${uid}, Email: ${email}.`
    );
    try {
      const stripeInstance = getStripeInstance();
      const customer = await stripeInstance.customers.create({
        email: email,
        name: name,
        metadata: {firebaseUID: uid},
      });

      logger.info(
        "[Stripe][createOrRetrieveStripeCustomer] Created Stripe Customer " +
        `${customer.id} for UID ${uid}.`
      );
      await userRef.set({stripeCustomerId: customer.id}, {merge: true});
      logger.info(
        "[Stripe][createOrRetrieveStripeCustomer] Updated Firestore user " +
        `${uid} with new Stripe Customer ID ${customer.id}.`
      );
      logger.info(
        "[Stripe][createOrRetrieveStripeCustomer] " +
        "Function finished successfully."
      );
      logger.info("--------------------------------------------------");
      return {customerId: customer.id};
    } catch (stripeErr) {
      const specificMessage = stripeErr instanceof Error ?
        stripeErr.message : String(stripeErr);
      const logMessage =
        "[Stripe][createOrRetrieveStripeCustomer] Stripe API error: " +
        specificMessage;
      logger.error(logMessage, stripeErr);
      throw new HttpsError(
        "internal",
        "Stripe customer creation failed."
      );
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
    cors: true, // Explicitly enable CORS
  },
  async (request) => {
    // VERY EARLY LOG
    logger.info(
      "[Stripe][createStripeSetupIntent] Function execution STARTED."
    );
    logger.info(
      "--------------------------------------------------"
    );

    if (!request.auth) {
      logger.warn("[Stripe][createStripeSetupIntent] Unauthenticated request.");
      throw new HttpsError(
        "unauthenticated",
        "Authentication required to create a SetupIntent."
      );
    }

    const {uid} = request.auth;
    const logAuthMsg =
      `[Stripe][createStripeSetupIntent] Authenticated user UID: ${uid} ` +
      "requesting SetupIntent.";
    logger.info(logAuthMsg);


    const requestData = request.data as { customerId?: unknown };
    const {customerId} = requestData;
    const logReqDataMsg =
      "[Stripe][createStripeSetupIntent] Request data for SetupIntent:";
    logger.info(logReqDataMsg, requestData);


    if (!customerId || typeof customerId !== "string") {
      logger.error(
        "[Stripe][createStripeSetupIntent] Invalid or missing customerId " +
        `in request. CustomerId: ${customerId}`
      );
      throw new HttpsError(
        "invalid-argument",
        "Stripe customerId must be provided as a string."
      );
    }

    logger.info(
      "[Stripe][createStripeSetupIntent] Creating SetupIntent for Customer " +
      `ID: ${customerId}.`
    );
    try {
      const stripeInstance = getStripeInstance();
      const setupIntent = await stripeInstance.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        usage: "off_session",
      });

      logger.info(
        "[Stripe][createStripeSetupIntent] Created SetupIntent " +
        `${setupIntent.id} for customer ${customerId}.`
      );

      if (!setupIntent.client_secret) {
        logger.error(
          `[Stripe][createStripeSetupIntent] SetupIntent ${setupIntent.id} ` +
          "is missing client_secret."
        );
        throw new HttpsError(
          "internal",
          "Failed to obtain client_secret for SetupIntent."
        );
      }

      logger.info(
        "[Stripe][createStripeSetupIntent] Returning client_secret for " +
        `SetupIntent ${setupIntent.id}.`
      );
      logger.info(
        "[Stripe][createStripeSetupIntent] Function finished successfully."
      );
      logger.info("--------------------------------------------------");
      return {clientSecret: setupIntent.client_secret};
    } catch (stripeErr) {
      const specificMessage = stripeErr instanceof Error ?
        stripeErr.message : String(stripeErr);
      const logMessage =
        "[Stripe][createStripeSetupIntent] Stripe API error creating " +
        `SetupIntent for customer ${customerId}: ${specificMessage}`;
      logger.error(logMessage, stripeErr);
      throw new HttpsError(
        "internal",
        "Stripe SetupIntent creation failed."
      );
    }
  }
);

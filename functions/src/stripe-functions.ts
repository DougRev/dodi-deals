
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

// Secret for Stripe API Key
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

// Global Stripe instance, lazy-initialized
let stripe: Stripe;

/**
 * Lazy-initializes the Stripe SDK instance.
 * Ensures Stripe is initialized only once and with proper error handling.
 * @return {Stripe} The initialized Stripe instance.
 * @throws {HttpsError} If the STRIPE_SECRET_KEY is not configured.
 */
function getStripeInstance(): Stripe {
  if (!stripe) {
    const secretValue = stripeSecretKey.value();
    if (!secretValue) {
      logger.error(
        "[Stripe] CRITICAL: STRIPE_SECRET_KEY is not configured or accessible. " +
        "Ensure the secret is set in Firebase Secret Manager and the function " +
        "has permission to access it."
      );
      throw new HttpsError(
        "internal",
        "Stripe configuration missing. STRIPE_SECRET_KEY not found."
      );
    }
    stripe = new Stripe(secretValue, { apiVersion: "2024-06-20" }); // Use a fixed API version
    logger.info("[Stripe] Stripe SDK initialized successfully.");
  }
  return stripe;
}

/**
 * Creates or retrieves a Stripe Customer for an authenticated Firebase user.
 * @param {onCall.Request} request - The Firebase `onCall` request object.
 *                                   Requires `request.auth` to be populated.
 * @return {Promise<{customerId: string}>} A promise that resolves with the
 *                                         Stripe Customer ID.
 * @throws {HttpsError} Throws HttpsError on authentication failure, missing
 *                      user email, Firestore errors, or Stripe API errors.
 */
export const createOrRetrieveStripeCustomer = onCall(
  { secrets: [stripeSecretKey], region: "us-central1", timeoutSeconds: 60 },
  async (request) => {
    // NEW VERY EARLY LOG
    logger.info("[Stripe] 'createOrRetrieveStripeCustomer' function execution STARTED.");
    logger.info("--------------------------------------------------");

    if (!request.auth) {
      logger.warn(
        "[Stripe] Unauthenticated request to 'createOrRetrieveStripeCustomer'. 'request.auth' is undefined or null."
      );
      throw new HttpsError(
        "unauthenticated",
        "Authentication required. Ensure you are logged in."
      );
    }

    const { uid, token } = request.auth;
    const email = token.email;
    const name = token.name || email || `User ${uid}`; // Fallback for name

    logger.info(`[Stripe] Processing for UID: ${uid}, Email from token: ${email}, Name: ${name}`);

    if (!email) {
      logger.error(
        `[Stripe] User ${uid} missing email in auth token. Cannot create Stripe customer.`
      );
      throw new HttpsError(
        "failed-precondition",
        "Authenticated user missing email; cannot create Stripe customer."
      );
    }

    const userRef = admin.firestore().collection("users").doc(uid);
    let userSnap;

    try {
      logger.info(`[Stripe] Retrieving user document from Firestore for UID: ${uid}`);
      userSnap = await userRef.get();
      logger.info(`[Stripe] Firestore user document retrieved. Exists: ${userSnap.exists}`);
    } catch (dbErr: unknown) {
      const errorMessage = dbErr instanceof Error ? dbErr.message : String(dbErr);
      logger.error(
        `[Stripe] Firestore error getting user ${uid}: ${errorMessage}`,
        dbErr
      );
      throw new HttpsError(
        "internal",
        `Failed to retrieve user data: ${errorMessage}`
      );
    }

    if (!userSnap.exists) {
      logger.error(
        `[Stripe] User document for UID ${uid} not found in Firestore.`
      );
      throw new HttpsError(
        "not-found",
        "User document not found. Cannot link Stripe customer."
      );
    }

    const userData = userSnap.data();
    logger.info("[Stripe] User data from Firestore:", userData);

    const existingStripeCustomerId = userData?.stripeCustomerId;

    if (existingStripeCustomerId) {
      logger.info(
        `[Stripe] Found existing Stripe Customer ID: ${existingStripeCustomerId} for user ${uid}. Verifying...`
      );
      try {
        const stripeInstance = getStripeInstance();
        logger.info(
          `[Stripe] Attempting to retrieve customer ${existingStripeCustomerId} from Stripe.`
        );
        const customer = await stripeInstance.customers.retrieve(
          existingStripeCustomerId
        );
        logger.info("[Stripe] Stripe customer retrieved:", customer);

        if (customer && !customer.deleted) {
          logger.info(
            `[Stripe] Verified Stripe Customer ID ${existingStripeCustomerId}. Returning existing ID.`
          );
          return { customerId: existingStripeCustomerId };
        }
        logger.warn(
          `[Stripe] Stripe Customer ID ${existingStripeCustomerId} was deleted in Stripe or invalid. A new one will be created.`
        );
      } catch (verificationError: unknown) {
        const errorMsg =
          verificationError instanceof Error ?
            verificationError.message :
            String(verificationError);
        logger.warn(
          `[Stripe] Error verifying existing Stripe ID ${existingStripeCustomerId}: ${errorMsg.substring(0, 100)}. A new one will be created.`
        );
      }
    }

    logger.info(
      `[Stripe] Creating new Stripe customer for UID: ${uid}, Email: ${email}.`
    );
    try {
      const stripeInstance = getStripeInstance();
      const customer = await stripeInstance.customers.create({
        email: email,
        name: name,
        metadata: { firebaseUID: uid },
      });

      logger.info(
        `[Stripe] Created Stripe Customer ${customer.id} for UID ${uid}.`
      );
      await userRef.set({ stripeCustomerId: customer.id }, { merge: true });
      logger.info(
        `[Stripe] Updated Firestore user ${uid} with new Stripe Customer ID ${customer.id}.`
      );
      logger.info("[Stripe] 'createOrRetrieveStripeCustomer' finished successfully.");
      logger.info("--------------------------------------------------");
      return { customerId: customer.id };
    } catch (stripeErr: unknown) {
      const errorMessage =
        stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      logger.error(
        `[Stripe] Stripe API error creating customer for UID ${uid}: ${errorMessage}`,
        stripeErr
      );
      throw new HttpsError(
        "internal",
        `Stripe customer creation failed: ${errorMessage}`
      );
    }
  }
);

interface CreateSetupIntentData {
  customerId?: unknown; // Validated as string below
}

/**
 * Creates a Stripe SetupIntent for saving card details for future payments.
 * @param {onCall.Request<CreateSetupIntentData>} request - The Firebase `onCall` request object.
 *                                   Requires `request.auth` and `request.data.customerId`.
 * @return {Promise<{clientSecret: string}>} A promise that resolves with the
 *                                           SetupIntent's client secret.
 * @throws {HttpsError} Throws HttpsError on authentication failure, invalid
 *                      arguments, or Stripe API errors.
 */
export const createStripeSetupIntent = onCall(
  { secrets: [stripeSecretKey], region: "us-central1", timeoutSeconds: 60 },
  async (request) => {
    // NEW VERY EARLY LOG
    logger.info("[Stripe] 'createStripeSetupIntent' function execution STARTED.");
    logger.info("--------------------------------------------------");

    if (!request.auth) {
      logger.warn(
        "[Stripe] Unauthenticated request to 'createStripeSetupIntent'."
      );
      throw new HttpsError(
        "unauthenticated",
        "Authentication required to create a SetupIntent."
      );
    }

    const { uid } = request.auth;
    logger.info(`[Stripe] Authenticated user UID: ${uid} requesting SetupIntent.`);

    const requestData = request.data as CreateSetupIntentData;
    const { customerId } = requestData;
    logger.info("[Stripe] Request data for SetupIntent:", requestData);

    if (!customerId || typeof customerId !== "string") {
      logger.error(
        "[Stripe] Invalid or missing customerId in SetupIntent request. " +
        `CustomerId: ${customerId}, Type: ${typeof customerId}`
      );
      throw new HttpsError(
        "invalid-argument",
        "Stripe customerId must be provided as a string."
      );
    }

    logger.info(
      `[Stripe] Creating SetupIntent for Customer ID: ${customerId}.`
    );
    try {
      const stripeInstance = getStripeInstance();
      const setupIntent = await stripeInstance.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"], // Specify payment method types
        usage: "off_session", // Indicates future off-session payments
      });

      logger.info(
        `[Stripe] Created SetupIntent ${setupIntent.id} for customer ${customerId}.`
      );

      if (!setupIntent.client_secret) {
        logger.error(
          `[Stripe] SetupIntent ${setupIntent.id} is missing client_secret. This is unexpected.`
        );
        throw new HttpsError(
          "internal",
          "Failed to obtain client_secret for SetupIntent."
        );
      }

      logger.info(
        `[Stripe] Returning client_secret for SetupIntent ${setupIntent.id}.`
      );
      logger.info("[Stripe] 'createStripeSetupIntent' finished successfully.");
      logger.info("--------------------------------------------------");
      return { clientSecret: setupIntent.client_secret };
    } catch (stripeErr: unknown) {
      const errorMessage =
        stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      logger.error(
        `[Stripe] Stripe API error creating SetupIntent for customer ${customerId}: ${errorMessage}`,
        stripeErr
      );
      throw new HttpsError(
        "internal",
        `Stripe SetupIntent creation failed: ${errorMessage}`
      );
    }
  }
);

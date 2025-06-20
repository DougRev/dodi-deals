
import * as admin from "firebase-admin";
import Stripe from "stripe";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

let stripe: Stripe;

/**
 * Lazy-initialize Stripe, erroring if missing secret.
 * @return {Stripe} The initialized Stripe instance.
 */
function getStripeInstance(): Stripe {
  logger.info("[Stripe] getStripeInstance called.");
  if (!stripe) {
    const secretVal = stripeSecretKey.value();
    if (!secretVal) {
      logger.error(
        "[Stripe] CRITICAL: STRIPE_SECRET_KEY not configured or " +
        "accessible. Ensure the secret is set in Firebase Secret Manager " +
        "and the function has permission to access it."
      );
      throw new Error(
        "Stripe configuration missing. STRIPE_SECRET_KEY not found."
      );
    }
    logger.info("[Stripe] Initializing Stripe SDK with secret key.");
    stripe = new Stripe(secretVal, {apiVersion: "2024-06-20"});
    logger.info("[Stripe] Stripe SDK initialized successfully.");
  }
  return stripe;
}

/**
 * Create or retrieve Stripe Customer for authenticated user.
 * @return {{customerId: string}} The Stripe Customer ID.
 */
export const createOrRetrieveStripeCustomer = onCall(
  {secrets: [stripeSecretKey], region: "us-central1"},
  async (request) => {
    logger.info("--------------------------------------------------");
    logger.info("[Stripe] createOrRetrieveStripeCustomer invoked.");
    logger.info(
      `[Stripe] Request auth type: ${typeof request.auth}, value:`,
      request.auth
    );

    const auth = request.auth;
    if (!auth) {
      logger.warn(
        "[Stripe] Unauthenticated request to createOrRetrieveStripeCustomer."
      );
      throw new HttpsError(
        "unauthenticated",
        "Must be authenticated to call this function."
      );
    }

    const uid = auth.uid;
    const email = auth.token.email; // Email from auth token

    if (!email) { // Check if email exists on the auth token
      logger.error(
        `[Stripe] No email on authenticated user ${uid} (from token). ` +
        "Cannot create Stripe customer."
      );
      throw new HttpsError(
        "internal",
        "Authenticated user missing email, cannot create Stripe customer."
      );
    }
    logger.info(
      `[Stripe] Authenticated user UID: ${uid}, Email from token: ${email}`
    );

    const name = auth.token.name || email; // Default to email if name not in token
    logger.info(
      `[Stripe] Processing for UID: ${uid}, Email: ${email}, Name: ${name}`
    );

    const userRef = admin.firestore().collection("users").doc(uid);
    let userSnap;
    try {
      logger.info(
        `[Stripe] Retrieving user document from Firestore for UID: ${uid}`
      );
      userSnap = await userRef.get();
      logger.info(
        `[Stripe] Firestore user document retrieved. Exists: ${userSnap.exists}`
      );
    } catch (dbErr: unknown) {
      const errorMessage =
        dbErr instanceof Error ? dbErr.message : String(dbErr);
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
        `[Stripe] User document for UID ${uid} not found in Firestore. ` +
        "This should not happen if user is authenticated and profile " +
        "was created."
      );
      throw new HttpsError(
        "not-found",
        "User document not found. Cannot link Stripe customer. " +
        "Please ensure your profile is complete."
      );
    }

    const userData = userSnap.data();
    logger.info("[Stripe] User data from Firestore:", userData);

    if (userData?.stripeCustomerId) {
      logger.info(
        `[Stripe] Found existing Stripe Customer ID: ` +
        `${userData.stripeCustomerId} for user ${uid}. Verifying customer...`
      );
      try {
        const inst = getStripeInstance();
        logger.info(
          `[Stripe] Attempting to retrieve customer ` +
          `${userData.stripeCustomerId} from Stripe.`
        );
        const customer =
          await inst.customers.retrieve(userData.stripeCustomerId);
        logger.info("[Stripe] Stripe customer retrieved:", customer);
        if (customer && !customer.deleted) {
          logger.info(
            `[Stripe] Verified Stripe Customer ID ${userData.stripeCustomerId}. `+
            "Returning existing ID."
          );
          return {customerId: userData.stripeCustomerId};
        }
        logger.warn(
          `[Stripe] Stripe Customer ID ${userData.stripeCustomerId} was ` +
          "found in Firestore but not found or was deleted in Stripe. " +
          "A new one will be created."
        );
      } catch (verificationError: unknown) {
        const errorMessage =
          verificationError instanceof Error ?
            verificationError.message :
            String(verificationError);
        logger.warn(
          `[Stripe] Error verifying existing Stripe Customer ID ` +
          `${userData.stripeCustomerId}: ${errorMessage}. ` +
          "This might happen if the ID is invalid or network issues " +
          "occurred. A new one will be created."
        );
      }
    }

    logger.info(
      `[Stripe] No valid Stripe Customer ID found for user ${uid}, ` +
      "or existing one was invalid. Creating new Stripe customer."
    );
    try {
      const inst = getStripeInstance();
      const customer = await inst.customers.create({
        email: email,
        name: name,
        metadata: {firebaseUID: uid},
      });
      logger.info(
        `[Stripe] Created Stripe Customer ${customer.id} for UID ${uid}.`
      );
      await userRef.update({stripeCustomerId: customer.id});
      logger.info(
        `[Stripe] Updated Firestore user ${uid} with Stripe Customer ID ` +
        `${customer.id}.`
      );
      return {customerId: customer.id};
    } catch (stripeErr: unknown) {
      const errorMessage =
        stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      logger.error(
        `[Stripe] Stripe API error creating customer for UID ${uid}: ` +
        `${errorMessage}`,
        stripeErr
      );
      throw new HttpsError(
        "internal",
        `Stripe customer creation failed: ${errorMessage}`
      );
    } finally {
      logger.info("[Stripe] createOrRetrieveStripeCustomer finished.");
      logger.info("--------------------------------------------------");
    }
  }
);

interface CreateSetupIntentData {
  customerId?: unknown;
}

/**
 * Create Stripe SetupIntent for saving card details for future payments.
 * @return {{clientSecret: string}} The SetupIntent client secret.
 */
export const createStripeSetupIntent = onCall(
  {secrets: [stripeSecretKey], region: "us-central1"},
  async (request) => {
    logger.info("--------------------------------------------------");
    logger.info("[Stripe] createStripeSetupIntent invoked.");
    logger.info(
      `[Stripe] Request auth type: ${typeof request.auth}, value:`,
      request.auth
    );

    const auth = request.auth;
    if (!auth) {
      logger.warn(
        "[Stripe] Unauthenticated request to createStripeSetupIntent."
      );
      throw new HttpsError(
        "unauthenticated",
        "Must be authenticated to create a SetupIntent."
      );
    }
    logger.info(`[Stripe] Authenticated user UID: ${auth.uid}`);

    const requestData = request.data as CreateSetupIntentData;
    const {customerId} = requestData;
    logger.info("[Stripe] Request data for SetupIntent:", requestData);

    if (!customerId || typeof customerId !== "string") {
      logger.error(
        "[Stripe] Invalid or missing customerId in request data. " +
        `CustomerId: ${customerId}, Type: ${typeof customerId}`
      );
      throw new HttpsError(
        "invalid-argument",
        "Stripe customerId must be provided as a string."
      );
    }

    logger.info(
      `[Stripe] Creating SetupIntent for Customer ${customerId}.`
    );
    try {
      const inst = getStripeInstance();
      const setupIntent = await inst.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        usage: "off_session",
      });
      logger.info(
        `[Stripe] Created SetupIntent ${setupIntent.id} for customer ` +
        `${customerId}.`
      );

      if (!setupIntent.client_secret) {
        logger.error(
          `[Stripe] SetupIntent ${setupIntent.id} is missing client_secret! ` +
          "This is unexpected."
        );
        throw new HttpsError(
          "internal",
          "Failed to obtain client_secret for SetupIntent. " +
          "This should not happen."
        );
      }
      logger.info(
        `[Stripe] Returning client_secret for SetupIntent ${setupIntent.id}.`
      );
      return {clientSecret: setupIntent.client_secret};
    } catch (stripeErr: unknown) {
      const errorMessage =
        stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      logger.error(
        `[Stripe] Stripe API error creating SetupIntent for customer ` +
        `${customerId}: ${errorMessage}`,
        stripeErr
      );
      throw new HttpsError(
        "internal",
        `Stripe SetupIntent creation failed: ${errorMessage}`
      );
    } finally {
      logger.info("[Stripe] createStripeSetupIntent finished.");
      logger.info("--------------------------------------------------");
    }
  }
);

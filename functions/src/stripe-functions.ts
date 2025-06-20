
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
      throw new HttpsError(
        "internal",
        "Stripe configuration missing. Check server logs."
      );
    }
    logger.info("[Stripe] Initializing Stripe SDK with secret key.");
    stripe = new Stripe(secretVal, {apiVersion: "2024-06-20"});
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
    logger.info("[Stripe] createOrRetrieveStripeCustomer invoked.");
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
    const email = auth.token.email;

    if (!email) {
      logger.error(`[Stripe] No email on authenticated user ${uid}.`);
      throw new HttpsError(
        "internal",
        "Authenticated user missing email, cannot create Stripe customer."
      );
    }
    const name = auth.token.name || email;
    logger.info(
      `[Stripe] Processing for UID: ${uid}, Email: ${email}, Name: ${name}`
    );

    const userRef = admin.firestore().collection("users").doc(uid);
    let userSnap;
    try {
      logger.info(`[Stripe] Retrieving user document for UID=${uid}`);
      userSnap = await userRef.get();
    } catch (dbErr: unknown) {
      const errorMessage = dbErr instanceof Error ?
        dbErr.message : String(dbErr);
      logger.error(
        `[Stripe] Firestore error getting user ${uid}:`,
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
    if (userData?.stripeCustomerId) {
      logger.info(
        `[Stripe] Found existing Stripe Customer ID ${userData.stripeCustomerId} ` +
        `for user ${uid}. Verifying customer...`
      );
      try {
        const inst = getStripeInstance();
        const customer = await inst.customers.retrieve(
          userData.stripeCustomerId
        );
        if (customer && !customer.deleted) {
          logger.info(
            `[Stripe] Verified Stripe Customer ID ${userData.stripeCustomerId}.`
          );
          return {customerId: userData.stripeCustomerId};
        }
        logger.warn(
          `[Stripe] Stripe Customer ID ${userData.stripeCustomerId} was not ` +
          "found or deleted. A new one will be created."
        );
      } catch (verificationError: unknown) {
        const errorMessage = verificationError instanceof Error ?
          verificationError.message : String(verificationError);
        logger.warn(
          "[Stripe] Error verifying existing Stripe Customer ID " +
          `${userData.stripeCustomerId}: ${errorMessage}. ` +
          "A new one will be created."
        );
      }
    }

    logger.info(
      `[Stripe] No valid Stripe Customer ID for user ${uid}. Creating new.`
    );
    try {
      const inst = getStripeInstance();
      const customer = await inst.customers.create({
        email: email,
        name: name,
        metadata: {firebaseUID: uid},
      });
      logger.info(
        `[Stripe] Created Stripe Customer ${customer.id} for UID ${uid}`
      );
      await userRef.update({stripeCustomerId: customer.id});
      logger.info(
        `[Stripe] Updated Firestore user ${uid} with Stripe ID ${customer.id}`
      );
      return {customerId: customer.id};
    } catch (stripeErr: unknown) {
      const errorMessage = stripeErr instanceof Error ?
        stripeErr.message : String(stripeErr);
      logger.error(
        `[Stripe] Stripe API error creating customer for UID ${uid}:`,
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
  customerId?: unknown; // Initially unknown to check type
}

/**
 * Create Stripe SetupIntent for saving card details for future payments.
 * @return {{clientSecret: string}} The SetupIntent client secret.
 */
export const createStripeSetupIntent = onCall(
  {secrets: [stripeSecretKey], region: "us-central1"},
  async (request) => {
    logger.info("[Stripe] createStripeSetupIntent invoked.");
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

    const requestData = request.data as CreateSetupIntentData;
    const {customerId} = requestData;

    if (!customerId || typeof customerId !== "string") {
      logger.error(
        "[Stripe] Invalid or missing customerId in request data. Data:",
        request.data
      );
      throw new HttpsError(
        "invalid-argument",
        "Stripe customerId must be provided as a string."
      );
    }

    logger.info(`[Stripe] Creating SetupIntent for Customer ${customerId}`);
    try {
      const inst = getStripeInstance();
      const setupIntent = await inst.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        usage: "off_session", // For future, off-session payments
      });
      logger.info(
        `[Stripe] Created SetupIntent ${setupIntent.id} for ${customerId}`
      );
      if (!setupIntent.client_secret) {
        logger.error(
          `[Stripe] SetupIntent ${setupIntent.id} missing client_secret!`
        );
        throw new HttpsError(
          "internal",
          "Failed to obtain client_secret for SetupIntent."
        );
      }
      return {clientSecret: setupIntent.client_secret};
    } catch (stripeErr: unknown) {
      const errorMessage = stripeErr instanceof Error ?
        stripeErr.message : String(stripeErr);
      logger.error(
        `[Stripe] Stripe API error creating SetupIntent for ${customerId}:`,
        stripeErr
      );
      throw new HttpsError(
        "internal",
        `Stripe SetupIntent creation failed: ${errorMessage}`
      );
    }
  }
);

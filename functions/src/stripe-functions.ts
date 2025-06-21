
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {defineSecret} from "firebase-functions/params";
import Stripe from "stripe";
import {db} from "./firebase-admin-init"; // Import the initialized db instance

// Define the Stripe secret key using Firebase's defineSecret function.
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

// Helper function to initialize Stripe, ensuring the secret key is loaded.
const initializeStripe = () => {
  const key = stripeSecretKey.value();
  if (!key) {
    logger.error(
      "[Stripe] CRITICAL: Stripe secret key is not available. Ensure " +
      "STRIPE_SECRET_KEY is set in your secrets.",
      {structuredData: true}
    );
    throw new HttpsError(
      "internal",
      "Stripe configuration is missing on the server."
    );
  }
  return new Stripe(key, {
    apiVersion: "2024-06-20",
    typescript: true,
  });
};

/**
 * Creates a Stripe Customer object if one doesn't exist for the user,
 * or retrieves the existing one.
 */
export const createOrRetrieveStripeCustomer = onCall(
  {secrets: [stripeSecretKey]},
  async (request) => {
    logger.info(
      "[createOrRetrieveStripeCustomer] Function execution STARTED."
    );

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Authentication required to create Stripe customer."
      );
    }
    const uid = request.auth.uid;
    const userRef = db.collection("users").doc(uid);

    try {
      const userDoc = await userRef.get();
      const userData = userDoc.data();

      if (userData?.stripeCustomerId) {
        logger.info(
          "[createOrRetrieveStripeCustomer] Found existing Stripe " +
          "customer ID for user ${uid}: ${userData.stripeCustomerId}"
        );
        return {customerId: userData.stripeCustomerId};
      }

      logger.info(
        "[createOrRetrieveStripeCustomer] No Stripe customer ID found for " +
        "user ${uid}. Creating a new one."
      );

      const stripe = initializeStripe();
      const customer = await stripe.customers.create({
        email: request.auth.token.email,
        name: userData?.name,
        metadata: {firebaseUID: uid},
      });

      await userRef.update({stripeCustomerId: customer.id});

      logger.info(
        "[createOrRetrieveStripeCustomer] Successfully created and " +
        "saved new Stripe customer ID for user ${uid}: ${customer.id}"
      );

      return {customerId: customer.id};
    } catch (error) {
      logger.error(
        "[createOrRetrieveStripeCustomer] Error processing for user ${uid}:",
        error
      );
      throw new HttpsError("internal", "Failed to process Stripe customer.");
    }
  }
);


/**
 * Creates a Stripe SetupIntent to securely save a payment method for
 * future use.
 */
export const createStripeSetupIntent = onCall(
  {secrets: [stripeSecretKey]},
  async (request) => {
    logger.info("[createStripeSetupIntent] Function execution STARTED.");

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Authentication required to create a SetupIntent."
      );
    }

    const {customerId} = request.data;
    if (!customerId) {
      throw new HttpsError(
        "invalid-argument",
        "Customer ID is required to create a SetupIntent."
      );
    }

    try {
      const stripe = initializeStripe();
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
      });

      logger.info(
        "[createStripeSetupIntent] Successfully created SetupIntent for " +
        "customer ${customerId}."
      );

      return {clientSecret: setupIntent.client_secret};
    } catch (error) {
      logger.error(
        "[createStripeSetupIntent] Error creating SetupIntent for " +
        "customer ${customerId}:",
        error
      );
      throw new HttpsError("internal", "Failed to create Stripe SetupIntent.");
    }
  }
);

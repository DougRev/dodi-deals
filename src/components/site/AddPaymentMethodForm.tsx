
"use client";

import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useAppContext } from '@/hooks/useAppContext';
import { getFunctions, httpsCallable, type FunctionsError } from 'firebase/functions';
import { app as firebaseApp } from '@/lib/firebase'; // Import the initialized Firebase app
import { Loader2, CreditCard, Lock } from 'lucide-react';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#32325d", // Example color, can be themed
      fontFamily: '"Alegreya", serif',
      fontSmoothing: "antialiased",
      fontSize: "16px",
      "::placeholder": {
        color: "#aab7c4",
      },
    },
    invalid: {
      color: "#fa755a",
      iconColor: "#fa755a",
    },
  },
};

interface AddPaymentMethodFormProps {
  onPaymentMethodAdded: () => void; // Callback after successful addition
  onCancel: () => void;
}

export function AddPaymentMethodForm({ onPaymentMethodAdded, onCancel }: AddPaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!stripe || !elements || !user) {
      setError("Stripe.js has not loaded yet, or user is not available.");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Card details element not found.");
      return;
    }

    setLoading(true);

    try {
      // Explicitly use the Firebase app instance and specify the region
      const functions = getFunctions(firebaseApp, 'us-central1');
      console.log("[AddPaymentMethodForm] Firebase Functions instance obtained for region 'us-central1'. Preparing to call 'createOrRetrieveStripeCustomer'.");
      
      const createOrRetrieveCustomer = httpsCallable(functions, 'createOrRetrieveStripeCustomer');
      const customerResult = await createOrRetrieveCustomer() as { data: { customerId: string } };
      const customerId = customerResult.data.customerId;
      console.log("[AddPaymentMethodForm] 'createOrRetrieveStripeCustomer' successful. Customer ID:", customerId);

      if (!customerId) {
        throw new Error("Failed to create or retrieve Stripe customer.");
      }

      console.log("[AddPaymentMethodForm] Preparing to call 'createStripeSetupIntent'.");
      const createSetupIntent = httpsCallable(functions, 'createStripeSetupIntent');
      const setupIntentResult = await createSetupIntent({ customerId }) as { data: { clientSecret: string } };
      const clientSecret = setupIntentResult.data.clientSecret;
      console.log("[AddPaymentMethodForm] 'createStripeSetupIntent' successful. Client Secret obtained.");


      if (!clientSecret) {
        throw new Error("Failed to create Stripe SetupIntent.");
      }

      console.log("[AddPaymentMethodForm] Confirming card setup with Stripe.");
      const { setupIntent, error: setupError } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: user.name,
            email: user.email,
          },
        },
      });

      if (setupError) {
        console.error("[AddPaymentMethodForm] Stripe confirmCardSetup error:", setupError);
        throw setupError;
      }

      console.log("[AddPaymentMethodForm] Stripe confirmCardSetup result:", setupIntent);
      if (setupIntent?.status === 'succeeded') {
        toast({
          title: "Payment Method Saved",
          description: "Your card has been securely saved.",
        });
        onPaymentMethodAdded(); // Notify parent component
      } else {
        throw new Error(setupIntent?.last_setup_error?.message || "Failed to save card. Status: " + setupIntent?.status);
      }
    } catch (err: any) {
      console.error("[AddPaymentMethodForm] Error adding payment method:", err);
      let displayError = err.message || "An unexpected error occurred. Please try again.";
      
      // Check for specific Firebase Functions error codes
      if (err.code) {
        switch (err.code) {
          case 'functions/unauthenticated':
            displayError = "Authentication error. Please ensure you are logged in.";
            break;
          case 'functions/permission-denied':
            displayError = "Permission denied. You may not have access to this feature.";
            break;
          case 'functions/not-found':
             displayError = "The requested function was not found. This might be a deployment or naming issue.";
             break;
          case 'functions/internal':
            displayError = "An internal server error occurred. Please try again later or contact support. Check server logs for details.";
            break;
          case 'functions/unavailable':
             displayError = "The service is temporarily unavailable. Please try again later.";
             break;
          default:
            // Keep the original message if it's a Stripe error or other specific message
            if (!err.type || !err.type.startsWith('Stripe')) {
                 displayError = `Function call failed: ${err.code}. ${err.message || "Please try again."}`;
            }
            break;
        }
      } else if (err.type && err.type.startsWith('Stripe')) { // Stripe specific errors
        displayError = err.message; // Stripe errors are usually user-friendly
      }
      
      setError(displayError);
      toast({
        title: "Error Saving Card",
        description: displayError,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl my-6">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary flex items-center">
          <CreditCard className="mr-2 h-6 w-6"/> Add New Payment Method
        </CardTitle>
        <CardDescription>
          Your card details are securely handled by Stripe.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="p-3 border rounded-md bg-muted/30">
            <CardElement options={CARD_ELEMENT_OPTIONS} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-3">
           <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={!stripe || loading} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Lock className="mr-2 h-4 w-4" />
            )}
            {loading ? 'Saving...' : 'Save Card'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

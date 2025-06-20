
"use client";

import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useAppContext } from '@/hooks/useAppContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
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
      // Step 1: Create or retrieve Stripe Customer ID
      const functions = getFunctions();
      const createOrRetrieveCustomer = httpsCallable(functions, 'createOrRetrieveStripeCustomer');
      const customerResult = await createOrRetrieveCustomer() as { data: { customerId: string } };
      const customerId = customerResult.data.customerId;

      if (!customerId) {
        throw new Error("Failed to create or retrieve Stripe customer.");
      }

      // Step 2: Create a SetupIntent
      const createSetupIntent = httpsCallable(functions, 'createStripeSetupIntent');
      const setupIntentResult = await createSetupIntent({ customerId }) as { data: { clientSecret: string } };
      const clientSecret = setupIntentResult.data.clientSecret;

      if (!clientSecret) {
        throw new Error("Failed to create Stripe SetupIntent.");
      }

      // Step 3: Confirm Card Setup
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
        throw setupError;
      }

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
      console.error("Error adding payment method:", err);
      const displayError = err.message || "An unexpected error occurred. Please try again.";
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

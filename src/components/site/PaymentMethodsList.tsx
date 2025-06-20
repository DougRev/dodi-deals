
"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CreditCard, Trash2, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
// Import Stripe types if needed, e.g., import type { PaymentMethod } from '@stripe/stripe-js';

// Placeholder type - replace with actual Stripe PaymentMethod data structure if fetched
interface UserStripePaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  isDefault?: boolean;
}

interface PaymentMethodsListProps {
  // Props if needed, e.g., function to set as default or delete
}

export function PaymentMethodsList({}: PaymentMethodsListProps) {
  const { user } = useAppContext();
  const [paymentMethods, setPaymentMethods] = useState<UserStripePaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPaymentMethods() {
      if (!user?.stripeCustomerId) {
        setLoading(false);
        setPaymentMethods([]); // No Stripe customer ID, so no payment methods
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // TODO: Implement Firebase Function to list payment methods from Stripe
        // For now, this will be a placeholder.
        // const listPaymentMethodsFunction = httpsCallable(functions, 'listStripePaymentMethods');
        // const result = await listPaymentMethodsFunction({ customerId: user.stripeCustomerId });
        // setPaymentMethods(result.data.paymentMethods as UserStripePaymentMethod[]);
        console.warn("PaymentMethodsList: Fetching actual payment methods from Stripe is not yet implemented. Showing placeholder.");
        
        // Placeholder data:
        // setPaymentMethods([
        //   { id: 'pm_123abc', brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030, isDefault: true },
        //   { id: 'pm_456def', brand: 'mastercard', last4: '5555', exp_month: 10, exp_year: 2028 },
        // ]);
        setPaymentMethods([]); // Start with empty until implemented

      } catch (err: any) {
        console.error("Error fetching payment methods:", err);
        setError(err.message || "Failed to load payment methods.");
        toast({ title: "Error", description: "Could not load your saved cards.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }

    fetchPaymentMethods();
  }, [user?.stripeCustomerId]);

  const handleDeletePaymentMethod = async (pmId: string) => {
    // TODO: Implement Firebase Function to detach payment method from Stripe customer
    toast({ title: "Action Required", description: `Delete functionality for payment method ${pmId} is not yet implemented.`});
  };

  const handleSetDefaultPaymentMethod = async (pmId: string) => {
    // TODO: Implement Firebase Function to set default payment method on Stripe customer
     toast({ title: "Action Required", description: `Set default functionality for payment method ${pmId} is not yet implemented.`});
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saved Payment Methods</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground mt-2">Loading your cards...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>No Saved Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">You haven't added any payment methods yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Saved cards will appear here for faster checkout (future feature).</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved Payment Methods</CardTitle>
        <CardDescription>Manage your saved cards. Online payments coming soon!</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentMethods.map((pm) => (
          <div key={pm.id} className="flex items-center justify-between p-3 border rounded-md hover:shadow-sm">
            <div className="flex items-center">
              <CreditCard className="h-6 w-6 mr-3 text-primary" />
              <div>
                <p className="font-medium">{pm.brand.toUpperCase()} ending in {pm.last4}</p>
                <p className="text-xs text-muted-foreground">Expires {String(pm.exp_month).padStart(2,'0')}/{pm.exp_year}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {pm.isDefault ? (
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-400" title="Default"/>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => handleSetDefaultPaymentMethod(pm.id)} title="Set as default">
                  <Star className="h-5 w-5 text-muted-foreground hover:text-yellow-500"/>
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => handleDeletePaymentMethod(pm.id)} className="text-destructive" title="Delete card">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

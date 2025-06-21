
"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CreditCard, Trash2, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { UserPaymentMethod } from '@/lib/types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app as firebaseApp } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';

export function PaymentMethodsList() {
  const { user } = useAppContext();
  const [paymentMethods, setPaymentMethods] = useState<UserPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPaymentMethods() {
      if (!user?.stripeCustomerId) {
        setLoading(false);
        setPaymentMethods([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const functions = getFunctions(firebaseApp, 'us-central1');
        const listPaymentMethodsFunction = httpsCallable(functions, 'listStripePaymentMethods');
        const result = await listPaymentMethodsFunction({ customerId: user.stripeCustomerId });
        const data = result.data as { paymentMethods: UserPaymentMethod[] };
        setPaymentMethods(data.paymentMethods || []);
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
        <div className="text-center py-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground mt-2 text-sm">Loading your cards...</p>
        </div>
    );
  }

  if (error) {
    return (
        <div className="p-4 border rounded-md bg-destructive/10">
          <p className="text-sm text-destructive">{error}</p>
        </div>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <div className="p-4 border-dashed border rounded-md text-center">
        <p className="text-sm text-muted-foreground">You haven't added any payment methods yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Saved cards will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
        {paymentMethods.map((pm) => (
          <div key={pm.id} className="flex items-center justify-between p-3 border rounded-md hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium">{pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1)} **** {pm.last4}</p>
                <p className="text-xs text-muted-foreground">Expires {String(pm.exp_month).padStart(2,'0')}/{pm.exp_year}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {pm.isDefault ? (
                <Badge variant="outline" className="text-xs">
                  <Star className="h-3 w-3 mr-1 text-yellow-500 fill-yellow-400"/> Default
                </Badge>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => handleSetDefaultPaymentMethod(pm.id)} title="Set as default">
                  <Star className="h-5 w-5 text-muted-foreground hover:text-yellow-500"/>
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => handleDeletePaymentMethod(pm.id)} className="text-destructive h-8 w-8" title="Delete card">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
    </div>
  );
}

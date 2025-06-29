
"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Trash2, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { UserPaymentMethod } from '@/lib/types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app as firebaseApp } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PaymentMethodsListProps {
    selectedPaymentMethodId?: string;
    onSelectPaymentMethod?: (id: string) => void;
}

export function PaymentMethodsList({ selectedPaymentMethodId, onSelectPaymentMethod }: PaymentMethodsListProps) {
  const { user } = useAppContext();
  const [paymentMethods, setPaymentMethods] = useState<UserPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDeletePaymentMethod = async (pmId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent the onClick of the parent div from firing
    setDeletingId(pmId);
    setError(null);
    try {
        const functions = getFunctions(firebaseApp, 'us-central1');
        const detachStripePaymentMethod = httpsCallable(functions, 'detachStripePaymentMethod');
        await detachStripePaymentMethod({ paymentMethodId: pmId });

        setPaymentMethods(prev => prev.filter(pm => pm.id !== pmId));
        toast({ title: "Card Deleted", description: "Your payment method has been successfully removed." });

    } catch (err: any) {
        console.error("Error deleting payment method:", err);
        setError(err.message || "Failed to delete payment method.");
        toast({ title: "Error", description: "Could not delete your card.", variant: "destructive" });
    } finally {
        setDeletingId(null);
    }
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
          <div 
            key={pm.id} 
            className={cn(
              "flex items-center justify-between p-3 border rounded-md hover:shadow-sm transition-shadow",
              onSelectPaymentMethod && "cursor-pointer",
              selectedPaymentMethodId === pm.id && "border-primary ring-2 ring-primary"
            )}
            onClick={() => onSelectPaymentMethod?.(pm.id)}
          >
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
                 onSelectPaymentMethod && (
                    <Button variant="ghost" size="sm" onClick={() => handleSetDefaultPaymentMethod(pm.id)} title="Set as default" disabled={!!deletingId}>
                     <Star className="h-5 w-5 text-muted-foreground hover:text-yellow-500"/>
                    </Button>
                 )
              )}
              <Button variant="ghost" size="icon" onClick={(e) => handleDeletePaymentMethod(pm.id, e)} className="text-destructive h-8 w-8" title="Delete card" disabled={deletingId === pm.id || !!deletingId}>
                 {deletingId === pm.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        ))}
    </div>
  );
}

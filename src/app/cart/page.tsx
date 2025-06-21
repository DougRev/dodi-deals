
"use client";

import { Suspense, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '@/hooks/useAppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Trash2, ShoppingBag, ArrowLeft, MapPin, Percent, Award, AlertCircle, Ban, Clock, Info, Loader2, CreditCard, Lock } from 'lucide-react';
import type { ResolvedProduct, UserPaymentMethod } from '@/lib/types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app as firebaseApp } from '@/lib/firebase';
import { useStripe } from '@stripe/react-stripe-js';
import { toast } from '@/hooks/use-toast';
import { PaymentMethodsList } from '@/components/site/PaymentMethodsList';
import { AddPaymentMethodForm } from '@/components/site/AddPaymentMethodForm';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const MINIMUM_PURCHASE_AMOUNT = 15;
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);


function CartPageInternal() {
  const { 
    isAuthenticated, 
    user, 
    cart, 
    removeFromCart, 
    updateCartQuantity, 
    getCartTotal,
    getCartSubtotal, 
    getCartTotalSavings,
    getPotentialPointsForCart, 
    clearCart, 
    selectedStore, 
    setStoreSelectorOpen, 
    loadingAuth,
    redemptionOptions,
    appliedRedemption,
    applyRedemption,
    removeRedemption,
    placeOrder,
  } = useAppContext();

  const stripe = useStripe();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isLateInDay, setIsLateInDay] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | undefined>(undefined);
  const [paymentListKey, setPaymentListKey] = useState(0);

  useEffect(() => {
    if (!loadingAuth && !isAuthenticated) {
      const redirect = searchParams.get('redirect');
      router.push(redirect ? `/login?redirect=${redirect}` : '/login?redirect=/cart');
    }
  }, [isAuthenticated, router, loadingAuth, searchParams]);

  useEffect(() => {
    const currentHour = new Date().getHours();
    setIsLateInDay(currentHour >= 19);
  }, []);

  const handlePayNow = async () => {
    if (!stripe || !selectedPaymentMethodId) {
      toast({ title: "Payment Error", description: "Stripe or payment method not ready.", variant: "destructive"});
      return;
    }
    setIsProcessingPayment(true);
    try {
      const cartTotal = getCartTotal();
      const amountInCents = Math.round(cartTotal * 100);

      const functions = getFunctions(firebaseApp, "us-central1");
      const createPaymentIntent = httpsCallable(functions, 'createStripePaymentIntent');
      const result = await createPaymentIntent({ amount: amountInCents }) as { data: { clientSecret: string }};
      const clientSecret = result.data.clientSecret;

      const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: selectedPaymentMethodId,
      });

      if (error) {
        throw new Error(error.message || "Failed to confirm payment.");
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        await placeOrder({ paymentIntentId: paymentIntent.id });
      } else {
        throw new Error("Payment was not successful. Status: " + paymentIntent?.status);
      }
    } catch (err: any) {
      toast({ title: "Payment Failed", description: err.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsProcessingPayment(false);
    }
  };


  if (loadingAuth || (!loadingAuth && !isAuthenticated)) {
    return <div className="text-center py-10">Loading cart...</div>;
  }
  
  if (!selectedStore) {
     return (
      <div className="flex flex-col items-center justify-center text-center py-10 min-h-[60vh]">
        <Card className="p-8 shadow-xl max-w-md">
          <CardContent className="flex flex-col items-center">
            <MapPin className="h-16 w-16 text-primary mb-6" />
            <h1 className="text-2xl font-bold font-headline mb-4 text-primary">View Your Cart</h1>
            <p className="text-muted-foreground mb-6">
              Please select a store to view or modify your cart.
            </p>
            <Button onClick={() => setStoreSelectorOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              Select Store
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleQuantityChange = (productId: string, newQuantity: number, selectedWeight?: ResolvedProduct['selectedWeight']) => {
    if (newQuantity >= 0) {
      updateCartQuantity(productId, newQuantity, selectedWeight);
    }
  };

  const cartSubtotal = getCartSubtotal();
  const cartFinalTotal = getCartTotal();
  const totalSavings = getCartTotalSavings();
  const potentialPoints = getPotentialPointsForCart();
  const isBelowMinimum = cartSubtotal < MINIMUM_PURCHASE_AMOUNT && cart.length > 0;

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold font-headline text-primary">Your Shopping Cart</h1>
        <p className="text-lg text-muted-foreground">Review your items for in-store pickup at <span className="font-semibold text-accent">{selectedStore.name}</span>.</p>
         <div className="mt-2 text-sm text-muted-foreground flex items-center justify-center">
            <Clock className="h-4 w-4 mr-1.5" /> Store Hours: {selectedStore.hours}
        </div>
      </header>

      {cart.length === 0 ? (
        <Card className="text-center py-12 shadow-lg">
          <CardContent className="flex flex-col items-center">
            <ShoppingBag className="h-24 w-24 text-muted-foreground mb-6" />
            <h2 className="text-2xl font-semibold mb-2">Your cart is empty.</h2>
            <p className="text-muted-foreground mb-6">Looks like you haven't added anything from {selectedStore.name} yet.</p>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/products">Start Shopping at {selectedStore.name.replace('Dodi Deals - ','')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {cart.map(item => (
                <Card key={item.product.variantId} className="flex flex-col md:flex-row items-center p-4 gap-4 shadow-md">
                   <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-md overflow-hidden shrink-0">
                    <Image src={item.product.imageUrl} alt={item.product.name} fill style={{ objectFit: 'cover' }} sizes="(max-width: 640px) 96px, 128px" data-ai-hint={item.product.dataAiHint || "product image"}/>
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold text-primary">{item.product.name}</h3>
                    {item.product.selectedWeight && (<p className="text-sm font-medium text-accent">Weight: {item.product.selectedWeight}</p>)}
                    <p className="text-sm text-muted-foreground">{item.product.brand}</p>
                    <p className="text-sm text-muted-foreground">{item.product.category}</p>
                    <div className="flex items-baseline space-x-2 mt-1">
                      <p className="text-md font-bold text-accent">${item.product.price.toFixed(2)}</p>
                      {item.product.originalPrice && item.product.originalPrice > item.product.price && (<p className="text-sm line-through text-muted-foreground">${item.product.originalPrice!.toFixed(2)}</p>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:ml-auto">
                    <Input type="number" min="0" max={item.product.stock} value={item.quantity} onChange={(e) => handleQuantityChange(item.product.id, parseInt(e.target.value), item.product.selectedWeight)} className="w-20 h-10 text-center" aria-label={`Quantity for ${item.product.name}`} disabled={user?.isBanned} />
                    <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.product.id, item.product.selectedWeight)} aria-label={`Remove ${item.product.name}`} disabled={user?.isBanned}><Trash2 className="h-5 w-5 text-destructive" /></Button>
                  </div>
                </Card>
            ))}
             <Button variant="outline" onClick={clearCart} className="text-destructive border-destructive hover:bg-destructive/10 mt-4" disabled={user?.isBanned}>Clear Cart</Button>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-xl">
              <CardHeader><CardTitle className="text-2xl font-headline text-primary">Order Summary</CardTitle><CardDescription>For pickup at {selectedStore.name}</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">${cartSubtotal.toFixed(2)}</span></div>
                {user && user.points > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-sm font-medium text-muted-foreground">Redeem Points (Available: {user.points})</p>
                    {redemptionOptions.map(option => (<Button key={option.id} variant={appliedRedemption?.id === option.id ? "default" : "outline"} size="sm" className="w-full justify-between" onClick={() => applyRedemption(option)} disabled={user.points < option.pointsRequired || cartSubtotal < option.discountAmount || user?.isBanned} ><span>{option.description}</span><span>-{option.pointsRequired} pts</span></Button>))}
                    {appliedRedemption && (<Button variant="link" size="sm" onClick={removeRedemption} className="text-destructive p-0 h-auto" disabled={user?.isBanned}>Remove Discount</Button>)}
                  </div>
                )}
                {appliedRedemption && (<div className="flex justify-between text-destructive"><span className="flex items-center"><Percent className="h-4 w-4 mr-1" /> Points Discount</span><span className="font-semibold">-${appliedRedemption.discountAmount.toFixed(2)}</span></div>)}
                {(totalSavings > 0 && (!appliedRedemption || totalSavings > appliedRedemption.discountAmount)) && (<div className="flex justify-between text-green-600"><span className="flex items-center"><Percent className="h-4 w-4 mr-1" /> Deal Savings</span><span className="font-semibold">-${(totalSavings - (appliedRedemption?.discountAmount || 0)).toFixed(2)}</span></div>)}
                <div className="flex justify-between"><span className="text-muted-foreground">Tax (Calculated at pickup)</span><span className="font-semibold">TBD</span></div>
                <Separator />
                <div className="flex justify-between text-xl font-bold"><span>Final Total</span><span className="text-primary">${(cartFinalTotal).toFixed(2)}</span></div>
                {potentialPoints > 0 && !user?.isBanned && (<div className="flex justify-center items-center text-sm text-green-600 mt-2 p-2 bg-green-500/10 rounded-md"><Award className="h-4 w-4 mr-2" />You'll earn approximately <span className="font-bold mx-1">{potentialPoints}</span> points with this order!</div>)}
                <p className="text-xs text-muted-foreground p-2 bg-blue-50 border border-blue-200 rounded-md flex items-start"><Info className="h-4 w-4 mr-2 mt-0.5 shrink-0 text-blue-600"/><span>Final payment and applicable taxes will be handled at {selectedStore.name} upon pickup. Orders are typically ready within 1 hour during store operating hours. You will be notified when ready.</span></p>
                {isLateInDay && !user?.isBanned && (<p className="text-xs text-orange-600 p-2 bg-orange-500/10 border border-orange-500/30 rounded-md flex items-start"><Clock className="h-4 w-4 mr-2 mt-0.5 shrink-0"/><span>It's getting late! Orders placed now may be prepared for pickup on the next business day if the store is closing soon. Please check store hours above.</span></p>)}
                {isBelowMinimum && !user?.isBanned && (<div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm flex items-center"><AlertCircle className="h-5 w-5 mr-2 shrink-0" />A minimum purchase of ${MINIMUM_PURCHASE_AMOUNT.toFixed(2)} is required. Add more items to proceed.</div>)}
                {user?.isBanned && (<div className="mt-3 p-3 bg-destructive/20 border border-destructive/50 rounded-md text-destructive text-sm flex items-center"><Ban className="h-5 w-5 mr-2 shrink-0" />Your account is suspended and cannot place orders or redeem points. Please contact support.</div>)}
              </CardContent>
              
              <CardFooter className="flex flex-col gap-4">
                 <div className="w-full space-y-3">
                    <h3 className="text-md font-semibold text-center text-primary">Pay Now to Secure Your Order</h3>
                     {showAddPaymentForm ? (
                       <AddPaymentMethodForm onPaymentMethodAdded={() => {setShowAddPaymentForm(false); setPaymentListKey(k => k + 1);}} onCancel={() => setShowAddPaymentForm(false)} />
                    ) : (
                      <>
                        <PaymentMethodsList key={paymentListKey} selectedPaymentMethodId={selectedPaymentMethodId} onSelectPaymentMethod={setSelectedPaymentMethodId} />
                        <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAddPaymentForm(true)}>Add New Card</Button>
                      </>
                    )}
                 </div>

                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="lg" onClick={handlePayNow} disabled={isBelowMinimum || !!user?.isBanned || cart.length === 0 || !selectedPaymentMethodId || isProcessingPayment}>
                  {isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Lock className="mr-2 h-4 w-4" />}
                  {isProcessingPayment ? 'Processing...' : `Pay $${cartFinalTotal.toFixed(2)} Now`}
                </Button>
                <Button asChild variant="outline" className="w-full"><Link href="/products"><ArrowLeft className="mr-2 h-4 w-4" /> Continue Shopping</Link></Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading cart page...</div>}>
       <Elements stripe={stripePromise}>
         <CartPageInternal />
      </Elements>
    </Suspense>
  );
}

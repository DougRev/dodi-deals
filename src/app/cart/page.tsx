"use client";

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/hooks/useAppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';

export default function CartPage() {
  const { isAuthenticated, cart, removeFromCart, updateCartQuantity, getCartTotal, clearCart } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/cart');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return <div className="text-center py-10">Redirecting to login...</div>; // Or a loading spinner
  }

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity >= 0) {
      updateCartQuantity(productId, newQuantity);
    }
  };

  const cartTotal = getCartTotal();

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold font-headline text-primary">Your Shopping Cart</h1>
        <p className="text-lg text-muted-foreground">Review your items for in-store pickup.</p>
      </header>

      {cart.length === 0 ? (
        <Card className="text-center py-12 shadow-lg">
          <CardContent className="flex flex-col items-center">
            <ShoppingBag className="h-24 w-24 text-muted-foreground mb-6" />
            <h2 className="text-2xl font-semibold mb-2">Your cart is empty.</h2>
            <p className="text-muted-foreground mb-6">Looks like you haven't added anything yet.</p>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/products">Start Shopping</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {cart.map(item => (
              <Card key={item.product.id} className="flex flex-col md:flex-row items-center p-4 gap-4 shadow-md">
                <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-md overflow-hidden shrink-0">
                  <Image 
                    src={item.product.imageUrl} 
                    alt={item.product.name} 
                    layout="fill" 
                    objectFit="cover" 
                    data-ai-hint={item.product.dataAiHint || "product image"}/>
                </div>
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold text-primary">{item.product.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.product.category}</p>
                  <p className="text-md font-bold text-accent">${item.product.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2 md:ml-auto">
                  <Input
                    type="number"
                    min="0"
                    max={item.product.stock}
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(item.product.id, parseInt(e.target.value))}
                    className="w-20 h-10 text-center"
                    aria-label={`Quantity for ${item.product.name}`}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.product.id)} aria-label={`Remove ${item.product.name}`}>
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
             <Button variant="outline" onClick={clearCart} className="text-destructive border-destructive hover:bg-destructive/10 mt-4">
              Clear Cart
            </Button>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-headline text-primary">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (Calculated at pickup)</span>
                  <span className="font-semibold">TBD</span>
                </div>
                <Separator />
                <div className="flex justify-between text-xl font-bold">
                  <span>Estimated Total</span>
                  <span className="text-primary">${cartTotal.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Final payment and applicable taxes will be handled in-store upon pickup.
                </p>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="lg" onClick={() => alert('Proceeding to in-store pickup! Please visit us to complete your order.')}>
                  Confirm for In-Store Pickup
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/products">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Continue Shopping
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}


"use client";

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Deal, ResolvedProduct } from '@/lib/types'; // Deal now contains a ResolvedProduct
import { useAppContext } from '@/hooks/useAppContext';
import { ShoppingCart, TimerIcon } from 'lucide-react';

interface DealCardProps {
  deal: Deal; // deal.product is already a ResolvedProduct
}

function calculateTimeLeft(expiresAt: string) {
  const difference = +new Date(expiresAt) - +new Date();
  let timeLeft = {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  };

  if (difference > 0) {
    timeLeft = {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }
  return timeLeft;
}

export function DealCard({ deal }: DealCardProps) {
  const { addToCart, isAuthenticated, selectedStore } = useAppContext();
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(deal.expiresAt));

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft(deal.expiresAt));
    }, 1000);

    return () => clearTimeout(timer);
  });

  const handleAddToCart = () => {
    if (!selectedStore) {
      alert("Please select a store first.");
      return;
    }
    if (isAuthenticated) {
      // Create a ResolvedProduct specifically for the deal to pass to addToCart
      // The `deal.product` is already the resolved product for the store context
      // but `addToCart` might expect certain price/stock based on its own resolution.
      // For deals, the price IS the dealPrice.
      const productForCart: ResolvedProduct = {
        ...deal.product, // Contains original product ID, store ID, name, resolved image, etc.
        price: deal.dealPrice, // Crucially, use the deal price for the cart
        // stock remains the same as the resolved product's stock
      };
      addToCart(productForCart);
    } else {
      alert("Please log in to add items to your cart.");
    }
  };
  
  const timerComponents = [];
  if (timeLeft.days > 0) timerComponents.push(`${timeLeft.days}d`);
  if (timeLeft.hours > 0 || timeLeft.days > 0) timerComponents.push(`${timeLeft.hours}h`);
  if (timeLeft.minutes > 0 || timeLeft.hours > 0 || timeLeft.days > 0) timerComponents.push(`${timeLeft.minutes}m`);
  timerComponents.push(`${timeLeft.seconds}s`);

  const isDealActive = +new Date(deal.expiresAt) - +new Date() > 0;

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border-2 border-accent">
      <CardHeader className="p-0">
        <div className="aspect-video relative w-full">
          <Image
            src={deal.product.imageUrl} // Use resolved imageUrl from deal.product
            alt={deal.product.name}
            layout="fill"
            objectFit="cover"
            data-ai-hint={deal.product.dataAiHint || "deal product"}
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-xl font-headline mb-1 text-accent">{deal.title}</CardTitle>
        <p className="text-lg font-semibold mb-1">{deal.product.name}</p>
        <p className="text-xs text-muted-foreground mb-1">{deal.product.brand}</p>
        <CardDescription className="text-sm text-muted-foreground mb-2 h-12 overflow-y-auto">
          {deal.description || deal.product.description}
        </CardDescription>
        <div className="flex items-baseline space-x-2 mb-2">
          <p className="text-2xl font-bold text-destructive">${deal.dealPrice.toFixed(2)}</p>
          <p className="text-md line-through text-muted-foreground">${deal.product.price.toFixed(2)}</p> {/* Original price from resolved product */}
        </div>
        {isDealActive ? (
          <div className="flex items-center text-sm text-accent font-medium p-2 bg-accent/10 rounded-md">
            <TimerIcon className="mr-2 h-5 w-5" />
            Expires in: {timerComponents.join(' ')}
          </div>
        ) : (
          <p className="text-sm text-destructive font-medium p-2 bg-destructive/10 rounded-md">Deal Expired</p>
        )}
      </CardContent>
      <CardFooter className="p-4">
        <Button 
          onClick={handleAddToCart} 
          disabled={!isDealActive || deal.product.stock === 0 || !isAuthenticated} 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
           {isAuthenticated ? (deal.product.stock === 0 ? 'Out of Stock' : (isDealActive ? 'Add Deal to Cart' : 'Deal Expired')) : 'Login to Add'}
        </Button>
      </CardFooter>
    </Card>
  );
}


"use client";

import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Deal } from '@/lib/types';
import { useAppContext } from '@/hooks/useAppContext';
import { ShoppingCart, TimerIcon, Percent, Tag, ArrowRight } from 'lucide-react'; 

interface DealCardProps {
  deal: Deal;
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
  
  const [currentImgSrc, setCurrentImgSrc] = useState('/images/categories/default.png');

  useEffect(() => {
    let newImgSrc = '/images/categories/default.png'; // Default fallback
    if (deal.product?.imageUrl) {
      newImgSrc = deal.product.imageUrl;
    } else if (deal.categoryOnDeal) {
      // Standard category image path logic.
      // If categoryOnDeal is 'E-Liquid', this will become '/images/categories/e-liquid.png'
      newImgSrc = `/images/categories/${deal.categoryOnDeal.toLowerCase().replace(/\s+/g, '-')}.png`;
    }
    // If brandOnDeal and no category or product image, you might want to add logic here too
    // For now, it defaults to default.png if no product image and no categoryOnDeal
    setCurrentImgSrc(newImgSrc);
  }, [deal.product?.imageUrl, deal.categoryOnDeal, deal.brandOnDeal]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft(deal.expiresAt));
    }, 1000);

    return () => clearTimeout(timer);
  });

  const handleAddToCart = () => {
    if (!deal.product) return; 
    if (!selectedStore) {
      alert("Please select a store first.");
      return;
    }
    if (isAuthenticated) {
      addToCart(deal.product);
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
  const isCategoryOrBrandDeal = !deal.product && (deal.categoryOnDeal || deal.brandOnDeal);

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border-2 border-accent">
      <CardHeader className="p-0">
        <div className="aspect-video relative w-full">
          <Image
            src={currentImgSrc}
            alt={deal.title || (deal.product?.name || "Special Deal")}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint={deal.product?.dataAiHint || deal.categoryOnDeal || deal.brandOnDeal || "special deal promotion"}
            onError={() => {
              setCurrentImgSrc('/images/categories/default.png'); 
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <div className="flex justify-between items-start mb-1">
            <CardTitle className="text-xl font-headline text-accent">{deal.title || deal.product?.name}</CardTitle>
            {deal.discountPercentage && (
              <div className="text-xs font-semibold bg-destructive text-destructive-foreground p-1 px-2 rounded-full flex items-center shrink-0">
                  <Percent className="h-3 w-3 mr-1" /> {deal.discountPercentage}% OFF
              </div>
            )}
             {deal.dealType === 'bogo' && !deal.discountPercentage && (
                 <div className="text-xs font-semibold bg-destructive text-destructive-foreground p-1 px-2 rounded-full flex items-center shrink-0">
                    <Tag className="h-3 w-3 mr-1" /> BOGO 50%
                </div>
             )}
        </div>
        
        {deal.product ? (
          <>
            <p className="text-sm text-muted-foreground mb-1">
              {deal.categoryOnDeal ? `On ${deal.categoryOnDeal}` : (deal.brandOnDeal ? `On ${deal.brandOnDeal} brand` : `Specific Product Deal`)}
            </p>
            <p className="text-xs text-muted-foreground mb-1">{deal.product.brand}</p>
            <CardDescription className="text-sm text-muted-foreground mb-2 h-12 overflow-y-auto">
              {deal.description || deal.product.description}
            </CardDescription>
            <div className="flex items-baseline space-x-2 mb-2">
              <p className="text-2xl font-bold text-destructive">${deal.product.price.toFixed(2)}</p>
              {deal.product.originalPrice && (
                <p className="text-md line-through text-muted-foreground">${deal.product.originalPrice.toFixed(2)}</p>
              )}
            </div>
          </>
        ) : (
          <>
             <p className="text-sm text-muted-foreground mb-1">
              {deal.categoryOnDeal ? `Applies to: All ${deal.categoryOnDeal}` : (deal.brandOnDeal ? `Applies to: ${deal.brandOnDeal} Brand Items` : deal.dealType === 'bogo' ? 'Special Offer!' : 'Store-Wide Special')}
            </p>
            <CardDescription className="text-sm text-muted-foreground mb-2 min-h-[4rem]">
              {deal.description || "Check in-store or qualifying products for details."}
            </CardDescription>
          </>
        )}

        {isDealActive ? (
          <div className="flex items-center text-sm text-accent font-medium p-2 bg-accent/10 rounded-md">
            <TimerIcon className="mr-2 h-5 w-5" />
            Deal ends in: {timerComponents.join(' ')}
          </div>
        ) : (
          <p className="text-sm text-destructive font-medium p-2 bg-destructive/10 rounded-md">Deal Expired</p>
        )}
      </CardContent>
      <CardFooter className="p-4">
        {isCategoryOrBrandDeal ? (
           <Button
            asChild
            disabled={!isDealActive || !isAuthenticated}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Link href={`/products?${deal.categoryOnDeal ? `category=${encodeURIComponent(deal.categoryOnDeal)}` : `brand=${encodeURIComponent(deal.brandOnDeal || '')}`}`}>
                Shop {deal.categoryOnDeal || deal.brandOnDeal} Deals
                <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : deal.product ? (
          <Button
            onClick={handleAddToCart}
            disabled={!isDealActive || deal.product.stock === 0 || !isAuthenticated}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {isAuthenticated ? (deal.product.stock === 0 ? 'Out of Stock' : (isDealActive ? 'Add Deal to Cart' : 'Deal Expired')) : 'Login to Add'}
          </Button>
        ) : (
          <Button
            disabled={!isDealActive || !isAuthenticated}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground opacity-70 cursor-not-allowed"
            title="This is a general announcement. See qualifying products in store or view all products."
            asChild={isAuthenticated && isDealActive} 
          >
            {isAuthenticated && isDealActive ? (
                <Link href="/products">View All Products</Link>
            ) : (
                <span>View Products</span> 
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

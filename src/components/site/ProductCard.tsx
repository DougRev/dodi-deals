
"use client";

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { ResolvedProduct, FlowerWeight } from '@/lib/types';
import { useAppContext } from '@/hooks/useAppContext';
import { ShoppingCart, Plus, Minus, Percent, Weight, AlertTriangle, Heart } from 'lucide-react'; 
import { Badge } from '@/components/ui/badge';
import { FlowerWeightSelectorDialog } from './FlowerWeightSelectorDialog';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: ResolvedProduct;
}

const FLOWER_LOW_STOCK_THRESHOLD_GRAMS = 10; // If total grams are less than this, show low stock warning

export function ProductCard({ product }: ProductCardProps) {
  const { 
    addToCart, 
    isAuthenticated, 
    selectedStore, 
    getCartItemQuantity, 
    updateCartQuantity,
    toggleFavoriteProduct,
    isProductFavorited,
    user
  } = useAppContext();
  const [currentImgSrc, setCurrentImgSrc] = useState(product.imageUrl);
  const [isWeightSelectorOpen, setIsWeightSelectorOpen] = useState(false);

  const isFavorited = isProductFavorited(product.id);

  useEffect(() => {
    setCurrentImgSrc(product.imageUrl);
  }, [product.imageUrl]);

  const currentQuantityInCart = getCartItemQuantity(product.id, product.selectedWeight);

  const handleIncreaseQuantity = () => {
    if (isAuthenticated && selectedStore && currentQuantityInCart < product.stock) {
      updateCartQuantity(product.id, currentQuantityInCart + 1, product.selectedWeight);
    }
  };

  const handleDecreaseQuantity = () => {
    if (isAuthenticated && selectedStore && currentQuantityInCart > 0) {
      updateCartQuantity(product.id, currentQuantityInCart - 1, product.selectedWeight);
    }
  };
  
  const handleBaseAddToCart = () => {
    if (!selectedStore) {
        alert("Please select a store first.");
        return;
    }
    if (isAuthenticated) {
      addToCart(product, 1); 
    } else {
      alert("Please log in to add items to your cart.");
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click or other parent events
    if (!isAuthenticated || !user) {
        toast({ title: "Login Required", description: "Please log in to favorite products.", variant: "destructive"});
        return;
    }
    toggleFavoriteProduct(product.id);
  };


  const isOutOfStock = product.category !== 'Flower' && product.stock === 0;
  const isFlowerProductWithNoStock = product.category === 'Flower' && (!product.totalStockInGrams || product.totalStockInGrams <= 0);
  const isFlowerLowStock = product.category === 'Flower' && product.totalStockInGrams && product.totalStockInGrams > 0 && product.totalStockInGrams < FLOWER_LOW_STOCK_THRESHOLD_GRAMS;

  const canIncrease = product.category !== 'Flower' && currentQuantityInCart < product.stock;
  const isDeal = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = isDeal && product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

  return (
    <>
      <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 group">
        <CardHeader className="p-0 relative">
          <div className="aspect-video relative w-full">
            <Image
              src={currentImgSrc}
              alt={product.name}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              data-ai-hint={product.dataAiHint || "product image"}
              onError={() => {
                setCurrentImgSrc('/images/categories/default.png');
              }}
            />
             {isAuthenticated && user && (
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "absolute top-2 left-2 rounded-full bg-background/70 hover:bg-background/90 text-destructive transition-all duration-200",
                        isFavorited ? "text-destructive fill-destructive" : "text-muted-foreground/70 hover:text-destructive",
                        "group-hover:opacity-100 md:opacity-0 focus:opacity-100" // Show on group hover (card hover) or focus, always on mobile implicit hover
                    )}
                    onClick={handleToggleFavorite}
                    aria-label={isFavorited ? "Unfavorite product" : "Favorite product"}
                    title={isFavorited ? "Unfavorite" : "Favorite"}
                    >
                    <Heart className={cn("h-5 w-5", isFavorited ? "fill-destructive" : "")} />
                </Button>
            )}
          </div>
          {isDeal && product.category !== 'Flower' && (
            <Badge
              variant="destructive"
              className="absolute top-2 right-2 text-xs px-2 py-1 flex items-center"
            >
              <Percent className="h-3 w-3 mr-1" /> {discountPercent}% OFF
            </Badge>
          )}
          {product.isBogoEligible && (
             <Badge
              variant="destructive"
              className="absolute top-2 right-2 text-xs px-2 py-1 flex items-center"
            >
              BOGO 50%
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-4 flex-grow">
          <CardTitle className="text-xl font-headline mb-1">{product.name}</CardTitle>
          <p className="text-xs text-muted-foreground mb-1">{product.brand}</p>
          <CardDescription className="text-sm text-muted-foreground mb-2 h-20 overflow-y-auto">{product.description}</CardDescription>
          
          {product.category === 'Flower' ? (
            <p className="text-lg font-semibold text-primary">
              From ${product.price.toFixed(2)}
            </p>
          ) : (
            <div className="flex items-baseline space-x-2 mb-1">
              <p className={`text-lg font-semibold ${isDeal ? 'text-destructive' : 'text-primary'}`}>
                ${product.price.toFixed(2)}
              </p>
              {isDeal && product.originalPrice && (
                <p className="text-sm line-through text-muted-foreground">
                  ${product.originalPrice.toFixed(2)}
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">Category: {product.category}</p>
          
          {product.category === 'Flower' ? (
            isFlowerProductWithNoStock ? (
              <p className="text-xs text-destructive font-semibold">Out of Stock</p>
            ) : isFlowerLowStock ? (
              <p className="text-xs text-destructive font-semibold flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1"/> Low Stock!
              </p>
            ) : (
              <p className="text-xs text-green-600">Available in various weights</p>
            )
          ) : (
            <>
              {product.stock < 10 && product.stock > 0 && !isOutOfStock && (
                <p className="text-xs text-destructive flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1"/>Only {product.stock} left in stock!
                </p>
              )}
              {isOutOfStock && (
                <p className="text-xs text-destructive font-semibold">Out of Stock</p>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="p-4">
          {!isAuthenticated ? (
            <Button onClick={() => alert("Please log in to add items to your cart.")} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              Login to Add
            </Button>
          ) : product.category === 'Flower' ? (
            isFlowerProductWithNoStock ? (
              <Button disabled className="w-full">Out of Stock</Button>
            ) : (
              <Button onClick={() => setIsWeightSelectorOpen(true)} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                <Weight className="mr-2 h-4 w-4" />
                Select Options
              </Button>
            )
          ) : isOutOfStock ? (
            <Button disabled className="w-full">Out of Stock</Button>
          ) : currentQuantityInCart === 0 ? (
            <Button onClick={handleBaseAddToCart} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add to Cart
            </Button>
          ) : (
            <div className="flex items-center justify-between w-full">
              <Button variant="outline" size="icon" onClick={handleDecreaseQuantity} className="h-9 w-9">
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-lg font-medium w-12 text-center">{currentQuantityInCart}</span>
              <Button variant="outline" size="icon" onClick={handleIncreaseQuantity} disabled={!canIncrease} className="h-9 w-9">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
      {product.category === 'Flower' && (
        <FlowerWeightSelectorDialog
          product={product}
          isOpen={isWeightSelectorOpen}
          onOpenChange={setIsWeightSelectorOpen}
        />
      )}
    </>
  );
}


    
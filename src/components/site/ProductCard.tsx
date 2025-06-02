
"use client";

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { ResolvedProduct } from '@/lib/types'; 
import { useAppContext } from '@/hooks/useAppContext';
import { ShoppingCart, Plus, Minus } from 'lucide-react';

interface ProductCardProps {
  product: ResolvedProduct; 
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, isAuthenticated, selectedStore, getCartItemQuantity, updateCartQuantity } = useAppContext();
  const [currentImgSrc, setCurrentImgSrc] = useState(product.imageUrl);

  useEffect(() => {
    setCurrentImgSrc(product.imageUrl); 
  }, [product.imageUrl]);

  const currentQuantityInCart = getCartItemQuantity(product.id);

  const handleAddToCart = () => {
    if (!selectedStore) {
        alert("Please select a store first.");
        return;
    }
    if (isAuthenticated) {
      addToCart(product, 1); // Add 1 item
    } else {
      alert("Please log in to add items to your cart.");
    }
  };

  const handleIncreaseQuantity = () => {
    if (isAuthenticated && selectedStore && currentQuantityInCart < product.stock) {
      updateCartQuantity(product.id, currentQuantityInCart + 1);
    }
  };

  const handleDecreaseQuantity = () => {
    if (isAuthenticated && selectedStore && currentQuantityInCart > 0) {
      updateCartQuantity(product.id, currentQuantityInCart - 1);
    }
  };
  
  const isOutOfStock = product.stock === 0;
  const canIncrease = currentQuantityInCart < product.stock;

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-0">
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
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-xl font-headline mb-1">{product.name}</CardTitle>
        <p className="text-xs text-muted-foreground mb-1">{product.brand}</p>
        <CardDescription className="text-sm text-muted-foreground mb-2 h-20 overflow-y-auto">{product.description}</CardDescription>
        <p className="text-lg font-semibold text-primary">${product.price.toFixed(2)}</p>
        <p className="text-xs text-muted-foreground">Category: {product.category}</p>
        {product.stock < 10 && product.stock > 0 && !isOutOfStock && (
          <p className="text-xs text-destructive">Only {product.stock} left in stock!</p>
        )}
        {isOutOfStock && (
          <p className="text-xs text-destructive font-semibold">Out of Stock</p>
        )}
      </CardContent>
      <CardFooter className="p-4">
        {!isAuthenticated ? (
          <Button onClick={() => alert("Please log in to add items to your cart.")} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            Login to Add
          </Button>
        ) : isOutOfStock ? (
          <Button disabled className="w-full">Out of Stock</Button>
        ) : currentQuantityInCart === 0 ? (
          <Button onClick={handleAddToCart} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
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
  );
}


"use client";

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { ResolvedProduct } from '@/lib/types'; 
import { useAppContext } from '@/hooks/useAppContext';
import { ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: ResolvedProduct; 
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, isAuthenticated, selectedStore } = useAppContext();
  const [currentImgSrc, setCurrentImgSrc] = useState(product.imageUrl);

  useEffect(() => {
    setCurrentImgSrc(product.imageUrl); 
  }, [product.imageUrl]);

  const handleAddToCart = () => {
    if (!selectedStore) {
        alert("Please select a store first.");
        return;
    }
    if (isAuthenticated) {
      addToCart(product);
    } else {
      alert("Please log in to add items to your cart.");
    }
  };

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
        {product.stock < 10 && product.stock > 0 && (
          <p className="text-xs text-destructive">Only {product.stock} left in stock!</p>
        )}
        {product.stock === 0 && (
          <p className="text-xs text-destructive font-semibold">Out of Stock</p>
        )}
      </CardContent>
      <CardFooter className="p-4">
        <Button onClick={handleAddToCart} disabled={product.stock === 0 || !isAuthenticated} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          <ShoppingCart className="mr-2 h-4 w-4" />
          {isAuthenticated ? (product.stock === 0 ? 'Out of Stock' : 'Add to Cart') : 'Login to Add'}
        </Button>
      </CardFooter>
    </Card>
  );
}

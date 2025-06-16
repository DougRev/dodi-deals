
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import type { ResolvedProduct, FlowerWeight, FlowerWeightPrice } from '@/lib/types';
import { useAppContext } from '@/hooks/useAppContext';
import { flowerWeightToGrams } from '@/lib/types';
import { ShoppingCart, X } from 'lucide-react';

interface FlowerWeightSelectorDialogProps {
  product: ResolvedProduct; // Base flower product
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function FlowerWeightSelectorDialog({ product, isOpen, onOpenChange }: FlowerWeightSelectorDialogProps) {
  const { addToCart, user } = useAppContext();
  const [selectedWeight, setSelectedWeight] = useState<FlowerWeight | undefined>(
    product.availableWeights && product.availableWeights.length > 0 ? product.availableWeights[0].weight : undefined
  );
  const [quantity, setQuantity] = useState(1);
  const [currentPrice, setCurrentPrice] = useState<number | undefined>(
    product.availableWeights && product.availableWeights.length > 0 ? product.availableWeights[0].price : undefined
  );
  const [stockForSelectedWeight, setStockForSelectedWeight] = useState<number>(0);

  useEffect(() => {
    if (product.availableWeights && product.availableWeights.length > 0) {
      const initialWeight = product.availableWeights[0].weight;
      setSelectedWeight(initialWeight);
      setCurrentPrice(product.availableWeights[0].price);
    } else {
      setSelectedWeight(undefined);
      setCurrentPrice(undefined);
    }
    setQuantity(1); // Reset quantity when product changes or dialog opens
  }, [product, isOpen]); // Depend on isOpen to reset when dialog reopens

  useEffect(() => {
    if (selectedWeight && product.availableWeights && product.totalStockInGrams) {
      const weightOption = product.availableWeights.find(wo => wo.weight === selectedWeight);
      setCurrentPrice(weightOption?.price);

      const grams = flowerWeightToGrams(selectedWeight);
      if (grams > 0 && product.totalStockInGrams) {
        setStockForSelectedWeight(Math.floor(product.totalStockInGrams / grams));
      } else {
        setStockForSelectedWeight(0);
      }
    } else {
      setStockForSelectedWeight(0);
    }
    setQuantity(1); // Reset quantity when weight changes
  }, [selectedWeight, product.availableWeights, product.totalStockInGrams]);

  const handleAddToCart = () => {
    if (!selectedWeight || !currentPrice) {
      alert("Please select a weight.");
      return;
    }
    if (quantity <= 0) {
        alert("Please enter a valid quantity.");
        return;
    }
    if (quantity > stockForSelectedWeight) {
        alert(`Only ${stockForSelectedWeight} units available for ${selectedWeight}.`);
        return;
    }
    if (user?.isBanned) {
      alert("Your account is suspended. You cannot place orders.");
      return;
    }

    // Pass the base product, quantity, and specifically the selected weight
    addToCart(product, quantity, selectedWeight);
    onOpenChange(false); // Close dialog after adding
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value, 10);
    if (isNaN(newQuantity) || newQuantity < 1) {
      setQuantity(1);
    } else if (newQuantity > stockForSelectedWeight) {
      setQuantity(stockForSelectedWeight);
    } else {
      setQuantity(newQuantity);
    }
  };
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline text-primary">{product.name}</DialogTitle>
          <DialogDescription>{product.description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center sm:flex-row gap-4 py-4">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-md overflow-hidden shrink-0">
            <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 640px) 128px, 160px"
                data-ai-hint={product.dataAiHint || "product image"}/>
            </div>
            <div className="space-y-3 flex-grow">
                <Label htmlFor="weight-options" className="text-lg font-semibold text-muted-foreground">Select Weight:</Label>
                <RadioGroup
                    id="weight-options"
                    value={selectedWeight}
                    onValueChange={(value: FlowerWeight) => setSelectedWeight(value)}
                    className="grid grid-cols-2 gap-2"
                >
                    {product.availableWeights?.map((option: FlowerWeightPrice) => {
                        const grams = flowerWeightToGrams(option.weight);
                        const individualStock = grams > 0 && product.totalStockInGrams ? Math.floor(product.totalStockInGrams / grams) : 0;
                        const isDisabled = individualStock <= 0;
                        return (
                            <Label
                                key={option.weight}
                                htmlFor={`weight-${option.weight}`}
                                className={`flex flex-col items-center justify-center rounded-md border-2 p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer
                                ${selectedWeight === option.weight ? 'border-primary ring-2 ring-primary' : 'border-muted'}
                                ${isDisabled ? 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-current' : ''}`}
                            >
                                <RadioGroupItem value={option.weight} id={`weight-${option.weight}`} className="sr-only" disabled={isDisabled}/>
                                <span className="font-medium">{option.weight}</span>
                                <span className="text-sm text-muted-foreground">${option.price.toFixed(2)}</span>
                                {isDisabled && <span className="text-xs text-destructive">(Out of stock)</span>}
                            </Label>
                        );
                    })}
                </RadioGroup>
            </div>
        </div>

        {selectedWeight && currentPrice !== undefined && (
          <div className="space-y-4 mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
                <Label htmlFor="quantity" className="text-lg font-semibold text-muted-foreground">Quantity:</Label>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1 || stockForSelectedWeight === 0}>-</Button>
                    <Input
                        id="quantity"
                        type="number"
                        value={quantity}
                        onChange={handleQuantityChange}
                        min="1"
                        max={stockForSelectedWeight}
                        className="w-16 h-10 text-center"
                        disabled={stockForSelectedWeight === 0}
                    />
                    <Button variant="outline" size="icon" onClick={() => setQuantity(q => Math.min(stockForSelectedWeight, q + 1))} disabled={quantity >= stockForSelectedWeight || stockForSelectedWeight === 0}>+</Button>
                </div>
            </div>
             <p className="text-sm text-muted-foreground">
                Available for {selectedWeight}: {stockForSelectedWeight} unit(s)
            </p>
            <div className="text-2xl font-bold text-primary text-right">
                Total: ${(currentPrice * quantity).toFixed(2)}
            </div>
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleAddToCart} 
            disabled={!selectedWeight || stockForSelectedWeight === 0 || quantity <= 0 || !!user?.isBanned}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            title={user?.isBanned ? "Your account is suspended" : ""}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {user?.isBanned ? "Account Suspended" : "Add to Cart"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

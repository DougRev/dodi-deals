
"use client";

import { useAppContext } from '@/hooks/useAppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { Store } from '@/lib/types';
import { MapPin, Clock, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function StoreSelectorDialog() {
  const { 
    stores, // This is all stores
    displayableStores, // This is filtered for non-admins
    selectedStore, 
    selectStore, 
    isStoreSelectorOpen, 
    setStoreSelectorOpen,
    user 
  } = useAppContext();

  const handleStoreSelect = (storeId: string) => {
    selectStore(storeId);
    // Dialog will be closed by the AppContext effect on selectedStore change,
    // or by selectStore itself setting setStoreSelectorOpen(false)
  };

  // This dialog is modal and non-dismissible by clicking outside or Esc if no store is selected initially by a non-admin.
  const isInitialSelectionForNonAdmin = !selectedStore && !user?.isAdmin && displayableStores.length > 0;
  
  // Admins always see all stores in the selector, non-admins see displayableStores
  const storesToList = user?.isAdmin ? stores : displayableStores;


  return (
    <Dialog open={isStoreSelectorOpen} onOpenChange={setStoreSelectorOpen}>
      <DialogContent 
        className="sm:max-w-[425px] md:sm:max-w-[600px] lg:max-w-[800px]"
        onInteractOutside={(e) => {
          if (isInitialSelectionForNonAdmin) e.preventDefault(); 
        }}
        onEscapeKeyDown={(e) => {
            if (isInitialSelectionForNonAdmin) e.preventDefault(); 
        }}
        hideCloseButton={isInitialSelectionForNonAdmin} 
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline text-primary">
            {isInitialSelectionForNonAdmin || !selectedStore ? "Select Your Dodi Deals Store" : "Change Store"}
          </DialogTitle>
          <DialogDescription>
            {isInitialSelectionForNonAdmin || !selectedStore
              ? "Please choose a store to see products and deals available for pickup."
              : "Select a new store. Your cart will be cleared if you switch stores."}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {storesToList.length === 0 && !user?.isAdmin ? (
            <p className="text-center text-muted-foreground">No stores are currently available. Please check back later.</p>
          ) : storesToList.length === 0 && user?.isAdmin ? (
             <p className="text-center text-muted-foreground">No stores found. Add a store in the Admin Panel.</p>
          ) : (
            <RadioGroup 
              defaultValue={selectedStore?.id} 
              onValueChange={handleStoreSelect}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {storesToList.map((store: Store) => (
                <Label htmlFor={store.id} key={store.id} className="block cursor-pointer">
                  <Card className={`hover:shadow-lg transition-shadow ${selectedStore?.id === store.id ? 'border-primary ring-2 ring-primary' : 'border-border'}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold">{store.name}</CardTitle>
                        <RadioGroupItem value={store.id} id={store.id} />
                      </div>
                      <CardDescription className="text-sm">
                          <MapPin className="inline-block mr-1 h-4 w-4 text-muted-foreground" /> {store.address}, {store.city}
                      </CardDescription>
                       {user?.isAdmin && store.isHidden && (
                          <Badge variant="outline" className="mt-1 text-xs text-orange-600 border-orange-400 w-fit">
                            <EyeOff className="mr-1 h-3 w-3" /> Hidden
                          </Badge>
                        )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                          <Clock className="inline-block mr-1 h-4 w-4" /> {store.hours}
                      </p>
                    </CardContent>
                  </Card>
                </Label>
              ))}
            </RadioGroup>
          )}
        </div>
        {!(isInitialSelectionForNonAdmin || !selectedStore) && ( // Show Cancel only if it's not a forced initial selection
             <Button variant="outline" onClick={() => setStoreSelectorOpen(false)} className="mt-4">
                Cancel
            </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

declare module "@radix-ui/react-dialog" {
  interface DialogContentProps {
    hideCloseButton?: boolean;
  }
}


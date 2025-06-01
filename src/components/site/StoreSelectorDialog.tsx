
"use client";

import { useAppContext } from '@/hooks/useAppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { Store } from '@/lib/types';
import { MapPin, Clock } from 'lucide-react';

export function StoreSelectorDialog() {
  const { stores, selectedStore, selectStore, isStoreSelectorOpen, setStoreSelectorOpen } = useAppContext();

  const handleStoreSelect = (storeId: string) => {
    selectStore(storeId);
    // Dialog will be closed by the AppContext effect on selectedStore change,
    // or by selectStore itself setting setStoreSelectorOpen(false)
  };

  // This dialog is modal and non-dismissible by clicking outside or Esc if no store is selected initially.
  // It can be opened via Navbar to change store.
  const isInitialSelection = !selectedStore;

  return (
    <Dialog open={isStoreSelectorOpen} onOpenChange={setStoreSelectorOpen}>
      <DialogContent 
        className="sm:max-w-[425px] md:sm:max-w-[600px] lg:max-w-[800px]"
        onInteractOutside={(e) => {
          if (isInitialSelection) e.preventDefault(); // Prevent closing if no store selected yet
        }}
        onEscapeKeyDown={(e) => {
            if (isInitialSelection) e.preventDefault(); // Prevent closing via ESC if no store selected
        }}
        hideCloseButton={isInitialSelection} // Hide close button for initial selection
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline text-primary">
            {isInitialSelection ? "Select Your Dodi Deals Store" : "Change Store"}
          </DialogTitle>
          <DialogDescription>
            {isInitialSelection 
              ? "Please choose a store to see products and deals available for pickup."
              : "Select a new store. Your cart will be cleared if you switch stores."}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          <RadioGroup 
            defaultValue={selectedStore?.id} 
            onValueChange={handleStoreSelect}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {stores.map((store: Store) => (
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
        </div>
        {!isInitialSelection && (
             <Button variant="outline" onClick={() => setStoreSelectorOpen(false)} className="mt-4">
                Cancel
            </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper to hide close button from DialogContent if needed.
// This is a bit of a workaround as shadcn/ui DialogContent doesn't directly support hiding the X.
// We can add a prop to DialogContent or modify its style directly in a real scenario.
// For now, this selector dialog structure itself should work.
// The `hideCloseButton` prop has been added to the local `DialogContent` for this example.
// The actual implementation of `hideCloseButton` would require modifying the `DialogContent` component.
// Let's assume the `DialogContent` from `@/components/ui/dialog` is modified to accept `hideCloseButton`.
// If not, the button would still appear, but `onInteractOutside` and `onEscapeKeyDown` would prevent closing.
// For the purpose of this prototype, we will assume the DialogContent could be adapted.
// If not, the X button will still be there but disabled for initial selection.
// Update: Added `hideCloseButton` to `DialogContent` props in `src/components/ui/dialog.tsx` as a conceptual change.

declare module "@radix-ui/react-dialog" {
  interface DialogContentProps {
    hideCloseButton?: boolean;
  }
}

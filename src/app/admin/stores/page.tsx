
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StoreSchema, type StoreFormData, type Store, type Product as CoreProduct, daysOfWeek, type DayOfWeek, type DailyDealItem } from '@/lib/types';
import { addStore, updateStore, deleteStore } from '@/lib/firestoreService';
import { useAppContext } from '@/hooks/useAppContext';
import { toast } from "@/hooks/use-toast";
import { PlusCircle, Edit, Trash2, Loader2, Building, Tag, XCircle, Gift } from 'lucide-react';
import Link from 'next/link';

const getDefaultDailyDeals = (): Record<DayOfWeek, DailyDealItem[]> => {
  return daysOfWeek.reduce((acc, day) => {
    acc[day] = [];
    return acc;
  }, {} as Record<DayOfWeek, DailyDealItem[]>);
};

export default function AdminStoresPage() {
  const { stores: appStores, loadingStores: loadingAppStores, allProducts, loadingProducts: loadingAllProducts } = useAppContext();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [loading, setLoading] = useState(false); // For form submission

  const form = useForm<StoreFormData>({
    resolver: zodResolver(StoreSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      hours: '',
      dailyDeals: getDefaultDailyDeals(),
    },
  });

  // `fields` for dailyDeals structure is more complex. We'll need useFieldArray for each day.
  // This is managed via Controller for each day's array of deals.

  const productsAvailableAtCurrentStore = useMemo(() => {
    if (!currentStore || loadingAllProducts || !allProducts || allProducts.length === 0) return [];
    return allProducts.filter(p => p.availability?.some(a => a.storeId === currentStore.id));
  }, [currentStore, allProducts, loadingAllProducts]);


  useEffect(() => {
    if (isFormOpen) {
      if (currentStore) {
        const dealsForForm = daysOfWeek.reduce((acc, day) => {
          acc[day] = currentStore.dailyDeals?.[day] || [];
          return acc;
        }, {} as Record<DayOfWeek, DailyDealItem[]>);
        form.reset({ ...currentStore, dailyDeals: dealsForForm });
      } else {
        form.reset({
          name: '',
          address: '',
          city: '',
          hours: '',
          dailyDeals: getDefaultDailyDeals(),
        });
      }
    }
  }, [isFormOpen, currentStore, form]);

  const handleAddNewStore = () => {
    setCurrentStore(null);
    form.reset({
      name: '',
      address: '',
      city: '',
      hours: '',
      dailyDeals: getDefaultDailyDeals(),
    });
    setIsFormOpen(true);
  };

  const handleEditStore = (store: Store) => {
    setCurrentStore(store);
     const dealsForForm = daysOfWeek.reduce((acc, day) => {
        acc[day] = store.dailyDeals?.[day] || [];
        return acc;
      }, {} as Record<DayOfWeek, DailyDealItem[]>);
    form.reset({ ...store, dailyDeals: dealsForForm });
    setIsFormOpen(true);
  };

  const handleDeleteStore = (store: Store) => {
    setStoreToDelete(store);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteStore = async () => {
    if (!storeToDelete) return;
    setLoading(true);
    try {
      await deleteStore(storeToDelete.id);
      toast({ title: "Store Deleted", description: `${storeToDelete.name} has been successfully deleted.` });
      setIsDeleteDialogOpen(false);
      setStoreToDelete(null);
    } catch (error: any) {
      console.error("Failed to delete store:", error);
      toast({ title: "Error Deleting Store", description: error.message || "Failed to delete store.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStore = async (data: StoreFormData) => {
    setLoading(true);
    try {
      if (currentStore) {
        await updateStore(currentStore.id, data);
        toast({ title: "Store Updated", description: "The store details have been successfully updated." });
      } else {
        await addStore(data);
        toast({ title: "Store Added", description: "The new store has been successfully created." });
      }
      setIsFormOpen(false);
      setCurrentStore(null);
      form.reset({ name: '', address: '', city: '', hours: '', dailyDeals: getDefaultDailyDeals() });
    } catch (error: any) {
      console.error("Failed to save store:", error);
      toast({ title: "Error Saving Store", description: error.message || "Failed to save store.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  
  // Helper component for managing deals for a single day
  const DailyDealDayForm = ({ day, control, productsForSelect }: { day: DayOfWeek, control: any, productsForSelect: CoreProduct[] }) => {
    const { fields, append, remove } = useFieldArray({
      control,
      name: `dailyDeals.${day}`
    });

    const getProductName = (productId: string) => productsForSelect.find(p => p.id === productId)?.name || 'Unknown Product';

    return (
      <div className="space-y-3">
        {fields.map((item, index) => (
          <Card key={item.id} className="p-3 space-y-2 relative shadow-sm bg-muted/30">
            <Label className="text-xs font-semibold">Deal #{index + 1} for {day}</Label>
            <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-destructive" onClick={() => remove(index)}>
              <XCircle className="h-4 w-4" />
            </Button>
            <FormField
              control={control}
              name={`dailyDeals.${day}.${index}.productId`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Product</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''} defaultValue={field.value || ''} disabled={productsForSelect.length === 0}>
                    <FormControl><SelectTrigger><SelectValue placeholder={productsForSelect.length === 0 ? "No products for this store" : "Select product"} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {productsForSelect.map((product: CoreProduct) => (
                        <SelectItem key={product.id} value={product.id}>{product.name} (Brand: {product.brand})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`dailyDeals.${day}.${index}.dealPrice`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Deal Price ($)</FormLabel>
                  <FormControl><Input type="number" placeholder="19.99" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} step="0.01" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Card>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ productId: '', dealPrice: 0 })}
          disabled={productsForSelect.length === 0}
          className="text-xs"
        >
          <PlusCircle className="mr-1 h-3 w-3" /> Add Deal for {day}
        </Button>
        {productsForSelect.length === 0 && <p className="text-xs text-muted-foreground">No products currently available for this store to create deals. Add products and their availability first.</p>}
      </div>
    );
  };


  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary flex items-center">
            <Building className="mr-3 h-8 w-8" /> Manage Stores
          </h1>
          <p className="text-muted-foreground">Add, edit, or remove store locations and their daily deals.</p>
        </div>
        <Button onClick={handleAddNewStore} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Store
        </Button>
      </header>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
          setIsFormOpen(isOpen);
          if (!isOpen) {
            setCurrentStore(null); 
            form.reset({ name: '', address: '', city: '', hours: '', dailyDeals: getDefaultDailyDeals() });
          }
        }}>
        <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-primary flex items-center">
             <Building className="mr-2 h-7 w-7"/> {currentStore ? 'Edit Store & Daily Deals' : 'Add New Store'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveStore)} className="space-y-6 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Dodi Deals - Downtown" {...field} className="focus:ring-accent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St" {...field} className="focus:ring-accent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City & State</FormLabel>
                    <FormControl>
                      <Input placeholder="Indianapolis, IN" {...field} className="focus:ring-accent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operating Hours</FormLabel>
                    <FormControl>
                      <Input placeholder="Mon-Sat: 9am - 9pm, Sun: 10am - 6pm" {...field} className="focus:ring-accent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {currentStore && ( // Only show daily deals section if editing an existing store with an ID
                <Accordion type="single" collapsible className="w-full border p-4 rounded-lg">
                  <AccordionItem value="daily-deals">
                    <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                        <div className="flex items-center"><Gift className="mr-2 h-5 w-5 text-accent"/> Manage Daily Deals</div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-2">
                      {daysOfWeek.map((day) => (
                        <Accordion key={day} type="single" collapsible className="w-full mt-1 border rounded-md p-0">
                           <AccordionItem value={day} className="border-0">
                            <AccordionTrigger className="px-3 py-2 text-md hover:no-underline hover:bg-muted/50 rounded-t-md">
                              {day} Deals
                            </AccordionTrigger>
                            <AccordionContent className="p-3 border-t">
                              {loadingAllProducts ? <Loader2 className="h-5 w-5 animate-spin"/> : (
                                <DailyDealDayForm day={day} control={form.control} productsForSelect={productsAvailableAtCurrentStore} />
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      ))}
                       <p className="text-xs text-muted-foreground mt-4 p-2">
                        Define recurring deals for each day of the week. Select products available at this store and set their special deal price for that day.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
              {!currentStore && (
                <p className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/30">
                  Daily deals can be managed after the store is created. Please save the store first.
                </p>
              )}


              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || (currentStore && loadingAllProducts)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {currentStore ? 'Save Changes' : 'Create Store'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-xl text-destructive">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the store
              <span className="font-semibold"> {storeToDelete?.name}</span> and all its associated daily deals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStoreToDelete(null)} disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteStore} disabled={loading} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Store
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Store List</CardTitle>
          <CardDescription>Overview of all registered store locations and their basic info.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAppStores ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : appStores.length === 0 ? (
            <div className="text-center py-10">
              <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">No stores found.</p>
              <p className="text-muted-foreground text-sm">Click "Add New Store" to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appStores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell>{store.address}</TableCell>
                    <TableCell>{store.city}</TableCell>
                    <TableCell>{store.hours}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditStore(store)} className="text-accent border-accent hover:bg-accent/10">
                        <Edit className="mr-1 h-4 w-4" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteStore(store)}>
                        <Trash2 className="mr-1 h-4 w-4" /> Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
       <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/admin">Back to Admin Dashboard</Link>
          </Button>
        </div>
    </div>
  );
}

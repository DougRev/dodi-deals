
"use client";

import { useState, useEffect } from 'react';
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
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  StoreSchema, 
  type StoreFormData, 
  type Store, 
  daysOfWeek, 
  type DayOfWeek, 
  type ProductCategory, 
  productCategories, 
  fixedDailyCategories,
  type StoreDailyDealSetting
} from '@/lib/types';
import { addStore, updateStore, deleteStore } from '@/lib/firestoreService';
import { useAppContext } from '@/hooks/useAppContext';
import { toast } from "@/hooks/use-toast";
import { PlusCircle, Edit, Trash2, Loader2, Building, Gift, Percent } from 'lucide-react';
import Link from 'next/link';

const getDefaultDailyDealsFormValues = (): Partial<Record<DayOfWeek, StoreDailyDealSetting>> => {
  const defaults: Partial<Record<DayOfWeek, StoreDailyDealSetting>> = {};
  daysOfWeek.forEach(day => {
    const fixedCategory = fixedDailyCategories[day];
    if (fixedCategory) {
      defaults[day] = { category: fixedCategory, discountPercentage: 0 };
    } else {
      // For Saturday/Sunday or other non-fixed days, allow admin to choose category, default to first available or Vape
      defaults[day] = { category: productCategories[0] || 'Vape', discountPercentage: 0 };
    }
  });
  return defaults;
};


export default function AdminStoresPage() {
  const { stores: appStores, loadingStores: loadingAppStores } = useAppContext();
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
      dailyDeals: getDefaultDailyDealsFormValues(),
    },
  });
  
  useEffect(() => {
    if (isFormOpen) {
      if (currentStore) {
        // Ensure all days are present in form.watch('dailyDeals'), defaulting if not in currentStore.dailyDeals
        const dealsForForm: Partial<Record<DayOfWeek, StoreDailyDealSetting>> = {};
        daysOfWeek.forEach(day => {
          const existingDeal = currentStore.dailyDeals?.[day];
          const fixedCategory = fixedDailyCategories[day];
          if (existingDeal) {
            dealsForForm[day] = existingDeal;
          } else if (fixedCategory) {
            dealsForForm[day] = { category: fixedCategory, discountPercentage: 0 };
          } else {
            dealsForForm[day] = { category: productCategories[0] || 'Vape', discountPercentage: 0 };
          }
        });
        form.reset({ ...currentStore, dailyDeals: dealsForForm });
      } else {
        form.reset({
          name: '',
          address: '',
          city: '',
          hours: '',
          dailyDeals: getDefaultDailyDealsFormValues(),
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
      dailyDeals: getDefaultDailyDealsFormValues(),
    });
    setIsFormOpen(true);
  };

  const handleEditStore = (store: Store) => {
    setCurrentStore(store);
    const dealsForForm: Partial<Record<DayOfWeek, StoreDailyDealSetting>> = {};
    daysOfWeek.forEach(day => {
        const existingDeal = store.dailyDeals?.[day];
        const fixedCategory = fixedDailyCategories[day];
        if (existingDeal) {
            dealsForForm[day] = existingDeal;
        } else if (fixedCategory) { // If deal doesn't exist but day has a fixed cat, set it up
            dealsForForm[day] = { category: fixedCategory, discountPercentage: 0 };
        } else { // For Sat/Sun if no deal, setup with default category
             dealsForForm[day] = { category: productCategories[0] || 'Vape', discountPercentage: 0 };
        }
    });
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
    // Ensure dailyDeals is populated correctly before saving
    const populatedDailyDeals: Partial<Record<DayOfWeek, StoreDailyDealSetting>> = {};
    daysOfWeek.forEach(day => {
      const dealSetting = data.dailyDeals?.[day];
      const fixedCat = fixedDailyCategories[day];
      if (dealSetting) { // if a deal setting exists for the day (even if just default 0%)
        populatedDailyDeals[day] = {
          category: fixedCat || dealSetting.category, // Use fixed if available, else from form (for Sat/Sun)
          discountPercentage: dealSetting.discountPercentage || 0,
        };
      } else if (fixedCat) { // If no setting but fixed cat exists, create a default 0%
        populatedDailyDeals[day] = { category: fixedCat, discountPercentage: 0 };
      }
      // If neither (e.g. a Sat/Sun with no deal set), it will remain undefined and not saved.
    });

    const finalData = { ...data, dailyDeals: populatedDailyDeals };

    try {
      if (currentStore) {
        await updateStore(currentStore.id, finalData);
        toast({ title: "Store Updated", description: "The store details have been successfully updated." });
      } else {
        await addStore(finalData);
        toast({ title: "Store Added", description: "The new store has been successfully created." });
      }
      setIsFormOpen(false);
      setCurrentStore(null);
      form.reset({ name: '', address: '', city: '', hours: '', dailyDeals: getDefaultDailyDealsFormValues() });
    } catch (error: any) {
      console.error("Failed to save store:", error);
      toast({ title: "Error Saving Store", description: error.message || "Failed to save store.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary flex items-center">
            <Building className="mr-3 h-8 w-8" /> Manage Stores
          </h1>
          <p className="text-muted-foreground">Add, edit, or remove store locations and their daily category discounts.</p>
        </div>
        <Button onClick={handleAddNewStore} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Store
        </Button>
      </header>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
          setIsFormOpen(isOpen);
          if (!isOpen) {
            setCurrentStore(null); 
            form.reset({ name: '', address: '', city: '', hours: '', dailyDeals: getDefaultDailyDealsFormValues() });
          }
        }}>
        <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-primary flex items-center">
             <Building className="mr-2 h-7 w-7"/> {currentStore ? 'Edit Store & Daily Discounts' : 'Add New Store'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveStore)} className="space-y-6 py-4">
              {/* Store Info Fields: Name, Address, City, Hours - unchanged */}
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Store Name</FormLabel><FormControl><Input placeholder="Dodi Deals - Downtown" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="123 Main St" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City & State</FormLabel><FormControl><Input placeholder="Indianapolis, IN" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="hours" render={({ field }) => (<FormItem><FormLabel>Operating Hours</FormLabel><FormControl><Input placeholder="Mon-Sat: 9am - 9pm, Sun: 10am - 6pm" {...field} /></FormControl><FormMessage /></FormItem>)} />
              
              <Accordion type="single" collapsible className="w-full border p-4 rounded-lg" defaultValue="daily-category-discounts">
                <AccordionItem value="daily-category-discounts">
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                      <div className="flex items-center"><Gift className="mr-2 h-5 w-5 text-accent"/> Manage Daily Category Discounts</div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-3">
                    {daysOfWeek.map((day) => {
                      const fixedCategory = fixedDailyCategories[day];
                      return (
                        <Card key={day} className="p-4 bg-muted/30 shadow-sm">
                          <FormLabel className="text-md font-semibold text-primary">{day}'s Discount</FormLabel>
                          <div className="mt-2 space-y-3">
                            <FormField
                              control={form.control}
                              name={`dailyDeals.${day}.category`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Category on Sale</FormLabel>
                                  {fixedCategory ? (
                                    <>
                                      <Input value={fixedCategory} readOnly disabled className="bg-slate-100" />
                                      <FormDescription>The category for {day} is fixed to {fixedCategory}.</FormDescription>
                                    </>
                                  ) : (
                                    <Select 
                                      onValueChange={(value) => field.onChange(value as ProductCategory)} 
                                      value={field.value || (productCategories[0] || 'Vape')}
                                      defaultValue={field.value || (productCategories[0] || 'Vape')}
                                    >
                                      <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                                      <SelectContent>
                                        {productCategories.map(cat => (
                                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                             <FormField
                              control={form.control}
                              name={`dailyDeals.${day}.discountPercentage`}
                              render={({ field: { onChange, ...fieldProps } }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center">
                                    Discount Percentage <Percent className="ml-1 h-4 w-4 text-muted-foreground" />
                                  </FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="e.g., 10 for 10%" 
                                      {...fieldProps}
                                      value={fieldProps.value ?? 0} // Ensure value is controlled, provide 0 if undefined
                                      onChange={e => onChange(parseFloat(e.target.value) || 0)} // Handle NaN with || 0
                                      min="0" max="100" step="1"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </Card>
                      );
                    })}
                    <p className="text-xs text-muted-foreground mt-4 p-2">
                      Set the percentage discount for the specified product category for each day of the week.
                      For Monday-Friday, the category is fixed. For Saturday & Sunday, you can select the category.
                      A 0% discount means no deal is active for that category on that day.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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

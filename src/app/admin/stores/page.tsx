
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label"; // No longer used here
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  StoreSchema, 
  type StoreFormData, 
  type Store, 
  daysOfWeek, 
  type ProductCategory, 
  productCategories, // productCategories now includes "Hemp Accessory"
  type CustomDealRule,
} from '@/lib/types';
import { addStore, updateStore, deleteStore } from '@/lib/firestoreService';
import { useAppContext } from '@/hooks/useAppContext';
import { toast } from "@/hooks/use-toast";
import { PlusCircle, Edit, Trash2, Loader2, Building, Gift, Percent, XCircle, Info } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';


export default function AdminStoresPage() {
  const { stores: appStores, loadingStores: loadingAppStores } = useAppContext();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [loading, setLoading] = useState(false); 

  const form = useForm<StoreFormData>({
    resolver: zodResolver(StoreSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      hours: '',
      dailyDeals: [], 
    },
  });

  const { fields: dealFields, append: appendDeal, remove: removeDeal } = useFieldArray({
    control: form.control,
    name: "dailyDeals",
    keyName: "ruleId" 
  });
  
  useEffect(() => {
    if (isFormOpen) {
      if (currentStore) {
        form.reset({ 
          ...currentStore, 
          dailyDeals: currentStore.dailyDeals?.map(deal => ({...deal, id: deal.id || crypto.randomUUID() })) || [] 
        });
      } else {
        form.reset({
          name: '',
          address: '',
          city: '',
          hours: '',
          dailyDeals: [],
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
      dailyDeals: [],
    });
    setIsFormOpen(true);
  };

  const handleEditStore = (store: Store) => {
    setCurrentStore(store);
    form.reset({ 
      ...store, 
      dailyDeals: store.dailyDeals?.map(deal => ({ ...deal, id: deal.id || crypto.randomUUID() })) || []
    });
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
    const dailyDealsToSave = data.dailyDeals?.map(({ id, ...rest }) => rest) || [];
    const finalData = { ...data, dailyDeals: dailyDealsToSave };

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
      form.reset({ name: '', address: '', city: '', hours: '', dailyDeals: [] });
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
          <p className="text-muted-foreground">Add, edit, or remove store locations and their custom daily deal rules.</p>
        </div>
        <Button onClick={handleAddNewStore} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Store
        </Button>
      </header>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
          setIsFormOpen(isOpen);
          if (!isOpen) {
            setCurrentStore(null); 
            form.reset({ name: '', address: '', city: '', hours: '', dailyDeals: [] });
          }
        }}>
        <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-primary flex items-center">
             <Building className="mr-2 h-7 w-7"/> {currentStore ? 'Edit Store & Deal Rules' : 'Add New Store'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveStore)} className="space-y-6 py-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Store Name</FormLabel><FormControl><Input placeholder="Dodi Deals - Downtown" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="123 Main St" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City & State</FormLabel><FormControl><Input placeholder="Indianapolis, IN" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="hours" render={({ field }) => (<FormItem><FormLabel>Operating Hours</FormLabel><FormControl><Input placeholder="Mon-Sat: 9am - 9pm, Sun: 10am - 6pm" {...field} /></FormControl><FormMessage /></FormItem>)} />
              
              <Accordion type="single" collapsible className="w-full border p-4 rounded-lg" defaultValue="custom-deal-rules">
                <AccordionItem value="custom-deal-rules">
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                      <div className="flex items-center"><Gift className="mr-2 h-5 w-5 text-accent"/> Manage Custom Deal Rules</div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <Card className="p-4 bg-blue-50 border border-blue-200 shadow-sm">
                      <CardHeader className="p-0 pb-2">
                        <CardTitle className="text-md font-semibold text-blue-700 flex items-center">
                          <Info className="mr-2 h-5 w-5" /> Site-Wide Standard Deals
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 text-sm text-blue-600 space-y-1">
                        <p><span className="font-semibold">Tuesday:</span> 25% off all Vape products.</p>
                        <p><span className="font-semibold">Wednesday:</span> 15% off all Dodi Hemp brand products.</p>
                        <p><span className="font-semibold">Thursday:</span> 20% off all Edible products.</p>
                        <p className="text-xs text-blue-500 mt-2">
                          Note: These site-wide deals take precedence over custom rules for the same category/brand on the specified days.
                          Custom rules will apply to other categories or on other days.
                        </p>
                      </CardContent>
                    </Card>

                    <Separator className="my-4" />
                    
                    {dealFields.map((ruleField, index) => (
                      <Card key={ruleField.ruleId} className="p-4 bg-muted/30 shadow-sm relative">
                         <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 text-destructive"
                            onClick={() => removeDeal(index)}
                          >
                            <XCircle className="h-5 w-5" />
                          </Button>
                        <FormLabel className="text-md font-semibold text-primary mb-2 block">Custom Deal Rule #{index + 1}</FormLabel>
                        
                        <FormField
                          control={form.control}
                          name={`dailyDeals.${index}.category`}
                          render={({ field }) => (
                            <FormItem className="mb-3">
                              <FormLabel>Category on Sale</FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(value as ProductCategory)} 
                                value={field.value || ''}
                                defaultValue={field.value || ''}
                              >
                                <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {productCategories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`dailyDeals.${index}.discountPercentage`}
                          render={({ field: { onChange, ...fieldProps } }) => (
                            <FormItem className="mb-3">
                              <FormLabel className="flex items-center">
                                Discount Percentage <Percent className="ml-1 h-4 w-4 text-muted-foreground" />
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="e.g., 10 for 10%" 
                                  {...fieldProps}
                                  value={fieldProps.value ?? 0} 
                                  onChange={e => onChange(parseFloat(e.target.value) || 0)}
                                  min="0" max="100" step="1"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormItem className="mb-3">
                            <FormLabel>Apply to Days</FormLabel>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-2 border rounded-md">
                                {daysOfWeek.map((day) => (
                                <FormField
                                    key={day}
                                    control={form.control}
                                    name={`dailyDeals.${index}.selectedDays`}
                                    render={({ field }) => {
                                    const currentSelectedDays = Array.isArray(field.value) ? field.value : [];
                                    return (
                                        <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                            checked={currentSelectedDays.includes(day)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                ? field.onChange([...currentSelectedDays, day])
                                                : field.onChange(
                                                    currentSelectedDays.filter(
                                                    (value) => value !== day
                                                    )
                                                );
                                            }}
                                            />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal pt-0.5">
                                            {day}
                                        </FormLabel>
                                        </FormItem>
                                    );
                                    }}
                                />
                                ))}
                            </div>
                             <FormMessage>{form.formState.errors.dailyDeals?.[index]?.selectedDays?.message}</FormMessage>
                        </FormItem>
                      </Card>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendDeal({ selectedDays: [], category: productCategories[0], discountPercentage: 0, id: crypto.randomUUID() })}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Custom Deal Rule
                    </Button>
                     <FormMessage>{form.formState.errors.dailyDeals?.root?.message || form.formState.errors.dailyDeals?.message}</FormMessage>
                    <p className="text-xs text-muted-foreground mt-4 p-2">
                      Create custom rules for category-wide discounts. Each rule specifies the category, discount percentage, and the days of the week it applies.
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
              <span className="font-semibold"> {storeToDelete?.name}</span> and all its associated deal rules.
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
                  <TableHead>Custom Deal Rules</TableHead>
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
                    <TableCell>{store.dailyDeals?.length || 0} rule(s)</TableCell>
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

    
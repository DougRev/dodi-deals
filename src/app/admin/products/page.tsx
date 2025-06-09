
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProductSchema, type ProductFormData, type Product, type Store, productCategories, type StoreAvailability, flowerWeights, type FlowerWeight, type FlowerWeightPrice } from '@/lib/types';
import { addProduct, updateProduct, deleteProduct } from '@/lib/firestoreService';
import { useAppContext } from '@/hooks/useAppContext';
import { toast } from "@/hooks/use-toast";
import { PlusCircle, Edit, Trash2, Loader2, Package, PackageSearch, XCircle, StoreIcon, Star, Weight, PackagePlus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

const getDefaultAvailability = (category: ProductFormData['category'], stores: Store[]): StoreAvailability[] => {
  const defaultStoreId = stores.length > 0 ? stores[0].id : '';
  if (category === 'Flower') {
    return [{
      storeId: defaultStoreId,
      weightOptions: flowerWeights.map(fw => ({ weight: fw, price: 0 })), // Only price, stock removed
      totalStockInGrams: 0, // Added totalStockInGrams
      storeSpecificImageUrl: '',
    }];
  }
  return [{
    storeId: defaultStoreId,
    price: 0,
    stock: 0,
    storeSpecificImageUrl: '',
  }];
};


export default function AdminProductsPage() {
  const { allProducts: appProducts, loadingProducts: loadingAppProducts, stores, loadingStores } = useAppContext();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(ProductSchema),
    defaultValues: {
      name: '',
      description: '',
      brand: '',
      baseImageUrl: 'https://placehold.co/600x400.png',
      category: productCategories[0] || 'Vape',
      dataAiHint: '',
      isFeatured: false,
      availability: getDefaultAvailability(productCategories[0] || 'Vape', stores),
    },
  });

  const watchedCategory = useWatch({ control: form.control, name: 'category' });

  const { fields: availabilityFields, append: appendAvailability, remove: removeAvailability } = useFieldArray({
    control: form.control,
    name: "availability"
  });

  useEffect(() => {
    if (form.formState.isSubmitted) return;

    const currentAvailability = form.getValues('availability');
    const newAvailabilityStructure = currentAvailability.map(avail => {
      if (watchedCategory === 'Flower') {
        // Ensure all standard flowerWeights are present in weightOptions with their prices
        const completeWeightOptions = flowerWeights.map(fw => {
          const existingOption = avail.weightOptions?.find(wo => wo.weight === fw);
          return {
            weight: fw,
            price: existingOption?.price || 0,
            // stock: undefined // stock is removed from FlowerWeightPrice
          };
        });
        return {
          storeId: avail.storeId,
          storeSpecificImageUrl: avail.storeSpecificImageUrl || '',
          weightOptions: completeWeightOptions,
          totalStockInGrams: avail.totalStockInGrams || 0,
          price: undefined,
          stock: undefined,
        };
      } else {
        return {
          storeId: avail.storeId,
          storeSpecificImageUrl: avail.storeSpecificImageUrl || '',
          price: avail.price || 0,
          stock: avail.stock || 0,
          weightOptions: undefined,
          totalStockInGrams: undefined,
        };
      }
    });
    if (JSON.stringify(currentAvailability) !== JSON.stringify(newAvailabilityStructure)) {
        form.setValue('availability', newAvailabilityStructure as any, { shouldValidate: true, shouldDirty: true });
    }
  }, [watchedCategory, form, stores]);


  useEffect(() => {
    if (isFormOpen) {
      let initialValues: ProductFormData;
      if (currentProduct) {
        initialValues = {
          ...currentProduct,
          category: currentProduct.category || (productCategories[0] || 'Vape'),
          isFeatured: currentProduct.isFeatured || false,
          availability: currentProduct.availability.map(avail => {
            if (currentProduct.category === 'Flower') {
              const completeWeightOptions = flowerWeights.map(fw => {
                const existingOption = avail.weightOptions?.find(wo => wo.weight === fw);
                return {
                  weight: fw,
                  price: existingOption?.price || 0,
                };
              });
              return {
                ...avail,
                weightOptions: completeWeightOptions,
                totalStockInGrams: avail.totalStockInGrams || 0,
                price: undefined,
                stock: undefined,
              };
            }
            return {
              ...avail,
              price: Number(avail.price) || 0,
              stock: Number(avail.stock) || 0,
              weightOptions: undefined,
              totalStockInGrams: undefined,
            };
          }) as StoreAvailability[],
        };
      } else {
        const defaultCat = productCategories[0] || 'Vape';
        initialValues = {
          name: '',
          description: '',
          brand: '',
          baseImageUrl: 'https://placehold.co/600x400.png',
          category: defaultCat,
          dataAiHint: '',
          isFeatured: false,
          availability: getDefaultAvailability(defaultCat, stores),
        };
      }
      form.reset(initialValues);
    }
  }, [isFormOpen, currentProduct, form.reset, stores]);


  const handleAddNewProduct = () => {
    setCurrentProduct(null);
    const defaultCat = productCategories[0] || 'Vape';
    form.reset({
      name: '',
      description: '',
      brand: '',
      baseImageUrl: 'https://placehold.co/600x400.png',
      category: defaultCat,
      dataAiHint: '',
      isFeatured: false,
      availability: getDefaultAvailability(defaultCat, stores),
    });
    setIsFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setCurrentProduct(product);
    setIsFormOpen(true);
  };


  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setFormLoading(true);
    try {
      await deleteProduct(productToDelete.id);
      toast({ title: "Product Deleted", description: `${productToDelete.name} has been successfully deleted.` });
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (error: any) {
      console.error("Failed to delete product:", error);
      toast({ title: "Error Deleting Product", description: error.message || "Failed to delete product.", variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const handleSaveProduct = async (data: ProductFormData) => {
    setFormLoading(true);
    try {
      const productDataPayload: Omit<Product, 'id'> = {
        ...data,
        isFeatured: data.isFeatured || false,
        availability: data.availability.map(avail => {
          if (data.category === 'Flower') {
            return {
              storeId: avail.storeId,
              weightOptions: avail.weightOptions?.map(wo => ({
                ...wo,
                price: Number(wo.price),
              })) || [],
              totalStockInGrams: Number(avail.totalStockInGrams) || 0,
              storeSpecificImageUrl: avail.storeSpecificImageUrl === '' ? undefined : avail.storeSpecificImageUrl,
            };
          } else {
            return {
              storeId: avail.storeId,
              price: Number(avail.price),
              stock: Number(avail.stock),
              storeSpecificImageUrl: avail.storeSpecificImageUrl === '' ? undefined : avail.storeSpecificImageUrl,
            };
          }
        }) as any,
      };

      if (currentProduct) {
        await updateProduct(currentProduct.id, productDataPayload);
        toast({ title: "Product Updated", description: "The product details have been successfully updated." });
      } else {
        await addProduct(productDataPayload);
        toast({ title: "Product Added", description: "The new product has been successfully created." });
      }
      setIsFormOpen(false);
      setCurrentProduct(null);
      form.reset();
    } catch (error: any) {
      console.error("Failed to save product:", error);
      toast({ title: "Error Saving Product", description: error.message || "Failed to save product.", variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const getStoreName = (storeId: string) => stores.find(s => s.id === storeId)?.name || 'Unknown';

  const handlePopulateAllStores = () => {
    if (loadingStores || stores.length === 0) {
        toast({ title: "Stores not loaded", description: "Cannot populate stores yet.", variant: "destructive" });
        return;
    }

    const currentFormAvailabilities = form.getValues('availability') || [];
    let operationsPerformed = 0;
    const currentCategory = form.getValues('category');

    if (currentFormAvailabilities.length === 1 && (!currentFormAvailabilities[0].storeId || currentFormAvailabilities[0].storeId.trim() === '')) {
        const placeholder = currentFormAvailabilities[0];
        removeAvailability(0);

        stores.forEach(store => {
            appendAvailability(
                currentCategory === 'Flower' ?
                { storeId: store.id, weightOptions: flowerWeights.map(fw => ({ weight: fw, price: placeholder.weightOptions?.find(wo => wo.weight === fw)?.price || 0 })), totalStockInGrams: placeholder.totalStockInGrams || 0, storeSpecificImageUrl: '' } :
                { storeId: store.id, price: placeholder.price || 0, stock: placeholder.stock || 0, storeSpecificImageUrl: '' }
            );
            operationsPerformed++;
        });
        if (operationsPerformed > 0) {
             toast({ title: "Stores Populated", description: `Replaced placeholder and added all ${operationsPerformed} store(s).` });
        } else {
             toast({ title: "No Stores", description: "Placeholder removed, but no stores configured to add." });
        }
    } else {
        const existingStoreIdsInForm = new Set(availabilityFields.map(field => form.getValues(`availability.${availabilityFields.indexOf(field)}.storeId`)).filter(id => id && id.trim() !== ''));
        const firstEntry = currentFormAvailabilities[0];

        stores.forEach(store => {
            if (!existingStoreIdsInForm.has(store.id)) {
                appendAvailability(
                    currentCategory === 'Flower' ?
                    { storeId: store.id, weightOptions: flowerWeights.map(fw => ({ weight: fw, price: firstEntry?.weightOptions?.find(wo => wo.weight === fw)?.price || 0 })), totalStockInGrams: firstEntry?.totalStockInGrams || 0, storeSpecificImageUrl: '' } :
                    { storeId: store.id, price: firstEntry?.price || 0, stock: firstEntry?.stock || 0, storeSpecificImageUrl: '' }
                );
                operationsPerformed++;
            }
        });

        if (operationsPerformed > 0) {
            toast({ title: "Stores Added", description: `${operationsPerformed} additional store(s) added to the list.` });
        } else if (stores.length > 0) {
            toast({ title: "All Stores Present", description: "All available stores are already in the list." });
        } else {
             toast({ title: "No Stores", description: "No stores configured to add." });
        }
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary flex items-center">
            <Package className="mr-3 h-8 w-8" /> Manage Products
          </h1>
          <p className="text-muted-foreground">Add, edit, or remove product definitions for Dodi Deals.</p>
        </div>
        <Button onClick={handleAddNewProduct} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Product
        </Button>
      </header>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
          setIsFormOpen(isOpen);
          if (!isOpen) {
            setCurrentProduct(null);
            form.reset();
          }
        }}>
        <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-primary">
              {currentProduct ? 'Edit Product Definition' : 'Add New Product Definition'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveProduct)} className="space-y-6 py-4">
              {/* Basic Product Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Product Name</FormLabel><FormControl><Input placeholder="e.g., Indigo Haze Vape Pen" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="brand" render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Dodi Originals" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Detailed description of the product..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>)}/>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {productCategories.map(category => (<SelectItem key={category} value={category}>{category}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="dataAiHint" render={({ field }) => (<FormItem><FormLabel>Image AI Hint (Optional)</FormLabel><FormControl><Input placeholder="e.g., vape pen (max 2 words)" {...field} /></FormControl><FormDescription>Keywords for AI image search (max 2 words).</FormDescription><FormMessage /></FormItem>)}/>
              </div>
              <FormField control={form.control} name="baseImageUrl" render={({ field }) => ( <FormItem><FormLabel>Base Image URL</FormLabel><FormControl><Input placeholder="https://placehold.co/600x400.png" {...field} /></FormControl>{field.value && (<div className="mt-2 rounded-md overflow-hidden border border-muted w-24 h-24 relative"><Image src={field.value} alt="Base product preview" fill style={{ objectFit: 'cover' }} sizes="100px" onError={(e) => e.currentTarget.src = 'https://placehold.co/100x100.png?text=Invalid'}/></div>)}<FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="isFeatured" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Feature this product on the homepage?</FormLabel><FormDescription>Featured products are highlighted to users.</FormDescription></div><FormMessage /></FormItem>)}/>

              <div className="space-y-4 rounded-md border p-4">
                <div className="flex justify-between items-center">
                    <FormLabel className="text-md font-semibold text-primary">Store Availability</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={handlePopulateAllStores} disabled={loadingStores || stores.length === 0}><StoreIcon className="mr-2 h-4 w-4" /> Populate All Stores</Button>
                </div>
                {form.formState.errors.availability?.root && <FormMessage>{form.formState.errors.availability.root.message}</FormMessage>}

                {availabilityFields.map((storeAvailField, storeAvailIndex) => (
                  <Card key={storeAvailField.id} className="p-4 space-y-3 relative shadow-sm">
                    <div className="flex justify-between items-center">
                      <FormLabel className="text-sm">Availability for Store #{storeAvailIndex + 1}</FormLabel>
                      {availabilityFields.length > 1 && (<Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeAvailability(storeAvailIndex)}><XCircle className="h-5 w-5" /></Button>)}
                    </div>
                    <FormField control={form.control} name={`availability.${storeAvailIndex}.storeId`} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Store</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''} defaultValue={field.value || ''} disabled={loadingStores}>
                            <FormControl><SelectTrigger><SelectValue placeholder={loadingStores ? "Loading..." : "Select store"} /></SelectTrigger></FormControl>
                            <SelectContent>{stores.map((store: Store) => (<SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>))}</SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name={`availability.${storeAvailIndex}.storeSpecificImageUrl`} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Store Specific Image URL (Optional)</FormLabel>
                          <FormControl><Input placeholder="Overrides base image for this store" {...field} /></FormControl>
                          {field.value && (<div className="mt-2 rounded-md overflow-hidden border border-muted w-20 h-20 relative"><Image src={field.value} alt="Store specific preview" fill style={{ objectFit: 'cover' }} sizes="80px" onError={(e) => e.currentTarget.src = 'https://placehold.co/80x80.png?text=Invalid'}/></div>)}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {watchedCategory === 'Flower' ? (
                      <>
                        <FormField
                          control={form.control}
                          name={`availability.${storeAvailIndex}.totalStockInGrams`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center"><PackagePlus className="mr-2 h-4 w-4 text-muted-foreground"/>Total Stock (grams)</FormLabel>
                              <FormControl><Input type="number" placeholder="e.g., 28 for 1 ounce" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} step="0.1" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="space-y-3 pt-2 border-t mt-3">
                          <FormLabel className="text-sm font-medium text-primary flex items-center"><Weight className="mr-2 h-4 w-4"/>Weight Option Prices</FormLabel>
                          {flowerWeights && flowerWeights.length > 0 ? flowerWeights.map((fw, weightIndex) => {
                            const weightOptPath = `availability.${storeAvailIndex}.weightOptions`;
                            return (
                              <Card key={`${storeAvailField.id}-${fw}`} className="p-3 bg-muted/50">
                                <FormLabel className="text-xs font-semibold">{fw}</FormLabel>
                                <div className="grid grid-cols-1 gap-3 mt-1"> {/* Only price now */}
                                  <FormField
                                    control={form.control}
                                    name={`${weightOptPath}.${weightIndex}.price` as any}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Price ($)</FormLabel>
                                        <FormControl><Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} step="0.01" /></FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  {/* Hidden field to store the weight itself */}
                                  <Controller name={`${weightOptPath}.${weightIndex}.weight` as any} control={form.control} defaultValue={fw} render={({ field }) => <input type="hidden" {...field} />} />
                                </div>
                              </Card>
                            );
                          }) : <p className="text-xs text-muted-foreground">Weight options not available.</p>}
                          {form.formState.errors.availability?.[storeAvailIndex]?.weightOptions?.message && <FormMessage>{form.formState.errors.availability?.[storeAvailIndex]?.weightOptions?.message}</FormMessage>}
                           {form.formState.errors.availability?.[storeAvailIndex]?.totalStockInGrams?.message && <FormMessage>{form.formState.errors.availability?.[storeAvailIndex]?.totalStockInGrams?.message}</FormMessage>}
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name={`availability.${storeAvailIndex}.price`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price ($)</FormLabel>
                              <FormControl><Input type="number" placeholder="29.99" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} step="0.01" /></FormControl><FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField control={form.control} name={`availability.${storeAvailIndex}.stock`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stock</FormLabel>
                              <FormControl><Input type="number" placeholder="50" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} step="1" /></FormControl><FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    <FormMessage>{form.formState.errors.availability?.[storeAvailIndex]?.message}</FormMessage>
                  </Card>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => {
                    const currentCategory = form.getValues('category');
                    const newAvailEntry = currentCategory === 'Flower' ?
                        { storeId: stores.length > 0 ? stores[0].id : '', weightOptions: flowerWeights.map(fw => ({ weight: fw, price: 0 })), totalStockInGrams: 0, storeSpecificImageUrl: '' } :
                        { storeId: stores.length > 0 ? stores[0].id : '', price: 0, stock: 0, storeSpecificImageUrl: '' };
                    appendAvailability(newAvailEntry as any);
                }} disabled={loadingStores}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Store Availability
                </Button>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={formLoading}>Cancel</Button>
                <Button type="submit" disabled={formLoading || loadingStores} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {currentProduct ? 'Save Changes' : 'Create Product'}
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
              This action cannot be undone. This will permanently delete the product definition for <span className="font-semibold">{productToDelete?.name}</span> and all its store availability records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDelete(null)} disabled={formLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProduct} disabled={formLoading} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Product Definitions</CardTitle>
          <CardDescription>Overview of all product definitions and their general availability.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAppProducts || loadingStores ? (
            <div className="flex justify-center items-center h-40"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
          ) : appProducts.length === 0 ? (
            <div className="text-center py-10">
              <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">No products defined yet.</p>
              <p className="text-muted-foreground text-sm">Click "Add New Product" to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Availability / Pricing / Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="w-16 h-16 rounded-md overflow-hidden border border-muted relative">
                        <Image src={product.baseImageUrl} alt={product.name} fill style={{ objectFit: 'cover' }} sizes="64px" data-ai-hint={product.dataAiHint || "product image"}/>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      {product.isFeatured ? <Star className="h-5 w-5 text-yellow-500 fill-yellow-400" /> : <Star className="h-5 w-5 text-muted-foreground/50" />}
                    </TableCell>
                    <TableCell>{product.brand}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>
                        {product.availability?.length > 0
                            ? product.category === 'Flower' && product.availability[0].weightOptions && product.availability[0].weightOptions.length > 0
                                ? `${product.availability.length} store(s) - e.g., ${product.availability[0].weightOptions[0].weight} @ $${(product.availability[0].weightOptions[0].price || 0).toFixed(2)} (Total: ${product.availability[0].totalStockInGrams || 0}g)`
                                : product.availability[0].price !== undefined
                                    ? `${product.availability.length} store(s) - e.g., $${(product.availability[0].price as number).toFixed(2)} (Stock: ${product.availability[0].stock || 0})`
                                    : "Details not set"
                            : "Not available"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditProduct(product)} className="text-accent border-accent hover:bg-accent/10">
                        <Edit className="mr-1 h-4 w-4" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteProduct(product)}>
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

    
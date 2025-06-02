
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProductSchema, type ProductFormData, type Product, type Store, type ProductCategory } from '@/lib/types';
import { addProduct, updateProduct, deleteProduct } from '@/lib/firestoreService';
import { useAppContext } from '@/hooks/useAppContext';
import { toast } from "@/hooks/use-toast";
import { PlusCircle, Edit, Trash2, Loader2, Package, PackageSearch } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const productCategories: ProductCategory[] = ['Vape', 'THCa', 'Accessory'];

export default function AdminProductsPage() {
  const { allProducts, loadingProducts: loadingAppProducts, stores, loadingStores } = useAppContext();
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
      price: 0,
      imageUrl: 'https://placehold.co/600x400.png',
      category: 'Vape',
      stock: 0,
      storeId: '',
      dataAiHint: '',
    },
  });

  useEffect(() => {
    if (isFormOpen) {
      if (currentProduct) {
        form.reset({
          ...currentProduct,
          price: Number(currentProduct.price), // Ensure price and stock are numbers for the form
          stock: Number(currentProduct.stock),
        });
      } else {
        form.reset({
          name: '',
          description: '',
          price: 0,
          imageUrl: 'https://placehold.co/600x400.png',
          category: 'Vape',
          stock: 0,
          storeId: stores.length > 0 ? stores[0].id : '', // Default to first store if available
          dataAiHint: '',
        });
      }
    }
  }, [isFormOpen, currentProduct, form, stores]);

  const handleAddNewProduct = () => {
    setCurrentProduct(null);
    // Reset form with default values, especially storeId if stores are loaded
    form.reset({
      name: '',
      description: '',
      price: 0,
      imageUrl: 'https://placehold.co/600x400.png',
      category: 'Vape',
      stock: 0,
      storeId: stores.length > 0 ? stores[0].id : '',
      dataAiHint: '',
    });
    setIsFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setCurrentProduct(product);
     form.reset({
        ...product,
        price: Number(product.price),
        stock: Number(product.stock),
      });
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
      const productDataPayload = {
        ...data,
        price: Number(data.price),
        stock: Number(data.stock),
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
  
  const getStoreName = (storeId: string) => {
    return stores.find(s => s.id === storeId)?.name || 'Unknown Store';
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary flex items-center">
            <Package className="mr-3 h-8 w-8" /> Manage Products
          </h1>
          <p className="text-muted-foreground">Add, edit, or remove product listings for Dodi Deals.</p>
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
        <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-primary">
              {currentProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveProduct)} className="space-y-6 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Indigo Haze Vape Pen" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Detailed description of the product..." {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="29.99" {...field} step="0.01" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="50" {...field} step="1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {productCategories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="storeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingStores}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingStores ? "Loading stores..." : "Select a store"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stores.map((store: Store) => (
                          <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>The store where this product listing will appear.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://placehold.co/600x400.png" {...field} />
                    </FormControl>
                     {field.value && (
                      <div className="mt-2 rounded-md overflow-hidden border border-muted w-32 h-32 relative">
                        <Image src={field.value} alt="Product preview" layout="fill" objectFit="cover" onError={(e) => e.currentTarget.src = 'https://placehold.co/100x100.png?text=Invalid'}/>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dataAiHint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image AI Hint (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., vape pen, cannabis flower (max 2 words)" {...field} />
                    </FormControl>
                    <FormDescription>Keywords for AI image search suggestions (max 2 words).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={formLoading}>
                  Cancel
                </Button>
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
              This action cannot be undone. This will permanently delete the product listing for
              <span className="font-semibold"> {productToDelete?.name}</span>.
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
          <CardTitle>Product List</CardTitle>
          <CardDescription>Overview of all product listings across stores.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAppProducts || loadingStores ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : allProducts.length === 0 ? (
            <div className="text-center py-10">
              <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">No products found.</p>
              <p className="text-muted-foreground text-sm">Click "Add New Product" to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="w-16 h-16 rounded-md overflow-hidden border border-muted relative">
                        <Image src={product.imageUrl} alt={product.name} layout="fill" objectFit="cover" data-ai-hint={product.dataAiHint || "product image"}/>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{getStoreName(product.storeId)}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell className="text-right">${Number(product.price).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{product.stock}</TableCell>
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

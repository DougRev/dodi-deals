
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { updateProductStockForStoreByManager } from '@/lib/firestoreService';
import type { Product, StoreAvailability, ProductCategory } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from '@/hooks/use-toast';
import { Loader2, PackagePlus, Edit, AlertTriangle, Construction, PackageSearch } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditableProduct extends Product {
  currentStoreAvailability: StoreAvailability | undefined;
}

export default function ManagerStockPage() {
  const { user, selectedStore, allProducts, loadingProducts: appContextLoadingProducts, loadingAuth } = useAppContext();
  const [storeProducts, setStoreProducts] = useState<EditableProduct[]>([]);
  const [loadingPageData, setLoadingPageData] = useState(true);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedProductForStockEdit, setSelectedProductForStockEdit] = useState<EditableProduct | null>(null);
  const [newStockValue, setNewStockValue] = useState<string>("");
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<'All' | ProductCategory>('All');

  const uniqueCategoriesForFilter = useMemo(() => {
    const categories = new Set(storeProducts.map(p => p.category));
    return ['All', ...Array.from(categories).sort()] as ('All' | ProductCategory)[];
  }, [storeProducts]);

  const filteredStoreProducts = useMemo(() => {
    if (categoryFilter === 'All') {
      return storeProducts;
    }
    return storeProducts.filter(p => p.category === categoryFilter);
  }, [storeProducts, categoryFilter]);


  const memoizedUser = useMemo(() => user, [user]);
  const memoizedSelectedStore = useMemo(() => selectedStore, [selectedStore]);
  const memoizedAllProducts = useMemo(() => allProducts, [allProducts]);

  useEffect(() => {
    if (appContextLoadingProducts || loadingAuth) {
      setLoadingPageData(true);
      return;
    }

    if (memoizedUser?.storeRole !== 'Manager' || !memoizedSelectedStore?.id) {
      setStoreProducts([]);
      setLoadingPageData(false);
      return;
    }

    const productsInManagerStore = memoizedAllProducts
      .map(p => {
        const currentStoreAvailability = p.availability.find(avail => avail.storeId === memoizedSelectedStore!.id);
        return { ...p, currentStoreAvailability };
      })
      .filter(p => p.currentStoreAvailability !== undefined) as EditableProduct[];
    
    setStoreProducts(productsInManagerStore);
    setLoadingPageData(false);

  }, [memoizedUser, memoizedSelectedStore, memoizedAllProducts, appContextLoadingProducts, loadingAuth]);


  const handleOpenStockModal = (product: EditableProduct) => {
    setSelectedProductForStockEdit(product);
    if (product.category === 'Flower') {
      setNewStockValue(String(product.currentStoreAvailability?.totalStockInGrams ?? '0'));
    } else {
      setNewStockValue(String(product.currentStoreAvailability?.stock ?? '0'));
    }
    setIsStockModalOpen(true);
  };

  const handleSaveStock = async () => {
    if (!selectedProductForStockEdit || !memoizedUser || !memoizedSelectedStore?.id) {
      toast({ title: "Error", description: "Missing product, user, or store information.", variant: "destructive" });
      return;
    }
    if (newStockValue === "" || isNaN(Number(newStockValue)) || Number(newStockValue) < 0) {
      toast({ title: "Invalid Stock Value", description: "Stock must be a non-negative number.", variant: "destructive" });
      return;
    }

    setIsUpdatingStock(true);
    const stockNumericValue = Number(newStockValue);

    try {
      const stockUpdatePayload = selectedProductForStockEdit.category === 'Flower'
        ? { totalStockInGrams: stockNumericValue }
        : { stock: stockNumericValue };

      await updateProductStockForStoreByManager(
        selectedProductForStockEdit.id,
        memoizedSelectedStore.id,
        stockUpdatePayload,
        memoizedUser.id
      );
      
      // Optimistically update local state or refetch
      setStoreProducts(prevProducts => 
        prevProducts.map(p => {
          if (p.id === selectedProductForStockEdit.id) {
            const updatedAvailability = { 
              ...p.currentStoreAvailability!, 
              ...(selectedProductForStockEdit.category === 'Flower' 
                  ? { totalStockInGrams: stockNumericValue } 
                  : { stock: stockNumericValue })
            };
            return { ...p, currentStoreAvailability: updatedAvailability as StoreAvailability };
          }
          return p;
        })
      );

      toast({ title: "Stock Updated", description: `Stock for ${selectedProductForStockEdit.name} has been successfully updated.` });
      setIsStockModalOpen(false);
      setSelectedProductForStockEdit(null);
      setNewStockValue("");
    } catch (error: any) {
      console.error("Failed to update stock:", error);
      toast({ title: "Error Updating Stock", description: error.message || "Failed to update stock.", variant: "destructive" });
    } finally {
      setIsUpdatingStock(false);
    }
  };

  if (loadingPageData || loadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading stock information...</p>
      </div>
    );
  }

  if (memoizedUser?.storeRole !== 'Manager') {
    return (
      <div className="text-center py-10">
        <Card className="max-w-md mx-auto p-6 shadow-xl">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2"/>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">You do not have permission to manage stock. This section is for Store Managers only.</p>
            <Button asChild className="mt-4">
              <Link href="/manager/orders">Back to Orders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!memoizedSelectedStore) {
     return (
      <div className="text-center py-10">
        <Card className="max-w-md mx-auto p-6 shadow-xl">
          <CardHeader>
            <CardTitle className="text-destructive">Store Not Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Your assigned store could not be determined. Please re-select your store or contact an admin.</p>
             <Button asChild className="mt-4">
                <Link href="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
                <CardTitle className="flex items-center text-primary"><PackagePlus className="mr-2 h-6 w-6" /> Manage Product Stock</CardTitle>
                <CardDescription>
                    View and update stock levels for products in your store: {memoizedSelectedStore.name}.
                </CardDescription>
            </div>
            <div className="w-full sm:w-auto">
                 <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as 'All' | ProductCategory)}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Filter by Category" />
                    </SelectTrigger>
                    <SelectContent>
                        {uniqueCategoriesForFilter.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {appContextLoadingProducts && storeProducts.length === 0 ? (
             <div className="flex justify-center items-center h-40"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
          ) : storeProducts.length === 0 ? (
            <div className="text-center py-10">
              <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">No products found for your store: {memoizedSelectedStore.name}.</p>
              <p className="text-muted-foreground text-sm">Admins can assign products to this store via the main Products admin page.</p>
            </div>
          ) : filteredStoreProducts.length === 0 ? (
             <div className="text-center py-10">
              <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">No products match the category '{categoryFilter}'.</p>
              <p className="text-muted-foreground text-sm">Try selecting a different category or "All".</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStoreProducts.map((product) => {
                    const stockDisplay = product.category === 'Flower'
                      ? `${product.currentStoreAvailability?.totalStockInGrams ?? 0} g`
                      : `${product.currentStoreAvailability?.stock ?? 0} units`;
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="w-12 h-12 rounded-md overflow-hidden border border-muted relative">
                            <Image src={product.baseImageUrl} alt={product.name} fill style={{ objectFit: 'cover' }} sizes="48px" data-ai-hint={product.dataAiHint || "product small"}/>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>{stockDisplay}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleOpenStockModal(product)} className="text-accent border-accent hover:bg-accent/10">
                            <Edit className="mr-1 h-4 w-4" /> Edit Stock
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Stock for: {selectedProductForStockEdit?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stockValue">
                {selectedProductForStockEdit?.category === 'Flower' ? 'Total Stock (grams)' : 'Stock Quantity'}
              </Label>
              <Input
                id="stockValue"
                type="number"
                value={newStockValue}
                onChange={(e) => setNewStockValue(e.target.value)}
                placeholder={selectedProductForStockEdit?.category === 'Flower' ? 'e.g., 100.5' : 'e.g., 50'}
                min="0"
                step={selectedProductForStockEdit?.category === 'Flower' ? "0.1" : "1"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockModalOpen(false)} disabled={isUpdatingStock}>
              Cancel
            </Button>
            <Button onClick={handleSaveStock} disabled={isUpdatingStock} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isUpdatingStock && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-8 text-center">
        <Button variant="outline" asChild>
          <Link href="/manager/orders">Back to Orders</Link>
        </Button>
      </div>
    </div>
  );
}

    
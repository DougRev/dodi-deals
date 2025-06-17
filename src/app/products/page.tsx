
"use client";

import { useState, useMemo, useEffect, Suspense } from 'react'; // Added Suspense
import { useSearchParams } from 'next/navigation';
import { ProductCard } from '@/components/site/ProductCard';
import { useAppContext } from '@/hooks/useAppContext';
import type { ResolvedProduct, ProductCategory } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, MapPin, Loader2, Tag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function ProductsPageInternal() {
  const { products: storeProducts, allProducts, selectedStore, setStoreSelectorOpen, loadingStores, loadingProducts } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | ProductCategory>('All');
  const [selectedBrand, setSelectedBrand] = useState<'All' | string>('All');
  const searchParams = useSearchParams();

  const categories = useMemo(() => {
    if (loadingProducts || !allProducts) return ['All'];
    const uniqueCategoriesFromAllProducts = new Set(allProducts.map(p => p.category));
    return ['All', ...Array.from(uniqueCategoriesFromAllProducts).sort()] as ('All' | ProductCategory)[];
  }, [allProducts, loadingProducts]);

  const brands = useMemo(() => {
    if (loadingProducts || !allProducts) return ['All'];
    let productsToConsiderForBrands = allProducts;
    if (selectedCategory !== 'All') {
        productsToConsiderForBrands = allProducts.filter(p => p.category === selectedCategory);
    }
    const uniqueBrands = new Set(productsToConsiderForBrands.map(p => p.brand));
    return ['All', ...Array.from(uniqueBrands)].sort();
  }, [allProducts, selectedCategory, loadingProducts]);

  useEffect(() => {
    if (loadingProducts) return; 

    const categoryQuery = searchParams.get('category') as ProductCategory | null;
    const brandQuery = searchParams.get('brand') as string | null;

    let categoryChangedByQuery = false;

    if (categoryQuery && categories.includes(categoryQuery)) {
      setSelectedCategory(categoryQuery);
      categoryChangedByQuery = true;
    }

    if (brandQuery && brands.includes(brandQuery)) {
      setSelectedBrand(brandQuery);
      if (!categoryChangedByQuery) {
        setSelectedCategory('All');
      }
    } else if (categoryChangedByQuery) {
      setSelectedBrand('All');
    }
  }, [searchParams, loadingProducts, categories, brands]);


  const filteredProductsForDisplay = useMemo(() => {
    if (!selectedStore) return [];
    return storeProducts.filter(product => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesBrand = selectedBrand === 'All' || product.brand === selectedBrand;
      const matchesSearchTerm =
        (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesBrand && matchesSearchTerm;
    });
  }, [storeProducts, searchTerm, selectedCategory, selectedBrand, selectedStore]);

  if (loadingStores || (!selectedStore && !loadingStores)) {
     if (!selectedStore && !loadingStores) {
        return (
        <div className="flex flex-col items-center justify-center text-center py-10 min-h-[60vh]">
            <Card className="p-8 shadow-xl max-w-md">
            <CardContent className="flex flex-col items-center">
                <MapPin className="h-16 w-16 text-primary mb-6" />
                <h1 className="text-2xl font-bold font-headline mb-4 text-primary">View Products</h1>
                <p className="text-muted-foreground mb-6">
                Please select a store to see its product inventory.
                </p>
                <Button onClick={() => setStoreSelectorOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Select Store
                </Button>
            </CardContent>
            </Card>
        </div>
        );
     }
      return (
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Loading store information...</p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold font-headline text-primary mb-2">Our Products at {selectedStore.name}</h1>
        <p className="text-lg text-muted-foreground">Explore our wide selection of vapes, THCa, and accessories.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-8 p-4 bg-card rounded-lg shadow items-center">
        <div className="relative flex-grow w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <Select 
            value={selectedCategory} 
            onValueChange={(value: 'All' | ProductCategory) => {
              setSelectedCategory(value);
              setSelectedBrand('All'); 
            }}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
         <div className="flex items-center gap-2 w-full md:w-auto">
          <Tag className="h-5 w-5 text-muted-foreground" />
          <Select value={selectedBrand} onValueChange={(value: 'All' | string) => setSelectedBrand(value)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by brand" />
            </SelectTrigger>
            <SelectContent>
              {brands.map(brand => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loadingProducts ? (
         <div className="flex justify-center items-center h-40"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <span className="ml-2">Loading products...</span></div>
      ) : filteredProductsForDisplay.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProductsForDisplay.map((product) => (
            <ProductCard key={product.variantId} product={product} />
          ))}
        </div>
      ) : (
        <Card className="text-center py-12 shadow-lg">
            <CardContent>
                <p className="text-xl text-muted-foreground">
                No products match your current filters at {selectedStore.name}.
                </p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading products page...</p>
      </div>
    }>
      <ProductsPageInternal />
    </Suspense>
  );
}

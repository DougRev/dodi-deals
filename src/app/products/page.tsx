
"use client";

import { useState, useMemo } from 'react';
import { ProductCard } from '@/components/site/ProductCard';
import { useAppContext } from '@/hooks/useAppContext';
import type { Product } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ProductsPage() {
  const { products, selectedStore, setStoreSelectorOpen } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | Product['category']>('All');

  const categories = useMemo(() => {
    if (!selectedStore) return ['All'];
    const uniqueCategories = new Set(products.map(p => p.category));
    return ['All', ...Array.from(uniqueCategories)] as ('All' | Product['category'])[];
  }, [products, selectedStore]);

  const filteredProducts = useMemo(() => {
    if (!selectedStore) return [];
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSearchTerm = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                product.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearchTerm;
    });
  }, [products, searchTerm, selectedCategory, selectedStore]);

  if (!selectedStore) {
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
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold font-headline text-primary mb-2">Our Products at {selectedStore.name}</h1>
        <p className="text-lg text-muted-foreground">Explore our wide selection of vapes, THCa, and accessories.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-8 p-4 bg-card rounded-lg shadow">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <div className="flex items-center gap-2 flex-grow md:flex-grow-0">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <Select value={selectedCategory} onValueChange={(value: 'All' | Product['category']) => setSelectedCategory(value)}>
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
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
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

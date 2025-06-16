
"use client";

import { useState } from 'react'; 
import { useAppContext } from '@/hooks/useAppContext';
import { DealCard } from '@/components/site/DealCard';
import { ProductCard } from '@/components/site/ProductCard';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, MapPin, Loader2, Star, ChevronLeft, ChevronRight } from 'lucide-react'; 
import { Card, CardContent } from '@/components/ui/card';

const MAX_FEATURED_PRODUCTS_ON_HOMEPAGE = 3;
const DEALS_PER_PAGE = 2; 

export default function HomePage() {
  const { deals, products, selectedStore, setStoreSelectorOpen, loadingStores, loadingProducts } = useAppContext();
  const [currentDealsPage, setCurrentDealsPage] = useState(1);

  // 'products' from context is now the list of base products (one card per flower)
  const featuredProducts = products
    .filter(p => p.isFeatured)
    .slice(0, MAX_FEATURED_PRODUCTS_ON_HOMEPAGE);

  const totalDealsPages = Math.ceil(deals.length / DEALS_PER_PAGE);
  const dealsStartIndex = (currentDealsPage - 1) * DEALS_PER_PAGE;
  const dealsEndIndex = dealsStartIndex + DEALS_PER_PAGE;
  const displayedDeals = deals.slice(dealsStartIndex, dealsEndIndex);

  if (loadingStores || (!selectedStore && !loadingStores)) { 
    if (!selectedStore && !loadingStores) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-10 min-h-[60vh]">
          <Card className="p-8 shadow-xl max-w-md">
            <CardContent className="flex flex-col items-center">
              <MapPin className="h-16 w-16 text-primary mb-6" />
              <h1 className="text-2xl font-bold font-headline mb-4 text-primary">Welcome to Dodi Deals!</h1>
              <p className="text-muted-foreground mb-6">
                Please select your preferred store to view deals and products available for pickup.
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
    <div className="space-y-12">
      <section>
        <h1 className="text-4xl font-bold font-headline text-center mb-2 text-primary">Today's Hottest Deals at {selectedStore.name}</h1>
        <p className="text-center text-muted-foreground mb-8">Don't miss out on these limited-time offers!</p>
        {loadingProducts ? (
           <div className="flex justify-center items-center h-40"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <span className="ml-2">Loading deals...</span></div>
        ) : deals.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayedDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
            {totalDealsPages > 1 && (
              <div className="flex justify-center items-center mt-8 space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentDealsPage(prev => Math.max(1, prev - 1))}
                  disabled={currentDealsPage === 1}
                  aria-label="Previous deals page"
                >
                  <ChevronLeft className="h-5 w-5" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentDealsPage} of {totalDealsPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentDealsPage(prev => Math.min(totalDealsPages, prev + 1))}
                  disabled={currentDealsPage === totalDealsPages}
                  aria-label="Next deals page"
                >
                  Next
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card className="text-center py-12 shadow-lg">
            <CardContent>
              <p className="text-lg text-muted-foreground">No active deals at {selectedStore.name} right now. Check back soon!</p>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold font-headline text-primary flex items-center">
            <Star className="mr-2 h-7 w-7 text-yellow-400 fill-yellow-400" /> Featured Products
          </h2>
          <Button asChild variant="link" className="text-accent">
            <Link href="/products">
              View All Products <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {loadingProducts ? (
          <div className="flex justify-center items-center h-40"><Loader2 className="h-12 w-12 animate-spin text-primary" />  <span className="ml-2">Loading products...</span></div>
        ) : featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.variantId} product={product} />
            ))}
          </div>
        ) : (
           <Card className="text-center py-12 shadow-lg">
            <CardContent>
              <p className="text-center text-lg text-muted-foreground">No featured products available at {selectedStore.name} at the moment.</p>
               <p className="text-sm text-muted-foreground mt-2">Admins can mark products as featured in the Product Management section.</p>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="text-center p-8 bg-muted/50 rounded-lg">
        <h2 className="text-3xl font-bold font-headline text-primary mb-4">Welcome to {selectedStore.name}!</h2>
        <p className="text-lg text-foreground mb-6 max-w-2xl mx-auto">
          Your premium destination at {selectedStore.city} for the finest selection of vapes and THCa products. 
          Explore our daily deals and extensive product catalog. Order online for convenient in-store pickup.
        </p>
        <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/products">
            Shop All Products at this Store
          </Link>
        </Button>
      </section>
    </div>
  );
}

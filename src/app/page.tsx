
"use client";

import { useState } from 'react'; 
import { useAppContext } from '@/hooks/useAppContext';
import { DealCard } from '@/components/site/DealCard';
import { ProductCard } from '@/components/site/ProductCard';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, MapPin, Loader2, Star, ChevronLeft, ChevronRight, ShoppingBag, Leaf, CakeSlice, Briefcase, Settings, Cigarette } from 'lucide-react'; 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProductCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

const MAX_FEATURED_PRODUCTS_ON_HOMEPAGE = 3;
const DEALS_PER_PAGE = 2; 

interface CategorySpotlightItem {
  name: string; // Can be ProductCategory or a custom name like "Dodi Exclusives"
  href: string;
  icon: React.ElementType;
  dataAiHint: string;
  isSpecial?: boolean; // For Dodi card styling
}

const categorySpotlights: CategorySpotlightItem[] = [
  { name: "Vape", href: "/products?category=Vape", icon: Cigarette, dataAiHint: "vape device" },
  { name: "Flower", href: "/products?category=Flower", icon: Leaf, dataAiHint: "cannabis flower" },
  { name: "Dodi Exclusives", href: "/products?brand=Dodi%20Hemp", icon: Star, dataAiHint: "exclusive deal", isSpecial: true },
  { name: "Edible", href: "/products?category=Edible", icon: CakeSlice, dataAiHint: "cannabis edible" },
  { name: "Hemp Accessory", href: "/products?category=Hemp%20Accessory", icon: Briefcase, dataAiHint: "hemp accessory" },
  { name: "Vape Hardware", href: "/products?category=Vape%20Hardware", icon: Settings, dataAiHint: "vape mod" },
];

export default function HomePage() {
  const { deals, products, selectedStore, setStoreSelectorOpen, loadingStores, loadingProducts } = useAppContext();
  const [currentDealsPage, setCurrentDealsPage] = useState(1);

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
      {/* Hero Section - Only if store is selected */}
      {selectedStore && (
        <section className="relative py-16 md:py-24 rounded-lg overflow-hidden shadow-xl bg-gradient-to-br from-primary/80 via-primary/60 to-accent/70">
          <div className="absolute inset-0">
            <Image
              src="/images/banner.png" 
              alt="Dodi Deals background"
              fill
              style={{ objectFit: 'cover' }}
              className="opacity-20"
              data-ai-hint="cannabis products background"
              priority
            />
          </div>
          <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
            <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary-foreground mb-4">
              Dodi Deals at {selectedStore.name}
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
              Your premium destination for the finest selection of vapes, THCa, edibles, and accessories. 
              Order online for convenient in-store pickup!
            </p>
            <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg transition-shadow">
              <Link href="/products">
                Shop All Products <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      )}

      {/* Deals Section - Conditionally Rendered */}
      {!loadingProducts && deals.length > 0 && (
        <section>
          <h2 className="text-3xl font-bold font-headline text-center mb-2 text-primary">Today's Hottest Deals at {selectedStore.name}</h2>
          <p className="text-center text-muted-foreground mb-8">Don't miss out on these limited-time offers!</p>
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
        </section>
      )}

      {/* Featured Products Section */}
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

      {/* Category Spotlights Section - Only if store is selected */}
      {selectedStore && (
        <section>
          <h2 className="text-3xl font-bold font-headline text-center mb-8 text-primary">Explore Our Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"> {/* Changed to 3 columns for medium for better fit */}
            {categorySpotlights.map((category) => (
              <Link href={category.href} key={category.name} passHref>
                <Card className={cn(
                  "group hover:shadow-xl transition-all duration-300 cursor-pointer text-center p-4 h-full flex flex-col items-center justify-center",
                  category.isSpecial 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary hover:border-primary/90" 
                    : "bg-card text-card-foreground hover:border-accent"
                )}>
                  <CardHeader className="p-2">
                    <category.icon className={cn(
                      "h-12 w-12 group-hover:text-accent transition-colors mx-auto mb-2",
                      category.isSpecial 
                        ? "text-primary-foreground group-hover:text-primary-foreground/80" 
                        : "text-primary group-hover:text-accent"
                    )} />
                    <CardTitle className={cn(
                      "text-lg font-semibold group-hover:text-accent transition-colors",
                      category.isSpecial 
                        ? "text-primary-foreground group-hover:text-primary-foreground/90" 
                        : "text-foreground group-hover:text-accent"
                    )}>
                      {category.name}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

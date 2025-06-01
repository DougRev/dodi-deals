import { dailyDeals } from '@/data/deals';
import { initialProducts } from '@/data/products';
import { DealCard } from '@/components/site/DealCard';
import { ProductCard } from '@/components/site/ProductCard';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  const featuredProducts = initialProducts.slice(0, 3); // Show first 3 products as featured

  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-4xl font-bold font-headline text-center mb-2 text-primary">Today's Hottest Deals</h1>
        <p className="text-center text-muted-foreground mb-8">Don't miss out on these limited-time offers!</p>
        {dailyDeals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {dailyDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        ) : (
          <p className="text-center text-lg text-muted-foreground">No active deals right now. Check back soon!</p>
        )}
      </section>

      <section>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold font-headline text-primary">Featured Products</h2>
          <Button asChild variant="link" className="text-accent">
            <Link href="/products">
              View All Products <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
           <p className="text-center text-lg text-muted-foreground">No featured products available at the moment.</p>
        )}
      </section>

      <section className="text-center p-8 bg-muted/50 rounded-lg">
        <h2 className="text-3xl font-bold font-headline text-primary mb-4">Welcome to Dodi Deals!</h2>
        <p className="text-lg text-foreground mb-6 max-w-2xl mx-auto">
          Your premium destination in Indiana for the finest selection of vapes and THCa products. 
          Explore our daily deals and extensive product catalog. Order online for convenient in-store pickup.
        </p>
        <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/products">
            Shop All Products
          </Link>
        </Button>
      </section>
    </div>
  );
}

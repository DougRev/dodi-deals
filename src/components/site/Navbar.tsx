
"use client"; 

import Link from 'next/link';
import DodiLogo from '@/components/icons/DodiLogo';
import { AuthButton } from '@/components/site/AuthButton';
import { Button } from '@/components/ui/button';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'; 
import { ShoppingCart, MapPin, Edit, Award, Loader2 } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';

export function Navbar() {
  const { selectedStore, setStoreSelectorOpen, user, isAuthenticated, loadingStores, getTotalCartItems } = useAppContext();
  const { isMobile } = useSidebar(); 
  const totalItemsInCart = getTotalCartItems();

  const renderStoreButton = () => {
    if (loadingStores && !selectedStore) {
      return (
        <Button variant="outline" size="sm" disabled className="hidden md:flex items-center text-xs px-2 py-1 h-auto">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Loading...
        </Button>
      );
    }
    if (!selectedStore && !loadingStores) { 
      return (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setStoreSelectorOpen(true)} 
          className='hidden md:flex items-center text-xs px-2 py-1 h-auto border-accent text-accent hover:bg-accent/10'
        >
          <MapPin className="mr-1 h-3 w-3" />
          Select Store
        </Button>
      );
    }
     if (selectedStore) { 
        return (
        <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setStoreSelectorOpen(true)} 
            className='hidden md:flex items-center text-xs px-2 py-1 h-auto border-accent text-accent hover:bg-accent hover:text-accent-foreground'
        >
            <MapPin className="mr-1 h-3 w-3" />
            {selectedStore.name.replace('Dodi Deals - ', '')}
            <Edit className="ml-2 h-3 w-3" />
        </Button>
        );
    }
    return null; 
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center space-x-2 md:space-x-4">
          {isMobile && <SidebarTrigger />} 
          <Link href="/" className="flex items-center space-x-2">
            <DodiLogo />
          </Link>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          {renderStoreButton()}
          {isAuthenticated && user && (
             <div className="hidden md:flex items-center text-sm text-primary">
                <Award className="mr-1 h-4 w-4 text-yellow-500" /> Points: {user.points}
            </div>
          )}
          <Button asChild variant="ghost" size="icon" className="relative text-foreground hover:text-accent">
            <Link href="/cart" aria-label="Shopping Cart">
              <ShoppingCart className="h-5 w-5" />
              {totalItemsInCart > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {totalItemsInCart}
                </span>
              )}
            </Link>
          </Button>
          <AuthButton />
        </div>
      </div>
    </header>
  );
}

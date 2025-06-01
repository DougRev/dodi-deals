
"use client"; 

import Link from 'next/link';
import DodiLogo from '@/components/icons/DodiLogo';
import { AuthButton } from '@/components/site/AuthButton';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Zap, List, MapPin, Edit, ShieldCheck, Award, Loader2 } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';

export function Navbar() {
  const { selectedStore, setStoreSelectorOpen, user, isAuthenticated, loadingStores } = useAppContext();

  const renderStoreButton = (isMobile: boolean) => {
    if (loadingStores && !selectedStore) {
      // Optional: Show a small loader or specific placeholder for store loading
      return isMobile ? 
        <div className="flex items-center justify-center text-xs w-full mb-2 py-1 h-auto text-muted-foreground">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Loading Store...
        </div> 
        : 
        <Button variant="outline" size="sm" disabled className="hidden md:flex items-center text-xs px-2 py-1 h-auto">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Loading...
        </Button>;
    }
    if (!selectedStore) {
      // If loading is done but still no store, show a button to select one or nothing
      return (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setStoreSelectorOpen(true)} 
          className={`${isMobile ? 'flex items-center justify-center text-xs w-full mb-2 py-1 h-auto' : 'hidden md:flex items-center text-xs px-2 py-1 h-auto'} border-accent text-accent hover:bg-accent/10`}
        >
          <MapPin className="mr-1 h-3 w-3" />
          Select Store
        </Button>
      );
    }
    // If store is selected, show the store name and edit button
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setStoreSelectorOpen(true)} 
        className={`${isMobile ? 'flex items-center justify-center text-xs w-full mb-2 py-1 h-auto' : 'hidden md:flex items-center text-xs px-2 py-1 h-auto'} border-primary text-primary hover:bg-primary/10`}
      >
        <MapPin className="mr-1 h-3 w-3" />
        {isMobile ? selectedStore.name : selectedStore.name.replace('Dodi Deals - ', '')}
        <Edit className="ml-2 h-3 w-3" />
      </Button>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <DodiLogo />
          </Link>
          {renderStoreButton(false)} {/* Desktop store button */}
        </div>
        <nav className="hidden md:flex items-center space-x-4 text-sm font-medium">
          <Link
            href="/"
            className="transition-colors hover:text-accent flex items-center"
          >
            <Zap className="mr-1 h-4 w-4" /> Daily Deals
          </Link>
          <Link
            href="/products"
            className="transition-colors hover:text-accent flex items-center"
          >
            <List className="mr-1 h-4 w-4" /> Products
          </Link>
          {isAuthenticated && user?.isAdmin && (
            <Link
              href="/admin"
              className="transition-colors hover:text-accent text-accent font-semibold flex items-center"
            >
              <ShieldCheck className="mr-1 h-4 w-4" /> Admin Panel
            </Link>
          )}
           {isAuthenticated && user && (
             <div className="flex items-center text-sm text-primary">
                <Award className="mr-1 h-4 w-4 text-yellow-500" /> Points: {user.points}
            </div>
          )}
        </nav>
        <div className="flex items-center space-x-2">
          <Button asChild variant="ghost" size="icon" className="hidden md:inline-flex text-foreground hover:text-accent">
            <Link href="/cart" aria-label="Shopping Cart">
              <ShoppingCart className="h-5 w-5" />
            </Link>
          </Button>
          <AuthButton />
        </div>
      </div>
      
      <div className="md:hidden flex flex-col p-2 border-t border-border/40 bg-background/95">
        {renderStoreButton(true)} {/* Mobile store button */}
        <div className="flex justify-around mb-2">
            <Link href="/" className="flex flex-col items-center transition-colors hover:text-accent text-xs">
              <Zap className="h-5 w-5 mb-1" /> Deals
            </Link>
            <Link href="/products" className="flex flex-col items-center transition-colors hover:text-accent text-xs">
              <List className="h-5 w-5 mb-1" /> Products
            </Link>
            <Link href="/cart" className="flex flex-col items-center transition-colors hover:text-accent text-xs">
              <ShoppingCart className="h-5 w-5 mb-1" /> Cart
            </Link>
        </div>
        {isAuthenticated && user?.isAdmin && (
            <Link
              href="/admin"
              className="w-full text-center py-2 mb-2 text-xs font-semibold text-accent border border-accent rounded-md hover:bg-accent/10"
            >
              <ShieldCheck className="mr-1 inline-block h-4 w-4" /> Admin Panel
            </Link>
          )}
        {isAuthenticated && user && (
             <div className="text-center text-xs text-primary mb-2">
                <Award className="mr-1 inline-block h-4 w-4 text-yellow-500" /> Points: {user.points}
            </div>
          )}
      </div>
    </header>
  );
}

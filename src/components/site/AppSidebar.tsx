
"use client";

import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader, // This is for desktop sidebar structure from @/components/ui/sidebar
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar, 
} from '@/components/ui/sidebar';
import {
  SheetHeader as UiSheetHeader, // Aliased import for mobile sheet specific header
  SheetTitle as UiSheetTitle,   // Aliased import for mobile sheet specific title
} from '@/components/ui/sheet';
import DodiLogo from '@/components/icons/DodiLogo';
import { useAppContext } from '@/hooks/useAppContext';
import { Button } from '@/components/ui/button';
import { Home, List, ShoppingCart, UserCircle, ShieldCheck, LogOut, Settings, PanelLeft, PanelRight, CalendarDays, Briefcase } from 'lucide-react'; // Added Briefcase

export function AppSidebar() {
  const { isAuthenticated, user, logout, selectedStore, setStoreSelectorOpen } = useAppContext();
  const { toggleSidebar, state, isMobile } = useSidebar(); 

  const canManageStoreOrders = isAuthenticated && user?.assignedStoreId && (user.storeRole === 'Manager' || user.storeRole === 'Employee');

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarContent className="flex flex-col">
        {/* Mobile Sheet Header & Title for Accessibility */}
        {isMobile && (
          <UiSheetHeader className="p-4 border-b">
            <UiSheetTitle>
              <DodiLogo />
            </UiSheetTitle>
          </UiSheetHeader>
        )}

        {/* Desktop Sidebar Header */}
        {!isMobile && (
           <SidebarHeader className="p-2 h-14 flex items-center group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:justify-center">
            {state === 'expanded' ? (
              <div className="flex items-center justify-between w-full pl-1 pr-1">
                <Link href="/" className="flex items-center gap-2">
                  <DodiLogo />
                </Link>
                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-7 w-7 text-sidebar-foreground">
                  <PanelLeft /> 
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-7 w-7 text-sidebar-foreground group-data-[collapsible=icon]:mx-auto">
                <PanelRight /> 
              </Button>
            )}
          </SidebarHeader>
        )}

        <SidebarMenu className="flex-1 overflow-y-auto p-2">
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Home / Deals" className="w-full justify-start">
              <Link href="/">
                <Home />
                <span>Home & Deals</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Products" className="w-full justify-start">
              <Link href="/products">
                <List />
                <span>Products</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Store Deals Calendar" className="w-full justify-start">
              <Link href="/store-deals">
                <CalendarDays />
                <span>Store Deals</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Cart" className="w-full justify-start">
              <Link href="/cart">
                <ShoppingCart />
                <span>Cart</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {isAuthenticated && user && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Profile" className="w-full justify-start">
                <Link href="/profile">
                  <UserCircle />
                  <span>Profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          
          {canManageStoreOrders && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Manage Store Orders" className="w-full justify-start">
                <Link href="/manager/orders">
                  <Briefcase />
                  <span>Manage Orders</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {isAuthenticated && user?.isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Admin Panel" className="w-full justify-start">
                <Link href="/admin">
                  <ShieldCheck />
                  <span>Admin Panel</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>

        <SidebarFooter className="p-2 border-t">
          {selectedStore && (
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setStoreSelectorOpen(true)} 
                className="w-full justify-start text-xs group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:aspect-square group-data-[collapsible=icon]:p-0
                           border border-sidebar-foreground/50 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:border-sidebar-accent"
                title={`Current Store: ${selectedStore.name}`}
              >
              <Settings className="group-data-[collapsible=icon]:h-5 group-data-[collapsible=icon]:w-5" />
              <span className="truncate group-data-[collapsible=icon]:hidden ml-2">Store: {selectedStore.name.replace('Dodi Deals - ','')}</span>
            </Button>
          )}
          {isAuthenticated && (
            <SidebarMenuButton onClick={logout} tooltip="Log Out" className="w-full justify-start mt-2">
              <LogOut />
              <span>Log Out</span>
            </SidebarMenuButton>
          )}
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}

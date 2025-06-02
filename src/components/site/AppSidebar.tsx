
"use client";

import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar, 
} from '@/components/ui/sidebar';
import DodiLogo from '@/components/icons/DodiLogo';
import { useAppContext } from '@/hooks/useAppContext';
import { Button } from '@/components/ui/button';
import { Home, List, ShoppingCart, UserCircle, ShieldCheck, LogOut, Settings, PanelLeft, PanelRight } from 'lucide-react';

export function AppSidebar() {
  const { isAuthenticated, user, logout, selectedStore, setStoreSelectorOpen } = useAppContext();
  const { toggleSidebar, state, isMobile } = useSidebar(); 

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarContent className="flex flex-col">
        <SidebarHeader className="p-2 h-14 flex items-center group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:justify-center">
          {/* On mobile, this header content might be hidden if the sidebar is a sheet.
              The trigger to open the sheet itself is now missing from the Navbar.
              This setup is primarily for desktop icon-collapsible behavior. */}
          {!isMobile && state === 'expanded' ? (
            <div className="flex items-center justify-between w-full pl-1 pr-1">
              <Link href="/" className="flex items-center gap-2">
                <DodiLogo />
              </Link>
              <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-7 w-7 text-sidebar-foreground">
                <PanelLeft /> 
              </Button>
            </div>
          ) : !isMobile && state === 'collapsed' ? (
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-7 w-7 text-sidebar-foreground group-data-[collapsible=icon]:mx-auto">
              <PanelRight /> 
            </Button>
          ) : null /* On mobile, this internal header trigger isn't primary for opening the sheet */}
        </SidebarHeader>

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
                variant="outline" 
                size="sm" 
                onClick={() => setStoreSelectorOpen(true)} 
                className="w-full justify-start text-xs group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:aspect-square group-data-[collapsible=icon]:p-0"
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

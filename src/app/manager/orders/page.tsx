
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { getStoreOrdersByStatus, updateOrderStatus } from '@/lib/firestoreService';
import type { Order, OrderStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from '@/hooks/use-toast';
import { Loader2, Package, AlertTriangle, CheckCircle, Hourglass, ShoppingBasket, ListOrdered } from 'lucide-react';

// Updated status groupings
const ACTIVE_MANAGER_VIEW_STATUSES: OrderStatus[] = ["Pending Confirmation", "Preparing", "Ready for Pickup"];
const ARCHIVED_MANAGER_VIEW_STATUSES: OrderStatus[] = ["Completed", "Cancelled"];


function formatOrderTimestamp(isoDate: string) {
  return new Date(isoDate).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export default function ManagerOrdersPage() {
  const { user, selectedStore, loadingAuth } = useAppContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [viewingArchived, setViewingArchived] = useState(false); 

  const fetchOrders = useCallback(async (storeId: string, activeView: boolean) => {
    setLoadingOrders(true);
    try {
      const statusesToFetch = activeView ? ACTIVE_MANAGER_VIEW_STATUSES : ARCHIVED_MANAGER_VIEW_STATUSES;
      const fetchedOrders = await getStoreOrdersByStatus(storeId, statusesToFetch);
      setOrders(fetchedOrders);
    } catch (error: any) {
      console.error("Failed to fetch store orders:", error);
      toast({ title: "Error Fetching Orders", description: error.message || "Could not load orders.", variant: "destructive" });
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (!loadingAuth && user?.assignedStoreId && user.storeRole === 'Manager') {
      // Fetch active orders by default (when viewingArchived is false)
      fetchOrders(user.assignedStoreId, !viewingArchived);
    }
  }, [user, loadingAuth, fetchOrders, viewingArchived]);


  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      toast({ title: "Order Status Updated", description: `Order ${orderId.substring(0,6)}... moved to ${newStatus}.` });
      
      if (user?.assignedStoreId) {
        // Re-fetch orders for the current view (active or archived)
        fetchOrders(user.assignedStoreId, !viewingArchived);
      }
    } catch (error: any) {
      console.error("Failed to update order status:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update order status.", variant: "destructive" });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getNextStatusOptions = (currentStatus: OrderStatus): OrderStatus[] => {
    switch (currentStatus) {
      case "Pending Confirmation":
        return ["Preparing", "Cancelled"];
      case "Preparing":
        return ["Ready for Pickup", "Cancelled"];
      case "Ready for Pickup":
        // Manager can mark as completed (customer picked up) or cancel (e.g., no-show)
        return ["Completed", "Cancelled"]; 
      default:
        // Completed or Cancelled orders typically don't change status via manager UI in this flow
        return []; 
    }
  };

  const getStatusBadgeVariant = (status: OrderStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "Pending Confirmation": return "default"; 
      case "Preparing": return "secondary"; 
      case "Ready for Pickup": return "outline"; 
      case "Completed": return "default"; 
      case "Cancelled": return "destructive";
      default: return "secondary";
    }
  };
  
  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case "Pending Confirmation": return <Hourglass className="h-4 w-4 text-yellow-600" />;
      case "Preparing": return <ShoppingBasket className="h-4 w-4 text-blue-600" />;
      case "Ready for Pickup": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Completed": return <Package className="h-4 w-4 text-gray-500" />;
      case "Cancelled": return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <ListOrdered className="h-4 w-4 text-muted-foreground"/>;
    }
  };


  if (loadingAuth || (!user?.assignedStoreId && !loadingAuth)) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold font-headline text-primary">
                {viewingArchived ? "Archived Orders" : "Active Orders"} for {selectedStore?.name || "Your Store"}
            </h2>
            <Button 
                variant="outline" 
                onClick={() => setViewingArchived(!viewingArchived)}
                disabled={loadingOrders}
            >
                {loadingOrders && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {viewingArchived ? "View Active Orders" : "View Archived Orders"}
            </Button>
        </div>

      {loadingOrders ? (
        <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
      ) : orders.length === 0 ? (
        <Card className="text-center py-12 shadow-md">
          <CardContent>
            <Package className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">No {viewingArchived ? "archived" : "active"} orders found for your store at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {orders.map((order) => (
            <AccordionItem value={order.id} key={order.id} className="border border-border bg-card rounded-lg shadow-md">
              <AccordionTrigger className="p-4 hover:bg-muted/30 rounded-t-lg text-left">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-2">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Order ID: {order.id.substring(0, 8)}...</p>
                    <p className="text-sm font-medium text-foreground">Customer: {order.userName} ({order.userEmail})</p>
                    <p className="text-xs text-muted-foreground">Placed: {formatOrderTimestamp(order.orderDate)}</p>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-1">
                     <Badge variant={getStatusBadgeVariant(order.status)} className="text-xs flex items-center gap-1">
                        {getStatusIcon(order.status)} {order.status}
                     </Badge>
                    <p className="text-lg font-bold text-primary">${order.finalTotal.toFixed(2)}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 border-t border-border bg-background rounded-b-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-md font-semibold mb-2 text-primary">Items ({order.items.length})</h4>
                    <ul className="space-y-1 text-sm max-h-40 overflow-y-auto">
                      {order.items.map((item, index) => (
                        <li key={`${order.id}-item-${index}`} className="flex justify-between p-1.5 bg-muted/50 rounded">
                          <span>{item.productName} (x{item.quantity})</span>
                          <span>${(item.pricePerItem * item.quantity).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                     <div className="mt-2 text-xs text-muted-foreground">
                        Subtotal: ${order.subtotal.toFixed(2)}
                        {order.discountApplied && order.discountApplied > 0 && (
                            <span> | Discount: -${order.discountApplied.toFixed(2)} ({order.pointsRedeemed} pts)</span>
                        )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-md font-semibold mb-2 text-primary">Actions</h4>
                    {updatingOrderId === order.id ? (
                      <div className="flex items-center justify-center h-10">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : getNextStatusOptions(order.status).length > 0 ? (
                        <div className="flex flex-col sm:flex-row gap-2">
                        {getNextStatusOptions(order.status).map(nextStatus => (
                            <Button
                            key={nextStatus}
                            size="sm"
                            variant={nextStatus === "Cancelled" ? "destructive" : "default"}
                            onClick={() => handleStatusChange(order.id, nextStatus)}
                            className="flex-1"
                            >
                            {nextStatus === "Preparing" ? "Accept & Prepare" : 
                             nextStatus === "Ready for Pickup" ? "Mark Ready" : 
                             nextStatus === "Completed" ? "Mark Completed" : 
                             nextStatus === "Cancelled" ? "Cancel Order" : 
                             `Set to ${nextStatus}`}
                            </Button>
                        ))}
                        </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No further actions available for this order status.</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-3">
                        Pickup Instructions: {order.pickupInstructions}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
       <div className="text-center mt-6">
            <Button variant="outline" onClick={() => user?.assignedStoreId && fetchOrders(user.assignedStoreId, !viewingArchived)} disabled={loadingOrders}>
                {loadingOrders ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Refresh Orders
            </Button>
        </div>
    </div>
  );
}


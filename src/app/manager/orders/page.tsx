
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { getStoreOrdersByStatus, updateOrderStatus } from '@/lib/firestoreService';
import type { Order, OrderStatus, CancellationReason } from '@/lib/types';
import { cancellationReasons } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from '@/hooks/use-toast';
import { Loader2, Package, AlertTriangle, CheckCircle, Hourglass, ShoppingBasket, ListOrdered, UserX, FileText, Edit2, RotateCcw } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app as firebaseApp } from '@/lib/firebase';


// Updated status groupings
const ACTIVE_MANAGER_VIEW_STATUSES: OrderStatus[] = ["Pending Confirmation", "Preparing", "Ready for Pickup"];
const ARCHIVED_MANAGER_VIEW_STATUSES: OrderStatus[] = ["Completed", "Cancelled", "Refunded"];


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

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [orderToCancelDetails, setOrderToCancelDetails] = useState<{ orderId: string; currentStatus: OrderStatus; userName: string } | null>(null);
  const [selectedCancelReason, setSelectedCancelReason] = useState<CancellationReason | ''>('');
  const [cancelDescription, setCancelDescription] = useState('');
  
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [orderToRefund, setOrderToRefund] = useState<Order | null>(null);


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
    const canManage = user?.assignedStoreId && (user.storeRole === 'Manager' || user.storeRole === 'Employee');
    if (!loadingAuth && canManage) {
      fetchOrders(user.assignedStoreId!, !viewingArchived);
    } else if (!loadingAuth && (!user?.assignedStoreId || !(user.storeRole === 'Manager' || user.storeRole === 'Employee'))) {
      setLoadingOrders(false);
      setOrders([]);
    }
  }, [user, loadingAuth, fetchOrders, viewingArchived]);


  const handleStatusChange = async (orderId: string, newStatus: OrderStatus, reason?: CancellationReason, description?: string) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus, reason, description);
      toast({ title: "Order Status Updated", description: `Order ${orderId.substring(0,6)}... moved to ${newStatus}.` });
      
      if (user?.assignedStoreId) {
        fetchOrders(user.assignedStoreId, !viewingArchived);
      }
    } catch (error: any) {
      console.error("Failed to update order status:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update order status.", variant: "destructive" });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const openCancelDialog = (order: Order) => {
    setOrderToCancelDetails({ orderId: order.id, currentStatus: order.status, userName: order.userName });
    setSelectedCancelReason('');
    setCancelDescription('');
    setIsCancelDialogOpen(true);
  };

  const handleConfirmCancellation = async () => {
    if (!orderToCancelDetails || !selectedCancelReason) {
      toast({ title: "Invalid Input", description: "Please select a reason for cancellation.", variant: "destructive"});
      return;
    }
    setIsCancelDialogOpen(false);
    await handleStatusChange(orderToCancelDetails.orderId, "Cancelled", selectedCancelReason, cancelDescription);
    setOrderToCancelDetails(null);
  };

  const openRefundDialog = (order: Order) => {
    setOrderToRefund(order);
    setIsRefundDialogOpen(true);
  };
  
  const handleConfirmRefund = async () => {
    if (!orderToRefund) return;
    setUpdatingOrderId(orderToRefund.id);
    setIsRefundDialogOpen(false);

    try {
      const functions = getFunctions(firebaseApp, "us-central1");
      const createRefundFunction = httpsCallable(functions, 'createStripeRefund');
      await createRefundFunction({ orderId: orderToRefund.id });
      
      toast({ title: "Refund Processed", description: `Order ${orderToRefund.id.substring(0,6)}... has been successfully refunded.` });
      
      if (user?.assignedStoreId) {
        fetchOrders(user.assignedStoreId, !viewingArchived);
      }
    } catch (error: any) {
        console.error("Failed to process refund:", error);
        toast({ title: "Refund Failed", description: error.message || "Could not process the refund.", variant: "destructive" });
    } finally {
        setUpdatingOrderId(null);
        setOrderToRefund(null);
    }
  };


  const getNextStatusOptions = (currentStatus: OrderStatus): OrderStatus[] => {
    switch (currentStatus) {
      case "Pending Confirmation":
        return ["Preparing"]; // "Cancelled" handled by dedicated dialog
      case "Preparing":
        return ["Ready for Pickup"]; // "Cancelled" handled by dedicated dialog
      case "Ready for Pickup":
        return ["Completed"]; // "Cancelled" handled by dedicated dialog
      default:
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
      case "Refunded": return "destructive";
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
      case "Refunded": return <RotateCcw className="h-4 w-4 text-red-600" />;
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
                     {order.userStrikesAtOrderTime !== undefined && order.userStrikesAtOrderTime > 0 && (
                      <Badge variant="destructive" className="mt-1 text-xs">
                        <UserX className="mr-1 h-3 w-3" />
                        {order.userStrikesAtOrderTime} Prior Strike(s)
                      </Badge>
                    )}
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
                          <span>{item.productName}{item.selectedWeight ? ` (${item.selectedWeight})` : ''} (x{item.quantity})</span>
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
                     {order.pointsEarned && order.pointsEarned > 0 && order.status === "Completed" && (
                        <p className="text-xs text-green-600">Points Earned: {order.pointsEarned}</p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-md font-semibold mb-2 text-primary">Actions</h4>
                    {updatingOrderId === order.id ? (
                      <div className="flex items-center justify-center h-10">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        {getNextStatusOptions(order.status).map(nextStatus => (
                            <Button
                            key={nextStatus}
                            size="sm"
                            variant="default"
                            onClick={() => handleStatusChange(order.id, nextStatus)}
                            className="flex-1"
                            >
                            {nextStatus === "Preparing" ? "Accept & Prepare" :
                             nextStatus === "Ready for Pickup" ? "Mark Ready" :
                             nextStatus === "Completed" ? "Mark Completed" :
                             `Set to ${nextStatus}`}
                            </Button>
                        ))}
                        {(order.status !== "Completed" && order.status !== "Cancelled" && order.status !== "Refunded") && (
                          <Button size="sm" variant="destructive" onClick={() => openCancelDialog(order)} className="flex-1">
                            Cancel Order
                          </Button>
                        )}
                         {order.status === "Completed" && order.stripePaymentIntentId && (
                          <Button size="sm" variant="destructive" onClick={() => openRefundDialog(order)} className="flex-1">
                            <RotateCcw className="mr-2 h-4 w-4" /> Refund Order
                          </Button>
                        )}
                      </div>
                    )}
                     {(order.status === "Completed" && !order.stripePaymentIntentId || order.status === "Cancelled" || order.status === "Refunded") && (
                         <p className="text-sm text-muted-foreground italic mt-2">No further actions available for this order status.</p>
                     )}
                    <p className="text-xs text-muted-foreground mt-3">
                        Pickup Instructions: {order.pickupInstructions}
                    </p>
                    {order.status === "Cancelled" && order.cancellationReason && (
                      <div className="mt-3 p-2 bg-destructive/10 rounded-md">
                        <p className="text-xs font-semibold text-destructive flex items-center">
                            <FileText className="mr-1 h-3 w-3"/> Cancellation Reason: {order.cancellationReason}
                        </p>
                        {order.cancellationDescription && (
                            <p className="text-xs text-destructive/80 mt-0.5">Note: {order.cancellationDescription}</p>
                        )}
                      </div>
                    )}
                    {order.status === "Refunded" && (
                       <div className="mt-3 p-2 bg-destructive/10 rounded-md">
                         <p className="text-xs font-semibold text-destructive flex items-center">
                            <RotateCcw className="mr-1 h-3 w-3"/> Order Refunded
                         </p>
                         {order.refundedAt && <p className="text-xs text-destructive/80 mt-0.5">On: {formatOrderTimestamp(order.refundedAt)}</p>}
                         {order.refundId && <p className="text-xs text-destructive/80 mt-0.5">Stripe Refund ID: {order.refundId}</p>}
                       </div>
                    )}
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

        <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Order: {orderToCancelDetails?.orderId.substring(0,8)}... for {orderToCancelDetails?.userName}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Select a reason for cancelling this order. If "Customer No-Show" is selected, a strike will be applied to the user's account.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-2">
                    <div>
                        <Label htmlFor="cancel-reason">Cancellation Reason</Label>
                        <Select
                            value={selectedCancelReason}
                            onValueChange={(value) => setSelectedCancelReason(value as CancellationReason)}
                        >
                            <SelectTrigger id="cancel-reason">
                                <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent>
                                {cancellationReasons.map(reason => (
                                    <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="cancel-description">Description (Optional)</Label>
                        <Textarea
                            id="cancel-description"
                            placeholder="Provide additional details about the cancellation..."
                            value={cancelDescription}
                            onChange={(e) => setCancelDescription(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setOrderToCancelDetails(null)}>Back</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirmCancellation}
                        disabled={!selectedCancelReason || updatingOrderId === orderToCancelDetails?.orderId}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                        {updatingOrderId === orderToCancelDetails?.orderId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Confirm Cancellation
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Refund Order: {orderToRefund?.id.substring(0,8)}...?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will issue a full refund of ${orderToRefund?.finalTotal.toFixed(2)} to the customer's original payment method via Stripe. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setOrderToRefund(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirmRefund}
                        disabled={updatingOrderId === orderToRefund?.id}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                        {updatingOrderId === orderToRefund?.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4"/>}
                        Confirm Full Refund
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}

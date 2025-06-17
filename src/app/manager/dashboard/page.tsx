
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { getStoreSalesReport } from '@/lib/firestoreService';
import type { StoreSalesReport, SalesReportDataItem } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, DollarSign, ShoppingBag, ListChecks, BarChart2, RefreshCw, TrendingUp, TrendingDown, PackageIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function ManagerDashboardPage() {
  const { user, selectedStore, loadingAuth } = useAppContext();
  const [reportData, setReportData] = useState<StoreSalesReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReportData = useCallback(async () => {
    if (!user || user.storeRole !== 'Manager' || !user.assignedStoreId) {
      setError("You must be a manager assigned to a store to view this dashboard.");
      setLoadingReport(false);
      return;
    }

    setLoadingReport(true);
    setError(null);
    try {
      console.log(`[ManagerDashboard] Fetching report for store ID: ${user.assignedStoreId}`);
      const data = await getStoreSalesReport(user.assignedStoreId);
      setReportData(data);
      console.log("[ManagerDashboard] Report data fetched successfully:", data);
    } catch (err: any) {
      console.error("[ManagerDashboard] Error fetching report data:", err);
      setError(err.message || "Failed to load sales report data.");
      toast({ title: "Error Loading Report", description: err.message || "Could not fetch sales data.", variant: "destructive" });
    } finally {
      setLoadingReport(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loadingAuth && user?.assignedStoreId && user.storeRole === 'Manager') {
      fetchReportData();
    } else if (!loadingAuth && (!user?.assignedStoreId || user?.storeRole !== 'Manager')) {
       setError("Access denied. This dashboard is for store managers.");
       setLoadingReport(false);
    }
  }, [loadingAuth, user, fetchReportData]);

  if (loadingAuth || loadingReport) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-lg mx-auto mt-10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2"/> Error Loading Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive-foreground">{error}</p>
          <Button onClick={fetchReportData} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!reportData) {
    return (
      <Card className="max-w-lg mx-auto mt-10 shadow-lg">
        <CardHeader>
          <CardTitle>No Data Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Sales report data could not be loaded or is not yet available for {selectedStore?.name || 'your store'}.</p>
           <Button onClick={fetchReportData} className="mt-4" variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh Data
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline text-primary">Store Performance Dashboard</h1>
            <p className="text-muted-foreground">Key metrics for {reportData.storeName}</p>
            <p className="text-xs text-muted-foreground">Report generated: {new Date(reportData.reportGeneratedAt).toLocaleString()}</p>
        </div>
        <Button onClick={fetchReportData} variant="outline" disabled={loadingReport}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loadingReport ? 'animate-spin' : ''}`} />
            Refresh Data
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(reportData.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">From {reportData.totalOrdersProcessed} completed orders</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items Sold</CardTitle>
            <ShoppingBag className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{reportData.totalItemsSold}</div>
            <p className="text-xs text-muted-foreground">Across all completed orders</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
            <ListChecks className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{reportData.totalOrdersProcessed}</div>
            <p className="text-xs text-muted-foreground">Successfully processed and completed</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center"><TrendingUp className="mr-2 h-5 w-5 text-accent" />Top Selling Products (by Revenue)</CardTitle>
            <CardDescription>Top 10 products generating the most revenue.</CardDescription>
          </CardHeader>
          <CardContent>
            {reportData.topSellingProducts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Rank</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.topSellingProducts.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{item.quantitySold}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.revenueGenerated)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">No product sales data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center"><PackageIcon className="mr-2 h-5 w-5 text-accent"/>Top Selling Categories (by Revenue)</CardTitle>
            <CardDescription>Top 5 categories generating the most revenue.</CardDescription>
          </CardHeader>
          <CardContent>
             {reportData.topSellingCategories.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Rank</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.topSellingCategories.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{item.quantitySold}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.revenueGenerated)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
                <p className="text-muted-foreground text-center py-4">No category sales data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Placeholder for future AI insights and charts */}
       <Card className="shadow-md opacity-50">
        <CardHeader>
            <CardTitle className="flex items-center"><BarChart2 className="mr-2 h-5 w-5 text-muted-foreground"/>Advanced Analytics</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground text-center py-8">
                Sales charts, trend analysis, and AI-powered restocking recommendations coming soon!
            </p>
        </CardContent>
       </Card>
    </div>
  );
}

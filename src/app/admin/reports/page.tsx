
"use client";

import { useEffect, useState, useCallback } from 'react';
import { getGlobalSalesReport } from '@/lib/firestoreService';
import type { GlobalSalesReport, SalesReportDataItem } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, DollarSign, ShoppingBag, ListChecks, BarChartBig, RefreshCw, TrendingUp, Building } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AdminReportsPage() {
  const [reportData, setReportData] = useState<GlobalSalesReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGlobalReportData = useCallback(async () => {
    setLoadingReport(true);
    setError(null);
    try {
      const data = await getGlobalSalesReport();
      setReportData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load global sales report data.");
      toast({ title: "Error Loading Global Report", description: err.message || "Could not fetch global sales data.", variant: "destructive" });
    } finally {
      setLoadingReport(false);
    }
  }, []);

  useEffect(() => {
    fetchGlobalReportData();
  }, [fetchGlobalReportData]);

  if (loadingReport) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading global sales report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-lg mx-auto mt-10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2"/> Error Loading Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive-foreground">{error}</p>
          <Button onClick={fetchGlobalReportData} className="mt-4">
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
          <CardTitle>No Global Data Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Global sales report data could not be loaded or is not yet available.</p>
           <Button onClick={fetchGlobalReportData} className="mt-4" variant="outline">
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
            <h1 className="text-3xl font-bold font-headline text-primary flex items-center">
              <BarChartBig className="mr-2 h-8 w-8"/> Global Sales Performance
            </h1>
            <p className="text-muted-foreground">Aggregated metrics across all stores.</p>
            <p className="text-xs text-muted-foreground">Report generated: {new Date(reportData.reportGeneratedAt).toLocaleString()}</p>
        </div>
        <Button onClick={fetchGlobalReportData} variant="outline" disabled={loadingReport}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loadingReport ? 'animate-spin' : ''}`} />
            Refresh Data
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Global Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(reportData.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">From {reportData.totalOrdersProcessed} completed orders globally</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items Sold Globally</CardTitle>
            <ShoppingBag className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{reportData.totalItemsSold}</div>
            <p className="text-xs text-muted-foreground">Across all completed orders</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Completed Orders</CardTitle>
            <ListChecks className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{reportData.totalOrdersProcessed}</div>
            <p className="text-xs text-muted-foreground">Successfully processed across all stores</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-md lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center"><Building className="mr-2 h-5 w-5 text-accent" />Top Performing Stores (by Revenue)</CardTitle>
            <CardDescription>Top 5 stores generating the most revenue.</CardDescription>
          </CardHeader>
          <CardContent>
            {reportData.topPerformingStores.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Rank</TableHead>
                    <TableHead>Store Name</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.topPerformingStores.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{item.ordersProcessed}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.revenueGenerated)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">No store sales data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center"><TrendingUp className="mr-2 h-5 w-5 text-accent" />Globally Top Selling Products (by Revenue)</CardTitle>
            <CardDescription>Top 10 products generating the most revenue across all stores.</CardDescription>
          </CardHeader>
          <CardContent>
            {reportData.globalTopSellingProducts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Rank</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.globalTopSellingProducts.map((item: SalesReportDataItem & { category?: string }, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.category || 'N/A'}</TableCell>
                      <TableCell className="text-right">{item.quantitySold}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.revenueGenerated)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">No global product sales data yet.</p>
            )}
          </CardContent>
        </Card>
        
      </div>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center"><TrendingUp className="mr-2 h-5 w-5 text-accent"/>Globally Top Selling Categories (by Revenue)</CardTitle>
          <CardDescription>Top 5 categories generating the most revenue across all stores.</CardDescription>
        </CardHeader>
        <CardContent>
           {reportData.globalTopSellingCategories.length > 0 ? (
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
                {reportData.globalTopSellingCategories.map((item, index) => (
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
              <p className="text-muted-foreground text-center py-4">No global category sales data yet.</p>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 text-center">
        <Button variant="outline" asChild>
          <Link href="/admin">Back to Admin Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

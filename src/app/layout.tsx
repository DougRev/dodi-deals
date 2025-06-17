
import type {Metadata} from 'next';
import './globals.css';
import { AppProvider } from '@/contexts/AppContext';
import { Navbar } from '@/components/site/Navbar';
import { Footer } from '@/components/site/Footer';
import { Toaster } from "@/components/ui/toaster";
import { StoreSelectorDialog } from '@/components/site/StoreSelectorDialog';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/site/AppSidebar';

export const metadata: Metadata = {
  title: 'Dodi Deals - Indiana\'s Choice for Vapes & THCa',
  applicationName: 'Dodi Deals', // Short name for PWA context
  description: 'Discover daily deals on vapes, THCa flower, edibles, and more at Dodi Deals. Order online for convenient in-store pickup across Indiana.',
  appleWebApp: {
    capable: true,
    title: 'Dodi Deals', // Title for "Add to Home Screen" on iOS
    statusBarStyle: 'default',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
        <link rel="icon" href="/images/dodi-deals-logo-icon.png" sizes="any" />
        <link rel="apple-touch-icon" href="/images/dodi-deals-mobile-icon.png" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <AppProvider>
          <SidebarProvider defaultOpen={true}>
            <AppSidebar />
            <SidebarInset className="flex flex-col flex-1">
              <StoreSelectorDialog />
              <Navbar />
              <main className="flex-grow container mx-auto px-4 py-8 md:px-6">
                {children}
              </main>
              <Footer />
            </SidebarInset>
            <Toaster />
          </SidebarProvider>
        </AppProvider>
      </body>
    </html>
  );
}


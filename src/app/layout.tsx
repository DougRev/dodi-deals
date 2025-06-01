
import type {Metadata} from 'next';
import './globals.css';
import { AppProvider } from '@/contexts/AppContext';
import { Navbar } from '@/components/site/Navbar';
import { Footer } from '@/components/site/Footer';
import { Toaster } from "@/components/ui/toaster";
import { StoreSelectorDialog } from '@/components/site/StoreSelectorDialog'; // Import the dialog

export const metadata: Metadata = {
  title: 'Dodi Deals',
  description: 'Your local source for vapes and THCa products in Indiana.',
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
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <AppProvider>
          <StoreSelectorDialog /> {/* Add the dialog here so it's available globally */}
          <Navbar />
          <main className="flex-grow container mx-auto px-4 py-8 md:px-6">
            {children}
          </main>
          <Footer />
          <Toaster />
        </AppProvider>
      </body>
    </html>
  );
}

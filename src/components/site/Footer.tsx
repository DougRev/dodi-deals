import type React from 'react';

export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t border-border/40 py-8 bg-muted/50">
      <div className="container mx-auto px-4 md:px-6 text-center text-sm text-muted-foreground">
        <p>&copy; {currentYear} Dodi Deals. All rights reserved.</p>
        <p className="mt-1">For in-store pickup and payment only. Products intended for adult use.</p>
        <p className="mt-1">Dodi Indiana</p>
      </div>
    </footer>
  );
}

import type React from 'react';

const DodiLogo = ({ className }: { className?: string }) => {
  return (
    <div className={`font-headline text-2xl font-bold text-primary ${className}`}>
      Dodi Deals
    </div>
  );
};

export default DodiLogo;

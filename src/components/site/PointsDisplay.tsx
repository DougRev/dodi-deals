"use client";

import { useAppContext } from '@/hooks/useAppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award } from 'lucide-react';

export function PointsDisplay() {
  const { user } = useAppContext();

  if (!user) {
    return null;
  }

  return (
    <Card id="points" className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Your Points</CardTitle>
        <Award className="h-6 w-6 text-accent" />
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold text-primary">{user.points}</div>
        <p className="text-xs text-muted-foreground mt-1">
          Redeem points for discounts in-store! (Feature coming soon)
        </p>
      </CardContent>
    </Card>
  );
}

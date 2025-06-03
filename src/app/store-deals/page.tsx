
"use client";

import { useAppContext } from '@/hooks/useAppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { daysOfWeek, type DayOfWeek, type CustomDealRule, type ProductCategory } from '@/lib/types';
import { MapPin, Loader2, CalendarDays, Tag, Percent, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StoreDealsPage() {
  const { selectedStore, setStoreSelectorOpen, loadingStores } = useAppContext();
  const [currentDay, setCurrentDay] = useState<DayOfWeek | null>(null);

  useEffect(() => {
    const todayIndex = new Date().getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6
    // Adjust to match daysOfWeek array: Monday = 0, ..., Sunday = 6
    const adjustedTodayIndex = todayIndex === 0 ? 6 : todayIndex - 1;
    setCurrentDay(daysOfWeek[adjustedTodayIndex]);
  }, []);


  if (loadingStores || (!selectedStore && !loadingStores)) {
    if (!selectedStore && !loadingStores) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-10 min-h-[60vh]">
          <Card className="p-8 shadow-xl max-w-md">
            <CardContent className="flex flex-col items-center">
              <MapPin className="h-16 w-16 text-primary mb-6" />
              <h1 className="text-2xl font-bold font-headline mb-4 text-primary">View Store Deals</h1>
              <p className="text-muted-foreground mb-6">
                Please select a store to see its weekly deal calendar.
              </p>
              <Button onClick={() => setStoreSelectorOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Select Store
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading store information...</p>
      </div>
    );
  }

  if (!currentDay) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Determining current day...</p>
      </div>
    );
  }

  const storeDealRules = selectedStore.dailyDeals || [];

  return (
    <div className="space-y-8">
      <header className="text-center">
        <CalendarDays className="h-16 w-16 mx-auto mb-4 text-primary" />
        <h1 className="text-4xl font-bold font-headline text-primary">Weekly Deal Calendar</h1>
        <p className="text-lg text-muted-foreground">
          Showing all scheduled deals for <span className="font-semibold text-accent">{selectedStore.name}</span>.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {daysOfWeek.map((day) => {
          const dealsForThisDay = storeDealRules.filter(rule => rule.selectedDays.includes(day));
          const isToday = day === currentDay;

          return (
            <Card 
              key={day} 
              className={cn(
                "flex flex-col shadow-lg hover:shadow-xl transition-shadow",
                isToday ? "border-2 border-primary ring-2 ring-primary/50 bg-primary/5" : "border-border"
              )}
            >
              <CardHeader className={cn("pb-3", isToday ? "bg-primary/10" : "")}>
                <CardTitle className={cn("text-2xl font-headline flex items-center", isToday ? "text-primary" : "text-foreground")}>
                  {day}
                  {isToday && <Sparkles className="ml-2 h-5 w-5 text-yellow-500 fill-yellow-400" />}
                </CardTitle>
                {isToday && <CardDescription className="text-primary font-semibold">Today's Deals!</CardDescription>}
              </CardHeader>
              <CardContent className="flex-grow space-y-3 pt-3">
                {dealsForThisDay.length > 0 ? (
                  dealsForThisDay.map((rule, index) => (
                    <div key={`${day}-${index}`} className="p-3 rounded-md bg-muted/50 border border-muted">
                      <div className="flex items-center text-lg font-semibold text-accent mb-1">
                        <Percent className="mr-2 h-5 w-5" /> {rule.discountPercentage}% OFF
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Tag className="mr-2 h-4 w-4" /> Category: {rule.category}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic text-center py-4">
                    No specific category deals scheduled for {day}.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
       <p className="text-center text-sm text-muted-foreground mt-8">
        Note: If multiple rules apply to the same category on the same day, the deal with the highest discount or the one listed first in the admin settings might take precedence for actual pricing. This page shows all scheduled rules.
      </p>
    </div>
  );
}

// Added useState and useEffect for currentDay initialization
import { useState, useEffect } from 'react';

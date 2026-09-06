'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Layers } from 'lucide-react';

interface WbsQuantityTrackerProps {
  wbsCode: string;
  wbsName: string;
  unit: string;
  budgetedQuantity: number;
  uncertifiedDailyQuantity: number;
  certifiedIpcQuantity: number;
  unitRateETB: number;
}

export function WbsQuantityTracker({
  wbsCode,
  wbsName,
  unit,
  budgetedQuantity,
  uncertifiedDailyQuantity,
  certifiedIpcQuantity,
  unitRateETB,
}: WbsQuantityTrackerProps) {
  const uncertifiedPercent = Math.min(
    100,
    Math.round(((uncertifiedDailyQuantity / (budgetedQuantity || 1)) * 100 * 10) / 10)
  );

  const certifiedPercent = Math.min(
    100,
    Math.round(((certifiedIpcQuantity / (budgetedQuantity || 1)) * 100 * 10) / 10)
  );

  const totalValue = budgetedQuantity * unitRateETB;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <CardTitle className="text-base font-semibold">
              [{wbsCode}] {wbsName}
            </CardTitle>
          </div>
          <Badge variant="outline">
            Target: {budgetedQuantity.toLocaleString()} {unit}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Uncertified Daily Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-1 font-medium text-blue-600">
              <AlertCircle className="w-3.5 h-3.5" />
              Uncertified Field Progress (Daily Reports)
            </span>
            <span className="font-semibold">
              {uncertifiedDailyQuantity.toLocaleString()} / {budgetedQuantity} {unit} (
              {uncertifiedPercent}%)
            </span>
          </div>
          <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${uncertifiedPercent}%` }}
            />
          </div>
        </div>

        {/* Certified IPC Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-1 font-medium text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Certified IPC Progress (Resident Engineer)
            </span>
            <span className="font-semibold text-emerald-600">
              {certifiedIpcQuantity.toLocaleString()} / {budgetedQuantity} {unit} (
              {certifiedPercent}%)
            </span>
          </div>
          <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${certifiedPercent}%` }}
            />
          </div>
        </div>

        <div className="pt-2 flex justify-between items-center text-xs text-muted-foreground border-t">
          <span>Unit Rate: ETB {unitRateETB.toLocaleString()}</span>
          <span className="font-mono font-semibold text-foreground">
            Total BOQ Value: ETB {totalValue.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

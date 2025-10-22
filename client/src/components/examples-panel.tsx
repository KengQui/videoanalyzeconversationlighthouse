import { useState, useEffect } from "react";
import { X, AlertCircle, CheckCircle, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ConversationExample } from "@shared/schema";

interface ExamplesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  example: ConversationExample | null;
  rowText?: string;
}

export function ExamplesPanel({ open, onOpenChange, example, rowText }: ExamplesPanelProps) {
  if (!example) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Conversation Design Examples</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Principle and Score */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{example.principle}</h3>
            {example.score && (
              <Badge variant="outline" className="text-sm">
                Score: {example.score}
              </Badge>
            )}
          </div>

          {/* Context */}
          {rowText && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Framework Item:</strong> {rowText}
              </p>
            </div>
          )}

          <Separator />

          {/* Bad Example */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <h4 className="font-semibold text-destructive">Bad Example</h4>
            </div>
            <Card className="p-4 border-destructive/20 bg-destructive/5">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {example.badExample}
              </pre>
            </Card>
          </div>

          {/* Why It's Bad */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-chart-4" />
              <h4 className="font-semibold">Why This Is Problematic</h4>
            </div>
            <Card className="p-4 border-chart-4/20 bg-chart-4/5">
              <p className="text-sm leading-relaxed">
                {example.whyItsBad}
              </p>
            </Card>
          </div>

          <Separator />

          {/* Good Example */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-chart-2" />
              <h4 className="font-semibold text-chart-2">Good Example</h4>
            </div>
            {example.goodExample ? (
              <Card className="p-4 border-chart-2/20 bg-chart-2/5">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {example.goodExample}
                </pre>
              </Card>
            ) : (
              <Card className="p-4 border-warning/20 bg-warning/5">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-warning mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-warning">
                      Need User Input
                    </p>
                    <p className="text-sm text-muted-foreground">
                      A good example for this principle needs to be provided. This will be added later based on specific context and requirements.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Additional Notes */}
          {example.additionalNotes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold">Additional Notes</h4>
                <Card className="p-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    {example.additionalNotes}
                  </p>
                </Card>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
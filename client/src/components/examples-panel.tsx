import { useState, useEffect } from "react";
import { X, AlertCircle, CheckCircle, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ConversationExample } from "@shared/schema";

interface ExamplesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examples: ConversationExample[];
  rowText?: string;
}

export function ExamplesPanel({ open, onOpenChange, examples, rowText }: ExamplesPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Reset to first example when examples change
  useEffect(() => {
    setCurrentIndex(0);
  }, [examples]);
  
  if (!examples || examples.length === 0) {
    return null;
  }
  
  const currentExample = examples[currentIndex];
  const hasMultiple = examples.length > 1;
  
  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : examples.length - 1));
  };
  
  const goToNext = () => {
    setCurrentIndex((prev) => (prev < examples.length - 1 ? prev + 1 : 0));
  };

  return (
    <div 
      className={cn(
        "h-full bg-background border-l flex flex-col transition-all duration-300 ease-in-out shrink-0",
        "w-full max-w-[600px] lg:w-[600px] xl:w-[700px]",
        open ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold">Conversation Design Examples</h2>
        <div className="flex items-center gap-2">
          {hasMultiple && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                data-testid="button-previous-example"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} of {examples.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                data-testid="button-next-example"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            data-testid="button-close-panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-6">
          {/* Principle and Score */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{currentExample.principle}</h3>
            <div className="flex items-center gap-2">
              {currentExample.score && (
                <Badge variant="outline" className="text-sm">
                  Score: {currentExample.score}
                </Badge>
              )}
              {currentExample.source && (
                <Badge variant="secondary" className="text-sm" data-testid="badge-source">
                  {currentExample.source}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Show other available examples from different sources */}
          {hasMultiple && (
            <div className="bg-section-sub p-3 rounded-lg">
              <p className="text-sm font-medium mb-2">Available Examples:</p>
              <div className="flex flex-wrap gap-2">
                {examples.map((ex, idx) => (
                  <Button
                    key={ex.id}
                    variant={idx === currentIndex ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentIndex(idx)}
                    className="text-xs"
                    data-testid={`button-example-${idx}`}
                  >
                    {ex.principle} 
                    {ex.source && ` (${ex.source.replace(" agent", "")})`}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Context */}
          {rowText && (
            <div className="bg-section-main p-3 rounded-lg">
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
            <Card className="p-4 border-destructive/20 bg-destructive/5 backdrop-blur-sm">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {currentExample.badExample}
              </pre>
            </Card>
          </div>

          {/* Why It's Bad */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-chart-4" />
              <h4 className="font-semibold">Why This Is Problematic</h4>
            </div>
            <Card className="p-4 border-chart-4/20 bg-chart-4/5 backdrop-blur-sm">
              <p className="text-sm leading-relaxed">
                {currentExample.whyItsBad}
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
            {currentExample.goodExample ? (
              <Card className="p-4 border-chart-2/20 bg-chart-2/5 backdrop-blur-sm">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {currentExample.goodExample}
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
          {currentExample.additionalNotes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold">Additional Notes</h4>
                <Card className="p-4 bg-section-sub backdrop-blur-sm">
                  <p className="text-sm text-muted-foreground">
                    {currentExample.additionalNotes}
                  </p>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
import { FileSpreadsheet, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

interface HeaderProps {
  onExport?: () => void;
  hasData?: boolean;
}

export function Header({ onExport, hasData = false }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Agent Eval Framework</h1>
        </div>

        <div className="flex items-center gap-2">
          {hasData && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

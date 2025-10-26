import { FileSpreadsheet, MessageSquare, Menu, FileText } from "lucide-react";
import { Link, useLocation } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChatMessage } from "@shared/schema";

interface HeaderProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  hasFrameworkData?: boolean;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
}

export function Header({
  messages,
  onSendMessage,
  isLoading = false,
  hasFrameworkData = false,
  chatOpen,
  setChatOpen,
}: HeaderProps) {
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card backdrop-blur supports-[backdrop-filter]:bg-card/95">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="button-menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link href="/" data-testid="link-agent-eval">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Agent Eval Framework
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/review" data-testid="link-review-conversation">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Review AI Conversation
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/agent-specs" data-testid="link-agent-specs">
                  <FileText className="h-4 w-4 mr-2" />
                  Agent Specifications
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <FileSpreadsheet className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">
            {location === "/" ? "Agent Eval Framework" : location === "/review" ? "Review AI Conversation" : "Agent Specifications"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={chatOpen ? "default" : "ghost"}
            size="icon"
            onClick={() => setChatOpen(!chatOpen)}
            data-testid="button-open-chat"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

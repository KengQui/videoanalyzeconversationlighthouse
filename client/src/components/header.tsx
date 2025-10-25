import { useState } from "react";
import { FileSpreadsheet, MessageSquare } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Chatbot } from "@/components/chatbot";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ChatMessage } from "@shared/schema";

interface HeaderProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  hasFrameworkData?: boolean;
}

export function Header({
  messages,
  onSendMessage,
  isLoading = false,
  hasFrameworkData = false,
}: HeaderProps) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card backdrop-blur supports-[backdrop-filter]:bg-card/95">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Agent Eval Framework</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setChatOpen(true)}
            data-testid="button-open-chat"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
          <ThemeToggle />
        </div>
      </div>

      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side="right" className="w-[450px] sm:max-w-[450px] p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>AI Assistant</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <Chatbot
              messages={messages}
              onSendMessage={onSendMessage}
              isLoading={isLoading}
              hasFrameworkData={hasFrameworkData}
              variant="sheet"
            />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

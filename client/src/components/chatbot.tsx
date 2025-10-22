import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Copy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage } from "@shared/schema";

interface ChatbotProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  hasFrameworkData?: boolean;
  variant?: "default" | "sheet";
}

export function Chatbot({
  messages,
  onSendMessage,
  isLoading = false,
  hasFrameworkData = false,
  variant = "default",
}: ChatbotProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to clipboard",
      description: "The message has been copied",
    });
  };

  const suggestedQuestions = [
    "What is this framework about?",
    "Explain the evaluation criteria",
    "How do I use this framework?",
  ];

  const content = (
    <>
      {/* Header - Only show for default variant */}
      {variant === "default" && (
        <div className="flex items-center gap-2 p-4 border-b">
          <Sparkles className="h-5 w-5 text-chart-4" />
          <h2 className="font-semibold">AI Assistant</h2>
          {hasFrameworkData && (
            <span className="ml-auto text-xs bg-chart-4/10 text-chart-4 px-2 py-1 rounded-full">
              Context: Framework loaded
            </span>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <Sparkles className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="font-semibold">Ask me anything</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {hasFrameworkData
                  ? "I can help you understand the framework content"
                  : "Framework data is loading..."}
              </p>
            </div>
            {hasFrameworkData && (
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <p className="text-xs text-muted-foreground text-center">
                  Try asking:
                </p>
                {suggestedQuestions.map((question, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => onSendMessage(question)}
                    disabled={isLoading}
                    className="text-left justify-start h-auto py-2"
                    data-testid={`button-suggested-${idx}`}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((message, idx) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
                data-testid={`message-${idx}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted border-l-4 border-chart-4"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs opacity-70">
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {message.role === "assistant" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-50 hover:opacity-100"
                        onClick={() => handleCopy(message.content)}
                        data-testid={`button-copy-${idx}`}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg p-3 bg-muted border-l-4 border-chart-4">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-chart-4 animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 rounded-full bg-chart-4 animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 rounded-full bg-chart-4 animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              hasFrameworkData
                ? "Ask about the framework..."
                : "Loading framework..."
            }
            disabled={!hasFrameworkData || isLoading}
            className="flex-1"
            data-testid="input-chat-message"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || !hasFrameworkData || isLoading}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </>
  );

  if (variant === "sheet") {
    return <div className="flex flex-col h-full">{content}</div>;
  }

  return <Card className="flex flex-col h-full">{content}</Card>;
}

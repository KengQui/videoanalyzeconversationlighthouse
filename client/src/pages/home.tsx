import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DataTable } from "@/components/data-table";
import { Header } from "@/components/header";
import { ExamplesPanel } from "@/components/examples-panel";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ExcelData, ChatMessage, ConversationExample } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const [selectedExample, setSelectedExample] = useState<ConversationExample | null>(null);
  const [examplesPanelOpen, setExamplesPanelOpen] = useState(false);
  const [selectedRowText, setSelectedRowText] = useState<string>("");

  // Fetch framework data
  const { data: frameworkData, isLoading: isLoadingFramework } = useQuery<ExcelData | null>({
    queryKey: ["/api/framework"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Fetch chat history
  const { data: chatHistoryResponse, isLoading: isLoadingChat } = useQuery<{ success: boolean; data: ChatMessage[] }>({
    queryKey: ["/api/chat/history"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Fetch examples data
  const { data: examplesResponse } = useQuery<{ success: boolean; data: { examples: ConversationExample[] } }>({
    queryKey: ["/api/examples"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  const messages = chatHistoryResponse?.data || [];
  const examples = examplesResponse?.data?.examples || [];

  // Create a set of principles that have examples available
  const examplesAvailable = useMemo(() => {
    const set = new Set<string>();
    examples.forEach(example => {
      // Add the principle itself
      set.add(example.principle.toLowerCase());
      // Also add variations that might appear in the framework data
      const variations = [
        example.principle.toLowerCase(),
        example.principle.toLowerCase().replace(/ /g, ''),
        example.principle.toLowerCase().replace(/-/g, ' ')
      ];
      variations.forEach(v => set.add(v));
    });
    return set;
  }, [examples]);

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat", {
        message,
        context: frameworkData,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history"] });
    },
    onError: (error) => {
      toast({
        title: "Chat Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (message: string) => {
    chatMutation.mutate(message);
  };

  const handleExampleClick = async (rowText: string) => {
    setSelectedRowText(rowText);
    
    // Try to find a matching example based on the row text
    const rowTextLower = rowText.toLowerCase();
    let matchedExample: ConversationExample | null = null;
    
    // Try to match based on principle names
    for (const example of examples) {
      const principleLower = example.principle.toLowerCase();
      if (rowTextLower.includes(principleLower) ||
          rowTextLower.includes(principleLower.replace(/ /g, '')) ||
          rowTextLower.includes(principleLower.replace(/-/g, ' '))) {
        matchedExample = example;
        break;
      }
    }
    
    // If we found a match, show it
    if (matchedExample) {
      setSelectedExample(matchedExample);
      setExamplesPanelOpen(true);
    } else {
      // Try to fetch by principle name extracted from row text
      try {
        // Extract potential principle names from the row text
        const words = rowText.split(/[\s,.-]+/).filter(w => w.length > 2);
        for (const word of words) {
          const response = await apiRequest("GET", `/api/examples/principle/${encodeURIComponent(word)}`);
          if (response?.data) {
            setSelectedExample(response.data);
            setExamplesPanelOpen(true);
            return;
          }
        }
        
        // If no match found, show a message
        toast({
          title: "No Example Found",
          description: "No conversation design example is available for this item yet.",
        });
      } catch (error) {
        console.error("Error fetching example:", error);
        toast({
          title: "Error",
          description: "Failed to load example. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={chatMutation.isPending || isLoadingChat}
        hasFrameworkData={!!frameworkData}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col gap-6 h-[calc(100vh-120px)]">
          {isLoadingFramework ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                <p className="text-sm text-muted-foreground mt-4">Loading framework data...</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 h-full overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Agent Evaluation Framework</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {frameworkData?.rows.length || 0} evaluation criteria across {Math.max(0, (frameworkData?.headers.length || 0) - 3) || 0} milestones
                  </p>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {frameworkData && (
                  <DataTable 
                    data={frameworkData} 
                    onExampleClick={handleExampleClick}
                    examplesAvailable={examplesAvailable}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Examples Panel */}
      <ExamplesPanel
        open={examplesPanelOpen}
        onOpenChange={setExamplesPanelOpen}
        example={selectedExample}
        rowText={selectedRowText}
      />
    </div>
  );
}

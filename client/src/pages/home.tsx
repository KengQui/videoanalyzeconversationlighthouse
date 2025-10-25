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
  const [selectedExamples, setSelectedExamples] = useState<ConversationExample[]>([]);
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
      // Add the principle itself and variations
      const principle = example.principle.toLowerCase();
      set.add(principle);
      
      // Extract the main principle word(s) for matching
      // This handles cases like "Context Awareness" -> ["context", "awareness"]
      const words = principle.split(/[\s-]+/);
      words.forEach(word => {
        if (word.length > 3) { // Only add meaningful words
          set.add(word);
        }
      });
      
      // Add common variations
      set.add(principle.replace(/ /g, ''));
      set.add(principle.replace(/-/g, ' '));
      set.add(principle.replace(/ & /g, ' '));
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
    
    // Find ALL matching examples based on the row text
    const rowTextLower = rowText.toLowerCase();
    const matchedExamples: ConversationExample[] = [];
    const exampleScores = new Map<string, number>();
    
    // Try to match based on principle names
    for (const example of examples) {
      const principleLower = example.principle.toLowerCase();
      let matchScore = 0;
      
      // Check for direct match first (highest priority)
      if (rowTextLower.includes(principleLower)) {
        matchScore = 1; // Perfect match
      } else {
        // Check if key words from the principle appear in the row text
        const principleWords = principleLower.split(/[\s&-]+/).filter(w => w.length > 3);
        let wordsMatched = 0;
        for (const word of principleWords) {
          if (rowTextLower.includes(word)) {
            wordsMatched++;
          }
        }
        
        // Calculate match score
        matchScore = principleWords.length > 0 ? wordsMatched / principleWords.length : 0;
      }
      
      // Accept partial matches (at least 50% of words match) or single important word matches
      if (matchScore >= 0.5) {
        exampleScores.set(example.id, matchScore);
        matchedExamples.push(example);
      }
    }
    
    // Special case: if row contains "context" or "define terms", also match with Clarity examples
    if (rowTextLower.includes("context") || rowTextLower.includes("define") || rowTextLower.includes("terms")) {
      // Find all Clarity examples that weren't already matched
      const clarityExamples = examples.filter(e => 
        e.principle.toLowerCase() === "clarity" && 
        !exampleScores.has(e.id)
      );
      matchedExamples.push(...clarityExamples);
    }
    
    // Sort by match score (best matches first) and then by source to group them
    matchedExamples.sort((a, b) => {
      const scoreA = exampleScores.get(a.id) || 0;
      const scoreB = exampleScores.get(b.id) || 0;
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Higher score first
      }
      // If scores are equal, group by source
      return (a.source || "").localeCompare(b.source || "");
    });
    
    // If we found matches, show them
    if (matchedExamples.length > 0) {
      setSelectedExamples(matchedExamples);
      setExamplesPanelOpen(true);
    } else {
      // No match found, show a message
      toast({
        title: "No Examples Found",
        description: "No conversation design examples are available for this item yet.",
      });
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
        examples={selectedExamples}
        rowText={selectedRowText}
      />
    </div>
  );
}

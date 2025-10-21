import { useQuery, useMutation } from "@tanstack/react-query";
import { DataTable } from "@/components/data-table";
import { Chatbot } from "@/components/chatbot";
import { Header } from "@/components/header";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ExcelData, ChatMessage } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();

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

  const messages = chatHistoryResponse?.data || [];

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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr_450px] gap-6 h-[calc(100vh-120px)]">
          {/* Left Panel - Content */}
          <div className="flex flex-col gap-6 overflow-hidden">
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
                      {frameworkData?.rows.length || 0} evaluation criteria across {frameworkData?.headers.length || 0} milestones
                    </p>
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  {frameworkData && <DataTable data={frameworkData} />}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Chatbot */}
          <div className="h-full">
            <Chatbot
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={chatMutation.isPending || isLoadingChat}
              hasFrameworkData={!!frameworkData}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

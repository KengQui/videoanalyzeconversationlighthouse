import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileUpload } from "@/components/file-upload";
import { DataTable } from "@/components/data-table";
import { Chatbot } from "@/components/chatbot";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ExcelData, ChatMessage } from "@shared/schema";

export default function Home() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      setUploadSuccess(true);

      // Invalidate framework data query to refetch
      await queryClient.invalidateQueries({ queryKey: ["/api/framework"] });

      toast({
        title: "Upload Successful",
        description: "Your framework content has been loaded",
      });

      setTimeout(() => {
        setIsUploading(false);
      }, 1000);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
      setIsUploading(false);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = (message: string) => {
    chatMutation.mutate(message);
  };

  const handleExport = async () => {
    if (!frameworkData) return;

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(frameworkData),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `framework_export_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "Your framework data has been exported",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const handleUploadNew = async () => {
    try {
      // Clear server-side data
      await apiRequest("DELETE", "/api/framework", {});
      await apiRequest("DELETE", "/api/chat/history", {});
      
      // Invalidate queries to refresh
      await queryClient.invalidateQueries({ queryKey: ["/api/framework"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/chat/history"] });
      
      setUploadSuccess(false);
      setUploadError(null);
    } catch (error) {
      console.error("Clear data error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onExport={handleExport} hasData={!!frameworkData} />

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
            ) : !frameworkData ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-full max-w-2xl">
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    isUploading={isUploading}
                    uploadProgress={uploadProgress}
                    uploadSuccess={uploadSuccess}
                    uploadError={uploadError}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 h-full overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">Framework Content</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {frameworkData.rows.length} rows, {frameworkData.headers.length} columns
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUploadNew}
                    data-testid="button-upload-new"
                  >
                    Upload New File
                  </Button>
                </div>
                <div className="flex-1 overflow-auto">
                  <DataTable data={frameworkData} />
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

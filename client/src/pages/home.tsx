import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { DataTable } from "@/components/data-table";
import { Chatbot } from "@/components/chatbot";
import { Header } from "@/components/header";
import type { ExcelData, ChatMessage } from "@shared/schema";

export default function Home() {
  const [frameworkData, setFrameworkData] = useState<ExcelData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);

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

      const result = await response.json();
      setFrameworkData(result.data);
      setUploadSuccess(true);

      setTimeout(() => {
        setIsUploading(false);
      }, 1000);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          context: frameworkData,
        }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const result = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.message,
        timestamp: result.timestamp,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
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
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onExport={handleExport} hasData={!!frameworkData} />

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr_450px] gap-6 h-[calc(100vh-120px)]">
          {/* Left Panel - Content */}
          <div className="flex flex-col gap-6 overflow-hidden">
            {!frameworkData ? (
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
                    onClick={() => {
                      setFrameworkData(null);
                      setMessages([]);
                      setUploadSuccess(false);
                    }}
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
              isLoading={isChatLoading}
              hasFrameworkData={!!frameworkData}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

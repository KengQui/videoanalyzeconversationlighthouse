import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  uploadSuccess?: boolean;
  uploadError?: string | null;
}

export function FileUpload({
  onFileSelect,
  isUploading = false,
  uploadProgress = 0,
  uploadSuccess = false,
  uploadError = null,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".csv"))) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  return (
    <Card
      className={`p-8 border-2 border-dashed transition-all ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover-elevate"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid="file-upload-zone"
    >
      <div className="flex flex-col items-center justify-center gap-4">
        {uploadSuccess ? (
          <>
            <CheckCircle2 className="h-12 w-12 text-chart-2" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Upload Successful!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your framework content has been loaded
              </p>
            </div>
          </>
        ) : uploadError ? (
          <>
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-destructive">Upload Failed</h3>
              <p className="text-sm text-muted-foreground mt-1">{uploadError}</p>
            </div>
            <Button onClick={() => window.location.reload()} data-testid="button-retry-upload">
              Try Again
            </Button>
          </>
        ) : isUploading ? (
          <>
            <FileSpreadsheet className="h-12 w-12 text-primary animate-pulse" />
            <div className="w-full max-w-xs">
              <p className="text-sm text-muted-foreground text-center mb-2">
                Uploading and processing...
              </p>
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center mt-1">
                {uploadProgress}%
              </p>
            </div>
          </>
        ) : (
          <>
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">
                Upload your framework spreadsheet
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Drag and drop or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Supports .xlsx and .csv files
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="file"
                id="file-input"
                className="hidden"
                accept=".xlsx,.csv"
                onChange={handleFileInput}
                data-testid="input-file"
              />
              <Button asChild data-testid="button-browse-files">
                <label htmlFor="file-input" className="cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Browse Files
                </label>
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

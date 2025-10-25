import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, CheckCircle2, AlertCircle, Star, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import type { VideoAnalysisResult, CriterionEvaluation } from "@shared/schema";

type AnalysisStage = "idle" | "uploading" | "compressing" | "analyzing" | "completed" | "error";

export default function ReviewConversation() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [milestone, setMilestone] = useState<string>("1");
  const [stage, setStage] = useState<AnalysisStage>("idle");
  const [results, setResults] = useState<VideoAnalysisResult | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async ({ file, milestone }: { file: File; milestone: number }) => {
      const formData = new FormData();
      formData.append("video", file);
      formData.append("milestone", milestone.toString());

      setStage("uploading");
      
      // Start a timer to move through stages (but the actual API call controls completion)
      const stageTimer = setTimeout(() => setStage("compressing"), 3000);
      const analyzeTimer = setTimeout(() => setStage("analyzing"), 10000);
      
      try {
        const response = await fetch("/api/video/analyze", {
          method: "POST",
          body: formData,
        });

        clearTimeout(stageTimer);
        clearTimeout(analyzeTimer);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to analyze video");
        }

        const data = await response.json();
        return data as VideoAnalysisResult;
      } catch (error) {
        clearTimeout(stageTimer);
        clearTimeout(analyzeTimer);
        throw error;
      }
    },
    onSuccess: (data) => {
      setStage("completed");
      setResults(data);
      toast({
        title: "Analysis Complete",
        description: `Evaluated ${data.evaluations.length} Conversation Design criteria.`,
      });
    },
    onError: (error: Error) => {
      setStage("error");
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("video/")) {
        toast({
          title: "Invalid File",
          description: "Please select a video file.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setStage("idle");
      setResults(null);
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a video file to analyze.",
        variant: "destructive",
      });
      return;
    }

    analyzeMutation.mutate({
      file: selectedFile,
      milestone: parseInt(milestone),
    });
  };

  const getProgressValue = () => {
    switch (stage) {
      case "uploading": return 25;
      case "compressing": return 50;
      case "analyzing": return 75;
      case "completed": return 100;
      default: return 0;
    }
  };

  const getStageText = () => {
    switch (stage) {
      case "uploading": return "Uploading video...";
      case "compressing": return "Compressing video to optimal size...";
      case "analyzing": return "Analyzing with AI (this may take a minute)...";
      case "completed": return "Analysis complete!";
      case "error": return "Analysis failed";
      default: return "";
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-600 dark:text-green-400";
    if (rating >= 3) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getRatingLabel = (rating: number) => {
    if (rating === 5) return "Excellent";
    if (rating === 4) return "Good";
    if (rating === 3) return "Adequate";
    if (rating === 2) return "Needs Improvement";
    return "Not Met";
  };

  const generateReport = () => {
    if (!results) return;

    const avgRating = (results.evaluations.reduce((sum, e) => sum + e.rating, 0) / results.evaluations.length).toFixed(1);
    const excellentCount = results.evaluations.filter(e => e.rating >= 4).length;
    const needsImprovementCount = results.evaluations.filter(e => e.rating < 3).length;
    
    // Generate formatted report
    const reportContent = `
AI CONVERSATION EVALUATION REPORT
================================================================================
Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
Milestone: ${results.milestone}
Video File: ${selectedFile?.name || 'N/A'}

EXECUTIVE SUMMARY
================================================================================
Total Criteria Evaluated: ${results.evaluations.length}
Average Rating: ${avgRating}/5.0
Excellent/Good Ratings (4-5): ${excellentCount} (${Math.round(excellentCount / results.evaluations.length * 100)}%)
Needs Improvement (1-2): ${needsImprovementCount} (${Math.round(needsImprovementCount / results.evaluations.length * 100)}%)

DETAILED EVALUATION
================================================================================

${results.evaluations.map((evaluation, index) => `
${index + 1}. ${evaluation.criterion}
${'='.repeat(80)}
Rating: ${evaluation.rating}/5 - ${getRatingLabel(evaluation.rating)}
${'★'.repeat(evaluation.rating)}${'☆'.repeat(5 - evaluation.rating)}

Feedback:
${evaluation.feedback}

`).join('\n')}

RECOMMENDATIONS
================================================================================
${needsImprovementCount > 0 ? `
Priority Areas for Improvement:
${results.evaluations
  .filter(e => e.rating < 3)
  .map((e, i) => `${i + 1}. ${e.criterion} (Rating: ${e.rating}/5)`)
  .join('\n')}
` : 'All criteria met expectations. Continue maintaining current quality standards.'}

${excellentCount > 0 ? `
Strengths to Maintain:
${results.evaluations
  .filter(e => e.rating >= 4)
  .slice(0, 5)
  .map((e, i) => `${i + 1}. ${e.criterion} (Rating: ${e.rating}/5)`)
  .join('\n')}
` : ''}

================================================================================
End of Report
`;

    // Create and download the file
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-evaluation-report-m${results.milestone}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Report Downloaded",
      description: "Your evaluation report has been saved.",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Review AI Conversation</h1>
        <p className="text-muted-foreground">
          Upload a video of an AI conversation to evaluate it against Conversation Design criteria.
        </p>
      </div>

      {/* Upload Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Video</CardTitle>
          <CardDescription>
            Select a video file and choose which milestone criteria to evaluate against (1-4).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* File Input */}
            <div className="space-y-2">
              <label htmlFor="video-upload" className="text-sm font-medium">
                Video File
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="video-upload"
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-video-file"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("video-upload")?.click()}
                  className="w-full"
                  data-testid="button-select-video"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {selectedFile ? selectedFile.name : "Choose Video"}
                </Button>
              </div>
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>

            {/* Milestone Selector */}
            <div className="space-y-2">
              <label htmlFor="milestone-select" className="text-sm font-medium">
                Milestone
              </label>
              <Select value={milestone} onValueChange={setMilestone}>
                <SelectTrigger id="milestone-select" data-testid="select-milestone">
                  <SelectValue placeholder="Select milestone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1" data-testid="option-milestone-1">Milestone 1 (Functional)</SelectItem>
                  <SelectItem value="2" data-testid="option-milestone-2">Milestone 2 (Improved)</SelectItem>
                  <SelectItem value="3" data-testid="option-milestone-3">Milestone 3 (Delightful)</SelectItem>
                  <SelectItem value="4" data-testid="option-milestone-4">Milestone 4 (Exceptional)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!selectedFile || analyzeMutation.isPending}
            className="w-full"
            data-testid="button-analyze-video"
          >
            {analyzeMutation.isPending ? "Analyzing..." : "Analyze Video"}
          </Button>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      {stage !== "idle" && stage !== "error" && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{getStageText()}</span>
                <span className="text-muted-foreground">{getProgressValue()}%</span>
              </div>
              <Progress value={getProgressValue()} data-testid="progress-analysis" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {stage === "error" && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium" data-testid="text-error">Analysis failed. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {results && stage === "completed" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              <h2 className="text-2xl font-bold">
                Evaluation Results - Milestone {results.milestone}
              </h2>
            </div>
            <Button onClick={generateReport} variant="outline" data-testid="button-download-report">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>

          <div className="grid gap-4">
            {results.evaluations.map((evaluation, index) => (
              <Card key={index} data-testid={`card-evaluation-${index}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">
                        {evaluation.criterion}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 ${getRatingColor(evaluation.rating)}`}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= evaluation.rating
                                  ? "fill-current"
                                  : "fill-none"
                              }`}
                              data-testid={`star-${index}-${star}`}
                            />
                          ))}
                        </div>
                        <span
                          className={`font-semibold ${getRatingColor(evaluation.rating)}`}
                          data-testid={`rating-${index}`}
                        >
                          {evaluation.rating}/5 - {getRatingLabel(evaluation.rating)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Feedback:</h4>
                    <p className="text-sm leading-relaxed" data-testid={`feedback-${index}`}>
                      {evaluation.feedback}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <p className="text-2xl font-bold" data-testid="text-total-criteria">
                    {results.evaluations.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Criteria Evaluated</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold" data-testid="text-average-rating">
                    {(results.evaluations.reduce((sum, e) => sum + e.rating, 0) / results.evaluations.length).toFixed(1)}
                  </p>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-excellent-count">
                    {results.evaluations.filter(e => e.rating >= 4).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Excellent/Good Ratings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

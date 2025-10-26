import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Eye, Upload, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AgentSpec } from "@shared/schema";

export default function AgentSpecs() {
  const { toast } = useToast();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedSpec, setSelectedSpec] = useState<AgentSpec | null>(null);
  const [uploadForm, setUploadForm] = useState({ name: "", file: null as File | null });
  const [editForm, setEditForm] = useState({ name: "", file: null as File | null });

  // Fetch all agent specs
  const { data: specsResponse, isLoading } = useQuery<{ success: boolean; data: AgentSpec[] }>({
    queryKey: ["/api/agent-specs"],
  });

  const specs = specsResponse?.data || [];

  // Create new agent spec
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; file: File }) => {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("specFile", data.file);

      const response = await fetch("/api/agent-specs", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create agent spec");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-specs"] });
      setUploadDialogOpen(false);
      setUploadForm({ name: "", file: null });
      toast({
        title: "Agent Spec Created",
        description: "The agent specification has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update agent spec
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name?: string; file?: File }) => {
      const formData = new FormData();
      if (data.name) formData.append("name", data.name);
      if (data.file) formData.append("specFile", data.file);

      const response = await fetch(`/api/agent-specs/${data.id}`, {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update agent spec");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-specs"] });
      setEditDialogOpen(false);
      setSelectedSpec(null);
      setEditForm({ name: "", file: null });
      toast({
        title: "Agent Spec Updated",
        description: "The agent specification has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete agent spec
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/agent-specs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-specs"] });
      toast({
        title: "Agent Spec Deleted",
        description: "The agent specification has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete agent spec",
        variant: "destructive",
      });
    },
  });

  const handleUpload = () => {
    if (!uploadForm.name || !uploadForm.file) {
      toast({
        title: "Missing Information",
        description: "Please provide both a name and a file",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({ name: uploadForm.name, file: uploadForm.file });
  };

  const handleEdit = (spec: AgentSpec) => {
    setSelectedSpec(spec);
    setEditForm({ name: spec.name, file: null });
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedSpec) return;

    if (!editForm.name && !editForm.file) {
      toast({
        title: "No Changes",
        description: "Please provide a new name or file to update",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({
      id: selectedSpec.id,
      name: editForm.name !== selectedSpec.name ? editForm.name : undefined,
      file: editForm.file || undefined,
    });
  };

  const handlePreview = (spec: AgentSpec) => {
    setSelectedSpec(spec);
    setPreviewDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Agent Specifications</h1>
          <p className="text-muted-foreground mt-1">
            Manage specification documents for domain-specific video analysis
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)} data-testid="button-upload-spec">
          <Plus className="h-4 w-4 mr-2" />
          Upload Spec
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Loading agent specs...
          </CardContent>
        </Card>
      ) : specs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Agent Specs Yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload your first agent specification to enable domain-specific analysis
            </p>
            <Button onClick={() => setUploadDialogOpen(true)} data-testid="button-upload-first-spec">
              <Plus className="h-4 w-4 mr-2" />
              Upload Your First Spec
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {specs.map((spec) => (
            <Card key={spec.id} className="hover-elevate">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{spec.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Uploaded {new Date(spec.uploadDate).toLocaleDateString()} at{" "}
                      {new Date(spec.uploadDate).toLocaleTimeString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePreview(spec)}
                      data-testid={`button-preview-spec-${spec.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(spec)}
                      data-testid={`button-edit-spec-${spec.id}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(spec.id)}
                      data-testid={`button-delete-spec-${spec.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Agent Specification</DialogTitle>
            <DialogDescription>
              Upload a specification document for an agent. This will enable domain-specific evaluation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="spec-name">Agent Name</Label>
              <Input
                id="spec-name"
                placeholder="e.g., Pay Period Profile"
                value={uploadForm.name}
                onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                data-testid="input-spec-name"
              />
            </div>
            <div>
              <Label htmlFor="spec-file">Specification Document</Label>
              <Input
                id="spec-file"
                type="file"
                accept=".txt,.doc,.docx,.pdf"
                onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                data-testid="input-spec-file"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supported formats: .txt, .doc, .docx, .pdf
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={createMutation.isPending} data-testid="button-submit-upload">
              {createMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Agent Specification</DialogTitle>
            <DialogDescription>
              Update the name or replace the specification document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-spec-name">Agent Name</Label>
              <Input
                id="edit-spec-name"
                placeholder="e.g., Pay Period Profile"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                data-testid="input-edit-spec-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-spec-file">Replace Specification Document (Optional)</Label>
              <Input
                id="edit-spec-file"
                type="file"
                accept=".txt,.doc,.docx,.pdf"
                onChange={(e) => setEditForm({ ...editForm, file: e.target.files?.[0] || null })}
                data-testid="input-edit-spec-file"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to keep the current document
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} data-testid="button-submit-update">
              {updateMutation.isPending ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedSpec?.name}</DialogTitle>
            <DialogDescription>
              Specification document preview
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            <Textarea
              value={selectedSpec?.specContent || ""}
              readOnly
              className="min-h-[400px] font-mono text-sm"
              data-testid="textarea-spec-preview"
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

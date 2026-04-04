"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ContractDraft, GeneratedBy } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  FileSignature,
  Loader2,
  Check,
  Copy,
  Download,
  Pencil,
  X,
  Clock,
  CheckCircle2,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";

interface ContractsTabProps {
  voyageId: string;
}

export function ContractsTab({ voyageId }: ContractsTabProps) {
  const queryClient = useQueryClient();
  const [selectedDraft, setSelectedDraft] = useState<ContractDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  const { data: drafts = [], isLoading } = useQuery<ContractDraft[]>({
    queryKey: ["contracts", voyageId],
    queryFn: () => api.get(`/voyages/${voyageId}/contracts`),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      api.post<ContractDraft>(`/voyages/${voyageId}/contracts/generate`),
    onSuccess: (draft) => {
      queryClient.invalidateQueries({ queryKey: ["contracts", voyageId] });
      setSelectedDraft(draft);
      toast.success("Contract draft generated");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to generate contract");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (content: string) =>
      api.patch<ContractDraft>(
        `/voyages/${voyageId}/contracts/${selectedDraft?.id}`,
        { content },
      ),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["contracts", voyageId] });
      setSelectedDraft(updated);
      setEditing(false);
      toast.success("Contract updated");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update contract");
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: (draftId: string) =>
      api.post<ContractDraft>(
        `/voyages/${voyageId}/contracts/${draftId}/finalize`,
      ),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["contracts", voyageId] });
      setSelectedDraft(updated);
      toast.success("Contract finalized");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to finalize contract");
    },
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleStartEdit = () => {
    if (!selectedDraft || selectedDraft.isFinalized) return;
    setEditContent(selectedDraft.content);
    setEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    updateMutation.mutate(editContent);
  };

  const handleCopy = async () => {
    if (!selectedDraft) return;
    try {
      await navigator.clipboard.writeText(selectedDraft.content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleExport = () => {
    if (!selectedDraft) return;
    const blob = new Blob([selectedDraft.content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedDraft.title || "contract"}-v${selectedDraft.version}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatedByLabel = (g: GeneratedBy) => {
    switch (g) {
      case GeneratedBy.AI:
        return "AI Generated";
      case GeneratedBy.MANUAL:
        return "Manual";
      case GeneratedBy.TEMPLATE:
        return "Template";
      default:
        return g;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left: Drafts list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Contract Drafts
          </h3>
          <Button
            size="sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate Contract
          </Button>
        </div>

        {drafts.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <FileSignature className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No contract drafts</p>
            <p className="text-xs text-muted-foreground mt-1">
              Generate a contract from confirmed terms
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {drafts.map((draft) => (
              <Card
                key={draft.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-accent/40 ${
                  selectedDraft?.id === draft.id
                    ? "ring-2 ring-primary bg-accent/20"
                    : ""
                }`}
                onClick={() => {
                  setSelectedDraft(draft);
                  setEditing(false);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileSignature className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {draft.title || `Draft v${draft.version}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge
                        variant="outline"
                        className={
                          draft.isFinalized
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }
                      >
                        {draft.isFinalized ? (
                          <>
                            <Lock className="mr-1 h-3 w-3" />
                            Finalized
                          </>
                        ) : (
                          "Draft"
                        )}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {generatedByLabel(draft.generatedBy)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(draft.createdAt)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Right: Contract content viewer */}
      <div className="lg:col-span-2">
        {!selectedDraft ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <FileSignature className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Select a contract draft to view its content
            </p>
          </Card>
        ) : (
          <Card className="flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">
                  {selectedDraft.title || `Draft v${selectedDraft.version}`}
                </h3>
                {selectedDraft.isFinalized && (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Finalized
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!editing && (
                  <>
                    <Button variant="ghost" size="sm" onClick={handleCopy}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleExport}>
                      <Download className="h-4 w-4" />
                    </Button>
                    {!selectedDraft.isFinalized && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleStartEdit}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            finalizeMutation.mutate(selectedDraft.id)
                          }
                          disabled={finalizeMutation.isPending}
                        >
                          {finalizeMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Lock className="mr-2 h-4 w-4" />
                          )}
                          Finalize
                        </Button>
                      </>
                    )}
                  </>
                )}
                {editing && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(false)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      Save
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Content */}
            {editing ? (
              <div className="p-4">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={20}
                  className="font-mono text-sm"
                  placeholder="Contract content..."
                />
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div
                  className="prose prose-sm max-w-none p-6"
                  dangerouslySetInnerHTML={{
                    __html: selectedDraft.content,
                  }}
                />
              </ScrollArea>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

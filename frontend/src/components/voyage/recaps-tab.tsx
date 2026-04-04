"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Recap, GeneratedBy } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  FileText,
  Loader2,
  Check,
  Copy,
  Download,
  Pencil,
  X,
  ScrollText,
  Clock,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

interface RecapsTabProps {
  voyageId: string;
}

export function RecapsTab({ voyageId }: RecapsTabProps) {
  const queryClient = useQueryClient();
  const [selectedRecap, setSelectedRecap] = useState<Recap | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  const { data: recaps = [], isLoading } = useQuery<Recap[]>({
    queryKey: ["recaps", voyageId],
    queryFn: () => api.get(`/voyages/${voyageId}/recaps`),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      api.post<Recap>(`/voyages/${voyageId}/recaps/generate`),
    onSuccess: (recap) => {
      queryClient.invalidateQueries({ queryKey: ["recaps", voyageId] });
      setSelectedRecap(recap);
      toast.success("Recap generated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to generate recap");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (content: string) =>
      api.patch<Recap>(`/voyages/${voyageId}/recaps/${selectedRecap?.id}`, {
        content,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["recaps", voyageId] });
      setSelectedRecap(updated);
      setEditing(false);
      toast.success("Recap updated");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update recap");
    },
  });

  const approveMutation = useMutation({
    mutationFn: (recapId: string) =>
      api.post<Recap>(`/voyages/${voyageId}/recaps/${recapId}/approve`),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["recaps", voyageId] });
      setSelectedRecap(updated);
      toast.success("Recap approved");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to approve recap");
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
    if (!selectedRecap) return;
    setEditContent(selectedRecap.content);
    setEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    updateMutation.mutate(editContent);
  };

  const handleCopy = async () => {
    if (!selectedRecap) return;
    try {
      await navigator.clipboard.writeText(selectedRecap.content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleExport = () => {
    if (!selectedRecap) return;
    const blob = new Blob([selectedRecap.content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recap-v${selectedRecap.version ?? 1}.html`;
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
      {/* Left: Recap list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Recaps
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
            Generate Recap
          </Button>
        </div>

        {recaps.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <ScrollText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No recaps yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Generate a recap to summarize agreed terms
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {recaps.map((recap) => (
              <Card
                key={recap.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-accent/40 ${
                  selectedRecap?.id === recap.id
                    ? "ring-2 ring-primary bg-accent/20"
                    : ""
                }`}
                onClick={() => {
                  setSelectedRecap(recap);
                  setEditing(false);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">
                        Version {recap.version ?? 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge
                        variant="outline"
                        className={
                          recap.isApproved
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }
                      >
                        {recap.isApproved ? "Approved" : "Pending"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {generatedByLabel(recap.generatedBy)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(recap.createdAt)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Right: Recap content viewer */}
      <div className="lg:col-span-2">
        {!selectedRecap ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <ScrollText className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Select a recap to view its content
            </p>
          </Card>
        ) : (
          <Card className="flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">
                  Version {selectedRecap.version ?? 1}
                </h3>
                {selectedRecap.isApproved && (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Approved
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartEdit}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!selectedRecap.isApproved && (
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(selectedRecap.id)}
                        disabled={approveMutation.isPending}
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        Approve
                      </Button>
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
                  placeholder="Recap content..."
                />
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div
                  className="prose prose-sm max-w-none p-6"
                  dangerouslySetInnerHTML={{
                    __html: selectedRecap.content,
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

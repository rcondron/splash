"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Voyage, VoyageStatus } from "@/types";
import { useVoyageStore } from "@/store/voyage";
import { VoyageHeader } from "@/components/voyage/voyage-header";
import { ConversationsTab } from "@/components/voyage/conversations-tab";
import { FilesTab } from "@/components/voyage/files-tab";
import { TermsTab } from "@/components/voyage/terms-tab";
import { RecapsTab } from "@/components/voyage/recaps-tab";
import { AuditTab } from "@/components/voyage/audit-tab";
import { ContractsTab } from "@/components/voyage/contracts-tab";
import { ParticipantsPanel } from "@/components/voyage/participants-panel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  MessageSquare,
  FileText,
  ClipboardList,
  ScrollText,
  History,
  FileSignature,
  Users,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

export default function VoyageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setActiveVoyage, updateVoyage } = useVoyageStore();
  const voyageId = params.id as string;
  const [activeTab, setActiveTab] = useState("conversations");

  const {
    data: voyage,
    isLoading,
    error,
  } = useQuery<Voyage>({
    queryKey: ["voyage", voyageId],
    queryFn: async () => {
      const v = await api.get<Voyage>(`/voyages/${voyageId}`);
      setActiveVoyage(v);
      return v;
    },
    enabled: !!voyageId,
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: VoyageStatus) =>
      api.patch<Voyage>(`/voyages/${voyageId}`, { status: newStatus }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["voyage", voyageId], updated);
      updateVoyage(voyageId, updated);
      toast.success(`Status changed to ${updated.status}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update status");
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-sm text-muted-foreground">Loading voyage...</span>
        </div>
      </div>
    );
  }

  if (error || !voyage) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold">Voyage not found</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            The voyage you are looking for does not exist or you do not have
            permission to view it.
          </p>
          <Button variant="outline" onClick={() => router.push("/voyages")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Voyages
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { value: "conversations", label: "Conversations", icon: MessageSquare },
    { value: "files", label: "Files", icon: FileText },
    { value: "terms", label: "Terms", icon: ClipboardList },
    { value: "recaps", label: "Recaps", icon: ScrollText },
    { value: "audit", label: "Audit", icon: History },
    { value: "contract", label: "Contract", icon: FileSignature },
    { value: "participants", label: "Team", icon: Users },
  ];

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      {/* Back button */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/voyages")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voyages
        </Button>
      </div>

      {/* Voyage Header Card */}
      <VoyageHeader
        voyage={voyage}
        onEdit={() => router.push(`/voyages/${voyageId}/edit`)}
        onStatusChange={(status) => statusMutation.mutate(status)}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b bg-transparent p-0 h-auto rounded-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <Icon className="mr-2 h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="conversations" className="mt-6">
          <ConversationsTab voyageId={voyageId} />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <FilesTab voyageId={voyageId} />
        </TabsContent>

        <TabsContent value="terms" className="mt-6">
          <TermsTab voyageId={voyageId} />
        </TabsContent>

        <TabsContent value="recaps" className="mt-6">
          <RecapsTab voyageId={voyageId} />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditTab voyageId={voyageId} />
        </TabsContent>

        <TabsContent value="contract" className="mt-6">
          <ContractsTab voyageId={voyageId} />
        </TabsContent>

        <TabsContent value="participants" className="mt-6">
          <ParticipantsPanel voyageId={voyageId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

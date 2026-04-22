"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Edit3,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { quintApi } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface Section {
  id: string;
  section_key: string;
  section_title: string;
  content_markdown: string;
  sort_order: number;
  source_type: string;
}

interface Document {
  id: string;
  fixture_id: string;
  document_type: string;
  title: string;
  status: string;
  version_number: number;
  model: string | null;
  created_at: string | null;
  sections: Section[];
}

interface Props {
  fixtureId: string;
  docType: "recap" | "charter_party";
  label: string;
}

export function FixtureDocumentTab({ fixtureId, docType, label }: Props) {
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const apiPath =
    docType === "charter_party" ? "charter-party" : docType;

  const load = useCallback(async () => {
    try {
      const res = await quintApi.get<{
        document: Document | null;
        success?: boolean;
      }>(`/v1/fixtures/${fixtureId}/${apiPath}`);
      setDoc(res.document ?? null);
    } catch {
      /* keep existing */
    } finally {
      setLoading(false);
    }
  }, [fixtureId, apiPath]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await quintApi.post<{
        document: Document | null;
        success?: boolean;
      }>(`/v1/fixtures/${fixtureId}/${apiPath}/generate`);
      setDoc(res.document ?? null);
      toast.success(`${label} generated`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveSection = async (sectionId: string) => {
    try {
      const res = await quintApi.put<{ section: Section }>(`/v1/documents/sections/${sectionId}`, {
        content: editContent,
      });
      setDoc((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: prev.sections.map((s) =>
            s.id === sectionId ? { ...s, ...res.section } : s,
          ),
        };
      });
      setEditingId(null);
      toast.success("Section saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading {label.toLowerCase()}…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            AI-generated from accepted terms and chat context.
            {doc && (
              <span className="ml-2 text-slate-400">
                v{doc.version_number} &middot;{" "}
                {doc.created_at
                  ? new Date(doc.created_at).toLocaleString()
                  : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {doc && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
              )}
              Regenerate
            </Button>
          )}
          {!doc && (
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-3.5 w-3.5" />
              )}
              Generate {label}
            </Button>
          )}
        </div>
      </div>

      {!doc ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">
            No {label.toLowerCase()} yet
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Accept terms first, then generate the {label.toLowerCase()} from
            your negotiated terms and chat context.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {doc.sections.map((sec) => (
            <div key={sec.id} className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">
                  {sec.section_title}
                </h3>
                <div className="flex items-center gap-1.5">
                  {sec.source_type === "user_edited" && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      Edited
                    </span>
                  )}
                  {editingId !== sec.id && (
                    <button
                      onClick={() => {
                        setEditingId(sec.id);
                        setEditContent(sec.content_markdown);
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="Edit section"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {editingId === sec.id ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300 font-mono"
                    rows={Math.max(6, sec.content_markdown.split("\n").length + 2)}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 bg-emerald-600 text-xs hover:bg-emerald-700"
                      onClick={() => void handleSaveSection(sec.id)}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm prose-slate max-w-none text-sm leading-relaxed whitespace-pre-line">
                  {sec.content_markdown}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

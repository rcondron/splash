"use client";

import { useRouter } from "next/navigation";
import { Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeatureUnavailableProps {
  title: string;
  description?: string;
}

export function FeatureUnavailable({
  title,
  description = "This feature is not yet connected to the remote API and is temporarily unavailable.",
}: FeatureUnavailableProps) {
  const router = useRouter();

  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center text-center max-w-md space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
          <Construction className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard")}
          className="mt-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

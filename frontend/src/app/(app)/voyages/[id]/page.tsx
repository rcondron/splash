"use client";

import { FeatureUnavailable } from "@/components/feature-unavailable";

export default function VoyageDetailPage() {
  return (
    <FeatureUnavailable
      title="Voyage Detail Unavailable"
      description="Voyage details require the local backend. This feature will be available once the Quint API supports voyage endpoints."
    />
  );
}

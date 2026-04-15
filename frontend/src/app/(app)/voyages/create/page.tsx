"use client";

import { FeatureUnavailable } from "@/components/feature-unavailable";

export default function CreateVoyagePage() {
  return (
    <FeatureUnavailable
      title="Create Voyage Unavailable"
      description="Voyage creation requires the local backend. This feature will be available once the Quint API supports voyage endpoints."
    />
  );
}

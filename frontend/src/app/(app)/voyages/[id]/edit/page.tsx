"use client";

import { FeatureUnavailable } from "@/components/feature-unavailable";

export default function EditVoyagePage() {
  return (
    <FeatureUnavailable
      title="Edit Voyage Unavailable"
      description="Voyage editing requires the local backend. This feature will be available once the Quint API supports voyage endpoints."
    />
  );
}

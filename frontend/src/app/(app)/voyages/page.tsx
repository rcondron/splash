"use client";

import { FeatureUnavailable } from "@/components/feature-unavailable";

export default function VoyagesPage() {
  return (
    <FeatureUnavailable
      title="Voyages Unavailable"
      description="Voyage management requires the local backend. This feature will be available once the Quint API supports voyage endpoints."
    />
  );
}
